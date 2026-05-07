import type { Metadata } from "next";
import "./globals.css";
import { RootLayoutClient } from "@/components/layout/RootLayoutClient";

export const metadata: Metadata = {
  title: "MIM — Minecraft Intelligent Manager",
  description: "Gestor inteligente de mods, builds y assets para packs de Minecraft.",
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

/**
 * Layout principal del servidor (Server Component) para la aplicación.
 * Define los metadatos globales e inicializa el documento HTML con
 * el cliente RootLayoutClient para manejar el estado global.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen text-foreground transition-colors duration-500">
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}