"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, Film, Flame, Search, User, Users } from "lucide-react";
import { useNavScrollCompress } from "../hooks/useNavScrollCompress";

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

const SHELL_SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.82 };

/** A single continuous navigation surface keeps six destinations compact and calm. */
export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const reducedMotion = useReducedMotion();
  const scrollCompressed = useNavScrollCompress(8);
  const [interacting, setInteracting] = useState(false);
  const isCompact = scrollCompressed && !interacting;

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-4 pb-4 pt-3"
      aria-label="Navegación principal"
    >
      <motion.div
        className="pointer-events-auto origin-bottom"
        animate={
          reducedMotion
            ? { scale: 1, y: 0, opacity: 1 }
            : isCompact
              ? { scale: 0.84, y: 10, opacity: 0.94 }
              : { scale: 1, y: 0, opacity: 1 }
        }
        transition={reducedMotion ? { duration: 0 } : SHELL_SPRING}
        onPointerEnter={() => setInteracting(true)}
        onPointerLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setInteracting(false);
          }
        }}
      >
        <motion.div
          className="mim-bottom-nav-shell relative overflow-hidden rounded-[22px] border shadow-[0_18px_48px_rgba(0,0,0,0.46)] backdrop-blur-2xl"
          animate={
            reducedMotion
              ? { paddingLeft: 6, paddingRight: 6, paddingTop: 6, paddingBottom: 6 }
              : isCompact
                ? { paddingLeft: 4, paddingRight: 4, paddingTop: 4, paddingBottom: 4 }
                : { paddingLeft: 6, paddingRight: 6, paddingTop: 6, paddingBottom: 6 }
          }
          transition={reducedMotion ? { duration: 0 } : SHELL_SPRING}
          style={{ borderColor: "var(--color-border-strong)" }}
        >
          <span aria-hidden className="mim-bottom-nav-liquid" />
          <span aria-hidden className="mim-bottom-nav-glass-edge" />

          <div className="relative z-10 grid grid-cols-6 gap-0.5">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  onClick={() => setActiveTab(id)}
                  whileTap={reducedMotion ? undefined : { scale: 0.94, y: 2 }}
                  className={`mim-bottom-nav-item group relative flex h-12 min-w-0 select-none flex-col items-center justify-center gap-0.5 rounded-2xl focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${active ? "is-active" : ""}`}
                >
                  {active && (
                    <motion.span
                      layoutId={reducedMotion ? undefined : "bottom-nav-selection"}
                      className="absolute inset-0 rounded-2xl border"
                      style={{
                        background:
                          "linear-gradient(155deg, color-mix(in srgb, var(--color-primary) 18%, var(--color-surface)), var(--color-card))",
                        borderColor: "color-mix(in srgb, var(--color-primary) 35%, var(--color-border-strong))",
                        boxShadow:
                          "0 3px 0 color-mix(in srgb, var(--color-primary) 20%, var(--color-background)), 0 6px 10px #0003",
                      }}
                      transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <span
                        className="absolute inset-x-3 top-0 h-px"
                        style={{ background: "var(--color-primary)", boxShadow: "0 0 10px var(--color-primary)" }}
                      />
                    </motion.span>
                  )}

                  <motion.span
                    animate={{ y: active && !reducedMotion ? -2 : 0, scale: active && !reducedMotion ? 1.08 : 1 }}
                    transition={{ duration: reducedMotion ? 0 : 0.2 }}
                    className="relative z-10 flex items-center justify-center"
                  >
                    <Icon
                      className="h-[17px] w-[17px] transition-colors duration-200"
                      style={{
                        color: active
                          ? "var(--color-primary)"
                          : "color-mix(in srgb, var(--color-foreground) 72%, transparent)",
                      }}
                      strokeWidth={active ? 2.35 : 2.05}
                    />
                  </motion.span>
                  <span
                    className="relative z-10 block w-full truncate px-0.5 text-center text-[7.5px] font-semibold transition-colors duration-200"
                    style={{
                      color: active
                        ? "var(--color-foreground)"
                        : "color-mix(in srgb, var(--color-foreground) 58%, transparent)",
                    }}
                  >
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </nav>
  );
}
