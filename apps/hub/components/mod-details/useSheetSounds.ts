"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSoundSettings, setSoundMuted, playFomoSound } from "../../lib/sounds";
import { releaseGlobalSheetLocks } from "./utils";

export function useSheetSounds(onClose: () => void) {
  const [muted, setMuted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeStartedRef = useRef(false);

  useEffect(() => {
    const settings = getSoundSettings();
    setMuted(settings.muted);

    const handleSettingsChange = () => {
      const updated = getSoundSettings();
      setMuted(updated.muted);
    };

    window.addEventListener("fomo_sounds_changed", handleSettingsChange);
    return () => {
      window.removeEventListener("fomo_sounds_changed", handleSettingsChange);
    };
  }, []);

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const current = getSoundSettings().muted;
    setSoundMuted(!current);
  }, []);

  const closeWithSound = useCallback(() => {
    if (closeStartedRef.current) return;
    closeStartedRef.current = true;
    setIsClosing(true);
    releaseGlobalSheetLocks();
    playFomoSound("off");
    onClose();
  }, [onClose]);

  const resetCloseState = useCallback(() => {
    closeStartedRef.current = false;
    setIsClosing(false);
  }, []);

  return {
    muted,
    isClosing,
    handleToggleMute,
    closeWithSound,
    resetCloseState,
  };
}
