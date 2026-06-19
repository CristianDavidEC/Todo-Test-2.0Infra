import type { Metadata } from "next";
import Link from "next/link";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import { AuthNav } from "@/components/auth-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo List POC",
  description: "Todo List POC — monorepo SST + Next.js + NestJS sobre AWS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <Auth0Provider>
          <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Todo List POC
            </Link>
            <AuthNav />
          </header>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
