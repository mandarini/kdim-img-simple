import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import type { ProcessedImage } from '../types';

interface Props {
  onImagesSelected: (images: ProcessedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUploader({ onImagesSelected, maxImages = 5, disabled = false }: Props) {
  const [selectedImages, setSelectedImages] = useState<ProcessedImage[]>([]);

  const processImage = async (file: File): Promise<ProcessedImage> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const id = crypto.randomUUID();

      reader.onload = async (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if width is greater than 1024px
          if (width > 1024) {
            height = Math.floor((height * 1024) / width);
            width = 1024;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            resolve({
              id,
              originalName: file.name,
              base64: '',
              error: 'Failed to process image'
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

          resolve({
            id,
            base64,
            originalName: file.name
          });
        };

        img.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const imagesToProcess = acceptedFiles.slice(0, maxImages - selectedImages.length);
    const processedImages = await Promise.all(imagesToProcess.map(processImage));
    
    const newImages = [...selectedImages, ...processedImages];
    setSelectedImages(newImages);
    onImagesSelected(newImages);
  }, [maxImages, onImagesSelected, selectedImages]);

  const removeImage = (id: string) => {
    const newImages = selectedImages.filter(img => img.id !== id);
    setSelectedImages(newImages);
    // Pass false as second argument to indicate this is just a removal, not a new analysis
    onImagesSelected(newImages, false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.tiff', '.heic']
    },
    maxFiles: maxImages - selectedImages.length,
    disabled: disabled || selectedImages.length >= maxImages
  });

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${(disabled || selectedImages.length >= maxImages) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? (
            'Drop the images here...'
          ) : disabled ? (
            'Processing images...'
          ) : (
            <>
              Drag & drop images here, or click to select
              <br />
              <span className="text-xs text-gray-500">
                Supports JPEG, PNG, WebP, TIFF, HEIC (max {maxImages} images)
              </span>
            </>
          )}
        </p>
      </div>

      {selectedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {selectedImages.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square border rounded-lg overflow-hidden group"
            >
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              <img
                src={`data:image/jpeg;base64,${image.base64}`}
                alt={image.originalName}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}