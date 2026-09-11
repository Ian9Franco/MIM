import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { eventBus } from "@/lib/events/eventBus";
import { incidentManager, Incident } from "@/lib/intelligence/incidentManager";
import { mimDB } from "@/lib/storage/indexeddb";
import type { LibraryFile, Project } from "@/lib/core/types";

export interface ModrinthStatusItem {
  status?: string;
  latestVersion?: string;
  [key: string]: unknown;
}

export interface AuthorModItem {
  path: string;
  title: string;
  slug: string;
  author: string;
  latestVersion: string;
  published: string;
  description: string;
  iconUrl?: string;
  _source: "modrinth";
  isNewAuthorMod: boolean;
}

export interface ChannelVideoItem {
  path: string;
  title: string;
  videoId: string;
  videoUrl: string;
  thumbnail: string;
  channelUrl: string;
  publishedAt: string;
  _source: "youtube";
  isNewChannelVideo: boolean;
}

export interface FollowedModRef {
  projectId?: string;
  [key: string]: unknown;
}

export function useAlertManager(
  sidebarOpen: boolean,
  library: LibraryFile[],
  modrinthStatus: Record<string, ModrinthStatusItem>,
  followedMods: FollowedModRef[],
  followedAuthors: string[],
  ignoredUpdates: Set<string>
) {
  const [activeTab, setActiveTab] = useState<"all" | "sage" | "updates" | "conflicts" | "config" | "bytecode">("all");
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const activeProjectRef = useRef<Project | null>(null); // stable ref to avoid re-creating fetchConfigAndSageAlerts
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newAuthorMods, setNewAuthorMods] = useState<AuthorModItem[]>([]);
  const [scanningAuthors, setScanningAuthors] = useState(false);
  const [newChannelVideos, setNewChannelVideos] = useState<ChannelVideoItem[]>([]);
  const [scanningChannels, setScanningChannels] = useState(false);
  const [seenVersions, setSeenVersions] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("mim_seen_collection_versions") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    const saved = localStorage.getItem("alert_active_tab");
    if (saved && (saved === "all" || saved === "sage" || saved === "updates" || saved === "conflicts" || saved === "config" || saved === "bytecode")) {
      setActiveTab(saved);
    }
  }, []);

  useEffect(() => { localStorage.setItem("alert_active_tab", activeTab); }, [activeTab]);

  const handleMarkSeen = (projectId: string, latestVersion: string) => {
    const updated = { ...seenVersions, [projectId]: latestVersion };
    setSeenVersions(updated);
    localStorage.setItem("mim_seen_collection_versions", JSON.stringify(updated));
  };

  const [modrinthStatusStored, setModrinthStatusStored] = useState<Record<string, ModrinthStatusItem>>({});

  useEffect(() => {
    const load = async () => {
      try {
        await mimDB.init();
        let status: Record<string, ModrinthStatusItem> = {};
        const cacheStatusEntry = await mimDB.getCache("mim_modrinth_status");
        if (cacheStatusEntry?.data) {
          status = cacheStatusEntry.data as Record<string, ModrinthStatusItem>;
        } else {
          const lsStatus = localStorage.getItem("mim_modrinth_status");
          if (lsStatus) {
            try {
              status = JSON.parse(lsStatus);
              await mimDB.setCache("mim_modrinth_status", status, 30 * 24 * 60 * 60 * 1000);
              localStorage.removeItem("mim_modrinth_status");
            } catch (e) {
              console.warn("[useAlertManager] Error parsing legacy mim_modrinth_status:", e);
            }
          }
        }
        setModrinthStatusStored(status);
      } catch (err) {
        console.error("Error loading modrinth status cache in useAlertManager", err);
      }
    };
    load();
    window.addEventListener("mim-modrinth-status-changed", load);
    return () => window.removeEventListener("mim-modrinth-status-changed", load);
  }, []);

  const { modUpdates, collectionUpdates, shaderUpdates, resourcePackUpdates } = useMemo(() => {
    const modsList: [string, ModrinthStatusItem][] = [], collsList: [string, ModrinthStatusItem][] = [], shadersList: [string, ModrinthStatusItem][] = [], rpsList: [string, ModrinthStatusItem][] = [];
    const followedModIds = new Set(followedMods.map(m => m.projectId).filter(Boolean));

    const mergedStatus: Record<string, ModrinthStatusItem> = { ...modrinthStatus, ...modrinthStatusStored };

    Object.entries(mergedStatus).forEach(([path, s]) => {
      if (s.status !== "update_available" || !s.latestVersion) return;
      if (path.startsWith("collection:")) {
        const pId = path.replace("collection:", "");
        if (followedModIds.has(pId) && !ignoredUpdates.has(path)) {
          collsList.push([path, s]);
        }
      } else if (path.toLowerCase().includes("shaderpacks")) { if (!ignoredUpdates.has(path)) shadersList.push([path, s]); }
      else if (path.toLowerCase().includes("resourcepacks")) { if (!ignoredUpdates.has(path)) rpsList.push([path, s]); }
      else { if (library.find(l => l.path === path) && !ignoredUpdates.has(path)) modsList.push([path, s]); }
    });
    return { modUpdates: modsList, collectionUpdates: collsList, shaderUpdates: shadersList, resourcePackUpdates: rpsList };
  }, [modrinthStatus, modrinthStatusStored, library, ignoredUpdates, followedMods]);

  const fetchConfigAndSageAlerts = useCallback(async (proj?: Project | null) => {
    // Use provided proj arg, then ref, then state — all without capturing in deps
    const currentProj = proj !== undefined ? proj : activeProjectRef.current;
    try {
      const settingsRes = await fetch("/api/settings");
      const alerts: Array<{ id: string; title: string; detail: string; type: "warning" | "danger" | "info" }> = [];
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (!sData.virusTotalApiKey) alerts.push({ id: "cfg-virustotal", title: "VirusTotal: sin API key", detail: "Falta API Key de VirusTotal.", type: "warning" });
        if (!sData.modrinthApiKey) alerts.push({ id: "cfg-modrinth", title: "Modrinth: sin API key", detail: "Falta API Key de Modrinth.", type: "warning" });
        const paths = [sData.sourceBase, sData.buildsBase, sData.minecraftPath, sData.downloadsPath, sData.stagingPath];
        const pRes = await fetch("/api/settings/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths }) });
        if (pRes.ok) {
          const pData = await pRes.json();
          if (sData.sourceBase && !pData.results[sData.sourceBase]) alerts.push({ id: "cfg-source", title: "Source inválida", detail: "La ruta de origen no existe.", type: "danger" });
          if (sData.buildsBase && !pData.results[sData.buildsBase]) alerts.push({ id: "cfg-builds", title: "Builds inválida", detail: "La ruta de builds no existe.", type: "danger" });
          if (sData.minecraftPath && !pData.results[sData.minecraftPath]) alerts.push({ id: "cfg-minecraft", title: "Ruta .minecraft inválida", detail: "La carpeta del juego no existe.", type: "danger" });
          if (sData.downloadsPath && !pData.results[sData.downloadsPath]) alerts.push({ id: "cfg-downloads", title: "Carpeta Descargas inválida", detail: "La ruta de descargas no existe.", type: "warning" });
          if (sData.stagingPath && !pData.results[sData.stagingPath]) alerts.push({ id: "cfg-staging", title: "Carpeta Staging inválida", detail: "La ruta staging no existe.", type: "warning" });
        }
      }
      alerts.forEach(a => incidentManager.createIncident({ id: a.id, title: a.title, detail: a.detail, severity: a.type === "danger" ? "danger" : "warning", module: "CONFIG" }));
      ["cfg-virustotal", "cfg-modrinth", "cfg-source", "cfg-builds", "cfg-minecraft", "cfg-downloads", "cfg-staging"].forEach(id => { if (!alerts.find(a => a.id === id)) incidentManager.resolveIncident(id); });

      if (currentProj) {
        const logsRes = await fetch(`/api/project/logs?project=${currentProj.name}&version=${currentProj.version}`);
        if (logsRes.ok) {
          const logData = await logsRes.json();
          const latest = logData.files?.find((f: { path: string; date?: string }) => f.path.includes("latest.log"));
          const sessionDate = latest?.date || new Date().toISOString().split("T")[0];
          if (logData.files?.filter((f: { type?: string; date?: string }) => f.type === "crash" && f.date === sessionDate).length > 0) {
            eventBus.emit("sage:crash-detected", { crashId: `crash-${Date.now()}`, crashType: "mod", severity: "high", logFile: "logs/latest.log", sessionId: sessionDate });
          } else incidentManager.resolveIncident("sage-active-crash");
        }
        const dRes = await fetch(`/api/library/resolve-ownership?project=${currentProj.name}&version=${currentProj.version}&loader=${currentProj.loader}`);
        if (dRes.ok) {
          const dData = await dRes.json();
          dData.actions?.forEach((act: { modId: string; modName: string; reason: string; severity?: string; currentPath?: string; suggestedCategory?: string }) => incidentManager.createIncident({ id: `dep-ownership-${act.modId}`, title: `Librería mal aislada: ${act.modName}`, detail: act.reason, severity: act.severity === "warning" ? "warning" : "info", module: "SYSTEM", meta: { type: "dependency_move", modId: act.modId, currentPath: act.currentPath, suggestedCategory: act.suggestedCategory } }));
        }
      }
    } catch (err) {
      console.error("[useAlertManager] Error fetching config and sage alerts:", err);
    }
  }, []); // empty deps — uses ref for activeProject, stable identity

  useEffect(() => {
    const handleActiveProject = (e: Event) => {
      const customEvent = e as CustomEvent<Project>;
      activeProjectRef.current = customEvent.detail;
      setActiveProject(customEvent.detail);
      fetchConfigAndSageAlerts(customEvent.detail);
    };
    const handleRefresh = () => fetchConfigAndSageAlerts();
    const handleIncidents = (e: Event) => {
      const customEvent = e as CustomEvent<Incident[]>;
      if (Array.isArray(customEvent.detail)) {
        setIncidents(customEvent.detail.filter((i: Incident) => i.status === "active"));
      }
    };
    window.addEventListener("active-project-changed", handleActiveProject);
    window.addEventListener("refresh-system", handleRefresh);
    window.addEventListener("mim:incidents-updated", handleIncidents);
    incidentManager.getIncidents("active").then(setIncidents);
    fetchConfigAndSageAlerts();
    return () => {
      window.removeEventListener("active-project-changed", handleActiveProject);
      window.removeEventListener("refresh-system", handleRefresh);
      window.removeEventListener("mim:incidents-updated", handleIncidents);
    };
  }, [fetchConfigAndSageAlerts]); // stable — fetchConfigAndSageAlerts now has empty deps

  useEffect(() => {
    if (!sidebarOpen) return;
    fetchConfigAndSageAlerts();
    incidentManager.markAsSeen();
    const intId = setInterval(() => fetchConfigAndSageAlerts(), 30000); // 30s polling (was 15s)
    const focus = () => fetchConfigAndSageAlerts();
    window.addEventListener("focus", focus);
    return () => { clearInterval(intId); window.removeEventListener("focus", focus); };
  }, [sidebarOpen, fetchConfigAndSageAlerts]);

  useEffect(() => {
    const handleScanning = (payload: { filePath: string; fileName: string }) => {
      incidentManager.createIncident({
        id: `vt-scanning-${payload.filePath.replace(/[^a-zA-Z0-9]/g, "-")}`,
        title: `Verificando reputación...`,
        detail: `Analizando ${payload.fileName} en VirusTotal.`,
        severity: "info",
        module: "SAGE"
      });
    };

    const handleCompleted = (payload: { filePath: string; fileName: string; result?: { virusTotal?: { maliciousCount: number } } }) => {
      const id = `vt-scanning-${payload.filePath.replace(/[^a-zA-Z0-9]/g, "-")}`;
      incidentManager.resolveIncident(id);
      
      const result = payload.result;
      if (result && result.virusTotal) {
        if (result.virusTotal.maliciousCount > 0) {
          incidentManager.createIncident({
            id: `vt-alert-${payload.filePath.replace(/[^a-zA-Z0-9]/g, "-")}`,
            title: `VirusTotal: ${result.virusTotal.maliciousCount} detecciones`,
            detail: `Se encontraron amenazas en ${payload.fileName}.`,
            severity: "danger",
            module: "SAGE"
          });
        } else {
          incidentManager.createIncident({
            id: `vt-clean-${payload.filePath.replace(/[^a-zA-Z0-9]/g, "-")}`,
            title: `VirusTotal: Limpio`,
            detail: `${payload.fileName} verificado correctamente.`,
            severity: "info",
            module: "SAGE"
          });
        }
      }
    };

    const unsubscribeScanning = eventBus.subscribe("virustotal:scanning", handleScanning);
    const unsubscribeCompleted = eventBus.subscribe("virustotal:completed", handleCompleted);

    return () => {
      unsubscribeScanning();
      unsubscribeCompleted();
    };
  }, []);

  useEffect(() => {
    if (!sidebarOpen || followedAuthors.length === 0) { setNewAuthorMods([]); return; }
    const checkAuthors = async () => {
      setScanningAuthors(true);
      const newMods: AuthorModItem[] = [];
      const installedIds = new Set(library.map(l => l.meta?.modId).filter(Boolean));
      const notifiedMods = JSON.parse(localStorage.getItem("mim_notified_author_mods") || "{}");
      let notifiedUpdated = false;

      for (const author of followedAuthors) {
        try {
          const res = await fetch(`https://api.modrinth.com/v2/user/${author}/projects`);
          if (res.ok) {
            const projects: Array<Record<string, unknown>> = await res.json();
            projects.forEach((proj) => {
              const projId = String(proj.id || "");
              const publishedStr = String(proj.published || "");
              const publishedTime = new Date(publishedStr).getTime();
              if ((Date.now() - publishedTime) < 30 * 24 * 60 * 60 * 1000 && !installedIds.has(projId)) {
                newMods.push({
                  path: `author-new-mod:${projId}`,
                  title: String(proj.title || ""),
                  slug: String(proj.slug || ""),
                  author,
                  latestVersion: String(proj.latest_version || "Nuevo"),
                  published: publishedStr,
                  description: String(proj.description || ""),
                  iconUrl: typeof proj.icon_url === "string" ? proj.icon_url : undefined,
                  _source: "modrinth",
                  isNewAuthorMod: true
                });
                
                if (!notifiedMods[projId]) {
                  incidentManager.createIncident({
                    id: `new-author-mod-${projId}`,
                    title: `Nuevo mod de ${author}`,
                    detail: `${String(proj.title || "")} ya está disponible.`,
                    severity: "info",
                    module: "FOMO"
                  });
                  notifiedMods[projId] = true;
                  notifiedUpdated = true;
                }
              }
            });
          }
        } catch (err) {
          console.warn(`[useAlertManager] Error fetching mods for author "${author}":`, err);
        }
      }
      
      if (notifiedUpdated) {
        localStorage.setItem("mim_notified_author_mods", JSON.stringify(notifiedMods));
      }
      
      setNewAuthorMods(newMods);
      setScanningAuthors(false);
    };
    checkAuthors();
  }, [sidebarOpen, followedAuthors, library]);

  // Escanear nuevos videos de canales
  useEffect(() => {
    if (!sidebarOpen) { setNewChannelVideos([]); return; }
    const checkChannels = async () => {
      setScanningChannels(true);
      try {
        const channelsRes = await fetch("/api/fomo/youtube-channels");
        if (!channelsRes.ok) { setScanningChannels(false); return; }
        
        const channelsData = await channelsRes.json();
        const channels: string[] = channelsData.channels || [];
        
        if (channels.length === 0) { setNewChannelVideos([]); setScanningChannels(false); return; }
        
        // Cargar estado de videos previos vistos
        const lastVideosRaw = localStorage.getItem("mim_youtube_last_videos") || "{}";
        const lastVideos: Record<string, string> = JSON.parse(lastVideosRaw);
        const notifiedVideos = JSON.parse(localStorage.getItem("mim_notified_channel_videos") || "{}");
        let notifiedUpdated = false;
        
        const newVideos: ChannelVideoItem[] = [];
        
        for (const channelUrl of channels) {
          try {
            const videoRes = await fetch(`/api/fomo/youtube-showcase?channel=${encodeURIComponent(channelUrl)}&limit=1`);
            if (!videoRes.ok) continue;
            
            const videoData = await videoRes.json();
            const latestVideo = videoData.showcases?.[0];
            
            if (latestVideo && latestVideo.videoId) {
              const lastVideoId = lastVideos[channelUrl];
              const isNew = lastVideoId && lastVideoId !== latestVideo.videoId;
              
              let isToday = false;
              const d = new Date();
              const todayStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
              if (latestVideo.publishedAt === todayStr) {
                isToday = true;
              } else if (new Date(latestVideo.publishedAt).toDateString() === d.toDateString()) {
                isToday = true;
              }
              
              // Agregar a la lista si es nuevo, es de hoy, o no hay registro previo
              if (isNew || isToday || !lastVideoId) {
                newVideos.push({
                  path: `channel-new-video:${latestVideo.videoId}`,
                  title: latestVideo.title,
                  videoId: latestVideo.videoId,
                  videoUrl: latestVideo.videoUrl,
                  thumbnail: latestVideo.thumbnail,
                  channelUrl,
                  publishedAt: latestVideo.publishedAt,
                  _source: "youtube",
                  isNewChannelVideo: true
                });
              }
              
              if (isNew && !notifiedVideos[latestVideo.videoId]) {
                incidentManager.createIncident({
                  id: `new-channel-video-${latestVideo.videoId}`,
                  title: `Nuevo video en Showcase`,
                  detail: latestVideo.title,
                  severity: "info",
                  module: "FOMO"
                });
                notifiedVideos[latestVideo.videoId] = true;
                notifiedUpdated = true;
              }
              
              // Actualizar el último video visto
              if (lastVideoId !== latestVideo.videoId) {
                lastVideos[channelUrl] = latestVideo.videoId;
              }
            }
          } catch (err) {
            console.warn(`[useAlertManager] Error checking channel "${channelUrl}":`, err);
          }
        }
        
        // Guardar estado actualizado
        localStorage.setItem("mim_youtube_last_videos", JSON.stringify(lastVideos));
        if (notifiedUpdated) {
          localStorage.setItem("mim_notified_channel_videos", JSON.stringify(notifiedVideos));
        }
        setNewChannelVideos(newVideos);
      } catch (err) {
        console.error("[useAlertManager] Error checking channels:", err);
      } finally {
        setScanningChannels(false);
      }
    };
    checkChannels();
  }, [sidebarOpen]);

  return { activeTab, setActiveTab, activeProject, incidents, setIncidents, modUpdates, collectionUpdates, shaderUpdates, resourcePackUpdates, newAuthorMods, scanningAuthors, newChannelVideos, scanningChannels, handleMarkSeen };
}
