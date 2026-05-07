"use client";

interface SkeletonLoaderProps {
  message?: string;
}

export function SkeletonLoader({ message = "Cargando..." }: SkeletonLoaderProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl animate-fade-in"
      style={{
        background: "color-mix(in srgb, var(--color-card) 80%, transparent)",
        border: "1px solid var(--color-border)",
        padding: "1.1rem 1.25rem",
        height: "152px",
      }}
    >
      {/* Shimmer sweep */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          animation: "shimmer 2.4s ease-in-out infinite",
          backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(187,150,228,0.05) 50%, transparent 100%)",
        }}
      />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 w-[3px] h-full"
        style={{ background: "linear-gradient(180deg, rgba(187,150,228,0.45) 0%, rgba(187,150,228,0.12) 60%, transparent 100%)" }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between mb-5 pl-3">
        <div className="h-2.5 rounded-full animate-pulse" style={{ width: "38%", background: "rgba(255,255,255,0.06)" }} />
        <div className="h-5 rounded-xl animate-pulse" style={{ width: "18%", background: "rgba(255,255,255,0.04)" }} />
      </div>

      {/* Content lines */}
      <div className="pl-3 space-y-3">
        <div className="h-2 rounded-full animate-pulse" style={{ width: "72%", background: "rgba(187,150,228,0.07)" }} />
        <div className="flex gap-2">
          <div className="h-4 rounded-full animate-pulse" style={{ width: "14%", background: "rgba(255,208,102,0.08)" }} />
          <div className="h-4 rounded-full animate-pulse" style={{ width: "20%", background: "rgba(255,255,255,0.04)" }} />
          <div className="h-4 rounded-full animate-pulse" style={{ width: "16%", background: "rgba(102,200,160,0.06)" }} />
        </div>
      </div>

      {/* Floating pill */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-float">
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-full whitespace-nowrap"
          style={{
            background: "color-mix(in srgb, var(--color-background) 90%, transparent)",
            border: "1px solid rgba(187,150,228,0.2)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span
            className="w-3 h-3 rounded-full border-2 animate-spin shrink-0"
            style={{ borderColor: "rgba(187,150,228,0.25)", borderTopColor: "var(--color-primary)" }}
          />
          <span className="font-label" style={{ color: "var(--color-accent)", opacity: 0.8, fontSize: "0.62rem" }}>
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}