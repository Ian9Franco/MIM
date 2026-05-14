"use client";

import { useState, useMemo } from "react";
import { Package, Layers, Save, Wand2, AlertTriangle } from "lucide-react";
import { useResourcePackManager } from "@/hooks/tweak/useResourcePackManager";
import { PackItem } from "./parts/PackItem";

export function ResourcePackManager({ resourcePacks, projectName, version, onUpdate }: any) {
  const { 
    localOrder, hasChanges, saving, fixing, handleMove, saveOrder, fixOrder 
  } = useResourcePackManager(resourcePacks.active, projectName, version, onUpdate);

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
    <div className="space-y-4">
      {resourcePacks.issues.length > 0 && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" /> Problemas ({resourcePacks.issues.length})</h3>
            <button onClick={fixOrder} disabled={fixing} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              <Wand2 className="w-3 h-3 inline mr-1" /> {fixing ? "Corrigiendo..." : "Auto-corregir"}
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {resourcePacks.issues.map((issue: any, i: number) => (
              <p key={i} className="text-xs p-2 rounded-lg bg-white/5 border border-[var(--color-border)]">{issue.message}</p>
            ))}
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-sm text-amber-400">Cambios pendientes</span>
          <button onClick={saveOrder} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm">
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar Orden"}
          </button>
        </div>
      )}

      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Orden de Aplicación</h3>
        <div className="space-y-1">
          {displayStack.length === 0 ? (
            <div className="text-center py-8 opacity-50"><Package className="w-8 h-8 mx-auto mb-2" /><p>No hay paquetes activos</p></div>
          ) : (
            displayStack.map((pack, i) => (
              <PackItem
                key={pack.packName} pack={pack} visualIndex={i} total={displayStack.length}
                isDragged={draggedIdx === i} isOver={overIdx === i}
                onMove={handleManualMove}
                onDragStart={() => setDraggedIdx(i)}
                onDragOver={(e: any) => { e.preventDefault(); setOverIdx(i); }}
                onDrop={() => { handleManualMove(draggedIdx!, i); setDraggedIdx(null); setOverIdx(null); }}
                onDragEnd={() => { setDraggedIdx(null); setOverIdx(null); }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
