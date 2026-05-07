"use client";

import { useState, useCallback } from "react";
import { 
  Package, AlertTriangle, GripVertical, Wand2, 
  CheckCircle, AlertCircle, Info, Layers, Save,
  ArrowUp, ArrowDown
} from "lucide-react";

interface PackRule {
  id: string;
  type: "priority" | "incompatibility" | "dependency" | "overlay" | "shader_conflict";
  source: string;
  target: string;
  severity: "info" | "warning" | "critical";
  message: string;
  autoFixable?: boolean;
}

interface PackAnalysis {
  packName: string;
  displayName: string;
  priority: number;
  warnings: PackRule[];
  dependencies: PackRule[];
  overlays: PackRule[];
}

interface ResourcePackManagerProps {
  resourcePacks: {
    active: string[];
    available: string[];
    visualStack: PackAnalysis[];
    issues: PackRule[];
    autoFixable: PackRule[];
  };
  projectName: string;
  version: string;
  onUpdate: () => void;
}

export function ResourcePackManager({ 
  resourcePacks, projectName, version, onUpdate 
}: ResourcePackManagerProps) {
  const [fixing, setFixing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>(resourcePacks.active);

  // Sync local order when prop changes
  if (JSON.stringify(localOrder) !== JSON.stringify(resourcePacks.active) && !hasChanges) {
    setLocalOrder(resourcePacks.active);
  }

  // Build visual stack from local order
  const displayStack = useCallback(() => {
    const stack: { packName: string; displayName: string; index: number; warnings: PackRule[] }[] = [];
    // Minecraft: last in array = top priority (displayed first)
    for (let i = localOrder.length - 1; i >= 0; i--) {
      const packName = localOrder[i];
      const cleanName = packName
        .replace("file/", "")
        .replace(".zip", "")
        .replace(/_v?[\d\.]+.*$/, "");
      
      // Find warnings for this pack
      const analysis = resourcePacks.visualStack.find(p => p.packName === packName);
      
      stack.push({
        packName,
        displayName: cleanName,
        index: i, // Original index in the array
        warnings: analysis?.warnings || [],
      });
    }
    return stack;
  }, [localOrder, resourcePacks.visualStack])();

  const handleFixOrder = async () => {
    setFixing(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          version,
          action: "fix-pack-order",
        }),
      });
      if (res.ok) {
        setHasChanges(false);
        onUpdate();
      }
    } finally {
      setFixing(false);
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          version,
          action: "save",
          resourcePacks: localOrder,
        }),
      });
      if (res.ok) {
        setHasChanges(false);
        onUpdate();
      }
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, visualIndex: number) => {
    setDraggedIndex(visualIndex);
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent drag image or custom
    const el = e.currentTarget as HTMLElement;
    if (el) {
      e.dataTransfer.setDragImage(el, 20, 20);
    }
  };

  const handleDragOver = (e: React.DragEvent, visualIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== visualIndex) {
      setDragOverIndex(visualIndex);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetVisualIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetVisualIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Convert visual indices to array indices
    // visual index 0 = last element in array (highest priority)
    const sourceArrayIndex = localOrder.length - 1 - draggedIndex;
    const targetArrayIndex = localOrder.length - 1 - targetVisualIndex;

    // Reorder
    const newOrder = [...localOrder];
    const [moved] = newOrder.splice(sourceArrayIndex, 1);
    newOrder.splice(targetArrayIndex, 0, moved);

    setLocalOrder(newOrder);
    setHasChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "info":
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-rose-500/10 border-rose-500/20";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      case "info":
      default:
        return "bg-blue-500/10 border-blue-500/20";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "priority":
        return "Orden";
      case "dependency":
        return "Dependencia";
      case "incompatibility":
        return "Incompatible";
      case "overlay":
        return "Overlay";
      case "shader_conflict":
        return "Shader";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Issues Summary */}
      {resourcePacks.issues.length > 0 && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Problemas Detectados ({resourcePacks.issues.length})
            </h3>
            {resourcePacks.autoFixable.length > 0 && (
              <button
                onClick={handleFixOrder}
                disabled={fixing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all"
              >
                <Wand2 className="w-3 h-3" />
                {fixing ? "Corrigiendo..." : `Auto-corregir ${resourcePacks.autoFixable.length}`}
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {resourcePacks.issues.map((issue, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl border ${getSeverityClass(issue.severity)}`}
              >
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      issue.type === "incompatibility" ? "bg-rose-500/20 text-rose-400" :
                      issue.type === "dependency" ? "bg-blue-500/20 text-blue-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>
                      {getTypeLabel(issue.type)}
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {issue.source} → {issue.target}
                    </span>
                  </div>
                  <p className="text-xs mt-1">{issue.message}</p>
                </div>
                {issue.autoFixable && (
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Changes Button */}
      {hasChanges && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-sm text-amber-400">Tienes cambios sin guardar</span>
          <button
            onClick={handleSaveOrder}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar Orden"}
          </button>
        </div>
      )}

      {/* Visual Stack */}
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Orden de Aplicación
          </h3>
          <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              Mayor Prioridad
            </span>
          </div>
        </div>

        {/* Priority Indicator */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-emerald-400">●</span>
          <span className="text-[var(--color-muted)]">Aplica primero (abajo)</span>
          <span className="mx-2">→</span>
          <span className="text-primary">●</span>
          <span className="text-[var(--color-muted)]">Aplica último (arriba, gana)</span>
        </div>

        {/* Pack List with Drag and Drop */}
        <div className="space-y-1">
          {displayStack.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-muted)]">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay resource packs activos</p>
            </div>
          ) : (
            displayStack.map((pack, visualIndex) => (
              <div
                key={pack.packName}
                draggable
                onDragStart={(e) => handleDragStart(e, visualIndex)}
                onDragOver={(e) => handleDragOver(e, visualIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, visualIndex)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-3 p-3 rounded-xl border cursor-move transition-all ${
                  draggedIndex === visualIndex
                    ? "opacity-50 border-primary/50"
                    : dragOverIndex === visualIndex
                    ? "border-primary bg-primary/5"
                    : pack.warnings.length > 0
                    ? pack.warnings.some(w => w.severity === "critical")
                      ? "bg-rose-500/5 border-rose-500/20"
                      : "bg-amber-500/5 border-amber-500/20"
                    : "bg-white/5 border-[var(--color-border)] hover:border-primary/30"
                }`}
              >
                {/* Drag Handle */}
                <div className="text-[var(--color-muted)] group-hover:text-primary transition-colors">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Priority Number */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  visualIndex === 0
                    ? "bg-primary/20 text-primary"
                    : visualIndex === displayStack.length - 1
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/10 text-[var(--color-muted)]"
                }`}>
                  {displayStack.length - visualIndex}
                </div>

                {/* Pack Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{pack.displayName}</span>
                    {pack.warnings.length > 0 && (
                      <AlertTriangle className={`w-3.5 h-3.5 ${
                        pack.warnings.some(w => w.severity === "critical") ? "text-rose-400" : "text-amber-400"
                      }`} />
                    )}
                  </div>
                  {pack.warnings.length > 0 && (
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">
                      {pack.warnings[0].message}
                    </p>
                  )}
                </div>

                {/* Arrow Controls */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      if (visualIndex > 0) {
                        // Move up in visual = increase priority = move toward end of array
                        const sourceArrayIndex = localOrder.length - 1 - visualIndex;
                        const targetArrayIndex = localOrder.length - visualIndex; // one position higher priority
                        if (targetArrayIndex < localOrder.length) {
                          const newOrder = [...localOrder];
                          const [moved] = newOrder.splice(sourceArrayIndex, 1);
                          newOrder.splice(targetArrayIndex, 0, moved);
                          setLocalOrder(newOrder);
                          setHasChanges(true);
                        }
                      }
                    }}
                    disabled={visualIndex === 0}
                    className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all"
                    title="Aumentar prioridad"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (visualIndex < displayStack.length - 1) {
                        // Move down in visual = decrease priority = move toward start of array
                        const sourceArrayIndex = localOrder.length - 1 - visualIndex;
                        const targetArrayIndex = localOrder.length - 2 - visualIndex;
                        if (targetArrayIndex >= 0) {
                          const newOrder = [...localOrder];
                          const [moved] = newOrder.splice(sourceArrayIndex, 1);
                          newOrder.splice(targetArrayIndex, 0, moved);
                          setLocalOrder(newOrder);
                          setHasChanges(true);
                        }
                      }
                    }}
                    disabled={visualIndex === displayStack.length - 1}
                    className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all"
                    title="Disminuir prioridad"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Available Packs */}
      {resourcePacks.available.length > 0 && (
        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-[var(--color-muted)]" />
            Disponibles ({resourcePacks.available.length})
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
            {resourcePacks.available.map((pack) => (
              <div
                key={pack}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-xs"
              >
                <Package className="w-3 h-3 text-[var(--color-muted)]" />
                <span className="truncate">{pack.replace(".zip", "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
