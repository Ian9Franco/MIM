export interface ModHit {
  projectId: string;
  slug: string;
  title: string;
  description: string;
  iconUrl: string | null;
  author: string;
  downloads: number;
  follows: number;
  latestVersion: string | null;
  categories: string[];
  dateCreated: string;
  url: string;
  projectType?: string;
  _source?: "modrinth" | "curseforge";
}

export interface CollectionEntry {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl: string | null;
  isLocal?: boolean;
  projects?: ModHit[];
}

export interface PresetEntry {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  iconUrl: string | null;
  tags: string[];
  recommendedLoader: string;
  recommendedVersion: string;
}

export interface VersionEntry {
  id: string;
  versionNumber: string;
  name: string;
  versionType: "release" | "beta" | "alpha";
  gameVersions: string[];
  loaders: string[];
  datePublished: string;
  downloads: number;
  primaryFile: {
    url: string;
    filename: string;
    primary: boolean;
    size: number;
  } | null;
}
