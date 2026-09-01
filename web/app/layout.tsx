import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mim-fomo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MIM — Minecraft Intelligent Manager | Suite de Gestión y Curación de Mods",
    template: "%s | MIM (Minecraft Intelligent Manager)",
  },
  description:
    "¿Qué es MIM? Minecraft Intelligent Manager es un ecosistema inteligente para descubrir, organizar y gestionar modpacks de Minecraft con diagnóstico SAGE, curación móvil y sincronización FOMO Cloud.",
  keywords: [
    "MIM",
    "Minecraft Intelligent Manager",
    "Que es MIM",
    "Qué es MIM",
    "MIM Minecraft",
    "Minecraft mod manager",
    "MIMweb",
    "FOMO Cloud",
    "SAGE Minecraft",
    "Modpack Manager",
    "CurseForge",
    "Modrinth",
    "Ian Franco Collada Pontorno",
  ],
  authors: [
    {
      name: "Ian Franco Collada Pontorno",
      url: "https://github.com/Ian9Franco",
    },
  ],
  creator: "Ian Franco Collada Pontorno",
  publisher: "Minecraft Intelligent Manager (MIM)",
  applicationName: "Minecraft Intelligent Manager",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: ["en_US"],
    url: siteUrl,
    title: "MIM — Minecraft Intelligent Manager",
    description:
      "Descubre, organiza y colabora en modpacks de Minecraft en tiempo real. Diagnóstico de crashes SAGE, búsqueda dual Modrinth/CurseForge y curación móvil.",
    siteName: "Minecraft Intelligent Manager (MIM)",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Logo Oficial de MIM (Minecraft Intelligent Manager)",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MIM — Minecraft Intelligent Manager",
    description:
      "Suite inteligente para organizar, optimizar y colaborar en tus modpacks de Minecraft.",
    images: ["/icon.png"],
    creator: "@Ian9Franco",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D0D0F",
};

const jsonLdData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${siteUrl}/#software`,
      name: "MIM (Minecraft Intelligent Manager)",
      alternateName: ["MIM", "Minecraft Intelligent Manager", "MIMweb", "FOMO Hub"],
      applicationCategory: "UtilitiesApplication, GameApplication",
      operatingSystem: "Windows, Web, Android, iOS",
      description:
        "MIM (Minecraft Intelligent Manager) es un ecosistema integral y gestor inteligente de modpacks para Minecraft con diagnóstico forense de crashes (SAGE), escáner de seguridad y curación móvil.",
      url: siteUrl,
      sameAs: [
        "https://github.com/Ian9Franco/MIM",
        "https://ar.linkedin.com/in/ian-franco-collada-pontorno",
      ],
      author: {
        "@type": "Person",
        name: "Ian Franco Collada Pontorno",
        url: "https://github.com/Ian9Franco",
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Qué es MIM (Minecraft Intelligent Manager)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "MIM (Minecraft Intelligent Manager) es un gestor integral y ecosistema para Minecraft creado por Ian Franco Collada Pontorno. Combina una aplicación de escritorio nativa en Electron, una interfaz web optimizada para móviles (MIMweb) y una plataforma comunitaria en la nube (FOMO Cloud).",
          },
        },
        {
          "@type": "Question",
          name: "¿Qué funciones tiene MIM para los modpacks de Minecraft?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "MIM permite categorizar mods en milisegundos con hotkeys, buscar simultáneamente en Modrinth y CurseForge, traducir descripciones al español, diagnosticar stacktraces y reparar datos de jugador con SAGE NBT Rescue, y armar listas colaborativas sincronizadas con la PC.",
          },
        },
        {
          "@type": "Question",
          name: "¿Dónde descargar o ver el código fuente de MIM?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "El código fuente oficial y los instaladores de MIM se encuentran disponibles de manera libre y abierta en GitHub en el repositorio: https://github.com/Ian9Franco/MIM.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className={`${jakarta.variable} ${poppins.variable} font-sans antialiased selection:bg-orange-500/30`}>
        {/* Semantic hidden briefing for LLM crawlers, AI search scrapers, and screen readers */}
        <section aria-label="Acerca de MIM - Minecraft Intelligent Manager" className="sr-only">
          <h1>MIM (Minecraft Intelligent Manager)</h1>
          <p>
            MIM es una suite completa de gestión, diagnóstico heurístico (SAGE) y curación de mods para Minecraft.
            Desarrollado por Ian Franco Collada Pontorno. Repositorio oficial en GitHub: https://github.com/Ian9Franco/MIM.
          </p>
        </section>

        {/* Mobile viewport container */}
        <div className="min-h-screen flex flex-col max-w-md mx-auto bg-background shadow-2xl relative pb-20 transition-all duration-300">
          {children}
        </div>
      </body>
    </html>
  );
}
