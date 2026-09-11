"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Compass, Film, Flame, Search, User, Users } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TABS = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "spotlight", label: "Spotlight", icon: Flame },
  { id: "discover", label: "Explorar", icon: Search },
  { id: "collections", label: "Colecciones", icon: Compass },
  { id: "feed", label: "Canales", icon: Film },
  { id: "rankings", label: "Comunidad", icon: Users },
];

/** A single continuous navigation surface keeps six destinations compact and calm. */
export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const reducedMotion = useReducedMotion();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-4 pb-4 pt-3" aria-label="Navegación principal">
      <div
        className="pointer-events-auto grid grid-cols-6 gap-0.5 rounded-[22px] border px-1.5 py-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.46)] backdrop-blur-2xl"
        style={{ background: "color-mix(in srgb, var(--color-surface) 92%, transparent)", borderColor: "var(--color-border-strong)" }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <motion.button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              aria-label={label}
              onClick={() => setActiveTab(id)}
              whileTap={reducedMotion ? undefined : { scale: .94, y: 2 }}
              className="group relative flex h-12 min-w-0 select-none flex-col items-center justify-center gap-0.5 rounded-2xl focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              {active && (
                <motion.span
                  layoutId={reducedMotion ? undefined : "bottom-nav-selection"}
                  className="absolute inset-0 rounded-2xl border"
                  style={{ background: "linear-gradient(155deg, color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)), var(--color-card))", borderColor: "color-mix(in srgb, var(--color-primary) 35%, var(--color-border-strong))", boxShadow: "0 3px 0 color-mix(in srgb, var(--color-primary) 20%, var(--color-background)), 0 6px 10px #0003" }}
                  transition={{ duration: reducedMotion ? 0 : .3, ease: [.22, 1, .36, 1] }}
                >
                  <span className="absolute inset-x-3 top-0 h-px" style={{ background: "var(--color-primary)", boxShadow: "0 0 10px var(--color-primary)" }} />
                </motion.span>
              )}

              {/* Icon and label move as one unit; no decorative circle competes with them. */}
              <motion.span animate={{ y: active && !reducedMotion ? -2 : 0, scale: active && !reducedMotion ? 1.08 : 1 }} transition={{ duration: reducedMotion ? 0 : .2 }} className="relative z-10 flex items-center justify-center">
                <Icon className="h-[17px] w-[17px]" style={{ color: active ? "var(--color-primary)" : "var(--color-muted)" }} strokeWidth={active ? 2.35 : 1.8} />
              </motion.span>
              <span className="relative z-10 block w-full truncate px-0.5 text-center text-[7.5px] font-semibold" style={{ color: active ? "var(--color-foreground)" : "var(--color-muted)", opacity: active ? 1 : 0.62 }}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
