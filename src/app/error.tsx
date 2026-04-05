'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        An error occurred while loading this page. It has been reported automatically.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
