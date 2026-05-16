import React from "react";
import { Library, Trash2, X, Loader2, CloudUpload } from "lucide-react";
import { COLORS } from "@/theme/tokens";

// ── CollectionCard ──────────────────────────────────────────────────────────

export function CollectionCard({ coll, onOpen, onDelete, confirmDelete, onConfirmDelete, onCancelDelete, deleting, isOfficial, isLocal, isFollowed, onPublish, publishing }: any) {
  return (
    <div onClick={() => onOpen(coll)} className="w-full p-4 rounded-2xl transition-all group hover:bg-white/5 cursor-pointer border border-white/5 bg-white/3">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden shadow-lg">
          {coll.iconUrl ? <img src={coll.iconUrl} alt="" className="w-full h-full object-cover" /> : <Library className="w-6 h-6 opacity-30 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-headline text-base truncate flex items-center gap-2 text-white">
            {coll.name}
            {isOfficial && <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Oficial</span>}
            {isLocal && <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Local</span>}
            {isFollowed && <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Seguidos</span>}
          </p>
          <p className="text-xs opacity-60">{coll.projectCount} proyectos</p>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {onPublish && (
            <button 
              onClick={e => { e.stopPropagation(); onPublish(); }} 
              disabled={publishing}
              className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-primary/50 hover:text-primary transition-all"
              title="Publicar en Modrinth"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
            </button>
          )}
          {onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button onClick={e => { e.stopPropagation(); onConfirmDelete(); }} className="p-2 rounded-lg bg-red-500/20 text-red-400">{deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>
                <button onClick={e => { e.stopPropagation(); onCancelDelete(); }} className="p-2 rounded-lg bg-white/10 text-white/60"><X className="w-4 h-4" /></button>
              </div>
            ) : <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-400/50"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {coll.mods?.slice(0, 3).map((mod: any) => (
          <div key={mod.projectId} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shrink-0 overflow-hidden shadow-md">
            {mod.iconUrl ? <img src={mod.iconUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-30">{mod.title?.substring(0, 2)}</div>}
          </div>
        )) || [...Array(3)].map((_, i) => <div key={i} className="w-12 h-12 rounded-xl bg-white/2 border border-white/5 shrink-0" />)}
        {coll.projectCount > 3 && <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs opacity-60">+{coll.projectCount - 3}</div>}
      </div>
    </div>
  );
}
