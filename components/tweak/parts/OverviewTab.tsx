import React, { useState } from "react";
import { Keyboard, Package, History, Layers, Zap, Wand2, AlertTriangle, CheckCircle2, FolderOpen, XCircle, RefreshCw } from "lucide-react";

/**
 * @fileoverview Pestaña de Resumen de Ajustes del Juego (Tweak Overview).
 * ─────────────────────────────────────────────────────────────────────────────
 * Panel de control que resume las métricas de rendimiento y usabilidad del
 * modpack activo. Muestra un conteo de atajos, paquetes de recursos, snapshots
 * y recomendaciones inteligentes generadas por el motor de optimización.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function OverviewTab({ data, onAction, projectName, version }: any) {
  const [fixingPacks, setFixingPacks] = useState(false);

  /**
   * handleQuickFixPacks
   * Dispara el endpoint de autocorrección para ordenar los resource packs en options.txt
   */
  const handleQuickFixPacks = async () => {
    setFixingPacks(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, action: "autofix-packs" }),
      });
      if (res.ok) onAction();
    } finally {
      setFixingPacks(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Connection Banner ──────────────────────────────────────────────── */}
      <ConnectionBanner
        connected={data.optionsExists}
        path={data.minecraftPathUsed}
        onRefresh={onAction}
      />

      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-1">Centro de Control Tweak</h3>
        <p className="text-[10px] opacity-60 leading-relaxed font-medium">
          MIM actúa como un puente entre tu pack y Minecraft. Aquí puedes ajustar teclas, packs de recursos y configuraciones de video sin abrir el juego. Los cambios se sincronizan automáticamente con tu instalación real.
        </p>
      </div>

      {/* Grid de Métricas Clave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Keyboard />} 
          label="Controles" 
          value={data.keybinds.length} 
          warning={data.keybindConflicts?.length > 0} 
          warningText={`${data.keybindConflicts?.length} conflictos detectados`} 
          desc="Teclas asignadas en el juego"
        />
        <StatCard 
          icon={<Package />} 
          label="Texturas" 
          value={data.resourcePacks.active.length} 
          warning={data.resourcePacks.issues?.length > 0} 
          warningText={`${data.resourcePacks.issues?.length} problemas de orden`} 
          desc="Packs activos en options.txt"
        />
        <StatCard 
          icon={<History />} 
          label="Snapshots" 
          value={data.snapshots.length} 
          desc="Puntos de restauración"
        />
        <StatCard 
          icon={<Layers />} 
          label="Integración" 
          value={data.modCount ?? data.globalModCount ?? 0} 
          desc="Mods detectados en el sistema"
        />
      </div>

      {/* Panel Dinámico de Recomendaciones de Optimización */}
      {data.recommendations?.length > 0 && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 animate-bounce" /> Recomendaciones SAGE
          </h3>
          <div className="space-y-2">
            {data.recommendations.map((rec: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${rec.impact === 'high' ? 'bg-rose-400 animate-pulse' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-xs opacity-60 mt-1 leading-relaxed">{rec.desc}</p>
                  
                  {/* Botón de Acción Directa para Auto-Fix */}
                  {rec.action === "fix-packs" && (
                    <button 
                      onClick={handleQuickFixPacks} 
                      disabled={fixingPacks} 
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:scale-105 transition-all shadow"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> {fixingPacks ? "Corrigiendo..." : "Auto-corregir Pack Order"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de Configuración de Video (options.txt) */}
      {data.optionsExists && data.settings && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          <h3 className="text-sm font-semibold mb-3">Configuración de Video (options.txt)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <SettingItem label="Render Distance" value={data.settings.renderDistance ? `${data.settings.renderDistance} chunks` : "?"} />
            <SettingItem label="FOV" value={data.settings.fov || "?"} />
            <SettingItem label="Gamma" value={data.settings.gamma || "?"} />
            <SettingItem label="VSync" value={data.settings.enableVsync === "true" ? "ON" : data.settings.enableVsync === "false" ? "OFF" : "?"} />
            <SettingItem label="Sombras" value={data.settings.entityShadows === "true" ? "ON" : data.settings.entityShadows === "false" ? "OFF" : "?"} />
            <SettingItem label="Mipmaps" value={data.settings.mipmapLevels || "?"} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * StatCard: Tarjeta atómica para métricas numéricas y advertencias.
 */
function StatCard({ icon, label, value, warning, warningText, desc }: any) {
  return (
    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow hover:translate-y-[-2px] transition-transform flex flex-col h-full font-sans">
      <div className="flex items-center gap-2 text-[var(--color-muted)] mb-2">
        {React.cloneElement(icon, { className: "w-4 h-4 text-primary" })}
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[9px] opacity-40 font-bold uppercase mt-1 mb-2">{desc}</p>
      {warning && (
        <p className="text-[10px] text-rose-400 mt-auto flex items-center gap-1 font-bold uppercase animate-pulse">
          <AlertTriangle className="w-3 h-3" /> {warningText}
        </p>
      )}
    </div>
  );
}

/**
 * SettingItem: Fila de metadato de configuración.
 */
function SettingItem({ label, value }: any) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
      <span className="opacity-60">{label}</span>
      <span className="font-bold font-mono text-primary">{value}</span>
    </div>
  );
}

/**
 * ConnectionBanner: Muestra el estado de la conexión con el directorio de Minecraft.
 */
function ConnectionBanner({ connected, path, onRefresh }: { connected: boolean; path: string; onRefresh: () => void }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-500 ${
      connected 
        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400/90" 
        : "bg-amber-500/5 border-amber-500/20 text-amber-400/90"
    }`}>
      <div className="flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${connected ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
            {connected ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-widest">
                {connected ? "Conectado a Minecraft" : "Configuración no detectada"}
              </h4>
              <span className="text-[10px] opacity-40 font-bold px-1.5 py-0.5 rounded border border-current/20">
                OPTIONS.TXT
              </span>
            </div>
            <p className="text-[10px] opacity-60 font-mono mt-1 flex items-center gap-1 truncate max-w-[300px]">
              <FolderOpen className="w-3 h-3 shrink-0" /> {path || "Ruta no definida"}
            </p>
          </div>
        </div>

        <button 
          onClick={handleRefresh}
          className={`p-2 rounded-xl hover:bg-white/10 transition-all active:scale-90 ${isRefreshing ? "animate-spin" : ""}`}
          title="Refrescar conexión"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Decorative background element */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
    </div>
  );
}
