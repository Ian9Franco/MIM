"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowLeft, Layers, ExternalLink, Loader2, ChevronRight, Plus, Heart, Languages,
} from "lucide-react";
import type { ModHit } from "./SpotlightMarquees";
import { playFomoSound } from "../lib/sounds";

interface ModDetailsSheetProps {
  selectedMod: ModHit | null;
  selectedModDetails: any;
  selectedModDeps: any[];
  loadingDetails: boolean;
  modStack: any[];
  activeStackIndex: number;
  modalTab: "summary" | "desc" | "versions" | "deps";
  setModalTab: (t: "summary" | "desc" | "versions" | "deps") => void;
  handleCloseModDetails: () => void;
  handleGoBackInStack: () => void;
  handleSwitchStackIndex: (i: number) => void;
  handleOpenModDetails: (mod: ModHit, isDep?: boolean) => void;
  /* Draft */
  userDrafts: any[];
  session: any;
  onAddToDraft: (mod: ModHit, draftId: string) => void;
  onOpenDraftPicker: (mod: ModHit) => void;
  /* Favorite */
  userFavorites: any[];
  onToggleFavorite: (mod: ModHit) => void;
}

const descriptionTranslationCache: Record<string, string> = {};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value: string) {
  const url = value.trim();
  if (/^(https?:|data:image\/)/i.test(url)) return url.replace(/"/g, "&quot;");
  return "";
}

function stripHtml(value: string) {
  return value
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderIframe(src: string) {
  const url = safeUrl(src);
  if (!url || !/(youtube\.com|youtube-nocookie\.com|youtu\.be)/i.test(url)) return "";
  return `<div class="mim-rich-embed"><iframe src="${url}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
}

function richDescriptionHtml(body: string) {
  if (!body) return "";
 
  let html = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[^>]*src=["']([^"']+)["'][\s\S]*?<\/iframe>/gi, (_m, src) => renderIframe(src))
    .replace(/\son\w+=["'][^"']*["']/gi, "")
    .replace(/\s(href|src)=["']\s*javascript:[^"']*["']/gi, ' $1="#"')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
      const url = safeUrl(src);
      return url ? `<img src="${url}" alt="${escapeHtml(alt)}" loading="lazy" />` : "";
    })
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label, href) => {
      const url = safeUrl(href);
      return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>` : escapeHtml(label);
    })
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/<br\s*\/?>/gi, "\n");

  html = html.replace(/\n{3,}/g, "\n\n").replace(/\n/g, "<br />");
  return html;
}

function renderBodyText(body: string) {
  if (!body) return <p className="text-xs text-white/40 italic">Sin descripción detallada disponible.</p>;

  // Detect and isolate raw markdown images
  const parts: React.ReactNode[] = [];
  const lines = body.split("\n");
  let currentTextParagraph: string[] = [];

  const flushText = (keyIndex: number) => {
    if (currentTextParagraph.length > 0) {
      parts.push(
        <p key={`txt-${keyIndex}`} className="text-[11.5px] text-white/70 leading-relaxed mb-3 whitespace-pre-wrap">
          {currentTextParagraph.join("\n")}
        </p>
      );
      currentTextParagraph = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Image Markdown matcher: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushText(idx);
      const url = safeUrl(imgMatch[2]);
      if (url) {
        parts.push(
          <div key={`img-${idx}`} className="my-4 rounded-xl overflow-hidden bg-white/5 border border-white/[0.06] aspect-video relative flex items-center justify-center">
            <img src={url} alt={imgMatch[1] || "Imagen del mod"} className="object-contain w-full h-full max-h-[220px]" loading="lazy" />
          </div>
        );
      }
    } else {
      currentTextParagraph.push(line);
    }
  });
  flushText(lines.length);

  return <div className="space-y-1">{parts}</div>;
}

