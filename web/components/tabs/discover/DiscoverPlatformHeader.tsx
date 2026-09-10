"use client";

import React from "react";
import { motion } from "framer-motion";
import { ModrinthIcon, CurseForgeIcon } from "./discoverConstants";
import type { ModHit } from "../../SpotlightMarquees";

export type DiscoverSourceType = "modrinth" | "curseforge" | "all" | "chunk";

interface DiscoverPlatformHeaderProps {
  discoverSource: DiscoverSourceType;
  setDiscoverSource: (s: DiscoverSourceType) => void;
  setDiscoverResults: (r: ModHit[]) => void;
  setDiscoverPage: (p: number) => void;
  setDiscoverCategory: (v: string[]) => void;
  discoverError?: string;
}

export function DiscoverPlatformHeader({
  discoverSource,
  setDiscoverSource,
  setDiscoverResults,
  setDiscoverPage,
  setDiscoverCategory,
  discoverError,
}: DiscoverPlatformHeaderProps) {
  const handleSelectPlatform = (source: DiscoverSourceType) => {
    setDiscoverSource(source);
    setDiscoverResults([]);
    setDiscoverPage(1);
    setDiscoverCategory([]);
  };

  return (
    <>
      {/* Header + platform selector */}
      <div className="flex gap-2 mb-2 shrink-0">
        <div
          className="flex-1 min-w-0 border-l-2 rounded-r-lg px-2.5 py-1.5"
          style={{
            background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
            borderColor: "var(--color-primary)"
          }}
        >
          <p className="text-[9px] font-mono uppercase tracking-wider font-bold leading-none" style={{ color: "var(--color-primary)" }}>
            Explorar
          </p>
          <h2 className="text-[10px] font-semibold text-white/90 mt-1 leading-tight line-clamp-2">
            {discoverSource === "all"
              ? "Explorá mods, texturas, shaders y modpacks en Modrinth y CurseForge."
              : discoverSource === "curseforge"
              ? "Explorá mods, texturas, shaders y modpacks de CurseForge."
              : discoverSource === "chunk"
              ? "Explorá Add-ons oficiales de Minecraft Bedrock (chunk.gg Marketplace)."
              : "Explorá mods, texturas, shaders y modpacks de Modrinth."}
          </h2>
        </div>

        <div className="w-[124px] shrink-0 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => {
              handleSelectPlatform("modrinth");
            }}
            className={`relative h-6 overflow-hidden rounded-lg text-xs font-bold transition-colors border flex items-center justify-center ${
              discoverSource === "modrinth"
                ? "text-[#1bd672] border-[#1bd672]/30"
                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
            }`}
            title="Buscar en Modrinth"
            aria-label="Buscar en Modrinth"
          >
            {discoverSource === "modrinth" && (
              <motion.span
                layoutId="discover-platform-selection"
                className="absolute inset-0 bg-[#1bd672]/15"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <ModrinthIcon className="relative z-10 w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              handleSelectPlatform("curseforge");
            }}
            className={`relative h-6 overflow-hidden rounded-lg text-xs font-bold transition-colors border flex items-center justify-center ${
              discoverSource === "curseforge"
                ? "text-orange-400 border-orange-500/30"
                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
            }`}
            title="Buscar en CurseForge"
            aria-label="Buscar en CurseForge"
          >
            {discoverSource === "curseforge" && (
              <motion.span
                layoutId="discover-platform-selection"
                className="absolute inset-0 bg-orange-500/15"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <CurseForgeIcon className="relative z-10 w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              handleSelectPlatform("chunk");
            }}
            className={`relative h-6 overflow-hidden rounded-lg text-xs font-bold transition-colors border flex items-center justify-center gap-1 ${
              discoverSource === "chunk"
                ? "text-[#00cc44] border-[#00cc44]/30"
                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
            }`}
            title="Buscar Bedrock Add-ons (chunk.gg)"
            aria-label="Buscar Bedrock Add-ons (chunk.gg)"
          >
            {discoverSource === "chunk" && (
              <motion.span
                layoutId="discover-platform-selection"
                className="absolute inset-0 bg-[#00cc44]/15"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 text-[10px]">💎</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleSelectPlatform("all");
            }}
            className={`relative col-span-3 h-6 overflow-hidden rounded-lg text-xs font-bold transition-colors border flex items-center justify-center gap-1 ${
              discoverSource === "all"
                ? "text-blue-400 border-blue-500/30"
                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10"
            }`}
            title="Buscar en Modrinth y CurseForge"
            aria-label="Buscar en ambas plataformas"
          >
            {discoverSource === "all" && (
              <motion.span
                layoutId="discover-platform-selection"
                className="absolute inset-0 bg-blue-500/15"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <ModrinthIcon className="relative z-10 w-3.5 h-3.5" />
            <CurseForgeIcon className="relative z-10 w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {discoverError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 text-xs flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <span>⚠️ {discoverError}</span>
          </div>
          {discoverSource === "modrinth" && (
            <div className="text-white/60">
              Parece que los servidores de búsqueda de Modrinth están experimentando problemas en este momento. 
              Te recomendamos cambiar a **CurseForge** para continuar explorando.
              <button
                type="button"
                onClick={() => {
                  handleSelectPlatform("curseforge");
                }}
                className="mt-2.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 active:scale-95 transition-all text-white font-bold rounded-lg block w-max"
              >
                Cambiar a CurseForge
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
