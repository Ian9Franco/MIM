"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Box, CheckCircle, Clock, Eye, EyeOff, FileEdit, HardDrive, Info, Blend, ListPlus, Users, RefreshCw, FlaskConical, FlaskConicalOff, UserPlus, Puzzle, Image, Sun, Database, ImagePlus, SwitchCamera, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/core/supabaseClient";
import { downloadBroker } from "@/lib/downloads/DraftDownloadBroker";
import { DownloadIntent } from "@/lib/downloads/downloadTypes";
import { useActiveDraft } from "@/hooks/fomo/useActiveDraft";
import { DraftActivityFeed } from "@/components/fomo/community/DraftActivityFeed";
import { CommunityDraftInviteModal } from "@/components/fomo/community/CommunityDraftInviteModal";
import { useAuth } from "@/components/security/AuthContext";
import { ImageCropper } from "@/components/fomo/core/ImageCropper";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DraftOverviewTab } from "./draft-tabs/DraftOverviewTab";
import { DraftActivityTab } from "./draft-tabs/DraftActivityTab";
import { DraftMembersTab } from "./draft-tabs/DraftMembersTab";
import { DraftSnapshotsTab } from "./draft-tabs/DraftSnapshotsTab";
import { DraftItemsTab } from "./draft-tabs/DraftItemsTab";
import { DraftValidationTab } from "./draft-tabs/DraftValidationTab";

