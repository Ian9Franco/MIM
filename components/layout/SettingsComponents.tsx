import React from "react";
import { FolderSearch, Lock, AlertTriangle, KeyRound, Eye, EyeOff, RefreshCw, Check, MoveRight, Package, X, ChevronLeft, FolderOpen } from "lucide-react";

// ── SettingsTabNav ───────────────────────────────────────────────────────────

interface SettingsTabNavProps {
  activeTab: string;
  setActiveTab: (t: "paths" | "apiKeys") => void;
}

export function SettingsTabNav({ activeTab, setActiveTab }: SettingsTabNavProps) {
  return (
    <div className="flex border-b border-white/5 pb-2 mb-4 gap-2">
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
  placeholder?: string;
  desc?: string;
  link?: string;
  linkText?: string;
  badge?: string;
  color?: string;
}

export function ApiKeyInputGroup({ 
  label, value, onChange, show, onToggleShow, canEdit, isValid, isValidating, saving, 
  placeholder, desc, link, linkText, badge, color = "primary" 
}: ApiKeyInputGroupProps) {
  const colorClass = color === "emerald" ? "text-emerald-400" : color === "blue" ? "text-blue-400" : "text-primary";
  const bgClass = color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20" : color === "blue" ? "bg-blue-500/10 border-blue-500/20" : "bg-primary/10 border-primary/20";
  const borderClass = color === "emerald" ? "border-emerald-500/20 focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.08)]" : color === "blue" ? "border-blue-500/20 focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.08)]" : "border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(217,119,87,0.15)]";

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
          placeholder={placeholder}
          disabled={saving || !canEdit}
        />
        <div className="absolute right-12 flex items-center gap-2">
          {isValidating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted/40" />}
          {!isValidating && value && isValid === false && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          {!isValidating && value && isValid === true && <Check className="w-3.5 h-3.5 text-[#66C8A0]" />}
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
