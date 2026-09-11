import React from "react";
import type { ModHit } from "../SpotlightMarquees";
import type {
  FomoFavoriteItem,
  FomoCommunityShare,
  FomoFollowedAuthor,
} from "../../types/fomo";
import type { HomeDraft } from "../../lib/drafts/draftContract";
import type { HubUserProfile } from "../../types/profile";
import type { FomoUserSession } from "../../types/fomo";
import type { Fn } from "../../types/fn";

export interface ProfileTabProps {
  session: FomoUserSession | null;
  profile: HubUserProfile | null;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  isRegistering: boolean;
  setIsRegistering: (v: boolean) => void;
  authLoading: boolean;
  loadingUserData: boolean;
  userDrafts: HomeDraft[];
  userFavorites: FomoFavoriteItem[];
  userShares?: FomoCommunityShare[];
  userFollowedAuthors?: FomoFollowedAuthor[];
  handleAuth: (e: React.FormEvent) => void;
  handleLogout: () => void;
  handleOpenEditProfile: () => void;
  handleOpenModDetails: (mod: ModHit) => void;
  handleEnterDraftCollection: Fn<[HomeDraft]>;
  onCreateDraft: Fn<[]>;
  onEditDraft?: Fn<[HomeDraft]>;
  onSearchAuthor?: (name: string, platform: string) => void;
  onRemoveShare?: (projectId: string) => Promise<void>;
  onUpdateSharePriority?: (projectId: string, priority: boolean) => Promise<void>;
}
