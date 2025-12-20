'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PreviewBanner from '@/components/preview/PreviewBanner';

// Dynamic import to avoid SSR issues with Sandpack
const FullAppPreview = dynamic(() => import('@/components/FullAppPreview'), {
  ssr: false,
  loading: () => <PreviewLoading />,
});

function PreviewLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-400">Loading preview...</p>
      </div>
    </div>
  );
}

interface PreviewApp {
  id: string;
  title: string;
  description: string | null;
  code: string;
  createdAt: string;
}

export default function PreviewPage() {
  const params = useParams();
  // Handle both string and string[] cases from Next.js
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [app, setApp] = useState<PreviewApp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPreview() {
      if (!slug) {
        setError('Invalid preview URL');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/preview/${slug}`);

        // Safe JSON parsing
        let data;
        try {
          data = await response.json();
        } catch {
          setError('Invalid response from server');
          return;
        }

        if (!data.success) {
          setError(data.error || 'Preview not found');
          return;
        }

        setApp(data.app);
      } catch {
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [slug]);

  if (loading) {
    return <PreviewLoading />;
  }

  if (error || !app) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Preview Not Found</h1>
          <p className="text-gray-400">{error || 'This preview is not available'}</p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to AI App Builder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Preview Content */}
      <div className="flex-1 pb-12">
        <FullAppPreview appDataJson={app.code} />
      </div>

      {/* Branding Banner */}
      <PreviewBanner appTitle={app.title} />
    </div>
  );
}
