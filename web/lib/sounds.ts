"use client";

export function playFomoSound(kind: "on" | "off" = "on") {
  if (typeof window === "undefined") return;

  try {
    const audio = new Audio(kind === "off" ? "/fomoff.mp3" : "/fomo_sound.mp3");
    audio.volume = 0.08; // Reduced by half again as requested
    audio.play().catch(() => {});
  } catch {
    // Audio is ornamental; never block the interaction.
  }
}
