import { ModHit, VersionEntry } from "@/lib/core/types";

export interface PendingDependency {
  projectId: string;
  title: string;
  slug?: string;
  iconUrl: string | null;
  projectType: string;
  url?: string;
}

export interface DependencyPrompt {
  mod: ModHit;
  dependencies: PendingDependency[];
  version: VersionEntry;
  downloadUrl: string;
  filename: string;
  hashes?: Record<string, string>;
}
