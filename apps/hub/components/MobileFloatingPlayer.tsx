"use client";

import { AnimatePresence } from "framer-motion";
import { FloatingPlayerWindow } from "../../../components/fomo/showcase/FloatingPlayerWindow";
import { useFloatingPlayers } from "../../../hooks/fomo/useFloatingPlayers";

export function MobileFloatingPlayer() {
  const {
    mounted,
    players,
    closePlayer,
    focusAudio,
    focusPlayer,
    updatePosition,
    updateSize,
  } = useFloatingPlayers("hub");

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {players.map((player, index) => (
        <FloatingPlayerWindow
          key={player.id}
          variant="hub"
          videoId={player.videoId}
          isShort={player.isShort}
          size={player.size}
          position={player.position}
          hasAudio={player.hasAudio}
          zIndex={player.zIndex}
          slotIndex={index}
          totalPlayers={players.length}
          onClose={() => closePlayer(player.id)}
          onRequestAudio={() => focusAudio(player.id)}
          onFocus={() => focusPlayer(player.id)}
          onPositionChange={(position) => updatePosition(player.id, position)}
          onSizeChange={(size) => updateSize(player.id, size)}
        />
      ))}
    </AnimatePresence>
  );
}
