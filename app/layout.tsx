import type { Metadata } from "next";
import "./globals.css";
import { RootLayoutClient } from "@/components/layout/RootLayoutClient";
import { AuthProvider } from "@/components/security/AuthContext";

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
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased min-h-screen text-foreground transition-colors duration-500" suppressHydrationWarning>
        <AuthProvider>
          <RootLayoutClient>{children}</RootLayoutClient>
        </AuthProvider>
      </body>
    </html>
  );
}