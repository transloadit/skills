import type { Metadata } from "next";

import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "Uppy + Transloadit (Next.js)",
  description: "Integration experiment: Uppy + Transloadit uploads and processing in Next.js",
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
