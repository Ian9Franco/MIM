import type { FloatingPlayerInstance } from "@/lib/fomo/floatingPlayers";
import type { PlayerSizeKey } from "@/lib/fomo/playVideo";

const HUB_LANDSCAPE_WIDTH_RATIO: Record<PlayerSizeKey, number> = {
  mini: 0.5,
  normal: 0.72,
  maxi: 1,
};
const HUB_LANDSCAPE_WIDTH_CAP: Record<PlayerSizeKey, number> = {
  mini: 220,
  normal: 340,
  maxi: 800,
};
const HUB_SHORT_BASE_WIDTH: Record<PlayerSizeKey, number> = {
  mini: 200,
  normal: 280,
  maxi: 360,
};

/** Hub floating player video viewport — viewport-relative on mobile so sizes stay distinct. */
export function getHubPlayerVideoSize(
  size: PlayerSizeKey,
  isShort: boolean,
  viewportWidth?: number,
): { w: number; h: number } {
  const innerWidth = viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 390);
  const available = innerWidth - 16;
  const w = isShort
    ? Math.min(HUB_SHORT_BASE_WIDTH[size], available)
    : Math.min(
        Math.round(available * HUB_LANDSCAPE_WIDTH_RATIO[size]),
        HUB_LANDSCAPE_WIDTH_CAP[size],
      );
  const h = isShort ? Math.round((w * 16) / 9) : Math.round((w * 9) / 16);
  return { w, h };
}

export function getHubPlayerFullHeight(
  size: PlayerSizeKey,
  isShort: boolean,
  viewportWidth?: number,
): number {
  return getHubPlayerVideoSize(size, isShort, viewportWidth).h + (size === "mini" ? 36 : 96);
}

export function clampFloatingPlayerPositions(
  players: FloatingPlayerInstance[],
  variant: "desktop" | "hub" = "desktop",
): FloatingPlayerInstance[] {
  if (typeof window === "undefined" || players.length === 0) return players;

  const EDGE = 10;

  const measure = (player: FloatingPlayerInstance) => {
    const isShort = player.isShort;
    const size = player.size;
    if (variant === "hub") {
      const { w } = getHubPlayerVideoSize(size, isShort);
      return { w, h: getHubPlayerFullHeight(size, isShort) };
    }

    const landscape = {
      mini: { w: 350, h: 197 },
      normal: { w: 550, h: 310 },
      maxi: { w: 800, h: 450 },
    } as const;
    const shortWidths = { mini: 200, normal: 280, maxi: 360 } as const;
    const w = isShort ? shortWidths[size] : landscape[size].w;
    const videoH = isShort ? Math.round((w * 16) / 9) : landscape[size].h;
    return { w, h: videoH + 92 };
  };

  return players.map((player) => {
    const { w, h } = measure(player);
    const maxX = Math.max(EDGE, window.innerWidth - w - EDGE);
    const maxY = Math.max(EDGE, window.innerHeight - h - EDGE);
    return {
      ...player,
      position: {
        x: Math.max(EDGE, Math.min(player.position.x, maxX)),
        y: Math.max(EDGE, Math.min(player.position.y, maxY)),
      },
    };
  });
}
