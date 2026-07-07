"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Loader2, ChevronRight } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";

interface DiscoverTabProps {
  discoverQuery: string;
  setDiscoverQuery: (v: string) => void;
  discoverType: string;
  setDiscoverType: (v: string) => void;
  discoverVersion: string;
  setDiscoverVersion: (v: string) => void;
  discoverLoader: string;
  setDiscoverLoader: (v: string) => void;
  discoverResults: ModHit[];
  discoverLoading: boolean;
  discoverPage: number;
  discoverTotal: number;
  setDiscoverResults: (r: ModHit[]) => void;
  setDiscoverPage: (p: number) => void;
  runDiscoverSearch: (page?: number) => void;
  handleOpenModDetails: (mod: ModHit) => void;
}

const MC_VERSIONS = ["1.21.1", "1.20.4", "1.20.1", "1.19.4", "1.19.2", "1.18.2", "1.16.5", "1.12.2"];
const MOD_LOADERS = [
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "neoforge", label: "NeoForge" },
  { value: "quilt", label: "Quilt" },
  { value: "any", label: "Cualquiera" },
];
const MOD_TYPES = [
  { value: "mod", label: "Mods" },
  { value: "resourcepack", label: "Texturas" },
  { value: "shader", label: "Shaders" },
  { value: "datapack", label: "Datapacks" },
];

/** Formatea números de descarga a K/M */
function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/**
 * DiscoverTab — buscador de mods/texturas/shaders/datapacks desde Modrinth API.
 */
export function DiscoverTab({
  discoverQuery, setDiscoverQuery, discoverType, setDiscoverType,
  discoverVersion, setDiscoverVersion, discoverLoader, setDiscoverLoader,
  discoverResults, discoverLoading, discoverPage, discoverTotal,
  setDiscoverResults, setDiscoverPage, runDiscoverSearch, handleOpenModDetails,
}: DiscoverTabProps) {
  const handleTypeChange = (val: string) => {
    setDiscoverType(val);
    setDiscoverResults([]);
    setDiscoverPage(1);
  };

  return (
    <motion.div
      key="discover"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex-1 flex flex-col min-h-0 pb-24"
    >
      {/* Header */}
      <div
        className="border-l-2 rounded-r-lg p-3 mb-4 shrink-0"
        style={{
          background: "linear-gradient(to right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)",
          borderColor: "var(--color-primary)"
        }}
      >
        <p className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: "var(--color-primary)" }}>
          Explorar
        </p>
        <h2 className="text-xs font-semibold text-white/90 mt-1">
          Explorá y buscá mods, texturas y shaders de Modrinth.
        </h2>
      </div>

      {/* Type selector */}
      <div className="flex gap-1.5 mb-3 shrink-0 overflow-x-auto pb-1 scrollbar-none">
        {MOD_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => handleTypeChange(type.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
              discoverType === type.value
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm"
                : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
        {discoverType !== "datapack" && (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">Versión de Minecraft</label>
            <select
              value={discoverVersion}
              onChange={(e) => { setDiscoverVersion(e.target.value); setDiscoverResults([]); setDiscoverPage(1); }}
              className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
            >
              {MC_VERSIONS.map(ver => (
                <option key={ver} value={ver} className="bg-surface text-white">{ver}</option>
              ))}
            </select>
          </div>
        )}
        {discoverType === "mod" && (
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider">Mod Loader</label>
            <select
              value={discoverLoader}
              onChange={(e) => { setDiscoverLoader(e.target.value); setDiscoverResults([]); setDiscoverPage(1); }}
              className="w-full bg-surface/90 border border-border rounded-xl py-2 px-3 text-xs text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
            >
              {MOD_LOADERS.map(l => (
                <option key={l.value} value={l.value} className="bg-surface text-white">{l.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); runDiscoverSearch(1); }}
        className="flex gap-2 mb-4 shrink-0"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar proyectos..."
            value={discoverQuery}
            onChange={(e) => setDiscoverQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-amber-500/55 outline-none"
          />
        </div>
        <button
          type="submit"
          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 rounded-xl active:scale-95 transition-all shadow-md"
        >
          Buscar
        </button>
      </form>

      {/* Results */}
      {discoverLoading && discoverPage === 1 ? (
        <div className="flex-1 flex flex-col justify-center items-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-xs text-white/40 mt-3 font-mono">Buscando en Modrinth...</span>
        </div>
      ) : discoverResults.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
          {discoverResults.map((mod) => (
            <div
              key={mod.projectId}
              onClick={() => handleOpenModDetails(mod)}
              className="bg-surface/90 border border-border rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer hover:border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/[0.05] flex items-center justify-center overflow-hidden flex-shrink-0">
                {mod.iconUrl ? (
                  <img src={mod.iconUrl} alt="" className="object-cover w-full h-full" />
                ) : (
                  <span className="text-white/40 text-xs font-bold uppercase">{mod.title.substring(0, 2)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{mod.title}</p>
                <p className="text-[9px] text-white/40 mt-0.5 truncate leading-tight">
                  {mod.description || `Creador: ${mod.author}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {mod.downloads !== undefined && (
                  <span className="text-[9.5px] font-mono text-white/30">
                    {formatDownloads(mod.downloads)} ↓
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-white/20" />
              </div>
            </div>
          ))}

          {discoverResults.length < discoverTotal && (
            <button
              onClick={() => runDiscoverSearch(discoverPage + 1)}
              disabled={discoverLoading}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-xl py-3 text-xs font-semibold text-white/70 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {discoverLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : "Cargar más"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
          <Search className="w-12 h-12 text-amber-500/50 mb-4 animate-pulse" />
          <h2 className="text-sm font-semibold text-white">Sin resultados</h2>
          <p className="text-xs text-white/40 mt-1">No se encontraron mods que coincidan con la búsqueda o filtros aplicados.</p>
        </div>
      )}
    </motion.div>
  );
}
