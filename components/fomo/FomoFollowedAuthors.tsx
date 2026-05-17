/**
 * MIM — FOMO Followed Authors & Projects
 * Optimized for v5.9: Modularized into hooks and components.
 */

"use client";

import React from "react";
import { Heart, FolderHeart, Sparkles, Package, UserCheck, RefreshCw } from "lucide-react";
import { COLORS } from "@/theme/tokens";
import { useFomoFollowedManager } from "@/hooks/useFomoFollowedManager";
import { FollowedProjectCard, FollowedAuthorCard } from "./FomoFollowedComponents";

interface FomoFollowedAuthorsProps {
  onSearchAuthor: (author: string) => void;
  onSearchProject?: (title: string) => void;
  onOpenVersions?: (mod: any) => void;
  onDownloadMod?: (mod: any) => Promise<void>;
  downloading?: Record<string, boolean>;
}

export function FomoFollowedAuthors({ onSearchAuthor, onSearchProject, onOpenVersions, onDownloadMod, downloading = {} }: FomoFollowedAuthorsProps) {
  const { subTab, setSubTab, followedAuthors, followedMods, filteredMods, showOnlyWithUpdates, setShowOnlyWithUpdates, getModUpdateInfo, handleUnfollowAuthor, handleUnfollowMod } = useFomoFollowedManager();

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full animate-fade-in">
      <div className="px-6 pt-5 pb-3 border-b flex items-center justify-between shrink-0" style={{ background: "var(--fomo-secondary-bg)", borderColor: "var(--fomo-border)" }}>
        <div className="flex p-1 rounded-2xl bg-black/20 gap-1 border border-white/5">
          <button onClick={() => setSubTab("projects")} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === "projects" ? "bg-primary text-white" : "opacity-40 text-white"}`}><Package className="w-4 h-4" />Proyectos ({followedMods.length})</button>
          <button onClick={() => setSubTab("authors")} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === "authors" ? "bg-primary text-white" : "opacity-40 text-white"}`}><UserCheck className="w-4 h-4" />Autores ({followedAuthors.length})</button>
        </div>
        {subTab === "projects" && followedMods.length > 0 && (
          <button onClick={() => setShowOnlyWithUpdates(!showOnlyWithUpdates)} className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${showOnlyWithUpdates ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-white/5 border-white/10 text-white/60"}`}><RefreshCw className={`w-3.5 h-3.5 ${showOnlyWithUpdates ? "animate-spin-slow" : ""}`} /><span>Actualizaciones</span></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {subTab === "projects" ? (
          followedMods.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center opacity-40"><FolderHeart className="w-16 h-16 mb-4" /><h3 className="font-headline text-lg">No seguís ningún mod</h3><p className="text-xs max-w-sm">Seguí tus proyectos favoritos para verlos acá.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMods.map(mod => <FollowedProjectCard key={mod.projectId} mod={mod} updateInfo={getModUpdateInfo(mod.projectId)} isDownloading={!!downloading[`collection:${mod.projectId}`]} onOpenVersions={onOpenVersions} onDownloadMod={onDownloadMod} onSearchProject={onSearchProject} onUnfollow={handleUnfollowMod} />)}
            </div>
          )
        ) : (
          followedAuthors.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center opacity-40"><Heart className="w-16 h-16 mb-4" /><h3 className="font-headline text-lg">Todavia no seguís a ningún autor</h3><p className="text-xs max-w-sm">Segui a creadores para ver sus novedades.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {followedAuthors.map(author => <FollowedAuthorCard key={author} author={author} onSearch={onSearchAuthor} onUnfollow={handleUnfollowAuthor} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
