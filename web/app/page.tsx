"use client";

import React, { useState } from "react";
import { Clock, Calendar, Compass, Share2, Download, ExternalLink, X, Film } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { VerticalTicker, ModHit } from "../components/SpotlightMarquees";
import { mockUpdatedMods, mockNewestMods } from "../lib/mockData";

export default function Home() {
  const [activeTab, setActiveTab] = useState("spotlight");
  const [selectedMod, setSelectedMod] = useState<ModHit | null>(null);

  const handleOpenModDetails = (mod: ModHit) => {
    setSelectedMod(mod);
  };

  const handleCloseModDetails = () => {
    setSelectedMod(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-4 pt-6">
      
      {/* Header Bar */}
      <header className="flex justify-between items-center mb-6 px-1">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-orange-500 font-bold">MIM Hub</span>
          <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">FOMO Feed</h1>
        </div>
        <button 
          onClick={() => alert("¡Pronto vas a poder sincronizar tus mods guardados en la web!")}
          className="bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-full p-2 text-white/70 active:scale-95 transition-all"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      {/* Main Tab Routing */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {activeTab === "spotlight" && (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
            {/* Spotlight mini headline */}
            <div className="bg-gradient-to-r from-orange-500/10 to-transparent border-l-2 border-orange-500 rounded-r-lg p-3 mb-6">
              <p className="text-[10px] font-mono text-orange-400 uppercase tracking-wider font-bold">Trending Now</p>
              <h2 className="text-xs font-semibold text-white/90 mt-1">Los mods más buscados de las últimas 24 horas.</h2>
            </div>

            {/* Tickers container side-by-side */}
            <div className="flex-1 flex gap-4 min-h-0 pb-6">
              
              {/* Column 1: Recently Updated */}
              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-[11px] font-bold text-white/80 tracking-wide mb-3 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Actualizados
                </h3>
                <div className="flex-1 relative bg-white/[0.01] rounded-xl border border-white/[0.03]">
                  <VerticalTicker 
                    mods={mockUpdatedMods} 
                    onSelectMod={handleOpenModDetails}
                    speed={0.4}
                    color="text-blue-400"
                    reverse={true}
                  />
                </div>
              </div>

              {/* Column 2: Newest Created */}
              <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-[11px] font-bold text-white/80 tracking-wide mb-3 flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" /> Creados
                </h3>
                <div className="flex-1 relative bg-white/[0.01] rounded-xl border border-white/[0.03]">
                  <VerticalTicker 
                    mods={mockNewestMods} 
                    onSelectMod={handleOpenModDetails}
                    speed={0.5}
                    color="text-purple-400"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 animate-fade-in">
            <Film className="w-12 h-12 text-blue-400 mb-4 opacity-50" />
            <h2 className="text-sm font-semibold text-white">Canales de YouTube</h2>
            <p className="text-xs text-white/50 mt-2 max-w-xs leading-relaxed">
              Pronto vas a poder explorar el feed integrado de videos de creadores mostrando mods instalables desde tu celular.
            </p>
          </div>
        )}

        {activeTab === "rankings" && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 animate-fade-in">
            <Compass className="w-12 h-12 text-purple-400 mb-4 opacity-50" />
            <h2 className="text-sm font-semibold text-white">Ránkings Globales</h2>
            <p className="text-xs text-white/50 mt-2 max-w-xs leading-relaxed">
              Los packs y mods más votados por la comunidad de MIM.
            </p>
          </div>
        )}

        {activeTab === "saved" && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-6 animate-fade-in">
            <Compass className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
            <h2 className="text-sm font-semibold text-white font-headline">Mods Guardados</h2>
            <p className="text-xs text-white/50 mt-2 max-w-xs leading-relaxed">
              Iniciá sesión para ver los mods que marcaste en tu PC y descargarlos en donde quieras.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Nav Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Mod Details Sheet / Modal */}
      {selectedMod && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end justify-center z-50 animate-fade-in" onClick={handleCloseModDetails}>
          <div 
            className="bg-[#151518] border-t border-white/[0.08] rounded-t-3xl w-full max-w-md p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-5 relative translate-y-0 transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag line */}
            <div className="w-12 h-1.5 rounded-full bg-white/10 mx-auto -mt-2 mb-2" />

            {/* Header info */}
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center overflow-hidden">
                {selectedMod.iconUrl ? (
                  <img src={selectedMod.iconUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/40 font-bold uppercase">{selectedMod.title.substring(0, 2)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-orange-400 font-semibold">Mod Hit</span>
                <h3 className="text-sm font-bold text-white truncate mt-0.5">{selectedMod.title}</h3>
                <p className="text-[10px] text-white/40 mt-1">Autor: {selectedMod.author}</p>
              </div>
              <button 
                onClick={handleCloseModDetails}
                className="bg-white/5 hover:bg-white/10 rounded-full p-1.5 self-start text-white/60 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
              <p className="text-xs text-white/70 leading-relaxed">
                {selectedMod.description || "Este mod es genial y expande significativamente las posibilidades de juego en Minecraft."}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-2">
              <a
                href={selectedMod.url || `https://modrinth.com/mod/${selectedMod.projectId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4" /> Descargar Manual
              </a>
              <button
                onClick={() => alert(`Para instalar ${selectedMod.title} de forma automática de un click, abrí la aplicación de escritorio de MIM.`)}
                className="bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white font-medium text-xs rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4" /> En PC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
