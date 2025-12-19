import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'App Preview - AI App Builder',
  description: 'Preview a generated application',
  robots: 'noindex', // Don't index preview pages
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950">{children}</body>
    </html>
  );
}
