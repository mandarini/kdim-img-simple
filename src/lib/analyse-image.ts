import type { ImageSummary, ProcessImageRequest } from "../types";

export class ImageService {
  private static async getImagePreview(file: File): Promise<string> {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };

      reader.onloadend = () => {
        img.src = reader.result as string;
      };

      reader.readAsDataURL(file);
    });
  }

  static async processImage({
    image,
    userId,
    accessToken,
  }: ProcessImageRequest): Promise<ImageSummary> {
    const preview = await this.getImagePreview(image);

    const formData = new FormData();
    formData.append("image", image);
    formData.append("userId", userId);

    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) throw new Error("API URL not configured");

    const res = await fetch(`${apiUrl}/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!res.ok) throw new Error(`API failed: ${res.statusText}`);
    const data = await res.json();

    return {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      keywords: data.keywords,
      preview,
    };
  }
}
