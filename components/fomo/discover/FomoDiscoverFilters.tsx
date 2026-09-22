/**
 * MIM — FOMO Discover Filters
 * Optimized for v5.9: Modularized into hooks and configs.
 */

"use client";

import React, { memo, useMemo, useState, useEffect } from "react";
import { RefreshCw, Globe, Server, Tags, Sparkles, ChevronRight, ChevronDown, Zap } from "lucide-react";
import { LOADERS, GAME_VERSIONS, PROJECT_TYPES, MODRINTH_CATEGORIES, CURSEFORGE_CATEGORIES, RESOURCEPACK_FILTERS, SHADER_FILTERS, ENVIRONMENTS } from "@/constants/app";
import { useFomoFiltersManager } from "@/hooks/useFomoFiltersManager";
import { CATEGORY_ICONS } from "@/components/fomo/discover/FomoFilterConfig";

const SECTION_KEY = "fomo_discover_filter_sections";

function useSectionOpen(id: string, fallback = true) {
  const [open, setOpen] = useState(fallback);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SECTION_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (typeof parsed[id] === "boolean") setOpen(parsed[id]);
    } catch {
      // ignore
    }
  }, [id]);
  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem(SECTION_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[id] = next;
        localStorage.setItem(SECTION_KEY, JSON.stringify(parsed));
      } catch {
        // ignore
      }
      return next;
    });
  };
  return [open, toggle] as const;
}

function FilterSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, toggle] = useSectionOpen(id);
  return (
    <section className="fomo-filter-block rounded-xl border">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-bold">
        <span>{title}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
      </button>
      {open && <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>}
    </section>
  );
}

