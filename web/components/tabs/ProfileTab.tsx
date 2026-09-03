"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Loader2, User, Mail, Key, Bookmark, Check, Pencil, LogOut, Layers, ChevronRight, UserCheck, Share2, Trash2, MessageSquare, Pin,
  Shield, Download, Upload, Lock, FileCheck, AlertCircle, RefreshCw, X,
} from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { supabase } from "../../lib/supabaseClient";
import {
  createVault,
  encryptVault,
  decryptVault,
  verifyVault,
  generateVaultFilename,
  type MimVaultSchema,
  type EncryptedVaultEnvelope,
  type VaultData,
} from "../../lib/vault/vaultEngine";
import { importVaultToSupabase, type VaultImportResult } from "../../lib/vault/vaultImporter";
import { playFomoSound } from "../../lib/sounds";

const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const globalRecentUpdatesCache: Record<string, boolean> = {};
const globalRecentUpdatesFetchedAt: Record<string, number> = {};

interface ProfileTabProps {
  session: any;
  profile: any;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  isRegistering: boolean;
  setIsRegistering: (v: boolean) => void;
  authLoading: boolean;
  loadingUserData: boolean;
  userDrafts: any[];
  userFavorites: any[];
  userShares?: any[];
  userFollowedAuthors?: any[];
  handleAuth: (e: React.FormEvent) => void;
  handleLogout: () => void;
  handleOpenEditProfile: () => void;
  handleOpenModDetails: (mod: ModHit) => void;
  handleEnterDraftCollection: (draft: any) => void;
  onCreateDraft: () => void;
  onEditDraft?: (draft: any) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
  onRemoveShare?: (projectId: string) => Promise<void>;
  onUpdateSharePriority?: (projectId: string, priority: boolean) => Promise<void>;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function projectUpdateKey(source: string | undefined, projectId: string) {
  return `${source || "modrinth"}:${projectId}`;
}

function isUpdatedInLastMonth(value?: string | null) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time <= THIRTY_DAYS_MS;
}

