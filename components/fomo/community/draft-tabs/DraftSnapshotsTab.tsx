import React from "react";
import { HardDrive, Trash2, Puzzle, Image, Sun, Database } from "lucide-react";

export function DraftSnapshotsTab({
  draft,
  snapshots,
  user,
  isModern,
  setSnapshotToDelete,
  handleInstallSnapshot,
}: {
  draft: any;
  snapshots: any[];
  user: any;
  isModern: boolean;
  setSnapshotToDelete: (id: string) => void;
  handleInstallSnapshot: (snap: any) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className={`text-lg font-bold ${isModern ? "text-foreground" : "text-white"}`}>Snapshots (Versiones Congeladas)</h3>
      <p className={`text-sm ${isModern ? "text-muted-foreground" : "text-white/60"}`}>
        Los snapshots son versiones estables e inmutables de tu Draft que pueden ser instaladas por los usuarios.
      </p>

      <div className="flex flex-col gap-3 mt-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
        {snapshots.length === 0 ? (
          <div className={`p-8 text-center rounded-xl border border-dashed ${isModern ? "border-border text-muted-foreground" : "border-white/10 text-white/40"}`}>
            Aún no se ha creado ningún snapshot.
          </div>
        ) : (
          snapshots.map(snap => (
            <div key={snap.id} className={`p-4 rounded-xl border flex flex-col ${isModern ? "bg-background border-border" : "bg-black/20 border-white/10"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold text-lg ${isModern ? "text-foreground" : "text-white"}`}>{draft?.name} v{snap.version_number}</span>
                    <span className={`text-xs font-mono ${isModern ? "text-muted-foreground" : "text-white/50"}`}>
                      FP: {snap.fingerprint || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user?.id === draft?.owner_id && (
                    <button 
                      onClick={() => setSnapshotToDelete(snap.id)}
                      className="px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors"
                      title="Eliminar snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleInstallSnapshot(snap)}
                    className="px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg text-sm font-bold transition-colors"
                  >
                    Instalar
                  </button>
                </div>
              </div>
              
              {/* Snapshot Preview Grid */}
              {snap.manifest?.mods && snap.manifest.mods.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-black/10 border border-white/5">
                  {/* Mods */}
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${isModern ? "text-muted-foreground" : "text-white/40"} flex items-center gap-1.5`}><Puzzle className="w-3 h-3"/> Mods</h4>
                    {snap.manifest.mods.filter((m: any) => m.contentType === "mod" || !m.contentType).map((m: any, i: number) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-xs font-bold truncate text-foreground">{m.projectId}</span>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-widest self-start ${m.side === 'client' ? 'bg-blue-500/20 text-blue-400' : m.side === 'server' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {m.side || 'both'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Resource Packs */}
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${isModern ? "text-muted-foreground" : "text-white/40"} flex items-center gap-1.5`}><Image className="w-3 h-3"/> Texturas</h4>
                    {snap.manifest.mods.filter((m: any) => m.contentType === "resourcepack" || m.contentType === "textura").map((m: any, i: number) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-xs font-bold truncate text-foreground">{m.projectId}</span>
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-widest self-start bg-blue-500/20 text-blue-400">client</span>
                      </div>
                    ))}
                  </div>

                  {/* Shaders */}
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${isModern ? "text-muted-foreground" : "text-white/40"} flex items-center gap-1.5`}><Sun className="w-3 h-3"/> Shaders</h4>
                    {snap.manifest.mods.filter((m: any) => m.contentType === "shader").map((m: any, i: number) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-xs font-bold truncate text-foreground">{m.projectId}</span>
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-widest self-start bg-blue-500/20 text-blue-400">client</span>
                      </div>
                    ))}
                  </div>

                  {/* Datapacks */}
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${isModern ? "text-muted-foreground" : "text-white/40"} flex items-center gap-1.5`}><Database className="w-3 h-3"/> Datapacks</h4>
                    {snap.manifest.mods.filter((m: any) => m.contentType === "datapack").map((m: any, i: number) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-xs font-bold truncate text-foreground">{m.projectId}</span>
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-widest self-start bg-red-500/20 text-red-400">server</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
