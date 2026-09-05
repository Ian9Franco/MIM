import React, { useState, useRef } from "react";
import { FolderSearch, Lock, AlertTriangle, KeyRound, Eye, EyeOff, RefreshCw, Check, MoveRight, Package, X, ChevronLeft, FolderOpen, Wrench, Shield, Download, Upload, FileCheck, Loader2 } from "lucide-react";
import { createVault, verifyVault, encryptVault, decryptVault, generateVaultFilename, type VaultData, type MimVaultSchema } from "@/lib/vault/vaultEngine";

// ── SettingsTabNav ───────────────────────────────────────────────────────────

interface SettingsTabNavProps {
  activeTab: string;
  setActiveTab: (t: "paths" | "apiKeys" | "tools" | "vault") => void;
}

export function SettingsTabNav({ activeTab, setActiveTab }: SettingsTabNavProps) {
  return (
    <div className="flex border-b border-white/5 pb-2 mb-4 gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => setActiveTab("paths")}
        className={`pb-2.5 px-4 text-xs font-headline tracking-wider border-b-2 transition-all flex items-center gap-2 ${
          activeTab === "paths"
            ? "border-primary text-primary font-bold"
            : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        <FolderOpen className="w-3.5 h-3.5" />
        RUTAS DEL SISTEMA
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("apiKeys")}
        className={`pb-2.5 px-4 text-xs font-headline tracking-wider border-b-2 transition-all flex items-center gap-2 ${
          activeTab === "apiKeys"
            ? "border-primary text-primary font-bold"
            : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        <KeyRound className="w-3.5 h-3.5" />
        CONECTIVIDAD (KEYS)
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("tools")}
        className={`pb-2.5 px-4 text-xs font-headline tracking-wider border-b-2 transition-all flex items-center gap-2 ${
          activeTab === "tools"
            ? "border-primary text-primary font-bold"
            : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        <Wrench className="w-3.5 h-3.5" />
        HERRAMIENTAS
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("vault")}
        className={`pb-2.5 px-4 text-xs font-headline tracking-wider border-b-2 transition-all flex items-center gap-2 ${
          activeTab === "vault"
            ? "border-emerald-400 text-emerald-400 font-bold"
            : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        <Shield className="w-3.5 h-3.5" />
        BÓVEDA SOBERANA
      </button>
    </div>
  );
}

// ── PathInputGroup ───────────────────────────────────────────────────────────

interface PathInputGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick: () => void;
  canEdit: boolean;
  isValid: boolean | null;
  saving: boolean;
  configured?: boolean;
  placeholder?: string;
  desc?: string;
}

export function PathInputGroup({ label, value, onChange, onPick, canEdit, isValid, saving, placeholder, desc }: PathInputGroupProps) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <label className="font-label text-muted text-[0.65rem] tracking-wider uppercase">
          {label}
        </label>
        {!canEdit && (
          <span className="font-caption text-[10px] text-foreground/30 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Solo lectura
          </span>
        )}
      </div>
      <div className="relative flex items-center gap-3">
        <div className="relative flex-1 flex items-center">
          <FolderSearch className={`w-4 h-4 absolute left-3 pointer-events-none transition-colors duration-300 ${canEdit ? "text-primary" : "text-muted/40"}`} />
          <input 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            className={`input-base w-full pr-4 text-sm font-mono transition-all duration-300 ${
              canEdit 
                ? `text-foreground bg-white/4 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)] ${isValid === false ? "border-red-500/50 bg-red-500/5" : ""}` 
                : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
            }`} 
            style={{ paddingLeft: "2.5rem" }}
            disabled={saving || !canEdit}
            placeholder={placeholder}
          />
          {isValid === false && (
            <div className="absolute right-3 text-red-500 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
        </div>
        <button 
          onClick={onPick}
          disabled={saving || !canEdit}
          className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-subhead transition-all duration-300 border ${
            canEdit
              ? "border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
              : "border-white/5 text-foreground/20 bg-white/1 cursor-not-allowed"
          }`}
        >
          Examinar
        </button>
      </div>
      {desc && <p className="mt-2 text-[10px] text-muted leading-relaxed">{desc}</p>}
    </div>
  );
}

// ── ApiKeyInputGroup ─────────────────────────────────────────────────────────

interface ApiKeyInputGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  canEdit: boolean;
  isValid: boolean | null;
  isValidating: boolean;
  saving: boolean;
  configured?: boolean;
  placeholder?: string;
  desc?: string;
  link?: string;
  linkText?: string;
  badge?: string;
  color?: string;
}

export function ApiKeyInputGroup({ 
  label, value, onChange, show, onToggleShow, canEdit, isValid, isValidating, saving, 
  placeholder, desc, link, linkText, badge, color = "primary", configured = false,
}: ApiKeyInputGroupProps) {
  const colorClass = color === "emerald" ? "text-emerald-400" : color === "blue" ? "text-blue-400" : color === "purple" ? "text-purple-400" : "text-primary";
  const bgClass = color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20" : color === "blue" ? "bg-blue-500/10 border-blue-500/20" : color === "purple" ? "bg-purple-500/10 border-purple-500/20" : "bg-primary/10 border-primary/20";
  const borderClass = color === "emerald" ? "border-emerald-500/20 focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.08)]" : color === "blue" ? "border-blue-500/20 focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.08)]" : color === "purple" ? "border-purple-500/20 focus:border-purple-400 focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)]";

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <label className="font-label text-muted text-[0.65rem] tracking-wider uppercase">
            {label}
          </label>
          {badge && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-subhead border ${bgClass} ${colorClass}`}>
              {badge}
            </span>
          )}
        </div>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className={`text-[10px] hover:underline font-subhead transition-all ${colorClass}`}>
            {linkText || "Obtener clave"} →
          </a>
        )}
      </div>
      <div className="relative flex items-center">
        <KeyRound className={`w-4 h-4 absolute left-3 transition-colors duration-300 ${canEdit ? colorClass : "text-muted/40"}`} />
        <input 
          type={show ? "text" : "password"}
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className={`input-base w-full pr-12 text-sm font-mono transition-all duration-300 ${
            canEdit 
              ? `text-foreground bg-white/4 ${borderClass} ${isValid === false && value ? "border-red-500/50" : ""}` 
              : "text-foreground/40 bg-white/1 border-white/5 cursor-not-allowed select-none"
          }`}
          style={{ paddingLeft: "2.5rem" }}
          placeholder={configured ? "Configurada • ingresá otra para reemplazarla" : placeholder}
          disabled={saving || !canEdit}
        />
        <div className="absolute right-12 flex items-center gap-2">
          {isValidating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted/40" />}
          {!isValidating && value && isValid === false && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          {!isValidating && (value || configured) && isValid === true && <Check className="w-3.5 h-3.5 text-[#66C8A0]" />}
        </div>
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 p-1.5 text-muted hover:text-foreground transition-colors"
          disabled={!canEdit}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {desc && <p className="mt-1.5 text-[10px] text-muted leading-relaxed">{desc}</p>}
    </div>
  );
}

