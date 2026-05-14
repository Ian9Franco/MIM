import React from "react";
import { 
  Zap, Keyboard, Package, History, GripVertical, ChevronRight, X, Download, RefreshCw, Cpu
} from "lucide-react";

// ── TweakTabNav ─────────────────────────────────────────────────────────────

interface TweakTabNavProps {
  activeTab: string;
  setActiveTab: (t: any) => void;
}

export function TweakTabNav({ activeTab, setActiveTab }: TweakTabNavProps) {
  const tabs = [
    { id: "optimize", icon: Zap, label: "Optimizar" },
    { id: "keybinds", icon: Keyboard, label: "Teclas" },
    { id: "resourcepacks", icon: Package, label: "Packs" },
    { id: "profiles", icon: History, label: "Perfiles" },
  ];

  return (
    <div className="flex px-4 pt-2 border-b border-white/5 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`flex-1 flex flex-col items-center py-3 px-1 rounded-t-xl transition-all duration-300 ease-out relative hover:scale-105 active:scale-95 ${
            activeTab === tab.id ? "text-primary bg-white/5" : "text-muted hover:text-white hover:bg-white/5"
          }`}
        >
          <tab.icon className={`w-5 h-5 mb-1 transition-all duration-300 ${activeTab === tab.id ? "animate-pulse scale-110" : "group-hover:scale-110"}`} />
          <span className="text-[10px] font-label uppercase tracking-tighter transition-all duration-300">{tab.label}</span>
          {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left-2 duration-300" />}
        </button>
      ))}
    </div>
  );
}

// ── KeybindItem ─────────────────────────────────────────────────────────────

interface KeybindItemProps {
  kb: any;
  listeningKey: string | null;
  setListeningKey: (id: string | null) => void;
}

export function KeybindItem({ kb, listeningKey, setListeningKey }: KeybindItemProps) {
  const isListening = listeningKey === kb.id;
  return (
    <div className="p-3 flex items-center justify-between group hover:bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] transition-all">
      <span className="text-sm text-[var(--color-foreground)] opacity-90 font-body font-medium">{kb.name}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setListeningKey(kb.id)}
          className={`px-2 py-1 rounded-lg border text-[10px] font-label uppercase min-w-15 text-center transition-all duration-200 ease-out hover:scale-105 active:scale-95 ${
            isListening 
              ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white animate-pulse scale-110" 
              : "bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] border-[var(--color-border)] text-[var(--color-foreground)] group-hover:border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
          }`}
        >
          {isListening ? "???" : kb.key.replace("key.keyboard.", "").replace("key.mouse.", "M").toUpperCase()}
        </button>
      </div>
    </div>
  );
}

// ── ResourcePackItem ────────────────────────────────────────────────────────

interface ResourcePackItemProps {
  pack: string;
  idx: number;
  reverseIdx: number;
  total: number;
  draggedIdx: number | null;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  onMove: (idx: number, dir: "up" | "down") => void;
  onToggle: (p: string, add: boolean) => void;
  warning?: string | null;
}

export function ResourcePackItem({
  pack, idx, reverseIdx, total, draggedIdx,
  onDragStart, onDragOver, onDrop, onDragEnd, onMove, onToggle, warning
}: ResourcePackItemProps) {
  return (
    <div className="space-y-1">
      <div 
        draggable
        onDragStart={(e) => onDragStart(e, reverseIdx)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, reverseIdx)}
        onDragEnd={onDragEnd}
        className={`flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-2xl group animate-in slide-in-from-right-4 cursor-move transition-all ${draggedIdx === reverseIdx ? "opacity-50" : ""}`}
      >
        <div className="text-muted/50 group-hover:text-primary transition-colors"><GripVertical className="w-4 h-4" /></div>
        <div className="flex flex-col gap-1">
          <button onClick={() => onMove(idx, "up")} disabled={idx === total - 1} className="p-0.5 text-muted hover:text-primary disabled:opacity-0 transition-all"><ChevronRight className="w-3 h-3 -rotate-90" /></button>
          <button onClick={() => onMove(idx, "down")} disabled={idx === 0} className="p-0.5 text-muted hover:text-primary disabled:opacity-0 transition-all"><ChevronRight className="w-3 h-3 rotate-90" /></button>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><span className="text-xs font-bold text-primary/70">{total - reverseIdx}</span></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--color-foreground)] font-bold truncate">{pack.replace("file/", "").replace(/\.zip$/, "")}</p>
          {reverseIdx === 0 && <span className="text-[9px] text-primary font-bold uppercase tracking-widest opacity-80">Prioridad Máxima</span>}
        </div>
        <button onClick={() => onToggle(pack, false)} className="p-2 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
      </div>
      {warning && <div className="mx-4 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 animate-pulse"><span className="text-[10px] text-red-400 font-medium">{warning}</span></div>}
    </div>
  );
}

// ── HardwareStats ───────────────────────────────────────────────────────────

export function HardwareStats({ data, ram }: { data: any, ram: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
        <p className="text-[10px] text-muted font-label uppercase">Perfil PC</p>
        <p className={`text-sm font-subhead uppercase font-bold ${data.hardwareProfile === 'low' ? 'text-red-500' : data.hardwareProfile === 'mid' ? 'text-amber-500' : 'text-emerald-500'}`}>{data.hardwareProfile || "Mid"}</p>
      </div>
      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
        <p className="text-[10px] text-muted font-label uppercase">RAM Total</p>
        <p className="text-sm font-subhead text-white font-bold">{data.totalRamGB || ram} GB</p>
      </div>
      <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
        <p className="text-[10px] text-muted font-label uppercase">CPU Cores</p>
        <p className="text-sm font-subhead text-white font-bold">{data.cpuCores || 8} Hilos</p>
      </div>
    </div>
  );
}
