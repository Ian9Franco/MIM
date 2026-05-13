import type { Loader } from "./constants";

export interface ModHit {
  projectId:     string;
  slug:          string;
  title:         string;
  description:   string;
  iconUrl:       string | null;
  author:        string;
  downloads:     number;
  follows:       number;
  latestVersion: string | null;
  categories:    string[];
  dateCreated:   string;
  url:           string;
  projectType?:  string;
  body?:         string;
  client_side?:  string;
  server_side?:  string;
  allowModDistribution?: boolean;
  members?:      any[];
  _source?:      "modrinth" | "curseforge";
  availability?: {
    modrinth: boolean;
    curseforge: boolean;
    checking?: boolean;
  };
}

export interface CollectionEntry {
  id:           string;
  name:         string;
  description:  string;
  projectCount: number;
  iconUrl:      string | null;
  isLocal?:     boolean;
  source?:      "local" | "modrinth";
  webUrl?:      string | null;
  visibility?:  "private" | "unlisted" | "public" | "unknown";
  projects?:    ModHit[];
}

export interface PresetEntry {
  id:                 string;
  name:               string;
  description:        string;
  projectCount:       number;
  iconUrl:            string | null;
  tags:               string[];
  recommendedLoader:  string;
  recommendedVersion: string;
}

export interface VersionEntry {
  id:            string;
  versionNumber: string;
  name:          string;
  versionType:   "release" | "beta" | "alpha";
  gameVersions:  string[];
  loaders:       string[];
  datePublished: string;
  downloads:     number;
  primaryFile:   {
    url:      string;
    filename: string;
    primary:  boolean;
    size:     number;
    hashes?:  Record<string, string>;
  } | null;
  changelog?:    string;
  dependencies?: {
    projectId:      string;
    dependencyType: "required" | "optional" | "incompatible" | "embedded";
    title?:         string;
    slug?:          string;
    iconUrl?:       string | null;
    projectType?:   string;
    url?:           string;
    versionId?:     string | null;
    fileName?:      string | null;
    externalUrl?:   string | null;
  }[];
}

export interface ModMeta {
  modId?:       string;
  modName?:     string;
  modVersion?:  string;
  gameVersion?: string;
  version?:     string;
  loader?:      string;
  projectType?: string;
  author?:      string;
  iconBase64?:  string;
  sha1?:        string;
  categories?:  string[];
  conflicts?:   string[];
  breaks?:      string[];
  providedIds?: string[];
  dependencies?: string[];
  clientSide?:  string;
  serverSide?:  string;
}

export interface PendingFile {
  path:     string;
  fileName: string;
  meta?:    ModMeta;
}

export interface LibraryFile extends PendingFile {
  category:  string;
  sub:       string;
}

export interface Project {
  id:      string;
  name:    string;
  version: string;
  loader:  Loader;
}

// ── Security Types ──────────────────────────────────────────────────────────────

export type ThreatCategory =
  | "network_call"
  | "process_execution"
  | "file_system"
  | "obfuscation"
  | "native_code"
  | "reflection_abuse"
  | "known_malware"
  | "suspicious_string"
  | "manifest_anomaly";

export type RiskLevel = "clean" | "caution" | "suspicious" | "critical";

export interface SecurityFinding {
  category: ThreatCategory;
  severity: "info" | "low" | "medium" | "high" | "critical";
  description: string;
  details?: string[];
  scoreImpact: number;
}

export interface SecurityScanResult {
  riskScore: number;
  riskLevel: RiskLevel;
  sha1: string;
  sha256?: string;
  virusTotal?: {
    maliciousCount: number;
    totalEngineCount: number;
    detailsUrl?: string;
  } | null;
  findings: SecurityFinding[];
  summary: string;
  scannedAt: string;
}

// ── Tweak (Tuning Workspace) Types ──────────────────────────────────────────

export interface Keybind {
  id: string;
  name: string;
  key: string;
  category: string;
}

export interface TweakSnapshot {
  name: string;
  fileName: string;
  createdAt: string;
}

export interface TweakRecommendation {
  title: string;
  desc: string;
  impact: "low" | "medium" | "high";
  action?: string;
  fomoQuery?: string;
  settingKey?: string;
  recommendedValue?: string;
}

export interface TweakData {
  optionsExists: boolean;
  keybinds: Keybind[];
  keybindsGrouped?: any;
  keybindConflicts?: any[];
  settings: Record<string, string>;
  resourcePacks: {
    active: string[];
    available: string[];
    issues?: any[];
    autoFixable?: any[];
  };
  shadersInGame: { name: string; size: number }[];
  recommendations: TweakRecommendation[];
  snapshots: TweakSnapshot[];
  modCount: number;
  hardware?: {
    profile: string;
    ram: number;
    cores: number;
    gpu: string;
    jvmArgs: string;
  };
  hardwareProfile?: string;
  totalRamGB?: number;
  cpuCores?: number;
  jvmArgs?: string;
}

// ── Pack Validation Types ────────────────────────────────────────────────────

export type ValidationSeverity = "error" | "warning" | "suggestion";

export type ValidationCategory =
  | "dependency_missing"   // Mod A requiere Mod B, B no está en el pack
  | "dependency_conflict"  // Mod A declara conflict con Mod B, ambos presentes
  | "environment_mismatch" // client-only en .server o viceversa
  | "loader_mismatch"      // Mod Fabric en proyecto Forge sin Sinytra
  | "duplicate_mod"        // Mismo modId en más de una categoría
  | "version_mismatch"     // gameVersion del mod != versión del proyecto
  | "orphan_library"       // Librería sin ningún mod dependiente
  | "server_leak";         // Mod client-only incluido en allhost

export type ValidationFixAction =
  | "move_to_essential"
  | "move_to_local"
  | "move_to_server"
  | "disable"
  | "fomo_search";

export interface ValidationIssue {
  severity:     ValidationSeverity;
  category:     ValidationCategory;
  modFile:      string;          // filename del mod afectado
  modName:      string;
  message:      string;          // descripción human-readable
  details?:     string;          // contexto adicional
  affectedMod?: string;          // el otro mod involucrado
  autoFixable?: boolean;
  fixAction?:   ValidationFixAction;
  /** Payload para la acción de fix (ej. categoría destino, query de FOMO) */
  fixPayload?:  Record<string, string>;
}

export type PackGrade = "S" | "A" | "B" | "C" | "D" | "F";

export interface PackHealthReport {
  score:        number;          // 0–100
  grade:        PackGrade;
  totalMods:    number;
  issues:       ValidationIssue[];
  errors:       ValidationIssue[];   // severity === "error"
  warnings:     ValidationIssue[];   // severity === "warning"
  suggestions:  ValidationIssue[];   // severity === "suggestion"
  blocksExport: boolean;
  buildTarget:  "alluser" | "allhost" | "both";
  validatedAt:  string;
}
