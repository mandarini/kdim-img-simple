import { createClient } from '@supabase/supabase-js';
import type { ImageMetadata } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function analyzeImages(base64Images: string[]): Promise<ImageMetadata[]> {
  const { data, error } = await supabase.functions.invoke('analyze-image', {
    body: { images: base64Images }
  });
  
  if (error) throw error;
  return data;
}