export function CommunityDraftDetails({
  draftId,
  currentTheme,
  onBack,
}: {
  draftId: string;
  currentTheme: string;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<any>(null);
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [rawCoverFile, setRawCoverFile] = useState<string | null>(null);
  const [snapshotToDelete, setSnapshotToDelete] = useState<string | null>(null);

  const { activeDraft, setActiveDraft, clearActiveDraft } = useActiveDraft();

  useEffect(() => {
    fetchDraftInfo();

    const handleItemsChanged = () => {
      fetchDraftInfo(true); // Silent reload
    };

    window.addEventListener("fomo-draft-items-changed", handleItemsChanged);
    return () => {
      window.removeEventListener("fomo-draft-items-changed", handleItemsChanged);
    };
  }, [draftId]);

  const fetchDraftInfo = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("drafts")
        .select(`
          *,
          draft_members ( user_id, role ),
          profiles!drafts_owner_id_fkey ( username, avatar_url, color )
        `)
        .eq("id", draftId)
        .single();

      if (error) throw error;
      setDraft(data);

      const { data: itemsData, error: itemsError } = await supabase
        .from("draft_items")
        .select("*")
        .eq("draft_id", draftId)
        .order("position", { ascending: true });

      if (itemsError) throw itemsError;
      setDraftItems(itemsData || []);

      const { data: snapsData } = await supabase
        .from("draft_snapshots")
        .select("*")
        .eq("draft_id", draftId)
        .order("version_number", { ascending: false });
      setSnapshots(snapsData || []);

      const { data: memData } = await supabase
        .from("draft_members")
        .select(`
          *,
          profiles:user_id (username, avatar_url, color)
        `)
        .eq("draft_id", draftId);
      setMembers(memData || []);

    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!draftItems || draftItems.length === 0) {
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "No puedes crear un snapshot de un draft vacío.", type: "warning" }
      }));
      return;
    }

    setCreatingSnapshot(true);
    try {
      // Create a simplified manifest from the current items (Draft Manifest Regenerator)
      // This guarantees the snapshot perfectly reflects the authoritative draft_items table
      const manifest = {
        minecraft: draft.minecraft_version,
        loader: draft.loader,
        mods: draftItems.map(item => ({
          source: item.source,
          projectId: item.project_id,
          versionId: item.version_id,
          side: item.side,
          required: item.required,
          contentType: item.content_type || "mod",
          dependencies: item.dependencies || [],
          // Persistimos metadatos legibles para el preview del snapshot
          mod_name: item.mod_name || item.project_id,
          icon_url: item.icon_url || null,
        }))
      };

      // Determine the next version number
      const { data: snapshots, error: fetchErr } = await supabase
        .from("draft_snapshots")
        .select("version_number")
        .eq("draft_id", draftId)
        .order("version_number", { ascending: false })
        .limit(1);

      if (fetchErr) throw fetchErr;

      const nextVersion = snapshots && snapshots.length > 0 ? snapshots[0].version_number + 1 : 1;

      // Calculate fingerprint (simple implementation for now)
      const fingerprintData = draft.loader + draft.minecraft_version + draftItems.map(i => i.project_id).sort().join(",");
      const fingerprint = btoa(fingerprintData).substring(0, 32); // mock sha256

      const { error: insertErr } = await supabase
        .from("draft_snapshots")
        .insert({
          draft_id: draftId,
          version_number: nextVersion,
          manifest,
          fingerprint,
          created_by: user?.id
        });

      if (insertErr) throw insertErr;
      
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: `Snapshot v${nextVersion} creado con éxito.`, type: "success" }
      }));
      fetchDraftInfo(true);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al crear snapshot. Revisa la consola.", type: "error" }
      }));
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const toggleVisibility = async () => {
    if (!draft || draft.owner_id !== user?.id) {
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Solo el propietario puede cambiar la visibilidad.", type: "warning" }
      }));
      return;
    }

    const newVis = draft.visibility === "public" ? "private" : "public";
    
    try {
      const { error } = await supabase
        .from("drafts")
        .update({ visibility: newVis })
        .eq("id", draft.id);

      if (error) throw error;
      
      setDraft({ ...draft, visibility: newVis });
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: `Draft ahora es ${newVis === "public" ? "Público" : "Privado"}.`, type: "success" }
      }));
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al cambiar la visibilidad.", type: "error" }
      }));
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    try {
      const { error } = await supabase
        .from("draft_snapshots")
        .delete()
        .eq("id", snapshotId);
      
      if (error) throw error;
      
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Snapshot eliminado exitosamente", type: "success" }
      }));
      
      setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
      fetchDraftInfo(true);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("fomo-show-status", {
        detail: { text: "Error al eliminar snapshot.", type: "error" }
      }));
    }
  };

  const handleInstallSnapshot = (snap: any) => {
    if (!snap.manifest || !snap.manifest.mods || snap.manifest.mods.length === 0) {
      alert("El snapshot está vacío. No hay mods para descargar.");
      return;
    }

    const snapshotProjectIds = new Set(snap.manifest.mods.map((m: any) => String(m.projectId)));
    const missingDeps = new Map<string, string>();

    // Calculate missing dependencies from the snapshot manifest
    snap.manifest.mods.forEach((m: any) => {
      if (m.dependencies && Array.isArray(m.dependencies)) {
        m.dependencies.forEach((dep: any) => {
          if (dep.dependency_type === "required" && dep.project_id) {
            const depId = String(dep.project_id);
            if (!snapshotProjectIds.has(depId)) {
              missingDeps.set(depId, depId);
            }
          }
        });
      }
    });

    let additionalIntents: DownloadIntent[] = [];
    if (missingDeps.size > 0) {
      const confirmDownload = window.confirm(`El Snapshot no incluye ${missingDeps.size} dependencia(s) requerida(s).\n¿Deseas intentar descargarlas automáticamente también?`);
      if (confirmDownload) {
        additionalIntents = Array.from(missingDeps.values()).map(depId => ({
          id: crypto.randomUUID(),
          projectId: depId,
          versionId: undefined, // Let the broker resolve the best version
          platform: "modrinth",
          projectType: "mod"
        }));
      }
    }

    const intents: DownloadIntent[] = snap.manifest.mods.map((m: any) => ({
      id: crypto.randomUUID(),
      projectId: m.projectId,
      versionId: m.versionId,
      platform: m.source as "modrinth" | "curseforge",
      projectType: m.contentType,
    }));
    
    const finalIntents = [...intents, ...additionalIntents];
    const sessionId = `draft_${draftId}_v${snap.version_number}_${Date.now()}`;
    downloadBroker.enqueueSession(sessionId, finalIntents);
    
    window.dispatchEvent(new CustomEvent("fomo-show-status", {
      detail: { text: `Descarga de la v${snap.version_number} iniciada. (${finalIntents.length} mods encolados)`, type: "success" }
    }));
  };



  const isModern = currentTheme === "modern";

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-white/50 animate-fade-in">
        <Loader className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-sm">Cargando draft...</span>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Draft no encontrado</h3>
        <button onClick={onBack} className="text-primary hover:underline">Volver</button>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "Resumen", icon: <Info className="w-4 h-4" /> },
    { id: "mods", label: "Items", icon: <Blend className="w-4 h-4" /> },
    { id: "activity", label: "Actividad", icon: <Clock className="w-4 h-4" /> },
    { id: "members", label: "Miembros", icon: <Users className="w-4 h-4" /> },
    { id: "validation", label: "Validación", icon: <CheckCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col gap-4 animate-fade-in w-full h-full min-h-0 max-w-[1400px] mx-auto pb-4">
      {/* Header */}
      <div className={`shrink-0 relative w-full min-h-[140px] rounded-3xl overflow-hidden flex flex-col justify-between p-5 border ${isModern ? "bg-card border-border shadow-sm" : "bg-white/5 border-white/10"}`}>
        {draft.cover_image && (
          <div className="absolute inset-0 z-0">
            <img src={draft.cover_image} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 mix-blend-overlay" />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}
        {!draft.cover_image && (
          <div className="absolute inset-0 z-0 bg-gradient-to-tr from-slate-900 to-slate-800" />
        )}

        <div className="relative z-10 w-full mb-2">
          <button 
            onClick={onBack}
            className={`flex items-center gap-2 text-sm font-bold w-fit transition-colors px-3 py-1.5 rounded-lg backdrop-blur-md bg-black/40 text-white/90 hover:bg-black/60 hover:text-white border border-white/10`}
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Drafts
          </button>
        </div>

        <div className="relative z-10 flex items-center justify-between w-full mt-auto">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary text-white rounded-md flex items-center gap-1 shadow-md">
                  <Box className="w-3 h-3" /> {draft.loader} {draft.minecraft_version}
                </span>
                <button 
                  onClick={toggleVisibility}
                  disabled={draft.owner_id !== user?.id}
                  className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border flex items-center gap-1 transition-colors backdrop-blur-md shadow-sm ${draft.visibility === 'public' ? 'border-green-500/50 text-green-300 bg-green-500/20 hover:bg-green-500/30' : 'border-white/20 text-white/80 bg-black/40 hover:bg-black/60'} ${draft.owner_id === user?.id ? 'cursor-pointer' : 'cursor-default'}`}
                  title={draft.owner_id === user?.id ? "Cambiar visibilidad" : ""}
                >
                  {draft.visibility === 'public' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />} {draft.visibility === 'public' ? 'Público' : 'Privado'}
                </button>
              </div>
              <h1 className={`text-4xl font-black tracking-tight text-white drop-shadow-md flex items-center gap-3`}>
                {draft.name}
                {draft.owner_id === user?.id && (
                  <button
                    onClick={() => {
                      setCoverUrlInput(draft.cover_image || "");
                      setIsCoverModalOpen(true);
                    }}
                    className={`p-2 rounded-full backdrop-blur-md opacity-50 hover:opacity-100 transition-all cursor-pointer bg-black/40 text-white border border-white/10`}
                    title="Cambiar Portada"
                  >
                    <ImagePlus className="w-5 h-5" />
                  </button>
                )}
              </h1>
              <p className={`text-sm font-medium text-white/80 drop-shadow-sm`}>
                {draft.description || "Sin descripción proporcionada."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (activeDraft?.id === draft.id) {
                    clearActiveDraft();
                  } else {
                    setActiveDraft({
                      id: draft.id,
                      name: draft.name,
                      loader: draft.loader,
                      version: draft.minecraft_version,
                      items: draftItems.map(i => ({
                        projectId: i.project_id,
                        source: i.source,
                        addedBy: i.added_by
                      }))
                    });
                  }
                }}
                className={`px-5 py-2.5 font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2 backdrop-blur-md ${
                  activeDraft?.id === draft.id 
                    ? "bg-primary text-white border border-primary/30" 
                    : "bg-black/40 text-white/90 border border-white/20 hover:bg-black/60"
                }`}
              >
                {activeDraft?.id === draft.id ? (
                  <FlaskConicalOff className="w-4 h-4" />
                ) : (
                  <FlaskConical className="w-4 h-4" />
                )}
                {activeDraft?.id === draft.id ? "Desactivar" : "Activar"}
              </button>

              {false && (
                <button 
                  onClick={handleCreateSnapshot}
                  disabled={creatingSnapshot}
                  className="px-5 py-2.5 bg-primary/90 text-white font-bold rounded-xl shadow-lg border border-primary/50 hover:bg-primary transition-colors flex items-center gap-2 backdrop-blur-md"
                >
                  {creatingSnapshot ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SwitchCamera className="w-4 h-4" />}
                  Draft Snapshot
                </button>
              )}
            </div>
        </div>
      </div>

      { /* Tabs Nav */}
      <div className={`shrink-0 z-20 w-fit`}>
        <div
          className="relative grid items-center h-12 p-1.5 rounded-2xl overflow-hidden shadow-sm"
          style={{
            gridTemplateColumns: `repeat(${TABS.length}, minmax(120px, 1fr))`,
            background: isModern ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isModern ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Liquid Sliding Pill */}
          <div
            className="absolute transition-all duration-500 ease-[cubic-bezier(0.6,0.01,-0.05,0.95)] rounded-xl pointer-events-none inset-y-1.5"
            style={{
              left: `calc(6px + ${TABS.findIndex(t => t.id === activeTab)} * (100% - 12px) / ${TABS.length})`,
              width: `calc((100% - 12px) / ${TABS.length})`,
              background: isModern ? 'white' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isModern ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
              boxShadow: isModern ? '0 4px 12px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.2)',
            }}
          />

          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative z-10 h-full w-full flex items-center justify-center gap-2 text-xs font-bold tracking-wide rounded-xl transition-all duration-300 cursor-pointer"
                style={{
                  color: isActive
                    ? (isModern ? 'var(--color-primary)' : 'white')
                    : (isModern ? 'rgba(13,39,80,0.5)' : 'rgba(255,255,255,0.4)'),
                }}
              >
                {React.cloneElement(tab.icon as any, {
                  className: `w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`
                })}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className={`flex flex-col flex-1 min-h-0 p-5 md:p-6 rounded-3xl border overflow-hidden relative ${isModern ? "bg-card border-border" : "bg-white/5 border-white/10"}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col flex-1 min-h-0 w-full h-full"
          >
        {activeTab === "overview" && (
          <DraftOverviewTab draftId={draftId} isModern={isModern} />
        )}
        
        {activeTab === "mods" && (
          <DraftItemsTab
            draftItems={draftItems}
            isModern={isModern}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            fetchDraftInfo={fetchDraftInfo}
          />
        )}

        {activeTab === "snapshots" && (
          <DraftSnapshotsTab
            draft={draft}
            snapshots={snapshots}
            user={user}
            isModern={isModern}
            setSnapshotToDelete={setSnapshotToDelete as any}
            handleInstallSnapshot={handleInstallSnapshot}
          />
        )}

        {activeTab === "members" && (
          <DraftMembersTab
            draft={draft}
            members={members}
            user={user}
            isModern={isModern}
            setIsInviteModalOpen={setIsInviteModalOpen}
          />
        )}

        {activeTab === "activity" && (
          <DraftActivityTab draftId={draftId} isModern={isModern} />
        )}

        {activeTab === "validation" && (
          <DraftValidationTab
            draftId={draftId}
            isModern={isModern}
            draft={draft}
            draftItems={draftItems}
          />
        )}
        </motion.div>
        </AnimatePresence>
      </div>

      <CommunityDraftInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        currentTheme={currentTheme}
        draftId={draftId}
        onInvited={() => {
          fetchDraftInfo();
          setTimeout(() => setIsInviteModalOpen(false), 1500);
        }}
      />

      {isCoverModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${isModern ? 'bg-card border-border shadow-[0_20px_60px_rgba(13,39,80,0.16)]' : 'bg-[#121214] border-white/15'}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 mb-4 ${isModern ? 'text-foreground' : 'text-white'}`}>
              <ImagePlus className="w-4 h-4 text-primary" /> Editar Banner del Draft
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className={`text-[10px] font-bold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>Selecciona una imagen de tu computadora (JPG/PNG)</label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        window.dispatchEvent(new CustomEvent("fomo-show-status", {
                          detail: { text: "La imagen debe pesar menos de 2MB.", type: "error" }
                        }));
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setRawCoverFile(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 ${isModern ? 'bg-background border-border text-foreground' : 'bg-black/20 border-white/10 text-white'}`}
                />
              </div>

              {coverUrlInput && (
                <div className="w-full h-32 rounded-xl overflow-hidden border border-white/10 bg-black/20 relative">
                  <img src={coverUrlInput} alt="Vista previa" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => setIsCoverModalOpen(false)}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${isModern ? 'bg-muted/50 border-border text-foreground hover:bg-muted' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  try {
                    await supabase.from("drafts").update({ cover_image: coverUrlInput }).eq("id", draft.id);
                    setDraft((d: any) => d ? { ...d, cover_image: coverUrlInput } : d);
                    setIsCoverModalOpen(false);
                    window.dispatchEvent(new CustomEvent("fomo-show-status", {
                      detail: { text: "Banner actualizado exitosamente.", type: "success" }
                    }));
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex-1 px-3 py-2 bg-primary text-white font-bold rounded-xl text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
              >
                Guardar Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {rawCoverFile && (
        <ImageCropper
          imageUrl={rawCoverFile}
          aspectRatio={16/9}
          shape="rect"
          isModern={isModern}
          onCancel={() => setRawCoverFile(null)}
          onSave={(croppedUrl) => {
            setCoverUrlInput(croppedUrl);
            setRawCoverFile(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!snapshotToDelete}
        onClose={() => setSnapshotToDelete(null)}
        onConfirm={() => {
          if (snapshotToDelete) {
            handleDeleteSnapshot(snapshotToDelete);
            setSnapshotToDelete(null);
          }
        }}
        title="Eliminar Snapshot"
        message="¿Estás seguro de que deseas eliminar este snapshot de forma permanente? No se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        type="danger"
      />
    </div>
  );
}

function Loader(props: any) {
  return <RefreshCw {...props} />;
}
