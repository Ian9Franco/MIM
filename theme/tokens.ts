export const COLORS = {
  primary: "var(--color-primary)",
  foreground: "var(--color-foreground)",
  muted: "var(--color-muted)",
  border: "var(--color-border)",
  borderStrong: "var(--color-border-strong)",
  card: "var(--color-card)",
  fomoFlame: "#FF6C3E",
  wisteria: "#BB96E4",
  red: "var(--color-danger)",
  redBg: "var(--color-danger-bg)",
  emerald: "var(--color-emerald)",
  accent: "var(--color-accent)",
  gold: "var(--color-accent)", // Use accent variable to ensure contrast
  curseforgeOrange: "#EF6C00"
};

export type LoaderKey = "forge" | "fabric" | "neoforge" | "quilt";
export const LOADER_STYLES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  forge: { label: "Forge", bg: "rgba(59,130,246,0.1)", color: "#60A5FA", border: "rgba(59,130,246,0.2)" },
  fabric: { label: "Fabric", bg: "rgba(139,92,246,0.1)", color: "#A78BFA", border: "rgba(139,92,246,0.2)" },
  neoforge: { label: "NeoForge", bg: "rgba(6,182,212,0.1)", color: "#22D3EE", border: "rgba(6,182,212,0.2)" },
  quilt: { label: "Quilt", bg: "rgba(236,72,153,0.1)", color: "#F472B6", border: "rgba(236,72,153,0.2)" },
  default: { label: "Mod", bg: "rgba(255,255,255,0.05)", color: "#A3A3A3", border: "rgba(255,255,255,0.1)" }
};
