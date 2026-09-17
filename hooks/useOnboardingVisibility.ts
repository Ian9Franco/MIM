"use client";

import { useCallback, useEffect, useState } from "react";
import {
  shouldShowPanelOnboarding,
  SHOW_ONBOARDING_EVENT,
} from "@/lib/guides/guidesSettings";
import { useGuidesEnabled } from "@/hooks/useGuidesEnabled";

/**
 * Controls whether a contextual onboarding tour is visible.
 * @param seenStorageKey localStorage key set when the user completes the tour
 * @param active whether the host panel/modal is open
 */
export function useOnboardingVisibility(seenStorageKey: string, active = true) {
  const { enabled: guidesEnabled } = useGuidesEnabled();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const dismiss = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  useEffect(() => {
    if (!active) {
      setShowOnboarding(false);
      return;
    }
    if (!guidesEnabled) {
      const seen = localStorage.getItem(seenStorageKey);
      setShowOnboarding(!seen);
      return;
    }
    setShowOnboarding(shouldShowPanelOnboarding(seenStorageKey));
  }, [seenStorageKey, active, guidesEnabled]);

  useEffect(() => {
    const handleForce = (event: Event) => {
      const enabled = (event as CustomEvent<boolean>).detail;
      if (!enabled) {
        setShowOnboarding(false);
      }
    };
    window.addEventListener(SHOW_ONBOARDING_EVENT, handleForce);
    return () => window.removeEventListener(SHOW_ONBOARDING_EVENT, handleForce);
  }, []);

  return { showOnboarding, dismiss };
}
