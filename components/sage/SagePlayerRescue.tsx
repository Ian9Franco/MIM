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
      <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
        <Heart className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-headline font-bold text-amber-400">Rescate de Jugador</p>
          <p className="text-[10px] text-foreground/40 mt-1 leading-relaxed">
            Si un jugador no puede entrar al mundo por un error en sus coordenadas o inventario, puedes resetear su estado aquí.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player List */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Jugadores Detectados</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {loadingPlayers && (
              <div className="py-10 flex flex-col items-center justify-center gap-2 opacity-30">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-[10px] font-bold uppercase">Buscando datos...</span>
              </div>
            )}
            {players.map((p: any) => (
              <button
                key={p.fileName}
                onClick={() => setSelectedPlayer(p)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  selectedPlayer?.fileName === p.fileName 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300" 
                    : "bg-white/2 border-white/5 text-foreground/40 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <div className="text-left">
                    <p className="text-[11px] font-bold">{p.isHost ? "Host / Singleplayer" : p.fileName}</p>
                    <p className="text-[9px] opacity-40 mt-0.5 uppercase tracking-tighter">Pos: {Math.round(p.pos?.[0] || 0)}, {Math.round(p.pos?.[1] || 0)}, {Math.round(p.pos?.[2] || 0)}</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Opciones de Rescate</h3>
          {selectedPlayer ? (
            <div className="p-5 rounded-2xl bg-black/20 border border-white/5 space-y-5">
              <div className="space-y-3">
                <OptionToggle label="Resetear Coordenadas" sub="Teletransporta al jugador al spawn seguro." checked={resetCoords} onChange={setResetCoords} icon={<MapPin className="w-3.5 h-3.5" />} />
                <OptionToggle label="Cambiar Dimensión" sub="Mueve al jugador al Overworld." checked={changeDimension} onChange={setChangeDimension} icon={<Layers className="w-3.5 h-3.5" />} />
                <OptionToggle label="Limpiar Inventario" sub="¡CUIDADO! Elimina todos los items del jugador." checked={clearInventory} onChange={setClearInventory} icon={<Package className="w-3.5 h-3.5" />} color="red" />
              </div>

              <button
                disabled={rescuingPlayer}
                onClick={() => onRescue({ resetCoords, clearInventory, newCoords, changeDimension, newDimension })}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {rescuingPlayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                Ejecutar Rescate
              </button>
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl opacity-20">
              <User className="w-10 h-10 mb-2" />
              <p className="text-[10px] font-bold uppercase">Selecciona un jugador</p>
            </div>
          )}

          {rescueLogs.length > 0 && (
            <div className={`p-4 rounded-xl border animate-fade-up ${rescueSuccess ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-red-500/5 border-red-500/20 text-red-400"}`}>
              <div className="flex items-center gap-2 mb-2">
                {rescueSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                <span className="text-[10px] font-bold uppercase">{rescueSuccess ? "Rescate Exitoso" : "Resultado"}</span>
              </div>
              <div className="text-[10px] space-y-1 font-mono">
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
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${checked ? `bg-${color}-500/10 border-${color}-500/30 text-${color}-400` : "bg-white/5 border-white/10 text-foreground/30"}`}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-bold text-foreground/80">{label}</p>
          <p className="text-[9px] text-foreground/30 leading-none mt-0.5">{sub}</p>
        </div>
      </div>
      <div className={`w-10 h-5 rounded-full p-1 transition-colors ${checked ? `bg-${color}-500/40` : "bg-white/10"}`}>
        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </div>
  );
}
