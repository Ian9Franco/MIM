import React from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { 
  Settings, RefreshCw, ChevronRight, Activity, Settings2, Bell, Package, Loader2, BookAlert, PackageOpen, BellRing, Puzzle, Layers, Glasses, Database, BookOpen 
} from "lucide-react";

interface LayoutHeaderProps {
  fomoOpen: boolean;
  onToggleFomo: (v: boolean) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenStaging: () => void;
  hasStagingFiles: boolean;
  stagingOpen: boolean;
  alertSidebarOpen: boolean;
  onToggleAlerts: (v: boolean) => void;
  hasAlerts: boolean;
  alertsSeen: boolean;
  sageOpen: boolean;
  onToggleSage: (v: boolean) => void;
  tweakOpen: boolean;
  onToggleTweak: (v: boolean) => void;
  packHealthOpen: boolean;
  onCheckHealth: () => void;
  activeProject: any;
  isValidatingHealth: boolean;
  watcherStatus?: string;
}

export function LayoutHeader({
  fomoOpen, onToggleFomo, isRefreshing, onRefresh, onOpenSettings, onOpenStaging,
  hasStagingFiles, stagingOpen, alertSidebarOpen, onToggleAlerts, hasAlerts, alertsSeen,
  sageOpen, onToggleSage, tweakOpen, onToggleTweak, packHealthOpen, onCheckHealth,
  activeProject, isValidatingHealth, watcherStatus
}: LayoutHeaderProps) {
  const [appMode, setAppMode] = React.useState<string>("MIMU");

  React.useEffect(() => {
    const saved = localStorage.getItem("mim_app_mode");
    if (saved) setAppMode(saved);
    
    // Escuchar cambios por si el usuario cambia de modo sin recargar
    const handleStorage = () => {
      const updated = localStorage.getItem("mim_app_mode");
      if (updated) setAppMode(updated);
    };
    
    const handleModeChange = (e: any) => {
      if (e.detail) setAppMode(e.detail);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("mim-mode-changed", handleModeChange as any);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("mim-mode-changed", handleModeChange as any);
    };
  }, []);

  return (
    <header className="sticky top-0 z-150 border-b border-primary/20 bg-background/80 backdrop-blur-xl">
      <div className="max-w-400 mx-auto px-6 py-4 flex items-center justify-between gap-6">
        
        {/* Left side: FOMO toggle + App Title */}
        <div className="flex items-center gap-6 animate-fade-up">
          <button
            data-header-toggle="true"
            onClick={() => onToggleFomo(!fomoOpen)}
            className="flex items-center gap-3 pl-2.5 pr-4 py-2 rounded-2xl transition-all duration-500 group/fomo relative overflow-hidden glass"
            style={{
              background: fomoOpen ? "rgba(187,150,228,0.15)" : "rgba(255,255,255,0.03)",
              borderColor: fomoOpen ? "rgba(187,150,228,0.4)" : "rgba(255,255,255,0.08)",
              color: fomoOpen ? "var(--color-primary)" : "var(--color-muted)",
              boxShadow: fomoOpen ? "0 8px 32px rgba(187,150,228,0.15)" : "none",
            }}
          >
            <div className="relative flex items-center justify-center">
              {!fomoOpen && (
                <>
                  <div className="absolute w-1 h-1 bg-primary/40 rounded-full animate-ender-particle" style={{ "--tw-translate-x": "-15px", "--tw-translate-y": "-15px", animationDelay: "0s" } as any} />
                  <div className="absolute w-1 h-1 bg-accent/40 rounded-full animate-ender-particle" style={{ "--tw-translate-x": "15px", "--tw-translate-y": "-10px", animationDelay: "0.5s" } as any} />
                </>
              )}
              <Image src="/fomoico.png" alt="" width={28} height={28} className={`w-7 h-7 object-contain transition-all duration-700 ${fomoOpen ? 'scale-110 brightness-110 rotate-12' : 'animate-fomo-blink'}`} />
              <div className={`absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-500 ${fomoOpen ? 'opacity-100' : 'opacity-0'}`} />
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className={`font-headline text-[11px] tracking-[0.15em] transition-colors duration-300 ${fomoOpen ? 'text-primary' : 'text-foreground/80'}`}>FOMO</span>
              <span className="text-[8px] opacity-30 font-bold tracking-[0.2em] uppercase">Descubrir</span>
            </div>
            <div className={`flex items-center justify-center w-5 h-5 rounded-full bg-white/5 border border-white/10 transition-all duration-500 ${fomoOpen ? 'rotate-180 bg-primary/10 border-primary/20' : 'rotate-180 group-hover/fomo:rotate-0 bg-white/5 border-white/10 group-hover/fomo:bg-primary/10 group-hover/fomo:border-primary/20'}`}>
              <ChevronRight className={`w-3 h-3 transition-colors ${fomoOpen ? 'text-primary' : 'text-foreground/40 group-hover/fomo:text-primary'}`} />
            </div>
          </button>

          <div className="flex flex-col relative group/title">
            <h1 className="relative font-headline text-2xl tracking-tighter leading-none flex items-center gap-3">
              <span className="flex items-center gap-3">
                <Image src="/icon.png" alt="MIM Logo" width={32} height={32} className="w-8 h-8 rounded-lg shadow-lg animate-slime" />
                <span key={appMode} className="bg-linear-to-br from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent animate-fade-in inline-block">
                  {appMode === "MIMU" ? "MIMu" : "MIM"}
                </span>
              </span>
              <div className="w-px h-4 bg-primary/30" />
              <span className="font-caption text-[10px] text-primary/80 uppercase tracking-[0.2em] font-medium hidden sm:inline-block translate-y-px">
                Intelligent <span className="text-foreground/40">Manager</span>
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-2.5 relative z-10">
              <span className="font-label text-[9px] text-accent/90 bg-accent/5 px-2.5 py-1 rounded-lg border border-accent/10">Beta</span>
              <span className="font-label text-[9px] text-[#66C8A0] bg-[#66C8A0]/5 px-2.5 py-1 rounded-lg border border-[#66C8A0]/10 flex items-center gap-2">
                {(() => {
                  const status = watcherStatus || "Watcher";
                  if (status.includes("Mods")) return <Puzzle className="w-3 h-3 text-[#66C8A0]" />;
                  if (status.includes("Texturas")) return <Layers className="w-3 h-3 text-[#66C8A0]" />;
                  if (status.includes("Shaders")) return <Glasses className="w-3 h-3 text-[#66C8A0]" />;
                  if (status.includes("Datapacks")) return <Database className="w-3 h-3 text-[#66C8A0]" />;
                  if (status.includes("Librería")) return <BookOpen className="w-3 h-3 text-[#66C8A0]" />;
                  return <span className="w-1 h-1 rounded-full bg-[#66C8A0] shadow-[0_0_8px_#66C8A0]" />;
                })()}
                {watcherStatus || "Watcher"}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Global controls */}
        <div className="flex items-center gap-3 animate-fade-up stagger-2">
          <HeaderButton onClick={onRefresh} title="Sincronizar con Disco" active={isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </HeaderButton>

          <HeaderButton onClick={onOpenSettings} title="Ajustes de Ubicaciones">
            <Settings className="w-4 h-4" />
          </HeaderButton>

          <HeaderButton 
            onClick={onOpenStaging} title="Archivos en Staging (Pendientes)" 
            active={hasStagingFiles || stagingOpen} color="amber" badge={hasStagingFiles}
          >
            {hasStagingFiles || stagingOpen ? <PackageOpen className="w-4 h-4 animate-bounce-subtle" /> : <Package className="w-4 h-4" />}
          </HeaderButton>

          <HeaderButton 
            onClick={() => onToggleAlerts(!alertSidebarOpen)} title="Centro de Alertas (ALRT)" 
            active={alertSidebarOpen} color="red" label="ALRT" 
            badge={hasAlerts && !alertsSeen} badgeColor="red"
            iconClass={alertSidebarOpen || (hasAlerts && !alertsSeen) ? 'animate-bell-ring' : ''}
          >
            {alertSidebarOpen || (hasAlerts && !alertsSeen) ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          </HeaderButton>

          <HeaderButton 
            onClick={() => onToggleSage(!sageOpen)} title="Análisis de Logs (SAGE)" 
            active={sageOpen} color="indigo" label="SAGE"
          >
            <Activity className="w-3.5 h-3.5" />
          </HeaderButton>

          <HeaderButton 
            onClick={() => onToggleTweak(!tweakOpen)} title="Optimización (TWEAK)" 
            active={tweakOpen} color="primary" label="TWEAK"
            iconClass={tweakOpen ? 'animate-spin-slow' : ''}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </HeaderButton>

          <HeaderButton 
            onClick={onCheckHealth} title="Estado del Pack (GATE)" 
            active={packHealthOpen} color="amber" label="GATE"
            disabled={!activeProject || isValidatingHealth}
          >
            {isValidatingHealth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookAlert className="w-3.5 h-3.5" />}
          </HeaderButton>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function HeaderButton({ 
  onClick, title, children, active, color = 'default', label, badge, badgeColor = 'amber', iconClass = '', disabled = false 
}: any) {
  const colors: any = {
    red: "bg-red-500/15 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]",
    indigo: "bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]",
    primary: "bg-primary/15 border-primary/40 text-primary shadow-[0_0_15px_rgba(187,150,228,0.25)]",
    amber: "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
    default: "hover:bg-white/5"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group h-9 flex items-center justify-center px-3 rounded-xl transition-all duration-300 relative border disabled:opacity-30 ${active ? colors[color] : colors.default}`}
      style={{ borderColor: active ? "" : "var(--color-border)", color: active ? "" : "var(--color-muted)" }}
      title={title}
    >
      <div className={`transition-all ${active ? 'scale-110' : ''} ${iconClass}`}>{children}</div>
      {label && <span className="ml-2 text-[10px] font-headline tracking-widest font-bold">{label}</span>}
      {badge && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badgeColor === 'red' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${badgeColor === 'red' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
        </span>
      )}
    </button>
  );
}
