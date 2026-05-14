import { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    const saved = localStorage.getItem("tweak_active_tab");
    if (saved) setActiveTab(saved as any);
  }, []);

  useEffect(() => { localStorage.setItem("tweak_active_tab", activeTab); }, [activeTab]);

  const fetchData = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tweak?projectName=${activeProject.name}&version=${activeProject.version}&loader=${activeProject.loader || "forge"}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (keybindHistory.length === 0 && json.keybinds?.length > 0) {
          setKeybindHistory([JSON.parse(JSON.stringify(json.keybinds))]);
          setHistoryIndex(0);
        }
      }
    } catch {} finally { setLoading(false); }
  }, [activeProject, keybindHistory.length]);

  useEffect(() => { if (isOpen && activeProject) fetchData(); }, [isOpen, activeProject, fetchData]);

  const handleAction = async (action: string, extra: any = {}) => {
    if (!activeProject) return;
    setSaving(true); setMessage(null);
    try {
      const res = await fetch("/api/tweak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectName: activeProject.name, version: activeProject.version, action, ...extra }) });
      const json = await res.json();
      if (res.ok) { setMessage({ text: json.message || "Éxito", type: "success" }); if (action !== "save") fetchData(); }
      else setMessage({ text: json.error || "Error", type: "error" });
    } catch { setMessage({ text: "Error de conexión", type: "error" }); } finally { setSaving(false); }
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
