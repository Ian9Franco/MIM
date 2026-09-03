"use client";

export type FomoSoundKind = "on" | "off" | "pop" | "sparkle";

const SOUND_CONFIG: Record<FomoSoundKind, { src: string; volume: number }> = {
  on: { src: "/fomo_sound.mp3", volume: 0.01 },
  off: { src: "/fomoff.mp3", volume: 0.008 },
  pop: { src: "/fomo_sound.mp3", volume: 0.01 },
  sparkle: { src: "/fomo_sound.mp3", volume: 0.012 },
};

const POOL_SIZE = 3;
let pools: Partial<Record<FomoSoundKind, HTMLAudioElement[]>> = {};
let poolCursor: Record<FomoSoundKind, number> = { on: 0, off: 0, pop: 0, sparkle: 0 };
let preloadStarted = false;
let unlockStarted = false;

function getPool(kind: FomoSoundKind) {
  if (typeof window === "undefined") return [];

  if (!pools[kind]) {
    const config = SOUND_CONFIG[kind];
    pools[kind] = Array.from({ length: POOL_SIZE }, () => {
      const audio = new Audio(config.src);
      audio.preload = "auto";
      audio.volume = config.volume;
      audio.load();
      return audio;
    });
  }

  return pools[kind] || [];
}

export function preloadFomoSounds() {
  if (typeof window === "undefined" || preloadStarted) return;
  preloadStarted = true;

  (["on", "off"] as FomoSoundKind[]).forEach((kind) => {
    getPool(kind).forEach((audio) => {
      try {
        audio.load();
      } catch {
        // Decorative audio only.
      }
    });
  });
}

function unlockFomoSounds() {
  if (unlockStarted) return;
  unlockStarted = true;
  preloadFomoSounds();

  (["on", "off"] as FomoSoundKind[]).forEach((kind) => {
    const audio = getPool(kind)[0];
    if (!audio) return;

    const previousVolume = audio.volume;
    audio.muted = true;
    audio.volume = 0;
    audio.currentTime = 0;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {})
      .finally(() => {
        audio.muted = false;
        audio.volume = previousVolume;
      });
  });
}

if (typeof window !== "undefined") {
  window.setTimeout(preloadFomoSounds, 250);
  window.addEventListener("pointerdown", unlockFomoSounds, { once: true, passive: true });
  window.addEventListener("keydown", unlockFomoSounds, { once: true });
}

export function getSoundSettings() {
  if (typeof window === "undefined") return { muted: false, volume: 1.0 };
  try {
    const mutedVal = localStorage.getItem("fomo_sounds_muted");
    const volVal = localStorage.getItem("fomo_sounds_volume");
    return {
      muted: mutedVal === "true",
      volume: volVal !== null ? parseFloat(volVal) : 1.0,
    };
  } catch {
    return { muted: false, volume: 1.0 };
  }
}

export function setSoundMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("fomo_sounds_muted", String(muted));
    window.dispatchEvent(new Event("fomo_sounds_changed"));
  } catch {}
}

export function setSoundVolume(volume: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("fomo_sounds_volume", String(volume));
    window.dispatchEvent(new Event("fomo_sounds_changed"));
  } catch {}
}

export function playFomoSound(kind: FomoSoundKind = "on") {
  if (typeof window === "undefined") return;

  const settings = getSoundSettings();
  if (settings.muted) return;

  try {
    const pool = getPool(kind);
    const audio = pool[poolCursor[kind] % pool.length];
    poolCursor[kind] += 1;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.volume = SOUND_CONFIG[kind].volume * settings.volume;
    audio.play().catch(() => {});
  } catch {
    // Audio is ornamental; never block the interaction.
  }
}