async function fetchProjectUpdatedAt(source: string | undefined, projectId: string) {
  if (!projectId || projectId.startsWith("youtube:")) return null;

  if (source === "curseforge") {
    const res = await fetch(`/api/curseforge/project?projectId=${encodeURIComponent(projectId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.details?.updated_at || data.details?.dateModified || null;
  }

  const res = await fetch(`/api/modrinth/project?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.updated_at || data.published || null;
}

/**
 * ProfileTab — muestra login/registro o el perfil del usuario autenticado.
 * Incluye acceso a Drafts y Favoritos con click funcional.
 */
export function ProfileTab({
  session, profile, email, setEmail, password, setPassword, username,
  setUsername, isRegistering, setIsRegistering, authLoading, loadingUserData,
  userDrafts, userFavorites, userShares = [], userFollowedAuthors = [], handleAuth, handleLogout, handleOpenEditProfile,
  handleOpenModDetails, handleEnterDraftCollection, onCreateDraft, onEditDraft,
  onSearchAuthor, onRemoveShare, onUpdateSharePriority,
}: ProfileTabProps) {
  const readFavoriteMeta = (fav: any) => {
    try {
      return fav.summary?.trim?.().startsWith("{") ? JSON.parse(fav.summary) : {};
    } catch {
      return {};
    }
  };

  const [recentUpdates, setRecentUpdates] = React.useState<Record<string, boolean>>({});
  const getCreatedTime = (item: any) => {
    const value = item.created_at || item.inserted_at || item.updated_at || "";
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  const sortedUserFavorites = React.useMemo(() => {
    const getTime = (fav: any) => {
      return getCreatedTime(fav);
    };

    return [...userFavorites].sort((a, b) => {
      const aKey = projectUpdateKey(a.platform || a.source || "modrinth", a.mod_id || a.project_id || a.id);
      const bKey = projectUpdateKey(b.platform || b.source || "modrinth", b.mod_id || b.project_id || b.id);
      const updateOrder = Number(!!recentUpdates[bKey]) - Number(!!recentUpdates[aKey]);
      return updateOrder || getTime(b) - getTime(a);
    });
  }, [userFavorites, recentUpdates]);

  const sortedUserShares = React.useMemo(() => [...userShares].sort((a, b) => {
    // share.pinned = true means explicitly pinned via DB column.
    // fall back to parsing the summary blob for rows predating the column.
    const aPriority = a.pinned === true ? true : (a.pinned == null && !!parseShareMeta(a.summary).priority);
    const bPriority = b.pinned === true ? true : (b.pinned == null && !!parseShareMeta(b.summary).priority);

    if (aPriority !== bPriority) {
      return bPriority ? 1 : -1;
    }

    const aKey = projectUpdateKey(a.platform || "modrinth", a.mod_id || a.project_id || a.id);
    const bKey = projectUpdateKey(b.platform || "modrinth", b.mod_id || b.project_id || b.id);
    const aUpdated = !aKey.startsWith("youtube:") && !!recentUpdates[aKey];
    const bUpdated = !bKey.startsWith("youtube:") && !!recentUpdates[bKey];

    if (aUpdated !== bUpdated) {
      return bUpdated ? 1 : -1;
    }

    return getCreatedTime(b) - getCreatedTime(a);
  }), [userShares, recentUpdates]);

  // ── Sovereign Vault & Data Sovereignty ──
  const [isExportingVault, setIsExportingVault] = React.useState(false);
  const [vaultPassphrase, setVaultPassphrase] = React.useState("");
  const [encryptVaultCheckbox, setEncryptVaultCheckbox] = React.useState(false);
  const [showExportModal, setShowExportModal] = React.useState(false);

  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importFileName, setImportFileName] = React.useState<string>("");
  const [parsedVault, setParsedVault] = React.useState<MimVaultSchema | null>(null);
  const [isEncryptedVault, setIsEncryptedVault] = React.useState(false);
  const [rawEnvelope, setRawEnvelope] = React.useState<EncryptedVaultEnvelope | null>(null);
  const [importPassphrase, setImportPassphrase] = React.useState("");
  const [importPassError, setImportPassError] = React.useState<string | null>(null);
  const [importValidation, setImportValidation] = React.useState<{ valid: boolean; error?: string } | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<VaultImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExportVault = async () => {
    try {
      setIsExportingVault(true);

      const formattedDrafts = (userDrafts || []).map((d: any) => ({
        name: d.name || "Borrador sin título",
        description: d.description || "",
        minecraft_version: d.minecraft_version || "1.20.1",
        loader: d.loader || "fabric",
        visibility: d.visibility || "private",
        cover_image: d.cover_image || undefined,
        created_at: d.created_at,
        items: (d.draft_items || d.items || []).map((it: any) => ({
          project_id: it.project_id,
          mod_name: it.mod_name || it.project_id,
          source: it.source || "modrinth",
          category: it.category || "mods",
          content_type: it.content_type || "mods",
          side: it.side || "both",
          version_id: it.version_id || undefined,
          dependencies: it.dependencies || [],
        })),
      }));

      const formattedFavorites = (userFavorites || []).map((f: any) => ({
        project_id: f.mod_id || f.project_id || f.id,
        mod_name: f.mod_name || f.title || f.name,
        platform: f.platform || f.source || "modrinth",
        summary: f.summary,
        author: f.author,
        icon_url: f.icon_url,
        pinned: !!f.pinned,
        created_at: f.created_at,
      }));

      const formattedAuthors = (userFollowedAuthors || []).map((a: any) => ({
        author_id: a.author_id,
        author_name: a.author_name,
        platform: a.platform || a.source || "modrinth",
        avatar_url: a.avatar_url,
        created_at: a.created_at,
      }));

      const vaultData: VaultData = {
        drafts: formattedDrafts,
        favorites: formattedFavorites,
        followedAuthors: formattedAuthors,
        followedMods: [],
        preferences: {
          defaultMinecraftVersion: "1.20.1",
          preferredLoader: "fabric",
        },
      };

      const identity = {
        username: profile?.username || username || "Usuario",
        avatar_url: profile?.avatar_url,
        color: profile?.color,
        banner_url: profile?.banner_url,
        banner_meta: profile?.banner_meta,
      };

      const baseVault = await createVault(vaultData, identity, {
        app: "MIMweb (FOMO Hub)",
        version: "1.0.0",
      });

      let finalContent: string;
      const isEncrypted = encryptVaultCheckbox && vaultPassphrase.trim().length > 0;

      if (isEncrypted) {
        const encryptedEnvelope = await encryptVault(baseVault, vaultPassphrase.trim());
        finalContent = JSON.stringify(encryptedEnvelope, null, 2);
      } else {
        finalContent = JSON.stringify(baseVault, null, 2);
      }

      const filename = generateVaultFilename(profile?.username || username, isEncrypted);
      const blob = new Blob([finalContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playFomoSound("sparkle");
      setShowExportModal(false);
      setVaultPassphrase("");
      setEncryptVaultCheckbox(false);
    } catch (err) {
      console.error("[Sovereign Vault] Error al exportar:", err);
    } finally {
      setIsExportingVault(false);
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportPassError(null);
    setImportResult(null);
    setParsedVault(null);
    setRawEnvelope(null);
    setIsEncryptedVault(false);
    setImportValidation(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (json.isEncrypted) {
        setIsEncryptedVault(true);
        setRawEnvelope(json);
        setShowImportModal(true);
        playFomoSound("pop");
      } else {
        setIsEncryptedVault(false);
        const verification = await verifyVault(json);
        setImportValidation(verification);
        setParsedVault(json);
        setShowImportModal(true);
        playFomoSound("pop");
      }
    } catch (err: any) {
      setImportValidation({ valid: false, error: "El archivo seleccionado no es un formato .mimvault válido." });
      setShowImportModal(true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDecryptVault = async () => {
    if (!rawEnvelope || !importPassphrase.trim()) return;
    setImportPassError(null);
    try {
      const decrypted = await decryptVault(rawEnvelope, importPassphrase.trim());
      setParsedVault(decrypted);
      setIsEncryptedVault(false);
      setImportValidation({ valid: true });
      playFomoSound("sparkle");
    } catch (err: any) {
      setImportPassError(err?.message || "Contraseña incorrecta o archivo dañado.");
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedVault || !session?.user?.id) return;
    setIsImporting(true);
    try {
      const res = await importVaultToSupabase(parsedVault, session.user.id, supabase);
      setImportResult(res);
      if (res.success) {
        playFomoSound("sparkle");
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        draftsImported: 0,
        itemsImported: 0,
        favoritesImported: 0,
        authorsImported: 0,
        error: err?.message || "Error al sincronizar con la base de datos.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    const entries = [...userFavorites, ...userShares]
      .map((item) => {
        const meta = item.summary?.trim?.().startsWith("{") ? readFavoriteMeta(item) : {};
        const projectId = item.mod_id || item.project_id || item.id;
        const source = item.platform || item.source || "modrinth";
        const projectType = item.project_type || meta.project_type || meta.projectType || "mod";
        return { projectId, source, projectType };
      })
      .filter((item) => item.projectId && item.source !== "youtube" && !String(item.projectId).startsWith("youtube:"));
    const unique = Array.from(new Map(entries.map((item) => [projectUpdateKey(item.source, item.projectId), item])).values());

    if (!unique.length) {
      setRecentUpdates({});
      return;
    }

    // Identify which projects actually need fetching
    const needsFetch = unique.filter((item) => {
      const key = projectUpdateKey(item.source, item.projectId);
      const cachedTime = globalRecentUpdatesFetchedAt[key];
      return !cachedTime || Date.now() - cachedTime > CACHE_EXPIRY_MS;
    });

    // Hydrate state from cache immediately to prevent flash/layout shift
    const initialFromCache: Record<string, boolean> = {};
    unique.forEach((item) => {
      const key = projectUpdateKey(item.source, item.projectId);
      if (globalRecentUpdatesCache[key] !== undefined) {
        initialFromCache[key] = globalRecentUpdatesCache[key];
      }
    });

    if (Object.keys(initialFromCache).length > 0) {
      setRecentUpdates((prev) => ({ ...prev, ...initialFromCache }));
    }

    if (!needsFetch.length) return;

    (async () => {
      const pairs: [string, boolean][] = [];
      
      // Batch Modrinth project fetches
      const modrinthIds = needsFetch.filter(item => item.source === "modrinth").map(item => item.projectId);
      if (modrinthIds.length > 0) {
        try {
          const res = await fetch(`/api/modrinth/projects?ids=${encodeURIComponent(JSON.stringify(modrinthIds))}`);
          if (res.ok) {
            const projects = await res.json();
            if (Array.isArray(projects)) {
              projects.forEach((proj: any) => {
                const key = projectUpdateKey("modrinth", proj.id);
                const updated = isUpdatedInLastMonth(proj.updated_at || proj.published);
                globalRecentUpdatesCache[key] = updated;
                globalRecentUpdatesFetchedAt[key] = Date.now();
                pairs.push([key, updated]);
              });
            }
          }
        } catch (err) {
          console.error("Error batch fetching Modrinth updates:", err);
        }
      }

      // Single fetch for CurseForge projects
      const curseforgeItems = needsFetch.filter(item => item.source === "curseforge");
      if (curseforgeItems.length > 0) {
        await Promise.all(curseforgeItems.map(async (item) => {
          const key = projectUpdateKey(item.source, item.projectId);
          try {
            const updatedAt = await fetchProjectUpdatedAt(item.source, item.projectId);
            const updated = isUpdatedInLastMonth(updatedAt);
            globalRecentUpdatesCache[key] = updated;
            globalRecentUpdatesFetchedAt[key] = Date.now();
            pairs.push([key, updated]);
          } catch {
            globalRecentUpdatesCache[key] = false;
            globalRecentUpdatesFetchedAt[key] = Date.now();
            pairs.push([key, false]);
          }
        }));
      }

      if (!cancelled && pairs.length > 0) {
        setRecentUpdates((prev) => ({
          ...prev,
          ...Object.fromEntries(pairs)
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userFavorites, userShares]);

  const handleHorizontalWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const delta = event.shiftKey ? event.deltaY : event.deltaX;
    if (!delta) return;

    const target = event.currentTarget;
    const maxScroll = target.scrollWidth - target.clientWidth;
    if (maxScroll <= 0) return;

    const canScroll =
      (delta > 0 && target.scrollLeft < maxScroll) ||
      (delta < 0 && target.scrollLeft > 0);

    if (!canScroll) return;
    target.scrollLeft += delta;
    event.preventDefault();
  };

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 scrollbar-none"
    >
      {!session ? (
        /* ── Login / Register Form ── */
        <div className="my-auto bg-surface/80 border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-md font-bold text-white">FOMO Cloud Sync</h2>
            <p className="text-xs text-white/40 mt-1">
              Accedé a tus modpacks, ránkings y proyectos favoritos en cualquier dispositivo.
            </p>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {isRegistering && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Nombre de usuario</label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tu apodo"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Contraseña</label>
              <div className="relative">
                <Key className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRegistering ? "Registrarme" : "Iniciar Sesión"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[11px] text-orange-400 font-semibold hover:underline"
            >
              {isRegistering ? "¿Ya tenés cuenta? Iniciá sesión" : "¿No tenés cuenta? Registrate gratis"}
            </button>
          </div>
        </div>
      ) : (
        /* ── Authenticated Profile View ── */
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          className="flex flex-col gap-6"
        >

          {/* Profile Card */}
          <motion.section variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.28 }} className="bg-surface/90 border border-border rounded-3xl overflow-hidden flex flex-col relative shadow-xl">
            {/* Banner */}
            <div className="h-28 w-full relative overflow-hidden bg-gradient-to-r from-orange-600/30 to-rose-600/30 border-b border-white/[0.04]">
              {profile?.banner_url ? (
                <img src={profile.banner_url} alt="User Banner" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full opacity-60 transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${profile?.color || '#F05A28'}44 0%, var(--color-surface) 100%)` }}
                />
              )}
              <button
                onClick={handleLogout}
                className="absolute top-3 right-3 bg-black/40 hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08] backdrop-blur-md rounded-full p-2 text-white/70 active:scale-95 transition-all z-10"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar & Info */}
            <div className="px-5 pb-5 pt-0 relative flex flex-col items-start">
              <div
                className="w-16 h-16 rounded-2xl bg-surface border-2 border-border flex items-center justify-center text-rose-400 text-xl font-black uppercase overflow-hidden -mt-8 shadow-lg z-10"
                style={{ borderColor: profile?.color || 'rgba(255,255,255,0.08)' }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: profile?.color || '#E11D48' }}>
                    {profile?.username?.substring(0, 2) || session.user.email.substring(0, 2)}
                  </span>
                )}
              </div>

              <div className="mt-3 w-full flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className="border text-[8px] font-bold font-mono px-2 py-0.5 rounded-full uppercase"
                    style={{
                      backgroundColor: `${profile?.color || '#F05A28'}15`,
                      borderColor: `${profile?.color || '#F05A28'}30`,
                      color: profile?.color || '#F05A28'
                    }}
                  >
                    FOMO Member
                  </span>
                  <h2 className="text-sm font-bold text-white truncate mt-2">@{profile?.username || "Usuario"}</h2>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{session.user.email}</p>
                </div>
                <button
                  onClick={handleOpenEditProfile}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold active:scale-95 transition-all"
                  style={{
                    background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                    color: "var(--color-primary)",
                  }}
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              </div>
            </div>
          </motion.section>

          {/* Drafts Section */}
          <motion.section variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-orange-500" /> Borradores Modpacks (Drafts)
              </h3>
              <button
                onClick={onCreateDraft}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                style={{
                  background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                  color: "var(--color-primary)",
                }}
              >
                + Nuevo
              </button>
            </div>

            {loadingUserData ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
              </div>
            ) : userDrafts.length > 0 ? (
              <div className="grid gap-3">
                {userDrafts.map((draft, draftIndex) => (
                  <motion.div
                    key={draft.id}
                    onClick={() => handleEnterDraftCollection(draft)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(draftIndex * 0.04, 0.16) }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    className="bg-surface/80 border border-border rounded-2xl overflow-hidden cursor-pointer transition-colors hover:border-white/15 hover:shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
                  >
                    {draft.cover_image && (
                      <div className="h-20 w-full">
                        <img src={draft.cover_image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{draft.name}</h4>
                          <p className="text-[10px] text-white/40 mt-1">
                            Versión: {draft.minecraft_version} • Loader: {draft.loader}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-white/5 border border-white/[0.08] text-white/60 text-[9px] px-2 py-0.5 rounded-full">
                          {draft.visibility}
                        </span>
                        <ChevronRight className="w-4 h-4 text-white/30" />
                        {onEditDraft && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditDraft(draft);
                            }}
                            className="p-1.5 rounded-lg text-white/35 hover:text-orange-300 hover:bg-white/5 transition-all active:scale-90"
                            title="Editar draft"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                <p className="text-xs text-white/40">No tenés borradores colaborativos creados.</p>
                <button
                  onClick={onCreateDraft}
                  className="mt-3 text-xs font-bold text-orange-400 hover:underline"
                >
                  Crear primer draft →
                </button>
              </div>
            )}
          </motion.section>

          {/* Favorites Section */}
          <motion.section variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Mis Proyectos Favoritos
            </h3>
            {loadingUserData ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
            ) : sortedUserFavorites.length > 0 ? (
              <div
                onWheel={handleHorizontalWheel}
                className="grid grid-flow-col grid-rows-3 auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1 snap-x snap-mandatory scrollbar-none touch-auto overscroll-x-contain"
              >
                {sortedUserFavorites.map(fav => {
                  const meta = readFavoriteMeta(fav);
                  const projectId = fav.mod_id || fav.project_id || fav.id;
                  const projectType = fav.project_type || meta.project_type || "mod";
                  const projectSource = fav.platform || fav.source || "modrinth";
                  const isRecentlyUpdated = recentUpdates[projectUpdateKey(projectSource, projectId)];
                  let title = fav.name || "";
                  let author = "Comunidad";
                  if (fav.name && fav.name.includes(" ::: ")) {
                    const parts = fav.name.split(" ::: ");
                    title = parts[0];
                    author = parts[1];
                  }
                  return (
                  <div
                    key={fav.id}
                    onClick={() => handleOpenModDetails({
                      projectId,
                      title: title,
                      description: fav.description || meta.description || (!fav.summary?.trim?.().startsWith("{") ? fav.summary : "") || "",
                      iconUrl: fav.icon_url,
                      author: author,
                      projectType,
                      categories: fav.categories || meta.categories || [],
                      url: fav.url || meta.url || `https://modrinth.com/${projectType}/${projectId}`,
                      _source: projectSource,
                    })}
                    className={`bg-surface/80 border rounded-2xl p-3.5 min-h-[66px] flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all hover:border-white/10 snap-start ${
                      isRecentlyUpdated ? "border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.28)]" : "border-border"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {fav.icon_url ? (
                        <img src={fav.icon_url} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white/40 text-xs font-bold uppercase">{title.substring(0, 2)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{title}</h4>
                      <p className="text-[9px] text-white/35 mt-0.5 capitalize">{author} • {fav.platform}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                <p className="text-xs text-white/40">No guardaste ningún mod favorito todavía.</p>
              </div>
            )}
          </motion.section>

          {/* Shared Mods Section */}
          <motion.section variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-amber-500" /> Mis Recomendados (Compartidos)
            </h3>
            {loadingUserData ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              </div>
            ) : sortedUserShares.length > 0 ? (
              <div
                onWheel={handleHorizontalWheel}
                className="grid grid-flow-col grid-rows-1 gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1 snap-x snap-mandatory scrollbar-none touch-auto overscroll-x-contain"
                style={{ gridAutoColumns: "minmax(260px, calc((100% - 1.5rem) / 3))" }}
              >
                {sortedUserShares.map(share => {
                  const meta = parseShareMeta(share.summary);
                  const projectId = share.mod_id || share.project_id || share.id;
                  const projectType = meta.projectType || "mod";
                  const isYoutubeShare = share.platform === "youtube" || projectType.startsWith("youtube-");
                  const shareSource = share.platform || "modrinth";
                  const isRecentlyUpdated = !isYoutubeShare && recentUpdates[projectUpdateKey(shareSource, projectId)];
                  // share.pinned = true → pinned via DB column (source of truth).
                  // share.pinned = null/undefined → old row, fall back to summary blob.
                  // share.pinned = false → explicitly NOT pinned, don't fall back to blob.
                  const isPriority: boolean = share.pinned === true ? true
                    : share.pinned == null ? !!meta.priority
                    : false;
                  const openShare = () => {
                    if (isYoutubeShare) {
                      if (meta.embeddedVideoId) {
                        window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: meta.embeddedVideoId } }));
                      } else if (meta.videoUrl) {
                        window.open(meta.videoUrl, "_blank", "noopener,noreferrer");
                      }
                      return;
                    }

                    handleOpenModDetails({
                      projectId,
                      title: share.name,
                      description: meta.comment || "",
                      iconUrl: share.icon_url,
                      author: "Comunidad",
                      projectType,
                      categories: [share.platform || "modrinth"],
                      url: share.platform === "curseforge"
                        ? `https://www.curseforge.com/minecraft/mc-mods/${projectId}`
                        : `https://modrinth.com/${projectType}/${projectId}`,
                      _source: share.platform || "modrinth",
                    });
                  };
                  return (
                    <div
                      key={share.id}
                      className={`bg-surface/80 border rounded-2xl p-3.5 flex flex-col gap-3 hover:border-white/10 transition-all snap-start ${
                        isPriority
                          ? "border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.28)]"
                          : isRecentlyUpdated
                            ? "border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
                            : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          onClick={openShare}
                          className="w-9 h-9 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer active:scale-95 transition-all"
                        >
                          {share.icon_url ? (
                            <img src={share.icon_url} alt="" className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-white/40 text-xs font-bold uppercase">{share.name?.substring(0, 2)}</span>
                          )}
                        </div>
                        <div
                          onClick={openShare}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <h4 className="text-xs font-bold text-white truncate">{share.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm ${
                              isYoutubeShare
                                ? "bg-red-600/20 text-red-300 border border-red-500/20"
                                : share.platform === "curseforge" ? "bg-orange-600/20 text-orange-400 border border-orange-500/20" : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {isYoutubeShare ? "YouTube" : share.platform === "curseforge" ? "CurseForge" : "Modrinth"}
                            </span>
                            {meta.modloader && (
                              <span className="text-[8px] font-mono text-white/40 uppercase">{meta.modloader}</span>
                            )}
                            {meta.gameVersion && (
                              <span className="text-[8px] font-mono text-white/40">{meta.gameVersion}</span>
                            )}
                          </div>
                        </div>
                        {onUpdateSharePriority && (
                          <button
                            type="button"
                            onClick={() => onUpdateSharePriority(share.id, !isPriority)}
                            className={`p-2 rounded-lg active:scale-95 transition-all ${
                              isPriority
                                ? "text-amber-300 bg-amber-500/15 border border-amber-500/25"
                                : "text-white/30 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent"
                            }`}
                            title={isPriority ? "Quitar de prioritarios" : "Fijar arriba"}
                            aria-label={isPriority ? `Quitar prioridad a ${share.name}` : `Dar prioridad a ${share.name}`}
                          >
                            <Pin className={`w-3.5 h-3.5 ${isPriority ? "fill-current" : ""}`} />
                          </button>
                        )}
                        {onRemoveShare && (
                          <button
                            onClick={() => onRemoveShare(share.id)}
                            className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                            title="Eliminar compartido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      {meta.comment && (
                        <div className="bg-white/[0.02] border-l border-amber-500/30 rounded-r-lg p-2.5 text-[10px] text-white/70 italic flex gap-1.5">
                          <MessageSquare className="w-3 h-3 text-amber-500/40 shrink-0 mt-0.5" />
                          <p className="line-clamp-2 leading-relaxed">{meta.comment}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                <p className="text-xs text-white/40">No compartiste ningún mod con la comunidad todavía.</p>
              </div>
            )}
          </motion.section>

          {/* Autores Seguidos */}
          <motion.section variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white/70 tracking-wide flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-400" /> Autores Seguidos
            </h3>
            {userFollowedAuthors.length > 0 ? (
              <div
                onWheel={handleHorizontalWheel}
                className="grid grid-flow-col grid-rows-3 auto-cols-[minmax(150px,180px)] gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1 snap-x snap-mandatory scrollbar-none touch-auto overscroll-x-contain"
              >
                {userFollowedAuthors.map(a => (
                  <div
                    key={a.id}
                    onClick={() => onSearchAuthor && onSearchAuthor(a.author_name, a.platform || "modrinth")}
                    className={`bg-surface/80 border border-border rounded-xl p-3 min-h-[96px] flex flex-col items-center justify-center gap-2 text-center snap-start ${
                      onSearchAuthor ? "cursor-pointer hover:border-white/10 active:scale-[0.98] transition-all" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {a.icon_url ? (
                        <img src={a.icon_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-400 text-[10px] font-bold uppercase">{a.author_name?.substring(0, 2)}</span>
                      )}
                    </div>
                    <div className="w-full min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{a.author_name}</h4>
                      <p className="text-[9px] text-white/35 mt-0.5 capitalize">{a.platform}</p>
                    </div>
                    {onSearchAuthor ? (
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 shrink-0" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-blue-400/50 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-6 text-center">
                <p className="text-xs text-white/40">No seguís a ningún autor todavía.</p>
              </div>
            )}
          </motion.section>

          {/* ── Bóveda Soberana (MIM Sovereign Vault & Data Sovereignty) ── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-emerald-950/20 via-indigo-950/15 to-surface/80 border border-emerald-500/20 rounded-3xl p-5 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Bóveda Soberana (MIM Vault)</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                      SHA-256
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                    Respaldá tus borradores, favoritos y creadores en un archivo portable <code className="text-emerald-300 font-mono">.mimvault</code> independiente de la nube.
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                disabled={isExportingVault}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isExportingVault ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-emerald-400" />
                )}
                Exportar Bóveda (.mimvault)
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                Restaurar / Migrar Bóveda
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFilePicked}
                accept=".mimvault,.json"
                className="hidden"
              />
            </div>
          </motion.section>

          {/* ── Modal de Exportación ── */}
          {showExportModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#12131a] border border-emerald-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Shield className="w-4 h-4" /> Exportar Bóveda Soberana
                  </div>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-white/60 leading-relaxed">
                  Se generará un archivo <code className="text-emerald-300 font-mono">.mimvault</code> con tus{" "}
                  <strong>{userDrafts.length} borradores</strong>, <strong>{userFavorites.length} favoritos</strong> y{" "}
                  <strong>{userFollowedAuthors.length} autores</strong>, firmado con suma de verificación SHA-256.
                </p>

                {/* Opción Cifrado Zero-Knowledge */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={encryptVaultCheckbox}
                      onChange={(e) => setEncryptVaultCheckbox(e.target.checked)}
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" /> Cifrado Zero-Knowledge (AES-256-GCM)
                    </span>
                  </label>
                  <p className="text-[11px] text-white/40 leading-relaxed pl-6">
                    Protege el contenido con contraseña usando PBKDF2 (100.000 iteraciones). Nadie sin la clave podrá leer tus modpacks.
                  </p>

                  {encryptVaultCheckbox && (
                    <div className="pt-2 pl-6">
                      <input
                        type="password"
                        placeholder="Contraseña de la bóveda..."
                        value={vaultPassphrase}
                        onChange={(e) => setVaultPassphrase(e.target.value)}
                        className="w-full bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExportVault}
                    disabled={isExportingVault || (encryptVaultCheckbox && !vaultPassphrase.trim())}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isExportingVault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Descargar Bóveda (.mimvault)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal de Importación / Restauración ── */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#12131a] border border-indigo-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <Upload className="w-4 h-4" /> Restaurar Bóveda Soberana
                  </div>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-white/50 font-mono truncate">
                  Archivo: <span className="text-white font-bold">{importFileName}</span>
                </div>

                {/* Caso 1: Archivo Cifrado */}
                {isEncryptedVault && (
                  <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <Lock className="w-4 h-4" /> Bóveda Cifrada Detectada (AES-256-GCM)
                    </div>
                    <p className="text-[11px] text-white/60">
                      Esta bóveda está protegida. Introduce la contraseña definida durante su exportación para descifrarla:
                    </p>
                    <div className="space-y-2">
                      <input
                        type="password"
                        placeholder="Contraseña de la bóveda..."
                        value={importPassphrase}
                        onChange={(e) => setImportPassphrase(e.target.value)}
                        className="w-full bg-black/40 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-400"
                      />
                      {importPassError && (
                        <p className="text-[11px] text-rose-400 font-semibold">{importPassError}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleDecryptVault}
                      disabled={!importPassphrase.trim()}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      Descifrar y Validar
                    </button>
                  </div>
                )}

                {/* Caso 2: Validación de Integridad */}
                {importValidation && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                      importValidation.valid
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    }`}
                  >
                    {importValidation.valid ? (
                      <>
                        <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Integridad SHA-256 Verificada con éxito.</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{importValidation.error || "Fallo en la validación del archivo."}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Caso 3: Desglose de Contenido y Botón Restaurar */}
                {parsedVault && !isEncryptedVault && importValidation?.valid && !importResult && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="block text-base font-bold text-white font-mono">
                          {parsedVault.data.drafts?.length || 0}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase">Borradores</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="block text-base font-bold text-white font-mono">
                          {parsedVault.data.favorites?.length || 0}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase">Favoritos</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="block text-base font-bold text-white font-mono">
                          {parsedVault.data.followedAuthors?.length || 0}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase">Autores</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-white/50 leading-relaxed text-center">
                      Los datos se sincronizarán con tu cuenta actual de forma idempotente sin duplicar contenido existente.
                    </p>

                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isImporting}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Restaurando en tu cuenta...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" /> Restaurar en mi Cuenta
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Resultado Exitoso */}
                {importResult && (
                  <div className="space-y-3 text-center pt-2">
                    {importResult.success ? (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                          <Check className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-white">¡Bóveda Restaurada con Éxito!</h4>
                        <p className="text-xs text-white/60">
                          Se restauraron {importResult.draftsImported} borradores, {importResult.itemsImported} items,{" "}
                          {importResult.favoritesImported} favoritos y {importResult.authorsImported} autores.
                        </p>
                        <button
                          type="button"
                          onClick={() => window.location.reload()}
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                        >
                          Actualizar Vista
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                        {importResult.error || "Ocurrió un error durante la importación."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function parseShareMeta(summary?: string | null): {
  comment: string;
  gameVersion?: string;
  modloader?: string;
  projectType?: string;
  videoUrl?: string;
  thumbnail?: string;
  embeddedVideoId?: string;
  mode?: string;
  publishedAt?: string;
  priority?: boolean;
} {
  if (!summary) return { comment: "" };
  const trimmed = summary.trim();

  // 1. Try old JSON format
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        comment: parsed.comment || parsed.description || "",
        gameVersion: parsed.gameVersion,
        modloader: parsed.modloader,
        projectType: parsed.projectType || "mod",
        videoUrl: parsed.videoUrl,
        thumbnail: parsed.thumbnail,
        embeddedVideoId: parsed.embeddedVideoId,
        mode: parsed.mode,
        publishedAt: parsed.publishedAt,
        priority: !!parsed.priority,
      };
    } catch (e) {
      console.debug("[ProfileTab] Could not parse favorite summary JSON directly:", e);
    }
  }

  // 2. Try new HTML comment format
  const META_RE = /<!--mim:([\s\S]*?)-->/;
  const match = trimmed.match(META_RE);
  const comment = trimmed.replace(META_RE, "").trim();

  if (match && match[1]) {
    try {
      const meta = JSON.parse(match[1]);
      return {
        comment,
        gameVersion: meta.gameVersion,
        modloader: meta.modloader,
        projectType: meta.projectType || "mod",
        videoUrl: meta.videoUrl,
        thumbnail: meta.thumbnail,
        embeddedVideoId: meta.embeddedVideoId,
        mode: meta.mode,
        publishedAt: meta.publishedAt,
        priority: !!meta.priority,
      };
    } catch (e) {
      console.debug("[ProfileTab] Could not parse HTML comment metadata in favorite summary:", e);
    }
  }

  // Fallback: entire summary is the comment
  return { comment: trimmed };
}
