import React from "react";

export function SpotlightSkeleton() {
  return (
    <div className="flex-1 flex flex-col xl:flex-row h-full overflow-hidden p-6 gap-8">
      <style>{`
        @keyframes skel-typewriter {
          0% { width: 20%; }
          50% { width: 90%; }
          100% { width: 20%; }
        }
        @keyframes skel-pulse-scale {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(0.97); opacity: 0.1; }
        }
        @keyframes shimmer-bg {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skel-line {
          animation: skel-typewriter 4s ease-in-out infinite, shimmer-bg 2s linear infinite;
          background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 75%);
          background-size: 200% 100%;
        }
        .skel-card {
          animation: skel-pulse-scale 3s ease-in-out infinite, shimmer-bg 2s linear infinite;
          background: linear-gradient(135deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%);
          background-size: 200% 100%;
        }
        
        /* Overrides para tema claro (Modern) */
        [data-theme="modern"] .skel-line {
          background: linear-gradient(90deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.05) 75%);
        }
        [data-theme="modern"] .skel-card {
          background: linear-gradient(135deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.05) 75%);
        }
      `}</style>

      {/* Left Pane Skeleton */}
      <div className="flex-1 flex flex-col justify-between h-full relative xl:max-w-md 2xl:max-w-lg">
        <div className="mt-8 xl:mt-16 space-y-6">
          <div className="h-4 rounded-full mb-8 skel-line" style={{ animationDelay: "0s", animationDuration: "3s" }}></div>
          <div className="h-16 rounded-2xl skel-line" style={{ animationDelay: "0.2s", animationDuration: "5s" }}></div>
          <div className="h-16 rounded-2xl skel-line" style={{ animationDelay: "0.4s", animationDuration: "4s" }}></div>
          <div className="h-4 rounded-full mt-12 skel-line" style={{ animationDelay: "0.6s", animationDuration: "3.5s" }}></div>
          <div className="h-4 rounded-full mt-3 skel-line" style={{ animationDelay: "0.8s", animationDuration: "4.5s" }}></div>
        </div>
        <div className="mt-8 xl:mt-auto flex h-[40vh] xl:h-[280px] gap-4 pb-2">
          <div className="flex-1 rounded-[2rem] skel-card" style={{ animationDelay: "0s" }}></div>
          <div className="flex-1 rounded-[2rem] skel-card" style={{ animationDelay: "0.5s" }}></div>
        </div>
      </div>
      
      {/* Right Pane Skeleton */}
      <div className="flex-1 h-[70vh] xl:h-full relative rounded-[2.5rem] flex flex-col gap-6 py-6 p-4" style={{ background: "var(--glass-bg)", boxShadow: "var(--shadow-neomorphic-inner)" }}>
        <div className="flex-1 w-full flex items-center gap-6 overflow-hidden">
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0s" }}></div>
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0.2s" }}></div>
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0.4s" }}></div>
        </div>
        <div className="flex-1 w-full flex items-center gap-6 overflow-hidden">
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0.6s" }}></div>
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "0.8s" }}></div>
           <div className="w-[240px] xl:w-[260px] h-full max-h-[300px] rounded-[2rem] shrink-0 skel-card" style={{ animationDelay: "1s" }}></div>
        </div>
      </div>
    </div>
  );
}
