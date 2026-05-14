export interface Keybind {
  id: string;
  name: string;
  key: string;
  category: string;
  modSource?: string;
  conflicts?: string[];
  isOrphaned?: boolean;
}

export interface PackRule {
  id: string;
  type: "priority" | "incompatibility" | "dependency" | "overlay" | "shader_conflict";
  source: string;
  target: string;
  severity: "info" | "warning" | "critical";
  message: string;
  autoFixable?: boolean;
}

export interface PackAnalysis {
  packName: string;
  displayName: string;
  priority: number;
  warnings: PackRule[];
  dependencies: PackRule[];
  overlays: PackRule[];
}

export interface SnapshotMetadata {
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

export interface KeybindConflict {
  key: string;
  keybinds: Keybind[];
  severity: "warning" | "critical";
}
