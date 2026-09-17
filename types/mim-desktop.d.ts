export type MimUpdaterStatusKind =
  | "checking"
  | "update-available"
  | "update-not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface MimUpdaterStatus {
  status: MimUpdaterStatusKind;
  current?: string;
  latest?: string | null;
  percent?: number;
  message?: string;
  supported?: boolean;
  reason?: "portable" | "development" | "unsupported";
}

export interface MimDesktopVersionInfo {
  current: string;
  supported: boolean;
  latest?: string | null;
  reason?: MimUpdaterStatus["reason"];
}

export interface MimDesktopApi {
  isDesktop: boolean;
  getVersion: () => Promise<MimDesktopVersionInfo>;
  checkForUpdates: () => Promise<{
    supported: boolean;
    current?: string;
    latest?: string | null;
    updateAvailable?: boolean;
    reason?: MimUpdaterStatus["reason"];
  }>;
  downloadUpdate: () => Promise<{ ok?: boolean; supported?: boolean; reason?: MimUpdaterStatus["reason"] }>;
  installUpdate: () => Promise<{ ok?: boolean; supported?: boolean; reason?: MimUpdaterStatus["reason"] }>;
  onUpdaterStatus: (callback: (status: MimUpdaterStatus) => void) => () => void;
}

declare global {
  interface Window {
    mimDesktop?: MimDesktopApi;
  }
}

export {};
