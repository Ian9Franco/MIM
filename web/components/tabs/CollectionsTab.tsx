"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Archive, ArrowLeft, Bookmark, ChevronDown, ChevronRight, Compass, FolderKanban, Layers, Plus, Search, UserCheck } from "lucide-react";
import type { ModHit } from "../SpotlightMarquees";
import type { CollectionItem } from "../../app/types";
import { DefaultModIcon } from "../DefaultModIcon";
import { DraftDetailView } from "../DraftDetailView";
import { CollectionsSkeleton } from "../FomoSkeletons";

interface Props {
  activeCollection: CollectionItem | null; modrinthFeatured: CollectionItem[]; curseForgeFeatured: CollectionItem[];
  activeCollectionMods: ModHit[]; loadingActiveMods: boolean; session: any; userDrafts: any[]; activeDraft?: any;
  handleEnterCollection: (coll: CollectionItem) => void; handleExitCollection: () => void;
  handleOpenModDetails: (mod: ModHit) => void; handleEnterDraftCollection: (draft: any) => void;
  onRemoveModFromDraft?: (draftId: string, projectId: string, itemId?: string) => Promise<void>;
  onRefreshDrafts?: () => void; onEditDraft?: (draft: any) => void; onCreateDraft?: () => void;
  onUpdateDraftMetadata?: (draftId: string, updates: any) => Promise<boolean>;
  onRecategorizeDraftItem?: (draftId: string, projectId: string, category: string) => Promise<void>;
  onUpdateDraftItemSide?: (draftId: string, projectId: string, side: string, itemId?: string) => Promise<void>;
  userFavorites?: any[]; userFollowedAuthors?: any[];
  onSearchAuthor?: (name: string, platform: string) => void; onAddToDraft?: (mod: ModHit) => void;
}

type View = "editorial" | "mine" | "saved";
const VIEWS: Array<[View, string]> = [["editorial", "Editoriales"], ["mine", "Mis colecciones"], ["saved", "Guardados"]];
const yearOf = (c: CollectionItem) => `${c.name} ${c.description || ""}`.match(/\b(20\d{2})\b/)?.[1] || "Otros";

function toMod(f: any): ModHit {
  const projectId = String(f.mod_id || f.project_id || f.projectId || f.id);
  const projectType = f.project_type || f.content_type || "mod";
  let title = f.name || "Proyecto", author = "Comunidad";
  if (title.includes(" ::: ")) [title, author] = title.split(" ::: ");
  const source = f.platform || f.source || "modrinth";
  return { projectId, title, author, projectType, description: f.description || "", iconUrl: f.icon_url || f.iconUrl || null, categories: f.categories || [], _source: source, url: f.url || (source === "curseforge" ? `https://www.curseforge.com/projects/${projectId}` : `https://modrinth.com/${projectType}/${projectId}`) };
}

