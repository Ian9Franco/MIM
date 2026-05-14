import React, { useState } from "react";
import { Keyboard, Package, History, Layers, Zap, Wand2, AlertTriangle } from "lucide-react";

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
        body: JSON.stringify({ projectName, version, action: "fix-pack-order" }),
      });
      if (res.ok) onAction();
    } finally {
      setFixingPacks(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Grid de Métricas Clave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Keyboard />} 
          label="Keybinds" 
          value={data.keybinds.length} 
          warning={data.keybindConflicts.length > 0} 
          warningText={`${data.keybindConflicts.length} conflictos`} 
        />
        <StatCard 
          icon={<Package />} 
          label="Packs" 
          value={data.resourcePacks.active.length} 
          warning={data.resourcePacks.issues.length > 0} 
          warningText={`${data.resourcePacks.issues.length} problemas`} 
        />
        <StatCard icon={<History />} label="Snapshots" value={data.snapshots.length} />
        <StatCard icon={<Layers />} label="Mods" value={data.modCount} />
      </div>

      {/* Panel Dinámico de Recomendaciones de Optimización */}
      {data.recommendations.length > 0 && (
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
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
        <h3 className="text-sm font-semibold mb-3">Configuración de Video (options.txt)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <SettingItem label="Render Distance" value={`${data.settings.renderDistance || "?"} chunks`} />
          <SettingItem label="FOV" value={data.settings.fov || "?"} />
          <SettingItem label="Gamma" value={data.settings.gamma || "?"} />
          <SettingItem label="VSync" value={data.settings.enableVsync === "true" ? "ON" : "OFF"} />
          <SettingItem label="Sombras" value={data.settings.entityShadows === "true" ? "ON" : "OFF"} />
          <SettingItem label="Mipmaps" value={data.settings.mipmapLevels || "?"} />
        </div>
      </div>
    </div>
  );
}

/**
 * StatCard: Tarjeta atómica para métricas numéricas y advertencias.
 */
function StatCard({ icon, label, value, warning, warningText }: any) {
  return (
    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow hover:translate-y-[-2px] transition-transform">
      <div className="flex items-center gap-2 text-[var(--color-muted)] mb-2">
        {React.cloneElement(icon, { className: "w-4 h-4 text-primary" })}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      {warning && (
        <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1 font-bold uppercase animate-pulse">
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
