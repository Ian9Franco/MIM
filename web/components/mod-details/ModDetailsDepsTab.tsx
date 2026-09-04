"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2, ChevronRight } from "lucide-react";
import type { FomoDependencyItem } from "../../types/fomo";
import type { ModHit } from "../SpotlightMarquees";
import { DEPENDENCY_GROUPS, type DependencyKind } from "../../lib/dependencies";

interface ModDetailsDepsTabProps {
  loadingDetails: boolean;
  selectedModDeps: FomoDependencyItem[];
  dependencyGroups: Record<DependencyKind, FomoDependencyItem[]>;
  visibleDependencyKinds: DependencyKind[];
  handleOpenModDetails: (mod: ModHit, isDep?: boolean) => void;
  selectedMod: ModHit | null;
}

export function ModDetailsDepsTab({
  loadingDetails,
  selectedModDeps,
  dependencyGroups,
  visibleDependencyKinds,
  handleOpenModDetails,
  selectedMod,
}: ModDetailsDepsTabProps) {
  return (
    <motion.div
      key="deps"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 flex-col gap-2 w-full"
    >
      {loadingDetails ? (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
        </div>
      ) : selectedModDeps?.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <span className="text-[10px] text-white/30 uppercase font-mono tracking-wider block font-semibold">
            Dependencias ({selectedModDeps.length})
          </span>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 scrollbar-none">
            {visibleDependencyKinds.map((kind) => {
              const group = DEPENDENCY_GROUPS[kind];
              return (
                <div key={kind} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-[9px] text-white/35 uppercase font-mono tracking-wider font-bold">
                      {group.title}
                    </span>
                    <span className={`rounded-md border px-1.5 py-0.5 text-[8px] font-black ${group.className}`}>
                      {dependencyGroups[kind].length}
                    </span>
                  </div>
                  {dependencyGroups[kind].map((dep: FomoDependencyItem) => {
                    const depSource =
                      (dep as Record<string, unknown>)._source ||
                      selectedMod?._source ||
                      "modrinth";
                    const depProjectId = String(
                      (dep as Record<string, unknown>).project_id || dep.projectId || dep.id
                    );
                    const depType = dep.project_type || dep.projectType || "mod";
                    const depUrl =
                      dep.url ||
                      (depSource === "curseforge"
                        ? `https://www.curseforge.com/projects/${depProjectId}`
                        : `https://modrinth.com/${depType}/${dep.slug || depProjectId}`);

                    return (
                      <div
                        key={`${kind}-${depProjectId}`}
                        onClick={() =>
                          handleOpenModDetails(
                            {
                              projectId: depProjectId,
                              slug: dep.slug || depProjectId,
                              title: dep.title || dep.name || depProjectId,
                              description: dep.description || "",
                              iconUrl: dep.icon_url || dep.iconUrl || undefined,
                              author: dep.author || "Comunidad",
                              projectType: depType,
                              categories: dep.categories || [],
                              url: depUrl,
                              _source: (depSource as "modrinth" | "curseforge") || "modrinth",
                              downloads: 0,
                            },
                            true
                          )
                        }
                        className={`border rounded-xl p-2 flex items-center gap-3 transition-colors cursor-pointer ${
                          kind === "incompatible"
                            ? "bg-red-500/[0.035] hover:bg-red-500/[0.07] border-red-500/15"
                            : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.04]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {dep.icon_url ? (
                            <img src={dep.icon_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white/40 text-xs font-bold uppercase">
                              {(dep.title || dep.name || depProjectId).substring(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-white truncate block">
                            {dep.title || dep.name || depProjectId}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-[9px] text-white/45 capitalize">{depType}</span>
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[7px] font-black uppercase ${group.className}`}
                            >
                              {group.badge}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/40 italic">Este proyecto no requiere ninguna dependencia.</p>
      )}
    </motion.div>
  );
}
