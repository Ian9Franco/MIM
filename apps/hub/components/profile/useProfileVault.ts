"use client";

import React from "react";
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
  type VaultDraft,
} from "../../lib/vault/vaultEngine";
import { importVaultToSupabase, type VaultImportResult } from "../../lib/vault/vaultImporter";
import { playFomoSound } from "../../lib/sounds";
import type {
  FomoFavoriteItem,
  FomoFollowedAuthor,
} from "../../types/fomo";
import type { HomeDraft, HomeDraftItem } from "../../lib/drafts/draftContract";
import type { HubUserProfile } from "../../types/profile";
import type { FomoUserSession } from "../../types/fomo";

interface UseProfileVaultParams {
  session: FomoUserSession | null;
  profile: HubUserProfile | null;
  username: string;
  userDrafts: HomeDraft[];
  userFavorites: FomoFavoriteItem[];
  userFollowedAuthors: FomoFollowedAuthor[];
}

export function useProfileVault({
  session,
  profile,
  username,
  userDrafts,
  userFavorites,
  userFollowedAuthors,
}: UseProfileVaultParams) {
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

      const formattedDrafts: VaultDraft[] = userDrafts.map((d: HomeDraft) => {
        const rawItems = d.items ?? (d.draft_items as HomeDraftItem[] | undefined) ?? [];
        const visibility = d.visibility === "public" || d.visibility === "unlisted" ? d.visibility : "private";
        return {
          name: d.name ?? "Borrador sin título",
          description: d.description ?? "",
          minecraft_version: d.minecraft_version ?? "1.20.1",
          loader: d.loader ?? "fabric",
          visibility,
          cover_image: d.cover_image ?? undefined,
          created_at: d.created_at,
          items: rawItems.map((it) => ({
            project_id: it.project_id ?? it.projectId,
            mod_name: it.mod_name ?? it.title ?? it.project_id ?? it.projectId,
            source: (it.source as string | undefined) ?? (it.platform as string | undefined) ?? "modrinth",
            category: it.category ?? "mods",
            content_type: it.content_type ?? "mods",
            side: it.side,
            version_id: typeof it.version_id === "string" ? it.version_id : (typeof it.versionId === "string" ? it.versionId : undefined),
            dependencies: it.dependencies,
          })),
        };
      });

      const formattedFavorites = userFavorites.map((f) => ({
        project_id: String(f.mod_id ?? f.project_id ?? f.id ?? f.projectId ?? ""),
        mod_name: String(f.mod_name ?? f.title ?? f.name ?? "Proyecto"),
        platform: String(f.platform ?? f.source ?? f._source ?? "modrinth"),
        summary: typeof f.summary === "string" ? f.summary : undefined,
        author: typeof f.author === "string" ? f.author : undefined,
        icon_url: f.icon_url ?? f.iconUrl ?? undefined,
        pinned: !!f.pinned,
        created_at: typeof f.created_at === "string" ? f.created_at : undefined,
      }));

      const formattedAuthors = userFollowedAuthors.map((a) => ({
        author_id: typeof a.author_id === "string" ? a.author_id : undefined,
        author_name: String(a.author_name ?? a.name ?? "Autor"),
        platform: String(a.platform ?? (typeof a.source === "string" ? a.source : undefined) ?? "modrinth"),
        avatar_url: a.avatar_url ?? a.iconUrl ?? undefined,
        created_at: typeof a.created_at === "string" ? a.created_at : undefined,
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
        avatar_url: profile?.avatar_url ?? undefined,
        color: profile?.color ?? undefined,
        banner_url: profile?.banner_url ?? undefined,
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
    } catch {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "Contraseña incorrecta o archivo dañado.");
      setImportPassError(message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "Error al sincronizar con la base de datos.");
      setImportResult({
        success: false,
        draftsImported: 0,
        itemsImported: 0,
        favoritesImported: 0,
        authorsImported: 0,
        error: message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isExportingVault,
    vaultPassphrase,
    setVaultPassphrase,
    encryptVaultCheckbox,
    setEncryptVaultCheckbox,
    showExportModal,
    setShowExportModal,
    showImportModal,
    setShowImportModal,
    importFileName,
    parsedVault,
    isEncryptedVault,
    rawEnvelope,
    importPassphrase,
    setImportPassphrase,
    importPassError,
    importValidation,
    isImporting,
    importResult,
    fileInputRef,
    handleExportVault,
    handleFilePicked,
    handleDecryptVault,
    handleExecuteImport,
  };
}
