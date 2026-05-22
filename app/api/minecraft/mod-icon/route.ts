import { NextRequest, NextResponse } from "next/server";
import { scanMod } from "@/lib/modding/enhanced-mod-scanner";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Scan the mod to get the icon
    const meta = await scanMod(filePath);
    
    if (meta.iconBase64) {
      return NextResponse.json({ iconBase64: meta.iconBase64 });
    }

    // Fallback: Buscar en Modrinth si no tiene ícono local
    const fileName = path.basename(filePath);
    const modName = fileName
      .replace(/\.(jar|zip|mrpack)$/i, "")
      .replace(/[-_]/g, " ")
      .replace(/\s+v?\d[\d.]*[\w.-]*$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    try {
      const searchRes = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(modName)}&limit=1`, {
        headers: { "User-Agent": "Ian9Franco/MIM" }
      });
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.hits && searchData.hits.length > 0) {
          const iconUrl = searchData.hits[0].icon_url;
          if (iconUrl) {
            const imgRes = await fetch(iconUrl);
            if (imgRes.ok) {
              const buf = await imgRes.arrayBuffer();
              const base64 = Buffer.from(buf).toString("base64");
              return NextResponse.json({ iconBase64: `data:image/png;base64,${base64}` });
            }
          }
        }
      }
    } catch (apiErr) {
      console.error(`Failed to fetch fallback icon from Modrinth for ${modName}:`, apiErr);
    }
    
    return NextResponse.json({ iconBase64: null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
