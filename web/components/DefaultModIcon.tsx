import React from "react";

interface DefaultModIconProps {
  platform?: string;
  className?: string;
}

export function DefaultModIcon({
  platform = "modrinth",
  className = "w-full h-full"
}: DefaultModIconProps) {
  const isCurse = platform?.toLowerCase() === "curseforge";

  const containerClass = isCurse
    ? "bg-gradient-to-br from-orange-950/25 via-zinc-900 to-zinc-950 text-orange-400/50 border border-orange-500/10 flex items-center justify-center w-full h-full"
    : "bg-gradient-to-br from-emerald-950/25 via-zinc-900 to-zinc-950 text-[#1bd672]/50 border border-emerald-500/10 flex items-center justify-center w-full h-full";

  return (
    <div className={containerClass}>
      <svg
        className="w-1/2 h-1/2 opacity-70"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    </div>
  );
}
