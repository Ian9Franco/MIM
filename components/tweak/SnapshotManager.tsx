"use client";

import { useState } from "react";
import { 
  History, Save, Upload, Trash2, CheckCircle, AlertCircle,
  ChevronDown, ChevronRight, Package, Keyboard, Monitor, Volume2,
  Calendar, Hash, Box, X
} from "lucide-react";

interface SnapshotMetadata {
  id: string;
  timestamp: string;
  profileName: string;
  minecraftVersion: string;
  loader: string;
  modpackHash: string;
  modsInstalled: number;
  keybindCount: number;
  resourcePackStack: string[];
  notes?: string;
}

interface SnapshotManagerProps {
  snapshots: SnapshotMetadata[];
  projectName: string;
  version: string;
  loader: string;
  onUpdate: () => void;
}

export function SnapshotManager({ 
  snapshots, projectName, version, loader, onUpdate 
}: SnapshotManagerProps) {
  const [creating, setCreating] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState("");
  const [newSnapshotNotes, setNewSnapshotNotes] = useState("");
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [partialRestore, setPartialRestore] = useState({
    keybinds: true,
    resourcePacks: true,
    graphics: true,
    audio: true,
  });

  const handleCreateSnapshot = async () => {
    if (!newSnapshotName.trim()) return;
    
    setCreating(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          version,
          action: "save-snapshot",
          snapshotName: newSnapshotName,
          snapshotNotes: newSnapshotNotes,
          loader,
        }),
      });
      
      if (res.ok) {
        setNewSnapshotName("");
        setNewSnapshotNotes("");
        onUpdate();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotName: string) => {
    setRestoring(snapshotName);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          version,
          action: "restore-snapshot",
          snapshotName,
          partialRestore,
        }),
      });
      
      if (res.ok) {
        setExpandedSnapshot(null);
        onUpdate();
      }
    } finally {
      setRestoring(null);
    }
  };

  const handleDeleteSnapshot = async (snapshotName: string) => {
    const res = await fetch("/api/tweak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName,
        version,
        action: "delete-snapshot",
        snapshotName,
      }),
    });
    
    if (res.ok) {
      onUpdate();
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Create New Snapshot */}
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Save className="w-4 h-4 text-primary" />
          Crear Nuevo Snapshot
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nombre del perfil (ej: Default, PvP, Cinematic)..."
            value={newSnapshotName}
            onChange={(e) => setNewSnapshotName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--color-border)] text-sm focus:outline-none focus:border-primary/50"
          />
          <textarea
            placeholder="Notas opcionales..."
            value={newSnapshotNotes}
            onChange={(e) => setNewSnapshotNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--color-border)] text-sm focus:outline-none focus:border-primary/50 resize-none"
          />
          <button
            onClick={handleCreateSnapshot}
            disabled={creating || !newSnapshotName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {creating ? "Guardando..." : "Guardar Snapshot"}
          </button>
        </div>
      </div>

      {/* Snapshots List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
        {snapshots.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-muted)]">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay snapshots guardados</p>
            <p className="text-xs mt-1">Crea tu primer snapshot para guardar esta configuración</p>
          </div>
        ) : (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                expandedSnapshot === snapshot.profileName
                  ? "border-primary/30 bg-primary/5"
                  : "border-[var(--color-border)] bg-[var(--color-card)]"
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedSnapshot(
                  expandedSnapshot === snapshot.profileName ? null : snapshot.profileName
                )}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{snapshot.profileName}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {formatDate(snapshot.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted)] px-2 py-1 rounded-lg bg-white/5">
                    {snapshot.modsInstalled} mods
                  </span>
                  {expandedSnapshot === snapshot.profileName ? (
                    <ChevronDown className="w-4 h-4 text-[var(--color-muted)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--color-muted)]" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedSnapshot === snapshot.profileName && (
                <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 py-3 text-xs">
                    <div className="flex items-center gap-2 text-[var(--color-muted)]">
                      <Box className="w-3.5 h-3.5" />
                      {snapshot.minecraftVersion} / {snapshot.loader}
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-muted)]">
                      <Hash className="w-3.5 h-3.5" />
                      Hash: {snapshot.modpackHash.slice(0, 8)}
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-muted)]">
                      <Keyboard className="w-3.5 h-3.5" />
                      {snapshot.keybindCount} keybinds
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-muted)]">
                      <Package className="w-3.5 h-3.5" />
                      {snapshot.resourcePackStack.length} resource packs
                    </div>
                  </div>

                  {/* Notes */}
                  {snapshot.notes && (
                    <div className="p-3 rounded-lg bg-white/5 text-xs text-[var(--color-muted)] mb-3">
                      {snapshot.notes}
                    </div>
                  )}

                  {/* Partial Restore Options */}
                  <div className="p-3 rounded-lg bg-white/5 mb-3">
                    <p className="text-xs font-medium mb-2">Restaurar secciones:</p>
                    <div className="grid grid-cols-4 gap-2">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={partialRestore.keybinds}
                          onChange={(e) => setPartialRestore(p => ({ ...p, keybinds: e.target.checked }))}
                          className="rounded border-[var(--color-border)]"
                        />
                        <Keyboard className="w-3 h-3" />
                        Teclas
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={partialRestore.resourcePacks}
                          onChange={(e) => setPartialRestore(p => ({ ...p, resourcePacks: e.target.checked }))}
                          className="rounded border-[var(--color-border)]"
                        />
                        <Package className="w-3 h-3" />
                        Packs
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={partialRestore.graphics}
                          onChange={(e) => setPartialRestore(p => ({ ...p, graphics: e.target.checked }))}
                          className="rounded border-[var(--color-border)]"
                        />
                        <Monitor className="w-3 h-3" />
                        Gráficos
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={partialRestore.audio}
                          onChange={(e) => setPartialRestore(p => ({ ...p, audio: e.target.checked }))}
                          className="rounded border-[var(--color-border)]"
                        />
                        <Volume2 className="w-3 h-3" />
                        Audio
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreSnapshot(snapshot.profileName)}
                      disabled={restoring === snapshot.profileName}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {restoring === snapshot.profileName ? "Restaurando..." : "Restaurar Snapshot"}
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(snapshot.profileName)}
                      className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Eliminar snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
