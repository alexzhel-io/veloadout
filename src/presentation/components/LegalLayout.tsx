import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen px-6 py-12" style={{ background: '#13111c' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to Veloadout
        </Link>
        <h1 className="text-white text-3xl font-bold mb-8 tracking-tight">{title}</h1>
        <div className="prose prose-invert max-w-none text-text-secondary space-y-4 [&_h2]:text-white [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-8 [&_h2]:mb-3 [&_a]:text-accent [&_a]:underline [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}
