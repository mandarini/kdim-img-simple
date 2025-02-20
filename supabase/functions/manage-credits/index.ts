import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

interface RequestBody {
  userId: string;
  credits: number;
}

serve(async (req) => {
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

    // Check if user is admin
    const { data: userData } = await supabaseClient
      .from("auth.users")
      .select("raw_user_meta_data->is_admin")
      .eq("id", user.id)
      .single();

    if (!userData?.raw_user_meta_data?.is_admin) {
      throw new Error("Unauthorized - Admin access required");
    }

    // Get request body
    const { userId, credits } = await req.json() as RequestBody;

    if (!userId || typeof credits !== "number") {
      throw new Error("Invalid request body");
    }

    // Update user credits
    const { error: updateError } = await supabaseClient
      .from("user_limits")
      .update({ credits })
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }), 
      { 
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }
});