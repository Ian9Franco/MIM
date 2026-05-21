import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { eventBus } from "@/lib/eventBus";
import { incidentManager, Incident } from "@/lib/incidentManager";
import { mimDB } from "@/lib/indexeddb";

export function useAlertManager(sidebarOpen: boolean, library: any[], modrinthStatus: Record<string, any>, followedMods: any[], followedAuthors: string[], ignoredUpdates: Set<string>) {
  const [activeTab, setActiveTab] = useState<"all" | "sage" | "updates" | "conflicts" | "config" | "bytecode">("all");
  const [activeProject, setActiveProject] = useState<any>(null);
  const activeProjectRef = useRef<any>(null); // stable ref to avoid re-creating fetchConfigAndSageAlerts
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newAuthorMods, setNewAuthorMods] = useState<any[]>([]);
  const [scanningAuthors, setScanningAuthors] = useState(false);
  const [seenVersions, setSeenVersions] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("mim_seen_collection_versions") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    const saved = localStorage.getItem("alert_active_tab");
    if (saved) setActiveTab(saved as any);
  }, []);

  useEffect(() => { localStorage.setItem("alert_active_tab", activeTab); }, [activeTab]);

  const handleMarkSeen = (projectId: string, latestVersion: string) => {
    const updated = { ...seenVersions, [projectId]: latestVersion };
    setSeenVersions(updated);
    localStorage.setItem("mim_seen_collection_versions", JSON.stringify(updated));
  };

  const [modrinthStatusStored, setModrinthStatusStored] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      try {
        await mimDB.init();
        let status = {};
        const cacheStatusEntry = await mimDB.getCache("mim_modrinth_status");
        if (cacheStatusEntry?.data) {
          status = cacheStatusEntry.data;
        } else {
          const lsStatus = localStorage.getItem("mim_modrinth_status");
          if (lsStatus) {
            try {
              status = JSON.parse(lsStatus);
              await mimDB.setCache("mim_modrinth_status", status, 30 * 24 * 60 * 60 * 1000);
              localStorage.removeItem("mim_modrinth_status");
            } catch (e) {}
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
    const modsList: [string, any][] = [], collsList: [string, any][] = [], shadersList: [string, any][] = [], rpsList: [string, any][] = [];
    const followedModIds = new Set(followedMods.map(m => m.projectId));

    const mergedStatus = { ...modrinthStatus, ...modrinthStatusStored };

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
  }, [modrinthStatus, modrinthStatusStored, library, seenVersions, ignoredUpdates, followedMods]);

  const fetchConfigAndSageAlerts = useCallback(async (proj?: any) => {
    // Use provided proj arg, then ref, then state — all without capturing in deps
    const currentProj = proj !== undefined ? proj : activeProjectRef.current;
    try {
      const settingsRes = await fetch("/api/settings");
      const alerts: any[] = [];
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
          const latest = logData.files?.find((f: any) => f.path.includes("latest.log"));
          const sessionDate = latest?.date || new Date().toISOString().split("T")[0];
          if (logData.files?.filter((f: any) => f.type === "crash" && f.date === sessionDate).length > 0) {
            eventBus.emit("sage:crash-detected", { crashId: `crash-${Date.now()}`, crashType: "mod", severity: "high", logFile: "logs/latest.log", sessionId: sessionDate });
          } else incidentManager.resolveIncident("sage-active-crash");
        }
        const dRes = await fetch(`/api/library/resolve-ownership?project=${currentProj.name}&version=${currentProj.version}&loader=${currentProj.loader}`);
        if (dRes.ok) {
          const dData = await dRes.json();
          dData.actions?.forEach((act: any) => incidentManager.createIncident({ id: `dep-ownership-${act.modId}`, title: `Librería mal aislada: ${act.modName}`, detail: act.reason, severity: act.severity === "warning" ? "warning" : "info", module: "SYSTEM", meta: { type: "dependency_move", modId: act.modId, currentPath: act.currentPath, suggestedCategory: act.suggestedCategory } }));
        }
      }
    } catch {}
  }, []); // empty deps — uses ref for activeProject, stable identity

  useEffect(() => {
    const handleActiveProject = (e: any) => {
      activeProjectRef.current = e.detail;
      setActiveProject(e.detail);
      fetchConfigAndSageAlerts(e.detail);
    };
    const handleRefresh = () => fetchConfigAndSageAlerts();
    const handleIncidents = (e: any) => setIncidents([...e.detail]);
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
    const handleScanning = (payload: any) => {
      incidentManager.createIncident({
        id: `vt-scanning-${payload.filePath.replace(/[^a-zA-Z0-9]/g, "-")}`,
        title: `Verificando reputación...`,
        detail: `Analizando ${payload.fileName} en VirusTotal.`,
        severity: "info",
        module: "SAGE"
      });
    };

    const handleCompleted = (payload: any) => {
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
      const newMods: any[] = [];
      const installedIds = new Set(library.map(l => l.meta?.modId).filter(Boolean));
      for (const author of followedAuthors) {
        try {
          const res = await fetch(`https://api.modrinth.com/v2/user/${author}/projects`);
          if (res.ok) {
            const projects = await res.json();
            projects.forEach((proj: any) => {
              if ((Date.now() - new Date(proj.published).getTime()) < 30 * 24 * 60 * 60 * 1000 && !installedIds.has(proj.id)) {
                newMods.push({ path: `author-new-mod:${proj.id}`, title: proj.title, slug: proj.slug, author, latestVersion: proj.latest_version || "Nuevo", published: proj.published, description: proj.description, iconUrl: proj.icon_url, _source: "modrinth", isNewAuthorMod: true });
              }
            });
          }
        } catch {}
      }
      setNewAuthorMods(newMods);
      setScanningAuthors(false);
    };
    checkAuthors();
  }, [sidebarOpen, followedAuthors, library]);

  return { activeTab, setActiveTab, activeProject, incidents, setIncidents, modUpdates, collectionUpdates, shaderUpdates, resourcePackUpdates, newAuthorMods, scanningAuthors, handleMarkSeen };
}
