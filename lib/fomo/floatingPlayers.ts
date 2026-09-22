import type { PlayerSizeKey } from "@/lib/fomo/playVideo";
import { getPlayerFullHeight, getPlayerVideoSize } from "@/lib/fomo/playVideo";

export const MAX_FLOATING_PLAYERS = 3;

export type FloatingPlayerInstance = {
  id: string;
  videoId: string;
  isShort: boolean;
  position: { x: number; y: number };
  size: PlayerSizeKey;
  hasAudio: boolean;
  zIndex: number;
};

function createPlayerId(): string {
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultPlayerPosition(
  slotIndex: number,
  size: PlayerSizeKey,
  isShort: boolean,
): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 20, y: 20 };
  const { w } = getPlayerVideoSize(size, isShort);
  const h = getPlayerFullHeight(size, isShort);
  const baseX = window.innerWidth - w - 40;
  const baseY = window.innerHeight - h - 40;
  const stagger = slotIndex * 36;
  return { x: baseX - stagger, y: baseY - stagger };
}

export function openFloatingPlayer(
  players: FloatingPlayerInstance[],
  videoId: string,
  isShort: boolean,
): FloatingPlayerInstance[] {
  const maxZ = players.reduce((max, p) => Math.max(max, p.zIndex), 9998);

  const existing = players.find((p) => p.videoId === videoId);
  if (existing) {
    return players.map((p) => ({
      ...p,
      hasAudio: p.id === existing.id,
      zIndex: p.id === existing.id ? maxZ + 1 : p.zIndex,
    }));
  }

  const openSize: PlayerSizeKey = isShort ? "normal" : "mini";
  let next = players.map((p) => ({ ...p, hasAudio: false }));

  if (next.length >= MAX_FLOATING_PLAYERS) {
    next = next.slice(1);
  }

  const slotIndex = next.length;
  const newPlayer: FloatingPlayerInstance = {
    id: createPlayerId(),
    videoId,
    isShort,
    position: defaultPlayerPosition(slotIndex, openSize, isShort),
    size: openSize,
    hasAudio: true,
    zIndex: maxZ + 1,
  };

  return [...next, newPlayer];
}

export function closeFloatingPlayer(
  players: FloatingPlayerInstance[],
  id: string,
): FloatingPlayerInstance[] {
  const closing = players.find((p) => p.id === id);
  if (!closing) return players;

  const remaining = players.filter((p) => p.id !== id);
  if (remaining.length === 0) return [];

  if (!closing.hasAudio) return remaining;

  const audioTarget = remaining[remaining.length - 1];
  return remaining.map((p) => ({ ...p, hasAudio: p.id === audioTarget.id }));
}

export function setFloatingPlayerAudio(
  players: FloatingPlayerInstance[],
  id: string,
): FloatingPlayerInstance[] {
  return players.map((p) => ({ ...p, hasAudio: p.id === id }));
}

export function bringFloatingPlayerToFront(
  players: FloatingPlayerInstance[],
  id: string,
): FloatingPlayerInstance[] {
  const maxZ = players.reduce((max, p) => Math.max(max, p.zIndex), 9998);
  return players.map((p) => ({
    ...p,
    zIndex: p.id === id ? maxZ + 1 : p.zIndex,
  }));
}

export function updateFloatingPlayer(
  players: FloatingPlayerInstance[],
  id: string,
  patch: Partial<Pick<FloatingPlayerInstance, "position" | "size">>,
): FloatingPlayerInstance[] {
  return players.map((p) => (p.id === id ? { ...p, ...patch } : p));
}
