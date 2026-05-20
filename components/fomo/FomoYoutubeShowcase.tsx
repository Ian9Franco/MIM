"use client";

/**
 * FomoYoutubeShowcase
 * ─────────────────────────────────────────────────────────────────────────────
 * Carrusel editorial que muestra los mods del último video de un canal de YT.
 * — Modo "spotlight": solo el video más reciente (1 fila en el panel derecho).
 * — Usa `cachedYoutubeShowcase` para stale-while-revalidate, de modo que el
 *   usuario NUNCA ve un spinner si ya hay datos cacheados.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { CirclePlay, ExternalLink, Loader2, AlertTriangle, Download, TvMinimalPlay } from "lucide-react";
import { useSmoothMarquee } from "@/hooks/useSmoothMarquee";
import { cachedYoutubeShowcase } from "@/lib/smart-cache";
import type { ModHit } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface YoutubeShowcaseEntry {
  title: string;
  thumbnail: string;
  videoUrl: string;
  videoId: string;
  modSlugs: string[];        // "modrinth:sodium" | "curseforge:jei"
  publishedAt: string;
}

export interface ResolvedShowcaseMod extends ModHit {
  _showcaseSource?: "modrinth" | "curseforge";
}

interface FomoYoutubeShowcaseProps {
  channelUrl?: string;
  onOpenVersions: (mod: ModHit) => void;
  onDownloadMod: (mod: ModHit) => Promise<void>;
  downloading: Record<string, boolean>;
  globalLoader?: string;
  /** Tema visual heredado de Spotlight */
  theme?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolver slugs via fomo APIs
// ─────────────────────────────────────────────────────────────────────────────

