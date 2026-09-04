/**
 * MIM & FOMO — Shared UI Domain & Entity Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Formal interfaces replacing legacy `any` types across complex UI surfaces:
 * ModDetailsSheet, FomoModHeader, VersionCard, DependencyCard, CommunityDrafts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ModHit } from "@/lib/core/types";

export interface FomoGalleryItem {
  url?: string;
  raw_url?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  featured?: boolean;
  [key: string]: any;
}

export interface FomoVersionFile {
  url: string;
  filename: string;
  primary?: boolean;
  size?: number;
  hashes?: Record<string, string>;
  [key: string]: any;
}

export interface FomoDependencyItem {
  id?: string;
  projectId?: string;
  project_id?: string;
  slug?: string;
  title?: string;
  name?: string;
  description?: string;
  author?: string;
  categories?: any[];
  iconUrl?: string | null;
  icon_url?: string | null;
  dependencyType?: string;
  dependency_type?: string;
  projectType?: string;
  project_type?: string;
  versionId?: string | null;
  version_id?: string | null;
  fileName?: string | null;
  file_name?: string | null;
  url?: string | null;
  _source?: string;
  [key: string]: any;
}

export interface FomoVersion {
  id: string;
  versionNumber?: string;
  version_number?: string;
  name: string;
  versionType?: string;
  version_type?: string;
  gameVersions?: string[];
  game_versions?: string[];
  loaders?: string[];
  loader?: string;
  datePublished?: string | null;
  date_published?: string | null;
  downloads?: number;
  files?: FomoVersionFile[];
  primaryFile?: FomoVersionFile | null;
  changelog?: string;
  changelog_url?: string | null;
  changelogUrl?: string | null;
  dependencies?: FomoDependencyItem[];
  [key: string]: any;
}

export interface FomoModMember {
  name: string;
  role?: string;
  avatar_url?: string;
  [key: string]: any;
}

export interface FomoModCategoryObject {
  name?: string;
  slug?: string;
  id?: string | number;
  [key: string]: any;
}

export type FomoCategory = string | FomoModCategoryObject;

export interface FomoModDetails {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  summary?: string;
  body?: string;
  iconUrl?: string | null;
  icon_url?: string | null;
  author?: string;
  downloads?: number;
  follows?: number;
  categories?: any[];
  client_side?: string;
  server_side?: string;
  clientSide?: string;
  serverSide?: string;
  projectType?: string;
  project_type?: string;
  versions?: FomoVersion[];
  gallery?: FomoGalleryItem[];
  dependencies?: FomoDependencyItem[];
  members?: FomoModMember[];
  license?: { name?: string; id?: string; [key: string]: any };
  organization_info?: { slug?: string; name?: string; icon_url?: string; [key: string]: any };
  wiki_url?: string;
  source_url?: string;
  issues_url?: string;
  discord_url?: string;
  urls?: {
    source?: string;
    wiki?: string;
    issues?: string;
    discord?: string;
  };
  source?: "modrinth" | "curseforge";
  [key: string]: any;
}

export interface ModStackItem {
  mod: ModHit;
  details?: FomoModDetails | null;
  deps?: FomoDependencyItem[];
  [key: string]: any;
}

export interface FomoUserDraftItem {
  projectId: string;
  title?: string;
  iconUrl?: string;
  platform?: string;
  [key: string]: any;
}

export interface FomoUserDraft {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  items?: FomoUserDraftItem[];
  created_at?: string;
  updated_at?: string;
  updatedAt?: string;
  is_public?: boolean;
  user_id?: string;
  author_name?: string;
  [key: string]: any;
}

export interface FomoFollowedAuthor {
  name?: string;
  author_name?: string;
  url?: string;
  authorUrl?: string;
  iconUrl?: string;
  avatar_url?: string;
  platform?: string;
  [key: string]: any;
}

export type FomoFavoriteItem = ModHit | {
  id?: string;
  mod_id?: string;
  project_id?: string;
  projectId?: string;
  slug?: string;
  title?: string;
  author?: string;
  iconUrl?: string | null;
  [key: string]: any;
};

export interface FomoCommunityShare {
  id: string;
  projectId?: string;
  project_id?: string;
  mod_id?: string;
  title?: string;
  sharedBy?: string;
  user_id?: string;
  username?: string;
  avatar_url?: string;
  color?: string | null;
  comment?: string;
  created_at?: string;
  [key: string]: any;
}

export interface FomoUserSession {
  user?: {
    id: string;
    email?: string;
    user_metadata?: {
      avatar_url?: string;
      user_name?: string;
      full_name?: string;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
  [key: string]: any;
}
