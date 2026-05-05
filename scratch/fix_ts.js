const fs = require('fs');
const path = require('path');
const root = 'd:\\.mine\\manager';

// 1. Move root types.ts content to lib/types.ts, but keep Loader type
const libTypesPath = path.join(root, 'lib', 'types.ts');
const newTypesContent = `import type { Loader } from "./constants";

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
  loader:  Loader;
}
`;
fs.writeFileSync(libTypesPath, newTypesContent);

// Fix app/page.tsx import
let pageContent = fs.readFileSync(path.join(root, 'app', 'page.tsx'), 'utf8');
pageContent = pageContent.replace('import type { PendingFile, LibraryFile } from "../types";', 'import type { PendingFile, LibraryFile } from "@/lib/types";');
// Also update hook imports to have type Project from lib/types
let hooksLibContent = fs.readFileSync(path.join(root, 'hooks', 'useLibrary.ts'), 'utf8');
hooksLibContent = hooksLibContent.replace('from "../types"', 'from "@/lib/types"');
fs.writeFileSync(path.join(root, 'hooks', 'useLibrary.ts'), hooksLibContent);
let hooksProjContent = fs.readFileSync(path.join(root, 'hooks', 'useProjects.ts'), 'utf8');
hooksProjContent = hooksProjContent.replace('from "../types"', 'from "@/lib/types"');
fs.writeFileSync(path.join(root, 'hooks', 'useProjects.ts'), hooksProjContent);
let hooksFomoContent = fs.readFileSync(path.join(root, 'hooks', 'useFomoDiscover.ts'), 'utf8');
hooksFomoContent = hooksFomoContent.replace('from "../types"', 'from "@/lib/types"');
fs.writeFileSync(path.join(root, 'hooks', 'useFomoDiscover.ts'), hooksFomoContent);

// Also fix imports in fomo components to use @/lib/types instead of @/types
const fomoDir = path.join(root, 'components', 'fomo');
fs.readdirSync(fomoDir).forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    let p = path.join(fomoDir, file);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/@\/types/g, '@/lib/types');
    fs.writeFileSync(p, c);
  }
});
fs.writeFileSync(path.join(root, 'app', 'page.tsx'), pageContent);

// 2. Add missing exports to constants/app.ts
let constAppContent = fs.readFileSync(path.join(root, 'constants', 'app.ts'), 'utf8');
constAppContent += `
export const LOADERS = ["forge", "fabric", "neoforge", "quilt"];
export const GAME_VERSIONS = ["1.20.4", "1.20.1", "1.19.2", "1.18.2", "1.16.5", "1.12.2"];
export const PROJECT_TYPES = ["mod", "resourcepack", "shader", "datapack"];
export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "downloads", label: "Descargas" },
  { value: "newest", label: "Recientes" }
];
export type SortOrder = "relevance" | "downloads" | "newest" | "updated";
`;
fs.writeFileSync(path.join(root, 'constants', 'app.ts'), constAppContent);

// 3. Add openExternal to utils/format.ts
let utilsFormatContent = fs.readFileSync(path.join(root, 'utils', 'format.ts'), 'utf8');
utilsFormatContent += `
export function openExternal(url: string) {
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = url;
  } catch {
    window.location.href = url;
  }
}
`;
fs.writeFileSync(path.join(root, 'utils', 'format.ts'), utilsFormatContent);

// 4. Add missing colors and LoaderKey to theme/tokens.ts
let themeContent = fs.readFileSync(path.join(root, 'theme', 'tokens.ts'), 'utf8');
themeContent = themeContent.replace('};', '  gold: "#FFD700",\n  curseforgeOrange: "#EF6C00"\n};');
themeContent += `
export type LoaderKey = "forge" | "fabric" | "neoforge" | "quilt";
export const LOADER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  forge: { bg: "rgba(59,130,246,0.1)", text: "#60A5FA", border: "rgba(59,130,246,0.2)" },
  fabric: { bg: "rgba(139,92,246,0.1)", text: "#A78BFA", border: "rgba(139,92,246,0.2)" },
  neoforge: { bg: "rgba(6,182,212,0.1)", text: "#22D3EE", border: "rgba(6,182,212,0.2)" },
  quilt: { bg: "rgba(236,72,153,0.1)", text: "#F472B6", border: "rgba(236,72,153,0.2)" },
  default: { bg: "rgba(255,255,255,0.05)", text: "#A3A3A3", border: "rgba(255,255,255,0.1)" }
};
`;
fs.writeFileSync(path.join(root, 'theme', 'tokens.ts'), themeContent);

// 5. Create a stub for services/api.ts
fs.mkdirSync(path.join(root, 'services'), { recursive: true });
const apiContent = `
export const api = {
  collections: {
    sync: async () => [],
  }
};
`;
fs.writeFileSync(path.join(root, 'services', 'api.ts'), apiContent);

// Replace any import in FomoCollections from ../../services/api to @/services/api
let fomoColl = fs.readFileSync(path.join(fomoDir, 'FomoCollections.tsx'), 'utf8');
fomoColl = fomoColl.replace('../../services/api', '@/services/api');
fs.writeFileSync(path.join(fomoDir, 'FomoCollections.tsx'), fomoColl);

console.log("Fixes applied!");
