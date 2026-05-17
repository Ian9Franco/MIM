import React, { useState } from "react";
import { PackRule } from "../../app/api/tweak/lib/types";
import { 
  Zap, Keyboard, Package, History, Cpu, Copy, Check, Monitor, 
  GripVertical, Layers, Trash2, Info, FolderOpen, ExternalLink,
  Plus, CheckCircle2, ChevronRight
} from "lucide-react";

// ── TweakTabNav ─────────────────────────────────────────────────────────────

export function TweakTabNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: any) => void }) {
  const tabs = [
    { id: "optimize", icon: Zap,      label: "Optimizar" },
    { id: "keybinds", icon: Keyboard, label: "Teclas" },
    { id: "resourcepacks", icon: Package, label: "Packs" },
    { id: "profiles",  icon: History,  label: "Perfiles" },
  ];
  return (
    <div className="flex px-6 pt-4 border-b shrink-0 gap-2 bg-white/[0.01]" style={{ borderColor: "var(--color-border)" }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 flex flex-col items-center py-3 px-1 rounded-t-2xl transition-all duration-300 relative text-[10px] font-black uppercase tracking-widest group ${
            activeTab === tab.id
              ? "text-primary bg-primary/10 shadow-[0_-4px_12px_rgba(var(--color-primary-rgb),0.1)]"
              : "text-muted/40 hover:text-white/60 hover:bg-white/[0.03]"
          }`}
        >
          <tab.icon className={`w-4 h-4 mb-1.5 transition-all duration-300 ${activeTab === tab.id ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]" : "opacity-50 group-hover:opacity-100"}`} />
          <span className="relative z-10">{tab.label}</span>
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]" />
          )}
        </button>
      ))}
    </div>
  );
}

// ── HardwareStats ────────────────────────────────────────────────────────────

