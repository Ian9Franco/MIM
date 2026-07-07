import { NextResponse } from "next/server";

const KNOWN_PICKS = [
  {
    id: "curseforge-apr26",
    name: "10 Cool New Minecraft Mods (Abril)",
    description: "Nuevas mecánicas, bloques y tweaks frescos para recibir la primavera.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-apr26/featured-thumbnail.webp",
    slug: "curseforge-apr26",
    source: "curseforge",
    projectCount: 4,
    previewIcons: [
      "https://media.forgecdn.net/avatars/583/94/637962453676839352.png",
      "https://media.forgecdn.net/avatars/412/120/637628373672909439.png",
      "https://media.forgecdn.net/avatars/615/340/637996373672809439.png"
    ],
    mods: [
      {
        projectId: "waystones",
        title: "Waystones (CurseForge Pick)",
        description: "Agrega bloques de piedras de teletransporte que el jugador puede activar para viajar rápidamente por el mundo.",
        iconUrl: "https://media.forgecdn.net/avatars/583/94/637962453676839352.png",
        author: "Balm",
        projectType: "mod",
        categories: ["Forge", "Fabric", "Utility"],
        url: "https://www.curseforge.com/minecraft/mc-mods/waystones",
        _source: "curseforge"
      },
      {
        projectId: "xaeros-minimap",
        title: "Xaero's Minimap",
        description: "Un minimapa fluido y personalizable que muestra mobs, waypoints y detalles topográficos del mapa.",
        iconUrl: "https://media.forgecdn.net/avatars/412/120/637628373672909439.png",
        author: "Xaero",
        projectType: "mod",
        categories: ["Forge", "Fabric"],
        url: "https://www.curseforge.com/minecraft/mc-mods/xaeros-minimap",
        _source: "curseforge"
      },
      {
        projectId: "nature-compass",
        title: "Nature's Compass",
        description: "Una brújula especial que te permite localizar cualquier bioma en el mundo y ver información sobre él.",
        iconUrl: "https://media.forgecdn.net/avatars/615/340/637996373672809439.png",
        author: "ChaosPlayr",
        projectType: "mod",
        categories: ["Forge", "Fabric"],
        url: "https://www.curseforge.com/minecraft/mc-mods/natures-compass",
        _source: "curseforge"
      }
    ]
  },
  {
    id: "curseforge-mar26",
    name: "CurseForge Picks (Marzo)",
    description: "Selección de mods destacados por la comunidad durante el mes de marzo.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-mar26/featured-thumbnail.webp",
    slug: "curseforge-mar26",
    source: "curseforge",
    projectCount: 3,
    previewIcons: [
      "https://media.forgecdn.net/avatars/684/201/638101230198273641.png",
      "https://media.forgecdn.net/avatars/710/409/638128372671809439.png"
    ],
    mods: [
      {
        projectId: "jei",
        title: "Just Enough Items (JEI)",
        description: "El visualizador de recetas y recetas de crafteo más popular de Minecraft.",
        iconUrl: "https://media.forgecdn.net/avatars/684/201/638101230198273641.png",
        author: "mezz",
        projectType: "mod",
        categories: ["Forge", "Fabric", "Neoforge"],
        url: "https://www.curseforge.com/minecraft/mc-mods/jei",
        _source: "curseforge"
      },
      {
        projectId: "appleskin",
        title: "AppleSkin",
        description: "Mejora la barra de comida mostrando la saturación y la cantidad de curación de cada alimento.",
        iconUrl: "https://media.forgecdn.net/avatars/710/409/638128372671809439.png",
        author: "squeek502",
        projectType: "mod",
        categories: ["Forge", "Fabric"],
        url: "https://www.curseforge.com/minecraft/mc-mods/appleskin",
        _source: "curseforge"
      }
    ]
  }
];

export async function GET() {
  return NextResponse.json({ picks: KNOWN_PICKS });
}
