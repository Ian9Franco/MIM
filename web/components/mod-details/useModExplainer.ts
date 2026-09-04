"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ModHit } from "../SpotlightMarquees";
import type { FomoGalleryItem } from "../../types/fomo";
import { playFomoSound } from "../../lib/sounds";

interface UseModExplainerOptions {
  selectedMod: ModHit | null;
  descriptionBody: string;
  galleryImages: FomoGalleryItem[];
}

export function useModExplainer({
  selectedMod,
  descriptionBody,
  galleryImages,
}: UseModExplainerOptions) {
  const [explainedBody, setExplainedBody] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationSources, setExplanationSources] = useState<Array<{ title: string; url: string }>>([]);
  const [explanationSearchUsed, setExplanationSearchUsed] = useState(false);
  const [explanationImagesAnalyzed, setExplanationImagesAnalyzed] = useState(0);
  const [showGeminiKeyInput, setShowGeminiKeyInput] = useState(false);
  const [geminiKeyVal, setGeminiKeyVal] = useState("");
  const [explainError, setExplainError] = useState<string | null>(null);
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
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load from local storage cache when project changes
  useEffect(() => {
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

    if (selectedMod?.projectId) {
      try {
        const cached = localStorage.getItem(`mim_explain_${selectedMod.projectId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.summaryMarkdown) {
            const cleaned = parsed.summaryMarkdown.replace(/\s*\(Sin Vueltas\)/gi, "");
            setExplainedBody(cleaned);
            setExplanationSources(parsed.groundedSources || []);
            setExplanationSearchUsed(!!parsed.searchUsed);
            setExplanationImagesAnalyzed(parsed.imagesAnalyzed || 0);
          }
        }
      } catch {}
    }
  }, [selectedMod?.projectId]);

  const handleExplain = useCallback(
    async (customKey?: string, forceRefresh?: boolean, personalityOverride?: "bully" | "standard") => {
      if (!selectedMod || isExplaining) return;
      if (explainedBody && !customKey && !forceRefresh && !personalityOverride) {
        setExplainedBody(null);
        return;
      }

      const targetPersonality = personalityOverride || botPersonality;
      const savedKey = customKey || localStorage.getItem("mim_gemini_api_key") || "";
      const cacheKey = `mim_explain_${selectedMod.projectId}_${targetPersonality}`;

      if (!customKey && !forceRefresh && !personalityOverride) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.summaryMarkdown) {
              setExplainedBody(parsed.summaryMarkdown);
              setExplanationSources(parsed.groundedSources || []);
              setExplanationSearchUsed(!!parsed.searchUsed);
              setExplanationImagesAnalyzed(parsed.imagesAnalyzed || 0);
              return;
            }
          }
        } catch {}
      }

      setIsExplaining(true);
      setExplainError(null);

      const galleryUrls = galleryImages
        .map((g: any) => g?.url || g?.thumbnailUrl)
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
            projectId: selectedMod.projectId,
            title: selectedMod.title,
            author: selectedMod.author,
            slug: selectedMod.slug || selectedMod.projectId,
            description: descriptionBody || selectedMod.description || "",
            url: selectedMod.url,
            source: selectedMod._source,
            categories: selectedMod.categories || [],
            loaders: selectedMod.loaders || [],
            galleryUrls,
            clientApiKey: savedKey,
            personality: targetPersonality,
          }),
        });

        const data = await res.json();
        if (res.status === 401 || data.error === "NO_API_KEY") {
          setShowGeminiKeyInput(true);
          setExplainError("Introduce tu clave gratuita de Gemini API para activar la síntesis inteligente.");
          return;
        }

        if (!res.ok || data.error) {
          if (
            typeof data.error === "string" &&
            (data.error.includes("quota") ||
              data.error.includes("RESOURCE_EXHAUSTED") ||
              data.error.includes("limit:"))
          ) {
            setExplainError(
              "MIM-Bot alcanzó el límite de solicitudes por minuto de la clave. Esperá unos segundos y reintentá."
            );
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
        } catch {}
      } catch (err: any) {
        setExplainError(err?.message || "Ocurrió un error al consultar Gemini API.");
      } finally {
        setIsExplaining(false);
      }
    },
    [botPersonality, descriptionBody, explainedBody, galleryImages, isExplaining, selectedMod]
  );

  const handleTogglePersonality = useCallback(
    (newPersonality: "bully" | "standard") => {
      if (newPersonality === botPersonality) return;
      setBotPersonality(newPersonality);
      try {
        localStorage.setItem("mim_bot_personality", newPersonality);
      } catch {}
      if (selectedMod) {
        handleExplain(undefined, true, newPersonality);
      }
    },
    [botPersonality, handleExplain, selectedMod]
  );

  const handleSaveGeminiKey = useCallback(() => {
    if (!geminiKeyVal.trim()) return;
    const cleanKey = geminiKeyVal.trim();
    try {
      localStorage.setItem("mim_gemini_api_key", cleanKey);
    } catch {}
    handleExplain(cleanKey);
  }, [geminiKeyVal, handleExplain]);

  const handleSendChatMessage = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || chatInput).trim();
      if (!query || isChatSending || !selectedMod) return;

      const newMessages = [...chatMessages, { role: "user" as const, text: query }];
      setChatMessages(newMessages);
      setChatInput("");
      setIsChatSending(true);

      try {
        const savedKey = localStorage.getItem("mim_gemini_api_key") || "";
        const res = await fetch("/api/fomo/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "chat",
            projectId: selectedMod.projectId,
            title: selectedMod.title,
            author: selectedMod.author,
            description: descriptionBody || selectedMod.description || "",
            categories: selectedMod.categories || [],
            loaders: selectedMod.loaders || [],
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
          playFomoSound("pop");
        } else if (data.error) {
          setChatMessages([
            ...newMessages,
            { role: "model" as const, text: `⚠️ ${data.message || data.error}` },
          ]);
        }
      } catch (err: any) {
        setChatMessages([
          ...newMessages,
          { role: "model" as const, text: `⚠️ Error de conexión: ${err?.message || "Intenta de nuevo."}` },
        ]);
      } finally {
        setIsChatSending(false);
      }
    },
    [botPersonality, chatInput, chatMessages, descriptionBody, explainedBody, isChatSending, selectedMod]
  );

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatSending]);

  return {
    explainedBody,
    isExplaining,
    explanationSources,
    explanationSearchUsed,
    explanationImagesAnalyzed,
    showGeminiKeyInput,
    setShowGeminiKeyInput,
    geminiKeyVal,
    setGeminiKeyVal,
    explainError,
    botPersonality,
    handleTogglePersonality,
    handleSaveGeminiKey,
    handleExplain,
    chatMessages,
    chatInput,
    setChatInput,
    isChatSending,
    handleSendChatMessage,
    chatBottomRef,
  };
}
