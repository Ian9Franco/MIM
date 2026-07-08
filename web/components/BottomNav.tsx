"use client";

import React from "react";
import { Compass, Film, Users, User, Flame, Search } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

/**
 * Bottom navigation bar that fully inherits the active theme palette.
 * Uses CSS variables (--color-surface, --color-primary, --color-border) so
 * every theme (official, vampire, modern) is reflected automatically.
 */
export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: "profile",     label: "Perfil",      icon: User    },
    { id: "spotlight",   label: "Spotlight",   icon: Flame   },
    { id: "discover",    label: "Explorar",    icon: Search  },
    { id: "collections", label: "Colecciones", icon: Compass },
    { id: "feed",        label: "Canales",     icon: Film    },
    { id: "rankings",    label: "Comunidad",   icon: Users   },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 px-4 pb-5 pt-3"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="flex justify-between items-center rounded-full py-2.5 px-4 gap-1 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
        style={{
          background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
          border: "1px solid var(--color-border-strong)",
          pointerEvents: "auto",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 min-w-0 flex flex-col items-center justify-center text-center focus:outline-none select-none group"
            >
              <div
                data-active={tab.id === "spotlight" && isActive}
                className={`p-1.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                  tab.id === "spotlight" ? "mim-spotlight-nav-icon" : ""
                }`}
                style={
                  isActive
                    ? { background: "color-mix(in srgb, var(--color-primary) 15%, transparent)" }
                    : {}
                }
              >
                <Icon
                  className="w-4 h-4 transition-all duration-300"
                  style={{
                    color: isActive ? "var(--color-primary)" : "var(--color-muted)",
                    transform: isActive ? "scale(1.15)" : "scale(1)",
                  }}
                />
              </div>
              <span
                className="text-[8.5px] font-medium tracking-wide mt-0.5 transition-colors duration-300 block truncate w-full"
                style={{
                  color: isActive ? "var(--color-foreground)" : "var(--color-muted)",
                  fontWeight: isActive ? 700 : 500,
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
