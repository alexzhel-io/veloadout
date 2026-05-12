import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veloadout',
  description: 'Bikepacking Gear Volume Calculator',
};

// Passthrough — locale layout renders <html> and <body> with the correct lang attribute
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}
