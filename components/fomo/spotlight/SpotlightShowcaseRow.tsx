"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { TvMinimalPlay, Loader2, Settings2, X, Check, Plus } from "lucide-react";
import { useSmoothMarquee } from "@/hooks/useSmoothMarquee";
import { mimDB } from "@/lib/storage/indexeddb";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_SHOWCASE_CHANNELS = [
  "https://www.youtube.com/@EnderVerseMC",
  "https://www.youtube.com/@KreksuMinecraft",
  "https://www.youtube.com/@NoxusMods",
  "https://www.youtube.com/@sir_color",
  "https://www.youtube.com/@Wero_lovernite",
];

const STORAGE_KEY = "mim_spotlight_showcase_channels";

// ─── Logic: videos per channel based on count ─────────────────────────────────

function getVideosPerChannel(channelCount: number): number {
  if (channelCount >= 4) return 3;
  if (channelCount === 3) return 4;
  if (channelCount === 2) return 5;
  return 5; // 1 channel
}

// ─── Pure helpers (module-level, never recreated) ────────────────────────────

function getHandle(url: string): string {
  return url.includes("@") ? "@" + url.split("@")[1]?.split("/")[0] : url.split("/").pop() ?? url;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoEntry {
  videoId: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  publishedAt: string;
  modSlugs: string[];
  channelName: string;
  channelUrl: string;
}

// ─── Single Video Card ─────────────────────────────────────────────────────────

function SpotlightVideoCard({
  video,
  theme,
}: {
  video: VideoEntry;
  theme?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState(video.thumbnail);

  const handleImgError = () => {
    if (video.videoId && imgSrc?.includes("maxresdefault")) {
      setImgSrc(`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`);
    } else if (video.videoId && imgSrc?.includes("mqdefault")) {
      setImgSrc(`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`);
    } else {
      setImgError(true);
    }
  };

  useEffect(() => {
    setImgSrc(video.thumbnail);
    setImgError(false);
  }, [video.thumbnail, video.videoId]);

  const isModern = theme === "modern";
  const isVampire = theme === "vampire";

  const cardBg = isModern ? "#f0ede3" : isVampire ? "#1a1525" : "hsl(220 14% 9%)";
  const cardBorder = isModern
    ? "1.5px solid #d4cfc0"
    : isVampire
    ? "1.5px solid rgba(187, 150, 228, 0.15)"
    : "1.5px solid rgba(255,255,255,0.08)";
  const titleColor = isModern ? "hsl(30 20% 15%)" : isVampire ? "#DEDEDE" : "hsl(0 0% 90%)";
  const labelColor = isModern ? "hsl(30 20% 40%)" : isVampire ? "rgba(187, 150, 228, 0.6)" : "rgba(255,255,255,0.35)";
  const sepColor = isModern ? "1px solid #d4cfc0" : isVampire ? "1px solid rgba(187, 150, 228, 0.15)" : "1px solid rgba(255,255,255,0.07)";

  function formatDate(raw?: string): string {
    if (!raw || raw.length !== 8) return "";
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    const y = raw.substring(0, 4);
    const m = parseInt(raw.substring(4, 6), 10) - 1;
    const d = parseInt(raw.substring(6, 8), 10);
    return `${d} ${months[m] || ""} ${y}`;
  }

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: video.videoId } }));
  };

  return (
    <a
      href={video.videoUrl}
      onClick={handlePlay}
      className="w-[190px] xl:w-[210px] h-[305px] shrink-0 rounded-[1.5rem] relative group overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{ border: cardBorder, background: cardBg }}
      title={video.title}
    >
      {/* Thumbnail */}
      <div className="relative h-[190px] overflow-hidden rounded-t-[calc(1.5rem-1.5px)] bg-black/40 shrink-0">
        {!imgError && imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={video.title}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/40">
            <TvMinimalPlay className="w-8 h-8 text-white/20" />
          </div>
        )}

        {/* Gradient fade */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to bottom, transparent 40%, ${cardBg} 100%)` }}
        />

        {/* YouTube badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full z-10">
          <TvMinimalPlay className="w-2.5 h-2.5 text-white" />
          <span className="text-[8px] font-black text-white uppercase tracking-wider">YouTube</span>
        </div>

        {/* Mod count badge */}
        {video.modSlugs.length > 0 && (
          <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-[8px] font-black text-white px-1.5 py-0.5 rounded-full z-10">
            {video.modSlugs.length}
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-20">
          <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg shadow-primary/30 transform scale-90 group-hover:scale-100 transition-all duration-300">
            <TvMinimalPlay className="w-6 h-6 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Text zone */}
      <div className="flex flex-col flex-1 p-3 gap-1 min-h-0">
        {/* Channel + date */}
        <div className="flex items-center gap-1">
          <span className="text-[7.5px] font-black uppercase tracking-widest truncate" style={{ color: labelColor }}>
            ◇ {video.channelName}
          </span>
          {video.publishedAt && (
            <span className="text-[7px] opacity-50 shrink-0" style={{ color: labelColor }}>
              · {formatDate(video.publishedAt)}
            </span>
          )}
        </div>

        <h3
          className="font-headline text-[11px] font-semibold leading-tight line-clamp-2 mt-0.5 flex-1"
          style={{ color: titleColor }}
        >
          {video.title}
        </h3>

        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: sepColor }}>
          <span className="text-[7.5px] font-black uppercase tracking-widest" style={{ color: labelColor }}>
            {video.modSlugs.length} mods detectados
          </span>
        </div>
      </div>
    </a>
  );
}

// ─── Channel Picker Modal ──────────────────────────────────────────────────────

function ChannelPickerModal({
  channels,
  onClose,
  onSave,
}: {
  channels: string[];
  onClose: () => void;
  onSave: (channels: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(channels);
  const [input, setInput] = useState("");
  const [followedChannels, setFollowedChannels] = useState<string[]>([]);

  // Load followed channels from API
  useEffect(() => {
    fetch("/api/fomo/youtube-channels")
      .then(r => r.json())
      .then(data => setFollowedChannels(data.channels || []))
      .catch(() => {});
  }, []);

  const toggle = (ch: string) => {
    setDraft(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const addCustom = () => {
    const raw = input.trim();
    if (!raw) return;
    let url = raw.startsWith("http") ? raw : `https://www.youtube.com/@${raw.replace(/^@/, "")}`;
    url = url.replace(/\/$/, "");
    if (!draft.includes(url)) setDraft(prev => [...prev, url]);
    setInput("");
  };

  const remove = (ch: string) => setDraft(prev => prev.filter(c => c !== ch));

  const videosPerChannel = getVideosPerChannel(draft.length);
  const totalVideos = draft.length * videosPerChannel;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-3xl border border-white/10 bg-[#111] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="font-headline text-base text-white font-bold">Canales del Showcase</h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              {draft.length} canal{draft.length !== 1 ? "es" : ""} · {videosPerChannel} videos c/u · {totalVideos} total
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Default channels */}
        <div className="p-4 border-b border-white/5">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Canales sugeridos</p>
          <div className="flex flex-col gap-1.5">
            {DEFAULT_SHOWCASE_CHANNELS.map(ch => {
              const active = draft.includes(ch);
              return (
                <button
                  key={ch}
                  onClick={() => toggle(ch)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left ${
                    active
                      ? "border-primary/40 bg-primary/10 text-white"
                      : "border-white/5 bg-white/[0.02] text-white/50 hover:text-white hover:border-white/10"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${active ? "bg-primary border-primary" : "border-white/20"}`}>
                    {active && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[12px] font-bold">{getHandle(ch)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Followed channels (from Showcases) */}
        {followedChannels.filter(ch => !DEFAULT_SHOWCASE_CHANNELS.includes(ch)).length > 0 && (
          <div className="p-4 border-b border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Tus canales seguidos</p>
            <div className="flex flex-col gap-1.5">
              {followedChannels.filter(ch => !DEFAULT_SHOWCASE_CHANNELS.includes(ch)).map(ch => {
                const active = draft.includes(ch);
                return (
                  <button
                    key={ch}
                    onClick={() => toggle(ch)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left ${
                      active
                        ? "border-amber-500/40 bg-amber-500/10 text-white"
                        : "border-white/5 bg-white/[0.02] text-white/50 hover:text-white hover:border-white/10"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${active ? "bg-amber-500 border-amber-500" : "border-white/20"}`}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-[12px] font-bold">{getHandle(ch)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom channels (not in defaults or followed) */}
        {draft.filter(ch => !DEFAULT_SHOWCASE_CHANNELS.includes(ch)).length > 0 && (
          <div className="p-4 border-b border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Canales personalizados</p>
            <div className="flex flex-col gap-1.5">
              {draft.filter(ch => !DEFAULT_SHOWCASE_CHANNELS.includes(ch)).map(ch => (
                <div key={ch} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5">
                  <span className="flex-1 text-[12px] font-bold text-white truncate">{getHandle(ch)}</span>
                  <button onClick={() => remove(ch)} className="text-white/30 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add custom */}
        <div className="p-4 border-b border-white/5">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Agregar canal personalizado</p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustom()}
              placeholder="@Handle o URL completa"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-white/20 outline-none focus:border-primary/50"
            />
            <button
              onClick={addCustom}
              className="px-3 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between gap-3">
          <button
            onClick={() => { setDraft(DEFAULT_SHOWCASE_CHANNELS); }}
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            Restaurar default
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={draft.length === 0}
            className="px-5 py-2 rounded-xl bg-primary text-white text-[12px] font-black uppercase tracking-wider hover:bg-primary/80 transition-all disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Component for Marquee (Ensures ref exists on mount) ───────────────

function SpotlightShowcaseMarquee({ videos, theme }: { videos: VideoEntry[], theme?: string }) {
  // Duplicate for infinite marquee. We need the "half" of the track to be wider than the viewport.
  let duplicated = [...videos];
  if (videos.length > 0) {
    while (duplicated.length < 20) {
      duplicated = [...duplicated, ...videos];
    }
    // Always make it an even multiple so that the first half exactly matches the second half
    duplicated = [...duplicated, ...duplicated];
  }

  // speed=0.5, reverse=false (moves leftwards, meaning from right to left)
  const { containerRef, innerRef, handlers } = useSmoothMarquee(0.5, false, false);

  if (videos.length === 0) {
    return (
      <div className="px-8 h-[60px] flex items-center text-[11px] text-white/20">
        Sin videos disponibles.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      {...handlers}
    >
      <div
        ref={innerRef}
        className="flex gap-5 px-4 pb-2"
        style={{ width: "max-content" }}
      >
        {duplicated.map((video, i) => (
          <SpotlightVideoCard
            key={`${video.videoId}-${i}`}
            video={video}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface SpotlightShowcaseRowProps {
  theme?: string;
}

export function SpotlightShowcaseRow({ theme }: SpotlightShowcaseRowProps) {
  const [channels, setChannels] = useState<string[]>(DEFAULT_SHOWCASE_CHANNELS);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [showPicker, setShowPicker] = useState(false);
  const isMounted = useRef(true);

  // Load channels from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setChannels(parsed);
      } catch (e) {
        console.warn("[SpotlightShowcaseRow] Error parsing saved channels:", e);
      }
    }
  }, []);


  const loadVideos = useCallback(async (chs: string[]) => {
    if (chs.length === 0) return;
    setStatus("loading");

    const videosPerChannel = getVideosPerChannel(chs.length);
    const allVideos: VideoEntry[] = [];

    await Promise.allSettled(
      chs.map(async (channelUrl) => {
        const cacheKey = `spotlight_showcase_v4_${channelUrl}_${videosPerChannel}`;
        const cached = await mimDB.getCache(cacheKey);

        if (cached?.data) {
          allVideos.push(...cached.data);
          return;
        }

        try {
          const res = await fetch(
            `/api/fomo/youtube-showcase?channel=${encodeURIComponent(channelUrl)}&limit=${videosPerChannel}&cursor=1`
          );
          if (!res.ok) return;
          const data = await res.json();
          const entries: VideoEntry[] = (data.showcases || []).map((v: any) => ({
            ...v,
            channelName: getHandle(channelUrl),
            channelUrl,
          }));
          await mimDB.setCache(cacheKey, entries, 6 * 60 * 60 * 1000);
          allVideos.push(...entries);
        } catch (e) {
          console.error(`[SpotlightShowcase] Error loading ${channelUrl}:`, e);
        }
      })
    );

    if (isMounted.current) {
      // Sort by publishedAt descending
      allVideos.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
      setVideos(allVideos);
      setStatus("done");
    }
  }, []);

  // Sync when pin is changed externally (from FomoFollowedShowcases)
  useEffect(() => {
    const onUpdate = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setChannels(parsed);
            setVideos([]);
            loadVideos(parsed);
          }
        } catch (e) {
          console.warn("[SpotlightShowcaseRow] Error parsing channels on external update:", e);
        }
      }
    };
    window.addEventListener("fomo-spotlight-channels-changed", onUpdate);
    return () => window.removeEventListener("fomo-spotlight-channels-changed", onUpdate);
  }, [loadVideos]);

  useEffect(() => {
    isMounted.current = true;
    loadVideos(channels);
    return () => { isMounted.current = false; };
  }, [channels, loadVideos]);

  const handleSave = (newChannels: string[]) => {
    setChannels(newChannels);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newChannels));
    // Notify FomoFollowedShowcases so pins stay in sync
    window.dispatchEvent(new CustomEvent("fomo-spotlight-channels-changed"));
    setShowPicker(false);
    setVideos([]);
    loadVideos(newChannels);
  };

  const isModern = theme === "modern";
  const isVampire = theme === "vampire";
  const accentColor = isModern ? "#b3a890" : isVampire ? "rgba(187,150,228,0.7)" : "#f87171";

  return (
    <div className="w-full flex flex-col gap-3 shrink-0">
      {/* Header */}
      <div className="px-8 flex items-center gap-3">
        <span
          className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5"
          style={{
            background: "rgba(239,68,68,0.12)",
            color: accentColor,
            border: "1px solid rgba(239,68,68,0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          <TvMinimalPlay className="w-2.5 h-2.5" />
          Showcase · {channels.length} canal{channels.length !== 1 ? "es" : ""}
        </span>

        {status === "loading" && <Loader2 className="w-3 h-3 animate-spin opacity-30" />}

        <button
          onClick={() => setShowPicker(true)}
          className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white/60 transition-colors"
          title="Configurar canales"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Marquee row */}
      {status === "loading" ? (
        <div className="flex gap-5 px-4 pb-2 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-[210px] h-[240px] shrink-0 rounded-[1.5rem] animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.06)" }}
            />
          ))}
        </div>
      ) : (
        <SpotlightShowcaseMarquee videos={videos} theme={theme} />
      )}

      {/* Picker modal */}
      {showPicker && (
        <ChannelPickerModal
          channels={channels}
          onClose={() => setShowPicker(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