async function resolveSlug(identifier: string): Promise<ResolvedShowcaseMod | null> {
  const parts = identifier.split(":");
  const platform = parts[0];
  const slug = parts[2] || parts[1]; // Tomamos la 3ra parte (slug) o la 2da si es el formato viejo
  if (!slug) return null;

  try {
    if (platform === "modrinth") {
      const res = await fetch(`/api/modrinth/project?projectId=${encodeURIComponent(slug)}`);
      if (!res.ok) return null;
      const d = await res.json();
      return {
        projectId: d.id,
        slug: d.slug,
        title: d.title,
        description: d.description,
        iconUrl: d.icon_url ?? null,
        author: d.team ?? d.organization ?? "Unknown",
        downloads: d.downloads ?? 0,
        follows: d.followers ?? 0,
        latestVersion: d.game_versions?.[0] ?? null,
        categories: d.categories ?? [],
        dateCreated: d.published ?? "",
        url: `https://modrinth.com/${d.project_type}/${d.slug}`,
        projectType: d.project_type ?? "mod",
        _source: "modrinth",
        _showcaseSource: "modrinth",
      };
    }

    if (platform === "curseforge") {
      // Buscamos por slug en la API proxy local para evitar CORS
      const res = await fetch(`/api/curseforge/project?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) return null;
      const d = await res.json();
      if (!d.mod) return null;
      return {
        ...d.mod,
        _showcaseSource: "curseforge" as const,
      };
    }
  } catch (e) {
    console.error(`[resolveSlug] Error resolving ${identifier}:`, e);
    // El mod no existe o fue borrado — falla silenciosamente (Pro-Tip #2)
  }

  return null;
}

// Resuelve un array de slugs con concurrencia limitada
async function resolveSlugs(slugs: string[]): Promise<ResolvedShowcaseMod[]> {
  const CONCURRENCY = 4;
  const results: ResolvedShowcaseMod[] = [];

  for (let i = 0; i < slugs.length; i += CONCURRENCY) {
    const batch = slugs.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(resolveSlug));
    for (const res of settled) {
      if (res.status === "fulfilled" && res.value) {
        results.push(res.value);
      }
    }
  }

  return results;
}

function formatYoutubeDate(rawDate?: string): string {
  if (!rawDate || rawDate.length !== 8) return "";
  const year = rawDate.substring(0, 4);
  const monthIdx = parseInt(rawDate.substring(4, 6), 10) - 1;
  const day = parseInt(rawDate.substring(6, 8), 10);
  
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${day} ${months[monthIdx] || ""} ${year}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger Card (miniatura del video de YouTube)
// ─────────────────────────────────────────────────────────────────────────────

function YoutubeTriggerCard({
  showcase,
  modCount,
  theme,
}: {
  showcase: YoutubeShowcaseEntry;
  modCount: number;
  theme?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState(showcase.thumbnail);

  const handleImgError = () => {
    if (showcase.videoId && imgSrc && imgSrc.includes("maxresdefault")) {
      setImgSrc(`https://img.youtube.com/vi/${showcase.videoId}/mqdefault.jpg`);
    } else if (showcase.videoId && imgSrc && imgSrc.includes("mqdefault")) {
      setImgSrc(`https://img.youtube.com/vi/${showcase.videoId}/hqdefault.jpg`);
    } else {
      setImgError(true);
    }
  };

  useEffect(() => {
    setImgSrc(showcase.thumbnail);
    setImgError(false);
  }, [showcase.thumbnail, showcase.videoId]);

  const isModern = theme === "modern";
  const isVampire = theme === "vampire";

  const cardBg = isModern ? "#f0ede3" : isVampire ? "#1a1525" : "hsl(220 14% 9%)";
  const cardBorder = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid rgba(255,255,255,0.08)";
  const cardShadow = isModern ? "0 4px 20px rgba(0,0,0,0.08)" : isVampire ? "0 4px 32px rgba(187, 150, 228, 0.1)" : "0 4px 32px rgba(0,0,0,0.5)";
  const sepColor = isModern ? "1px solid #d4cfc0" : isVampire ? "1px solid rgba(187, 150, 228, 0.15)" : "1px solid rgba(255,255,255,0.07)";
  
  const labelColor = isModern ? "hsl(30 20% 40%)" : isVampire ? "rgba(187, 150, 228, 0.5)" : "hsl(220 14% 45%)";
  const titleColor = isModern ? "hsl(30 20% 15%)" : isVampire ? "#DEDEDE" : "hsl(0 0% 90%)";
  const statColor = isModern ? "hsl(30 20% 45%)" : isVampire ? "rgba(187, 150, 228, 0.6)" : "rgba(255,255,255,0.3)";

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: showcase.videoId } }));
  };

  return (
    <a
      href={showcase.videoUrl}
      onClick={handlePlay}
      className="w-[190px] xl:w-[210px] h-[300px] shrink-0 rounded-[1.5rem] relative group overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        border: cardBorder,
        background: cardBg,
        boxShadow: cardShadow,
      }}
      title={showcase.title}
    >
      {/* Thumbnail */}
      <div className="relative h-[140px] overflow-hidden rounded-t-[calc(1.5rem-1.5px)] bg-black/40">
        {!imgError && showcase.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={showcase.title}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-300"
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20l20-20v20L20 40V20zM0 40l20-20v20L0 40zm0-20L20 0v20L0 20z' fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                 backgroundColor: cardBg
               }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-red-950/20 via-transparent to-black/40 pointer-events-none" />
            <TvMinimalPlay className="w-10 h-10 text-red-500/50 group-hover:text-red-500/80 group-hover:scale-110 transition-all duration-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30 mt-1">Showcase Offline</span>
          </div>
        )}
        {/* Overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent 40%, ${cardBg} 100%)`,
          }}
        />
        {/* YouTube badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
          <CirclePlay className="w-2.5 h-2.5 text-white" />
          <span className="text-[8px] font-black text-white uppercase tracking-wider">YouTube</span>
        </div>
        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
            <CirclePlay className="w-5 h-5 ml-0.5 fill-white" />
          </div>
        </div>
      </div>

      {/* Text zone */}
      <div className="flex flex-col gap-1 p-3 flex-1">
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span
            className="text-[7.5px] font-black uppercase tracking-widest"
            style={{ color: labelColor }}
          >
            ◇ Showcase {showcase.publishedAt ? `• ${formatYoutubeDate(showcase.publishedAt)}` : ""}
          </span>
        </div>

        <h3
          className="font-headline text-[11px] font-semibold leading-tight line-clamp-3 mt-0.5"
          style={{ color: titleColor }}
        >
          {showcase.title}
        </h3>

        <div
          className="flex items-center gap-1 mt-auto pt-2"
          style={{ borderTop: sepColor }}
        >
          <span
            className="text-[7.5px] font-black uppercase tracking-widest"
            style={{ color: statColor }}
          >
            {modCount} mods detectados
          </span>
        </div>
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mod Card (estilo editorial, alineado con SpotlightEditorialCard)
// ─────────────────────────────────────────────────────────────────────────────

