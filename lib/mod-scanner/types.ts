export interface EnhancedModMeta {
  modId: string;
  modName: string;
  modVersion: string;
  gameVersion: string;
  loader: string;
  projectType: string;
  isCompatibleWithConnector: boolean;
  author?: string;
  iconBase64?: string;
  sha1?: string;
  description?: string;
  website?: string;
  issues?: string;
  sources?: string;
  license?: string;
  dependencies?: Array<{
    modId: string;
    version?: string;
    type: "required" | "optional" | "incompatible";
  }>;
  extractionQuality: "high" | "medium" | "low";
  extractionWarnings: string[];
  mixinTargets?: string[];
}

export const UNKNOWN = "unknown";
