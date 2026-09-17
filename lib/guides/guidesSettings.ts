export const GUIDES_STORAGE_KEY = "guides_enabled";
export const GUIDES_CHANGED_EVENT = "mim-guides-changed";
export const SHOW_ONBOARDING_EVENT = "show-onboarding";

export function isGuidesEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUIDES_STORAGE_KEY) === "true";
}

export function setGuidesEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUIDES_STORAGE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent(GUIDES_CHANGED_EVENT, { detail: enabled }));
  window.dispatchEvent(new CustomEvent(SHOW_ONBOARDING_EVENT, { detail: enabled }));
}

export function toggleGuidesEnabled(): boolean {
  const next = !isGuidesEnabled();
  setGuidesEnabled(next);
  return next;
}

/** True when the panel tour should appear (first visit or guides forced on). */
export function shouldShowPanelOnboarding(seenStorageKey: string): boolean {
  const seen = localStorage.getItem(seenStorageKey);
  return !seen || isGuidesEnabled();
}

const ONBOARDING_SEEN_KEYS = [
  "onboarding_main",
  "onboarding_mimu",
  "onboarding_fomo",
  "onboarding_sage",
  "onboarding_tweak",
  "onboarding_alrt",
  "onboarding_gate",
  "onboarding_settings",
  "onboarding_staging",
] as const;

export function resetAllOnboardingProgress(): void {
  if (typeof window === "undefined") return;
  for (const key of ONBOARDING_SEEN_KEYS) {
    localStorage.removeItem(key);
  }
  setGuidesEnabled(true);
}
