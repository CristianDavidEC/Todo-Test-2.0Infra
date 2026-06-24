import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import "./globals.css";

// DM Sans — fuente del sistema Candy. Expuesta como var CSS `--font-dm-sans`,
// consumida por el token `--font-sans` en globals.css.
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
      <head>
        {/* Material Symbols Outlined — iconografía de las pantallas Stitch. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* Icon font (Material Symbols) — debe cargarse por <link>; next/font no
            soporta fuentes de íconos. La advertencia no-page-custom-font no aplica. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-on-surface antialiased">
        <Auth0Provider>{children}</Auth0Provider>
      </body>
    </html>
  );
}
