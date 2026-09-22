import type { FloatingPlayerInstance } from "@/lib/fomo/floatingPlayers";

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
      const baseW = isShort
        ? ({ mini: 200, normal: 280, maxi: 360 } as const)[size]
        : ({ mini: 350, normal: 550, maxi: 800 } as const)[size];
      const w = Math.min(baseW, window.innerWidth - 16);
      const h = isShort ? Math.round((w * 16) / 9) : Math.round((w * 9) / 16);
      const chrome = size === "mini" ? 36 : 96;
      return { w, h: h + chrome };
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
