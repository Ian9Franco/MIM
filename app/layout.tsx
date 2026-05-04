import type { Metadata } from "next";
import "./globals.css";
import { RootLayoutClient } from "@/components/RootLayoutClient";

export const metadata: Metadata = {
  title: "MIM — Minecraft Intelligent Manager",
  description: "Gestor inteligente de mods, builds y assets para packs de Minecraft.",
  icons: { icon: "/icono.jpg", apple: "/icono.jpg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen text-foreground transition-colors duration-500">
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}