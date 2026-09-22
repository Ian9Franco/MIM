"use client";

import { FloatingPlayerWindow } from "@/components/fomo/showcase/FloatingPlayerWindow";
import { useFloatingPlayers } from "@/hooks/fomo/useFloatingPlayers";

export function FomoFloatingPlayer() {
  const {
    mounted,
    players,
    closePlayer,
    focusAudio,
    focusPlayer,
    updatePosition,
    updateSize,
  } = useFloatingPlayers("desktop");

  if (!mounted || players.length === 0) return null;

  return (
    <>
      {players.map((player, index) => (
        <FloatingPlayerWindow
          key={player.id}
          variant="desktop"
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
    </>
  );
}
