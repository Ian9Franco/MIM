"use client";

export function playFomoSound(kind: "on" | "off" = "on") {
  if (typeof window === "undefined") return;

  try {
    const audio = new Audio(kind === "off" ? "/fomoff.mp3" : "/fomo_sound.mp3");
    audio.volume = 0.17; // Reduced by half
    audio.play().catch(() => {});
  } catch {
    // Audio is ornamental; never block the interaction.
  }
}
