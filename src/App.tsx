import  { useEffect, useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AuthButton } from './components/AuthButton';
import { StatusBanner, StatusType } from './components/StatusBanner';
import { supabase, analyzeImages } from './lib/supabase';
import { ImageIcon, Copy, Download, Loader } from 'lucide-react';
import type { ProcessedImage } from './types';

interface Status {
  message: string;
  type: StatusType;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [processingStates, setProcessingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error checking auth state:', error.message);
        setStatus({
          message: 'Error checking authentication status',
          type: 'error'
        });
      }
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (event === 'SIGNED_IN') {
        setStatus({
          message: 'Successfully signed in!',
          type: 'success'
        });
      } else if (event === 'SIGNED_OUT') {
        setStatus({
          message: 'Successfully signed out',
          type: 'info'
        });
        setImages([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleImagesSelected = async (selectedImages: ProcessedImage[], shouldAnalyze = true) => {
    if (!isAuthenticated) {
      setStatus({
        message: 'Please sign in to analyze images',
        type: 'error'
      });
      return;
    }

    // Reset processing states for new batch
    setProcessingStates({});
    
    // Update images immediately to show previews
    setImages(selectedImages);

    // Only analyze if this is not just a removal operation
    if (shouldAnalyze && selectedImages.length > 0) {
      setStatus({
        message: 'Starting image analysis...',
        type: 'info'
      });

      try {
        // Mark all images as processing
        const initialStates = selectedImages.reduce((acc, img) => ({
          ...acc,
          [img.id]: true
        }), {});
        setProcessingStates(initialStates);

        const results = await analyzeImages(selectedImages.map(img => img.base64));
        
        // Update images with their analysis results
        setImages(selectedImages.map((img, i) => ({
          ...img,
          metadata: results[i]
        })));

        setStatus({
          message: 'Analysis complete!',
          type: 'success'
        });
      } catch (error) {
        setStatus({
          message: error instanceof Error ? error.message : 'Failed to analyze images. Please try again.',
          type: 'error'
        });
      } finally {
        // Clear all processing states
        setProcessingStates({});
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({
        message: 'Copied to clipboard!',
        type: 'success'
      });
    } catch (error) {
      setStatus({
        message: 'Failed to copy to clipboard',
        type: 'error'
      });
    }
  };

  const downloadCSV = () => {
    const headers = ['Filename', 'Title', 'Description', 'Keywords'];
    const rows = images.map(img => [
      img.originalName,
      img.metadata?.title || '',
      img.metadata?.description || '',
      (img.metadata?.keywords || []).join(', ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'image-analysis.csv';
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <ImageIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            Anthropic Image Summarizer
          </h1>
          <p className="text-gray-600 mb-8">
            Sign in to start analyzing your images with AI
          </p>
          <AuthButton
            isAuthenticated={isAuthenticated}
            onAuthChange={setIsAuthenticated}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ImageIcon className="h-8 w-8 text-blue-500" />
              <h1 className="text-xl font-semibold text-gray-900">
                Anthropic Image Summarizer
              </h1>
            </div>
            <AuthButton
              isAuthenticated={isAuthenticated}
              onAuthChange={setIsAuthenticated}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {status && (
          <StatusBanner
            message={status.message}
            type={status.type}
            onClose={() => setStatus(null)}
          />
        )}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <ImageUploader 
            onImagesSelected={handleImagesSelected}
            disabled={Object.values(processingStates).some(Boolean)}
          />
        </div>

        {/* Analysis Results */}
        {images.length > 0 && (
          <div className="mt-8 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Analysis Results</h2>
              {images.length > 1 && (
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export as CSV
                </button>
              )}
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <div key={image.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="aspect-video relative">
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <img
                      src={`data:image/jpeg;base64,${image.base64}`}
                      alt={image.originalName}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {processingStates[image.id] && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <Loader className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Analyzing...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-sm text-gray-500 font-medium">
                      {image.originalName}
                    </div>
                    {image.metadata && (
                      <div className="space-y-3">
                        <div>
                          <button
                            onClick={() => copyToClipboard(image.metadata!.title)}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="font-medium">Title:</span>
                          </button>
                          <p className="mt-1 text-gray-900">{image.metadata.title}</p>
                        </div>
                        <div>
                          <button
                            onClick={() => copyToClipboard(image.metadata!.description)}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="font-medium">Description:</span>
                          </button>
                          <p className="mt-1 text-gray-900">{image.metadata.description}</p>
                        </div>
                        <div>
                          <button
                            onClick={() => copyToClipboard(image.metadata!.keywords.join(', '))}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                          >
                            <Copy className="h-4 w-4" />
                            <span className="font-medium">Keywords:</span>
                          </button>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {image.metadata.keywords.map((keyword, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
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