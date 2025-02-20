import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.14.1";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!
});

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

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
      model: "claude-3-5-sonnet-20240620",
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

    // Extract the response text
    const responseText = response.content[0].text.trim();
    
    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    // Parse the JSON
    const result = JSON.parse(jsonMatch[0]);

    // Validate and sanitize the result
    return {
      title: typeof result.title === 'string' ? result.title : "Untitled Image",
      description: typeof result.description === 'string' ? result.description : "No description available",
      keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 10) : [],
    };
  });
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
    // Validate request
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        { 
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Get request body
    const { images } = await req.json();
    if (!images?.length || !Array.isArray(images) || images.length > 5) {
      return new Response(
        JSON.stringify({ error: "Please provide between 1 and 5 images" }), 
        { 
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

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
        error: "Internal server error",
        message: error.message 
      }), 
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }
});