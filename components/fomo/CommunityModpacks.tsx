"use client";

import React, { useState, useEffect } from "react";
import { Package, Plus, RefreshCw, Download, Check } from "lucide-react";
import { useAuth } from "@/components/security/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/lib/supabaseClient";
import { SafeDownloader } from "@/lib/downloadQueue";

interface ModpackBuild {
  id: string;
  name: string;
  description: string;
  game_version: string;
  modloader: string;
  version_label: string;
  config_zip_url?: string;
  downloads_count: number;
  manifest: any;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string | null;
    color?: string | null;
  };
}

export function CommunityModpacks() {
  const { user } = useAuth();
  const { projects } = useProjects();

  const [modpacks, setModpacks] = useState<ModpackBuild[]>([]);
  const [loadingModpacks, setLoadingModpacks] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Modal States
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishName, setPublishName] = useState("");
  const [publishDesc, setPublishDesc] = useState("");
  const [publishVersion, setPublishVersion] = useState("1.0.0");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Downloading States
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadEta, setDownloadEta] = useState(0);
  const [downloadingModpackId, setDownloadingModpackId] = useState<string | null>(null);

  const triggerStatus = (text: string, type: "success" | "error" | "info" = "info") => {
    window.dispatchEvent(new CustomEvent("fomo-show-status", {
      detail: { text, type }
    }));
  };

  // Fetch Modpacks
  useEffect(() => {
    if (!user) return;
    const fetchModpacks = async () => {
      setLoadingModpacks(true);
      try {
        const { data, error } = await supabase
          .from("modpack_builds")
          .select("id, name, description, game_version, modloader, version_label, downloads_count, manifest, created_at, profiles ( username, avatar_url, color )")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching modpacks:", error.message, error.details, error.hint);
          triggerStatus("Error al cargar modpacks de la comunidad.", "error");
          return;
        }
        setModpacks((data as any) || []);
      } catch (err) {
        console.error("Error fetching modpacks:", err);
        triggerStatus("Error al cargar modpacks de la comunidad.", "error");
      } finally {
        setLoadingModpacks(false);
      }
    };
    fetchModpacks();
  }, [user?.id, reloadTrigger]);

  const handlePublishModpack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProjectId) return;
    
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;
    
    setPublishing(true);
    try {
      const libResponse = await fetch(`/api/library?project=${encodeURIComponent(project.id)}&version=${project.version}`);
      if (!libResponse.ok) throw new Error("No se pudo obtener la biblioteca local.");
      
      const { library } = await libResponse.json();
      
      const manifestMods = (library || []).map((item: any) => ({
        id: item.meta?.modId || item.fileName,
        name: item.meta?.modName || item.fileName,
        version: item.meta?.modVersion || "unknown",
        platform: item.meta?.projectType === "modrinth" ? "modrinth" : "curseforge",
        category: item.category,
        sub: item.sub,
        fileName: item.fileName,
        sha1: item.meta?.sha1 || "",
      }));

      const manifest = {
        minecraftVersion: project.version,
        loader: project.loader,
        mods: manifestMods,
        exportedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from("modpack_builds")
        .insert({
          profile_id: user.id,
          name: publishName.trim(),
          description: publishDesc.trim(),
          game_version: project.version,
          modloader: project.loader,
          version_label: publishVersion.trim(),
          manifest: manifest
        });

      if (error) throw error;

      triggerStatus("¡Modpack publicado en la nube!", "success");
      setShowPublishModal(false);
      setPublishName("");
      setPublishDesc("");
      setReloadTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("[PublishError]:", err);
      triggerStatus(err.message || "Error al publicar modpack.", "error");
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadModpack = async (build: ModpackBuild) => {
    if (downloadingModpackId) return;
    
    setDownloadingModpackId(build.id);
    setDownloadProgress(0);
    setDownloadEta(0);
    
    try {
      const { error: rpcError } = await supabase.rpc('increment_downloads', { row_id: build.id });
      if (rpcError) {
        await supabase.from("modpack_builds").update({ downloads_count: build.downloads_count + 1 }).eq("id", build.id);
      }
      
      const mods = build.manifest.mods || [];
      if (mods.length === 0) {
        triggerStatus("El modpack no tiene mods asociados.", "error");
        setDownloadingModpackId(null);
        return;
      }

      const downloadItems = mods.map((m: any) => ({
        id: m.id,
        name: m.name,
        url: m.sha1 ? `hash:${m.sha1}` : `query:${m.name}`,
        platform: m.platform,
        status: 'pending' as const,
        bytesDownloaded: 0,
        totalBytes: 0,
      }));

      const downloader = new SafeDownloader(downloadItems);
      
      downloader.onProgress((queue, percent, eta) => {
        setDownloadProgress(Math.round(percent));
        setDownloadEta(eta);
      });

      triggerStatus(`Descargando modpack "${build.name}"...`, "success");
      
      await downloader.start();
      
      triggerStatus(`¡Modpack "${build.name}" descargado con éxito!`, "success");
      setReloadTrigger(prev => prev + 1);
    } catch (err) {
      console.error("[DownloadModpackError]:", err);
      triggerStatus("Error al descargar modpack.", "error");
    } finally {
      setDownloadingModpackId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Modpacks de la Comunidad</h3>
          <p className="text-[10px] text-white/40 mt-0.5">Explora y descarga builds compartidos por creadores.</p>
        </div>
        <button 
          onClick={() => setShowPublishModal(true)} 
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-background font-bold text-xs hover:opacity-90 transition-all cursor-pointer border-none"
        >
          <Plus className="w-3.5 h-3.5" /> Compartir Proyecto
        </button>
      </div>

      {/* Downloading bar */}
      {downloadingModpackId && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-3 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-primary">
            <span>Descargando modpack...</span>
            <span>{downloadProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
          </div>
          <p className="text-[10px] text-white/50">Tiempo estimado restante: {downloadEta}s</p>
        </div>
      )}

      {/* List */}
      {loadingModpacks ? (
        <div className="py-12 text-center text-white/40"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" /> Cargando modpacks...</div>
      ) : modpacks.length === 0 ? (
        <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-white/40 text-xs flex flex-col items-center justify-center gap-2">
          <Package className="w-6 h-6 opacity-30" />
          No hay modpacks públicos aún. ¡Sé el primero en compartir uno!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {modpacks.map((pack) => (
            <div key={pack.id} className="p-5 rounded-2xl bg-white/4 border border-white/5 hover:border-primary/20 transition-all flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-bold text-white truncate pr-2">{pack.name}</h4>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono font-bold">
                    v{pack.version_label}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-2 line-clamp-2">{pack.description || "Sin descripción."}</p>
                
                <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] text-white/40">
                  <span className="bg-black/20 px-2.5 py-1 rounded-lg">MC {pack.game_version}</span>
                  <span className="bg-black/20 px-2.5 py-1 rounded-lg uppercase">{pack.modloader}</span>
                  <span className="bg-black/20 px-2.5 py-1 rounded-lg font-bold text-primary/80">{pack.manifest?.mods?.length || 0} mods</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1 shrink-0">
                <span className="text-[9px] text-white/30">Subido por @{pack.profiles?.username || "Usuario"}</span>
                <button 
                  onClick={() => handleDownloadModpack(pack)} 
                  disabled={!!downloadingModpackId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 hover:border-primary/50 bg-primary/5 text-primary text-xs font-subhead transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar ({pack.downloads_count})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish Project Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl p-6 border shadow-2xl relative bg-[#121214] border-white/10">
            <h3 className="font-headline text-base text-white mb-4">Compartir Proyecto en MIM Cloud</h3>
            
            <form onSubmit={handlePublishModpack} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Seleccionar Proyecto Local</label>
                <select 
                  required
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    const proj = projects.find(p => p.id === e.target.value);
                    if (proj) setPublishName(proj.name);
                  }}
                  className="w-full bg-white/4 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary"
                >
                  <option value="" className="bg-neutral-900 text-white">-- Seleccioná un proyecto --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-neutral-900 text-white">{p.name} ({p.loader} - v{p.version})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Nombre del Modpack</label>
                <input 
                  type="text" 
                  required
                  value={publishName}
                  onChange={(e) => setPublishName(e.target.value)}
                  placeholder="Ej: Aventura Técnica 1.20"
                  className="w-full bg-white/4 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Descripción</label>
                <textarea 
                  value={publishDesc}
                  onChange={(e) => setPublishDesc(e.target.value)}
                  placeholder="Explicá de qué va tu modpack..."
                  rows={3}
                  className="w-full bg-white/4 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Versión del Modpack</label>
                <input 
                  type="text" 
                  required
                  value={publishVersion}
                  onChange={(e) => setPublishVersion(e.target.value)}
                  placeholder="Ej: 1.0.0"
                  className="w-full bg-white/4 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setShowPublishModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-white/60 hover:text-white transition-all cursor-pointer bg-transparent border-none"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={publishing}
                  className="flex-1 bg-primary text-background font-bold py-2 rounded-xl text-xs hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-primary/10 border-none"
                >
                  {publishing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {publishing ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
