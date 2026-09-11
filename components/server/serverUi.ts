/** Shared surface styles for MIM Server (Desktop) panels */
export const serverPanelClass =
  "rounded-[2rem] backdrop-blur-xl p-6 md:p-7";
export const serverPanelStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
} as const;
export const serverInputClass =
  "mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-white/5 px-3 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-colors";
