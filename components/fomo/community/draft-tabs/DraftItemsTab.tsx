import React, { useState, useMemo } from "react";
import { ListPlus, Blend, Image, Glasses, Database, Puzzle, Trash2, Search, CheckSquare, Square, ChevronDown, ChevronUp, LayoutGrid, List, Tag } from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";

const TYPE_CONFIG = {
  mod:          { label: "Mods",      icon: Puzzle,   color: "text-primary",      bg: "bg-primary/15",    border: "border-primary/20" },
  resourcepack: { label: "Texturas",  icon: Image,    color: "text-amber-400",    bg: "bg-amber-500/15",  border: "border-amber-500/20" },
  shader:       { label: "Shaders",   icon: Glasses,  color: "text-purple-400",   bg: "bg-purple-500/15", border: "border-purple-500/20" },
  datapack:     { label: "Datapacks", icon: Database,  color: "text-emerald-400",  bg: "bg-emerald-500/15",border: "border-emerald-500/20" },
} as const;

const SIDE_STYLES = {
  client: { label: "Client", cls: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  server: { label: "Server", cls: "bg-red-500/15 text-red-400 border-red-500/25" },
  both:   { label: "Both",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
} as const;

export const MOD_CATEGORIES = [
  { id: "core", label: "Librería / Core" },
  { id: "performance", label: "Rendimiento" },
  { id: "utility", label: "Utilidad / QoL" },
  { id: "world", label: "Mundo" },
  { id: "mobs", label: "Fauna y Jefes" },
  { id: "tech", label: "Tecnología / Magia" },
  { id: "building", label: "Construcción" },
  { id: "other", label: "Otros / Sin Asignar" },
] as const;

export function DraftItemsTab({
  draftItems,
  isModern,
  selectedItems,
  setSelectedItems,
  fetchDraftInfo,
}: {
  draftItems: any[];
  isModern: boolean;
  selectedItems: Set<string>;
  setSelectedItems: (items: Set<string>) => void;
  fetchDraftInfo: (silent?: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeCategoryTab, setActiveCategoryTab] = useState<"mods" | "others">("mods");
  
  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleUpdateSide = async (itemId: string, side: string) => {
    try {
      const { error } = await supabase.from("draft_items").update({ side }).eq("id", itemId);
      if (error) throw error;
      fetchDraftInfo(true);
    } catch (err) {
      console.error("Error updating side", err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al actualizar el lado del item.", type: "error" }
      }));
    }
  };

  const handleUpdateCategory = async (category: string) => {
    if (selectedItems.size === 0) return;
    const ids = Array.from(selectedItems);
    try {
      const { error } = await supabase.from("draft_items").update({ category }).in("id", ids);
      if (error) throw error;
      fetchDraftInfo(true);
      setIsCategoryModalOpen(false);
      setNewCategoryName("");
      setSelectedItems(new Set());
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Categoría asignada a los mods seleccionados.", type: "success" }
      }));
    } catch (err) {
      console.error("Error updating category", err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al actualizar la categoría.", type: "error" }
      }));
    }
  };

  const handleDeleteItems = async (ids: string[]) => {
    try {
      const { error } = await supabase.from("draft_items").delete().in("id", ids);
      if (!error) {
        setSelectedItems(new Set());
        fetchDraftInfo(true);
        window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
      }
    } catch (err) {
      console.error("[DraftItemsTab] Error deleting draft items:", err);
    }
  };

  const handleOpenDetails = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("fomo-open-details", {
        detail: {
          projectId: item.project_id,
          platform: item.source === "curseforge" ? "curseforge" : "modrinth",
          contentType: item.content_type || "mod",
          title: item.mod_name || item.project_id
        },
      })
    );
  };

  const toggleType = (type: string) => {
    setCollapsedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return draftItems;
    const q = search.toLowerCase();
    return draftItems.filter(i =>
      (i.mod_name || i.project_id || "").toLowerCase().includes(q) ||
      (i.source || "").toLowerCase().includes(q)
    );
  }, [draftItems, search]);

  // Divide between Mods and Others
  const modItems = useMemo(() => filteredItems.filter(i => (i.content_type || "mod") === "mod"), [filteredItems]);
  const otherItems = useMemo(() => filteredItems.filter(i => (i.content_type || "mod") !== "mod"), [filteredItems]);

  const dynamicCustomCategories = useMemo(() => {
    const custom = new Set<string>();
    modItems.forEach(mod => {
      if (mod.category && mod.category !== "other" && !MOD_CATEGORIES.some(c => c.id === mod.category)) {
        custom.add(mod.category);
      }
    });
    return Array.from(custom).sort();
  }, [modItems]);

  const groupedMods = useMemo(() => {
    const groups: Record<string, any[]> = {};
    MOD_CATEGORIES.forEach(c => { groups[c.id] = []; });
    dynamicCustomCategories.forEach(c => { groups[c] = []; });
    
    modItems.forEach(mod => {
      const cat = mod.category || "other";
      if (groups[cat]) {
        groups[cat].push(mod);
      } else {
        groups["other"].push(mod);
      }
    });

    // Clean up empty categories
    const result: Record<string, any[]> = {};
    MOD_CATEGORIES.forEach(c => {
      if (groups[c.id].length > 0) result[c.id] = groups[c.id];
    });
    dynamicCustomCategories.forEach(c => {
      if (groups[c].length > 0) result[c] = groups[c];
    });
    return result;
  }, [modItems, dynamicCustomCategories]);

  const groupedOtherItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    ["resourcepack", "shader", "datapack"].forEach(type => {
      const items = otherItems.filter(i => i.content_type === type);
      if (items.length > 0) groups[type] = items;
    });
    return groups;
  }, [otherItems]);

  const totalCount = draftItems.length;
  const selectedCount = selectedItems.size;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  const txt = isModern ? "text-foreground" : "text-white";
  const txtSub = isModern ? "text-muted-foreground" : "text-white/50";
  const cardBg = isModern ? "bg-card border-border/60" : "bg-white/[0.03] border-white/[0.06]";
  const cardHover = isModern ? "hover:border-primary/40 hover:shadow-sm" : "hover:border-white/15 hover:bg-white/[0.05]";
  const sectionBg = isModern ? "bg-muted/30" : "bg-white/[0.02]";

  const renderItemCard = (item: any, type: string) => {
    const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
    const Icon = cfg.icon;
    const isSelected = selectedItems.has(item.id);
    const side = item.side || "both";
    const sideStyle = SIDE_STYLES[side as keyof typeof SIDE_STYLES] || SIDE_STYLES.both;

    return (
      <div
        key={item.id}
        className={`group relative flex ${viewMode === "grid" ? "flex-col items-start gap-1.5 p-2.5" : "items-center gap-3 px-3 py-2"} rounded-xl border transition-all duration-200 ${
          isSelected
            ? `${cfg.bg} ${cfg.border} border`
            : `${cardBg} ${cardHover}`
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={() => {
            const next = new Set(selectedItems);
            if (next.has(item.id)) next.delete(item.id);
            else next.add(item.id);
            setSelectedItems(next);
          }}
          className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer ${
            viewMode === "grid" ? "absolute top-2.5 right-2.5" : ""
          } ${
            isSelected
              ? "bg-primary border-primary text-white"
              : `${isModern ? "border-border/80 hover:border-primary/50" : "border-white/15 hover:border-white/30"}`
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Icon */}
        <div className={viewMode === "grid" ? "mb-0.5" : "shrink-0"}>
          {item.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.icon_url} alt="" className={`${viewMode === "grid" ? "w-8 h-8" : "w-8 h-8"} rounded-lg object-cover shrink-0`} />
          ) : (
            <div className={`${viewMode === "grid" ? "w-8 h-8" : "w-8 h-8"} rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`${viewMode === "grid" ? "w-4 h-4" : "w-4 h-4"} ${cfg.color}`} />
            </div>
          )}
        </div>

        {/* Name + source */}
        <div className={`flex flex-col min-w-0 ${viewMode === "grid" ? "w-full" : "flex-1"}`}>
          <span className={`text-xs md:text-sm font-semibold truncate ${txt}`} title={item.mod_name || item.project_id}>
            {item.mod_name || item.project_id}
          </span>
          <span className={`text-[9px] md:text-[10px] ${txtSub} truncate`}>
            {item.source}
          </span>
        </div>

        {/* Category Badge & Delete */}
        <div className={`flex items-center gap-1.5 ${viewMode === "grid" ? "w-full justify-between mt-auto pt-1.5 border-t " + (isModern ? "border-border/50" : "border-white/10") : "shrink-0"}`}>
          
          {type === "mod" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItems(new Set([item.id]));
                setIsCategoryModalOpen(true);
              }}
              className={`text-[9px] font-bold px-1.5 py-1 rounded-lg border transition-colors truncate max-w-[90px] ${
                isModern 
                  ? "bg-muted border-border/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground" 
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              title="Cambiar Categoría"
            >
              {MOD_CATEGORIES.find(c => c.id === item.category)?.label || item.category || "Sin Asignar"}
            </button>
          )}

          {type === "mod" ? (
            <select
              value={side}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleUpdateSide(item.id, e.target.value)}
              className={`text-[10px] font-bold px-1.5 py-1 rounded-lg border outline-none cursor-pointer appearance-none text-center ${sideStyle.cls}`}
            >
              <option value="both">Both</option>
              <option value="client">Client</option>
              <option value="server">Server</option>
            </select>
          ) : (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
              type === "datapack"
                ? SIDE_STYLES.server.cls
                : SIDE_STYLES.client.cls
            }`}>
              {type === "datapack" ? "Server" : "Client"}
            </span>
          )}
          
          
          <div className={`flex items-center gap-1 shrink-0 ${viewMode === "grid" ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-all`}>
            {/* Open Details */}
            <button
              onClick={(e) => handleOpenDetails(item, e)}
              className={`p-1 rounded-lg cursor-pointer ${
                isModern ? "hover:bg-primary/10 text-muted-foreground hover:text-primary" : "bg-primary/10 text-primary/50 hover:text-primary hover:bg-primary/20"
              }`}
              title="Ver Detalles"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Delete (single) */}
            <button
              onClick={() => handleDeleteItems([item.id])}
              className={`p-1 rounded-lg cursor-pointer ${
                isModern ? "hover:bg-red-500/10 text-muted-foreground hover:text-red-500" : "bg-red-500/10 text-red-400/50 hover:text-red-400 hover:bg-red-500/20"
              }`}
              title="Eliminar del Draft"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className={`text-lg font-bold ${txt}`}>
            Items
            {totalCount > 0 && (
              <span className={`ml-2 text-sm font-normal ${txtSub}`}>{totalCount}</span>
            )}
          </h3>

          {/* Search */}
          {totalCount > 0 && (
            <div className={`relative flex items-center`}>
              <Search className={`absolute left-2.5 w-3.5 h-3.5 ${txtSub} pointer-events-none`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className={`pl-8 pr-3 py-1.5 rounded-lg text-xs w-40 border outline-none transition-all focus:w-52 focus:border-primary/50 ${
                  isModern ? "bg-background border-border text-foreground placeholder:text-muted-foreground" : "bg-black/30 border-white/10 text-white placeholder:text-white/30"
                }`}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {totalCount > 0 && (
            <div className={`flex items-center rounded-lg p-0.5 border ${isModern ? "border-border bg-muted/50" : "border-white/10 bg-black/20"}`}>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1 rounded-md transition-colors ${viewMode === "list" ? (isModern ? "bg-background shadow-sm text-foreground" : "bg-white/10 text-white") : txtSub}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded-md transition-colors ${viewMode === "grid" ? (isModern ? "bg-background shadow-sm text-foreground" : "bg-white/10 text-white") : txtSub}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Select all / delete selected */}
          {totalCount > 0 && (
            <>
              <button
                onClick={() => {
                  if (allSelected) {
                    setSelectedItems(new Set());
                  } else {
                    setSelectedItems(new Set(draftItems.map(i => i.id)));
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                  isModern ? "border-border text-muted-foreground hover:text-foreground hover:bg-muted" : "border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {allSelected ? "Deseleccionar" : "Seleccionar todo"}
              </button>

              {selectedCount > 0 && (
                <>
                  {activeCategoryTab === "mods" && (
                    <button
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Asignar Categoría
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteItems(Array.from(selectedItems))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar {selectedCount}
                  </button>
                </>
              )}
            </>
          )}

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("fomo-switch-tab", { detail: { tab: "discover" } }))}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      {totalCount > 0 && (
        <div className={`flex items-center gap-2 border-b ${isModern ? "border-border/50" : "border-white/10"}`}>
          <button
            onClick={() => setActiveCategoryTab("mods")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              activeCategoryTab === "mods"
                ? "border-primary text-primary"
                : `border-transparent ${isModern ? "text-muted-foreground hover:text-foreground" : "text-white/50 hover:text-white"}`
            }`}
          >
            Mods <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${activeCategoryTab === "mods" ? "bg-primary/20" : (isModern ? "bg-muted" : "bg-white/10")}`}>{modItems.length}</span>
          </button>
          <button
            onClick={() => setActiveCategoryTab("others")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              activeCategoryTab === "others"
                ? "border-primary text-primary"
                : `border-transparent ${isModern ? "text-muted-foreground hover:text-foreground" : "text-white/50 hover:text-white"}`
            }`}
          >
            Texturas, Shaders & Datapacks <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${activeCategoryTab === "others" ? "bg-primary/20" : (isModern ? "bg-muted" : "bg-white/10")}`}>{otherItems.length}</span>
          </button>
        </div>
      )}

      {/* Content */}
      {totalCount === 0 ? (
        <div className={`flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl ${isModern ? "border-border" : "border-white/10"}`}>
          <Blend className="w-10 h-10 text-primary/30 mb-4" />
          <p className={`text-sm font-bold ${txtSub}`}>El draft está vacío</p>
          <p className={`text-xs mt-1 max-w-xs text-center ${isModern ? "text-muted-foreground/60" : "text-white/30"}`}>
            Agrega mods, texturas, shaders o datapacks desde Discover.
          </p>
        </div>
      ) : modItems.length === 0 && otherItems.length === 0 ? (
        <div className={`py-10 text-center rounded-xl ${txtSub} text-sm`}>
          Sin resultados para &quot;{search}&quot;
        </div>
      ) : (
        <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-8">
          
          {/* ====== MODS SECTION ====== */}
          {activeCategoryTab === "mods" && (
            modItems.length === 0 ? (
              <div className={`py-10 text-center rounded-xl ${txtSub} text-sm`}>
                No tienes mods en este draft.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {Object.entries(groupedMods).map(([catId, items]) => {
                  const catDef = MOD_CATEGORIES.find(c => c.id === catId);
                  const isCustom = !catDef;
                  const label = catDef ? catDef.label : catId;
                  
                  return (
                    <div key={catId} className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 pl-2">
                        <Tag className={`w-3.5 h-3.5 ${isCustom ? "text-indigo-400" : "text-primary/60"}`} />
                        <h4 className={`text-sm font-bold ${txt}`}>{label}</h4>
                        <span className={`text-[10px] font-bold ${txtSub}`}>({items.length})</span>
                      </div>

                      <div className={`${viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "flex flex-col gap-1.5"}`}>
                        {items.map(item => renderItemCard(item, "mod"))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}


          {/* ====== OTHERS SECTION ====== */}
          {activeCategoryTab === "others" && (
            otherItems.length === 0 ? (
              <div className={`py-10 text-center rounded-xl ${txtSub} text-sm`}>
                No tienes texturas, shaders o datapacks.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.entries(groupedOtherItems).map(([type, items]) => {
                  const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
                  const Icon = cfg.icon;
                  const isCollapsed = collapsedTypes.has(type);

                  return (
                    <div key={type} className={`shrink-0 rounded-2xl border overflow-hidden ${isModern ? "border-border/50" : "border-white/[0.06]"} ${sectionBg}`}>
                      {/* Section header — clickable to collapse */}
                      <button
                        onClick={() => toggleType(type)}
                        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer transition-opacity hover:opacity-80"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          </div>
                          <span className={`text-sm font-bold ${txt}`}>{cfg.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {items.length}
                          </span>
                        </div>
                        {isCollapsed ? (
                          <ChevronDown className={`w-4 h-4 ${txtSub}`} />
                        ) : (
                          <ChevronUp className={`w-4 h-4 ${txtSub}`} />
                        )}
                      </button>

                      {/* Items list */}
                      {!isCollapsed && (
                        <div className={`px-3 pb-3 ${viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "flex flex-col gap-1.5"}`}>
                          {items.map(item => renderItemCard(item, type))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

        </div>
      )}

      {/* Category Assignment Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md p-5 md:p-6 rounded-3xl shadow-2xl border flex flex-col gap-5 ${isModern ? "bg-card border-border shadow-[0_20px_60px_rgba(13,39,80,0.16)]" : "bg-[#121214] border-white/10"}`}>
            <div>
              <h3 className={`text-lg font-black flex items-center gap-2 ${txt}`}>
                <Tag className="w-5 h-5 text-indigo-400" />
                Asignar Categoría
              </h3>
              <p className={`text-xs mt-1 ${txtSub}`}>
                Clasificando {selectedCount} mod{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}.
              </p>
            </div>

            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {/* Default Categories */}
              <div className="grid grid-cols-2 gap-2">
                {MOD_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleUpdateCategory(c.id)}
                    className={`px-3 py-2 text-xs font-bold text-left rounded-xl border transition-colors ${
                      isModern 
                        ? "bg-muted/30 border-border/50 text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary" 
                        : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Custom Categories */}
              {dynamicCustomCategories.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider ${txtSub}`}>Categorías Personalizadas</h4>
                  <div className="flex flex-wrap gap-2">
                    {dynamicCustomCategories.map(c => (
                      <button
                        key={c}
                        onClick={() => handleUpdateCategory(c)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
                          isModern 
                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/20" 
                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Create New Custom Category */}
            <div className={`pt-4 border-t flex flex-col gap-2 ${isModern ? "border-border/50" : "border-white/10"}`}>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${txtSub}`}>Crear Nueva Categoría</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: Vehículos..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategoryName.trim()) {
                      handleUpdateCategory(newCategoryName.trim());
                    }
                  }}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border outline-none focus:border-indigo-500/50 transition-colors ${
                    isModern ? "bg-background border-border text-foreground placeholder:text-muted-foreground" : "bg-black/30 border-white/10 text-white placeholder:text-white/30"
                  }`}
                />
                <button
                  onClick={() => {
                    if (newCategoryName.trim()) handleUpdateCategory(newCategoryName.trim());
                  }}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                >
                  Añadir
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${isModern ? "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
