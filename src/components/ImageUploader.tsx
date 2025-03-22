import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import clsx from "clsx";

interface ImageUploaderProps {
  onImagesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function ImageUploader({ onImagesSelected, disabled }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 10) {
        alert("Max 10 images allowed.");
        return;
      }

      const files = accepted.slice(0, 10);
      const previewPromises = files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      );

      Promise.all(previewPromises).then((urls) => {
        setPreviews(urls);
        onImagesSelected(files);
      });
    },
    [onImagesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png"] },
    multiple: true,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "w-full p-6 border-2 border-dashed rounded-lg text-center transition",
        "hover:border-blue-500 hover:bg-blue-50",
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      {previews.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt={`Preview ${idx}`}
              className="rounded object-cover h-32 w-full shadow"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-600">Click or drag up to 10 images</p>
          <p className="text-xs text-gray-400">Max 20MB each</p>
        </div>
      )}
    </div>
  );
}