// ── OverlayDialog ─────────────────────────────────────────────────────────────

interface OverlayDialogProps {
  icon: any;
  title: string;
  desc: string | React.ReactNode;
  primaryAction: { label: string; onClick: () => void; color?: string };
  secondaryAction?: { label: string; onClick: () => void };
  tertiaryAction?: { label: string; onClick: () => void };
}

export function OverlayDialog({ icon: Icon, title, desc, primaryAction, secondaryAction, tertiaryAction }: OverlayDialogProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl text-center space-y-5 animate-scale-in"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
      >
        <div className={`w-12 h-12 rounded-full border flex items-center justify-center mx-auto ${primaryAction.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-primary/10 border-primary/20 text-primary'}`}>
          <Icon className={`w-6 h-6 ${primaryAction.color === 'amber' ? 'animate-pulse' : 'animate-bounce'}`} />
        </div>
        <div>
          <h4 className="font-headline text-base text-foreground">{title}</h4>
          <div className="font-caption text-xs text-muted mt-1.5 leading-relaxed">
            {desc}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={primaryAction.onClick}
            className={`w-full py-2.5 rounded-xl font-subhead text-xs text-white hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg ${primaryAction.color === 'amber' ? 'bg-amber-500 shadow-amber-500/10' : 'bg-primary shadow-primary/10'}`}
          >
            {primaryAction.label}
          </button>
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="w-full py-2.5 rounded-xl font-subhead text-xs border text-foreground/80 hover:bg-hover transition-all"
              style={{ borderColor: "var(--color-border)" }}
            >
              {secondaryAction.label}
            </button>
          )}
          {tertiaryAction && (
            <button
              onClick={tertiaryAction.onClick}
              className="w-full py-2.5 rounded-xl font-subhead text-xs text-muted hover:text-foreground transition-all"
            >
              {tertiaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SettingsFooter ───────────────────────────────────────────────────────────

interface SettingsFooterProps {
  saving: boolean;
  moveProgress: string;
  isValidating: boolean;
  isValidatingKeys: boolean;
  activeTab: string;
  pathValidation: Record<string, boolean>;
  keyValidation: Record<string, boolean | null>;
  canEdit: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function SettingsFooter({ 
  saving, moveProgress, isValidating, isValidatingKeys, activeTab, 
  pathValidation, keyValidation, canEdit, onCancel, onSave 
}: SettingsFooterProps) {
  return (
    <div className="pt-6 border-t border-primary/10 flex items-center justify-between">
      <div className="text-[10px] font-label animate-fade-in flex items-center gap-2">
        {saving && moveProgress ? (
          <span className="flex items-center gap-2 text-accent">
            <MoveRight className="w-3.5 h-3.5" /> {moveProgress}
          </span>
        ) : (isValidating || isValidatingKeys) ? (
          <span className="flex items-center gap-2 text-muted">
            <RefreshCw className="w-3 h-3 animate-spin" /> Comprobando {activeTab === "paths" ? "rutas" : "conectividad"}...
          </span>
        ) : activeTab === "paths" ? (
          Object.values(pathValidation).every(v => v === true) ? (
            <span className="flex items-center gap-2 text-[#66C8A0]">
              <Check className="w-3 h-3" /> Todas las rutas son válidas
            </span>
          ) : (
            <span className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-3 h-3" /> Corregí las rutas en rojo
            </span>
          )
        ) : (
          (() => {
            const activeCount = Object.values(keyValidation).filter(v => v === true).length;
            const hasError = Object.values(keyValidation).some(v => v === false);
            const isComplete = activeCount === 3;
            if (hasError) return <span className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-3 h-3" /> Verificá las claves ingresadas</span>;
            if (activeCount > 0) return <span className="flex items-center gap-2 text-[#66C8A0]"><Check className="w-3 h-3" /> {activeCount === 1 ? "1 servicio activo" : `${activeCount} servicios activos`} {isComplete && "(Todo OK)"}</span>;
            return <span className="flex items-center gap-2 text-amber-400"><AlertTriangle className="w-3 h-3" /> Falta configurar claves</span>;
          })()
        )}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onCancel} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-subhead text-muted hover:text-foreground transition-all disabled:opacity-50">
          Cancelar
        </button>
        <button 
          onClick={onSave}
          disabled={saving || !canEdit}
          className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-subhead text-sm transition-all duration-300 shadow-lg ${
            canEdit ? "bg-primary text-background hover:opacity-90 shadow-primary/20 cursor-pointer" : "bg-white/5 text-foreground/30 border border-white/5 cursor-not-allowed shadow-none"
          }`}
        >
          <Check className="w-4 h-4" /> Guardar y Recargar
        </button>
      </div>
    </div>
  );
}

// ── YtDlpUpdaterCard ─────────────────────────────────────────────────────────

export function YtDlpUpdaterCard() {
  const [status, setStatus] = React.useState<"idle" | "checking" | "update-available" | "up-to-date" | "updating" | "error">("idle");
  const [versionInfo, setVersionInfo] = React.useState<{ current: string; latest: string } | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    checkUpdate();
  }, []);

  const checkUpdate = async () => {
    setStatus("checking");
    setErrorMsg("");
    try {
      const res = await fetch("/api/fomo/ytdlp-update");
      if (!res.ok) throw new Error("Error al verificar actualizaciones");
      const data = await res.json();
      setVersionInfo({ current: data.current, latest: data.latest });
      if (data.needsUpdate) {
        setStatus("update-available");
      } else {
        setStatus("up-to-date");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "No se pudo verificar la versión.");
    }
  };

  const handleUpdate = async () => {
    setStatus("updating");
    setErrorMsg("");
    try {
      const res = await fetch("/api/fomo/ytdlp-update", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setVersionInfo((prev) => prev ? { ...prev, current: data.newVersion } : null);
        setStatus("up-to-date");
      } else {
        throw new Error(data.error || "Update failed");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Fallo al actualizar el binario.");
    }
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <label className="font-label text-muted text-[0.65rem] tracking-wider uppercase">
          Gestor de yt-dlp
        </label>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-subhead border bg-primary/10 border-primary/20 text-primary">
          Showcase Engine
        </span>
      </div>
      
      <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-subhead text-foreground">yt-dlp Binary</h4>
            <p className="text-[11px] text-muted mt-0.5">
              Utilizado para obtener metadatos de YouTube para los Showcases.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {status === "checking" && <span className="text-[10px] text-muted flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Verificando...</span>}
            {status === "up-to-date" && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Actualizado</span>}
            {status === "error" && <span className="text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Error</span>}
            
            <button
              onClick={checkUpdate}
              disabled={status === "checking" || status === "updating"}
              className="p-2 rounded-lg border border-white/5 hover:bg-white/10 text-muted hover:text-foreground transition-all disabled:opacity-50"
              title="Volver a comprobar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === "checking" ? "animate-spin" : ""}`} />
            </button>
            
            {(status === "update-available" || status === "updating") && (
              <button
                onClick={handleUpdate}
                disabled={status === "updating"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-[11px] font-bold hover:bg-primary/30 transition-all disabled:opacity-50"
              >
                {status === "updating" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
                {status === "updating" ? "Actualizando..." : "Actualizar Binario"}
              </button>
            )}
          </div>
        </div>

        {(versionInfo || errorMsg) && (
          <div className="mt-1 pt-3 border-t border-white/5 flex flex-col gap-1.5">
            {versionInfo && (
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted">Versión local:</span>
                  <span className={versionInfo.current === "unknown" || versionInfo.current === "not-installed" ? "text-red-400" : "text-foreground"}>
                    {versionInfo.current}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted">Última versión:</span>
                  <span className="text-emerald-400">{versionInfo.latest}</span>
                </div>
              </div>
            )}
            {errorMsg && (
              <p className="text-[10px] text-red-400 font-mono mt-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-[10px] text-muted leading-relaxed">
        yt-dlp es gestionado de manera independiente al launcher. Actualizalo si notás que la carga de videos en YouTube Showcase falla frecuentemente.
      </p>
    </div>
  );
}

// ── SovereignVaultSettingsCard ───────────────────────────────────────────────

interface SovereignVaultSettingsCardProps {
  settingsData: any;
  onApplySettings?: (newSettings: any) => void;
}

export function SovereignVaultSettingsCard({ settingsData, onApplySettings }: SovereignVaultSettingsCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [encrypt, setEncrypt] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const vaultData: VaultData = {
        drafts: [],
        favorites: [],
        followedAuthors: [],
        followedMods: [],
        preferences: {
          downloadsPath: settingsData.downloadsPath,
          minecraftPath: settingsData.minecraftPath,
          stagingPath: settingsData.stagingPath,
          sourceBase: settingsData.sourceBase,
          buildsBase: settingsData.buildsBase,
          curseforgeApiKey: settingsData.curseforgeApiKey,
          modrinthApiKey: settingsData.modrinthApiKey,
          virusTotalApiKey: settingsData.virusTotalApiKey,
          geminiApiKey: settingsData.geminiApiKey,
        },
      };

      const baseVault = await createVault(vaultData, { username: "MIM Desktop User" }, {
        app: "MIM Desktop",
        version: "10.5.0",
      });

      let content: string;
      const isEncrypted = encrypt && passphrase.trim().length > 0;
      if (isEncrypted) {
        const envelope = await encryptVault(baseVault, passphrase.trim());
        content = JSON.stringify(envelope, null, 2);
      } else {
        content = JSON.stringify(baseVault, null, 2);
      }

      const filename = generateVaultFilename("desktop-backup", isEncrypted);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error exporting vault:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(null);
    setImportError(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      let vault: MimVaultSchema;
      if (json.isEncrypted) {
        if (!passphrase.trim()) {
          setImportError("Esta bóveda está cifrada. Ingresa la contraseña arriba antes de importar.");
          return;
        }
        vault = await decryptVault(json, passphrase.trim());
      } else {
        vault = json;
      }

      const verification = await verifyVault(vault);
      if (!verification.valid) {
        setImportError(verification.error || "Integridad fallida.");
        return;
      }

      if (vault.data?.preferences && onApplySettings) {
        onApplySettings(vault.data.preferences);
      }

      setImportStatus(`Bóveda verificada (SHA-256: ${vault.integrity.checksum.substring(0, 10)}...). Ajustes restaurados con éxito.`);
    } catch (err: any) {
      setImportError(err?.message || "Error al procesar el archivo .mimvault.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-emerald-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-emerald-400 font-headline font-bold text-sm">
          <Shield className="w-4 h-4" /> Bóveda Soberana (MIM Sovereign Vault)
        </div>
        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          SHA-256 Portable
        </span>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Exporta e importa tus rutas, preferencias y claves en un archivo portable <code className="text-emerald-400 font-mono text-[11px]">.mimvault</code> con verificación criptográfica SHA-256 e independiente de la nube.
      </p>

      <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={encrypt}
            onChange={(e) => setEncrypt(e.target.checked)}
            className="rounded accent-emerald-500"
          />
          <span>Cifrado Zero-Knowledge (AES-256-GCM)</span>
        </label>
        {encrypt && (
          <input
            type="password"
            placeholder="Contraseña de la bóveda..."
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full bg-white/5 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-emerald-400"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Exportar Bóveda
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground text-xs font-bold transition-all active:scale-95"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          Importar Bóveda
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFile}
          accept=".mimvault,.json"
          className="hidden"
        />
      </div>

      {importStatus && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <FileCheck className="w-4 h-4 shrink-0" /> {importStatus}
        </div>
      )}

      {importError && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {importError}
        </div>
      )}
    </div>
  );
}
