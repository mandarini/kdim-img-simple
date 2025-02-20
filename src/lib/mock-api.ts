import type { ImageMetadata } from '../types';

// Simulated delay for mock API calls (ms)
const MOCK_DELAY = 800;

export async function mockAnalyzeImages(images: string[]): Promise<ImageMetadata[]> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  
  return images.map(() => ({
    title: 'Beautiful landscape photo',
    description: 'A stunning natural landscape featuring mountains and a lake at sunset',
    keywords: ['nature', 'landscape', 'sunset', 'mountains', 'lake']
  }));
}