async function translateDescription(projectId: string, markdown: string): Promise<string> {
  if (descriptionTranslationCache[projectId]) {
    return descriptionTranslationCache[projectId];
  }

  const clean = stripHtml(markdown).substring(0, 1600);
  if (!clean.trim()) return "";

  let html = "";
  try {
    const res = await fetch("/api/fomo/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean }),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const translated = data.translatedText || "";
    html = `
      <section class="mim-translation-block">
        <div class="mim-translation-original">${richDescriptionHtml(clean)}</div>
        ${translated.trim() ? `<div class="mim-translation-result">${escapeHtml(translated.trim())}</div>` : ""}
      </section>
    `;
  } catch {
    html = `
      <section class="mim-translation-block">
        <div class="mim-translation-original">${richDescriptionHtml(clean)}</div>
      </section>
    `;
  }

  descriptionTranslationCache[projectId] = html;
  return html;
}

/**
 * ModDetailsSheet — bottom sheet que muestra detalles de un mod.
 * - Drag-to-close: arrastrar hacia abajo cierra el sheet.
 * - Botón "Agregar al Draft" junto a "Ver Detalles Completos".
 * - Botón de favorito.
 */
export function ModDetailsSheet({
  selectedMod, selectedModDetails, selectedModDeps, loadingDetails,
  modStack, activeStackIndex, modalTab, setModalTab,
  handleCloseModDetails, handleGoBackInStack, handleSwitchStackIndex,
  handleOpenModDetails, userDrafts, session, onOpenDraftPicker,
  userFavorites, onToggleFavorite,
}: ModDetailsSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null); // Gallery Lightbox

  const descriptionBody = selectedModDetails?.body || selectedMod?.description || "";

  /** Play open sound and reset translation state when a new mod is opened */
  useEffect(() => {
    if (selectedMod) playFomoSound("on");
    setTranslatedBody(null);
    setIsTranslating(false);
  }, [selectedMod?.projectId]);

  /** Wrapper that plays close sound before dismissing the sheet */
  const closeWithSound = useCallback(() => {
    playFomoSound("off");
    handleCloseModDetails();
  }, [handleCloseModDetails]);

  const isFavorited = userFavorites.some(
    f => (f.mod_id || f.project_id || f.id) === selectedMod?.projectId
  );

  const handleTranslate = useCallback(async () => {
    if (!selectedMod || !descriptionBody || isTranslating) return;
    if (translatedBody) {
      setTranslatedBody(null);
      return;
    }

    setIsTranslating(true);
    try {
      setTranslatedBody(await translateDescription(selectedMod.projectId, descriptionBody));
    } finally {
      setIsTranslating(false);
    }
  }, [descriptionBody, isTranslating, selectedMod, translatedBody]);

  return (
    <>
      <AnimatePresence>
        {selectedMod && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end justify-center z-50"
            onClick={closeWithSound}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <motion.div
              ref={sheetRef}
              layout="size"
              initial={{ y: "112%", scale: 0.96, opacity: 0.75 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: "108%", scale: 0.98, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 26,
                mass: 0.9,
                bounce: 0.15
              }}
              className="bg-surface border-t border-border rounded-t-3xl w-full max-w-md pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-0 relative max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_e, info) => { if (info.offset.y > 80) closeWithSound(); }}
            >
              {/* Drag handle */}
              <div className="w-12 h-1 rounded-full bg-white/10 mx-auto mt-3 mb-1 shrink-0 cursor-grab" />

              <div className="flex flex-col gap-5 p-6 flex-1 min-h-0">
                {/* Stack breadcrumb */}
                {modStack.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/[0.06] shrink-0">
                    <button
                      onClick={handleGoBackInStack}
                      className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl text-white/70 active:scale-95 transition-all flex items-center justify-center shrink-0"
                      title="Volver"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                      {modStack.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSwitchStackIndex(idx)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap border ${
                            activeStackIndex === idx
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                              : "bg-white/5 text-white/50 hover:text-white/80 border-transparent"
                          }`}
                        >
                          {item.mod.title.length > 15 ? `${item.mod.title.slice(0, 12)}...` : item.mod.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mod header */}
                <div className="flex gap-4 shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedMod.iconUrl ? (
                      <img src={selectedMod.iconUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white/40 font-bold uppercase">{selectedMod.title.substring(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-orange-400 font-semibold">MIM Mod Details</span>
                    <h3 className="text-sm font-bold text-white mt-0.5 pr-6 leading-tight">{selectedMod.title}</h3>
                    <p className="text-[10px] text-white/40 mt-1">Autor: <span className="text-white/60">{selectedMod.author || "Comunidad"}</span></p>
                  </div>
                  <div className="flex flex-col gap-1.5 absolute right-5 top-5">
                    {/* Favorite button */}
                    {session && (
                      <button
                        onClick={() => onToggleFavorite(selectedMod)}
                        className={`bg-white/5 hover:bg-white/10 rounded-full p-1.5 text-white/60 active:scale-95 transition-all ${isFavorited ? "text-red-400" : ""}`}
                        title="Favorito"
                      >
                        <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-400 text-red-400" : ""}`} />
                      </button>
                    )}
                    <button
                      onClick={closeWithSound}
                      className="bg-white/5 hover:bg-white/10 rounded-full p-1.5 text-white/60 active:scale-95 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Modal tabs */}
                <div className="flex gap-1 border-b border-white/[0.06] pb-1 shrink-0 overflow-x-auto scrollbar-none">
                  {[
                    { id: "summary", label: "Resumen" },
                    { id: "desc", label: "Descripción" },
                    { id: "versions", label: "Versiones" },
                    { id: "deps", label: "Dependencias" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setModalTab(t.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                        modalTab === t.id
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          : "text-white/50 hover:text-white/80"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 pr-1 scrollbar-none min-h-0">
                  <AnimatePresence mode="wait">
                    {modalTab === "summary" && (
                      <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex flex-col gap-4">
                        {/* Stats row */}
                        <div className="flex gap-3 text-[10px] border-b border-white/[0.04] pb-3 flex-wrap">
                          <div className="flex-1 min-w-[70px]">
                            <span className="text-white/30 block uppercase font-mono tracking-wider">Origen</span>
                            <span className="text-white/70 font-semibold mt-0.5 block capitalize">{selectedMod._source || "Modrinth"}</span>
                          </div>
                          {selectedMod.categories && selectedMod.categories.length > 0 && (
                            <div className="flex-1 min-w-[120px]">
                              <span className="text-white/30 block uppercase font-mono tracking-wider">Etiquetas</span>
                              <span className="text-white/70 font-semibold mt-0.5 block truncate capitalize">{selectedMod.categories.join(", ")}</span>
                            </div>
                          )}
                          {selectedMod.downloads !== undefined && (
                            <div className="min-w-[50px]">
                              <span className="text-white/30 block uppercase font-mono tracking-wider">Descargas</span>
                              <span className="text-orange-400 font-bold mt-0.5 block font-mono">
                                {selectedMod.downloads >= 1_000_000 ? `${(selectedMod.downloads / 1_000_000).toFixed(1)}M` : selectedMod.downloads >= 1_000 ? `${Math.round(selectedMod.downloads / 1_000)}K` : selectedMod.downloads}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                          <p className="text-xs text-white/75 leading-relaxed">
                            {selectedMod.description || "Este mod expande las opciones de automatización y es totalmente compatible con la versión activa."}
                          </p>
                        </div>

                        {/* Compatibility */}
                        <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 text-[11px] text-white/70">
                          <div>
                            <span className="text-[9px] text-white/30 uppercase font-mono block">Lado Cliente</span>
                            <span className="font-semibold block capitalize mt-0.5">{selectedModDetails?.client_side || "Desconocido"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-white/30 uppercase font-mono block">Lado Servidor</span>
                            <span className="font-semibold block capitalize mt-0.5">{selectedModDetails?.server_side || "Desconocido"}</span>
                          </div>
                          {selectedModDetails?.license && (
                            <div className="col-span-2">
                              <span className="text-[9px] text-white/30 uppercase font-mono block">Licencia</span>
                              <span className="font-semibold block mt-0.5">{selectedModDetails.license.name || selectedModDetails.license.id}</span>
                            </div>
                          )}
                        </div>

                        {/* External links */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {selectedModDetails?.wiki_url && (
                            <a href={selectedModDetails.wiki_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all">
                              <ExternalLink className="w-3 h-3" /> Wiki
                            </a>
                          )}
                          {selectedModDetails?.source_url && (
                            <a href={selectedModDetails.source_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all">
                              <ExternalLink className="w-3 h-3" /> Código Fuente
                            </a>
                          )}
                          {selectedModDetails?.issues_url && (
                            <a href={selectedModDetails.issues_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all">
                              <ExternalLink className="w-3 h-3" /> Reportes
                            </a>
                          )}
                          {selectedModDetails?.discord_url && (
                            <a href={selectedModDetails.discord_url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-white/10 border border-white/[0.06] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white/80 flex items-center gap-1.5 transition-all">
                              <ExternalLink className="w-3 h-3" /> Discord
                            </a>
                          )}
                        </div>

                        {/* Gallery */}
                        {selectedModDetails?.gallery && selectedModDetails.gallery.length > 0 && (
                          <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
                            <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block">Galería</span>
                            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
                              {selectedModDetails.gallery.map((img: any, i: number) => (
                                <div
                                  key={i}
                                  onClick={() => setActiveImageUrl(img.url)}
                                  className="relative aspect-video h-20 rounded-xl overflow-hidden bg-white/5 border border-white/[0.05] flex-shrink-0 snap-center cursor-pointer hover:border-white/20 transition-all hover:scale-[1.02]"
                                >
                                  <img src={img.url} alt={img.title || "Screenshot"} className="object-cover w-full h-full" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {modalTab === "desc" && (
                      <motion.div key="desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 min-h-[200px]">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 font-bold">Descripción</span>
                          <button
                            type="button"
                            onClick={handleTranslate}
                            disabled={isTranslating || !descriptionBody}
                            className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                            style={{
                              color: "var(--color-primary)",
                              background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                              borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                            }}
                          >
                            {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                            {isTranslating ? "Traduciendo" : translatedBody ? "Original" : "Traducir"}
                          </button>
                        </div>
                        {translatedBody ? (
                          <div className="mim-rich-description" dangerouslySetInnerHTML={{ __html: translatedBody }} />
                        ) : (
                          renderBodyText(descriptionBody)
                        )}
                      </motion.div>
                    )}

                    {modalTab === "versions" && (
                      <motion.div key="versions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex flex-col gap-2.5">
                        {loadingDetails ? (
                          <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                          </div>
                        ) : selectedModDetails?.game_versions?.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">Versiones de Minecraft Compatibles</span>
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                              {selectedModDetails.game_versions.map((ver: string) => (
                                <span key={ver} className="bg-white/5 border border-white/[0.08] text-white/70 text-[9px] px-2.5 py-0.5 rounded-full font-mono">{ver}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-white/40 italic">No se listaron versiones compatibles.</p>
                        )}
                      </motion.div>
                    )}

                    {modalTab === "deps" && (
                      <motion.div key="deps" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex flex-col gap-2.5">
                        {loadingDetails ? (
                          <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                          </div>
                        ) : selectedModDeps?.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">Dependencias ({selectedModDeps.length})</span>
                            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-none">
                              {selectedModDeps.map((dep: any) => (
                                <div
                                  key={dep.id}
                                  onClick={() => handleOpenModDetails({
                                    projectId: dep.id, title: dep.title, description: dep.description || "",
                                    iconUrl: dep.icon_url, author: dep.author || "Comunidad",
                                    projectType: dep.project_type || "mod", categories: dep.categories || [],
                                    url: `https://modrinth.com/${dep.project_type || "mod"}/${dep.slug}`, _source: "modrinth"
                                  }, true)}
                                  className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] rounded-xl p-2 flex items-center gap-3 transition-colors cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {dep.icon_url ? <img src={dep.icon_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white/40 text-xs font-bold uppercase">{dep.title.substring(0, 2)}</span>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold text-white truncate block">{dep.title}</span>
                                    <span className="text-[9px] text-white/45 block capitalize">{dep.project_type || "mod"}</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-white/40 italic">Este proyecto no requiere ninguna dependencia.</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer action buttons */}
                <div className="flex gap-2 mt-auto pt-2 border-t border-white/[0.04] shrink-0">
                  <button
                    onClick={() => setModalTab(modalTab === "summary" ? "desc" : "summary")}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {modalTab === "summary" ? (
                      <><Layers className="w-4 h-4" /> Ver Detalles Completos</>
                    ) : (
                      <><ArrowLeft className="w-4 h-4" /> Volver al Resumen</>
                    )}
                  </button>

                  {/* Add to Draft button — visible when user is logged in */}
                  {session && (
                    <button
                      onClick={() => onOpenDraftPicker({
                        ...selectedMod,
                        projectType: selectedModDetails?.project_type || selectedMod.projectType,
                        categories: selectedMod.categories || selectedModDetails?.categories || [],
                        ...(selectedModDetails?.game_versions ? { game_versions: selectedModDetails.game_versions } : {}),
                      } as ModHit)}
                      className="shrink-0 px-3 py-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                      style={{
                        background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                        color: "var(--color-primary)",
                      }}
                      title="Agregar al Draft"
                    >
                      <Plus className="w-4 h-4" />
                      Draft
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox / Fullscreen Image Viewer */}
      <AnimatePresence>
        {activeImageUrl && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[600]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImageUrl(null)}
          >
            <motion.div
              className="relative max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={activeImageUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
              <button
                onClick={() => setActiveImageUrl(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white/80 transition-all cursor-pointer border border-white/15 active:scale-95 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
