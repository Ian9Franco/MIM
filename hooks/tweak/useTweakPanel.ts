import { useState, useCallback, useEffect } from "react";

/**
 * Hook central para la gestión de la lógica de TweakPanel.
 * Maneja el estado de carga, guardado de configuraciones y sincronización con Minecraft.
 */
export function useTweakPanel(projectName: string, version: string, loader: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [externalChange, setExternalChange] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tweak?projectName=${encodeURIComponent(projectName)}&version=${version}&loader=${loader}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        // Detect external changes (If file in disk is newer than our last sync)
        if (lastSyncTime && json.lastModified && json.lastModified !== lastSyncTime) {
          setExternalChange(true);
        }
        if (!lastSyncTime) setLastSyncTime(json.lastModified);
      }
      else showMessage("error", json.error || "Error cargando datos");
    } catch {
      showMessage("error", "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [projectName, version, loader, showMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = useCallback(async (action: "initialize" | "push-to-minecraft") => {
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, action })
      });
      const json = await res.json();
      if (res.ok) {
        showMessage("success", json.message);
        setLastSyncTime(new Date().toISOString());
        setExternalChange(false);
        if (action === "initialize") fetchData();
      } else showMessage("error", json.error);
    } finally {
      setSaving(false);
    }
  }, [projectName, version, fetchData, showMessage]);

  return { data, loading, saving, message, externalChange, setExternalChange, fetchData, handleAction };
}
