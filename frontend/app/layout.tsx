import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "RxVKG — Interoperability Pharmacy",
  description:
    "Semantic Data Integration for pharmaceutical data via SPARQL/Ontop over MySQL & PostgreSQL.",
};

// app shell — mounts AuthProvider so every route can read the session
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: dark-mode class gets set on the client before hydration
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
