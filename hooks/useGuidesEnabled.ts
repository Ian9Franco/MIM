"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GUIDES_CHANGED_EVENT,
  isGuidesEnabled,
  setGuidesEnabled,
  toggleGuidesEnabled,
} from "@/lib/guides/guidesSettings";

export function useGuidesEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isGuidesEnabled());

    const handleChange = (event: Event) => {
      const custom = event as CustomEvent<boolean>;
      setEnabled(Boolean(custom.detail));
    };

    const handleStorage = () => {
      setEnabled(isGuidesEnabled());
    };

    window.addEventListener(GUIDES_CHANGED_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(GUIDES_CHANGED_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const update = useCallback((next: boolean) => {
    setGuidesEnabled(next);
    setEnabled(next);
  }, []);

  const toggle = useCallback(() => {
    const next = toggleGuidesEnabled();
    setEnabled(next);
    return next;
  }, []);

  return { enabled, setEnabled: update, toggle };
}
