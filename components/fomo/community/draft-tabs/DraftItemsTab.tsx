import React from "react";
import { ListPlus, Blend, Image, Sun, Database, Puzzle, FlaskConicalOff } from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${isModern ? "text-foreground" : "text-white"}`}>Items del Draft</h3>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent("fomo-switch-tab", { detail: { tab: "discover" } }))}
          className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-primary/20 transition-colors"
        >
          <ListPlus className="w-4 h-4" /> Agregar Item
        </button>
      </div>
      
      {draftItems.length === 0 ? (
        <div className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl ${isModern ? "border-border" : "border-white/10"}`}>
          <Blend className="w-8 h-8 text-primary/40 mb-3" />
          <p className={`text-sm font-bold ${isModern ? "text-muted-foreground" : "text-white/60"}`}>La lista está vacía</p>
          <p className={`text-xs mt-1 ${isModern ? "text-muted-foreground/70" : "text-white/40"}`}>Agrega contenido desde Discover para empezar a construir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 p-2 h-[380px] min-h-0">
          {["mod", "resourcepack", "shader", "datapack"].map((type) => {
            const items = draftItems.filter(i => (i.content_type || 'mod') === type);
            if (items.length === 0) return null;
            
            return (
              <div key={type} className={`flex flex-col gap-3 p-4 rounded-2xl border ${isModern ? "bg-muted/30 border-border/50" : "bg-black/10 border-white/5"} shadow-inner h-full min-h-0`}>
                <h4 className={`shrink-0 text-sm font-black uppercase tracking-widest ${isModern ? "text-foreground" : "text-white"} flex items-center justify-between`}>
                  {type === "mod" ? "Mods" : type === "resourcepack" ? "Texturas" : type === "shader" ? "Shaders" : "Datapacks"} 
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isModern ? "bg-primary/10 text-primary" : "bg-white/10 text-white/70"}`}>{items.length}</span>
                </h4>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0">
                  {items.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        const newSel = new Set(selectedItems);
                        if (newSel.has(item.id)) newSel.delete(item.id);
                        else newSel.add(item.id);
                        setSelectedItems(newSel);
                      }}
                      className={`group flex flex-col gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
                        selectedItems.has(item.id) 
                          ? (isModern ? "bg-primary/10 border-primary shadow-md" : "bg-primary/20 border-primary shadow-md") 
                          : (isModern ? "bg-card border-border hover:border-primary/40 shadow-sm" : "bg-black/30 border-white/5 hover:border-primary/50 hover:bg-black/50")
                      }`}
                    >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                        {type === "resourcepack" ? <Image className="w-5 h-5 text-amber-500" /> : type === "shader" ? <Sun className="w-5 h-5 text-purple-500" /> : type === "datapack" ? <Database className="w-5 h-5 text-emerald-500" /> : <Puzzle className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm truncate ${isModern ? "text-foreground" : "text-white"}`}>{item.mod_name || item.project_id}</span>
                          {type === "mod" && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${item.side === 'client' ? 'bg-blue-500/20 text-blue-400' : item.side === 'server' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                              {item.side || 'both'}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs ${isModern ? "text-muted-foreground" : "text-white/50"}`}>{item.source}</span>
                      </div>
                    </div>
                    
                    <div className={`flex items-center justify-between gap-3 pt-3 border-t transition-opacity duration-300 ${isModern ? "border-border opacity-100 md:opacity-0 md:group-hover:opacity-100" : "border-white/10 opacity-100 md:opacity-0 md:group-hover:opacity-100"}`}>
                      {type === "resourcepack" || type === "shader" ? (
                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-500/10 text-blue-500 rounded uppercase">Client Only</span>
                      ) : type === "datapack" ? (
                        <span className="text-[10px] font-bold px-2 py-1 bg-red-500/10 text-red-500 rounded uppercase">Server Only</span>
                      ) : (
                        <select 
                          value={item.side || "both"}
                          onChange={(e) => handleUpdateSide(item.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border outline-none ${isModern ? "bg-muted border-border text-foreground" : "bg-black/40 border-white/10 text-white"}`}
                        >
                          <option value="both">Both</option>
                          <option value="client">Client</option>
                          <option value="server">Server</option>
                        </select>
                      )}

                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const itemsToDelete = selectedItems.has(item.id) 
                              ? Array.from(selectedItems) 
                              : [item.id];
                            
                            const { error } = await supabase.from('draft_items').delete().in('id', itemsToDelete);
                            if (!error) {
                              if (selectedItems.has(item.id)) setSelectedItems(new Set());
                              fetchDraftInfo(true);
                              window.dispatchEvent(new CustomEvent("fomo-draft-items-changed"));
                            }
                          } catch (err) {}
                        }}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                        title={selectedItems.has(item.id) && selectedItems.size > 1 ? `Eliminar ${selectedItems.size} items` : "Eliminar del Draft"}
                      >
                        <FlaskConicalOff className="w-4 h-4" />
                      </button>
                    </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
