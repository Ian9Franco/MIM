import { useState, useCallback, useEffect, useRef } from "react";

export function useResourcePackManager(activePacks: string[], draftPacks: string[] | null, projectName: string, version: string, onUpdate: () => void) {
  // Initialize with draft if available, otherwise server state
  const [localOrder, setLocalOrder] = useState<string[]>(draftPacks || activePacks);
  const [hasChanges, setHasChanges] = useState(!!draftPacks);
  const [saving, setSaving] = useState(false);
  const [fixing, setFixing] = useState(false);
  
  // Track if we are currently sync-ing draft to avoid infinite loops
  const isSyncingDraft = useRef(false);

  // When base packs from server change, update if no changes
  useEffect(() => {
    if (!hasChanges) {
      setLocalOrder(activePacks);
    }
  }, [activePacks, hasChanges]);

  // Server-side draft persistence
  const saveDraftToServer = useCallback(async (newOrder: string[]) => {
    if (isSyncingDraft.current) return;
    isSyncingDraft.current = true;
    try {
      await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, action: "save-draft", resourcePacks: newOrder })
      });
    } catch (e) {
      console.error("Failed to save tweak draft:", e);
    } finally {
      isSyncingDraft.current = false;
    }
  }, [projectName, version]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...localOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setLocalOrder(newOrder);
    setHasChanges(true);
    saveDraftToServer(newOrder);
  }, [localOrder, saveDraftToServer]);

  const saveOrder = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, action: "save", resourcePacks: localOrder })
      });
      if (res.ok) { 
        setHasChanges(false); 
        onUpdate(); 
      }
    } finally {
      setSaving(false);
    }
  }, [localOrder, projectName, version, onUpdate]);

  const fixOrder = useCallback(async () => {
    setFixing(true);
    try {
      const res = await fetch("/api/tweak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, version, action: "fix-pack-order" })
      });
      if (res.ok) { 
        setHasChanges(false); 
        onUpdate(); 
      }
    } finally {
      setFixing(false);
    }
  }, [projectName, version, onUpdate]);

  return { localOrder, setLocalOrder, hasChanges, setHasChanges, saving, fixing, handleMove, saveOrder, fixOrder };
}
