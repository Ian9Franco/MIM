import { useState, useEffect, useCallback, useMemo } from "react";
import type { ModHit, VersionEntry } from "@/lib/types";
import { mimDB } from "@/lib/indexeddb";

const translationCache: Record<string, string> = {}; // Cache de traducciones: projectId -> interleavedHTML

export function useFomoOverlayManager(mod: ModHit, versions: VersionEntry[], hideVersions: boolean) {
  const [activeTab, setActiveTab] = useState<"description" | "versions" | "dependencies" | "gallery">(hideVersions ? "description" : "versions");
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [depDownloading, setDepDownloading] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [fullBody, setFullBody] = useState<string | null>(null);
  const [depSearchQuery, setDepSearchQuery] = useState("");
  const [followedAuthors, setFollowedAuthors] = useState<any[]>([]);
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
    setFullBody(null);
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
    if (!mod.body) {
      const endpoint = mod._source === "curseforge" 
        ? `/api/curseforge/project?projectId=${mod.projectId}`
        : `/api/modrinth/project?projectId=${mod.projectId}`;
        
      fetch(endpoint)
        .then(r => r.json())
        .then(data => {
          if (data.body) {
            setFullBody(data.body);
          }
        })
        .catch(e => console.error("[FullBody] Fetch failed:", e));
    }
  }, [mod.projectId, mod.body, mod._source]);

  useEffect(() => {
    const load = async () => {
      try {
        await mimDB.init();
        const authors = await mimDB.getAllFollowedAuthors();
        const mods = await mimDB.getAllFollowedMods();
        
        setFollowedAuthors(authors);
        setFollowedMods(mods.map((m: any) => m.data));
      } catch (err) {
        console.error("Error loading followed data in overlay", err);
      }
    };
    load();
    
    const handleEvent = () => { load(); };
    
    window.addEventListener("mim-followed-authors-changed", handleEvent);
    window.addEventListener("mim-followed-mods-changed", handleEvent);
    return () => { 
      window.removeEventListener("mim-followed-authors-changed", handleEvent); 
      window.removeEventListener("mim-followed-mods-changed", handleEvent); 
    };
  }, []);

  const toggleFollowAuthor = useCallback(async (author: string) => {
    const exists = followedAuthors.some((a: any) => a?.name === author);
    let next;
    if (exists) {
      await mimDB.deleteFollowedAuthor(author);
      next = followedAuthors.filter((a: any) => a?.name !== author);
    } else {
      const newAuthor = { name: author, iconUrl: mod.iconUrl ?? undefined, dateFollowed: Date.now() };
      await mimDB.setFollowedAuthor(newAuthor);
      next = [...followedAuthors, newAuthor];
    }
    setFollowedAuthors(next);
    window.dispatchEvent(new CustomEvent("mim-followed-authors-changed", { detail: next }));
  }, [followedAuthors, mod.iconUrl]);

  const toggleFollowMod = useCallback(async (m: ModHit) => {
    const exists = followedMods.some(x => x.projectId === m.projectId);
    let next;
    if (exists) {
      await mimDB.deleteFollowedMod(m.projectId);
      next = followedMods.filter(x => x.projectId !== m.projectId);
    } else {
      await mimDB.setFollowedMod({ projectId: m.projectId, data: m, dateFollowed: Date.now() });
      next = [...followedMods, m];
    }
    setFollowedMods(next);
    window.dispatchEvent(new CustomEvent("mim-followed-mods-changed", { detail: next }));
  }, [followedMods]);

  const allDependencies = useMemo(() => {
    const ids = new Set(versions.flatMap(v => v.dependencies || []).map(d => d.projectId));
    return Array.from(ids).map(id => versions.flatMap(v => v.dependencies || []).find(d => d.projectId === id)!);
  }, [versions]);

  const handleTranslate = async () => {
    const textToTranslate = fullBody || mod.body || mod.description;
    if (!textToTranslate || isTranslating) return;
    if (translatedBody) { setTranslatedBody(null); return; }
    
    // Verificar cache
    if (translationCache[mod.projectId]) {
      setTranslatedBody(translationCache[mod.projectId]);
      return;
    }

    setIsTranslating(true);
    try {
      // Split by double newlines to process paragraph by paragraph
      const paragraphs = textToTranslate.split(/\n\s*\n/);
      let interleavedHTML = "";

      for (const para of paragraphs) {
        const cleanPara = para.trim();
        if (!cleanPara) continue;

        // Extraer imágenes Markdown: ![alt](url)
        const images: string[] = [];
        const imageRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
        let match;
        while ((match = imageRegex.exec(cleanPara)) !== null) {
          images.push(`<img src="${match[2]}" alt="${match[1]}" class="rounded-lg mt-2 max-w-full border border-white/10" loading="lazy" />`);
        }

        // Limpiar el texto para traducir (quitar imágenes y links complejos para no romper la API)
        const textToTrans = cleanPara
          .replace(/!\[([^\]]*)\]\([^)]*\)/g, "") // Quitar imágenes
          .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // Dejar solo el texto de los links
          .trim();

        let translatedPara = "";
        if (textToTrans) {
          const chunks: string[] = [];
          let remaining = textToTrans;
          while (remaining.length > 250) {
            let splitIdx = remaining.lastIndexOf(" ", 250);
            if (splitIdx === -1) splitIdx = 250;
            chunks.push(remaining.substring(0, splitIdx));
            remaining = remaining.substring(splitIdx).trim();
          }
          if (remaining) chunks.push(remaining);

          for (const chunk of chunks) {
            try {
              const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|es`);
              if (res.ok) {
                const d = await res.json();
                translatedPara += (d.responseData?.translatedText || chunk) + " ";
              } else {
                translatedPara += chunk + " ";
              }
            } catch (e) {
              console.error("[Translate] Chunk failed:", e);
              translatedPara += chunk + " ";
            }
          }
        }

        // Construir el bloque HTML intercalado manteniendo imágenes
        interleavedHTML += `
          <div class="mb-5 bg-white/[0.02] p-3 rounded-lg border border-white/5">
            ${textToTrans ? `<p class="text-white/60 text-xs leading-relaxed">${textToTrans}</p>` : ""}
            ${translatedPara ? `
              <div class="mt-2 pt-2 border-t border-white/5">
                <p class="text-primary/90 text-sm leading-relaxed">🌐 ${translatedPara.trim()}</p>
              </div>
            ` : ""}
            ${images.length > 0 ? `
              <div class="mt-3 space-y-2">
                ${images.join("")}
              </div>
            ` : ""}
          </div>
        `;
      }

      translationCache[mod.projectId] = interleavedHTML;
      setTranslatedBody(interleavedHTML);
    } catch (e) {
      console.error("[Translate] Failed:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  return { activeTab, setActiveTab, expandedVersion, setExpandedVersion, depDownloading, setDepDownloading, isTranslating, translatedBody, setTranslatedBody, fullBody, depSearchQuery, setDepSearchQuery, followedAuthors, followedMods, toggleFollowAuthor, toggleFollowMod, allDependencies, handleTranslate, gallery, loadingGallery };
}
