import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MIM FOMO — Minecraft Mod Hub",
  description: "Descubrí ránkings, videos, y nuevos mods de la comunidad en tiempo real.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D0D0F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased selection:bg-orange-500/30">
        {/* Mobile viewport simulator container */}
        <div className="min-h-screen flex flex-col max-w-md mx-auto border-x border-white/[0.04] bg-[#0D0D0F] shadow-2xl relative pb-20">
          {children}
        </div>
      </body>
    </html>
  );
}