export const FomoDiscoverFilters = memo(function FomoDiscoverFilters(props: any) {
  const m = useFomoFiltersManager(props);
  const isAuthorSearch = props.query.startsWith("author:");
  const isBedrockSource = props.source === "chunk";
  const [projectTypeOpen, setProjectTypeOpen] = useState(false);
  const [loaderOpen, setLoaderOpen] = useState(false);
  const [versionQuery, setVersionQuery] = useState("");
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [remoteVersions, setRemoteVersions] = useState<string[]>([]);
  
  const [currentTheme, setCurrentTheme] = useState("official");
  
  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isModern = currentTheme === "modern";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/modrinth/game-versions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.versions)) setRemoteVersions(data.versions);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const versionOptions = useMemo(() => {
    const base = showAllVersions && remoteVersions.length ? remoteVersions : GAME_VERSIONS;
    const q = versionQuery.trim().toLowerCase();
    return q ? base.filter((v) => v.toLowerCase().includes(q)) : base;
  }, [showAllVersions, remoteVersions, versionQuery]);

  const currentFilters = useMemo(() => {
    if (m.isCurseForge) return [{ title: "Categorías (CurseForge)", items: CURSEFORGE_CATEGORIES[props.projectType as keyof typeof CURSEFORGE_CATEGORIES] || [] }];
    if (props.projectType === "mod" || props.projectType === "datapack" || props.projectType === "modpack") return [{ title: "Categorías", items: MODRINTH_CATEGORIES.map(c => ({ value: c })) }];
    if (props.projectType === "resourcepack") return [{ title: "Resolución", items: RESOURCEPACK_FILTERS.resolutions.map(c => ({ value: c })) }, { title: "Categorías", items: RESOURCEPACK_FILTERS.categories.map(c => ({ value: c })) }, { title: "Características", items: RESOURCEPACK_FILTERS.features.map(c => ({ value: c })) }];
    if (props.projectType === "shader") return [{ title: "Categorías", items: SHADER_FILTERS.categories.map(c => ({ value: c })) }, { title: "Características", items: SHADER_FILTERS.features.map(c => ({ value: c })) }, { title: "Rendimiento", items: SHADER_FILTERS.performance.map(c => ({ value: c })) }, { title: "Loader", items: SHADER_FILTERS.loaders.map(c => ({ value: c })) }];
    return [];
  }, [props.projectType, m.isCurseForge]);

  return (
    <div className="flex flex-col gap-2">
      {/* Panel especial para Bedrock Addons (chunk.gg) */}
      {isBedrockSource ? (
        <div className="flex-1 flex flex-col gap-4">
          <div className="rounded-2xl border border-[#00CC44]/20 bg-[#00CC44]/5 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#00CC44]/20 flex items-center justify-center">
                <span className="text-base">💎</span>
              </div>
              <div>
                <p className="text-[11px] font-black text-[#00CC44] uppercase tracking-widest">Bedrock Addons</p>
                <p className="text-[9px] text-white/40">Marketplace · chunk.gg</p>
              </div>
            </div>
            <p className="text-[10px] text-white/50 leading-relaxed">
              Explorando add-ons del Minecraft Bedrock Marketplace. Usa la barra de búsqueda para filtrar.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest flex items-center gap-2 opacity-50"><Sparkles className="w-3 h-3" /> Tipo de precio</p>
            {["gratis", "premium"].map(cat => (
              <button
                key={cat}
                onClick={() => {
                  const active = props.categories.includes(cat);
                  props.onCategories(active ? [] : [cat]);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${
                  props.categories.includes(cat)
                    ? "bg-[#00CC44]/20 text-[#00CC44] border-[#00CC44]/30"
                    : "bg-white/5 border-white/5 text-white/40"
                }`}
              >
                {cat === "gratis" ? "🆓" : "💰"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div className="mt-auto pt-4 border-t border-white/5">
            <button onClick={props.onRefresh} disabled={props.loading} className="w-full py-2.5 rounded-xl bg-[#00CC44] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              {props.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {props.loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>
      ) : (
      <div className="flex flex-col gap-2">
      <div className="fomo-filter-block flex shrink-0 flex-col gap-2 rounded-xl border p-3">
        {/* Project Type Dropdown */}
        <div className="relative">
          <button 
            onClick={() => !isAuthorSearch && (setProjectTypeOpen(!projectTypeOpen), setLoaderOpen(false))} 
            disabled={isAuthorSearch}
            className={`w-full text-xs font-bold border rounded-xl px-3.5 py-2.5 flex justify-between items-center ${isAuthorSearch ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${isModern ? "bg-white text-slate-700 border-slate-200" : "bg-black/20 text-white border-white/10"}`}
          >
            <span>{isAuthorSearch ? "Cualquier Tipo" : (PROJECT_TYPES.find(pt => pt.value === props.projectType)?.label || "Seleccionar Tipo")}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${projectTypeOpen ? "rotate-180" : ""}`} />
          </button>
          
          {projectTypeOpen && !isAuthorSearch && (
            <div className={`absolute top-full left-0 w-full mt-1 backdrop-blur-md border rounded-xl overflow-hidden z-50 shadow-xl ${isModern ? "bg-white border-slate-200" : "bg-neutral-900/95 border-white/10"}`}>
              {PROJECT_TYPES.map(pt => (
                <div 
                  key={pt.value} 
                  onClick={() => { props.onProjectType(pt.value); setProjectTypeOpen(false); }} 
                  className={`px-3.5 py-2.5 text-xs font-bold hover:bg-primary/10 cursor-pointer ${isModern ? "text-slate-700" : "text-white"} ${props.projectType === pt.value ? "bg-primary/20 text-primary" : ""}`}
                >
                  {pt.label}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Loader Dropdown */}
        {(props.projectType === "mod" || props.projectType === "modpack" || isAuthorSearch) && (
          <div className="relative">
            <button 
              onClick={() => !isAuthorSearch && (setLoaderOpen(!loaderOpen), setProjectTypeOpen(false))} 
              disabled={isAuthorSearch}
              className={`w-full text-xs font-bold border rounded-xl px-3.5 py-2.5 flex justify-between items-center ${isAuthorSearch ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${isModern ? "bg-white text-slate-700 border-slate-200" : "bg-black/20 text-white border-white/10"}`}
            >
              <span>{isAuthorSearch ? "Cualquier Loader" : (props.loader === "unknown" ? "Cualquier Loader" : (props.loader.charAt(0).toUpperCase() + props.loader.slice(1)))}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${loaderOpen ? "rotate-180" : ""}`} />
            </button>
            
            {loaderOpen && !isAuthorSearch && (
              <div className={`absolute top-full left-0 w-full mt-1 backdrop-blur-md border rounded-xl overflow-hidden z-50 shadow-xl ${isModern ? "bg-white border-slate-200" : "bg-neutral-900/95 border-white/10"}`}>
                <div 
                  onClick={() => { props.onLoader("unknown"); setLoaderOpen(false); }} 
                  className={`px-3.5 py-2.5 text-xs font-bold hover:bg-primary/10 cursor-pointer ${isModern ? "text-slate-700" : "text-white"} ${props.loader === "unknown" ? "bg-primary/20 text-primary" : ""}`}
                >
                  Cualquier Loader
                </div>
                {LOADERS.map(l => (
                  <div 
                    key={l} 
                    onClick={() => { props.onLoader(l); setLoaderOpen(false); }} 
                    className={`px-3.5 py-2.5 text-xs font-bold hover:bg-primary/10 cursor-pointer ${isModern ? "text-slate-700" : "text-white"} ${props.loader === l ? "bg-primary/20 text-primary" : ""}`}
                  >
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <section className="fomo-filter-block flex flex-col gap-2 rounded-xl border p-3">
          <p className="flex items-center gap-2 text-xs font-bold"><Sparkles className="w-3 h-3" /> Exclusividad</p>
          <button onClick={() => props.onOnlyExclusives(!props.onlyExclusives)} className={`flex items-center justify-between w-full p-2.5 rounded-xl border text-[10px] font-bold ${props.onlyExclusives ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-white/5 border-white/5 text-white/40"}`}>
            <div className="flex flex-col items-start gap-0.5">
              <span>Solo Exclusivos</span>
              <span className="text-[8px] opacity-60 normal-case font-normal">
                {props.source === "curseforge" ? "Solo en CurseForge, no en Modrinth" : props.source === "modrinth" ? "Solo en Modrinth, no en CurseForge" : "Solo en una plataforma"}
              </span>
            </div>
            <div className={`w-6 h-3.5 rounded-full p-0.5 ${props.onlyExclusives ? "bg-orange-500" : "bg-white/10"}`}><div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${props.onlyExclusives ? "translate-x-2.5" : "translate-x-0"}`} /></div>
          </button>
        </section>

        {/* Sinytra Connector toggle: visible solo para Forge/NeoForge buscando en Modrinth */}
        {(props.loader === "forge" || props.loader === "neoforge") && (
          <section className="fomo-filter-block flex flex-col gap-2 rounded-xl border p-3">
            <p className="flex items-center gap-2 text-xs font-bold"><Zap className="w-3 h-3" /> Compatibilidad</p>
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
          </section>
        )}

        <FilterSection id="versions" title="Versión" icon={<Globe className="w-3 h-3" />}>
          <input
            value={versionQuery}
            onChange={(e) => setVersionQuery(e.target.value)}
            placeholder="Buscar versión..."
            className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-[10px] outline-none"
            style={{ borderColor: "var(--fomo-border)", color: "var(--fomo-text-primary)" }}
          />
          <div className="flex flex-wrap gap-1.5">
            {versionOptions.map(v => <button key={v} onClick={() => m.toggleFilter(props.gameVersions, props.onVersions, v)} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${props.gameVersions.includes(v) ? "bg-primary text-white border-primary" : "bg-white/5 border-white/5 text-white/40"}`}>{v}</button>)}
          </div>
          <button type="button" onClick={() => setShowAllVersions((v) => !v)} className="text-left text-[10px] font-bold text-primary">
            {showAllVersions ? "Mostrar versiones recientes" : "Mostrar todas las versiones"}
          </button>
        </FilterSection>

        {!m.isCurseForge && (
          <FilterSection id="environment" title="Entorno" icon={<Server className="w-3 h-3" />}>
            <div className="flex flex-wrap gap-1.5">
              {ENVIRONMENTS.map(e => (
                <button 
                  key={e.value} 
                  onClick={() => props.onEnvironments((props.environments || []).includes(e.value) ? [] : [e.value])} 
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${(props.environments || []).includes(e.value) ? "bg-primary text-white border-primary" : "bg-white/5 border-white/5 text-white/40"}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        {currentFilters.map(group => (
          <FilterSection key={group.title} id={`cat-${group.title}`} title={group.title} icon={<Tags className="w-3 h-3" />}>
            <div className="flex flex-col gap-1.5">{group.items.map((cat: any) => {
              const val = typeof cat === 'string' ? cat : cat.value;
              const active = props.categories.includes(val);
              const hasSub = typeof cat !== 'string' && cat.sub?.length > 0;
              return (
                <div key={val} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => {
                      if (hasSub) {
                        m.setExpandedCats((p: string[]) => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);
                      } else {
                        if (m.isCurseForge) {
                          if (active) props.onCategories([]);
                          else props.onCategories([val]);
                        } else {
                          m.toggleFilter(props.categories, props.onCategories, val);
                        }
                      }
                    }} className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${active ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 border-white/5 text-white/40"}`}>{CATEGORY_ICONS[val] || <Tags className="w-3 h-3" />}{val}</button>
                    {hasSub && <button onClick={() => m.setExpandedCats(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val])} className="p-1.5 rounded-lg border border-white/5">{m.expandedCats.includes(val) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</button>}
                  </div>
                  {hasSub && m.expandedCats.includes(val) && (
                    <div className="pl-4 flex flex-wrap gap-1">
                      {cat.sub.map((s: string) => {
                        const subActive = props.categories.includes(s);
                        return (
                          <button 
                            key={s} 
                            onClick={() => {
                              if (m.isCurseForge) {
                                if (subActive) props.onCategories([]);
                                else props.onCategories([s]);
                              } else {
                                m.toggleFilter(props.categories, props.onCategories, s);
                              }
                            }} 
                            className={`px-2 py-1 rounded-md text-[9px] font-bold border ${subActive ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 border-white/5 text-white/40"}`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}</div>
          </FilterSection>
        ))}
      </div>

      <div className="pt-4 border-t border-white/5 flex flex-col gap-3 shrink-0">
        <button onClick={m.clear} className="w-full py-2 rounded-xl border border-white/5 bg-white/5 text-white/40 text-[10px] font-bold">Limpiar Filtros</button>
        <button onClick={props.onRefresh} disabled={props.loading} className="w-full py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">{props.loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{props.loading ? "Actualizando..." : "Actualizar"}</button>
      </div>
      </div>
      )}
    </div>
  );
});
