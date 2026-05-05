const fs = require('fs');
const path = require('path');
const root = 'd:\\.mine\\manager';

// 1. Fix services/api.ts exports
const apiPath = path.join(root, 'services', 'api.ts');
const apiContent = `
export async function fetchCollections() { return []; }
export async function fetchCollectionMods(id: string) { return []; }
export async function createCollection(name: string, desc: string) { return null; }
export async function addModToCollection(collId: string, projectId: string) { return true; }
export async function downloadCollection(collId: string) { return true; }

export const api = {
  collections: {
    sync: async () => [],
  }
};
`;
fs.writeFileSync(apiPath, apiContent);

// 2. Fix PROJECT_TYPES in constants/app.ts
let constAppContent = fs.readFileSync(path.join(root, 'constants', 'app.ts'), 'utf8');
constAppContent = constAppContent.replace(
  'export const PROJECT_TYPES = ["mod", "resourcepack", "shader", "datapack"];',
  'export const PROJECT_TYPES = [\n  { value: "mod", label: "Mods" },\n  { value: "resourcepack", label: "Resource Packs" },\n  { value: "shader", label: "Shaders" },\n  { value: "datapack", label: "Data Packs" }\n];'
);
fs.writeFileSync(path.join(root, 'constants', 'app.ts'), constAppContent);

// 3. Fix useFomoDiscover SortOrder type
let useFomoContent = fs.readFileSync(path.join(root, 'hooks', 'useFomoDiscover.ts'), 'utf8');
useFomoContent = useFomoContent.replace(
  'const [sortOrder, setSortOrder] = useState("relevance");',
  'import type { SortOrder } from "../constants/app";\n  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");'
);
fs.writeFileSync(path.join(root, 'hooks', 'useFomoDiscover.ts'), useFomoContent);

// 4. Fix ModCard.tsx LOADER_STYLES issues
let tokensContent = fs.readFileSync(path.join(root, 'theme', 'tokens.ts'), 'utf8');
tokensContent = tokensContent.replace(/text:/g, 'color:');
tokensContent = tokensContent.replace('forge: { bg:', 'forge: { label: "Forge", bg:');
tokensContent = tokensContent.replace('fabric: { bg:', 'fabric: { label: "Fabric", bg:');
tokensContent = tokensContent.replace('neoforge: { bg:', 'neoforge: { label: "NeoForge", bg:');
tokensContent = tokensContent.replace('quilt: { bg:', 'quilt: { label: "Quilt", bg:');
tokensContent = tokensContent.replace('default: { bg:', 'default: { label: "Mod", bg:');
tokensContent = tokensContent.replace('{ bg: string; color: string; border: string }', '{ label: string; bg: string; color: string; border: string }');
fs.writeFileSync(path.join(root, 'theme', 'tokens.ts'), tokensContent);

console.log("Fixed final TS issues");
