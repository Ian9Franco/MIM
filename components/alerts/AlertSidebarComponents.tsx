import React, { useState } from "react";
import { 
  X, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpCircle, 
  Shield, 
  Package, 
  RefreshCw, 
  FileWarning, 
  Info, 
  Loader2, 
  Globe, 
  ChevronDown, 
  ChevronUp,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  History,
  Activity,
  Search,
  Sparkles,
  Binary,
  TvMinimalPlay
} from "lucide-react";

// ── TabButton ────────────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  alert?: boolean;
}

export function TabButton({ active, onClick, icon, label, count, alert }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all min-w-[64px] ${alert ? "relative" : ""}`}
      style={{
        background: active ? "var(--color-hover)" : "transparent",
        color: active ? "var(--color-foreground)" : "var(--color-muted)",
      }}
    >
      <span className="shrink-0" style={{ color: active ? "var(--color-primary)" : "inherit" }}>{icon}</span>
      <span className="text-[0.65rem] leading-tight truncate w-full px-1">{label}</span>
      {count > 0 && (
        <span 
          className="text-[0.55rem] px-1.5 py-0 rounded-full shrink-0"
          style={{ 
            background: alert ? "var(--color-danger-bg)" : "var(--color-secondary-bg)",
            color: alert ? "var(--color-danger)" : "var(--color-muted)",
          }}
        >
          {count}
        </span>
      )}
      {alert && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
    </button>
  );
}

// ── AlertSection ─────────────────────────────────────────────────────────────

interface AlertSectionProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export function AlertSection({ icon, title, count, color, children, defaultOpen = true }: AlertSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-[var(--color-border)] rounded-2xl overflow-hidden transition-all duration-300" style={{ background: "var(--color-card)" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3.5 text-left transition-colors hover:bg-[var(--color-hover)]"
      >
        <span style={{ color }}>{icon}</span>
        <h3 className="text-xs font-headline tracking-wider uppercase font-bold" style={{ color }}>{title}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold ml-2 transition-all" style={{ background: "rgba(255, 255, 255, 0.08)", color: "var(--color-foreground)" }}>
          {count}
        </span>
        <ChevronDown 
          className="w-4 h-4 ml-auto transition-transform duration-300 opacity-60" 
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color }}
        />
      </button>
      {isOpen && <div className="p-3.5 border-t border-[var(--color-border)] flex flex-col gap-3 animate-fade-in bg-[var(--color-secondary-bg)]">{children}</div>}
    </div>
  );
}

// ── ActionButton ─────────────────────────────────────────────────────────────

interface ActionButtonProps {
  primary?: boolean;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  small?: boolean;
}

export function ActionButton({ primary, danger, onClick, disabled, icon, label, small }: ActionButtonProps) {
  const style = primary && danger 
    ? { bg: "var(--color-danger-bg)", color: "var(--color-danger)", hover: "var(--color-danger-hover)" }
    : primary 
      ? { bg: "var(--color-accent-bg)", color: "var(--color-accent)", hover: "var(--color-accent-hover)" }
      : { bg: "var(--color-secondary-bg)", color: "var(--color-muted)", hover: "var(--color-hover)" };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${small ? 'py-1 px-2 text-[10px]' : 'py-2 px-3 text-xs'} flex-1 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5`}
      style={{ background: style.bg, color: style.color }}
      onMouseEnter={(e) => (e.currentTarget.style.background = style.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = style.bg)}
    >
      {icon} {label}
    </button>
  );
}

// ── UpdateCard ───────────────────────────────────────────────────────────────

interface UpdateCardProps {
  path: string;
  s: any;
  type: "mod" | "collection" | "shader" | "resourcepack" | "showcase";
  library: any[];
  followedMods?: any[];
  downloadingMods: Record<string, boolean>;
  handleDownloadUpdate: (path: string, url: string, filename: string) => void;
  handleDismissUpdate: (path: string) => void;
  handleMarkSeen: (projectId: string, latestVersion: string) => void;
  setSidebarOpen: (o: boolean) => void;
}

