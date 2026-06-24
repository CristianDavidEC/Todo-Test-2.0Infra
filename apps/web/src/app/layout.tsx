import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Link from "next/link";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import { AuthNav } from "@/components/auth-nav";
import "./globals.css";

// DM Sans — fuente del sistema Candy (ver docs/DESIGN.md). Expuesta como var CSS
// `--font-dm-sans`, consumida por el token `--font-sans` en globals.css.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "CandyProject",
  description: "CandyProject — gestión de proyectos inteligente y vibrante",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={dmSans.variable}>
      <body className="min-h-screen bg-background font-sans text-ink antialiased">
        <Auth0Provider>
          <header className="glass sticky top-0 z-50 shadow-[0_4px_16px_rgba(224,64,160,0.1)]">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
              <Link
                href="/"
                className="text-2xl font-black tracking-tighter text-primary transition-transform duration-300 ease-out hover:scale-105"
              >
                CandyProject
              </Link>
              <AuthNav />
            </div>
          </header>
          {children}
        </Auth0Provider>
      </body>
    </html>
  );
}
