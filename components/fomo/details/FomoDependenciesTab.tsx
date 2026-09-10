"use client";

import React from "react";
import { DependencyCard } from "./DependencyCard";

interface FomoDependenciesTabProps {
  depSearchQuery: string;
  setDepSearchQuery: (q: string) => void;
  allDependencies: any[];
  source?: string;
  depDownloading: string | null;
  onSearchProject?: (title: string) => void;
}

export function FomoDependenciesTab({
  depSearchQuery,
  setDepSearchQuery,
  allDependencies,
  source,
  depDownloading,
  onSearchProject,
}: FomoDependenciesTabProps) {
  const filtered = allDependencies.filter((d) =>
    (d.title || d.projectId).toLowerCase().includes(depSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={depSearchQuery}
        onChange={(e) => setDepSearchQuery(e.target.value)}
        placeholder="Buscar..."
        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
      />
      {filtered.map((d) => (
        <DependencyCard
          key={d.projectId}
          dep={d}
          source={source}
          onDownload={() => {}}
          downloading={depDownloading === d.projectId}
          onSearch={onSearchProject}
        />
      ))}
    </div>
  );
}
