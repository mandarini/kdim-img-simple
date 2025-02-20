import { createClient } from "@supabase/supabase-js";
import { config } from "./config";
import { mockAnalyzeImages } from "./mock-api";
import type { ImageMetadata } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock auth functions when real auth is disabled
if (!config.useRealAuth) {
  const mockSession = {
    user: config.mockUser,
  };

  // Override auth methods with mock implementations
  supabase.auth.getSession = async () => ({
    data: { session: mockSession },
    error: null,
  });
  supabase.auth.onAuthStateChange = (callback) => {
    // Simulate initial auth state
    callback("SIGNED_IN", mockSession);
    return {
      data: { subscription: { unsubscribe: () => {} } },
    };
  };
  supabase.auth.signInWithOAuth = async () => ({
    data: { session: mockSession },
    error: null,
  });
  supabase.auth.signOut = async () => ({ error: null });
}

// Helper function to analyze images (uses mock or real API based on config)
export async function analyzeImages(
  base64Images: string[]
): Promise<ImageMetadata[]> {
  if (config.useRealAuth) {
    // Check user's rate limit first
    const { data: userLimits, error: limitsError } = await supabase
      .from("user_limits")
      .select("upload_count, last_upload_date")
      .single();

    if (limitsError) {
      throw new Error("Failed to check rate limits");
    }

    const today = new Date().toISOString().split("T")[0];
    const isNewDay = userLimits?.last_upload_date !== today;
    const currentCount = isNewDay ? 0 : userLimits?.upload_count || 0;
    const newCount = currentCount + base64Images.length;

    if (newCount > 10) {
      throw new Error(
        "Daily upload limit exceeded. Please try again tomorrow."
      );
    }

    // Update user limits
    const { error: updateError } = await supabase.from("user_limits").upsert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      upload_count: newCount,
      last_upload_date: today,
    });

    if (updateError) {
      throw new Error("Failed to update rate limits");
    }

    // Call the Edge Function to analyze images
    const { data, error } = await supabase.functions.invoke("analyze-image", {
      body: { images: base64Images },
    });

    if (error) throw error;
    return data;
  }

  return mockAnalyzeImages(base64Images);
}
