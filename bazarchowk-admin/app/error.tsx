'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-900 p-8">
      <h2 className="text-3xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-lg mb-8 font-mono bg-white p-4 rounded-xl shadow-sm border border-red-200 max-w-3xl overflow-auto">
        {error.message || 'Unknown React Error'}
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
