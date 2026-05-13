"use client";

import { useState, useMemo } from "react";
import { 
  Keyboard, Search, AlertTriangle, Trash2, Save, X,
  ChevronDown, ChevronRight, Ghost, Command, MousePointer2
} from "lucide-react";

interface Keybind {
  id: string;
  name: string;
  key: string;
  category: string;
  modSource?: string;
  conflicts?: string[];
  isOrphaned?: boolean;
}

interface KeybindConflict {
  key: string;
  keybinds: Keybind[];
  severity: "warning" | "critical";
}

interface KeybindManagerProps {
  keybinds: Keybind[];
  grouped: {
    vanilla: Keybind[];
    mods: Record<string, Keybind[]>;
    orphaned: Keybind[];
  };
  conflicts: KeybindConflict[];
  projectName: string;
  version: string;
  onUpdate: () => void;
}

export function KeybindManager({ 
  keybinds, grouped, conflicts, projectName, version, onUpdate 
}: KeybindManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pressedKeyFilter, setPressedKeyFilter] = useState<string | null>(null);
  const [editingKeybind, setEditingKeybind] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [expandedMods, setExpandedMods] = useState<Set<string>>(new Set(["vanilla"]));
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [orphanAction, setOrphanAction] = useState<string[]>([]);

  // Filter keybinds based on search and pressed key
  const filteredKeybinds = useMemo(() => {
    let filtered = keybinds;
    
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(kb => 
        kb.name.toLowerCase().includes(term) ||
        kb.id.toLowerCase().includes(term) ||
        kb.key.toLowerCase().includes(term) ||
        kb.modSource?.toLowerCase().includes(term)
      );
    }
    
    if (pressedKeyFilter) {
      filtered = filtered.filter(kb => 
        kb.key.toLowerCase().includes(pressedKeyFilter.toLowerCase())
      );
    }
    
    return filtered;
  }, [keybinds, searchQuery, pressedKeyFilter]);

  // Group filtered keybinds
  const filteredGrouped = useMemo(() => {
    const vanilla: Keybind[] = [];
    const mods: Record<string, Keybind[]> = {};
    const orphaned: Keybind[] = [];

    for (const kb of filteredKeybinds) {
      if (kb.isOrphaned) {
        orphaned.push(kb);
      } else if (kb.modSource === "minecraft") {
        vanilla.push(kb);
      } else {
        const mod = kb.modSource || "Otros";
        if (!mods[mod]) mods[mod] = [];
        mods[mod].push(kb);
      }
    }

    return { vanilla, mods, orphaned };
  }, [filteredKeybinds]);

  const handleKeyDetect = () => {
    setDetecting(true);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const keyName = `key.keyboard.${e.key.toLowerCase()}`;
      setPressedKeyFilter(keyName);
      setDetecting(false);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("keydown", handler);
    
    // Auto-stop after 10 seconds
    setTimeout(() => {
      window.removeEventListener("keydown", handler);
      setDetecting(false);
    }, 10000);
  };

  const handleSaveKeybind = async (keybindId: string, newKey: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          version,
          action: "save",
          keybinds: [{ id: keybindId, key: newKey }],
        }),
      });
      if (res.ok) {
        setEditingKeybind(null);
        onUpdate();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCleanupOrphans = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          version,
          action: "cleanup-orphans",
          removeOrphans: orphanAction.length > 0 ? orphanAction : undefined,
        }),
      });
      if (res.ok) {
        setOrphanAction([]);
        onUpdate();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleModExpand = (mod: string) => {
    const newSet = new Set(expandedMods);
    if (newSet.has(mod)) {
      newSet.delete(mod);
    } else {
      newSet.add(mod);
    }
    setExpandedMods(newSet);
  };

  const formatKeyDisplay = (key: string) => {
    return key
      .replace("key.keyboard.", "")
      .replace("key.mouse.", "Mouse ")
      .replace("left.", "L")
      .replace("right.", "R")
      .toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Search & Detect Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
          <input
            type="text"
            placeholder="Buscar keybinds por nombre, tecla o mod..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-[var(--color-border)] text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={handleKeyDetect}
          disabled={detecting}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            detecting
              ? "bg-amber-500/20 text-amber-400 animate-pulse"
              : "bg-white/5 hover:bg-white/10 text-[var(--color-foreground)]"
          }`}
        >
          <Keyboard className="w-4 h-4" />
          {detecting ? "Presiona una tecla..." : "Detectar Tecla"}
        </button>
        {pressedKeyFilter && (
          <button
            onClick={() => setPressedKeyFilter(null)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs bg-primary/10 text-primary"
          >
            {formatKeyDisplay(pressedKeyFilter)}
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Conflict Warning */}
      {conflicts.length > 0 && !searchQuery && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-center gap-2 text-rose-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {conflicts.length} conflicto{conflicts.length > 1 ? "s" : ""} de teclas detectado{conflicts.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1.5">
            {conflicts.slice(0, 3).map((conflict, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded font-mono ${
                  conflict.severity === "critical" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {formatKeyDisplay(conflict.key)}
                </span>
                <span className="text-[var(--color-muted)]">
                  {conflict.keybinds.map(kb => kb.name).join(", ")}
                </span>
              </div>
            ))}
            {conflicts.length > 3 && (
              <p className="text-xs text-[var(--color-muted)] pl-1">
                +{conflicts.length - 3} más...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Orphaned Warning */}
      {grouped.orphaned.length > 0 && !searchQuery && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <Ghost className="w-4 h-4" />
              <span className="text-sm font-medium">
                {grouped.orphaned.length} keybinds huérfanos (mods removidos)
              </span>
            </div>
            <button
              onClick={handleCleanupOrphans}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Limpiar Todos
            </button>
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            {grouped.orphaned.slice(0, 3).map(k => k.name).join(", ")}
            {grouped.orphaned.length > 3 && ` +${grouped.orphaned.length - 3} más`}
          </p>
        </div>
      )}

      {/* Keybind List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
        {/* Vanilla Section */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <button
            onClick={() => toggleModExpand("vanilla")}
            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Minecraft Vanilla</span>
              <span className="text-xs text-[var(--color-muted)]">
                ({filteredGrouped.vanilla.length})
              </span>
            </div>
            {expandedMods.has("vanilla") ? (
              <ChevronDown className="w-4 h-4 text-[var(--color-muted)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--color-muted)]" />
            )}
          </button>
          
          {expandedMods.has("vanilla") && (
            <div className="border-t border-[var(--color-border)]">
              {filteredGrouped.vanilla.map((kb) => (
                <KeybindRow
                  key={kb.id}
                  keybind={kb}
                  editing={editingKeybind === kb.id}
                  onEdit={() => setEditingKeybind(kb.id)}
                  onSave={(key) => handleSaveKeybind(kb.id, key)}
                  onCancel={() => setEditingKeybind(null)}
                  formatKeyDisplay={formatKeyDisplay}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mod Sections */}
        {Object.entries(filteredGrouped.mods).map(([mod, modKeybinds]) => (
          <div key={mod} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <button
              onClick={() => toggleModExpand(mod)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium capitalize">{mod}</span>
                <span className="text-xs text-[var(--color-muted)]">
                  ({modKeybinds.length})
                </span>
              </div>
              {expandedMods.has(mod) ? (
                <ChevronDown className="w-4 h-4 text-[var(--color-muted)]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[var(--color-muted)]" />
              )}
            </button>
            
            {expandedMods.has(mod) && (
              <div className="border-t border-[var(--color-border)]">
                {modKeybinds.map((kb) => (
                  <KeybindRow
                    key={kb.id}
                    keybind={kb}
                    editing={editingKeybind === kb.id}
                    onEdit={() => setEditingKeybind(kb.id)}
                    onSave={(key) => handleSaveKeybind(kb.id, key)}
                    onCancel={() => setEditingKeybind(null)}
                    formatKeyDisplay={formatKeyDisplay}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Orphaned Section */}
        {filteredGrouped.orphaned.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
            <button
              onClick={() => toggleModExpand("orphaned")}
              className="w-full flex items-center justify-between p-3 hover:bg-amber-500/10 transition-all"
            >
              <div className="flex items-center gap-2">
                <Ghost className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Huérfanos</span>
                <span className="text-xs text-amber-400/70">
                  ({filteredGrouped.orphaned.length})
                </span>
              </div>
              {expandedMods.has("orphaned") ? (
                <ChevronDown className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-amber-400" />
              )}
            </button>
            
            {expandedMods.has("orphaned") && (
              <div className="border-t border-amber-500/20">
                {filteredGrouped.orphaned.map((kb) => (
                  <KeybindRow
                    key={kb.id}
                    keybind={kb}
                    editing={editingKeybind === kb.id}
                    onEdit={() => setEditingKeybind(kb.id)}
                    onSave={(key) => handleSaveKeybind(kb.id, key)}
                    onCancel={() => setEditingKeybind(null)}
                    formatKeyDisplay={formatKeyDisplay}
                    isOrphaned
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {filteredKeybinds.length === 0 && (
          <div className="text-center py-8 text-[var(--color-muted)]">
            <Keyboard className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No se encontraron keybinds</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface KeybindRowProps {
  keybind: Keybind;
  editing: boolean;
  onEdit: () => void;
  onSave: (key: string) => void;
  onCancel: () => void;
  formatKeyDisplay: (key: string) => string;
  isOrphaned?: boolean;
}

function KeybindRow({ keybind, editing, onEdit, onSave, onCancel, formatKeyDisplay, isOrphaned }: KeybindRowProps) {
  const [tempKey, setTempKey] = useState(keybind.key);

  if (editing) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white/5">
        <span className="flex-1 text-sm">{keybind.name}</span>
        <input
          type="text"
          value={tempKey}
          onChange={(e) => setTempKey(e.target.value)}
          placeholder="key.keyboard.x"
          className="px-3 py-1.5 rounded-lg bg-white/10 border border-[var(--color-border)] text-sm font-mono w-40"
          autoFocus
        />
        <button
          onClick={() => onSave(tempKey)}
          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div 
      onClick={onEdit}
      className={`flex items-center justify-between p-3 hover:bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] cursor-pointer transition-all group ${
        isOrphaned ? "text-amber-400/70" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--color-foreground)] font-medium">{keybind.name}</span>
        {keybind.conflicts && keybind.conflicts.length > 0 && (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        )}
        {isOrphaned && <Ghost className="w-3.5 h-3.5 text-amber-400" />}
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-lg text-xs font-mono border transition-all ${
          keybind.conflicts && keybind.conflicts.length > 0
            ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
            : "bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] text-[var(--color-foreground)] border-[var(--color-border)] opacity-85"
        }`}>
          {formatKeyDisplay(keybind.key)}
        </span>
      </div>
    </div>
  );
}
