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
