"use client";
import { DefaultModIcon } from "./DefaultModIcon";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useSpring, useTransform, useDragControls } from "framer-motion";
import {
  X, ArrowLeft, Layers, ExternalLink, Loader2, ChevronLeft, ChevronRight, Plus, Heart, Languages, Globe, CircleFadingPlus, UserPlus, UserCheck, Volume2, VolumeX, Sparkles, Search, Key, Images as ImageIcon, RotateCcw, Send, MessageSquare
} from "lucide-react";
import type { ModHit } from "./SpotlightMarquees";
import { playFomoSound, getSoundSettings, setSoundMuted } from "../lib/sounds";
import { supabase } from "../lib/supabaseClient";
import { markdownToHtml, formatCurseForgeHtml } from "../lib/markdown";
import { DEPENDENCY_GROUPS, normalizeDependencyKind, type DependencyKind } from "../lib/dependencies";
import { encodeShareMeta, readSharePriority } from "../lib/shareMeta";
import { environmentSideLabel, environmentToneClass, interpretModEnvironment } from "../lib/projectEnvironment";

interface ModDetailsSheetProps {
  selectedMod: ModHit | null;
  selectedModDetails: any;
  selectedModDeps: any[];
  loadingDetails: boolean;
  modStack: any[];
  activeStackIndex: number;
  modalTab: "summary" | "gallery" | "desc" | "versions" | "deps";
  setModalTab: (t: "summary" | "gallery" | "desc" | "versions" | "deps") => void;
  handleCloseModDetails: () => void;
  handleGoBackInStack: () => void;
  handleSwitchStackIndex: (i: number) => void;
  handleOpenModDetails: (mod: ModHit, isDep?: boolean) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
  onSearchMod?: (title: string) => void;
  /* Draft */
  userDrafts: any[];
  session: any;
  onAddToDraft: (mod: ModHit, draftId: string) => void;
  onOpenDraftPicker: (mod: ModHit) => void;
  /* Favorite (followed_mods) */
  userFavorites: any[];
  onToggleFavorite: (mod: ModHit) => void;
  /* Followed Authors */
  userFollowedAuthors?: any[];
  onToggleFollowAuthor?: (authorName: string, authorUrl?: string, iconUrl?: string, platform?: string) => void;
  /* Community shares (favorite_mods) */
  userShares?: any[];
  refreshUserData?: () => void;
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

function textForTranslation(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|h[1-6]|blockquote|pre|ul|ol)>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[ \t]*[#>]+[ \t]*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, "").replace(/[ \t]{3,}/g, "  "))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function renderBodyText(body: string, source = "modrinth") {
  if (!body) return <p className="text-xs text-white/40 italic">Sin descripción detallada disponible.</p>;

  let formattedHtml = "";
  if (source === "curseforge") {
    formattedHtml = formatCurseForgeHtml(body);
  } else {
    formattedHtml = markdownToHtml(body);
  }

  return (
    <div
      className="mim-rich-description text-xs text-white/70 leading-relaxed space-y-2.5 break-words"
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  );
}

async function translateDescription(projectId: string, markdown: string): Promise<string> {
  if (descriptionTranslationCache[projectId]) {
    return descriptionTranslationCache[projectId];
  }

  const clean = textForTranslation(markdown).substring(0, 2200);
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
      <div class="mim-translation-result-only" style="color: var(--color-primary); font-size: 0.82rem; font-weight: 600; line-height: 1.65;">
        ${escapeHtml(translated.trim()).replace(/\n/g, "<br />")}
      </div>
    `;
  } catch {
    html = `
      <div class="text-xs text-white/70">
        ${escapeHtml(clean).replace(/\n/g, "<br />")}
      </div>
    `;
  }

  descriptionTranslationCache[projectId] = html;
  return html;
}

type FomoBannerProjectType =
  | "mod"
  | "shader"
  | "textura"
  | "resourcepack"
  | "datapack"
  | "modpack"
  | "bedrock"
  | "addon";

function communityTypeToBannerType(
  type?: string | null
): FomoBannerProjectType {
  if (!type) return "mod";
  const t = type.toLowerCase();
  if (t === "resourcepack" || t === "textura") return "textura";
  if (t === "shader" || t === "datapack" || t === "modpack") return t as FomoBannerProjectType;
  return "mod";
}

interface BannerFallbackStyle {
  bannerBgColor: string;
  fallbackTexture: Record<string, string>;
}

function getBannerFallbackStyle(
  primaryType: FomoBannerProjectType | string
): BannerFallbackStyle {
  let bannerBgColor = "#18181b";
  let fallbackTexture: Record<string, string> = {};

  if (primaryType === "datapack") {
    bannerBgColor = "#022c22";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H8v-2h12V9.5h-2V7h2V5H8v-2h12V.5h-2V-2h2v2h2v2h2v-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2.5H20zm0 0V23h20v2H20v2h12v2H20v2h12v2H20v2h12v2H20v2.5h2V42h-2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2h2v-2h-2v-2.5H20z' fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "shader") {
    bannerBgColor = "#2e1065";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.392-5.351-2.352-10.051-6.102-13.799C11.332 2.453 6.136.634 0 0h100c-6.136.634-11.332 2.453-15.082 6.201C81.168 9.949 78.424 14.649 78.816 20h-57.632z' fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "textura" || primaryType === "resourcepack") {
    bannerBgColor = "#451a03";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20l20-20v20L20 40V20zM0 40l20-20v20L0 40zm0-20L20 0v20L0 20z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "modpack") {
    bannerBgColor = "#172554";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='100' viewBox='0 0 60 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M30 50L0 67.5V100l30-17.5V50zm0-50L0 17.5V50l30-17.5V0zm30 17.5L30 35v33.25l30-17.5V17.5zM30 67.5L0 85v33.25l30-17.5V67.5z'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  } else if (primaryType === "bedrock" || primaryType === "addon") {
    bannerBgColor = "#064e3b";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300cc44' fill-opacity='0.15' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  } else {
    bannerBgColor = "#500724";
    fallbackTexture = {
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.65V49h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
    };
  }

  return { bannerBgColor, fallbackTexture };
}

function releaseGlobalSheetLocks() {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "";
  document.body.style.pointerEvents = "";
  document.body.style.touchAction = "";
  document.documentElement.style.overscrollBehavior = "";
  document.documentElement.style.pointerEvents = "";
  document.documentElement.style.touchAction = "";
}

const KNOWN_LOADERS = ["forge", "fabric", "neoforge", "quilt"] as const;
const VERSION_PLATFORM_LABELS: Record<string, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
  datapack: "Datapack",
};
const CONTENT_TYPE_LABELS: Record<string, string> = {
  mod: "Mod",
  resourcepack: "Textura",
  textura: "Textura",
  shader: "Shader",
  datapack: "Datapack",
  modpack: "Modpack",
};
const DEFAULT_VERSION_FILTERS = ["1.21.1", "1.20.1"];

function compactNumber(value?: number | null) {
  if (!value || Number.isNaN(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  return String(value);
}

function formatPublishedDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

interface VersionRow {
  id: string;
  name: string;
  gameVersions: string[];
  loaders: string[];
  datePublished: string | null;
  downloads: number;
  versionType: string;
  changelog: string;
  changelogUrl?: string | null;
}

function normalizeLoaderLabel(loader: string) {
  return VERSION_PLATFORM_LABELS[loader.toLowerCase()] || loader;
}

function normalizeChannelLabel(channel: string) {
  const value = channel.toLowerCase();
  if (value === "release") return "Release";
  if (value === "beta") return "Beta";
  if (value === "alpha") return "Alpha";
  return channel;
}

function channelPillClass(channel: string) {
  const value = channel.toLowerCase();
  if (value === "release") return "bg-emerald-500/[0.18] text-emerald-300 border-emerald-500/20";
  if (value === "beta") return "bg-amber-500/[0.18] text-amber-300 border-amber-500/20";
  if (value === "alpha") return "bg-rose-500/[0.18] text-rose-300 border-rose-500/20";
  return "bg-white/[0.07] text-white/55 border-white/[0.08]";
}

function normalizeVersionRows(details: any): VersionRow[] {
  const rows = Array.isArray(details?.versions) ? details.versions : [];
  return rows.map((version: any): VersionRow => ({
    id: String(version.id || version.version_number || version.name),
    name: version.name || version.version_number || "Version",
    gameVersions: Array.isArray(version.game_versions) ? version.game_versions : [],
    loaders: Array.isArray(version.loaders) ? version.loaders : [],
    datePublished: version.date_published || version.datePublished || null,
    downloads: version.downloads || 0,
    versionType: version.version_type || "release",
    changelog: version.changelog || "",
    changelogUrl: version.changelog_url || version.changelogUrl || null,
  }));
}

function getAvailableLoaders(details: any) {
  const versionLoaders = normalizeVersionRows(details).flatMap((version: VersionRow) => version.loaders);
  const directLoaders = Array.isArray(details?.loaders) ? details.loaders : [];
  return Array.from(new Set([...directLoaders, ...versionLoaders]))
    .map((loader) => String(loader).toLowerCase())
    .filter((loader) => KNOWN_LOADERS.includes(loader as (typeof KNOWN_LOADERS)[number]));
}

function getAvailableContentTypes(details: any, selectedMod?: ModHit | null) {
  const values = [
    selectedMod?.projectType,
    details?.project_type,
    ...(Array.isArray(details?.versions) ? details.versions.flatMap((version: any) => version.loaders || []) : []),
  ]
    .map((value) => String(value || "").toLowerCase())
    .map((value) => value === "resource-pack" || value === "texture" ? "resourcepack" : value)
    .filter((value) => Boolean(CONTENT_TYPE_LABELS[value]));

  return Array.from(new Set(values));
}

function buildShareMetaFromMod(
  mod: {
    description?: string;
    summary?: string;
    categories?: unknown[];
    loader?: string;
    gameVersions?: string[];
    gameVersion?: string;
    mcVersion?: string;
    projectType?: string;
  },
  opts?: {
    comment?: string;
    gameVersion?: string;
    modloader?: string;
    priority?: boolean;
  }
): string {
  const cats = (mod.categories || []).map((c) =>
    typeof c === "string" ? c.toLowerCase() : ""
  );
  const modloader =
    opts?.modloader ||
    cats.find((c) => KNOWN_LOADERS.includes(c as (typeof KNOWN_LOADERS)[number])) ||
    (typeof mod.loader === "string" ? mod.loader : undefined);
  const gameVersion =
    opts?.gameVersion ||
    mod.gameVersions?.[0] ||
    mod.gameVersion ||
    mod.mcVersion ||
    undefined;
  const base =
    (opts?.comment ?? "").trim() ||
    mod.description ||
    mod.summary ||
    "";
  return encodeShareMeta(base, {
    gameVersion,
    modloader,
    projectType: inferTypeFromModHit(mod),
    priority: opts?.priority,
  });
}

function inferTypeFromModHit(mod: {
  projectType?: string;
  categories?: unknown[];
  url?: string;
  slug?: string;
  title?: string;
}): string {
  const cats = (mod.categories || []).map((c) =>
    typeof c === "string" ? c.toLowerCase() : ""
  );
  const rawUrl = (mod.url || "").toLowerCase();
  const rawSlug = (mod.slug || "").toLowerCase();
  const rawTitle = (mod.title || "").toLowerCase();

  if (cats.some((c) => c.includes("shader"))) return "shader";
  if (
    rawUrl.includes("/datapack/") ||
    rawSlug.includes("datapack") ||
    rawTitle.includes("datapack") ||
    cats.some((c) => c.includes("datapack"))
  )
    return "datapack";
  if (cats.some((c) => c.includes("resourcepack") || c === "textura"))
    return "textura";
  const pt = (mod.projectType || "").toLowerCase();
  if (pt === "shader") return "shader";
  if (pt === "datapack") return "datapack";
  if (pt === "resourcepack") return "textura";
  if (pt === "modpack") return "modpack";
  return "mod";
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
  userFavorites, onToggleFavorite, userShares = [], refreshUserData,
  userFollowedAuthors = [], onToggleFollowAuthor, onSearchAuthor, onSearchMod,
}: ModDetailsSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false);
  const [explainedBody, setExplainedBody] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationSources, setExplanationSources] = useState<Array<{ title: string; url: string }>>([]);
  const [explanationSearchUsed, setExplanationSearchUsed] = useState(false);
  const [explanationImagesAnalyzed, setExplanationImagesAnalyzed] = useState(0);
  const [showGeminiKeyInput, setShowGeminiKeyInput] = useState(false);
  const [geminiKeyVal, setGeminiKeyVal] = useState("");
  const [explainError, setExplainError] = useState<string | null>(null);
  // Project Mini-Chat
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "model"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareComment, setShareComment] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [versionChangelogs, setVersionChangelogs] = useState<Record<string, string>>({});
  const [loadingVersionChangelog, setLoadingVersionChangelog] = useState<string | null>(null);
  const [translatedVersionChangelogs, setTranslatedVersionChangelogs] = useState<Record<string, string>>({});
  const [translatingVersionChangelog, setTranslatingVersionChangelog] = useState<string | null>(null);
  const [selectedGameVersionFilters, setSelectedGameVersionFilters] = useState<string[]>(DEFAULT_VERSION_FILTERS);
  const [selectedLoaderFilters, setSelectedLoaderFilters] = useState<string[]>([]);
  const [dragEnabled, setDragEnabled] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const closeStartedRef = useRef(false);
  const dragControls = useDragControls();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const settings = getSoundSettings();
    setMuted(settings.muted);

    const handleSettingsChange = () => {
      const updated = getSoundSettings();
      setMuted(updated.muted);
    };

    window.addEventListener("fomo_sounds_changed", handleSettingsChange);
    return () => {
      window.removeEventListener("fomo_sounds_changed", handleSettingsChange);
    };
  }, []);

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const current = getSoundSettings().muted;
    setSoundMuted(!current);
  }, []);

  const descriptionBody = selectedModDetails?.body || selectedMod?.description || "";
  const galleryImages = Array.isArray(selectedModDetails?.gallery) ? selectedModDetails.gallery : [];
  const activeImage = activeImageIndex !== null ? galleryImages[activeImageIndex] : null;
  const activeImageUrl = activeImage?.url || null;
  const hasGalleryNav = galleryImages.length > 1;
  const isSheetOpen = !!selectedMod;
  const isReadingTab = modalTab === "versions" || modalTab === "deps";
  const sheetTargetHeight =
    modalTab === "deps"
      ? selectedModDeps?.length > 0 ? "96dvh" : "72dvh"
      : modalTab === "versions"
        ? "96dvh"
        : modalTab === "gallery"
          ? "76vh"
          : modalTab === "desc"
            ? "84vh"
            : "88vh";
  const versionRows = normalizeVersionRows(selectedModDetails);
  const availableGameVersionFilters = Array.from(
    new Set(versionRows.flatMap((version) => version.gameVersions))
  );
  const activeGameVersionFilters = selectedGameVersionFilters.filter((version) =>
    availableGameVersionFilters.includes(version)
  );
  const availableVersionLoaderFilters = Array.from(
    new Set(versionRows.flatMap((version) => version.loaders.map((loader) => loader.toLowerCase())))
  ).filter((loader) => KNOWN_LOADERS.includes(loader as (typeof KNOWN_LOADERS)[number]));
  const activeLoaderFilters = selectedLoaderFilters.filter((loader) =>
    availableVersionLoaderFilters.includes(loader)
  );
  const filteredVersionRows = versionRows.filter((version) => {
    const matchesGameVersion = activeGameVersionFilters.length === 0 ||
      version.gameVersions.some((gameVersion) => activeGameVersionFilters.includes(gameVersion));
    const matchesLoader = activeLoaderFilters.length === 0 ||
      version.loaders.some((loader) => activeLoaderFilters.includes(loader.toLowerCase()));
    return matchesGameVersion && matchesLoader;
  });
  const availableLoaders = getAvailableLoaders(selectedModDetails);
  const availableContentTypes = getAvailableContentTypes(selectedModDetails, selectedMod);

  /** Play open sound and reset translation state when a new mod is opened */
  useEffect(() => {
    if (selectedMod) {
      // A fresh project creates a new close cycle; stale exit events are ignored.
      closeStartedRef.current = false;
      setIsClosing(false);
      playFomoSound("on");
    }
    setTranslatedBody(null);
    setTranslatedSummary(null);
    setIsTranslating(false);
    setIsTranslatingSummary(false);
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
      } catch {
        // ignore cache read error
      }
    }

    setActiveImageIndex(null);
    setExpandedVersionId(null);
    setVersionChangelogs({});
    setLoadingVersionChangelog(null);
    setTranslatedVersionChangelogs({});
    setTranslatingVersionChangelog(null);
    setSelectedGameVersionFilters(DEFAULT_VERSION_FILTERS);
    setSelectedLoaderFilters([]);
  }, [selectedMod?.projectId]);

  useEffect(() => {
    if (isSheetOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
    } else {
      releaseGlobalSheetLocks();
    }

    return releaseGlobalSheetLocks;
  }, [isSheetOpen]);

  useEffect(() => {
    if (activeImageIndex !== null && activeImageIndex >= galleryImages.length) {
      setActiveImageIndex(galleryImages.length ? galleryImages.length - 1 : null);
    }
  }, [activeImageIndex, galleryImages.length]);

  /** Close once and release pointer capture immediately while the exit animation finishes. */
  const closeWithSound = useCallback(() => {
    if (closeStartedRef.current) return;
    closeStartedRef.current = true;
    setIsClosing(true);
    setActiveImageIndex(null);
    setShowShareModal(false);
    releaseGlobalSheetLocks();
    playFomoSound("off");
    handleCloseModDetails();
  }, [handleCloseModDetails]);

  const isFavorited = userFavorites.some(
    f => (f.mod_id || f.project_id || f.id) === selectedMod?.projectId
  );

  const handleShareClick = useCallback(() => {
    if (!session?.user?.id) {
      alert("Debes iniciar sesión para compartir en la Comunidad.");
      return;
    }
    setShowShareModal(true);
    setShareComment("");
  }, [session]);

  const handleConfirmShare = useCallback(async () => {
    if (!selectedMod || !session?.user?.id) return;
    setIsSharing(true);
    try {
      const platform = selectedMod._source === "curseforge" ? "curseforge" : "modrinth";

      // Use userShares (favorite_mods) to check prior shares, independent of userFavorites (followed_mods)
      const existingShare = userShares.find(
        f => (f.mod_id || f.project_id || f.id) === selectedMod.projectId
      );
      const alreadyShared = !!existingShare;
      const summaryText = buildShareMetaFromMod(selectedMod, {
        comment: shareComment.trim() || selectedMod.description || "",
        priority: existingShare?.pinned ?? readSharePriority(existingShare?.summary),
      });

      const request = alreadyShared
        ? supabase.from("favorite_mods").update({
            summary: summaryText,
            name: selectedMod.title,
            icon_url: selectedMod.iconUrl || null,
          }).eq("profile_id", session.user.id).eq("mod_id", selectedMod.projectId)
        : supabase.from("favorite_mods").insert({
            profile_id: session.user.id,
            mod_id: selectedMod.projectId,
            platform,
            name: selectedMod.title,
            icon_url: selectedMod.iconUrl || null,
            summary: summaryText,
          });

      const { error } = await request;

      if (error) throw error;

      if (refreshUserData) refreshUserData();
      setShowShareModal(false);
    } catch (err: any) {
      alert(`Error al compartir: ${err.message}`);
    } finally {
      setIsSharing(false);
    }
  }, [selectedMod, session, shareComment, userShares, refreshUserData]);

  const handleGalleryWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      e.currentTarget.scrollLeft += e.deltaY;
    }
  }, []);

  const showPreviousImage = useCallback(() => {
    setActiveImageIndex((current) => {
      if (current === null || galleryImages.length === 0) return current;
      return (current - 1 + galleryImages.length) % galleryImages.length;
    });
  }, [galleryImages.length]);

  const showNextImage = useCallback(() => {
    setActiveImageIndex((current) => {
      if (current === null || galleryImages.length === 0) return current;
      return (current + 1) % galleryImages.length;
    });
  }, [galleryImages.length]);

  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImageIndex(null);
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex, showNextImage, showPreviousImage]);

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

  const handleExplain = useCallback(async (customKey?: string, forceRefresh?: boolean) => {
    if (!selectedMod || isExplaining) return;
    if (explainedBody && !customKey && !forceRefresh) {
      setExplainedBody(null);
      return;
    }

    const savedKey = customKey || localStorage.getItem("mim_gemini_api_key") || "";

    // Revisar caché si no estamos forzando una clave nueva ni refresco
    const cacheKey = `mim_explain_${selectedMod.projectId}`;
    if (!customKey && !forceRefresh) {
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
        }),
      });

      const data = await res.json();

      if (res.status === 401 || data.error === "NO_API_KEY") {
        setShowGeminiKeyInput(true);
        setExplainError("Introduce tu clave gratuita de Gemini API para activar la síntesis inteligente.");
        return;
      }

      if (!res.ok || data.error) {
        if (typeof data.error === "string" && (data.error.includes("quota") || data.error.includes("RESOURCE_EXHAUSTED") || data.error.includes("limit:"))) {
          setExplainError("⚡ MIM-Bot alcanzó el límite de solicitudes por minuto de la clave. Esperá unos segundos y reintentá.");
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

      // Guardar en caché local
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ...data, summaryMarkdown: cleanedSummary }));
      } catch {}
    } catch (err: any) {
      console.error("[Mod Explainer] Error:", err);
      setExplainError(err?.message || "Ocurrió un error al consultar Gemini API.");
    } finally {
      setIsExplaining(false);
    }
  }, [descriptionBody, explainedBody, isExplaining, selectedMod]);

  const handleSaveGeminiKey = useCallback(() => {
    if (!geminiKeyVal.trim()) return;
    const cleanKey = geminiKeyVal.trim();
    try {
      localStorage.setItem("mim_gemini_api_key", cleanKey);
    } catch {}
    handleExplain(cleanKey);
  }, [geminiKeyVal, handleExplain]);

  const handleSendChatMessage = useCallback(async (textToSend?: string) => {
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
      console.error("[ProjectChat] Error:", err);
      setChatMessages([
        ...newMessages,
        { role: "model" as const, text: `⚠️ Error de conexión: ${err?.message || "Intenta de nuevo."}` },
      ]);
    } finally {
      setIsChatSending(false);
    }
  }, [chatInput, chatMessages, descriptionBody, explainedBody, isChatSending, selectedMod]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatSending]);

  const handleTranslateSummary = useCallback(async () => {
    const textToTranslate = selectedMod?.description || "";
    if (!textToTranslate || isTranslatingSummary) return;
    if (translatedSummary) {
      setTranslatedSummary(null);
      return;
    }

    setIsTranslatingSummary(true);
    try {
      const clean = textForTranslation(textToTranslate).trim();
      if (!clean) return;

      const res = await fetch("/api/fomo/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTranslatedSummary(data.translatedText || "");
    } catch (err) {
      console.error("[Translate Summary] Failed:", err);
    } finally {
      setIsTranslatingSummary(false);
    }
  }, [selectedMod?.description, isTranslatingSummary, translatedSummary]);

  const handleToggleVersion = useCallback(async (version: VersionRow) => {
    if (expandedVersionId === version.id) {
      setExpandedVersionId(null);
      return;
    }

    setExpandedVersionId(version.id);
    if (version.changelog || versionChangelogs[version.id] || selectedMod?._source !== "curseforge") return;

    setLoadingVersionChangelog(version.id);
    try {
      const res = await fetch(`/api/curseforge/file-changelog?projectId=${encodeURIComponent(selectedMod.projectId)}&fileId=${encodeURIComponent(version.id)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVersionChangelogs((prev) => ({ ...prev, [version.id]: data.changelog || "" }));
    } catch {
      setVersionChangelogs((prev) => ({ ...prev, [version.id]: "" }));
    } finally {
      setLoadingVersionChangelog(null);
    }
  }, [expandedVersionId, selectedMod, versionChangelogs]);

  const handleToggleGameVersionFilter = useCallback((gameVersion: string) => {
    setSelectedGameVersionFilters((current) => (
      current.includes(gameVersion)
        ? current.filter((version) => version !== gameVersion)
        : [...current, gameVersion]
    ));
    setExpandedVersionId(null);
  }, []);

  const handleToggleLoaderFilter = useCallback((loader: string) => {
    setSelectedLoaderFilters((current) => (
      current.includes(loader)
        ? current.filter((value) => value !== loader)
        : [...current, loader]
    ));
    setExpandedVersionId(null);
  }, []);

  const handleTranslateVersionChangelog = useCallback(async (version: VersionRow, changelog: string) => {
    if (!changelog || translatingVersionChangelog) return;
    if (translatedVersionChangelogs[version.id]) {
      setTranslatedVersionChangelogs((prev) => {
        const next = { ...prev };
        delete next[version.id];
        return next;
      });
      return;
    }

    setTranslatingVersionChangelog(version.id);
    try {
      const html = await translateDescription(`${selectedMod?.projectId || "version"}:changelog:${version.id}`, changelog);
      setTranslatedVersionChangelogs((prev) => ({ ...prev, [version.id]: html }));
    } finally {
      setTranslatingVersionChangelog(null);
    }
  }, [selectedMod?.projectId, translatedVersionChangelogs, translatingVersionChangelog]);

  const bannerUrl =
    selectedModDetails?.gallery?.find((g: any) => g.featured)?.url ||
    selectedModDetails?.gallery?.find((g: any) => g.featured)?.raw_url ||
    selectedModDetails?.gallery?.[0]?.raw_url ||
    selectedModDetails?.gallery?.[0]?.url ||
    selectedMod?.iconUrl ||
    undefined;
  const projectType = selectedMod?.projectType || "mod";
  const bannerType = communityTypeToBannerType(projectType);
  const { bannerBgColor, fallbackTexture } = getBannerFallbackStyle(bannerType);
  const environment = interpretModEnvironment(
    selectedModDetails?.client_side || selectedModDetails?.clientSide,
    selectedModDetails?.server_side || selectedModDetails?.serverSide
  );
  const dependencyGroups = selectedModDeps.reduce<Record<DependencyKind, any[]>>((groups, dep) => {
    groups[normalizeDependencyKind(dep)].push(dep);
    return groups;
  }, { required: [], optional: [], incompatible: [], embedded: [] });
  const visibleDependencyKinds = (["required", "optional", "incompatible", "embedded"] as DependencyKind[])
    .filter((kind) => dependencyGroups[kind].length > 0);
  const communitySharedByMe = userShares.some(
    f => (f.mod_id || f.project_id || f.id) === selectedMod?.projectId
  );
  const authorName = selectedMod?.author || "";
  const authorPlatform = selectedMod?._source || "modrinth";
  const isFollowingAuthor = !!authorName && userFollowedAuthors.some(
    a => a.author_name === authorName && a.platform === authorPlatform
  );
  
  const projectPlatformUrl = selectedMod
    ? selectedMod._source === "curseforge"
      ? `https://www.curseforge.com/projects/${selectedMod.projectId}`
      : `https://modrinth.com/project/${selectedMod.projectId}`
    : "#";

  return (
    <>
      {selectedMod && (
          <motion.div
            key="mod-details-backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end justify-center z-50"
            style={{ pointerEvents: (!selectedMod || isClosing) ? "none" : "auto" }}
            onClick={closeWithSound}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <motion.div
              ref={sheetRef}
              layout="position"
              initial={{ y: "112%", scale: 0.96, opacity: 0.75, height: sheetTargetHeight }}
              animate={{ y: 0, scale: 1, opacity: 1, height: sheetTargetHeight }}
              exit={{ y: "108%", scale: 0.98, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 24,
                mass: 1.0,
                layout: {
                  type: "spring",
                  stiffness: 160,
                  damping: 26,
                  mass: 1.0,
                }
              }}
              className="bg-surface border-t border-border rounded-t-3xl w-full max-w-md pb-2 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-0 relative max-h-[96dvh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_e, info) => { if (info.offset.y > 80) closeWithSound(); }}
            >
              {/* Header Banner Area */}
              <div 
                className={`relative overflow-hidden border-b border-white/[0.06] shrink-0 select-none ${
                  isReadingTab ? "px-4 pt-2 pb-3" : "px-6 pt-3 pb-5"
                }`}
              >
                {/* Banner Image or Fallback */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ backgroundColor: bannerBgColor }}>
                  {bannerUrl ? (
                    <img
                      src={bannerUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="w-full h-full object-cover opacity-60 scale-105 transition-opacity duration-700"
                      style={{ filter: "brightness(0.75)" }}
                    />
                  ) : (
                    <div className="absolute inset-0 opacity-15" style={fallbackTexture} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
                </div>

                {/* Drag handle container (larger touch zone, restricts drag to this header handle) */}
                <div 
                  className="relative z-30 w-full pt-1.5 pb-3.5 cursor-grab active:cursor-grabbing flex justify-center touch-none"
                  onPointerDown={(e) => dragControls.start(e)}
                  style={{ touchAction: "none" }}
                >
                  <div className="w-12 h-1.5 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
                </div>

                {/* Mute/Unmute Button */}
                <button
                  onClick={handleToggleMute}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={muted ? "Activar audio" : "Silenciar audio"}
                  className="absolute right-14 top-4 z-40 bg-black/35 hover:bg-black/50 border border-white/15 rounded-full p-1.5 text-white/70 active:scale-95 flex items-center justify-center transition-all"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {/* Close Button */}
                <button
                  onClick={closeWithSound}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Cerrar detalles"
                  className="absolute right-5 top-4 z-40 bg-black/35 hover:bg-black/50 border border-white/15 rounded-full p-1.5 text-white/70 active:scale-95 flex items-center justify-center transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Stack breadcrumb */}
                {modStack.length > 1 && (
                  <div 
                    onPointerDown={(e) => e.stopPropagation()}
                    className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/[0.06] mb-3"
                  >
                    <button
                      onClick={handleGoBackInStack}
                      className="p-1.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-white/70 active:scale-95 transition-all flex items-center justify-center shrink-0"
                      title="Volver"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                      {modStack.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSwitchStackIndex(idx)}
                          className={`relative overflow-hidden px-2.5 py-1 rounded-lg text-[9px] font-bold transition-colors whitespace-nowrap border ${
                            activeStackIndex === idx
                              ? "text-orange-400 border-orange-500/30"
                              : "bg-black/40 text-white/50 hover:text-white/80 border-white/10"
                          }`}
                        >
                          {activeStackIndex === idx && <motion.span layoutId="mod-stack-selection" className="absolute inset-0 bg-orange-500/15" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                          <span className="relative z-10">{item.mod.title.length > 15 ? `${item.mod.title.slice(0, 12)}...` : item.mod.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mod info */}
                <div className={`relative z-10 flex ${isReadingTab ? "gap-3" : "gap-4"}`}>
                  <div className={`${isReadingTab ? "w-12 h-12" : "w-16 h-16"} rounded-xl bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg backdrop-blur-md`}>
                    {(selectedModDetails?.icon_url || selectedModDetails?.iconUrl || selectedMod.iconUrl) ? (
                      <>
                        <img
                          src={selectedModDetails?.icon_url || selectedModDetails?.iconUrl || selectedMod.iconUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const sibling = e.currentTarget.nextSibling as HTMLElement;
                            if (sibling) sibling.style.display = "block";
                          }}
                        />
                        <div className="hidden w-full h-full">
                          <DefaultModIcon platform={selectedMod._source} />
                        </div>
                      </>
                    ) : (
                      <DefaultModIcon platform={selectedMod._source} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-orange-400 font-semibold">Detalles del Proyecto</span>
                    <h3 className={`${isReadingTab ? "text-[13px]" : "text-sm"} font-bold text-white mt-0.5 pr-6 leading-tight drop-shadow-md`}>{selectedMod.title}</h3>
                    <p className={`${isReadingTab ? "text-[9px] mt-0.5" : "text-[10px] mt-1"} text-white/40 flex flex-wrap items-center gap-x-2 gap-y-0.5`}>
                      <span>Autor:{" "}</span>
                      {onSearchAuthor && selectedMod.author && selectedMod.author !== "Comunidad" ? (
                        <button
                          onClick={() => onSearchAuthor(selectedMod.author, selectedMod._source || "modrinth")}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="text-orange-400 hover:underline hover:text-orange-300 font-bold transition-all text-left inline-block"
                        >
                          {selectedMod.author}
                        </button>
                      ) : (
                        <span className="text-white/60">{selectedMod.author || "Comunidad"}</span>
                      )}
                      {selectedModDetails?.organization_info && (
                        <>
                          <span className="text-white/20">|</span>
                          <span>Org:{" "}</span>
                          <button
                            onClick={() => onSearchAuthor && onSearchAuthor(`organization:${selectedModDetails.organization_info.slug}`, selectedMod._source || "modrinth")}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="text-orange-400 hover:underline hover:text-orange-300 font-bold transition-all text-left inline-block"
                          >
                            {selectedModDetails.organization_info.name}
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions row: Share, Favorite, Follow and External Platform link */}
                <div 
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`relative z-10 flex flex-col ${isReadingTab ? "gap-1 mt-2" : "gap-1.5 mt-4"}`}
                >
                  {session && (
                    <div className="flex gap-2">
                      {/* Share button */}
                      <button
                        onClick={handleShareClick}
                        className={`flex-1 flex items-center justify-center gap-1.5 ${isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"} font-black uppercase tracking-wider transition-all border ${
                          communitySharedByMe
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]"
                            : "bg-black/40 border border-white/10 text-white/80 hover:bg-black/60 hover:text-white"
                        }`}
                        title={communitySharedByMe ? "Ya compartido en la Comunidad" : "Compartir en la Comunidad"}
                        type="button"
                      >
                        {communitySharedByMe ? <Globe className="w-3.5 h-3.5 shrink-0" /> : <CircleFadingPlus className="w-3.5 h-3.5 shrink-0" />}
                        <span>{communitySharedByMe ? "Compartido" : "Compartir"}</span>
                      </button>

                      {/* Favorite button */}
                      <button
                        onClick={() => onToggleFavorite(selectedMod)}
                        className={`flex-1 flex items-center justify-center gap-1.5 ${isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"} font-black uppercase tracking-wider transition-all border ${
                          isFavorited
                            ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                            : "bg-black/40 border border-white/10 text-white/80 hover:bg-black/60 hover:text-white"
                        }`}
                        type="button"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-red-400 text-red-400" : ""}`} />
                        <span>{isFavorited ? "Guardado" : "Favorito"}</span>
                      </button>
                    </div>
                  )}

                  {/* Platform link & Compare button */}
                  <div className="flex gap-2">
                    <a
                      href={projectPlatformUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 flex items-center justify-center gap-1.5 ${isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"} font-bold uppercase tracking-wider transition-all border bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>Ver en {selectedMod?._source === "curseforge" ? "CurseForge" : "Modrinth"}</span>
                    </a>

                    {onSearchMod && (
                      <button
                        onClick={() => {
                          onSearchMod(selectedMod.title);
                          closeWithSound();
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 ${isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"} font-bold uppercase tracking-wider transition-all border bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white`}
                        type="button"
                      >
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>Comparar (Ambos)</span>
                      </button>
                    )}
                  </div>

                  {/* Follow Author (visible to logged-in users) */}
                  {session && onToggleFollowAuthor && authorName && authorName !== "Comunidad" && (
                    <button
                      onClick={() => onToggleFollowAuthor(authorName, `https://modrinth.com/user/${authorName}`, undefined, authorPlatform)}
                      className={`w-full flex items-center justify-center gap-1.5 ${isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"} font-bold uppercase tracking-wider transition-all border ${
                        isFollowingAuthor
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                          : "bg-black/25 border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-black/40"
                      }`}
                      type="button"
                    >
                      {isFollowingAuthor
                        ? <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        : <UserPlus className="w-3.5 h-3.5 shrink-0" />}
                      <span>{isFollowingAuthor ? `Siguiendo a ${authorName}` : `Seguir a ${authorName}`}</span>
                    </button>
                  )}

                  {/* Follow Organization (visible to logged-in users if org exists) */}
                  {session && onToggleFollowAuthor && selectedModDetails?.organization_info && (
                    (() => {
                      const orgSlug = selectedModDetails.organization_info.slug;
                      const orgName = selectedModDetails.organization_info.name;
                      const orgIcon = selectedModDetails.organization_info.icon_url;
                      const followedKey = `organization:${orgSlug}`;
                      const isFollowingOrg = userFollowedAuthors.some(
                        a => a.author_name === followedKey && a.platform === authorPlatform
                      );
                      const orgUrl = `https://modrinth.com/organization/${orgSlug}`;

                      return (
                        <button
                          onClick={() => onToggleFollowAuthor(followedKey, orgUrl, orgIcon, authorPlatform)}
                          className={`w-full flex items-center justify-center gap-1.5 ${isReadingTab ? "h-7 px-2 text-[9px] rounded-lg" : "h-8 px-3 text-[10px] rounded-xl"} font-bold uppercase tracking-wider transition-all border ${
                            isFollowingOrg
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                              : "bg-black/25 border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-black/40"
                          }`}
                          type="button"
                        >
                          {isFollowingOrg
                            ? <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            : <UserPlus className="w-3.5 h-3.5 shrink-0" />}
                          <span>{isFollowingOrg ? `Siguiendo a ${orgName}` : `Seguir a ${orgName}`}</span>
                        </button>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Body Content Area (Tabs + Scrollable Content) */}
              <div className={`flex flex-col flex-1 min-h-0 ${isReadingTab ? "gap-1.5 px-3 pt-2 pb-2" : "gap-2.5 px-4 pt-3 pb-3"}`}>
                {/* Modal tabs */}
                <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-black/15 p-0.5 shrink-0 overflow-x-auto scrollbar-none shadow-inner">
                  {[
                    { id: "summary", label: "Resumen" },
                    ...(selectedModDetails?.gallery?.length > 0 ? [{ id: "gallery", label: "Galería" }] : []),
                    { id: "desc", label: "Desc." },
                    { id: "versions", label: "Vers." },
                    { id: "deps", label: "Depen." },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setModalTab(t.id as any)}
                      className={`relative overflow-hidden flex-1 text-center py-1 px-1 rounded-lg text-[9.5px] sm:text-[10px] font-semibold transition-colors whitespace-nowrap ${
                        modalTab === t.id
                          ? "text-orange-400"
                          : "text-white/50 hover:text-white/80"
                      }`}
                    >
                      {/* One shared plate makes the selected tab travel instead of blinking. */}
                      {modalTab === t.id && (
                        <motion.span
                          layoutId="mod-details-tab-selection"
                          className="absolute inset-0 rounded-lg border border-orange-500/25 bg-orange-500/15 shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Scrollable content */}
                <div 
                  className="relative w-full flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-none touch-pan-y"
                  style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                    <AnimatePresence mode="wait">
                      {modalTab === "summary" && (
                        <motion.div key="summary" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4 w-full pb-2">
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
                          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.04]">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 font-bold">Resumen</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!explainedBody) {
                                    handleExplain();
                                  }
                                  setModalTab("desc");
                                }}
                                disabled={isExplaining}
                                className="px-2 py-1 rounded-md border text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 text-purple-300 bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/20"
                                title="Explicar e investigar con MIM-Bot"
                              >
                                {isExplaining ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5 text-purple-400" />}
                                {isExplaining ? "Sintetizando..." : "MIM-Bot"}
                              </button>
                              <button
                                type="button"
                                onClick={handleTranslateSummary}
                                disabled={isTranslatingSummary || !selectedMod.description}
                                className="px-2 py-1 rounded-md border text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                style={{
                                  color: "var(--color-primary)",
                                  background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                                  borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                                }}
                              >
                                {isTranslatingSummary ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Languages className="w-2.5 h-2.5" />}
                                {isTranslatingSummary ? "Traduciendo" : translatedSummary ? "Original" : "Traducir"}
                              </button>
                            </div>
                          </div>
                          {translatedSummary ? (
                            <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-primary)" }}>
                              {translatedSummary}
                            </p>
                          ) : (
                            <p className="text-xs text-white/75 leading-relaxed">
                              {stripHtml(selectedMod.description || "") || "Este mod expande las opciones de automatización y es totalmente compatible con la versión activa."}
                            </p>
                          )}
                        </div>

                        {/* Compatibility */}
                        <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 text-[11px] text-white/70">
                          <div className={`col-span-2 rounded-xl border p-3 ${environmentToneClass(environment.tone)}`}>
                            <span className="text-[9px] uppercase font-mono block opacity-60">Entorno</span>
                            <span className="font-black block text-[12px] mt-1">{environment.label}</span>
                            <p className="text-[10px] leading-relaxed mt-1 opacity-75">{environment.description}</p>
                          </div>
                          <div>
                            <span className="text-[9px] text-white/30 uppercase font-mono block">Cliente</span>
                            <span className="font-semibold block mt-0.5">{environmentSideLabel(environment.client)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-white/30 uppercase font-mono block">Servidor</span>
                            <span className="font-semibold block mt-0.5">{environmentSideLabel(environment.server)}</span>
                          </div>
                          {selectedModDetails?.license && (
                            <div className="col-span-2">
                              <span className="text-[9px] text-white/30 uppercase font-mono block">Licencia</span>
                              <span className="font-semibold block mt-0.5">{selectedModDetails.license.name || selectedModDetails.license.id}</span>
                            </div>
                          )}
                        </div>

                        {(availableLoaders.length > 0 || availableContentTypes.length > 0) && (
                          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3.5 flex flex-col gap-3">
                            {availableLoaders.length > 0 && (
                              <div>
                                <span className="text-[9px] text-white/30 uppercase font-mono block mb-1.5">Modloaders disponibles</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {availableLoaders.map((loader) => (
                                    <span key={loader} className="px-2 py-1 rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-300 text-[9px] font-bold">
                                      {normalizeLoaderLabel(loader)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {availableContentTypes.length > 0 && (
                              <div>
                                <span className="text-[9px] text-white/30 uppercase font-mono block mb-1.5">Tipos disponibles</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {availableContentTypes.map((type) => (
                                    <span key={type} className="px-2 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[9px] font-bold">
                                      {CONTENT_TYPE_LABELS[type] || type}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

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
                          {selectedMod?.url && (
                            <a
                              href={selectedMod.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 transition-all border ${
                                selectedMod._source === "chunk"
                                  ? "bg-[#00cc44]/10 hover:bg-[#00cc44]/20 border-[#00cc44]/30 text-[#00cc44]"
                                  : "bg-white/5 hover:bg-white/10 border-white/[0.06] text-white/80"
                              }`}
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{selectedMod._source === "chunk" ? "Ver en chunk.gg (Marketplace)" : "Página Oficial"}</span>
                            </a>
                          )}
                        </div>

                        {/* Gallery */}
                        {galleryImages.length > 0 && (
                          <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
                            <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block">Galería</span>
                            <div
                              onWheel={handleGalleryWheel}
                              onTouchStart={(e) => { e.stopPropagation(); setDragEnabled(false); }}
                              onTouchEnd={() => setDragEnabled(true)}
                              onTouchCancel={() => setDragEnabled(true)}
                              className="flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x cursor-grab active:cursor-grabbing"
                            >
                              {galleryImages.map((img: any, i: number) => (
                                <div
                                  key={i}
                                  onClick={() => setActiveImageIndex(i)}
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

                    {modalTab === "gallery" && (
                      <motion.div
                        key="gallery"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col gap-3.5 w-full pb-2"
                      >
                        <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">
                          Galería de Imágenes ({galleryImages.length})
                        </span>
                        {galleryImages.length > 0 ? (
                          <div
                            onTouchStart={(e) => { e.stopPropagation(); setDragEnabled(false); }}
                            onTouchEnd={() => setDragEnabled(true)}
                            onTouchCancel={() => setDragEnabled(true)}
                            className="grid grid-cols-2 gap-3 pb-1 pr-1"
                          >
                            {galleryImages.map((img: any, i: number) => (
                              <button
                                type="button"
                                key={i}
                                onClick={() => setActiveImageIndex(i)}
                                className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/[0.06] cursor-pointer hover:border-white/20 transition-all active:scale-[0.98]"
                              >
                                <img src={img.url} alt={img.title || "Screenshot"} className="object-cover w-full h-full" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-white/40 italic font-mono">Este mod no tiene imágenes asociadas.</p>
                        )}
                      </motion.div>
                    )}

                    {modalTab === "desc" && (
                      <motion.div key="desc" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3 min-h-full w-full">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 font-bold">Descripción</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExplain()}
                              disabled={isExplaining}
                              className="px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                              style={{
                                color: "#c084fc",
                                background: "rgba(192, 132, 252, 0.12)",
                                borderColor: "rgba(192, 132, 252, 0.28)",
                              }}
                              title="Explicar e investigar este proyecto con Gemini 2.0 Flash y Google Search"
                            >
                              {isExplaining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-400" />}
                              {isExplaining ? "Sintetizando..." : explainedBody ? "Original" : "MIM-Bot"}
                            </button>

                            <button
                              type="button"
                              onClick={handleTranslate}
                              disabled={isTranslating || !descriptionBody}
                              className="px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
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
                        </div>

                        {/* Modal/Panel de Entrada de Gemini API Key si falta o se solicita */}
                        {showGeminiKeyInput && (
                          <div className="p-3 mb-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2 text-xs animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5" /> Clave de Gemini API Requerida
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowGeminiKeyInput(false)}
                                className="text-white/40 hover:text-white text-[10px]"
                              >
                                Cancelar
                              </button>
                            </div>
                            <p className="text-[11px] text-white/60 leading-relaxed">
                              Para investigar y explicar proyectos sin servidor propio, se utiliza la API pública gratuita de Google Gemini.
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                type="password"
                                value={geminiKeyVal}
                                onChange={(e) => setGeminiKeyVal(e.target.value)}
                                placeholder="AIzaSy..."
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-purple-500/30 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-400 font-mono"
                              />
                              <button
                                type="button"
                                onClick={handleSaveGeminiKey}
                                disabled={!geminiKeyVal.trim() || isExplaining}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
                              >
                                Guardar y Explicar
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-1">
                              <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="text-purple-400 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> Obtener clave gratuita en Google AI Studio
                              </a>
                            </div>
                          </div>
                        )}

                        {explainError && !showGeminiKeyInput && (
                          <div className="p-2.5 mb-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center justify-between gap-2">
                            <span>{explainError}</span>
                            <button
                              type="button"
                              onClick={() => setShowGeminiKeyInput(true)}
                              className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-white whitespace-nowrap"
                            >
                              Configurar Key
                            </button>
                          </div>
                        )}

                        {/* Caso de Proyecto Sin Descripción: Llamado a la acción destacado */}
                        {!descriptionBody && !explainedBody && (
                          <div className="p-4 rounded-xl bg-purple-900/10 border border-purple-500/20 text-center space-y-3 my-2">
                            <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-300 mx-auto flex items-center justify-center border border-purple-500/30">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-white/90">Este proyecto no incluye descripción del autor</p>
                              <p className="text-[11px] text-white/50 leading-relaxed max-w-sm mx-auto">
                                Gemini AI puede buscar en Google Search (GitHub, foros y wikis) para averiguar qué hace y resumírtelo en segundos.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleExplain()}
                              disabled={isExplaining}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isExplaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              {isExplaining ? "Investigando en Google..." : "Investigar y Explicar con IA"}
                            </button>
                          </div>
                        )}

                        {/* Renderizado de la Explicación Generada */}
                        {explainedBody ? (
                          <div className="space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/25 text-[10px] flex-wrap gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                                  <Sparkles className="w-3 h-3 text-purple-400" /> MIM-Bot · Análisis de Proyecto
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleExplain(undefined, true)}
                                  disabled={isExplaining}
                                  title="Volver a generar explicación completa con MIM-Bot"
                                  className="p-1 rounded hover:bg-purple-500/20 text-purple-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <RotateCcw className={`w-3 h-3 ${isExplaining ? "animate-spin" : ""}`} />
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {explanationImagesAnalyzed > 0 && (
                                  <span className="flex items-center gap-1 text-sky-400 font-medium text-[9px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                                    <ImageIcon className="w-2.5 h-2.5" /> {explanationImagesAnalyzed} capturas analizadas
                                  </span>
                                )}
                                {explanationSearchUsed && (
                                  <span className="flex items-center gap-1 text-emerald-400 font-medium text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    <Search className="w-2.5 h-2.5" /> Google Search Grounding
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className="mim-rich-description text-xs text-white/80 leading-relaxed space-y-2.5 break-words bg-black/20 p-3 rounded-xl border border-white/5"
                              dangerouslySetInnerHTML={{ __html: markdownToHtml(explainedBody) }}
                            />

                            {explanationSources.length > 0 && (
                              <div className="pt-2 border-t border-white/5 space-y-1.5">
                                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">
                                  Fuentes de Google Search consultadas:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {explanationSources.map((src, i) => (
                                    <a
                                      key={i}
                                      href={src.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] text-white/60 hover:text-white transition-colors border border-white/5"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
                                      <span className="max-w-[160px] truncate">{src.title}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ── Mini-Chat Interactivo del Proyecto ── */}
                            <div className="mt-4 pt-3.5 border-t border-purple-500/20 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Preguntale a MIM-Bot sobre este proyecto</span>
                                </div>
                                <span className="text-[9px] font-mono text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                                  MIM-Bot ⚡
                                </span>
                              </div>

                              {/* Historial de mensajes */}
                              {chatMessages.length > 0 && (
                                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                                  {chatMessages.map((msg, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex flex-col text-xs rounded-2xl p-3 max-w-[90%] shadow-sm ${
                                        msg.role === "user"
                                          ? "ml-auto bg-purple-600/30 text-purple-100 border border-purple-500/30 rounded-br-sm"
                                          : "mr-auto bg-black/40 text-white/90 border border-white/5 rounded-bl-sm"
                                      }`}
                                    >
                                      <span className="text-[9px] font-mono uppercase text-white/40 mb-1">
                                        {msg.role === "user" ? "Vos" : "MIM-Bot"}
                                      </span>
                                      <div
                                        className="mim-rich-description text-xs leading-relaxed space-y-1.5 break-words"
                                        dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.text) }}
                                      />
                                    </div>
                                  ))}
                                  {isChatSending && (
                                    <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-black/30 border border-white/5 text-xs text-purple-300 w-fit">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                                      <span>Pensando la jugada...</span>
                                    </div>
                                  )}
                                  <div ref={chatBottomRef} />
                                </div>
                              )}

                              {/* Chips de sugerencias rápidas */}
                              {chatMessages.length === 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {[
                                    "¿Es compatible con Create y Sodium?",
                                    "¿Tiene comandos útiles o configuración?",
                                    "¿Añade nuevas dimensiones o biomas?",
                                  ].map((chip, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleSendChatMessage(chip)}
                                      disabled={isChatSending}
                                      className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-purple-500/20 border border-white/5 hover:border-purple-500/30 text-white/60 hover:text-purple-200 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                      💡 {chip}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Input y botón enviar */}
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="text"
                                  placeholder="Hacé tu pregunta a MIM-Bot..."
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendChatMessage();
                                    }
                                  }}
                                  disabled={isChatSending}
                                  className="flex-1 bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSendChatMessage()}
                                  disabled={!chatInput.trim() || isChatSending}
                                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all active:scale-95 disabled:opacity-30 shrink-0 shadow-lg shadow-purple-600/20"
                                >
                                  {isChatSending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : translatedBody ? (
                          <div className="mim-rich-description" dangerouslySetInnerHTML={{ __html: translatedBody }} />
                        ) : (
                          renderBodyText(descriptionBody, selectedMod?._source)
                        )}
                      </motion.div>
                    )}

                    {modalTab === "versions" && (
                      <motion.div key="versions" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="flex h-full min-h-0 flex-col gap-2 w-full">
                        {loadingDetails ? (
                          <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {versionRows.length > 0 ? (
                              <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">Versiones del mod</span>
                                  <span className="text-[9px] text-white/30 font-mono">{filteredVersionRows.length}/{versionRows.length}</span>
                                </div>
                                {availableGameVersionFilters.length > 0 && (
                                  <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
                                    <span className="text-[7.5px] text-white/28 uppercase font-mono tracking-wider block font-semibold mb-1">Filtrar por versión de juego</span>
                                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                                      {availableGameVersionFilters.map((gameVersion) => {
                                        const isSelected = selectedGameVersionFilters.includes(gameVersion);

                                        return (
                                          <button
                                            key={gameVersion}
                                            type="button"
                                            onClick={() => handleToggleGameVersionFilter(gameVersion)}
                                            className={`shrink-0 px-2 py-0.5 rounded-md border text-[8.5px] font-black font-mono transition-all active:scale-95 ${
                                              isSelected
                                                ? "bg-orange-500/15 border-orange-500/35 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.16)]"
                                                : "bg-white/[0.035] border-white/[0.06] text-white/45 hover:text-white/75 hover:bg-white/[0.06]"
                                            }`}
                                          >
                                            {gameVersion}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {availableVersionLoaderFilters.length > 0 && (
                                  <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5">
                                    <span className="text-[7.5px] text-white/28 uppercase font-mono tracking-wider block font-semibold mb-1">Filtrar por modloader</span>
                                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                                      {availableVersionLoaderFilters.map((loader) => {
                                        const isSelected = selectedLoaderFilters.includes(loader);

                                        return (
                                          <button
                                            key={loader}
                                            type="button"
                                            onClick={() => handleToggleLoaderFilter(loader)}
                                            className={`shrink-0 px-2 py-0.5 rounded-md border text-[8.5px] font-black transition-all active:scale-95 ${
                                              isSelected
                                                ? "bg-orange-500/15 border-orange-500/35 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.16)]"
                                                : "bg-white/[0.035] border-white/[0.06] text-white/45 hover:text-white/75 hover:bg-white/[0.06]"
                                            }`}
                                          >
                                            {normalizeLoaderLabel(loader)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/[0.06] scrollbar-none">
                                  {filteredVersionRows.length > 0 ? filteredVersionRows.map((version) => {
                                    const isExpanded = expandedVersionId === version.id;
                                    const loadedChangelog = version.changelog || versionChangelogs[version.id] || "";
                                    const isLoadingChangelog = loadingVersionChangelog === version.id;

                                    return (
                                      <div key={version.id} className="border-b border-white/[0.04] bg-white/[0.015] last:border-b-0">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleVersion(version)}
                                          className="grid w-full grid-cols-[1fr_auto] gap-2 p-2.5 text-left transition-colors hover:bg-white/[0.025] active:bg-white/[0.04]"
                                        >
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className={`px-2 py-1 rounded-full border text-[8px] font-black uppercase shrink-0 ${channelPillClass(version.versionType)}`}>
                                                {normalizeChannelLabel(version.versionType)}
                                              </span>
                                              <span className="text-[11px] font-bold text-white truncate">{version.name}</span>
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5 pl-7">
                                              {version.gameVersions.slice(0, 3).map((ver: string) => (
                                                <span key={ver} className="px-1.5 py-0.5 rounded-md bg-white/[0.07] border border-white/[0.06] text-[8px] font-mono text-white/55">{ver}</span>
                                              ))}
                                              {version.gameVersions.length > 3 && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[8px] font-mono text-white/35">+{version.gameVersions.length - 3}</span>
                                              )}
                                              {version.loaders.map((loader: string) => (
                                                <span key={loader} className="px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/15 text-[8px] font-bold text-orange-300">{normalizeLoaderLabel(loader)}</span>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="block text-[9px] font-mono text-white/40">{formatPublishedDate(version.datePublished)}</span>
                                            <span className="block text-[9px] font-bold text-white/55 mt-1">{compactNumber(version.downloads)} desc.</span>
                                            <span className="mt-1 block text-[8px] font-bold uppercase tracking-wide text-orange-300/70">
                                              {isExpanded ? "Ocultar" : "Changelog"}
                                            </span>
                                          </div>
                                        </button>

                                        <AnimatePresence initial={false}>
                                          {isExpanded && (
                                            <motion.div
                                              initial={{ opacity: 0, height: 0 }}
                                              animate={{ opacity: 1, height: "auto" }}
                                              exit={{ opacity: 0, height: 0 }}
                                              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                              className="overflow-hidden"
                                            >
                                              <div className="mx-3 mb-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                                                {isLoadingChangelog ? (
                                                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/45">
                                                    <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                                                    Cargando changelog...
                                                  </div>
                                                ) : loadedChangelog ? (
                                                  <div className="flex flex-col gap-2.5">
                                                    <div className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-2">
                                                      <span className="text-[9px] font-mono uppercase tracking-wider text-white/35 font-bold">Changelog</span>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleTranslateVersionChangelog(version, loadedChangelog)}
                                                        disabled={translatingVersionChangelog === version.id}
                                                        className="px-2 py-1 rounded-md border text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                                        style={{
                                                          color: "var(--color-primary)",
                                                          background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                                                          borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                                                        }}
                                                      >
                                                        {translatingVersionChangelog === version.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Languages className="w-2.5 h-2.5" />}
                                                        {translatingVersionChangelog === version.id
                                                          ? "Traduciendo"
                                                          : translatedVersionChangelogs[version.id] ? "Original" : "Traducir"}
                                                      </button>
                                                    </div>
                                                    {translatedVersionChangelogs[version.id] ? (
                                                      <div className="mim-rich-description" dangerouslySetInnerHTML={{ __html: translatedVersionChangelogs[version.id] }} />
                                                    ) : (
                                                      renderBodyText(loadedChangelog, selectedMod?._source)
                                                    )}
                                                  </div>
                                                ) : version.changelogUrl ? (
                                                  <a href={version.changelogUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-orange-300 hover:underline inline-flex items-center gap-1">
                                                    Ver changelog externo <ExternalLink className="w-3 h-3" />
                                                  </a>
                                                ) : (
                                                  <p className="text-[10px] text-white/35 italic">Esta versión no tiene changelog publicado.</p>
                                                )}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  }) : (
                                    <div className="p-4 text-center text-[10px] text-white/35">
                                      No hay versiones para esa combinación de filtros.
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-white/40 italic">No se listaron versiones del mod.</p>
                            )}

                          </div>
                        )}
                      </motion.div>
                    )}

                    {modalTab === "deps" && (
                      <motion.div key="deps" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }} className="flex h-full min-h-0 flex-col gap-2 w-full">
                        {loadingDetails ? (
                          <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                          </div>
                        ) : selectedModDeps?.length > 0 ? (
                          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                            <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">Dependencias ({selectedModDeps.length})</span>
                            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 scrollbar-none">
                              {visibleDependencyKinds.map((kind) => {
                                const group = DEPENDENCY_GROUPS[kind];
                                return (
                                  <div key={kind} className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-2 px-1">
                                      <span className="text-[9px] text-white/35 uppercase font-mono tracking-wider font-bold">{group.title}</span>
                                      <span className={`rounded-md border px-1.5 py-0.5 text-[8px] font-black ${group.className}`}>
                                        {dependencyGroups[kind].length}
                                      </span>
                                    </div>
                                    {dependencyGroups[kind].map((dep: any) => {
                                      const depSource = dep._source || selectedMod?._source || "modrinth";
                                      const depProjectId = String(dep.project_id || dep.projectId || dep.id);
                                      const depType = dep.project_type || dep.projectType || "mod";
                                      const depUrl = dep.url || (depSource === "curseforge"
                                        ? `https://www.curseforge.com/projects/${depProjectId}`
                                        : `https://modrinth.com/${depType}/${dep.slug || depProjectId}`);

                                      return (
                                        <div
                                          key={`${kind}-${depProjectId}`}
                                          onClick={() => handleOpenModDetails({
                                            projectId: depProjectId,
                                            title: dep.title || dep.name || depProjectId,
                                            description: dep.description || "",
                                            iconUrl: dep.icon_url || dep.iconUrl,
                                            author: dep.author || "Comunidad",
                                            projectType: depType,
                                            categories: dep.categories || [],
                                            url: depUrl,
                                            _source: depSource,
                                          }, true)}
                                          className={`border rounded-xl p-2 flex items-center gap-3 transition-colors cursor-pointer ${
                                            kind === "incompatible"
                                              ? "bg-red-500/[0.035] hover:bg-red-500/[0.07] border-red-500/15"
                                              : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04]"
                                          }`}
                                        >
                                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {dep.icon_url ? <img src={dep.icon_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white/40 text-xs font-bold uppercase">{(dep.title || dep.name || depProjectId).substring(0, 2)}</span>}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <span className="text-xs font-bold text-white truncate block">{dep.title || dep.name || depProjectId}</span>
                                            <div className="mt-0.5 flex items-center gap-1.5">
                                              <span className="text-[9px] text-white/45 capitalize">{depType}</span>
                                              <span className={`rounded border px-1.5 py-0.5 text-[7px] font-black uppercase ${group.className}`}>
                                                {group.badge}
                                              </span>
                                            </div>
                                          </div>
                                          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
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
                <div className={`flex gap-2 mt-auto border-t border-white/[0.04] shrink-0 ${isReadingTab ? "pt-1.5" : "pt-2"}`}>
                  <button
                    onClick={() => setModalTab(modalTab === "summary" ? "desc" : "summary")}
                    className={`flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium ${isReadingTab ? "text-[10px] rounded-lg py-2" : "text-[11px] rounded-xl py-2.5"} flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]`}
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
                      className={`shrink-0 ${isReadingTab ? "px-2.5 py-2 rounded-lg text-[10px]" : "px-3 py-2.5 rounded-xl text-[11px]"} font-bold flex items-center gap-1.5 transition-all active:scale-95`}
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

      {/* Lightbox / Fullscreen Image Viewer */}
      <AnimatePresence>
        {activeImageUrl && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[600]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImageIndex(null)}
          >
            <motion.div
              className="relative max-w-[92vw] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              onDragEnd={(_event, info) => {
                if (!hasGalleryNav) return;
                if (info.offset.x > 70) showPreviousImage();
                if (info.offset.x < -70) showNextImage();
              }}
            >
              <img
                key={activeImageUrl}
                src={activeImageUrl}
                alt={activeImage?.title || "Preview"}
                className="max-w-full max-h-[85vh] object-contain select-none"
                draggable={false}
              />
              {hasGalleryNav && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white/80 transition-all cursor-pointer border border-white/15 active:scale-95 flex items-center justify-center"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white/80 transition-all cursor-pointer border border-white/15 active:scale-95 flex items-center justify-center"
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute left-1/2 bottom-3 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white/70">
                    {(activeImageIndex ?? 0) + 1} / {galleryImages.length}
                  </div>
                </>
              )}
              <button
                onClick={() => setActiveImageIndex(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white/80 transition-all cursor-pointer border border-white/15 active:scale-95 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Opinion Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[700] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              className="bg-card/95 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col gap-4 overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-extrabold text-white">Compartir en Comunidad</h4>
                  <p className="text-[10px] text-white/40 mt-1">Escribí tu reseña u opinión sobre este proyecto para la comunidad.</p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-white/40 hover:text-white/70 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                value={shareComment}
                onChange={(e) => setShareComment(e.target.value)}
                placeholder="Ej: ¡Este mod es increíble para automatización! Totalmente recomendado."
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white/80 focus:border-orange-500/50 focus:outline-none resize-none transition-all placeholder:text-white/20"
              />

              {/* Actions */}
              <div className="flex gap-2.5 mt-2">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 font-semibold text-xs rounded-xl py-3 transition-all active:scale-[0.98]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmShare}
                  disabled={isSharing}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl py-3 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Compartiendo...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Compartir</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
