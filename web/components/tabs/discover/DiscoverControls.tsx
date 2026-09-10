"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { MOD_TYPES, SORT_OPTIONS } from "./discoverConstants";
import type { ModHit } from "../../SpotlightMarquees";

interface DiscoverControlsProps {
  discoverType: string;
  setDiscoverType: (t: string) => void;
  discoverSort: string;
  setDiscoverSort: (s: string) => void;
  discoverQuery: string;
  setDiscoverQuery: (q: string) => void;
  runDiscoverSearch: (page?: number) => void;
  setDiscoverResults: (r: ModHit[]) => void;
  setDiscoverPage: (p: number) => void;
  setDiscoverCategory: (v: string[]) => void;
  setDiscoverLoader: (v: string[]) => void;
}

export function DiscoverControls({
  discoverType,
  setDiscoverType,
  discoverSort,
  setDiscoverSort,
  discoverQuery,
  setDiscoverQuery,
  runDiscoverSearch,
  setDiscoverResults,
  setDiscoverPage,
  setDiscoverCategory,
  setDiscoverLoader,
}: DiscoverControlsProps) {
  const handleTypeChange = (val: string) => {
    setDiscoverType(val);
    setDiscoverResults([]);
    setDiscoverPage(1);
    setDiscoverCategory([]);
    if (val !== "mod") setDiscoverLoader([]);
  };

  const handleSortChange = (val: string) => {
    setDiscoverSort(val);
    setDiscoverResults([]);
    setDiscoverPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runDiscoverSearch(1);
  };

  return (
    <>
      {/* Type selector */}
      <div className="flex gap-1 mb-2 shrink-0 overflow-visible">
        {MOD_TYPES.map(type => {
          const TypeIcon = type.icon;
          const isSelected = discoverType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => handleTypeChange(type.value)}
              title={type.label}
              aria-label={type.label}
              className={`group relative h-8 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 overflow-hidden ${
                isSelected ? "px-2.5 min-w-0" : "px-2 w-9 hover:w-auto hover:px-2.5"
              } ${
                isSelected
                  ? "text-amber-300 border border-amber-500/35 shadow-sm"
                  : "bg-white/5 text-white/50 border border-white/[0.04] hover:bg-white/10"
              }`}
            >
              {isSelected && (
                <motion.span
                  layoutId="discover-type-selection"
                  className="absolute inset-0 rounded-xl bg-amber-500/18"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <TypeIcon className="relative z-10 w-[18px] h-[18px]" />
              <span
                className={`relative z-10 overflow-hidden transition-all duration-200 ${
                  isSelected ? "max-w-[76px] opacity-100" : "max-w-0 opacity-0 group-hover:max-w-[76px] group-hover:opacity-100"
                }`}
              >
                {type.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sort selector */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <label className="text-[9px] font-bold text-white/30 uppercase font-mono tracking-wider shrink-0">
          Ordenar
        </label>
        <select
          value={discoverSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="flex-1 h-8 bg-surface/90 border border-border rounded-xl px-3 text-[11px] text-white/80 focus:border-amber-500/50 outline-none cursor-pointer"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-surface text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4 shrink-0">
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
    </>
  );
}
