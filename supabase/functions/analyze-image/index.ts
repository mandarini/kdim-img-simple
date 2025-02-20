import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.14.1";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!
});

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

    // Process images with Claude
    const results = await Promise.all(
      images.map(async (imageBase64) => {
        try {
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
                    text: "Analyze this image and provide a JSON response with the following structure: { title: string, description: string, keywords: string[] }. The title should be concise but descriptive, the description should be 2-3 sentences, and include up to 10 relevant keywords.",
                  },
                ],
              },
            ],
          });

          // Parse and validate the response
          const result = JSON.parse(response.content[0].text);
          return {
            title: result.title || "Untitled Image",
            description: result.description || "No description available",
            keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 10) : [],
          };
        } catch (error) {
          console.error("Error processing image:", error);
          return {
            title: "Error",
            description: "Failed to process image",
            keywords: [],
          };
        }
      })
    );

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