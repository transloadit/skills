import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart CDN (Next.js)',
  description: 'Scenario: Smart CDN signing in Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
