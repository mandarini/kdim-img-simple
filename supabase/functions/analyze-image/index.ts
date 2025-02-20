import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.14.1";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!
});

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const DEFAULT_DAILY_LIMIT = 10;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0 || !error.status || error.status !== 529) {
      throw error;
    }
    
    await sleep(delay);
    return retryWithBackoff(operation, retries - 1, delay * 2);
  }
}

async function analyzeImage(imageBase64: string) {
  return retryWithBackoff(async () => {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "Analyze this image and return ONLY a JSON object with exactly this structure, no other text: { \"title\": \"brief title\", \"description\": \"2-3 sentence description\", \"keywords\": [\"keyword1\", \"keyword2\", etc] }",
            },
          ],
        },
      ],
    });

    const responseText = response.content[0].text.trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      title: typeof result.title === 'string' ? result.title : "Untitled Image",
      description: typeof result.description === 'string' ? result.description : "No description available",
      keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 10) : [],
    };
  });
}

async function checkAndUpdateUserLimits(supabase: any, userId: string, imageCount: number) {
  const today = new Date().toISOString().split('T')[0];

  // Get user limits
  const { data: limits, error: limitsError } = await supabase
    .from('user_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (limitsError && limitsError.code !== 'PGRST116') {
    throw new Error('Failed to check user limits');
  }

  // If no limits exist, create them
  if (!limits) {
    const { error: createError } = await supabase
      .from('user_limits')
      .insert({
        user_id: userId,
        upload_count: imageCount,
        last_upload_date: today,
        credits: 0
      });

    if (createError) throw new Error('Failed to create user limits');
    return;
  }

  // Check if it's a new day
  const isNewDay = limits.last_upload_date !== today;
  const currentCount = isNewDay ? 0 : limits.upload_count;
  const newCount = currentCount + imageCount;
  const totalAllowed = DEFAULT_DAILY_LIMIT + (limits.credits || 0);

  // Check if user has enough credits
  if (newCount > totalAllowed) {
    throw new Error(`Daily limit exceeded. You have used ${currentCount} out of ${totalAllowed} allowed uploads today.`);
  }

  // Update limits
  const { error: updateError } = await supabase
    .from('user_limits')
    .update({
      upload_count: newCount,
      last_upload_date: today
    })
    .eq('user_id', userId);

  if (updateError) throw new Error('Failed to update user limits');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Validate request
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    // Get request body
    const { images } = await req.json();
    if (!images?.length || !Array.isArray(images) || images.length > 5) {
      throw new Error("Please provide between 1 and 5 images");
    }

    // Check and update user limits
    await checkAndUpdateUserLimits(supabaseClient, user.id, images.length);

    // Process images sequentially with retry logic
    const results = [];
    for (const imageBase64 of images) {
      try {
        const result = await analyzeImage(imageBase64);
        results.push(result);
      } catch (error) {
        console.error("Error processing image:", error);
        results.push({
          title: "Error Processing Image",
          description: "The image could not be analyzed at this time. Please try again.",
          keywords: [],
        });
      }
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }), 
      { 
        status: error.message === "Unauthorized" ? 401 : 
                error.message === "Method not allowed" ? 405 : 
                error.message.includes("Daily limit exceeded") ? 429 : 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }
});