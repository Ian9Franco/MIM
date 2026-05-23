import React, { useState } from "react";
import {
  MapPin,
  Layers,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy
} from "lucide-react";
import { TagType, NBTTag } from "@/lib/modding/nbt";

interface RescueActionsProps {
  filePath: string;
  worldName: string;
  playerData: {
    position: number[];
    dimension: string;
    spawn: { x: number; y: number; z: number };
  };
  backupFiles: string[];
  nbtRoot: NBTTag;
  onSave?: (modifiedNBT: NBTTag) => void;
  onPurgeBackups?: () => void;
  saving?: boolean;
  purging?: boolean;
}

export function RescueActions({
  filePath,
  worldName,
  playerData,
  backupFiles,
  nbtRoot,
  onSave,
  onPurgeBackups,
  saving = false,
  purging = false
}: RescueActionsProps) {
  const [newX, setNewX] = useState(String(playerData.position[0]));
  const [newY, setNewY] = useState(String(playerData.position[1]));
  const [newZ, setNewZ] = useState(String(playerData.position[2]));
  const [newDimension, setNewDimension] = useState(playerData.dimension);
  const [actionLogs, setActionLogs] = useState<string[]>([]);

  const dimensions = [
    "minecraft:overworld",
    "minecraft:the_nether",
    "minecraft:the_end",
    "minecraft:deep_dark",
  ];

  const handleTeleport = () => {
    const rootCompound = nbtRoot.value as Record<string, NBTTag>;
    const modifiedRoot = JSON.parse(JSON.stringify(rootCompound));

    let targetCompound = modifiedRoot;
    if (modifiedRoot["Data"]?.type === TagType.Compound) {
      const dataComp = modifiedRoot["Data"].value as Record<string, NBTTag>;
      if (dataComp["Player"]?.type === TagType.Compound) {
        targetCompound = dataComp["Player"].value as Record<string, NBTTag>;
      }
    }

    // Update position
    targetCompound["Pos"] = {
      type: TagType.List,
      name: "Pos",
      value: {
        itemType: TagType.Double,
        list: [parseFloat(newX), parseFloat(newY), parseFloat(newZ)]
      }
    };

    // Update dimension if needed
    if (newDimension !== playerData.dimension) {
      targetCompound["Dimension"] = {
        type: TagType.String,
        name: "Dimension",
        value: newDimension
      };
    }

    setActionLogs([
      `✓ Posición actualizada a: ${newX}, ${newY}, ${newZ}`,
      newDimension !== playerData.dimension
        ? `✓ Dimensión actualizada a: ${newDimension}`
        : ""
    ].filter(Boolean));

    const newRoot: NBTTag = {
      type: nbtRoot.type,
      name: nbtRoot.name,
      value: modifiedRoot
    };

    onSave?.(newRoot);
  };

  const handlePurgeAndSave = async () => {
    if (backupFiles.length === 0) {
      setActionLogs(["No hay archivos de respaldo para purgar."]);
      return;
    }

    // First purge, then save
    onPurgeBackups?.();
  };

  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">
            Ruta de Archivo
          </p>
          <div className="flex items-center gap-2 group">
            <code className="text-[11px] text-white/70 font-mono truncate flex-1">
              {filePath}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(filePath)}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">
            Mundo
          </p>
          <p className="text-sm font-bold text-white/80">{worldName}</p>
        </div>
      </div>

      {/* Backup Files Warning */}
      {backupFiles.length > 0 && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-bold">
              {backupFiles.length} Archivo{backupFiles.length !== 1 ? "s" : ""} de Respaldo
            </span>
          </div>
          <p className="text-xs text-red-300/80 leading-relaxed">
            Archivos de respaldo detectados. Los mods pueden revertir tus cambios al cargar el mundo. Purgar estos archivos antes de guardar.
          </p>
          <button
            onClick={handlePurgeAndSave}
            disabled={purging}
            className="w-full py-2.5 rounded-lg bg-red-500/40 hover:bg-red-500/50 text-red-300 font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {purging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {purging ? "Purgando..." : "Purgar Respaldos"}
          </button>
        </div>
      )}

      {/* Position Editor */}
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 mb-3">
          <MapPin className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Teletransportar</span>
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-white/40 uppercase tracking-tight">
            X: <input
              type="number"
              value={newX}
              onChange={(e) => setNewX(e.target.value)}
              step="0.5"
              className="ml-2 w-20 px-2 py-1 rounded bg-white/5 border border-white/10 text-white/90 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </label>
          <label className="block text-xs text-white/40 uppercase tracking-tight">
            Y: <input
              type="number"
              value={newY}
              onChange={(e) => setNewY(e.target.value)}
              step="0.5"
              className="ml-2 w-20 px-2 py-1 rounded bg-white/5 border border-white/10 text-white/90 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </label>
          <label className="block text-xs text-white/40 uppercase tracking-tight">
            Z: <input
              type="number"
              value={newZ}
              onChange={(e) => setNewZ(e.target.value)}
              step="0.5"
              className="ml-2 w-20 px-2 py-1 rounded bg-white/5 border border-white/10 text-white/90 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </label>
        </div>
      </div>

      {/* Dimension Editor */}
      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-purple-400 mb-3">
          <Layers className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Dimensión</span>
        </div>

        <select
          value={newDimension}
          onChange={(e) => setNewDimension(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          {dimensions.map((dim) => (
            <option key={dim} value={dim} className="bg-slate-900">
              {dim.replace("minecraft:", "").replace(/_/g, " ").toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Action Logs */}
      {actionLogs.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest">Cambios Realizados</span>
          </div>
          <div className="text-[11px] space-y-1 font-mono text-emerald-300/80">
            {actionLogs.map((log, i) => (
              <p key={i}>&gt; {log}</p>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleTeleport}
        disabled={saving}
        className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-amber-500/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        {saving ? "Guardando..." : "Guardar Cambios"}
      </button>

      {/* Safety Warning */}
      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
        <p className="text-[11px] text-white/40 leading-relaxed">
          ⚠️ <strong>IMPORTANTE:</strong> Cierra Minecraft por completo antes de guardar. Guardar mientras el cliente/servidor está en ejecución será sobrescrito cuando el jugador se desconecte.
        </p>
      </div>
    </div>
  );
}
