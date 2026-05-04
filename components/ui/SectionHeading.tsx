import React from "react";

export function SectionHeading({ icon, title, sub, badge, accentColor }: {
  icon: React.ReactNode; title: string; sub?: string; badge?: number; accentColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: accentColor ? `color-mix(in srgb, ${accentColor} 12%, transparent)` : "rgba(187,150,228,0.1)",
          border: `1px solid ${accentColor ? `color-mix(in srgb, ${accentColor} 22%, transparent)` : "rgba(187,150,228,0.18)"}`,
          color: accentColor ?? "var(--color-primary)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h2 className="font-headline text-base leading-none" style={{ color: "var(--color-foreground)" }}>
            {title}
          </h2>
          {badge !== undefined && badge > 0 && (
            <span
              className="font-label rounded-full px-2 py-0.5 animate-fade-in"
              style={{ background: "var(--color-accent)", color: "#1a0a00", fontSize: "0.6rem" }}
            >
              {badge}
            </span>
          )}
        </div>
        {sub && <p className="font-caption mt-0.5" style={{ color: "var(--color-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}
