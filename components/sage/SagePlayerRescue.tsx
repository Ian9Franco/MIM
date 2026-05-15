import React, { useState } from "react";
import { User, MapPin, Package, Layers, Heart, Loader2, CheckCircle2, ChevronRight } from "lucide-react";

export function SagePlayerRescue({ 
  players, loadingPlayers, selectedPlayer, setSelectedPlayer, rescuingPlayer, rescueLogs, rescueSuccess, onRescue 
}: any) {
  const [resetCoords, setResetCoords] = useState(true);
  const [clearInventory, setClearInventory] = useState(false);
  const [changeDimension, setChangeDimension] = useState(true);
  const [newCoords, setNewCoords] = useState<[number, number, number]>([0, 80, 0]);
  const [newDimension, setNewDimension] = useState("minecraft:overworld");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
        <Heart className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-headline font-bold text-amber-400">Rescate de Jugador</p>
          <p className="text-xs text-white/50 mt-1 leading-relaxed">
            Si un jugador no puede entrar al mundo por un error en sus coordenadas o inventario, puedes resetear su estado aquí.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Player List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/30">Jugadores Detectados ({players.length})</h3>
          <div className="space-y-2.5 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
            {loadingPlayers && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-30">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">Buscando datos...</span>
              </div>
            )}
            {players.map((p: any) => (
              <button
                key={p.fileName}
                onClick={() => setSelectedPlayer(p)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  selectedPlayer?.fileName === p.fileName 
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-lg shadow-amber-500/10" 
                    : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-4">
                  <User className="w-5 h-5 opacity-70" />
                  <div className="text-left">
                    <p className="text-[14px] font-bold">{p.isHost ? "Host / Singleplayer" : p.fileName}</p>
                    <p className="text-[11px] opacity-40 mt-1 uppercase tracking-tight">Pos: {Math.round(p.pos?.[0] || 0)}, {Math.round(p.pos?.[1] || 0)}, {Math.round(p.pos?.[2] || 0)}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-30" />
              </button>
            ))}
            {!loadingPlayers && players.length === 0 && (
              <div className="py-10 text-center text-white/20 italic text-sm">No se encontraron archivos de jugador.</div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/30">Opciones de Rescate</h3>
          {selectedPlayer ? (
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-6">
              <div className="space-y-4">
                <OptionToggle label="Resetear Coordenadas" sub="Teletransporta al jugador al spawn seguro." checked={resetCoords} onChange={setResetCoords} icon={<MapPin className="w-4 h-4" />} />
                <OptionToggle label="Cambiar Dimensión" sub="Mueve al jugador al Overworld." checked={changeDimension} onChange={setChangeDimension} icon={<Layers className="w-4 h-4" />} />
                <OptionToggle label="Limpiar Inventario" sub="¡CUIDADO! Elimina todos los items del jugador." checked={clearInventory} onChange={setClearInventory} icon={<Package className="w-4 h-4" />} color="red" />
              </div>

              <button
                disabled={rescuingPlayer}
                onClick={() => onRescue({ resetCoords, clearInventory, newCoords, changeDimension, newDimension })}
                className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-[13px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/30 active:scale-95 flex items-center justify-center gap-3"
              >
                {rescuingPlayer ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5" />}
                Ejecutar Rescate
              </button>
            </div>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl opacity-20">
              <User className="w-12 h-12 mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Selecciona un jugador</p>
            </div>
          )}

          {rescueLogs.length > 0 && (
            <div className={`p-5 rounded-xl border animate-fade-up ${rescueSuccess ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-red-500/5 border-red-500/20 text-red-400"}`}>
              <div className="flex items-center gap-2.5 mb-3">
                {rescueSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                <span className="text-xs font-bold uppercase tracking-wider">{rescueSuccess ? "Rescate Exitoso" : "Resultado"}</span>
              </div>
              <div className="text-[11px] space-y-1.5 font-mono bg-black/20 p-3 rounded-lg overflow-x-auto">
                {rescueLogs.map((log: string, i: number) => <p key={i}>&gt; {log}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionToggle({ label, sub, checked, onChange, icon, color = "amber" }: any) {
  return (
    <div className="flex items-center justify-between gap-4 group cursor-pointer" onClick={() => onChange(!checked)}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${checked ? `bg-${color}-500/20 border-${color}-500/40 text-${color}-300` : "bg-white/5 border-white/10 text-white/20"}`}>
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-bold text-white/90">{label}</p>
          <p className="text-[11px] text-white/30 leading-tight mt-1">{sub}</p>
        </div>
      </div>
      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${checked ? `bg-${color}-500/40` : "bg-white/10"}`}>
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`} />
      </div>
    </div>
  );
}
