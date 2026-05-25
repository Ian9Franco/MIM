/** Snapshot público del resumen de un usuario en MIM Cloud. */

export interface ClubModEntry {
  projectId: string;
  title: string;
  author?: string;
  iconUrl?: string | null;
  platform?: string;
  projectType?: string;
  gameVersion?: string;
  modloader?: string;
}

export interface ClubAuthorEntry {
  name: string;
  iconUrl?: string | null;
}

export interface UserResumenData {
  mods: ClubModEntry[];
  authors: ClubAuthorEntry[];
  youtubeChannels: string[];
  updatedAt?: string;
}

export interface CommunityResumenMember {
  id: string;
  username: string;
  avatar_url?: string | null;
  color?: string | null;
  resumen: UserResumenData;
  /** Tiene fila en profiles.resumen_data (aunque esté vacío). */
  hasCloudResumen?: boolean;
}

export const EMPTY_CLUB: UserResumenData = {
  mods: [],
  authors: [],
  youtubeChannels: [],
};

