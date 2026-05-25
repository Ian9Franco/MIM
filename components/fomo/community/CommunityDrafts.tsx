"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/security/AuthContext";
import { supabase } from "@/lib/core/supabaseClient";
import { Plus, Users, Loader, RefreshCw, FileEdit, Box, Library, Trash2 } from "lucide-react";
import { CommunityCreateDraftModal } from "./CommunityCreateDraftModal";
import { CommunityDraftDetails } from "./CommunityDraftDetails";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function CommunityDrafts() {
  const { user, profile } = useAuth();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fomo_community_draft_id") || null;
    }
    return null;
  });

  useEffect(() => {
    if (selectedDraftId) {
      localStorage.setItem("fomo_community_draft_id", selectedDraftId);
    } else {
      localStorage.removeItem("fomo_community_draft_id");
    }
  }, [selectedDraftId]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<{id: string, name: string} | null>(null);
  const [currentTheme, setCurrentTheme] = useState("official");

  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("fomo-draft-selected", { detail: !!selectedDraftId }));
  }, [selectedDraftId]);

  useEffect(() => {
    fetchDrafts();
  }, [user]);

  const fetchDrafts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get drafts where user is owner
      const { data: ownedData, error: ownedErr } = await supabase
        .from("drafts")
        .select(`
          id, name, description, minecraft_version, loader, cover_image, updated_at, owner_id,
          draft_snapshots(version_number),
          profiles!drafts_owner_id_fkey(username, avatar_url, color)
        `)
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (ownedErr) console.error("Error fetching owned drafts:", ownedErr);

      // Get drafts where user is member
      const { data: memberData, error: memberErr } = await supabase
        .from("draft_members")
        .select(`
          drafts (
            id, name, description, minecraft_version, loader, cover_image, updated_at, owner_id,
            draft_snapshots(version_number),
            profiles!drafts_owner_id_fkey(username, avatar_url, color)
          )
        `)
        .eq('user_id', user.id);

      if (memberErr) console.error("Error fetching member drafts:", memberErr);

      const allDraftsMap = new Map();
      (ownedData || []).forEach(d => allDraftsMap.set(d.id, d));
      (memberData || []).forEach(d => {
        const draftObj: any = Array.isArray(d.drafts) ? d.drafts[0] : d.drafts;
        if (draftObj && !allDraftsMap.has(draftObj.id)) {
          allDraftsMap.set(draftObj.id, draftObj);
        }
      });

      const mergedDrafts = Array.from(allDraftsMap.values()).sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setDrafts(mergedDrafts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from("drafts")
        .delete()
        .eq("id", draftId)
        .eq("owner_id", user?.id); // Ensure only owner can delete

      if (error) throw error;

      setDrafts(prev => prev.filter(d => d.id !== draftId));
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Draft eliminado exitosamente.", type: "success" }
      }));
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al eliminar el draft.", type: "error" }
      }));
    }
  };

  const isModern = currentTheme === "modern";

  if (selectedDraftId) {
    return (
      <CommunityDraftDetails 
        draftId={selectedDraftId} 
        currentTheme={currentTheme} 
        onBack={() => {
          setSelectedDraftId(null);
          fetchDrafts(); // refresh if they edited something
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-black tracking-tight ${isModern ? "text-foreground" : "text-white"}`}>
            FOMO Drafts
          </h2>
          <p className={`mt-1 text-sm font-medium ${isModern ? "text-muted-foreground" : "text-white/60"}`}>
            Create Together. Play Together.
          </p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-white transition-all duration-300 bg-primary rounded-xl overflow-hidden shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-black/20 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Crear nuevo Draft</span>
        </button>
      </div>

      <CommunityCreateDraftModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentTheme={currentTheme}
        onSuccess={(newDraft) => {
          setDrafts((prev) => [newDraft, ...prev]);
        }}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : drafts.length === 0 ? (
        <div className={`flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-3xl ${isModern ? "border-border bg-card/50" : "border-white/10 bg-white/5"}`}>
          <div className="w-20 h-20 mb-6 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <FileEdit className="w-10 h-10" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${isModern ? "text-foreground" : "text-white"}`}>
            No hay drafts activos
          </h3>
          <p className={`max-w-md text-sm ${isModern ? "text-muted-foreground" : "text-white/60"}`}>
            Inicia un nuevo proyecto colaborativo para construir modpacks junto a la comunidad. Los cambios se sincronizan en la nube.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {drafts.map((draft) => {
            const version = draft.draft_snapshots?.[0]?.version_number || 0;
            return (
              <div 
                key={draft.id} 
                onClick={() => setSelectedDraftId(draft.id)}
                className={`flex flex-col rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isModern ? "bg-card border-border shadow-sm hover:border-primary/50" : "bg-white/5 border-white/10 hover:border-primary/50"}`}
              >
                <div className="h-32 relative bg-primary/10 overflow-hidden flex items-center justify-center group">
                  {draft.cover_image ? (
                    <img src={draft.cover_image} alt={draft.name} className="w-full h-full object-cover" />
                  ) : (
                    <Library className="w-12 h-12 text-primary/30" />
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {draft.owner_id === user?.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDraftToDelete({ id: draft.id, name: draft.name }); }}
                        className="bg-red-500 text-white p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 hover:bg-red-600 border border-red-400/50 shadow-sm"
                        title="Eliminar Draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md border border-white/10">
                      v{version}
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md border border-white/10 capitalize flex items-center gap-1">
                    <Box className="w-3 h-3" />
                    {draft.loader} {draft.minecraft_version}
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <h3 className={`font-bold text-lg leading-tight line-clamp-1 ${isModern ? "text-foreground" : "text-white"}`}>{draft.name}</h3>
                  <p className={`text-xs line-clamp-2 min-h-[2rem] ${isModern ? "text-muted-foreground" : "text-white/60"}`}>
                    {draft.description || "Sin descripción"}
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-primary/20">
                    <div className="flex -space-x-2">
                       <div 
                         className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden border-2 border-background"
                         style={{ 
                           backgroundColor: draft.profiles?.color || "var(--primary)",
                           color: draft.profiles?.color ? "#000" : "#fff" 
                         }}
                         title={`Propietario: @${draft.profiles?.username || 'Desconocido'}`}
                       >
                         {draft.profiles?.avatar_url ? (
                           <img src={draft.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                           (draft.profiles?.username || "U").charAt(0).toUpperCase()
                         )}
                       </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isModern ? "text-muted-foreground" : "text-white/40"}`}>
                      {draft.owner_id === user?.id ? "Propietario (Tú)" : "Miembro"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!draftToDelete}
        onClose={() => setDraftToDelete(null)}
        onConfirm={() => {
          if (draftToDelete) {
            handleDeleteDraft(draftToDelete.id);
            setDraftToDelete(null);
          }
        }}
        title="Eliminar Draft"
        message={`¿Estás seguro de que deseas eliminar permanentemente el draft "${draftToDelete?.name}"? Esto eliminará todos los snapshots y archivos asociados de la nube.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        type="danger"
      />
    </div>
  );
}
