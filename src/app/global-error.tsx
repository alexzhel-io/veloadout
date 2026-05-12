'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ background: '#13111c', color: 'white', fontFamily: 'system-ui', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Fatal error</h1>
        <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>{error.message}</p>
        <button onClick={reset} style={{ padding: '0.6rem 1.25rem', background: '#6d28d9', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
