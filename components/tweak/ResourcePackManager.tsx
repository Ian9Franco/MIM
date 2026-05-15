"use client";

import { useState, useMemo } from "react";
import { Package, Layers, Save, Wand2, AlertTriangle } from "lucide-react";
import { useResourcePackManager } from "@/hooks/tweak/useResourcePackManager";
import { PackItem } from "./parts/PackItem";

export function ResourcePackManager({ resourcePacks, projectName, version, onUpdate }: any) {
  const { 
    localOrder, hasChanges, saving, fixing, handleMove, saveOrder, fixOrder 
  } = useResourcePackManager(resourcePacks.active, resourcePacks.draft, projectName, version, onUpdate);

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const displayStack = useMemo(() => {
    return localOrder.map((packName, i) => {
      const analysis = resourcePacks.visualStack.find((p: any) => p.packName === packName);
      return {
        packName,
        displayName: packName.replace("file/", "").replace(".zip", ""),
        warnings: analysis?.warnings || []
      };
    }).reverse(); // Minecraft reverse order (last is top)
  }, [localOrder, resourcePacks.visualStack]);

  const handleManualMove = (visualFrom: number, visualTo: number) => {
    const arrayFrom = localOrder.length - 1 - visualFrom;
    const arrayTo = localOrder.length - 1 - visualTo;
    handleMove(arrayFrom, arrayTo);
  };

  return (
    <div className="space-y-3">
      {resourcePacks.issues.length > 0 && (
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-3 h-3" /> Problemas ({resourcePacks.issues.length})
            </h3>
            <button onClick={fixOrder} disabled={fixing} className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase hover:bg-rose-500/20 transition-colors">
              {fixing ? "Corrigiendo..." : "Auto-corregir"}
            </button>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
            {resourcePacks.issues.map((issue: any, i: number) => (
              <p key={i} className="text-[10px] p-2 rounded-lg bg-black/20 border border-white/5 opacity-70 italic">{issue.message}</p>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted/50">
            <Layers className="w-3 h-3 text-primary" /> Orden de Prioridad
          </h3>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={fixOrder} 
              disabled={fixing} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 text-muted hover:bg-white/10 text-[10px] font-black uppercase transition-all"
              title="Optimizar orden según reglas de inteligencia"
            >
              <Wand2 className={`w-3 h-3 ${fixing ? 'animate-pulse' : ''}`} /> Optimizar
            </button>
            {hasChanges && (
              <button 
                onClick={saveOrder} 
                disabled={saving} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Save className="w-3 h-3" /> {saving ? "..." : "Guardar"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {displayStack.length === 0 ? (
            <div className="text-center py-6 opacity-30 italic text-[11px]">
              <Package className="w-6 h-6 mx-auto mb-2 opacity-20" />
              <p>No hay paquetes activos</p>
            </div>
          ) : (
            displayStack.map((pack, i) => (
              <PackItem
                key={pack.packName} pack={pack} visualIndex={i} total={displayStack.length}
                isDragged={draggedIdx === i} isOver={overIdx === i}
                onMove={handleManualMove}
                onDragStart={() => setDraggedIdx(i)}
                onDragOver={(e: any) => { e.preventDefault(); setOverIdx(i); }}
                onDrop={() => { if (draggedIdx !== null) handleManualMove(draggedIdx, i); setDraggedIdx(null); setOverIdx(null); }}
                onDragEnd={() => { setDraggedIdx(null); setOverIdx(null); }}
              />
            ))
          )}
        </div>
        
        {hasChanges && (
          <p className="text-[9px] text-amber-500/50 mt-3 italic text-center font-bold uppercase tracking-tighter">
            * Cambios guardados en cache local
          </p>
        )}
      </div>
    </div>
  );
}
