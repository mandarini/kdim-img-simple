import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { mockAnalyzeImages } from './mock-api';
import type { ImageMetadata } from '../types';

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
  supabase.auth.signInWithOAuth = async () => ({ data: { session: mockSession }, error: null });
  supabase.auth.signOut = async () => ({ error: null });
}

// Initialize user limits for new users
async function initializeUserLimits() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  // Use upsert to either create or update the user limits
  const { data: limits, error: upsertError } = await supabase
    .from('user_limits')
    .upsert({
      user_id: user.id,
      upload_count: 0,
      last_upload_date: new Date().toISOString().split('T')[0]
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (upsertError) {
    console.error('Error initializing user limits:', upsertError);
    return null;
  }

  return limits;
}

// Helper function to analyze images (uses mock or real API based on config)
export async function analyzeImages(base64Images: string[]): Promise<ImageMetadata[]> {
  if (config.useRealAuth) {
    // Initialize user limits if they don't exist
    const userLimits = await initializeUserLimits();
    if (!userLimits) {
      throw new Error('Failed to initialize user limits');
    }

    const today = new Date().toISOString().split('T')[0];
    const isNewDay = userLimits.last_upload_date !== today;
    const currentCount = isNewDay ? 0 : userLimits.upload_count;
    const newCount = currentCount + base64Images.length;

    if (newCount > 10) {
      throw new Error('Daily upload limit exceeded. Please try again tomorrow.');
    }

    // Update user limits using upsert
    const { error: updateError } = await supabase
      .from('user_limits')
      .upsert({
        user_id: userLimits.user_id,
        upload_count: newCount,
        last_upload_date: today
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      throw new Error('Failed to update rate limits');
    }

    // Call the Edge Function to analyze images
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: { images: base64Images }
    });
    
    if (error) throw error;
    return data;
  }
  
  return mockAnalyzeImages(base64Images);
}