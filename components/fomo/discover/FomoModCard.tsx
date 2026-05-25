"use client";

import React, { memo } from "react";
import { ListTree, Download, Loader2, Info, ExternalLink, CheckCircle2, Circle, Flame, FlaskConical, FlaskConicalOff, Check } from "lucide-react";
import { SecurityBadgeCompact } from "@/components/security/SecurityBadge";
import { formatNumber, openExternal } from "@/utils/format";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { COLORS } from "@/theme/tokens";
import { Chip } from "@/components/ui/primitives";
import { ModrinthIcon, CurseForgeIcon } from "@/components/fomo/parts/FomoPlatformIcons";
import { FomoCompatibilityBadge } from "@/components/fomo/parts/FomoCompatibilityBadge";
import {
  getBannerFallbackStyle,
  inferPrimaryProjectType,
  resolveModBannerUrl,
} from "@/lib/fomo/fomoModBanner";
import { useActiveDraft } from "@/hooks/fomo/useActiveDraft";

/**
 * @fileoverview Tarjeta Visual de Búsqueda y Descubrimiento (FOMO).
 * ─────────────────────────────────────────────────────────────────────────────
 * Componente atómico diseñado para presentar los metadatos de mods, texturas
 * o shaders provenientes de Modrinth y CurseForge de manera unificada.
 * Implementa acciones rápidas para descargar, seleccionar o ver detalles.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const FomoModCard = memo(function FomoModCard({
  mod, isDownloading, onDownload, onOpenVersions,
  isSelected, onToggleSelect, sinytraActive,
  riskScore, riskLevel, onSecurityDetails, followedByUsers = []
}: any) {
  const { isProjectInDraft, getDraftItem } = useActiveDraft();
  
  const draftItem = getDraftItem(mod.id || mod.slug);

  const categories = React.useMemo(() => {
    return (mod.categories || []).map((c: any) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object") {
        if (typeof c.name === "string") return c.name;
        if (typeof c.slug === "string") return c.slug;
      }
      return "";
    }).filter(Boolean);
  }, [mod.categories]);

  // Identificación del proveedor y exclusividad de loader
  const isCF = mod._source === "curseforge";
  const isFabricOnly = categories.includes("fabric") && !categories.includes("forge");

  // Disponibilidad en ambas plataformas
  const onModrinth = mod.availability?.modrinth ?? !isCF;
  const onCurseForge = mod.availability?.curseforge ?? isCF;
  const isOnBoth = onModrinth && onCurseForge;
  const isExclusive = !isOnBoth;
  const knownLoaders = ["forge", "fabric", "neoforge", "quilt"];
  const potentialTypes = ["datapack", "mod", "resourcepack", "shader", "textura", "modpack"];
  
  // Extraer los tipos reales del proyecto
  const foundTypes = new Set<string>();
  if (mod.projectType) {
    const pt = mod.projectType.toLowerCase();
    if (pt === "resourcepack") foundTypes.add("textura");
    else foundTypes.add(pt);
  }
  categories.forEach((c: string) => {
    const lc = c.toLowerCase();
    if (potentialTypes.includes(lc)) {
      if (lc === "resourcepack") foundTypes.add("textura");
      else foundTypes.add(lc);
    }
  });
  
  // Ordenar tipos: datapack > modpack > mod > otros
  const sortedTypes = Array.from(foundTypes).sort((a, b) => {
    if (a === "datapack") return -1;
    if (b === "datapack") return 1;
    if (a === "modpack") return -1;
    if (b === "modpack") return 1;
    if (a === "mod") return -1;
    if (b === "mod") return 1;
    return a.localeCompare(b);
  });

  const modLoaders = categories.filter((c: string) => knownLoaders.includes(c.toLowerCase())) || [];
  
  // Filtrar categorías que no sean ni loaders ni tipos base
  const otherCategories = categories.filter((c: string) => 
    !knownLoaders.includes(c.toLowerCase()) && 
    !potentialTypes.includes(c.toLowerCase()) &&
    c.toLowerCase() !== "resourcepack"
  ).slice(0, 2) || [];
  
  const bannerUrl = resolveModBannerUrl(mod);
  const primaryType = sortedTypes[0] || inferPrimaryProjectType(mod);
  const { bannerBgColor, fallbackTexture } = getBannerFallbackStyle(primaryType);

  return (
    <article 
      onClick={() => onToggleSelect?.(mod)}
      className={`flex flex-col transition-all duration-500 relative group cursor-pointer h-[340px] border border-white/5 overflow-hidden ${
        isSelected ? 'ring-2 ring-primary shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]' : 'hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:-translate-y-1'
      } ${isCF ? 'rounded-none' : 'rounded-3xl'}`}
      style={{ 
        background: isCF ? "var(--color-cf-bg)" : "rgba(255, 255, 255, 0.03)", 
        backdropFilter: "blur(24px)",
        boxShadow: "inset 0 1px 1px 0 rgba(255,255,255,0.05)",
        borderColor: "rgba(255,255,255,0.08)"
      }}
    >
      {/* 1. Banner Image */}
      <div className="relative h-28 w-full shrink-0 border-b border-white/5" style={{ backgroundColor: bannerBgColor }}>
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="w-full h-full object-cover relative z-10 opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        ) : (
          <div 
            className="absolute inset-0 opacity-80 pointer-events-none" 
            style={fallbackTexture} 
          />
        )}
        
        {/* Overlay degradado para texto si se necesita, o simplemente sombra interior */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,14%,10%)] via-transparent to-transparent z-20 pointer-events-none" />

        {/* Badges Container (Top-Left) */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          {/* Brand / Platform Badge */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border backdrop-blur-md bg-black/60 border-white/10 shadow-lg select-none">
            {isOnBoth ? (
              <div className="flex items-center gap-1" title="Disponible en ambas plataformas">
                <ModrinthIcon />
                <CurseForgeIcon />
              </div>
            ) : (
              <div className="flex items-center gap-1" title={isCF ? "Exclusivo de CurseForge" : "Exclusivo de Modrinth"}>
                {isCF ? <CurseForgeIcon /> : <ModrinthIcon />}
                <span className="text-[8px] font-black uppercase tracking-wider text-white/80">Excl.</span>
              </div>
            )}
          </div>
          
          {/* Draft Item Badge */}
          {draftItem && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border backdrop-blur-md bg-primary/20 border-primary/40 text-primary shadow-lg select-none" title={`Añadido al Draft por ${draftItem.username || 'ti'}`}>
              <Check className="w-2 h-2" />
              <span className="text-[8px] font-black uppercase tracking-wider">Draft</span>
            </div>
          )}
        </div>

        {/* Seguido por — aparece debajo del badge de exclusividad, mismo X */}
        {followedByUsers && followedByUsers.length > 0 && (
          <div 
            className="absolute top-10 left-3 z-30 flex items-center gap-1 px-1.5 py-0.5 rounded border backdrop-blur-md bg-black/60 border-white/10 shadow-lg select-none cursor-pointer hover:border-white/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              const first = followedByUsers[0];
              if (first?.username) {
                window.dispatchEvent(
                  new CustomEvent("fomo-open-community-user", {
                    detail: { username: first.username },
                  })
                );
              }
            }}
            title={`Ver perfil de @${followedByUsers[0]?.username}`}
          >
            <div className="flex items-center gap-0.5">
              {followedByUsers.slice(0, 3).map((info: any, i: number) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full overflow-hidden border shrink-0"
                  style={{ borderColor: info.color || 'rgba(255,255,255,0.2)' }}
                  title={`@${info.username}`}
                >
                  {info.avatar_url ? (
                    <img src={info.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[5px] font-black text-white" style={{ backgroundColor: info.color || 'var(--primary)' }}>
                      {(info.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="fomo-badge-seg-label text-[7px] font-black uppercase tracking-wider">
              Seg{followedByUsers.length > 1 ? ` x${followedByUsers.length}` : ""}
            </span>
          </div>
        )}

        {/* Botones de acción flotantes (Opción A del plan) */}
        <div className="absolute top-3 right-3 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(mod); }} 
            className={`fomo-action-btn w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-md transition-all shadow-xl hover:scale-110 active:scale-95 ${
              isSelected ? 'bg-primary border-primary text-white' : 'fomo-action-btn--list bg-black/60 border-white/20 text-white hover:bg-black/80'
            }`}
            title={isSelected ? "Quitar de la lista" : "Añadir a la lista"}
          >
            <ListTree className="w-4 h-4" />
          </button>
          {isProjectInDraft(mod.id || mod.slug) ? (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                window.dispatchEvent(new CustomEvent("fomo-remove-from-draft", {
                  detail: {
                    projectId: mod.id || mod.slug,
                  }
                }));
              }} 
              className="fomo-action-btn w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-md shadow-xl bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-110 active:scale-95"
              title="Quitar del Draft Activo"
            >
              <FlaskConicalOff className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                window.dispatchEvent(new CustomEvent("fomo-open-add-to-draft", {
                  detail: {
                    projectId: mod.id || mod.slug,
                    platform: mod._source || "modrinth",
                    title: mod.title,
                    contentType: primaryType === "textura" ? "resourcepack" : primaryType
                  }
                }));
              }} 
              className="fomo-action-btn w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-md transition-all shadow-xl hover:scale-110 active:scale-95 bg-black/60 border-white/20 text-white hover:bg-primary hover:border-primary"
              title="Añadir a Draft"
            >
              <FlaskConical className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(mod); }} 
            disabled={isDownloading} 
            className="fomo-action-btn fomo-action-btn--download w-9 h-9 rounded-full flex items-center justify-center border backdrop-blur-md bg-emerald-500/90 border-emerald-400 text-white hover:bg-emerald-500 transition-all shadow-xl hover:scale-110 active:scale-95"
            title="Descargar"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Contenido Principal */}
      <div className="p-4 flex flex-col grow relative z-30">
        
        {/* Perfil (Icono + Título) superpuesto al banner */}
        <div className="flex gap-3 mb-2 -mt-10 relative shrink-0">
          <div className="w-16 h-16 rounded-[1rem] overflow-hidden bg-[hsl(220,14%,10%)] border-4 border-[hsl(220,14%,10%)] shrink-0 shadow-xl group-hover:scale-105 transition-transform duration-500 relative z-10">
            {mod.iconUrl ? (
              <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Flame className="w-8 h-8 m-3 opacity-20" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-7 relative z-20 drop-shadow-md">
            <h3 className="font-bold truncate text-[15px] text-white/90 group-hover:text-white transition-colors">{mod.title}</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-white/50">
              <span className="truncate">por {mod.author}</span>
              <ExternalLink 
                className="w-3 h-3 cursor-pointer hover:text-primary transition-colors shrink-0" 
                onClick={(e) => { e.stopPropagation(); openExternal(mod.url); }} 
              />
            </div>
          </div>
        </div>

        {/* Descripción corta */}
        <p className="text-xs text-white/60 line-clamp-2 mt-2 mb-3 group-hover:text-white/80 transition-colors shrink-0 leading-relaxed">
          {mod.description}
        </p>

        {/* Predicción de Compatibilidad Asistida (Sinytra) */}
        {sinytraActive && isFabricOnly && (
          <div className="mb-3 shrink-0">
            <FomoCompatibilityBadge title={mod.title} categories={categories} />
          </div>
        )}

        {/* Draft Item Dedup Resolver remoted to top badge */}

        {/* Badges / Tags (Scrollable/Hidden if overflowing) */}
        <div className="flex flex-wrap gap-1.5 mb-2 overflow-hidden h-[36px] content-start">
          {/* Etiquetas de Tipo (Siempre primero, en mayúsculas y con color) */}
          {sortedTypes.map((type: string) => {
            const t = type.toLowerCase();
            let colors = "bg-white/5 text-white/50 border-white/10";
            if (t === "datapack") colors = "bg-emerald-900/40 text-emerald-300 border-emerald-700/50";
            else if (t === "textura" || t === "resourcepack") colors = "bg-amber-900/40 text-amber-300 border-amber-700/50";
            else if (t === "shader") colors = "bg-purple-900/40 text-purple-300 border-purple-700/50";
            else if (t === "modpack") colors = "bg-blue-900/20 text-blue-300 border-blue-700/30";
            else if (t === "mod") colors = "bg-rose-900/40 text-rose-300 border-rose-700/50";
            
            return (
              <span key={type} className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border shrink-0 ${colors}`}>
                {type}
              </span>
            );
          })}

          {/* Categorías Secundarias (Tags normales) */}
          {otherCategories.map((cat: string) => (
            <span key={cat} className="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide bg-white/10 text-foreground/60 border border-transparent shrink-0">
              {cat}
            </span>
          ))}
        </div>

        {/* Footer (Estadísticas y Detalles) */}
        <div className="flex items-center justify-between text-[11px] text-foreground/60 mt-auto pt-3 border-t border-foreground/10 shrink-0 bg-foreground/5 -mx-4 px-4 pb-0 -mb-4 h-14">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0 overflow-hidden">
            <div className="flex items-center gap-1 font-mono bg-foreground/10 px-1.5 py-1 rounded-md shrink-0">
              <Download className="w-3.5 h-3.5" /> {formatNumber(mod.downloads)}
            </div>

            {/* Loaders (Iconos Locales) en una sola fila (1-1-1-1) */}
            {modLoaders.length > 0 && (
              <div className="flex gap-1 shrink-0" title={`Loaders: ${modLoaders.join(", ")}`}>
                {modLoaders.map((loader: string) => {
                  const l = loader.toLowerCase();
                  let src = "";
                  if (l === "forge") src = "/modloaders/forge.png";
                  else if (l === "fabric") src = "/modloaders/fabric.png";
                  else if (l === "neoforge") src = "/modloaders/neo.png";
                  else if (l === "quilt") src = "/modloaders/quilt.png";
                  
                  if (src) {
                    return (
                      <div key={loader} className="bg-foreground/10 p-0.5 rounded-sm flex items-center justify-center">
                        <img src={src} alt={loader} title={loader} className="w-3.5 h-3.5 object-contain opacity-90 hover:opacity-100 transition-opacity cursor-help" />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
            
            {riskScore !== undefined && riskLevel && (
              <div className="shrink-0 hidden sm:block">
                <SecurityBadgeCompact riskScore={riskScore} riskLevel={riskLevel} onClick={onSecurityDetails} />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenVersions(mod); }} 
              className="px-2 py-1.5 sm:px-2.5 rounded-lg bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 hover:border-foreground/20 transition-all flex items-center gap-1 text-foreground/60 hover:text-foreground font-medium shrink-0"
            >
              <Info className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Detalles</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});