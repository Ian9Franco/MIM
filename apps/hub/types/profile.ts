/** Supabase `profiles` row shape used across the Hub UI. */
export interface HubUserProfile {
  id: string;
  username?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
  banner_meta?: HubBannerMeta;
  [key: string]: unknown;
}

export interface HubBannerMeta {
  youtube_channels?: Array<{ name?: string; url?: string; visible?: boolean }>;
  theme?: string;
  [key: string]: unknown;
}
