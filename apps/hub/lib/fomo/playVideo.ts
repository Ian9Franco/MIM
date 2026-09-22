export const MAX_FLOATING_PLAYERS = 3;

export type FomoPlayVideoDetail = {
  videoId: string;
  isShort?: boolean;
};

export type PlayerSizeKey = "mini" | "normal" | "maxi";

export function playFomoVideo(videoId: string, opts?: { isShort?: boolean }): void {
  if (!videoId) return;
  window.dispatchEvent(
    new CustomEvent<FomoPlayVideoDetail>("fomo-play-video", {
      detail: { videoId, isShort: Boolean(opts?.isShort) },
    }),
  );
}

const CHROME_HEIGHT = 92;

export function getPlayerVideoSize(size: PlayerSizeKey, isShort: boolean): { w: number; h: number } {
  if (isShort) {
    const widths: Record<PlayerSizeKey, number> = { mini: 200, normal: 280, maxi: 360 };
    const w = widths[size];
    return { w, h: Math.round((w * 16) / 9) };
  }
  const landscape: Record<PlayerSizeKey, { w: number; h: number }> = {
    mini: { w: 350, h: 197 },
    normal: { w: 550, h: 310 },
    maxi: { w: 800, h: 450 },
  };
  return landscape[size];
}

export function getPlayerFullHeight(size: PlayerSizeKey, isShort: boolean): number {
  return getPlayerVideoSize(size, isShort).h + CHROME_HEIGHT;
}

export function cyclePlayerSize(current: PlayerSizeKey): PlayerSizeKey {
  if (current === "mini") return "normal";
  if (current === "normal") return "maxi";
  return "mini";
}

export function playerSizeLabel(size: PlayerSizeKey): string {
  if (size === "mini") return "Mini";
  if (size === "normal") return "Normal";
  return "Maxi";
}
