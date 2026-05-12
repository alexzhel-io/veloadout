import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#13111c' }}>
      <div className="text-center max-w-md">
        <h1 className="text-white text-3xl font-bold mb-3">404</h1>
        <p className="text-text-secondary mb-6">Page not found.</p>
        <Link href="/" className="px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-xl text-white text-sm font-medium transition-colors inline-block">
          Go home
        </Link>
      </div>
    </div>
  );
}
