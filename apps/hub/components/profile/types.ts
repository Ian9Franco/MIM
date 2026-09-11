import React from "react";
import type { ModHit } from "../SpotlightMarquees";
import type {
  FomoUserDraft,
  FomoFavoriteItem,
  FomoCommunityShare,
  FomoFollowedAuthor,
} from "../../types/fomo";
import type { Session } from "@supabase/supabase-js";

export interface ProfileTabProps {
  session: Session | null;
  profile: Record<string, any> | null;
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
  userDrafts: FomoUserDraft[];
  userFavorites: FomoFavoriteItem[];
  userShares?: FomoCommunityShare[];
  userFollowedAuthors?: FomoFollowedAuthor[];
  handleAuth: (e: React.FormEvent) => void;
  handleLogout: () => void;
  handleOpenEditProfile: () => void;
  handleOpenModDetails: (mod: ModHit) => void;
  handleEnterDraftCollection: (draft: FomoUserDraft) => void;
  onCreateDraft: () => void;
  onEditDraft?: (draft: FomoUserDraft) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
  onRemoveShare?: (projectId: string) => Promise<void>;
  onUpdateSharePriority?: (projectId: string, priority: boolean) => Promise<void>;
}
