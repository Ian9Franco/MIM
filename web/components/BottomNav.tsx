"use client";

import React from "react";
import { Compass, Film, Award, User } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: "profile", label: "Perfil", icon: User, color: "text-rose-500" },
    { id: "spotlight", label: "Spotlight", icon: Compass, color: "text-orange-500" },
    { id: "feed", label: "Canales", icon: Film, color: "text-blue-400" },
    { id: "rankings", label: "Ránkings", icon: Award, color: "text-purple-400" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 px-6 pb-5 pt-3">
      <div className="bg-[#151518]/85 backdrop-blur-xl border border-white/[0.08] rounded-full py-3 px-6 flex justify-between items-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center relative py-1 focus:outline-none transition-all"
              style={{ width: "22%" }}
            >
              <div
                className={`p-1.5 rounded-full transition-all duration-300 ${
                  isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isActive ? `scale-110 ${tab.color}` : "text-white/40"
                  }`}
                />
              </div>
              <span
                className={`text-[9px] font-medium tracking-wide mt-1 transition-colors duration-300 ${
                  isActive ? "text-white" : "text-white/40"
                }`}
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
