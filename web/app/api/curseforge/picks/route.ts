import { NextResponse } from "next/server";

const KNOWN_PICKS = [
  {
    id: "curseforge-apr26",
    name: "10 Cool New Minecraft Mods (Abril)",
    description: "Nuevas mecánicas, bloques y tweaks frescos para recibir la primavera.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-apr26/featured-thumbnail.webp",
    slug: "curseforge-apr26",
    source: "curseforge",
    projectCount: 10,
    previewIcons: [
      "https://media.forgecdn.net/avatars/583/94/637962453676839352.png",
      "https://media.forgecdn.net/avatars/412/120/637628373672909439.png",
      "https://media.forgecdn.net/avatars/615/340/637996373672809439.png"
    ]
  },
  {
    id: "curseforge-mar26",
    name: "CurseForge Picks (Marzo)",
    description: "Selección de mods destacados por la comunidad durante el mes de marzo.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-mar26/featured-thumbnail.webp",
    slug: "curseforge-mar26",
    source: "curseforge",
    projectCount: 10,
    previewIcons: [
      "https://media.forgecdn.net/avatars/684/201/638101230198273641.png",
      "https://media.forgecdn.net/avatars/710/409/638128372671809439.png"
    ]
  },
  {
    id: "curseforge-feb26",
    name: "CurseForge Picks (Febrero)",
    description: "Los mejores mods del mes de febrero, curados por CurseForge.",
    iconUrl: "https://www.curseforge.com/community-picks/assets/minecraft/curseforge-feb26/featured-thumbnail.webp",
    slug: "curseforge-feb26",
    source: "curseforge",
    projectCount: 10,
    previewIcons: [
      "https://media.forgecdn.net/avatars/690/342/638112390198113641.png"
    ]
  }
];

export async function GET() {
  return NextResponse.json({ picks: KNOWN_PICKS });
}
