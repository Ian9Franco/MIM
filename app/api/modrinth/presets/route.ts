/**
 * /api/modrinth/presets — GET
 * ─────────────────────────────────────────────────────────────────────────────
 * Devuelve colecciones públicas populares de Modrinth que sirven como
 * "plantillas" o presets para iniciar nuevos proyectos.
 *
 * Estas colecciones son curadas externamente (ej: "Starter Tech Pack",
 * "Vanilla Enhancements", "Magic Adventure") y permiten a los usuarios
 * descargar un conjunto completo de mods con un solo clic.
 *
 * GET — sin body, sin params.
 * Respuesta: { presets: PresetCollection[] }
 *
 * Las colecciones preset son IDs públicos de colecciones populares en Modrinth.
 * Se obtienen sus metadatos y se presentan como plantillas externas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";

const MODRINTH_API = "https://api.modrinth.com/v2";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface PresetCollection {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl: string | null;
  tags: string[]; // Ej: ["tech", "beginner", "1.20.1"]
  recommendedLoader: string;
  recommendedVersion: string;
}

// ── Colecciones Preset Curadas ────────────────────────────────────────────────
// IDs de colecciones públicas populares en Modrinth
// Estas actúan como "plantillas" para usuarios que quieren empezar rápido

const PRESET_COLLECTION_IDS = [
  // Nota: Estos son IDs de ejemplo. En producción, serían colecciones reales.
  // Para testing/demo, podemos usar IDs de proyectos populares como "preset"
  {
    id: "starter-tech",
    name: "⚡ Starter Tech Pack",
    description: "Las mejores mods de tecnología para empezar: Create, Thermal, Mekanism. Optimizado para principiantes.",
    projectIds: ["create", "thermal-expansion", "mekanism", "jei", "jade", "configured"],
    tags: ["tech", "beginner", "machines"],
    recommendedLoader: "forge",
    recommendedVersion: "1.20.1",
  },
  {
    id: "vanilla-plus",
    name: "➕ Vanilla Enhancements",
    description: "Mantén la esencia vanilla pero mejorada. Quality of life, optimización y pequeñas adiciones.",
    projectIds: ["sodium", "lithium", "starlight", "jei", "jade", "appleskin", "comforts"],
    tags: ["vanilla", "performance", "qol"],
    recommendedLoader: "fabric",
    recommendedVersion: "1.20.1",
  },
  {
    id: "magic-adventure",
    name: "🔮 Magic & Adventure",
    description: "Exploración, magia y aventura. Botania, Ars Nouveau, Twilight Forest y más.",
    projectIds: ["botania", "ars-nouveau", "twilight-forest", "jei", "jade", "waystones"],
    tags: ["magic", "exploration", "adventure"],
    recommendedLoader: "forge",
    recommendedVersion: "1.20.1",
  },
  {
    id: "performance-core",
    name: "🚀 Performance Essentials",
    description: "Solo mods de optimización. Máximos FPS sin cambiar la experiencia vanilla.",
    projectIds: ["sodium", "lithium", "starlight", "ferrite-core", "lazydfu", "krypton"],
    tags: ["performance", "minimal", "fps"],
    recommendedLoader: "fabric",
    recommendedVersion: "1.20.1",
  },
  {
    id: "builders-dream",
    name: "🏗️ Builder's Dream",
    description: "Mods para construcción creativa: Flywheel, WorldEdit, más bloques decorativos.",
    projectIds: ["flywheel", "worldedit", "blockus", "jei", "roughly-enough-items"],
    tags: ["building", "creative", "decor"],
    recommendedLoader: "fabric",
    recommendedVersion: "1.20.1",
  },
];

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const headers: Record<string, string> = {
    "User-Agent": "MIM-App/1.0 (contact@mim.local)",
  };
  if (process.env.MODRINTH_API_KEY) {
    headers["Authorization"] = process.env.MODRINTH_API_KEY;
  }

  try {
    // Enriquecer los presets con datos actuales de Modrinth
    const presets: PresetCollection[] = await Promise.all(
      PRESET_COLLECTION_IDS.map(async (preset) => {
        // Obtener metadatos de los proyectos para contar cuántos están disponibles
        const validProjects: string[] = [];
        
        for (const projectId of preset.projectIds) {
          try {
            const res = await fetch(`${MODRINTH_API}/project/${projectId}`, {
              headers,
              // Cache corto para no saturar la API
              next: { revalidate: 3600 },
            });
            if (res.ok) {
              validProjects.push(projectId);
            }
          } catch {
            // Proyecto no disponible, lo saltamos
          }
        }

        // Retornar objeto enriquecido con metadatos
        const enriched: PresetCollection & { _projectIds: string[] } = {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          projectCount: validProjects.length,
          iconUrl: null, // Podríamos obtener el icon del primer proyecto
          tags: preset.tags,
          recommendedLoader: preset.recommendedLoader,
          recommendedVersion: preset.recommendedVersion,
          _projectIds: validProjects,
        };
        return enriched;
      })
    );

    // Limpiar el campo interno antes de enviar
    const cleanPresets: PresetCollection[] = presets.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      projectCount: p.projectCount,
      iconUrl: p.iconUrl,
      tags: p.tags,
      recommendedLoader: p.recommendedLoader,
      recommendedVersion: p.recommendedVersion,
    }));

    return NextResponse.json({ 
      presets: cleanPresets,
      total: cleanPresets.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/modrinth/presets] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
