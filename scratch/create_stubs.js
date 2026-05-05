const fs = require('fs');
const path = require('path');

const root = 'd:\\.mine\\manager';

// Create directories
['hooks', 'theme', 'utils', 'constants'].forEach(dir => {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
});

// 1. types.ts at root
const typesContent = `export interface ModHit {
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
  _source?:      "modrinth" | "curseforge";
}

export interface CollectionEntry {
  id:           string;
  name:         string;
  description:  string;
  projectCount: number;
  iconUrl:      string | null;
  isLocal?:     boolean;
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
  } | null;
}

export interface ModMeta {
  modId?:       string;
  modName?:     string;
  modVersion?:  string;
  gameVersion?: string;
  version?:     string;
  loader?:      string;
  projectType?: string;
  iconBase64?:  string;
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
  loader:  string;
}
`;
fs.writeFileSync(path.join(root, 'types.ts'), typesContent);

// 2. constants/app.ts
const constantsContent = `export const CATEGORY_HOTKEYS: Record<string, string> = {
  "1": ".local",
  "2": ".server",
  "3": ".essential"
};

export const LOADER_COLORS: Record<string, string> = {
  forge: "#3B82F6", neoforge: "#06B6D4", fabric: "#8B5CF6", quilt: "#EC4899",
};
`;
fs.writeFileSync(path.join(root, 'constants', 'app.ts'), constantsContent);

// 3. theme/tokens.ts
const themeContent = `export const COLORS = {
  primary: "#BB96E4",
  foreground: "#ffffff",
  muted: "rgba(255,255,255,0.4)",
  border: "rgba(255,255,255,0.1)",
  borderStrong: "rgba(255,255,255,0.15)",
  card: "rgba(20,20,20,0.8)",
  fomoFlame: "#FF6C3E",
  wisteria: "#BB96E4",
  red: "#EF4444",
  redBg: "rgba(239,68,68,0.1)",
  emerald: "#10B981",
  accent: "#FF6C3E"
};
`;
fs.writeFileSync(path.join(root, 'theme', 'tokens.ts'), themeContent);

// 4. utils/format.ts
const utilsContent = `export function formatNumber(n: number): string {
  if (n >= 1_000_000) return \`\${(n / 1_000_000).toFixed(1)}M\`;
  if (n >= 1_000) return \`\${(n / 1_000).toFixed(1)}K\`;
  return String(n);
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getProjectTypeLabel(type: string): string {
  if (type === "mod") return "Mods";
  if (type === "resourcepack") return "Resource Packs";
  if (type === "shader") return "Shaders";
  if (type === "datapack") return "Data Packs";
  return "Elementos";
}
`;
fs.writeFileSync(path.join(root, 'utils', 'format.ts'), utilsContent);

console.log("Created basic stubs.");
