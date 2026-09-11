import React from "react";
import type { ModHit } from "../SpotlightMarquees";
import type {
  FomoFavoriteItem,
  FomoCommunityShare,
  FomoFollowedAuthor,
} from "../../types/fomo";
import type { HomeDraft } from "../../lib/drafts/draftContract";
import type { HubUserProfile } from "../../types/profile";
import type { Session } from "@supabase/supabase-js";

export interface ProfileTabProps {
  session: Session | null;
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
  handleEnterDraftCollection: (_draft: HomeDraft) => void;
  onCreateDraft: () => void;
  onEditDraft?: (_draft: HomeDraft) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
  onRemoveShare?: (projectId: string) => Promise<void>;
  onUpdateSharePriority?: (projectId: string, priority: boolean) => Promise<void>;
}
