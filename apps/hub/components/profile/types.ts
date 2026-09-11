import React from "react";
import type { ModHit } from "../SpotlightMarquees";

export interface ProfileTabProps {
  session: any;
  profile: any;
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
  userDrafts: any[];
  userFavorites: any[];
  userShares?: any[];
  userFollowedAuthors?: any[];
  handleAuth: (e: React.FormEvent) => void;
  handleLogout: () => void;
  handleOpenEditProfile: () => void;
  handleOpenModDetails: (mod: ModHit) => void;
  handleEnterDraftCollection: (draft: any) => void;
  onCreateDraft: () => void;
  onEditDraft?: (draft: any) => void;
  onSearchAuthor?: (name: string, platform: string) => void;
  onRemoveShare?: (projectId: string) => Promise<void>;
  onUpdateSharePriority?: (projectId: string, priority: boolean) => Promise<void>;
}
