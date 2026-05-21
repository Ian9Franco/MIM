/** Snapshot público del club de un usuario en MIM Cloud. */

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

export interface UserClubData {
  mods: ClubModEntry[];
  authors: ClubAuthorEntry[];
  youtubeChannels: string[];
  updatedAt?: string;
}

export interface CommunityClubMember {
  id: string;
  username: string;
  avatar_url?: string | null;
  color?: string | null;
  club: UserClubData;
  /** Tiene fila en profiles.club_data (aunque esté vacío). */
  hasCloudClub?: boolean;
}

export const EMPTY_CLUB: UserClubData = {
  mods: [],
  authors: [],
  youtubeChannels: [],
};