export function HardwareStats({ data }: { data: any }) {
  const profile = data.hardwareProfile || "mid";
  const profileColors: Record<string, string> = {
    high: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30",
    mid: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30",
    low: "from-red-500/20 to-red-500/5 text-red-400 border-red-500/30"
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className={`col-span-3 p-4 rounded-3xl bg-gradient-to-br border ${profileColors[profile]} flex items-center justify-between overflow-hidden relative group`}>
        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
          <Cpu className="w-32 h-32" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Perfil de Potencia</p>
          <h4 className="text-xl font-black uppercase tracking-tighter italic">{profile} ENDORSED</h4>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold opacity-80">Rendimiento Estimado</p>
          <div className="flex gap-1 mt-1 justify-end">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`w-1.5 h-3 rounded-full ${i <= (profile === 'high' ? 5 : profile === 'mid' ? 3 : 2) ? 'bg-current' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1 hover:bg-white/[0.05] transition-colors group">
        <p className="text-[8px] uppercase text-muted/40 font-black tracking-widest flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors" /> Memoria
        </p>
        <p className="text-xl font-black text-white leading-none tracking-tight">{data.totalRamGB || "?"}<span className="text-[10px] text-muted/40 font-bold ml-1">GB</span></p>
      </div>
      
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1 hover:bg-white/[0.05] transition-colors group">
        <p className="text-[8px] uppercase text-muted/40 font-black tracking-widest flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors" /> Procesador
        </p>
        <p className="text-xl font-black text-white leading-none tracking-tight">{data.cpuCores || "?"}<span className="text-[10px] text-muted/40 font-bold ml-1">HILOS</span></p>
      </div>

      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1 hover:bg-white/[0.05] transition-colors group overflow-hidden">
        <p className="text-[8px] uppercase text-muted/40 font-black tracking-widest flex items-center gap-1.5">
          <Monitor className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors" /> Gráficos
        </p>
        <p className="text-[10px] font-black text-white/80 leading-tight uppercase truncate" title={data.gpu}>
          {data.gpu || "DETECT..."}
        </p>
      </div>
    </div>
  );
}

// ── JvmArgBox ────────────────────────────────────────────────────────────────

export function JvmArgBox({ jvmArgs, modCount }: { jvmArgs?: string; modCount?: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!jvmArgs) return;
    navigator.clipboard.writeText(jvmArgs).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!jvmArgs) return null;

  return (
    <div className="p-5 rounded-3xl bg-indigo-500/[0.03] border border-indigo-500/10 space-y-3 relative group overflow-hidden">
      <div className="absolute top-0 right-0 p-8 bg-indigo-500/5 rounded-full -mr-4 -mt-4 blur-3xl group-hover:bg-indigo-500/10 transition-all" />
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Argumentos JVM MIM-Optimized</p>
          </div>
          {modCount !== undefined && (
            <p className="text-[9px] text-muted/30 font-bold mt-1 tracking-wide uppercase">Sintonizado para {modCount} mods activos</p>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
            copied 
              ? "bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10" 
              : "bg-indigo-500 text-white shadow-indigo-500/20 hover:bg-indigo-400"
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado" : "Copiar Args"}
        </button>
      </div>
      <div className="relative group/code">
        <code className="block text-[11px] font-mono text-indigo-200/50 bg-black/40 border border-white/5 rounded-2xl p-4 leading-relaxed break-all transition-all group-hover/code:text-indigo-200/80">
          {jvmArgs}
        </code>
      </div>

      <div className="mt-4 text-xs text-muted/60 space-y-3 bg-black/20 p-5 rounded-2xl border border-white/5">
        <p className="mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">Beneficios de esta Optimización</span>
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
            <Zap className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white/90">Cero Tirones</p>
              <p className="text-xs text-muted/60 leading-normal">Limpia la memoria en micro-pausas sin congelar la pantalla.</p>
            </div>
          </div>
          
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
            <Layers className="w-6 h-6 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white/90">RAM Controlada</p>
              <p className="text-xs text-muted/60 leading-normal">Asigna el combustible justo para el juego sin ahogar a Windows.</p>
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
            <Cpu className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white/90">Trabajo en Equipo</p>
              <p className="text-xs text-muted/60 leading-normal">Usa varios hilos de tu procesador para acelerar el juego.</p>
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
            <Package className="w-6 h-6 text-rose-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white/90">Filtro Anti-Lags</p>
              <p className="text-xs text-muted/60 leading-normal">Bloquea comportamientos de mods que causan bajones de FPS.</p>
            </div>
          </div>
        </div>

        <p>
          <span className="font-bold text-white/80">¿Cómo usarlo en el Launcher Oficial?</span>
        </p>
        <ol className="list-decimal list-inside space-y-1.5 ml-1 text-muted/70">
          <li>Ve a la pestaña <span className="text-white/70 font-bold">Instalaciones</span> en el launcher.</li>
          <li>Pasa el ratón sobre tu versión (ej: Forge) y dale a los <span className="text-white/70 font-bold">tres puntos (...)</span> -&gt; <span className="text-white/70 font-bold">Editar</span>.</li>
          <li>Haz clic en <span className="text-white/70 font-bold">Más Opciones</span> abajo del todo.</li>
          <li>Borra lo que haya en <span className="text-white/70 font-bold">Argumentos JVM</span> y pega este código generado por MIM.</li>
        </ol>
      </div>
    </div>
  );
}

// ── DetectedInstallations ──────────────────────────────────────────────────

export function DetectedInstallations({ installations }: { installations?: any[] }) {
  if (!installations || installations.length === 0) return null;
  return (
    <div className="p-5 rounded-3xl bg-white/[0.01] border border-white/5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary/50" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">Instalaciones Detectadas (Launcher Oficial)</p>
      </div>
      <div className="space-y-2">
        {installations.map(inst => (
          <div key={inst.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 hover:bg-white/[0.02] transition-colors group">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{inst.name}</p>
              <p className="text-[9px] text-muted/40 font-mono truncate">{inst.lastVersionId}</p>
            </div>
            <div className="text-right ml-2">
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${inst.jvmArgs ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-muted/30'}`}>
                {inst.jvmArgs ? "Con Args" : "Default"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KeybindItem ──────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  "movement": { label: "Movimiento", bg: "bg-blue-500/10", text: "text-blue-400" },
  "attack":   { label: "Combate",    bg: "bg-rose-500/10", text: "text-rose-400" },
  "use":      { label: "Acción",     bg: "bg-emerald-500/10", text: "text-emerald-400" },
  "inventory":{ label: "Gestión",    bg: "bg-amber-500/10", text: "text-amber-400" },
  "misc":     { label: "Sistema",    bg: "bg-white/5", text: "text-muted/60" },
};

function formatKeyDisplay(raw: string): string {
  if (!raw) return "—";
  return raw
    .replace("key.keyboard.", "")
    .replace("key.mouse.left", "L-CLICK")
    .replace("key.mouse.right", "R-CLICK")
    .replace("key.mouse.middle", "M-CLICK")
    .replace("key.mouse.", "M-")
    .replace("key.keyboard.none", "NONE")
    .replace("unknown", "NONE")
    .replace(".", " ")
    .toUpperCase();
}

export function KeybindItem({ kb, listeningKey, setListeningKey }: { kb: any; listeningKey: string | null; setListeningKey: (id: string | null) => void }) {
  const isListening = listeningKey === kb.id;
  const style = CATEGORY_STYLES[kb.category] || CATEGORY_STYLES["misc"];
  const isEmpty = kb.key === "key.keyboard.none" || kb.key === "unknown";

  const cleanName = kb.name
    .replace(/^key\./, "")
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .toUpperCase();

  return (
    <div className={`flex items-center gap-4 px-6 py-4 transition-all relative overflow-hidden group ${isListening ? "bg-primary/[0.08]" : "hover:bg-white/[0.02]"}`}>
      {isListening && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_var(--color-primary)]" />}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${style.bg} ${style.text} tracking-widest`}>
            {style.label}
          </span>
          {kb.modSource && kb.modSource !== "vanilla" && (
            <span className="text-[7px] text-muted/30 font-bold uppercase tracking-tighter">[{kb.modSource}]</span>
          )}
        </div>
        <p className="text-xs font-black text-white/90 tracking-tight truncate group-hover:text-white transition-colors uppercase italic">{cleanName}</p>
      </div>

      <button
        onClick={() => setListeningKey(isListening ? null : kb.id)}
        className={`relative shrink-0 min-w-[70px] h-10 px-3 flex items-center justify-center rounded-xl border-2 font-mono text-[11px] font-black uppercase transition-all duration-300 active:scale-90 shadow-lg ${
          isListening
            ? "bg-primary border-primary text-white shadow-primary/40 animate-pulse"
            : isEmpty
            ? "bg-black/20 border-white/5 text-muted/20 hover:border-primary/40 hover:text-muted/40"
            : "bg-white/[0.03] border-white/10 text-white/80 group-hover:border-primary/40 group-hover:text-primary group-hover:bg-primary/5 shadow-black/20"
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-white/10 rounded-full mx-2 mt-1" />
        {isListening ? "LISTENING" : formatKeyDisplay(kb.key)}
      </button>
    </div>
  );
}

// ── ResourcePackItem ────────────────────────────────────────────────────────

export function ResourcePackItem({ 
  pack, uiIdx, isPriority, isDragged, warnings = [], onDragStart, onDrop, onToggle 
}: { 
  pack: string; 
  uiIdx: number; 
  isPriority: boolean; 
  isDragged: boolean;
  warnings?: PackRule[];
  onDragStart: () => void;
  onDrop: () => void;
  onToggle: (p: string) => void;
}) {
  const name = pack.replace("file/", "").replace(".zip", "");
  
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
      className={`group relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-500 cursor-grab active:cursor-grabbing animate-in fade-in slide-in-from-left-4 ${
        isDragged 
          ? "opacity-20 scale-95 grayscale border-primary/20" 
          : isPriority
          ? "bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent border-emerald-500/40 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.25)]"
          : "bg-white/[0.02] border-white/5 hover:border-primary/20 hover:bg-white/[0.04] hover:shadow-xl hover:shadow-black/20"
      }`}
    >
      {/* 1. LEFT: Priority Index */}
      <div className="flex flex-col items-center gap-1 shrink-0 relative">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border-2 transition-all duration-500 ${
          isPriority 
            ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]" 
            : "bg-black/40 text-muted/30 border-white/5 group-hover:border-primary/40 group-hover:text-primary/60"
        }`}>
          {isPriority ? "★" : uiIdx + 1}
        </div>
        {!isPriority && <GripVertical className="w-3 h-3 text-muted/10 group-hover:text-primary/40 transition-colors" />}
        {isPriority && <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full -z-10 animate-pulse" />}
      </div>

      {/* 2. CENTER: Info Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg transition-colors ${
            isPriority ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-muted/30 border border-white/5 group-hover:text-primary/40 group-hover:border-primary/10"
          }`}>
            {isPriority ? "Prioridad Alta" : `Capa ${uiIdx + 1}`}
          </span>
          <div className={`h-px flex-1 transition-all duration-500 ${isPriority ? "bg-emerald-500/10" : "bg-white/[0.02] group-hover:bg-primary/5"}`} />
        </div>
        
        <p className={`text-xs font-black tracking-tight truncate transition-all duration-300 uppercase italic ${
          isPriority ? "text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "text-white/80 group-hover:text-white"
        }`}>
          {name}
        </p>

        {/* Warnings & Explanations */}
        {warnings.length > 0 && (
          <div className="mt-1 space-y-1">
            {warnings.map((w, idx) => (
              <div key={idx} className={`text-[9px] flex flex-col gap-0.5 p-1.5 rounded-lg border ${
                w.severity === "critical" 
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                  : w.severity === "warning"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {w.severity === "critical" ? "⚠️" : "ℹ️"} {w.message}
                </div>
                {w.explanation && (
                  <p className="text-[8px] opacity-70 font-medium ml-4">
                    {w.explanation}
                  </p>
                )}
                {w.confidence && (
                  <div className="flex items-center gap-1 mt-0.5 ml-4">
                    <span className="text-[7px] uppercase font-black opacity-40">Confianza:</span>
                    <span className={`text-[7px] uppercase font-black ${
                      w.confidence === "high" ? "text-emerald-400" : w.confidence === "medium" ? "text-amber-400" : "text-rose-400"
                    }`}>
                      {w.confidence}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. RIGHT: Actions */}
      <div className="flex items-center gap-2 shrink-0 border-l border-white/[0.03] pl-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(pack); }}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-500/5 text-rose-500/30 hover:bg-rose-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-lg border border-rose-500/10"
          title="Desactivar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Side Indicator */}
      {isPriority && (
        <div className="absolute -left-1 top-3 bottom-3 w-1 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,1)]" />
      )}
    </div>
  );
}

// ── AvailablePackItem ────────────────────────────────────────────────────────

export function AvailablePackItem({ pack, onToggle }: { pack: string; onToggle: (p: string) => void }) {
  const name = pack.replace("file/", "").replace(".zip", "");
  
  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-primary/20 hover:bg-white/[0.03] group transition-all duration-300 animate-in fade-in slide-in-from-right-4"
    >
      <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center text-muted/20 text-[10px] font-black shrink-0 border border-white/5 group-hover:border-primary/20 group-hover:text-primary/40 transition-all">
        <Layers className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-muted/40 uppercase tracking-widest truncate group-hover:text-white/80 transition-colors">
          {name}
        </p>
      </div>

      <button
        onClick={() => onToggle(pack)}
        className="flex items-center gap-2 px-3 py-2 bg-primary/5 text-primary border border-primary/10 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white hover:shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)] active:scale-90"
      >
        <Plus className="w-3 h-3" />
        Activar
      </button>
    </div>
  );
}
