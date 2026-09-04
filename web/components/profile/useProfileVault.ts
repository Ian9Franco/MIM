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
} from "../../lib/vault/vaultEngine";
import { importVaultToSupabase, type VaultImportResult } from "../../lib/vault/vaultImporter";
import { playFomoSound } from "../../lib/sounds";

interface UseProfileVaultParams {
  session: any;
  profile: any;
  username: string;
  userDrafts: any[];
  userFavorites: any[];
  userFollowedAuthors: any[];
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