function ShowcaseModCard({
  mod,
  onOpenVersions,
  onDownload,
  isDownloading,
  index,
  theme,
}: {
  mod: ResolvedShowcaseMod;
  onOpenVersions: (m: ModHit) => void;
  onDownload: (m: ModHit) => void;
  isDownloading: boolean;
  index: number;
  theme?: string;
}) {
  const isModern = theme === "modern";
  const isVampire = theme === "vampire";
  const num = String((index % 999) + 1).padStart(3, "0");
  
  const cardBg = isModern ? "#f0ede3" : isVampire ? "#1a1525" : "hsl(220 14% 10%)";
  const cardBorder = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  const cardShadow = isModern ? "0 10px 40px rgba(0,0,0,0.08)" : isVampire ? "0 4px 32px rgba(187, 150, 228, 0.1)" : "0 4px 32px rgba(0,0,0,0.5)";

  const sepColor = isModern ? "1px solid #d4cfc0" : isVampire ? "1px solid rgba(187, 150, 228, 0.15)" : "1px solid hsl(220 14% 18%)";
  const numColor = isModern ? "hsl(30 20% 40%)" : isVampire ? "rgba(187, 150, 228, 0.5)" : "hsl(220 14% 40%)";
  const sepColorThick = isModern ? "1.5px solid #d4cfc0" : isVampire ? "1.5px solid rgba(187, 150, 228, 0.15)" : "1.5px solid hsl(220 14% 18%)";
  
  const bracketColor = isModern ? "rgba(0,0,0,0.25)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.2)";
  const iconBorder = isModern ? "rgba(0,0,0,0.12)" : isVampire ? "rgba(187, 150, 228, 0.2)" : "rgba(255,255,255,0.1)";
  const iconBg = isModern ? "rgba(0,0,0,0.06)" : isVampire ? "rgba(187, 150, 228, 0.05)" : "rgba(255,255,255,0.05)";
  const iconFallback = isModern ? "rgba(0,0,0,0.3)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.3)";
  
  const titleColor = isModern ? "hsl(30 20% 15%)" : isVampire ? "#DEDEDE" : "hsl(0 0% 92%)";
  const authorColor = isModern ? "hsl(30 20% 45%)" : isVampire ? "#BB96E4" : "hsl(220 14% 45%)";
  const statColor = isModern ? "hsl(30 20% 50%)" : isVampire ? "rgba(187, 150, 228, 0.6)" : "hsl(220 14% 40%)";
  const dotColor = isModern ? "rgba(0,0,0,0.2)" : isVampire ? "rgba(187, 150, 228, 0.3)" : "rgba(255,255,255,0.15)";
  const dlBtnBg = isModern ? "rgba(0,0,0,0.7)" : isVampire ? "rgba(187, 150, 228, 0.2)" : "rgba(255,255,255,0.15)";

  const dotGridStyle = {
    backgroundImage: `radial-gradient(circle, ${isModern ? "rgba(0,0,0,0.12)" : isVampire ? "rgba(187, 150, 228, 0.08)" : "rgba(255,255,255,0.05)"} 1px, transparent 1px)`,
    backgroundSize: "6px 6px",
  };

  return (
    <div
      className="w-[190px] xl:w-[210px] h-[300px] shrink-0 rounded-[1.5rem] relative group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col"
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: cardShadow,
      }}
      onClick={() => onOpenVersions(mod)}
    >
      {/* Top label row */}
      <div
        className="flex items-center justify-between px-3 pt-2.5 pb-1.5"
        style={{ borderBottom: sepColor }}
      >
        <span
          className="text-[8px] font-black uppercase tracking-[0.25em] flex items-center gap-1"
          style={{ color: mod._showcaseSource === "curseforge" ? "#f87171" : "#4ade80" }}
        >
          <CirclePlay className="w-2 h-2" />
          {mod._showcaseSource === "curseforge" ? "CurseForge" : "Modrinth"}
        </span>
        <span
          className="text-[8px] font-black tabular-nums"
          style={{ color: numColor }}
        >
          {num}
        </span>
      </div>

      {/* Visual area */}
      <div
        className="relative flex items-center justify-center"
        style={{ ...dotGridStyle, height: "160px", borderBottom: sepColorThick }}
      >
        {/* Bracket corners */}
        {[
          ["top-2 left-2", "border-t-2 border-l-2"],
          ["top-2 right-2", "border-t-2 border-r-2"],
          ["bottom-2 left-2", "border-b-2 border-l-2"],
          ["bottom-2 right-2", "border-b-2 border-r-2"],
        ].map(([pos, borders], i) => (
          <div
            key={i}
            className={`absolute ${pos} w-3 h-3 ${borders}`}
            style={{ borderColor: bracketColor }}
          />
        ))}

        <div
          className="relative w-28 h-28 rounded-2xl overflow-hidden border flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110"
          style={{
            borderColor: iconBorder,
            background: iconBg,
          }}
        >
          {mod.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="text-2xl font-black"
              style={{ color: iconFallback }}
            >
              {mod.title.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Download button (hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(mod); }}
          disabled={isDownloading}
          className="absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-90"
          style={{ background: dlBtnBg, backdropFilter: "blur(8px)" }}
        >
          {isDownloading
            ? <Loader2 className="w-3 h-3 text-white animate-spin" />
            : <Download className="w-3 h-3 text-white" />
          }
        </button>
      </div>

      {/* Text area */}
      <div className="flex-1 flex flex-col p-3 gap-1 relative">
        <h3
          className="font-headline text-sm leading-tight line-clamp-2"
          style={{ color: titleColor }}
        >
          {mod.title}
        </h3>
        <p
          className="text-[8px] font-black uppercase tracking-[0.2em] mt-0.5"
          style={{ color: authorColor }}
        >
          {mod.author}
        </p>

        <div
          className="flex items-center justify-between mt-auto pt-2"
          style={{ borderTop: sepColor }}
        >
          <span
            className="text-[7.5px] font-black uppercase tracking-widest"
            style={{ color: statColor }}
          >
            {mod.downloads >= 1_000_000
              ? `${(mod.downloads / 1_000_000).toFixed(1)}M`
              : mod.downloads >= 1_000
              ? `${Math.round(mod.downloads / 1_000)}K`
              : mod.downloads} ↓
          </span>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ background: dotColor }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal scrollable row (drag + wheel)
