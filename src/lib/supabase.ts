import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { mockAnalyzeImages } from './mock-api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock auth functions when real auth is disabled
if (!config.useRealAuth) {
  const mockSession = {
    user: config.mockUser
  };

  // Override auth methods with mock implementations
  supabase.auth.getSession = async () => ({ data: { session: mockSession }, error: null });
  supabase.auth.onAuthStateChange = (callback) => {
    // Simulate initial auth state
    callback('SIGNED_IN', mockSession);
    return {
      data: { subscription: { unsubscribe: () => {} } }
    };
  };
}

// Helper function to analyze images (uses mock or real API based on config)
export async function analyzeImages(base64Images: string[]) {
  if (config.useRealAuth) {
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: { images: base64Images }
    });
    
    if (error) throw error;
    return data;
  }
  
  return mockAnalyzeImages(base64Images);
}