"use client";

import { useCallback, useEffect, useState } from "react";
import type { FomoPlayVideoDetail } from "@/lib/fomo/playVideo";
import {
  bringFloatingPlayerToFront,
  closeFloatingPlayer,
  openFloatingPlayer,
  setFloatingPlayerAudio,
  updateFloatingPlayer,
  type FloatingPlayerInstance,
} from "@/lib/fomo/floatingPlayers";
import type { PlayerSizeKey } from "@/lib/fomo/playVideo";
import { clampFloatingPlayerPositions } from "@/lib/fomo/floatingPlayerLayout";

export function useFloatingPlayers(variant: "desktop" | "hub" = "desktop") {
  const [players, setPlayers] = useState<FloatingPlayerInstance[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handlePlay = (event: Event) => {
      const detail = (event as CustomEvent<FomoPlayVideoDetail>).detail;
      if (!detail?.videoId) return;
      setPlayers((prev) => openFloatingPlayer(prev, detail.videoId, Boolean(detail.isShort)));
    };

    const handleResize = () => {
      setPlayers((prev) => clampFloatingPlayerPositions(prev, variant));
    };

    window.addEventListener("fomo-play-video", handlePlay);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("fomo-play-video", handlePlay);
      window.removeEventListener("resize", handleResize);
    };
  }, [variant]);

  const closePlayer = useCallback((id: string) => {
    setPlayers((prev) => closeFloatingPlayer(prev, id));
  }, []);

  const focusAudio = useCallback((id: string) => {
    setPlayers((prev) => setFloatingPlayerAudio(prev, id));
  }, []);

  const focusPlayer = useCallback((id: string) => {
    setPlayers((prev) => bringFloatingPlayerToFront(prev, id));
  }, []);

  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    setPlayers((prev) => updateFloatingPlayer(prev, id, { position }));
  }, []);

  const updateSize = useCallback((id: string, size: PlayerSizeKey) => {
    setPlayers((prev) => updateFloatingPlayer(prev, id, { size }));
  }, []);

  return {
    mounted,
    players,
    closePlayer,
    focusAudio,
    focusPlayer,
    updatePosition,
    updateSize,
  };
}
