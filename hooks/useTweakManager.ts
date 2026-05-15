import { useState, useEffect, useCallback, useRef } from "react";
import type { Project, TweakData, Keybind } from "@/lib/types";

export function useTweakManager(isOpen: boolean, activeProject: Project | null) {
  const [activeTab, setActiveTab] = useState<"optimize" | "keybinds" | "resourcepacks" | "profiles">("optimize");
  const [data, setData] = useState<TweakData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [listeningKey, setListeningKey] = useState<string | null>(null);
  const [keybindHistory, setKeybindHistory] = useState<Keybind[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasPackChanges, setHasPackChanges] = useState(false);
  const [draggedPackIdx, setDraggedPackIdx] = useState<number | null>(null);
  const [externalChange, setExternalChange] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tweak_active_tab");
    if (saved) setActiveTab(saved as any);
  }, []);

  useEffect(() => { localStorage.setItem("tweak_active_tab", activeTab); }, [activeTab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const query = activeProject 
      ? `?projectName=${activeProject.name}&version=${activeProject.version}&loader=${activeProject.loader || "forge"}`
      : "";
    
    try {
      const res = await fetch(`/api/tweak${query}`);
      const json = await res.json();
      if (res.ok) {
        // Apply draft if it exists
        if (json.draft) {
          if (json.draft.resourcePacks) {
            json.resourcePacks.active = json.draft.resourcePacks;
            setHasPackChanges(true);
          }
          if (json.draft.keybinds) {
            json.keybinds = json.draft.keybinds;
          }
        }

        setData(json);
        
        // Detect external changes (Compare with last sync time)
        if (lastSyncTime && json.lastModified && json.lastModified !== lastSyncTime) {
          setExternalChange(true);
        }
        if (!lastSyncTime) setLastSyncTime(json.lastModified);

        if (keybindHistory.length === 0 && json.keybinds?.length > 0) {
          setKeybindHistory([JSON.parse(JSON.stringify(json.keybinds))]);
          setHistoryIndex(0);
        }
      }
    } catch {} finally { setLoading(false); }
  }, [activeProject, keybindHistory.length]);

  useEffect(() => { if (isOpen) fetchData(); }, [isOpen, fetchData]);

  // Debounced Auto-save Draft
  const saveDraft = useCallback(async (currentData: TweakData) => {
    try {
      await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectName: activeProject?.name || null, 
          version: activeProject?.version || null, 
          action: "save-draft", 
          resourcePacks: currentData.resourcePacks.active,
          keybinds: currentData.keybinds 
        })
      });
    } catch (e) {
      console.error("Draft save failed:", e);
    }
  }, [activeProject]);

  useEffect(() => {
    if (!data || !hasPackChanges) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(data);
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [data, hasPackChanges, saveDraft]);

  const handleAction = async (action: string, extra: any = {}) => {
    setSaving(true); setMessage(null);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectName: activeProject?.name || null, 
          version: activeProject?.version || null, 
          action, 
          ...extra 
        })
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || "Éxito", type: "success" });
        if (action === "save") {
          setHasPackChanges(false);
          setLastSyncTime(new Date().toISOString()); // Update sync time after save
          setExternalChange(false);
        }
        
        // For sync-resourcepacks: inject returned packs directly into state
        if (action === "sync-resourcepacks" && data) {
          setData({
            ...data,
            resourcePacks: {
              ...data.resourcePacks,
              active: json.active ?? data.resourcePacks.active,
              available: json.available ?? data.resourcePacks.available ?? [],
              issues: json.issues ?? [],
              autoFixable: json.autoFixable ?? [],
            }
          });
        } else if (action !== "save") {
          fetchData();
        }
      } else {
        setMessage({ text: json.error || "Error", type: "error" });
      }
    } catch {
      setMessage({ text: "Error de conexión", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const addToHistory = (newKbs: Keybind[]) => {
    const h = keybindHistory.slice(0, historyIndex + 1);
    h.push(JSON.parse(JSON.stringify(newKbs)));
    if (h.length > 20) h.shift();
    setKeybindHistory(h); setHistoryIndex(h.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0 && data) {
      const i = historyIndex - 1; setHistoryIndex(i);
      setData({ ...data, keybinds: JSON.parse(JSON.stringify(keybindHistory[i])) });
    }
  };

  return { activeTab, setActiveTab, data, setData, loading, saving, message, setMessage, listeningKey, setListeningKey, historyIndex, keybindHistory, hasPackChanges, setHasPackChanges, draggedPackIdx, setDraggedPackIdx, fetchData, handleAction, addToHistory, handleUndo };
}
