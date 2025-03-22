export interface ImageSummary {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  preview: string;
}

export interface ProcessImageRequest {
  image: File;
}

export interface ProcessedImage {
  id: string;
  file: File;
  base64: string;
  originalName: string;
  metadata: ImageSummary | null;
}
