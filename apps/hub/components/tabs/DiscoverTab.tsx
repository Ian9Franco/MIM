"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import { DiscoverSkeleton } from "../FomoSkeletons";
import {
  DiscoverPlatformHeader,
  DiscoverControls,
  DiscoverFiltersPanel,
  DiscoverPagination,
  DiscoverModCard,
  type DiscoverSourceType,
} from "./discover";

export interface DiscoverTabProps {
  discoverQuery: string;
  setDiscoverQuery: (v: string) => void;
  discoverType: string;
  setDiscoverType: (v: string) => void;
  discoverVersion: string[];
  setDiscoverVersion: (v: string[]) => void;
  discoverLoader: string[];
  setDiscoverLoader: (v: string[]) => void;
  discoverEnvironment: string;
  setDiscoverEnvironment: (v: string) => void;
  discoverCategory: string[];
  setDiscoverCategory: (v: string[]) => void;
  discoverSort: string;
  setDiscoverSort: (v: string) => void;
  discoverResults: ModHit[];
  discoverLoading: boolean;
  discoverPage: number;
  discoverTotal: number;
  setDiscoverResults: (r: ModHit[]) => void;
  setDiscoverPage: (p: number) => void;
  runDiscoverSearch: (page?: number) => void;
  handleOpenModDetails: (mod: ModHit) => void;
  discoverSource: DiscoverSourceType;
  setDiscoverSource: (s: DiscoverSourceType) => void;
  discoverError: string;
}

/**
 * DiscoverTab — Buscador orquestador modular de mods/texturas/shaders/datapacks (REC-03).
 */
export function DiscoverTab({
  discoverQuery, setDiscoverQuery, discoverType, setDiscoverType,
  discoverVersion, setDiscoverVersion, discoverLoader, setDiscoverLoader,
  discoverEnvironment, setDiscoverEnvironment, discoverCategory, setDiscoverCategory,
  discoverResults, discoverLoading, discoverPage, discoverTotal,
  setDiscoverResults, setDiscoverPage, runDiscoverSearch, handleOpenModDetails,
  discoverSource, setDiscoverSource, discoverError, discoverSort, setDiscoverSort,
}: DiscoverTabProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  const handleClearFilters = () => {
    setDiscoverVersion([]);
    setDiscoverLoader([]);
    setDiscoverEnvironment("any");
    setDiscoverSort("newest");
    setDiscoverCategory([]);
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
      {/* Header + selector de plataforma + error banner */}
      <DiscoverPlatformHeader
        discoverSource={discoverSource}
        setDiscoverSource={setDiscoverSource}
        setDiscoverResults={setDiscoverResults}
        setDiscoverPage={setDiscoverPage}
        setDiscoverCategory={setDiscoverCategory}
        discoverError={discoverError}
      />

      {/* Tipo de proyecto, selector de orden y barra de búsqueda */}
      <DiscoverControls
        discoverType={discoverType}
        setDiscoverType={setDiscoverType}
        discoverSort={discoverSort}
        setDiscoverSort={setDiscoverSort}
        discoverQuery={discoverQuery}
        setDiscoverQuery={setDiscoverQuery}
        runDiscoverSearch={runDiscoverSearch}
        setDiscoverResults={setDiscoverResults}
        setDiscoverPage={setDiscoverPage}
        setDiscoverCategory={setDiscoverCategory}
        setDiscoverLoader={setDiscoverLoader}
      />

      {/* Panel colapsable de filtros (Versiones, loaders, entorno y categorías) */}
      <DiscoverFiltersPanel
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        discoverType={discoverType}
        discoverSource={discoverSource}
        discoverVersion={discoverVersion}
        setDiscoverVersion={setDiscoverVersion}
        discoverLoader={discoverLoader}
        setDiscoverLoader={setDiscoverLoader}
        discoverEnvironment={discoverEnvironment}
        setDiscoverEnvironment={setDiscoverEnvironment}
        discoverCategory={discoverCategory}
        setDiscoverCategory={setDiscoverCategory}
        setDiscoverResults={setDiscoverResults}
        setDiscoverPage={setDiscoverPage}
        handleClearFilters={handleClearFilters}
      />

      {/* Resultados de búsqueda */}
      {discoverLoading ? (
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-none flex flex-col gap-4">
          <DiscoverSkeleton />
        </div>
      ) : discoverResults.length > 0 ? (
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-none flex flex-col gap-4">
          <DiscoverPagination
            position="top"
            discoverPage={discoverPage}
            discoverTotal={discoverTotal}
            discoverLoading={discoverLoading}
            runDiscoverSearch={runDiscoverSearch}
          />

          <div className="grid grid-cols-2 gap-3.5 w-full">
            {discoverResults.map((mod, resultIndex) => (
              <DiscoverModCard
                key={mod.projectId}
                mod={mod}
                resultIndex={resultIndex}
                handleOpenModDetails={handleOpenModDetails}
              />
            ))}
          </div>

          <DiscoverPagination
            position="bottom"
            discoverPage={discoverPage}
            discoverTotal={discoverTotal}
            discoverLoading={discoverLoading}
            runDiscoverSearch={runDiscoverSearch}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center items-center text-center p-6">
          <Search className="w-12 h-12 text-amber-500/50 mb-4 animate-pulse" />
          <h2 className="text-sm font-semibold text-white">Sin resultados</h2>
          <p className="text-xs text-white/40 mt-1">
            No se encontraron mods que coincidan con la búsqueda o filtros aplicados.
          </p>
        </div>
      )}
    </motion.div>
  );
}
