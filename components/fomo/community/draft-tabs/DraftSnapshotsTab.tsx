import React, { useState } from "react";
import { HardDrive, Trash2, Puzzle, Image, Glasses, Database, Download, ChevronDown, ChevronRight, Package, Calendar, Fingerprint, Archive, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const TYPE_META: Record<string, { label: string; icon: typeof Puzzle; color: string }> = {
  mod:          { label: "Mods",      icon: Puzzle,   color: "text-primary" },
  resourcepack: { label: "Texturas",  icon: Image,    color: "text-amber-400" },
  shader:       { label: "Shaders",   icon: Glasses,  color: "text-purple-400" },
  datapack:     { label: "Datapacks", icon: Database, color: "text-emerald-400" },
};

function getManifestCounts(manifest: any) {
  if (!manifest?.mods) return { total: 0, mods: 0, resourcepacks: 0, shaders: 0, datapacks: 0 };
  const mods = manifest.mods.filter((m: any) => m.contentType === "mod" || !m.contentType).length;
  const resourcepacks = manifest.mods.filter((m: any) => m.contentType === "resourcepack" || m.contentType === "textura").length;
  const shaders = manifest.mods.filter((m: any) => m.contentType === "shader").length;
  const datapacks = manifest.mods.filter((m: any) => m.contentType === "datapack").length;
  return { total: mods + resourcepacks + shaders + datapacks, mods, resourcepacks, shaders, datapacks };
}

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
  const [expandedSnap, setExpandedSnap] = useState<string | null>(null);

  const txt = isModern ? "text-foreground" : "text-white";
  const txtSub = isModern ? "text-muted-foreground" : "text-white/50";
  const cardBg = isModern ? "bg-card border-border" : "bg-white/[0.03] border-white/[0.06]";

  const handleOpenDetails = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("fomo-open-details", {
        detail: {
          projectId: item.projectId,
          platform: item.source === "curseforge" ? "curseforge" : "modrinth",
          contentType: item.contentType || "mod",
          title: item.mod_name || item.projectId
        },
      })
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-bold ${txt}`}>Snapshots</h3>
          <p className={`text-xs mt-0.5 ${txtSub}`}>
            Versiones congeladas de tu Draft que cualquier miembro puede instalar.
          </p>
        </div>
        {snapshots.length > 0 && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isModern ? "bg-muted text-muted-foreground" : "bg-white/5 text-white/40"}`}>
            {snapshots.length} {snapshots.length === 1 ? "versión" : "versiones"}
          </span>
        )}
      </div>

      {/* Snapshots list */}
      <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
        {snapshots.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl ${isModern ? "border-border" : "border-white/10"}`}>
            <Archive className="w-10 h-10 text-primary/30 mb-4" />
            <p className={`text-sm font-bold ${txtSub}`}>Sin snapshots</p>
            <p className={`text-xs mt-1 max-w-xs text-center ${isModern ? "text-muted-foreground/60" : "text-white/30"}`}>
              Crea un snapshot cuando tu draft esté listo para compartir.
            </p>
          </div>
        ) : (
          snapshots.map((snap, index) => {
            const counts = getManifestCounts(snap.manifest);
            const isExpanded = expandedSnap === snap.id;
            const isLatest = index === 0;
            const createdAgo = snap.created_at
              ? formatDistanceToNow(new Date(snap.created_at), { addSuffix: true, locale: es })
              : null;

            return (
              <div
                key={snap.id}
                className={`shrink-0 rounded-2xl border overflow-hidden transition-all duration-300 ${cardBg} ${
                  isLatest ? (isModern ? "ring-1 ring-primary/20" : "ring-1 ring-primary/15") : ""
                }`}
              >
                {/* Snapshot header */}
                <div className="flex items-center gap-4 p-4">
                  {/* Version circle */}
                  <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isLatest ? "bg-primary/15" : (isModern ? "bg-muted" : "bg-white/5")
                  }`}>
                    <span className={`text-lg font-black ${isLatest ? "text-primary" : txtSub}`}>
                      v{snap.version_number}
                    </span>
                    {isLatest && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-base truncate ${txt}`}>
                        {draft?.name}
                      </span>
                      {isLatest && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-widest">
                          Última
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 mt-0.5 text-[11px] ${txtSub}`}>
                      {/* Item count pills */}
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3 h-3" />
                        <span className="font-semibold">{counts.total} items</span>
                      </div>
                      {createdAgo && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{createdAgo}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type pills (compact summary) */}
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    {counts.mods > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <Puzzle className="w-2.5 h-2.5" /> {counts.mods}
                      </span>
                    )}
                    {counts.resourcepacks > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                        <Image className="w-2.5 h-2.5" /> {counts.resourcepacks}
                      </span>
                    )}
                    {counts.shaders > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                        <Glasses className="w-2.5 h-2.5" /> {counts.shaders}
                      </span>
                    )}
                    {counts.datapacks > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        <Database className="w-2.5 h-2.5" /> {counts.datapacks}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {counts.total > 0 && (
                      <button
                        onClick={() => setExpandedSnap(isExpanded ? null : snap.id)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          isExpanded
                            ? "bg-primary/10 text-primary"
                            : (isModern ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "text-white/30 hover:bg-white/5 hover:text-white/60")
                        }`}
                        title="Ver contenido"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}

                    {user?.id === draft?.owner_id && (
                      <button
                        onClick={() => setSnapshotToDelete(snap.id)}
                        className="p-2 rounded-xl text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                        title="Eliminar snapshot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleInstallSnapshot(snap)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Instalar
                    </button>
                  </div>
                </div>

                {/* Expandable manifest preview */}
                {isExpanded && snap.manifest?.mods && snap.manifest.mods.length > 0 && (
                  <div className={`px-4 pb-4 animate-in slide-in-from-top-2 duration-200`}>
                    <div className={`rounded-xl border p-3 ${isModern ? "bg-muted/30 border-border/50" : "bg-black/20 border-white/[0.06]"}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(["mod", "resourcepack", "shader", "datapack"] as const).map((type) => {
                          const meta = TYPE_META[type];
                          const Icon = meta.icon;
                          const typeItems = snap.manifest.mods.filter((m: any) =>
                            type === "mod"
                              ? m.contentType === "mod" || !m.contentType
                              : m.contentType === type || (type === "resourcepack" && m.contentType === "textura")
                          );

                          if (typeItems.length === 0) return null;

                          return (
                            <div key={type} className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${txtSub}`}>
                                  <Icon className={`w-3 h-3 ${meta.color}`} />
                                  {meta.label}
                                </span>
                                <span className={`text-[9px] font-bold ${txtSub}`}>{typeItems.length}</span>
                              </div>
                              <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                {typeItems.map((m: any, i: number) => (
                                  <div
                                    key={i}
                                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                                      isModern ? "bg-background/60" : "bg-white/[0.03]"
                                    }`}
                                  >
                                    {m.icon_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={m.icon_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                                    ) : (
                                      <div className={`w-5 h-5 rounded flex items-center justify-center ${isModern ? "bg-muted" : "bg-white/5"}`}>
                                        <Icon className={`w-2.5 h-2.5 ${meta.color}`} />
                                      </div>
                                    )}
                                    <span className={`text-xs font-medium truncate ${txt}`}>
                                      {m.mod_name || m.projectId}
                                    </span>
                                    <button
                                      onClick={(e) => handleOpenDetails(m, e)}
                                      className={`ml-1 shrink-0 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer ${
                                        isModern ? "hover:bg-primary/10 text-muted-foreground hover:text-primary" : "bg-primary/10 text-primary/50 hover:text-primary hover:bg-primary/20"
                                      }`}
                                      title="Ver Detalles"
                                    >
                                      <Search className="w-3 h-3" />
                                    </button>
                                    {type === "mod" && (
                                      <span className={`ml-auto shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                        m.side === "client" ? "bg-blue-500/15 text-blue-400"
                                        : m.side === "server" ? "bg-red-500/15 text-red-400"
                                        : "bg-emerald-500/15 text-emerald-400"
                                      }`}>
                                        {m.side || "both"}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