export function UpdateCard({
  path, s, type, library, followedMods, downloadingMods,
  handleDownloadUpdate, handleDismissUpdate, handleMarkSeen, setSidebarOpen
}: UpdateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isCollection = type === "collection";
  const isNewVideo = s.isNewChannelVideo;
  const mod = isCollection && !isNewVideo ? null : library.find(l => l.path === path);
  const rawFilename = path.split(/[\\/]/).pop()?.replace(/\.(zip|jar)$/i, "") || "unknown";
  
  const displayName = s.title || s.slug || (isNewVideo ? "Nuevo Video" : (isCollection ? (s.isNewAuthorMod ? s.title : "Mod Seguido") : (["shader", "resourcepack"].includes(type) ? rawFilename : (mod?.meta?.modName || mod?.fileName))));
  const currentVersion = isCollection ? null : mod?.meta?.modVersion;

  let imageUrl = null;
  if (isNewVideo && s.thumbnail) imageUrl = s.thumbnail;
  else if (s.isNewAuthorMod && s.iconUrl) imageUrl = s.iconUrl;
  else if (isCollection && followedMods) {
    const fmod = followedMods.find(m => m.project_id === path.replace("collection:", ""));
    if (fmod && fmod.icon_url) imageUrl = fmod.icon_url;
  }

  return (
    <div className="p-3 rounded-xl border animate-fade-in transition-all duration-300 hover:border-[var(--color-border)]" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--color-secondary-bg)" }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : isNewVideo ? (
            <TvMinimalPlay className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
          ) : (
            <Package className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-subhead text-sm truncate max-w-[70%]" style={{ color: "var(--color-foreground)" }}>{displayName}</p>
            {isNewVideo && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold border border-blue-500/20 uppercase shrink-0 animate-pulse">Nuevo Video</span>}
            {s.isNewAuthorMod && <span className="px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-500 text-[9px] font-bold border border-pink-500/20 uppercase shrink-0 animate-pulse">Lanzamiento</span>}
            {isCollection && !s.isNewAuthorMod && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 uppercase shrink-0">Seguido</span>}
            {type === "shader" && <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[10px] font-bold border border-yellow-500/20 uppercase shrink-0">Shader</span>}
            {type === "resourcepack" && <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-500 text-[10px] font-bold border border-teal-500/20 uppercase shrink-0">Textura</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            {isNewVideo ? <span style={{ color: "var(--color-muted)" }}>Nuevo video en Showcase</span> : (s.isNewAuthorMod ? <span style={{ color: "var(--color-muted)" }}>de <span className="text-pink-400 font-bold">{s.author}</span> • v{s.latestVersion}</span> : (currentVersion && currentVersion !== "unknown" ? <><span style={{ color: "var(--color-muted)" }}>v{currentVersion}</span><span style={{ color: "var(--color-accent)" }}>→</span><span style={{ color: "var(--color-success)" }}>v{s.latestVersion}</span></> : <span style={{ color: "var(--color-success)" }}>Nuevo: v{s.latestVersion}</span>))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {isNewVideo ? (
          <><ActionButton primary onClick={() => {
            // Mark channel as read
            const unreadChannelsRaw = localStorage.getItem("mim_fomo_unread_channels");
            const unreadChannels: string[] = unreadChannelsRaw ? JSON.parse(unreadChannelsRaw) : [];
            const updated = unreadChannels.filter(ch => ch !== s.channelUrl);
            localStorage.setItem("mim_fomo_unread_channels", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("fomo-unread-channels-updated"));
            
            // Open video
            window.dispatchEvent(new CustomEvent("fomo-play-video", { detail: { videoId: s.videoId } }));
            setSidebarOpen(false);
          }} icon={<TvMinimalPlay className="w-3.5 h-3.5" />} label="Reproducir" /><ActionButton onClick={() => handleDismissUpdate(path)} label="Descartar" /></>
        ) : (s.isNewAuthorMod ? (
          <ActionButton primary onClick={() => {
            // Mark author as read
            const unreadAuthorsRaw = localStorage.getItem("mim_fomo_unread_authors");
            const unreadAuthors: string[] = unreadAuthorsRaw ? JSON.parse(unreadAuthorsRaw) : [];
            const updated = unreadAuthors.filter(a => a !== s.author);
            localStorage.setItem("mim_fomo_unread_authors", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("fomo-unread-authors-updated"));
            
            // Open FOMO details
            const modHit = { projectId: path.replace("author-new-mod:", ""), title: s.title, slug: s.slug || "", author: s.author, description: s.description || "", iconUrl: s.iconUrl, url: `https://modrinth.com/mod/${s.slug}`, downloads: 0, follows: 0, _source: "modrinth", projectType: "mod" };
            window.dispatchEvent(new CustomEvent("fomo-toggle", { detail: true }));
            setTimeout(() => window.dispatchEvent(new CustomEvent("fomo-open-details", { detail: modHit })), 400);
            setSidebarOpen(false);
          }} icon={<Search className="w-3.5 h-3.5" />} label="Explorar (FOMO)" />
        ) : isCollection ? (
          <><ActionButton primary onClick={() => handleDownloadUpdate(path, s.downloadUrl!, `${s.slug || "mod"}-${s.latestVersion}.jar`)} disabled={downloadingMods[path]} icon={downloadingMods[path] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />} label={downloadingMods[path] ? "Descargando..." : "Descargar"} /><ActionButton onClick={() => handleMarkSeen(path.replace("collection:", ""), s.latestVersion!)} label="Visto" /></>
        ) : (
          <><ActionButton primary onClick={() => {
            let fn = path.split(/[\\/]/).pop() || "";
            if (type === "mod" && mod?.meta?.modVersion) fn = mod.fileName.replace(mod.meta.modVersion, s.latestVersion!);
            else { const ext = fn.substring(fn.lastIndexOf(".")); const base = fn.substring(0, fn.lastIndexOf(".")); fn = `${base}-${s.latestVersion}${ext}`; }
            handleDownloadUpdate(path, s.downloadUrl!, fn);
          }} disabled={downloadingMods[path]} icon={downloadingMods[path] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />} label={downloadingMods[path] ? "Descargando..." : (type === "mod" ? "Actualizar" : "Descargar")} /><ActionButton onClick={() => handleDismissUpdate(path)} label="Ignorar" /></>
        ))}
        <div className="w-full flex gap-2 mt-1">
          {!isNewVideo && !s.isNewAuthorMod && <ActionButton onClick={() => window.open(s.isNewAuthorMod ? `https://modrinth.com/mod/${s.slug}` : `https://modrinth.com/mod/${s.slug || s.projectId}`, "_blank")} icon={<Globe className="w-3.5 h-3.5" />} label="Web" small />}
          {!s.isNewAuthorMod && !isNewVideo && <ActionButton onClick={() => setExpanded(!expanded)} icon={expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} label="Más Info" small />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5 animate-fade-in">
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-2">Registro de cambios:</p>
          <div className="text-xs max-h-40 overflow-y-auto custom-scrollbar font-sans leading-relaxed whitespace-pre-wrap pr-2" style={{ color: "var(--color-muted)" }}>{s.changelog || "Sin detalles disponibles."}</div>
        </div>
      )}
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, desc, color }: { icon: any, title: string, desc: string, color?: string }) {
  return (
    <div className="text-center py-12 flex flex-col items-center justify-center min-h-[300px]">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110" style={{ background: color ? `${color}1f` : "var(--color-success-bg)", border: `1px solid ${color ? color + '33' : 'var(--color-success-border)'}` }}>
        <Icon className="w-8 h-8" style={{ color: color || "var(--color-success)" }} />
      </div>
      <p className="font-headline text-base font-bold" style={{ color: "var(--color-foreground)" }}>{title}</p>
      <p className="text-sm mt-1 px-6 leading-relaxed" style={{ color: "var(--color-muted)" }}>{desc}</p>
    </div>
  );
}

