"use client";

import { HUB_NAV_TABS } from "./BottomNav";

interface DesktopSideNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

/** Persistent left rail for desktop — mirrors BottomNav destinations. */
export function DesktopSideNav({ activeTab, setActiveTab }: DesktopSideNavProps) {
  return (
    <aside
      className="hidden md:flex md:flex-col md:w-56 lg:w-64 shrink-0 border-r sticky top-0 h-dvh z-40"
      style={{
        borderColor: "var(--color-border)",
        background: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
        backdropFilter: "blur(16px)",
      }}
      aria-label="Navegación principal"
    >
      <div className="px-5 pt-7 pb-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/35">FOMO HUB</p>
        <h2 className="mt-1 text-lg font-black tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Escritorio
        </h2>
      </div>

      <nav className="flex-1 px-3 pb-6 space-y-1 overflow-y-auto">
        {HUB_NAV_TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setActiveTab(id)}
              className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              style={{
                background: active
                  ? "linear-gradient(155deg, color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)), var(--color-card))"
                  : "transparent",
                border: active
                  ? "1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border-strong))"
                  : "1px solid transparent",
                color: active
                  ? "var(--color-foreground)"
                  : "color-mix(in srgb, var(--color-foreground) 68%, transparent)",
              }}
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0"
                style={{ color: active ? "var(--color-primary)" : "currentColor" }}
                strokeWidth={active ? 2.35 : 2.05}
              />
              <span className="text-sm font-semibold truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
