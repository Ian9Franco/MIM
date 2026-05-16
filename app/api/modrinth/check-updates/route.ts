import { NextRequest, NextResponse } from "next/server";
import { checkModUpdate, updateCache } from "@/services/modrinth/UpdateService";
import { getApiKey } from "@/lib/settings";

const MODRINTH_API = "https://api.modrinth.com/v2";
const TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Endpoint para la verificación masiva y enriquecimiento de metadatos de mods.
 * Utiliza UpdateService para consultar y guardar en caché logos, categorías y versiones.
 */
export async function POST(req: NextRequest) {
  try {
    const { mods, loader, gameVersion, forceRefresh = false } = await req.json();
    if (!mods?.length || !loader || !gameVersion) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

    const cache = updateCache.get();
    const now = Date.now();
    const headers = { "User-Agent": "MIM-App/1.0", "Authorization": getApiKey("modrinth") || "" };

    const results: Record<string, any> = {};
    const toCheck: any[] = [];

    // 1. Filtrado por caché local
    for (const mod of mods) {
      const fileName = mod.fileName || mod.path.split(/[/\\]/).pop();
      const keySha1 = mod.meta?.sha1 ? `${mod.meta.sha1}-${loader}-${gameVersion}` : null;
      const keyPath = `${mod.path}-${loader}-${gameVersion}`;
      const keyFileName = `${fileName}-${loader}-${gameVersion}`;
      const cached = (keySha1 && cache.entries?.[keySha1]) || cache.entries?.[keyPath] || cache.entries?.[keyFileName];

      if (!forceRefresh && cached && (now - cached.cachedAt < TTL_MS)) {
        results[mod.path] = { ...cached.result, path: mod.path };
      } else {
        toCheck.push(mod);
      }
    }

    if (toCheck.length === 0) return NextResponse.json({ updates: results, cached: true });

    // 2. Resolución masiva de hashes (Optimización de API)
    const hashes = toCheck.map(m => m.meta?.sha1).filter(Boolean);
    const hashToProject: Record<string, string> = {};
    if (hashes.length > 0) {
      try {
        const hRes = await fetch(`${MODRINTH_API}/version_files`, { 
          method: "POST", 
          headers: { ...headers, "Content-Type": "application/json" }, 
          body: JSON.stringify({ hashes, algorithm: "sha1" }) 
        });
        if (hRes.ok) {
          const hData = await hRes.ok ? await hRes.json() : {};
          Object.entries(hData).forEach(([h, v]: any) => { hashToProject[h] = v; });
        }
      } catch (e) { console.warn("Error resolving hashes", e); }
    }

    // 3. Verificación secuencial con UpdateService
    for (const mod of toCheck) {
      results[mod.path] = await checkModUpdate(mod, loader, gameVersion, headers, hashToProject);
    }

    return NextResponse.json({ updates: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}