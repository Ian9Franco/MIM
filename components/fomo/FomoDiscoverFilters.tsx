/**
 * MIM — FOMO Discover Filters
 * Optimized for v5.9: Modularized into hooks and configs.
 */

"use client";

import React, { memo, useMemo } from "react";
import { RefreshCw, Globe, Laptop, Server, Tags, Sparkles, SlidersHorizontal, ChevronRight, ChevronDown, Zap } from "lucide-react";
import { LOADERS, GAME_VERSIONS, PROJECT_TYPES, SORT_OPTIONS, MODRINTH_CATEGORIES, CURSEFORGE_CATEGORIES, RESOURCEPACK_FILTERS, SHADER_FILTERS, ENVIRONMENTS } from "@/constants/app";
import { useFomoFiltersManager } from "@/hooks/useFomoFiltersManager";
import { CATEGORY_ICONS, SORT_ICONS } from "./FomoFilterConfig";

export const FomoDiscoverFilters = memo(function FomoDiscoverFilters(props: any) {
  const m = useFomoFiltersManager(props);
  const isAuthorSearch = props.query.startsWith("author:");

  const currentFilters = useMemo(() => {
    if (m.isCurseForge) return [{ title: "Categorías (CurseForge)", items: CURSEFORGE_CATEGORIES[props.projectType as keyof typeof CURSEFORGE_CATEGORIES] || [] }];
    if (props.projectType === "mod" || props.projectType === "datapack" || props.projectType === "modpack") return [{ title: "Categorías", items: MODRINTH_CATEGORIES.map(c => ({ value: c })) }];
    if (props.projectType === "resourcepack") return [{ title: "Resolución", items: RESOURCEPACK_FILTERS.resolutions.map(c => ({ value: c })) }, { title: "Categorías", items: RESOURCEPACK_FILTERS.categories.map(c => ({ value: c })) }, { title: "Características", items: RESOURCEPACK_FILTERS.features.map(c => ({ value: c })) }];
    if (props.projectType === "shader") return [{ title: "Categorías", items: SHADER_FILTERS.categories.map(c => ({ value: c })) }, { title: "Características", items: SHADER_FILTERS.features.map(c => ({ value: c })) }, { title: "Rendimiento", items: SHADER_FILTERS.performance.map(c => ({ value: c })) }, { title: "Loader", items: SHADER_FILTERS.loaders.map(c => ({ value: c })) }];
    return [];
  }, [props.projectType, m.isCurseForge]);

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex flex-col gap-3 shrink-0">
        <select value={isAuthorSearch ? "" : props.projectType} onChange={e => props.onProjectType(e.target.value)} disabled={isAuthorSearch} className="w-full text-xs font-bold border rounded-xl px-3.5 py-2.5 bg-black/20 text-white border-white/10 outline-none">
          {isAuthorSearch ? <option value="">Cualquier Tipo</option> : PROJECT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
        </select>
        
        {(props.projectType === "mod" || props.projectType === "modpack" || isAuthorSearch) && (
          <select value={isAuthorSearch ? "" : props.loader} onChange={e => props.onLoader(e.target.value)} disabled={isAuthorSearch} className="w-full text-xs font-bold border rounded-xl px-3.5 py-2.5 bg-black/20 text-white border-white/10 outline-none">
            {isAuthorSearch ? <option value="">Cualquier Loader</option> : <><option value="unknown">Cualquier Loader</option>{LOADERS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}</>}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1 custom-scrollbar">
        <div className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest flex items-center gap-2 opacity-50"><Sparkles className="w-3 h-3" /> Exclusividad</p>
          <button onClick={() => props.onOnlyExclusives(!props.onlyExclusives)} className={`flex items-center justify-between w-full p-2.5 rounded-xl border text-[10px] font-bold ${props.onlyExclusives ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-white/5 border-white/5 text-white/40"}`}>
            <div className="flex flex-col items-start gap-0.5">
              <span>Solo Exclusivos</span>
              <span className="text-[8px] opacity-60 normal-case font-normal">
                {props.source === "curseforge" ? "Solo en CurseForge, no en Modrinth" : props.source === "modrinth" ? "Solo en Modrinth, no en CurseForge" : "Solo en una plataforma"}
              </span>
            </div>
            <div className={`w-6 h-3.5 rounded-full p-0.5 ${props.onlyExclusives ? "bg-orange-500" : "bg-white/10"}`}><div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${props.onlyExclusives ? "translate-x-2.5" : "translate-x-0"}`} /></div>
          </button>
        </div>

        {/* Sinytra Connector toggle: visible solo para Forge/NeoForge buscando en Modrinth */}
        {(props.loader === "forge" || props.loader === "neoforge") && props.source === "modrinth" && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-widest flex items-center gap-2 opacity-50"><Zap className="w-3 h-3" /> Compatibilidad</p>
            <button
              onClick={() => props.setSinytraActive(!props.sinytraActive)}
              className={`flex items-center justify-between w-full p-2.5 rounded-xl border text-[10px] font-bold transition-all ${
                props.sinytraActive
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                  : "bg-white/5 border-white/5 text-white/40"
              }`}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span>Sinytra Connector</span>
                <span className="text-[8px] opacity-60 normal-case font-normal">Muestra mods Fabric + % compatibilidad</span>
              </div>
              <div className={`w-6 h-3.5 rounded-full p-0.5 ${props.sinytraActive ? "bg-cyan-500" : "bg-white/10"}`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${props.sinytraActive ? "translate-x-2.5" : "translate-x-0"}`} />
              </div>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest flex items-center gap-2 opacity-50"><Globe className="w-3 h-3" /> Versión</p>
          <div className="flex flex-wrap gap-1.5">{GAME_VERSIONS.map(v => <button key={v} onClick={() => m.toggleFilter(props.gameVersions, props.onVersions, v)} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${props.gameVersions.includes(v) ? "bg-primary text-white border-primary" : "bg-white/5 border-white/5 text-white/40"}`}>{v}</button>)}</div>
        </div>

        {currentFilters.map(group => (
          <div key={group.title} className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-widest flex items-center gap-2 opacity-50"><Tags className="w-3 h-3" /> {group.title}</p>
            <div className="flex flex-col gap-1.5">{group.items.map((cat: any) => {
              const val = typeof cat === 'string' ? cat : cat.value;
              const active = props.categories.includes(val);
              const hasSub = typeof cat !== 'string' && cat.sub?.length > 0;
              return (
                <div key={val} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => m.toggleFilter(props.categories, props.onCategories, val)} className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${active ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 border-white/5 text-white/40"}`}>{CATEGORY_ICONS[val] || <Tags className="w-3 h-3" />}{val}</button>
                    {hasSub && <button onClick={() => m.setExpandedCats(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val])} className="p-1.5 rounded-lg border border-white/5">{m.expandedCats.includes(val) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</button>}
                  </div>
                  {hasSub && m.expandedCats.includes(val) && <div className="pl-4 flex flex-wrap gap-1">{cat.sub.map((s: string) => <button key={s} onClick={() => m.toggleFilter(props.categories, props.onCategories, s)} className={`px-2 py-1 rounded-md text-[9px] font-bold border ${props.categories.includes(s) ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 border-white/5 text-white/40"}`}>{s}</button>)}</div>}
                </div>
              );
            })}</div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-white/5 flex flex-col gap-3 shrink-0">
        <button onClick={m.clear} className="w-full py-2 rounded-xl border border-white/5 bg-white/5 text-white/40 text-[10px] font-bold">Limpiar Filtros</button>
        <div className="grid grid-cols-2 gap-1.5">{SORT_OPTIONS.map(opt => <button key={opt.value} onClick={() => props.onSort(opt.value)} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-[10px] font-bold border ${props.sortOrder === opt.value ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-white/5 border-white/5 text-white/40"} ${opt.value === "relevance" ? "col-span-2 justify-center" : ""}`}>{SORT_ICONS[opt.value] || <SlidersHorizontal className="w-3.5 h-3.5" />}{opt.label}</button>)}</div>
        <button onClick={props.onRefresh} disabled={props.loading} className="w-full py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">{props.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{props.loading ? "Actualizando..." : "Actualizar"}</button>
      </div>
    </div>
  );
});
