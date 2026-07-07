import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

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
      <body className={`${jakarta.variable} font-sans antialiased selection:bg-orange-500/30`}>
        {/* Mobile viewport simulator container */}
        <div className="min-h-screen flex flex-col max-w-md mx-auto border-x border-white/[0.04] bg-[#0D0D0F] shadow-2xl relative pb-20">
          {children}
        </div>
      </body>
    </html>
  );
}
