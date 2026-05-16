import { useState, useEffect, useCallback, useMemo } from "react";
import type { ModHit, VersionEntry } from "@/lib/types";

export function useFomoOverlayManager(mod: ModHit, versions: VersionEntry[], hideVersions: boolean) {
  const [activeTab, setActiveTab] = useState<"description" | "versions" | "dependencies" | "gallery">(hideVersions ? "description" : "versions");
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [depDownloading, setDepDownloading] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [depSearchQuery, setDepSearchQuery] = useState("");
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [followedMods, setFollowedMods] = useState<any[]>([]);

  // Gallery Logic
  const [gallery, setGallery] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);

  // Reset states when switching mods
  useEffect(() => {
    setGallery([]);
    setLoadingGallery(false);
    setLastFetchedId(null);
    setTranslatedBody(null);
    setDepSearchQuery("");
  }, [mod.projectId]);

  useEffect(() => {
    if (lastFetchedId !== mod.projectId && !loadingGallery) {
      setLoadingGallery(true);
      setLastFetchedId(mod.projectId);
      
      fetch(`/api/mod-gallery?projectId=${mod.projectId}&source=${mod._source || "modrinth"}`)
        .then(r => r.json())
        .then(d => {
          const items = d.gallery || [];
          setGallery(items);
          if (items.length > 0) {
            // Pre-fetch first image for the banner cache
            const img = new Image();
            img.src = items[0].url;
          }
        })
        .catch(e => {
          console.error("[Gallery] Fetch failed:", e);
        })
        .finally(() => setLoadingGallery(false));
    }
  }, [mod.projectId, mod._source, lastFetchedId, loadingGallery]);

  useEffect(() => {
    const load = () => {
      try {
        setFollowedAuthors(JSON.parse(localStorage.getItem("mim_followed_authors") || "[]"));
        setFollowedMods(JSON.parse(localStorage.getItem("mim_followed_mods") || "[]"));
      } catch {}
    };
    load();
    window.addEventListener("mim-followed-authors-changed", load);
    window.addEventListener("mim-followed-mods-changed", load);
    return () => { window.removeEventListener("mim-followed-authors-changed", load); window.removeEventListener("mim-followed-mods-changed", load); };
  }, []);

  const toggleFollowAuthor = useCallback((author: string) => {
    const next = followedAuthors.includes(author) ? followedAuthors.filter(a => a !== author) : [...followedAuthors, author];
    setFollowedAuthors(next);
    localStorage.setItem("mim_followed_authors", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: next }));
  }, [followedAuthors]);

  const toggleFollowMod = useCallback((m: ModHit) => {
    const exists = followedMods.some(x => x.projectId === m.projectId);
    const next = exists ? followedMods.filter(x => x.projectId !== m.projectId) : [...followedMods, m];
    setFollowedMods(next);
    localStorage.setItem("mim_followed_mods", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: next }));
  }, [followedMods]);

  const allDependencies = useMemo(() => {
    const ids = new Set(versions.flatMap(v => v.dependencies || []).map(d => d.projectId));
    return Array.from(ids).map(id => versions.flatMap(v => v.dependencies || []).find(d => d.projectId === id)!);
  }, [versions]);

  const handleTranslate = async () => {
    if (!mod.body || isTranslating) return;
    if (translatedBody) { setTranslatedBody(null); return; }
    setIsTranslating(true);
    try {
      // Limpieza básica de Markdown/HTML para extraer el texto puro
      const text = mod.body.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/!\[([^\]]*)\]\([^)]*\)/g, "");
      const temp = document.createElement("div"); temp.innerHTML = text;
      temp.querySelectorAll("a, img, script, style, code").forEach(el => el.remove());
      const full = temp.innerText.trim();
      if (!full) throw new Error("Texto vacío");

      // Dividir por párrafos (doble salto de línea)
      const paragraphs = full.split(/\n\s*\n/);
      let interleavedHTML = "";

      for (const para of paragraphs) {
        const cleanPara = para.trim();
        if (!cleanPara) continue;

        // Si el párrafo pasa los 250 caracteres, lo dividimos en bloques más pequeños
        const chunks: string[] = [];
        let remaining = cleanPara;
        while (remaining.length > 250) {
          // Buscamos un espacio para no cortar palabras
          let splitIdx = remaining.lastIndexOf(" ", 250);
          if (splitIdx === -1) splitIdx = 250; // Si no hay espacios, corte duro
          chunks.push(remaining.substring(0, splitIdx));
          remaining = remaining.substring(splitIdx).trim();
        }
        if (remaining) chunks.push(remaining);

        // Traducir cada bloque
        let translatedPara = "";
        for (const chunk of chunks) {
          try {
            // El límite es de unos 500 chars en MyMemory gratis, pero usamos 250 para estar seguros
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|es`);
            if (res.ok) {
              const d = await res.json();
              translatedPara += (d.responseData?.translatedText || chunk) + " ";
            } else {
              translatedPara += chunk + " "; // Fallback si falla
            }
          } catch (e) {
            console.error("[Translate] Chunk failed:", e);
            translatedPara += chunk + " ";
          }
        }

        // Construir el bloque HTML intercalado
        interleavedHTML += `
          <div class="mb-5 bg-white/[0.02] p-3 rounded-lg border border-white/5">
            <p class="text-white/60 text-xs leading-relaxed">${cleanPara}</p>
            <div class="mt-2 pt-2 border-t border-white/5">
              <p class="text-primary/90 text-sm leading-relaxed">🌐 ${translatedPara.trim()}</p>
            </div>
          </div>
        `;
      }

      setTranslatedBody(interleavedHTML);
    } catch (e) {
      console.error("[Translate] Failed:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  return { activeTab, setActiveTab, expandedVersion, setExpandedVersion, depDownloading, setDepDownloading, isTranslating, translatedBody, setTranslatedBody, depSearchQuery, setDepSearchQuery, followedAuthors, followedMods, toggleFollowAuthor, toggleFollowMod, allDependencies, handleTranslate, gallery, loadingGallery };
}
