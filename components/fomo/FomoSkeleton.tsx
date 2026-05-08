"use client";

import React from "react";

interface FomoSkeletonProps {
  message?: string;
  count?: number;
  variant?: "list" | "card";
  isCurseForge?: boolean;
}

export function FomoSkeleton({ 
  message = "Cargando...", 
  count = 4, 
  variant = "list",
  isCurseForge = false 
}: FomoSkeletonProps) {
  
  if (variant === "card") {
    return (
      <div className="flex-1 flex flex-col p-0 space-y-0 animate-fade-in overflow-hidden relative">
        <div className={`grid grid-cols-1 lg:grid-cols-2 ${count > 6 ? "xl:grid-cols-3" : ""} gap-4 content-start`}>
          {Array.from({ length: count }).map((_, i) => (
            <div 
              key={i} 
              className={`relative p-4 flex flex-col h-[380px] transition-all ${
                isCurseForge ? "rounded-none border-2 border-orange-900/20" : "rounded-[1.35rem] border border-white/5"
              }`}
              style={{ 
                animationDelay: `${i * 0.1}s`,
                opacity: 1 - (i * 0.08),
                background: isCurseForge ? "rgba(30, 20, 10, 0.4)" : "color-mix(in srgb, var(--color-card) 60%, transparent)",
                borderColor: isCurseForge ? "rgba(241, 100, 54, 0.15)" : "var(--color-border)"
              }}
            >
              {/* Shimmer sweep */}
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  animation: "shimmer 2s ease-in-out infinite",
                  backgroundImage: `linear-gradient(90deg, transparent 0%, ${isCurseForge ? "rgba(241, 100, 54, 0.05)" : "color-mix(in srgb, var(--color-primary) 10%, transparent)"} 50%, transparent 100%)`,
                  animationDelay: `${i * 0.15}s`
                }}
              />

              <div className="flex items-start gap-4 mb-4 relative z-10">
                {/* Icon Mockup */}
                <div 
                  className={`w-16 h-16 shrink-0 animate-pulse ${isCurseForge ? "rounded-none" : "rounded-2xl"}`}
                  style={{ background: "var(--color-secondary-bg)", border: "1px solid var(--color-border)" }}
                />
                
                <div className="flex-1 space-y-2 mt-1">
                  {/* Title */}
                  <div className="h-4 rounded-full bg-white/10 w-4/5 animate-grow" style={{ animationDelay: `${i * 0.1}s` }} />
                  {/* Author */}
                  <div className="h-2 rounded-full bg-white/5 w-2/5 animate-grow" style={{ animationDelay: `${i * 0.1 + 0.1}s` }} />
                </div>
              </div>

              {/* Chips row */}
              <div className="flex gap-2 mb-6 relative z-10">
                <div className="w-12 h-5 rounded-full bg-primary/10 animate-pulse" />
                <div className="w-16 h-5 rounded-full bg-white/5 animate-pulse" />
                <div className="w-14 h-5 rounded-full bg-emerald-500/10 animate-pulse ml-auto" />
              </div>

              {/* Description lines */}
              <div className="space-y-2 mb-6 relative z-10">
                <div className="h-2 rounded-full bg-white/5 w-full animate-grow" style={{ animationDelay: `${i * 0.1 + 0.2}s` }} />
                <div className="h-2 rounded-full bg-white/5 w-[90%] animate-grow" style={{ animationDelay: `${i * 0.1 + 0.25}s` }} />
              </div>

              {/* Tags Mockup */}
              <div className="mb-6 relative z-10">
                <div className="h-1.5 w-10 bg-white/10 rounded-full mb-3 opacity-30" />
                <div className="flex flex-wrap gap-2">
                  <div className="w-12 h-5 rounded-full bg-white/5 border border-white/5 animate-pulse" />
                  <div className="w-14 h-5 rounded-full bg-white/5 border border-white/5 animate-pulse" />
                  <div className="w-10 h-5 rounded-full bg-white/5 border border-white/5 animate-pulse" />
                </div>
              </div>

              {/* Buttons grid at the bottom */}
              <div className="mt-auto grid grid-cols-3 gap-2 relative z-10">
                <div className={`h-9 bg-white/5 border border-white/10 animate-pulse ${isCurseForge ? "" : "rounded-xl"}`} />
                <div className={`h-9 bg-emerald-500/5 border border-emerald-500/10 animate-pulse ${isCurseForge ? "" : "rounded-xl"}`} />
                <div className={`h-9 bg-white/5 border border-white/10 animate-pulse ${isCurseForge ? "" : "rounded-xl"}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Floating Indicator */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 animate-float pointer-events-none z-50">
          <div 
            className="px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl border"
            style={{ 
              background: "color-mix(in srgb, var(--color-background) 80%, transparent)", 
              borderColor: "var(--color-accent-border)",
              backdropFilter: "blur(12px)"
            }}
          >
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)", borderTopColor: "var(--color-primary)" }} />
            <span className="text-[10px] font-headline tracking-[0.2em] uppercase" style={{ color: "var(--color-muted)" }}>
              {message}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default List Variant (for collections)
  return (
    <div className="flex-1 flex flex-col p-4 space-y-4 animate-fade-in overflow-hidden relative">
      {/* Search/New Collection Button Mockup */}
      <div 
        className="w-full h-16 rounded-2xl border-2 border-dashed animate-pulse shrink-0" 
        style={{ borderColor: "var(--color-border)", background: "var(--color-secondary-bg)" }}
      />
      
      <div className="space-y-3 flex-1 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div 
            key={i} 
            className="relative p-3 rounded-2xl overflow-hidden"
            style={{ 
              animationDelay: `${i * 0.1}s`,
              opacity: 1 - (i * 0.15),
              background: "color-mix(in srgb, var(--color-card) 60%, transparent)",
              border: "1px solid var(--color-border)"
            }}
          >
            {/* Shimmer sweep */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                animation: "shimmer 2.4s ease-in-out infinite",
                backgroundImage: "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--color-primary) 10%, transparent) 50%, transparent 100%)",
                animationDelay: `${i * 0.2}s`
              }}
            />

            <div className="flex items-center gap-3 relative z-10">
              {/* Icon Mockup */}
              <div 
                className="w-12 h-12 rounded-xl shrink-0 animate-pulse" 
                style={{ background: "var(--color-secondary-bg)", border: "1px solid var(--color-border)" }}
              />
              
              <div className="flex-1 space-y-2">
                {/* Title Line */}
                <div 
                  className="h-3 rounded-full origin-left animate-grow" 
                  style={{ background: "var(--color-hover)", width: "65%", animationDelay: `${i * 0.1}s` }}
                />
                {/* Subtitle Line */}
                <div 
                  className="h-2 rounded-full origin-left animate-grow" 
                  style={{ background: "var(--color-secondary-bg)", width: "35%", animationDelay: `${i * 0.1 + 0.1}s` }}
                />
                
                {/* Badges Mockup */}
                <div className="flex gap-1.5 pt-1">
                  <div className="w-10 h-3 rounded-full animate-pulse" style={{ background: "var(--color-accent-bg)", border: "1px solid var(--color-accent-border)" }} />
                  <div className="w-12 h-3 rounded-full animate-pulse" style={{ background: "var(--color-secondary-bg)", border: "1px solid var(--color-border)" }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float pointer-events-none z-20">
        <div 
          className="px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl border"
          style={{ 
            background: "color-mix(in srgb, var(--color-background) 80%, transparent)", 
            borderColor: "var(--color-accent-border)",
            backdropFilter: "blur(12px)"
          }}
        >
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)", borderTopColor: "var(--color-primary)" }} />
          <span className="text-[10px] font-headline tracking-[0.2em] uppercase" style={{ color: "var(--color-muted)" }}>
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
