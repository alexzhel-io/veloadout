'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#13111c' }}>
      <div className="text-center max-w-md">
        <h1 className="text-white text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-text-secondary mb-6">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-xl text-white text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
