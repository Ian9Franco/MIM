import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ModHit, VersionEntry } from "@/lib/core/types";
import { mimDB } from "@/lib/storage/indexeddb";

const translationCache: Record<string, string> = {}; // Cache de traducciones: projectId -> interleavedHTML

function normalizeGallery(rawGallery: any[] | undefined): any[] {
  if (!rawGallery?.length) return [];
  return rawGallery
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        return { url: item, thumbnailUrl: item, title: "" };
      }
      if (typeof item === "object") {
        const url = item.url || item.raw_url || item.image_url || item.imageUrl || item.value || "";
        const thumbnailUrl =
          item.thumbnailUrl || item.thumbnail_url || item.url || item.raw_url || item.image_url || item.imageUrl || item.value || "";
        return {
          url,
          thumbnailUrl,
          title: item.title || item.description || item.caption || "",
          description: item.description || item.caption || "",
          featured: item.featured || false,
        };
      }
      return null;
    })
    .filter((g) => g && g.url);
}

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

  // Explainer Logic (Gemini Flash Multimodal + Grounded)
  const [explainedBody, setExplainedBody] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationSources, setExplanationSources] = useState<Array<{ title: string; url: string }>>([]);
  const [explanationSearchUsed, setExplanationSearchUsed] = useState(false);
  const [explanationImagesAnalyzed, setExplanationImagesAnalyzed] = useState(0);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [showGeminiKeyInput, setShowGeminiKeyInput] = useState(false);
  const [botPersonality, setBotPersonality] = useState<"bully" | "standard">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mim_bot_personality");
        if (saved === "bully" || saved === "standard") return saved;
      } catch {}
    }
    return process.env.NEXT_PUBLIC_BOT_PERSONALITY === "standard" ? "standard" : "bully";
  });
  // Project Mini-Chat
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "model"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);

  // Gallery Logic
  const [gallery, setGallery] = useState<any[]>(normalizeGallery(mod.gallery));
  const [loadingGallery, setLoadingGallery] = useState(false);
  const lastFetchedKey = useRef<string | null>(null);

  // Reset states when switching mods
  useEffect(() => {
    setGallery(normalizeGallery(mod.gallery));
    setLoadingGallery(false);
    lastFetchedKey.current = null;
    setTranslatedBody(null);
    setFullBody(null);
    setExplainedBody(null);
    setIsExplaining(false);
    setExplanationSources([]);
    setExplanationSearchUsed(false);
    setExplanationImagesAnalyzed(0);
    setExplainError(null);
    setShowGeminiKeyInput(false);
    setChatMessages([]);
    setChatInput("");
    setIsChatSending(false);
    setDepSearchQuery("");

    try {
      const cached =
        localStorage.getItem(`mim_explain_${mod.projectId}_${botPersonality}`) ||
        localStorage.getItem(`mim_explain_${mod.projectId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.summaryMarkdown) {
          setExplainedBody(parsed.summaryMarkdown);
          setExplanationSources(parsed.groundedSources || []);
          setExplanationSearchUsed(!!parsed.searchUsed);
          setExplanationImagesAnalyzed(parsed.imagesAnalyzed || 0);
        }
      }
    } catch {
      // ignore
    }
  }, [mod.projectId, mod.gallery, botPersonality]);

  useEffect(() => {
    if (mod._source === "chunk") {
      setLoadingGallery(false);
      return;
    }
    const gallerySource = mod._source === "curseforge" || mod.url?.includes("curseforge.com") ? "curseforge" : "modrinth";
    const fetchKey = `${gallerySource}:${mod.projectId}`;
    if (lastFetchedKey.current === fetchKey) return; // Ya se hizo fetch para este proyecto
    
    console.log(`[Gallery Hook] Starting fetch for ${fetchKey}, gallery init size: ${(mod.gallery || []).length}`);
    
    setLoadingGallery(true);
    lastFetchedKey.current = fetchKey;
    const controller = new AbortController();
    
    const doFetch = async (retries = 2, delayMs = 400) => {
      try {
        const url = `/api/mod-gallery?projectId=${encodeURIComponent(mod.projectId)}&source=${gallerySource}&debug=true`;
        console.log(`[Gallery Hook] Fetching: ${url}`);
        
        const r = await fetch(url, { signal: controller.signal });
        
        console.log(`[Gallery Hook] Response status: ${r.status}`);
        
        if (!r.ok) {
          const text = await r.text();
          console.warn(`[Gallery] HTTP ${r.status} - Response: ${text}`);
          throw new Error(`HTTP ${r.status}`);
        }
        
        const d = await r.json();
        console.log(`[Gallery Hook] Response data:`, d);
        
        const items = normalizeGallery(d.gallery || []);
        console.log(`[Gallery Hook] Extracted ${items.length} images, first item:`, items[0]);
        
        setGallery(items);
        
        if (items.length > 0) {
          // NOTE: Disabled automatic preload for debugging render issues.
          // Preloading can be re-enabled once root cause is identified.
          console.log(`[Gallery Hook] Preload disabled for debugging. First image: ${items[0].url}`);
        }
      } catch (e: any) {
        if (e?.name === "AbortError") {
          console.log("[Gallery Hook] Fetch aborted");
          return;
        }
        if (retries > 0) {
          console.warn(`[Gallery Hook] Fetch failed, retrying (${retries} left):`, e.message);
          await new Promise(res => setTimeout(res, delayMs));
          return doFetch(retries - 1, delayMs * 1.5);
        }
        console.error("[Gallery] Fetch failed after retries:", e);
        setGallery([]); // Mostrar galería vacía en lugar de skeleton infinito
      } finally {
        setLoadingGallery(false);
      }
    };
    
    // Small delay to avoid race with other fetches on mount
    const t = setTimeout(() => doFetch(), 150);
    return () => { controller.abort(); clearTimeout(t); };
  }, [mod.projectId, mod._source]);

  useEffect(() => {
    if (mod.body || mod._source === "chunk") return;
    const controller = new AbortController();
    const endpoint = (mod._source === "curseforge" || mod.url?.includes("curseforge.com"))
      ? `/api/curseforge/project?projectId=${mod.projectId}`
      : `/api/modrinth/project?projectId=${mod.projectId}`;
    
    const doFetch = async (retries = 2, delayMs = 500) => {
      try {
        const r = await fetch(endpoint, { signal: controller.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (data.body) setFullBody(data.body);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (retries > 0) {
          await new Promise(res => setTimeout(res, delayMs));
          return doFetch(retries - 1, delayMs * 1.5);
        }
        console.error("[FullBody] Fetch failed after retries:", e);
      }
    };
    
    const t = setTimeout(() => doFetch(), 200);
    return () => { controller.abort(); clearTimeout(t); };
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

  const handleExplain = async (customKey?: string, forceRefresh?: boolean, personalityOverride?: "bully" | "standard") => {
    if (isExplaining) return;
    if (explainedBody && !customKey && !forceRefresh && !personalityOverride) {
      setExplainedBody(null);
      return;
    }

    const targetPersonality = personalityOverride || botPersonality;
    const savedKey = customKey || localStorage.getItem("mim_gemini_api_key") || "";
    const cacheKey = `mim_explain_${mod.projectId}_${targetPersonality}`;

    if (!customKey && !forceRefresh && !personalityOverride) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.summaryMarkdown) {
            const cleaned = parsed.summaryMarkdown.replace(/\s*\(Sin Vueltas\)/gi, "");
            setExplainedBody(cleaned);
            setExplanationSources(parsed.groundedSources || []);
            setExplanationSearchUsed(!!parsed.searchUsed);
            setExplanationImagesAnalyzed(parsed.imagesAnalyzed || 0);
            return;
          }
        }
      } catch (e) {
        console.warn("[useFomoOverlayManager] Failed to read explanation cache:", e);
      }
    }

    setIsExplaining(true);
    setExplainError(null);

    const galleryUrls = (gallery || [])
      .map((g: any) => g?.thumbnailUrl || g?.url)
      .filter((u: any): u is string => typeof u === "string" && u.length > 0)
      .slice(0, 5);

    try {
      const res = await fetch("/api/fomo/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          projectId: mod.projectId,
          title: mod.title,
          author: mod.author,
          slug: mod.slug || mod.projectId,
          description: fullBody || mod.body || mod.description || "",
          url: mod.url,
          source: mod._source,
          categories: mod.categories || [],
          loaders: mod.loaders || [],
          galleryUrls,
          clientApiKey: savedKey,
          personality: targetPersonality,
        }),
      });

      const data = await res.json();

      if (res.status === 401 || data.error === "NO_API_KEY") {
        setShowGeminiKeyInput(true);
        setExplainError("Introduce tu clave de Gemini API para activar la explicación inteligente.");
        return;
      }

      if (!res.ok || data.error) {
        if (typeof data.error === "string" && (data.error.includes("quota") || data.error.includes("RESOURCE_EXHAUSTED") || data.error.includes("limit:"))) {
          setExplainError("MIM-Bot alcanzó el límite de solicitudes por minuto de la clave. Esperá unos segundos y reintentá.");
          return;
        }
        throw new Error(data.error || "No se pudo sintetizar la explicación.");
      }

      const cleanedSummary = (data.summaryMarkdown || "").replace(/\s*\(Sin Vueltas\)/gi, "");
      setExplainedBody(cleanedSummary);
      setExplanationSources(data.groundedSources || []);
      setExplanationSearchUsed(!!data.searchUsed);
      setExplanationImagesAnalyzed(data.imagesAnalyzed || 0);
      setShowGeminiKeyInput(false);

      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ...data, summaryMarkdown: cleanedSummary }));
      } catch (e) {
        console.warn("[useFomoOverlayManager] Failed to write explanation cache:", e);
      }
    } catch (err: any) {
      console.error("[Mod Explainer] Error:", err);
      setExplainError(err?.message || "Error al conectar con Gemini API.");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleTogglePersonality = (newPersonality: "bully" | "standard") => {
    if (newPersonality === botPersonality) return;
    setBotPersonality(newPersonality);
    try {
      localStorage.setItem("mim_bot_personality", newPersonality);
    } catch {}
    if (mod) {
      handleExplain(undefined, true, newPersonality);
    }
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const query = (textToSend || chatInput).trim();
    if (!query || isChatSending || !mod) return;

    const newMessages = [...chatMessages, { role: "user" as const, text: query }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatSending(true);

    try {
      const savedKey = localStorage.getItem("mim_gemini_api_key") || "";
      const res = await fetch("/api/fomo/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-key": savedKey } : {}),
        },
        body: JSON.stringify({
          mode: "chat",
          projectId: mod.projectId,
          title: mod.title,
          author: mod.author,
          description: fullBody || mod.description || "",
          categories: mod.categories || [],
          loaders: mod.loaders || [],
          initialSummary: explainedBody || "",
          clientApiKey: savedKey,
          messages: chatMessages,
          question: query,
          personality: botPersonality,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setChatMessages([...newMessages, { role: "model" as const, text: data.reply }]);
      } else if (data.error) {
        setChatMessages([
          ...newMessages,
          { role: "model" as const, text: `⚠️ ${data.message || data.error}` },
        ]);
      }
    } catch (err: any) {
      console.error("[ProjectChat] Error:", err);
      setChatMessages([
        ...newMessages,
        { role: "model" as const, text: `⚠️ Error de red al consultar el asistente.` },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    expandedVersion,
    setExpandedVersion,
    depDownloading,
    setDepDownloading,
    isTranslating,
    translatedBody,
    setTranslatedBody,
    fullBody,
    depSearchQuery,
    setDepSearchQuery,
    followedAuthors,
    followedMods,
    toggleFollowAuthor,
    toggleFollowMod,
    allDependencies,
    handleTranslate,
    gallery,
    loadingGallery,
    // Explainer additions:
    explainedBody,
    setExplainedBody,
    isExplaining,
    explanationSources,
    explanationSearchUsed,
    explanationImagesAnalyzed,
    explainError,
    showGeminiKeyInput,
    setShowGeminiKeyInput,
    handleExplain,
    botPersonality,
    handleTogglePersonality,
    // Mini-Chat additions:
    chatMessages,
    chatInput,
    setChatInput,
    isChatSending,
    handleSendChatMessage,
  };
}