// ─────────────────────────────────────────────────────────────────────────────

function ShowcaseRow({ children, speed = 0.5, reverse = false }: { children: React.ReactNode, speed?: number, reverse?: boolean }) {
  const { containerRef, innerRef, handlers } = useSmoothMarquee(speed, reverse, false);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      {...handlers}
    >
      <div
        ref={innerRef}
        className="flex gap-5"
        style={{ width: "max-content" }}
      >
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const ENDERVERSE_CHANNEL = "https://www.youtube.com/@EnderVerseMC";

export function FomoYoutubeShowcase({
  channelUrl = ENDERVERSE_CHANNEL,
  onOpenVersions,
  onDownloadMod,
  downloading,
  globalLoader,
  theme = "dark",
}: FomoYoutubeShowcaseProps) {
  const [showcase, setShowcase] = useState<YoutubeShowcaseEntry | null>(null);
  const [mods, setMods] = useState<ResolvedShowcaseMod[]>([]);
  const [status, setStatus] = useState<"idle" | "loading-showcase" | "loading-mods" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    setStatus("loading-showcase");
    try {
      // Usamos stale-while-revalidate: si hay cache, viene ya y se refresca en bg
      const data = await cachedYoutubeShowcase(channelUrl, 1, async () => {
        const res = await fetch(`/api/fomo/youtube-showcase?channel=${encodeURIComponent(channelUrl)}&limit=1`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      });

      if (!isMounted.current) return;

      const entry: YoutubeShowcaseEntry | undefined = data?.showcases?.[0];
      if (!entry) {
        setStatus("done");
        return;
      }

      setShowcase(entry);
      
      // Intentar cargar mods resueltos de cache para no re-calcular al movernos entre pestañas
      const cacheKey = `fomo_resolved_mods_${entry.videoId}`;
      const cachedMods = localStorage.getItem(cacheKey);
      
      if (cachedMods) {
        setMods(JSON.parse(cachedMods));
        setStatus("done");
      } else {
        setStatus("loading-mods");

        // Resolver los slugs a mods reales (con concurrencia limitada = 4)
        const resolved = await resolveSlugs(entry.modSlugs);
        if (!isMounted.current) return;

        localStorage.setItem(cacheKey, JSON.stringify(resolved));
        setMods(resolved);
        setStatus("done");
      }
    } catch (err: any) {
      if (!isMounted.current) return;
      setErrorMsg(err.message ?? "Error desconocido");
      setStatus("error");
    }
  }, [channelUrl]);

  useEffect(() => {
    isMounted.current = true;
    load();
    return () => { isMounted.current = false; };
  }, [load]);

  const isModern = theme === "modern";

  // ── Render: Error ──
  if (status === "error") {
    return (
      <div className="w-full px-8 py-3 flex items-center gap-2 text-red-400/70">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[10px] font-mono">{errorMsg || "No se pudo cargar el showcase de YouTube"}</span>
      </div>
    );
  }

  // ── Render: Primera carga (aún no hay nada en caché) ──
  if (status === "loading-showcase") {
    return (
      <div className="w-full px-8 py-4 flex items-center gap-3">
        <Loader2 className="w-3.5 h-3.5 animate-spin opacity-40" />
        <span className="text-[10px] font-mono opacity-40">Cargando showcase de YouTube…</span>
      </div>
    );
  }

  // Sin datos (puede pasar si el canal no tiene videos con links de mods)
  if (!showcase) return null;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Section header */}
      <div className="px-8 mb-1 flex items-center gap-3">
        <span
          className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5"
          style={{
            background: "rgba(239,68,68,0.12)",
            color: "#f87171",
            border: "1px solid rgba(239,68,68,0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          <TvMinimalPlay className="w-2.5 h-2.5" />
          Showcase · EnderVerse
        </span>
        {/* Subtle refresh indicator when resolving mods in bg */}
        {status === "loading-mods" && (
          <Loader2 className="w-3 h-3 animate-spin opacity-30" />
        )}
      </div>

      {/* Scrollable row */}
      <ShowcaseRow speed={0.5} reverse={false}>
        {/* Set 1 */}
        <YoutubeTriggerCard
          showcase={showcase}
          modCount={showcase.modSlugs.length}
          theme={theme}
        />
        {mods.map((mod, i) => (
          <ShowcaseModCard
            key={`${mod.projectId}-${i}-1`}
            mod={mod}
            onOpenVersions={onOpenVersions}
            onDownload={onDownloadMod}
            isDownloading={!!downloading[mod.projectId]}
            index={i}
            theme={theme}
          />
        ))}

        {/* Set 2 (Duplicado para Marquee) */}
        <YoutubeTriggerCard
          showcase={showcase}
          modCount={showcase.modSlugs.length}
          theme={theme}
        />
        {mods.map((mod, i) => (
          <ShowcaseModCard
            key={`${mod.projectId}-${i}-2`}
            mod={mod}
            onOpenVersions={onOpenVersions}
            onDownload={onDownloadMod}
            isDownloading={!!downloading[mod.projectId]}
            index={i}
            theme={theme}
          />
        ))}
      </ShowcaseRow>
    </div>
  );
}
