import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RxVKG — Interoperability Pharmacy",
  description:
    "Semantic Data Integration for pharmaceutical data via SPARQL/Ontop over MySQL & PostgreSQL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
