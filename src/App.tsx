import { useEffect, useState } from "react";
import { ImageUploader } from "./components/ImageUploader";

import { StatusBanner, StatusType } from "./components/StatusBanner";
import { AuthButton } from "./components/AuthButton";
import { supabase } from "./lib/supabase";
import { ImageService } from "./lib/analyse-image";
import { ImageIcon, Copy, Download, Loader } from "lucide-react";
import type { ProcessedImage } from "./types";

interface Status {
  message: string;
  type: StatusType;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [processingStates, setProcessingStates] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error checking auth state:", error.message);
        setStatus({
          message: "Error checking authentication status",
          type: "error",
        });
      }
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (event === "SIGNED_IN") {
        setStatus({ message: "Successfully signed in!", type: "success" });
      } else if (event === "SIGNED_OUT") {
        setStatus({ message: "Signed out", type: "info" });
        setImages([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  const handleImagesSelected = async (files: File[]) => {
    const previews = await Promise.all(
      files.map(async (file) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        return {
          id: crypto.randomUUID(),
          file,
          base64: base64.split(",")[1],
          originalName: file.name,
          metadata: null,
        };
      })
    );
    setImages(previews);
  };

  const handleImageRemove = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    setStatus(null);
  };

  const handleSummarize = async () => {
    if (!isAuthenticated) return;

    setStatus({ message: "Analyzing images...", type: "info" });

    const { data, error } = await supabase.auth.getSession();
    const session = data.session;

    if (error || !session) {
      setStatus({ message: "Failed to retrieve session", type: "error" });
      return;
    }

    const userId = session.user.id;
    const accessToken = session.access_token;

    const newStates: Record<string, boolean> = {};
    images.forEach((img) => (newStates[img.id] = true));
    setProcessingStates(newStates);

    try {
      const analyzed = await Promise.all(
        images.map(async (img) => {
          const metadata = await ImageService.processImage({
            image: img.file,
            userId,
            accessToken,
          });
          return { ...img, metadata };
        })
      );
      setImages(analyzed);
      setStatus({ message: "Analysis complete!", type: "success" });
    } catch (error) {
      console.error(error);
      setStatus({
        message: "Image analysis failed. Please try again.",
        type: "error",
      });
    } finally {
      setProcessingStates({});
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ message: "Copied to clipboard!", type: "success" });
    } catch {
      setStatus({ message: "Failed to copy", type: "error" });
    }
  };

  const downloadCSV = () => {
    const headers = ["file name", "title", "description", "keywords"];
    const rows = images.map((img) => [
      img.originalName,
      img.metadata?.title || "",
      img.metadata?.description || "",
      (img.metadata?.keywords || []).join(", "),
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "image-analysis.csv";
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <ImageIcon className="w-10 h-10 text-blue-500 mb-4" />
        <h1 className="text-xl font-semibold mb-2">
          Photo Summarizer
        </h1>
        <p className="text-gray-600 mb-6">Sign in with Google to get started</p>
        <AuthButton
          isAuthenticated={isAuthenticated}
          onAuthChange={setIsAuthenticated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-6 h-6 text-blue-500" />
          <h1 className="text-lg font-semibold">Photo Summarizer</h1>
        </div>
        <AuthButton
          isAuthenticated={isAuthenticated}
          onAuthChange={setIsAuthenticated}
        />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {status && <StatusBanner {...status} onClose={() => setStatus(null)} />}
        <ImageUploader
          onImagesSelected={handleImagesSelected}
          onImageRemove={handleImageRemove}
          previews={images.map((img) => `data:image/jpeg;base64,${img.base64}`)}
          disabled={Object.values(processingStates).some(Boolean)}
        />
        {images.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSummarize}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={Object.values(processingStates).some(Boolean)}
            >
              Summarize
            </button>
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-8 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Results</h2>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <Download className="w-4 h-4" />
                Download Getty Images / iStock CSV
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="bg-white rounded shadow-sm overflow-hidden"
                >
                  <img
                    src={`data:image/jpeg;base64,${img.base64}`}
                    alt={img.originalName}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4 space-y-3">
                    <div className="text-sm text-gray-500">
                      {img.originalName}
                    </div>
                    {processingStates[img.id] ? (
                      <div className="flex items-center justify-center text-gray-500">
                        <Loader className="w-5 h-5 animate-spin mr-2" />
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      img.metadata && (
                        <>
                          <div>
                            <button
                              onClick={() =>
                                copyToClipboard(img?.metadata?.title || "")
                              }
                              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                            >
                              <Copy className="w-4 h-4" />
                              <span className="font-medium">Title:</span>
                            </button>
                            <p className="text-gray-900">
                              {img.metadata.title}
                            </p>
                          </div>
                          <div>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  img?.metadata?.description || ""
                                )
                              }
                              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                            >
                              <Copy className="w-4 h-4" />
                              <span className="font-medium">Description:</span>
                            </button>
                            <p className="text-gray-900">
                              {img.metadata.description}
                            </p>
                          </div>
                          <div>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  img?.metadata?.keywords.join(", ") || ""
                                )
                              }
                              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                            >
                              <Copy className="w-4 h-4" />
                              <span className="font-medium">Keywords:</span>
                            </button>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {img.metadata.keywords.map((kw, idx) => (
                                <span
                                  key={idx}
                                  className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