export function CollectionsTab(p: Props) {
  const [view, setView] = useState<View>("editorial");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [archiveYear, setArchiveYear] = useState("Todos");
  const [savedView, setSavedView] = useState<"favorites" | "authors">("favorites");
  const [savedQuery, setSavedQuery] = useState("");
  const [detailQuery, setDetailQuery] = useState("");
  const [detailType, setDetailType] = useState("all");
  const [detailVersion, setDetailVersion] = useState("all");
  const [detailLoader, setDetailLoader] = useState("all");
  const favorites = p.userFavorites || [], authors = p.userFollowedAuthors || [];
  const current = p.modrinthFeatured[0], recent = p.modrinthFeatured.slice(1, 5), archive = p.modrinthFeatured.slice(5);
  const years = useMemo(() => Array.from(new Set(archive.map(yearOf))), [archive]);
  const visibleArchive = useMemo(() => archive.filter(c => `${c.name} ${c.description || ""}`.toLowerCase().includes(archiveQuery.toLowerCase()) && (archiveYear === "Todos" || yearOf(c) === archiveYear)), [archive, archiveQuery, archiveYear]);
  const drafts = useMemo(() => [...p.userDrafts].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()), [p.userDrafts]);
  const savedMods = useMemo(() => favorites.map(toMod).filter(m => `${m.title} ${m.author}`.toLowerCase().includes(savedQuery.toLowerCase())), [favorites, savedQuery]);
  const detailMeta = useMemo(() => {
    const rows = p.activeCollectionMods as any[];
    return {
      versions: Array.from(new Set<string>(rows.flatMap(m => m.versions || m.game_versions || []).filter(Boolean))).sort().reverse(),
      loaders: Array.from(new Set<string>(rows.flatMap(m => m.loaders || (m.loader ? [m.loader] : [])).filter(Boolean))).sort(),
    };
  }, [p.activeCollectionMods]);
  const visibleMods = useMemo(() => (p.activeCollectionMods as any[]).filter(m => {
    const type = String(m.projectType || m.project_type || "mod").toLowerCase();
    const versions = m.versions || m.game_versions || [], loaders = m.loaders || (m.loader ? [m.loader] : []);
    return String(m.title || "").toLowerCase().includes(detailQuery.toLowerCase()) && (detailType === "all" || type === detailType) && (detailVersion === "all" || versions.includes(detailVersion)) && (detailLoader === "all" || loaders.includes(detailLoader));
  }), [p.activeCollectionMods, detailLoader, detailQuery, detailType, detailVersion]);

  useEffect(() => { setDetailQuery(""); setDetailType("all"); setDetailVersion("all"); setDetailLoader("all"); }, [p.activeCollection?.id]);
  const isDraft = p.activeCollection?.source === "draft";

  return <motion.div key="collections" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="relative flex min-h-0 flex-1 flex-col">
    <AnimatePresence mode="wait">
      {!p.activeCollection ? <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-28 scrollbar-none">
        <div className="mb-4 border-l-2 p-3" style={{ background: "linear-gradient(to right,color-mix(in srgb,var(--color-primary) 10%,transparent),transparent)", borderColor: "var(--color-primary)" }}>
          <p className="text-[9px] font-mono font-bold uppercase" style={{ color: "var(--color-primary)" }}>Colecciones</p>
          <h2 className="mt-1 text-sm font-black text-white">Descubrí, organizá y construí.</h2>
          <p className="mt-0.5 text-[9px] text-white/40">Editoriales, drafts y guardados en un solo espacio.</p>
        </div>
        <div className="sticky top-0 z-20 mb-5 grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface/90 p-1 shadow-sm backdrop-blur-xl">
          {VIEWS.map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={`h-9 rounded-lg px-1 text-[8px] font-bold ${view === id ? "mim-control-3d-active text-[var(--color-primary)]" : "text-white/40"}`}>{label}</button>)}
        </div>
        <AnimatePresence mode="wait">
          {view === "editorial" && <motion.section key="editorial" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
            {current && <div><Title eyebrow="Selección actual" title="Lo nuevo de Modrinth" /><button type="button" onClick={() => p.handleEnterCollection(current)} className="mim-collection-hero mim-themed-card mt-2 w-full overflow-hidden rounded-2xl border border-border text-left">
              <div className="relative aspect-[2.25/1] overflow-hidden bg-white/[.04]">{current.iconUrl ? <img src={current.iconUrl} alt="" className="h-full w-full object-cover" /> : <DefaultModIcon platform={current.source} />}<span className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[8px] font-mono text-white/80">{current.projectCount} proyectos</span></div>
              <div className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-white">{current.name}</h3><p className="mt-1 line-clamp-2 text-[9px] text-white/45">{current.description}</p></div><ChevronRight className="h-5 w-5 text-white/30" /></div>
            </button></div>}
            {!!recent.length && <div><Title eyebrow="Últimas semanas" title="Selecciones recientes" /><div className="mt-2 grid grid-cols-2 gap-2">{recent.map(c => <Tile key={c.id} c={c} open={p.handleEnterCollection} />)}</div></div>}
            {!!p.curseForgeFeatured.length && <div><Title eyebrow="Otra fuente" title="CurseForge Picks" /><div className="mt-2 space-y-2">{p.curseForgeFeatured.map(c => <Row key={c.id} c={c} open={p.handleEnterCollection} />)}</div></div>}
            {!!archive.length && <div className="rounded-2xl border border-border bg-surface/55 p-2">
              <button type="button" aria-expanded={archiveOpen} onClick={() => setArchiveOpen(v => !v)} className="flex h-11 w-full items-center gap-3 px-2 text-left"><Archive className="h-4 w-4 text-white/40" /><span className="min-w-0 flex-1"><b className="block text-[10px] text-white/80">Archivo editorial</b><small className="text-[8px] text-white/35">{archive.length} selecciones anteriores</small></span><ChevronDown className={`h-4 w-4 text-white/35 transition-transform ${archiveOpen ? "rotate-180" : ""}`} /></button>
              <AnimatePresence>{archiveOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="space-y-2 border-t border-border px-1 pt-3"><SearchBox value={archiveQuery} setValue={setArchiveQuery} placeholder="Buscar en el archivo..." /><div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"><Chip active={archiveYear === "Todos"} click={() => setArchiveYear("Todos")}>Todos</Chip>{years.map(y => <Chip key={y} active={archiveYear === y} click={() => setArchiveYear(y)}>{y}</Chip>)}</div>{visibleArchive.map(c => <Row key={c.id} c={c} open={p.handleEnterCollection} compact />)}{!visibleArchive.length && <p className="py-6 text-center text-[9px] text-white/35">No encontramos selecciones.</p>}</div></motion.div>}</AnimatePresence>
            </div>}
          </motion.section>}

          {view === "mine" && <motion.section key="mine" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
            <div className="flex items-end justify-between"><Title eyebrow="Tu espacio" title="Mis colecciones" /><button type="button" onClick={p.onCreateDraft} className="mim-control-3d flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[8px] font-bold text-white/65"><Plus className="h-3.5 w-3.5" />Nueva</button></div>
            {!p.session ? <Empty icon={<FolderKanban className="h-9 w-9" />} title="Iniciá sesión para crear" text="Tus drafts aparecerán acá." /> : !drafts.length ? <Empty icon={<FolderKanban className="h-9 w-9" />} title="Creá tu primera colección" text="Combiná mods, texturas y shaders en un draft compatible." action="Nueva colección" onAction={p.onCreateDraft} /> : <>
              <button type="button" onClick={() => p.handleEnterDraftCollection(drafts[0])} className="mim-collection-hero mim-themed-card w-full overflow-hidden rounded-2xl border border-border text-left"><div className="relative h-28 overflow-hidden bg-white/[.035]">{drafts[0].cover_image ? <img src={drafts[0].cover_image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Layers className="h-9 w-9 text-white/15" /></div>}<span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[7px] font-black uppercase text-white/75">Continuar trabajando</span></div><div className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-white">{drafts[0].name}</h3><p className="mt-1 text-[9px] text-white/45">{drafts[0].minecraft_version || "Versión libre"} · {drafts[0].loader || "Cualquier loader"} · {drafts[0].items?.length || 0} ítems</p></div><ChevronRight className="h-5 w-5 text-white/30" /></div></button>
              <div><Title eyebrow={`${drafts.length} en total`} title="Todos los drafts" /><div className="mt-2 space-y-2">{drafts.map(d => <button key={d.id} type="button" onClick={() => p.handleEnterDraftCollection(d)} className="mim-collection-card flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/75 p-3 text-left"><Thumb src={d.cover_image} fallback={<Layers className="h-4 w-4 text-white/25" />} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{d.name}</p><p className="mt-1 text-[8px] text-white/40">{d.minecraft_version || "Sin versión"} · {d.loader || "Sin loader"} · {d.items?.length || 0} ítems</p></div><span className="rounded-md border border-border px-1.5 py-0.5 text-[7px] uppercase text-white/40">{d.visibility || "private"}</span><ChevronRight className="h-4 w-4 text-white/25" /></button>)}</div></div>
            </>}
          </motion.section>}

          {view === "saved" && <motion.section key="saved" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <div><Title eyebrow="Tu biblioteca" title="Guardados para construir" /><div className="mt-2 grid grid-cols-2 gap-2"><Summary active={savedView === "favorites"} icon={<Bookmark className="h-4 w-4" />} count={favorites.length} label="Proyectos" click={() => setSavedView("favorites")} /><Summary active={savedView === "authors"} icon={<UserCheck className="h-4 w-4" />} count={authors.length} label="Autores" click={() => setSavedView("authors")} /></div></div>
            {savedView === "favorites" ? <><SearchBox value={savedQuery} setValue={setSavedQuery} placeholder="Buscar proyecto o autor..." /><div className="space-y-2">{savedMods.map(m => <div key={`${m._source}:${m.projectId}`} className="mim-collection-card flex items-center gap-3 rounded-2xl border border-border bg-surface/75 p-3"><Thumb src={m.iconUrl} fallback={<DefaultModIcon platform={m._source} />} /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-white">{m.title}</p><p className="mt-1 truncate text-[8px] capitalize text-white/40">{m.author} · {m._source}</p></div><button type="button" onClick={() => p.handleOpenModDetails(m)} className="mim-control-3d h-8 rounded-lg border border-border px-2 text-[8px] font-bold text-white/60">Ver</button>{p.onAddToDraft && <button type="button" onClick={() => p.onAddToDraft?.(m)} aria-label={`Añadir ${m.title} a un draft`} className="mim-control-3d flex h-8 w-8 items-center justify-center rounded-lg border border-border text-white/60"><Plus className="h-3.5 w-3.5" /></button>}</div>)}{!savedMods.length && <Empty icon={<Bookmark className="h-9 w-9" />} title="Sin resultados" text="Guardá proyectos desde Explorar o Detalles." />}</div></> : <div className="grid grid-cols-2 gap-2">{authors.map((a: any) => <button key={a.id || `${a.platform}:${a.author_name}`} type="button" onClick={() => p.onSearchAuthor?.(a.author_name, a.platform || "modrinth")} className="mim-collection-card flex min-w-0 items-center gap-2.5 rounded-2xl border border-border bg-surface/75 p-3 text-left"><Thumb src={a.icon_url} fallback={<span className="text-[9px] font-black uppercase text-white/40">{a.author_name?.slice(0, 2)}</span>} small /><div className="min-w-0"><p className="truncate text-[10px] font-bold text-white">{a.author_name}</p><p className="mt-1 text-[7px] uppercase text-white/35">{a.platform || "modrinth"}</p></div></button>)}{!authors.length && <div className="col-span-2"><Empty icon={<UserCheck className="h-9 w-9" />} title="Todavía no seguís autores" text="Podés seguirlos desde los detalles." /></div>}</div>}
          </motion.section>}
        </AnimatePresence>
      </motion.div> : isDraft && p.activeDraft ? <DraftDetailView key={`draft-${p.activeCollection.id}`} draft={p.activeDraft} activeCollectionMods={p.activeCollectionMods} loadingActiveMods={p.loadingActiveMods} session={p.session} onBack={p.handleExitCollection} onEditDraft={p.onEditDraft} handleOpenModDetails={p.handleOpenModDetails} onRemoveModFromDraft={p.onRemoveModFromDraft} onRefreshDrafts={p.onRefreshDrafts} onUpdateDraftMetadata={p.onUpdateDraftMetadata} onRecategorizeDraftItem={p.onRecategorizeDraftItem} onUpdateDraftItemSide={p.onUpdateDraftItemSide} /> : <motion.div key="detail" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-3"><button type="button" onClick={p.handleExitCollection} aria-label="Volver a colecciones" className="mim-control-3d flex h-9 w-9 items-center justify-center rounded-xl border border-border text-white/65"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><span className="text-[8px] font-mono font-bold uppercase text-emerald-400">Colección abierta</span><h2 className="truncate text-sm font-black text-white">{p.activeCollection.name}</h2></div><span className="rounded-lg border border-border px-2 py-1 font-mono text-[8px] text-white/45">{visibleMods.length}/{p.activeCollectionMods.length}</span></div>
        {p.loadingActiveMods ? <CollectionsSkeleton /> : <div className="flex min-h-0 flex-1 flex-col"><div className="mb-3 space-y-2"><SearchBox value={detailQuery} setValue={setDetailQuery} placeholder="Buscar dentro de la colección..." /><div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">{[["all","Todo"],["mod","Mods"],["resourcepack","Texturas"],["shader","Shaders"],["datapack","Datapacks"]].map(([id,label]) => <Chip key={id} active={detailType === id} click={() => setDetailType(id)}>{label}</Chip>)}</div><div className="grid grid-cols-2 gap-2"><Select label="Versión" value={detailVersion} options={detailMeta.versions} set={setDetailVersion} /><Select label="Loader" value={detailLoader} options={detailMeta.loaders} set={setDetailLoader} /></div></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-28 pr-1 scrollbar-none">{p.activeCollection.description && <p className="px-1 pb-1 text-[9px] text-white/40">{p.activeCollection.description}</p>}{visibleMods.map((m: any) => <div key={m.itemId || m.id || m.projectId} className="mim-collection-card flex items-center gap-3 rounded-2xl border border-border bg-surface/78 p-3"><button type="button" onClick={() => p.handleOpenModDetails(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Thumb src={m.iconUrl} fallback={<DefaultModIcon platform={m._source} />} /><div className="min-w-0"><p className="truncate text-[11px] font-bold text-white">{m.title}</p><p className="mt-1 truncate text-[8px] text-white/40">{(m.loaders || []).slice(0,2).join(" · ")} {(m.versions || m.game_versions || []).slice(0,1).join("")}</p></div></button>{p.onAddToDraft && <button type="button" onClick={() => p.onAddToDraft?.(m)} aria-label={`Añadir ${m.title} a un draft`} className="mim-control-3d flex h-8 w-8 items-center justify-center rounded-lg border border-border text-white/60"><Plus className="h-3.5 w-3.5" /></button>}<ChevronRight className="h-4 w-4 text-white/25" /></div>)}{!visibleMods.length && <Empty icon={<Compass className="h-9 w-9" />} title="Sin coincidencias" text="Probá otra búsqueda, versión o loader." />}</div></div>}
      </motion.div>}
    </AnimatePresence>
  </motion.div>;
}

const Title = ({ eyebrow, title }: { eyebrow: string; title: string }) => <div><p className="text-[8px] font-mono font-bold uppercase text-white/30">{eyebrow}</p><h3 className="mt-0.5 text-xs font-black text-white/80">{title}</h3></div>;
const Thumb = ({ src, fallback, small }: { src?: string | null; fallback: React.ReactNode; small?: boolean }) => <div className={`${small ? "h-9 w-9" : "h-11 w-11"} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white/[.035]`}>{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : fallback}</div>;
const Tile = ({ c, open }: { c: CollectionItem; open: (c: CollectionItem) => void }) => <button type="button" onClick={() => open(c)} className="mim-collection-card min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/75 text-left"><div className="aspect-[1.6/1] overflow-hidden bg-white/[.035]">{c.iconUrl ? <img src={c.iconUrl} alt="" className="h-full w-full object-cover" /> : <DefaultModIcon platform={c.source} />}</div><div className="p-2.5"><p className="truncate text-[10px] font-bold text-white">{c.name}</p><p className="mt-1 font-mono text-[7px] text-white/35">{c.projectCount} proyectos</p></div></button>;
const Row = ({ c, open, compact }: { c: CollectionItem; open: (c: CollectionItem) => void; compact?: boolean }) => <button type="button" onClick={() => open(c)} className={`mim-collection-card flex w-full items-center gap-3 rounded-xl border border-border bg-surface/70 text-left ${compact ? "p-2" : "p-3"}`}><Thumb src={c.iconUrl} fallback={<DefaultModIcon platform={c.source} />} small={compact} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-white">{c.name}</p><p className="mt-1 truncate text-[8px] text-white/35">{c.projectCount ? `${c.projectCount} proyectos · ` : ""}{c.description}</p></div><ChevronRight className="h-4 w-4 text-white/25" /></button>;
const SearchBox = ({ value, setValue, placeholder }: { value: string; setValue: (v: string) => void; placeholder: string }) => <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface/75 px-3"><Search className="h-4 w-4 text-white/30" /><input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-white/25" /></label>;
const Chip = ({ active, click, children }: { active: boolean; click: () => void; children: React.ReactNode }) => <button type="button" aria-pressed={active} onClick={click} className={`h-7 shrink-0 rounded-lg border px-2.5 text-[8px] font-bold ${active ? "mim-control-3d-active border-[var(--color-primary)]/30 text-[var(--color-primary)]" : "border-border text-white/40"}`}>{children}</button>;
const Select = ({ label, value, options, set }: { label: string; value: string; options: string[]; set: (v: string) => void }) => <label className="flex h-9 items-center gap-2 rounded-xl border border-border bg-surface/75 px-2.5"><span className="text-[7px] font-bold uppercase text-white/30">{label}</span><select value={value} disabled={!options.length} onChange={e => set(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[9px] font-bold text-white outline-none disabled:opacity-45" style={{ color: "var(--color-foreground)" }}><option value="all">{options.length ? "Todas" : "Sin datos"}</option>{options.map(o => <option key={o} style={{ background: "var(--color-surface)" }}>{o}</option>)}</select></label>;
const Summary = ({ active, icon, count, label, click }: { active: boolean; icon: React.ReactNode; count: number; label: string; click: () => void }) => <button type="button" aria-pressed={active} onClick={click} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${active ? "mim-control-3d-active border-[var(--color-primary)]/30" : "mim-control-3d border-border bg-surface/70"}`}><span className="text-[var(--color-primary)]">{icon}</span><span><b className="block text-sm text-white">{count}</b><small className="text-[8px] text-white/40">{label}</small></span></button>;
const Empty = ({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action?: string; onAction?: () => void }) => <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center text-white/15">{icon}<h3 className="mt-3 text-xs font-bold text-white">{title}</h3><p className="mt-1 text-[9px] text-white/35">{text}</p>{action && onAction && <button type="button" onClick={onAction} className="mim-control-3d mt-4 rounded-lg border border-border px-3 py-2 text-[9px] font-bold text-white/65">{action}</button>}</div>;
