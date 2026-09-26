const STORAGE_KEY = "fomo_player_prefs";

export type FomoPlayerPrefs = {
  showControls: boolean;
  captions: boolean;
};

const DEFAULT_PREFS: FomoPlayerPrefs = {
  showControls: true,
  captions: false,
};

export function readPlayerPrefs(): FomoPlayerPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<FomoPlayerPrefs>;
    return {
      showControls: parsed.showControls !== false,
      captions: parsed.captions === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePlayerPrefs(prefs: FomoPlayerPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