// ── IncidentCard ──────────────────────────────────────────────────────────────

interface IncidentCardProps {
  inc: any;
  onResolve: (id: string) => void;
  onViewSage: () => void;
}

export function IncidentCard({ inc, onResolve, onViewSage }: IncidentCardProps) {
  return (
    <div className="p-3.5 rounded-2xl border animate-fade-in relative group" style={{ borderColor: inc.severity === "danger" ? "rgba(239,68,68,0.3)" : "rgba(167,139,250,0.3)", background: "var(--color-card)" }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: inc.severity === "danger" ? "rgba(239,68,68,0.1)" : "rgba(167,139,250,0.1)" }}>
          {inc.severity === "danger" ? <ShieldX className="w-4 h-4 text-red-600" /> : <ShieldAlert className="w-4 h-4 text-purple-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-headline text-xs font-bold ${inc.severity === "danger" ? 'text-red-600' : 'text-purple-600'}`}>{inc.title}</p>
            <span className="text-[8px] opacity-50">{new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className="text-[10px] mt-1 text-[var(--color-foreground)] opacity-80">{inc.detail}</p>
          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionButton small onClick={() => onResolve(inc.id)} icon={<CheckCircle className="w-3 h-3 text-emerald-400" />} label="Resolver" />
            {inc.module === "SAGE" && <ActionButton small onClick={onViewSage} label="Ver SAGE" />}
          </div>
        </div>
      </div>
    </div>
  );
}
