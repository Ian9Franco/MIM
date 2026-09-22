"use client";

import React, { memo } from "react";
import { Download, Info, ExternalLink, Flame } from "lucide-react";
import { SecurityBadgeCompact } from "@/components/security/SecurityBadge";
import { formatNumber, openExternal } from "@/utils/format";
import { ModrinthIcon, CurseForgeIcon, BedrockIcon } from "@/components/fomo/parts/FomoPlatformIcons";
import { FomoCompatibilityBadge } from "@/components/fomo/parts/FomoCompatibilityBadge";
import { useActiveDraft } from "@/hooks/fomo/useActiveDraft";
import { activateDiscoverCard } from "@/lib/fomo/discoverCardActivation";
import { CollectibleSurface } from "@/components/fomo/shared/CollectibleSurface";
import { useModCardMeta } from "@/components/fomo/discover/useModCardMeta";
import { FomoModActions } from "@/components/fomo/discover/FomoModActions";
import { FomoModStatusBadges } from "@/components/fomo/discover/FomoModStatusBadges";

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
  riskScore, riskLevel, onSecurityDetails, followedByUsers = [],
  inDraft: inDraftProp,
  isUserFollowed = false,
  isUserFavorite = false,
  detailsOpenForThisMod = false,
}: any) {
  const { isProjectInDraft } = useActiveDraft();
  const projectId = mod.projectId || mod.id || mod.slug;
  const inDraft = inDraftProp ?? isProjectInDraft(projectId);
  const meta = useModCardMeta(mod);
  const {
    categories, isCF, isBedrock, isFabricOnly, isOnBoth, sortedTypes, modLoaders, otherCategories,
    bannerUrl, primaryType, bannerBgColor, fallbackTexture,
  } = meta;

  const platformBorderClass = isCF
    ? "border-orange-500/20 hover:border-orange-500/45 mim-discover-card--curse"
    : "border-emerald-500/20 hover:border-emerald-500/45";

  return (
    <CollectibleSurface
      className={`mim-discover-card flex flex-col h-85 overflow-hidden transition-all duration-500 relative group ${
        isSelected ? "ring-2 ring-primary shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]" : ""
      } ${isCF ? "rounded-xl" : "rounded-3xl"} ${platformBorderClass}`}
    >
    <article
      onClick={(event) => activateDiscoverCard({
        clickDetail: event.detail,
        detailsOpenForThisMod,
        isSelected: !!isSelected,
        openDetails: () => onOpenVersions(mod),
        toggleSelect: onToggleSelect ? () => onToggleSelect(mod) : undefined,
      })}
      className="flex flex-col h-full w-full cursor-pointer rounded-[inherit] overflow-hidden"
      style={{
        background: isCF ? "var(--color-cf-bg)" : "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(24px)",
        boxShadow: "inset 0 1px 1px 0 rgba(255,255,255,0.05)",
        borderColor: "rgba(255,255,255,0.08)",
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
        <div className="absolute inset-0 bg-linear-to-t from-[hsl(220,14%,10%)] via-transparent to-transparent z-20 pointer-events-none" />

        {/* Badges Container (Top-Left) */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          {/* Brand / Platform Badge */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border backdrop-blur-md bg-black/60 border-white/10 shadow-lg select-none">
            {isBedrock ? (
              <div className="flex items-center gap-1" title="Bedrock Addon — Minecraft Marketplace">
                <BedrockIcon />
                <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "#00CC44" }}>Bedrock</span>
              </div>
            ) : isOnBoth ? (
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
          
          {(inDraft || isUserFollowed || isUserFavorite) && (
            <FomoModStatusBadges
              inDraft={inDraft}
              isUserFollowed={isUserFollowed}
              isUserFavorite={isUserFavorite}
              layout="inline"
            />
          )}
        </div>

        {followedByUsers && followedByUsers.length > 0 && (
          <div className="absolute top-10 left-3 z-30">
            <FomoModStatusBadges followedByUsers={followedByUsers} layout="inline" />
          </div>
        )}

        <FomoModActions
          mod={mod}
          primaryType={primaryType}
          isBedrock={isBedrock}
          isDownloading={isDownloading}
          isSelected={isSelected}
          onDownload={onDownload}
          onToggleSelect={onToggleSelect}
          variant="floating"
        />
      </div>

      {/* 2. Contenido Principal */}
      <div className="p-4 flex flex-col grow relative z-30">
        
        {/* Perfil (Icono + Título) superpuesto al banner */}
        <div className="flex gap-3 mb-2 -mt-10 relative shrink-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[hsl(220,14%,10%)] border-4 border-[hsl(220,14%,10%)] shrink-0 shadow-xl group-hover:scale-105 transition-transform duration-500 relative z-10">
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
        <div className="flex flex-wrap gap-1.5 mb-2 overflow-hidden h-9 content-start">
          {/* Badge especial para Bedrock */}
          {isBedrock && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border shrink-0 bg-green-900/40 text-green-300 border-green-700/50">
              {(mod as any)._bedrockCost || "Bedrock"}
            </span>
          )}
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
    </CollectibleSurface>
  );
});