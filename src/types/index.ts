export interface ImageMetadata {
  title: string;
  description: string;
  keywords: string[];
}

export interface UserLimits {
  upload_count: number;
  last_upload_date: string;
}

export interface ProcessedImage {
  id: string;
  base64: string;
  originalName: string;
  metadata?: ImageMetadata;
  error?: string;
}