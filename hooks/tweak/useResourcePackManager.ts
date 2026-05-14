import { useState, useCallback, useEffect } from "react";

export function useResourcePackManager(activePacks: string[], projectName: string, version: string, onUpdate: () => void) {
  const [localOrder, setLocalOrder] = useState<string[]>(activePacks);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    if (!hasChanges) setLocalOrder(activePacks);
  }, [activePacks, hasChanges]);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...localOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setLocalOrder(newOrder);
    setHasChanges(true);
  }, [localOrder]);

  const saveOrder = useCallback(async () => {
    setSaving(true);
    const res = await fetch("/api/tweak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, version, action: "save", resourcePacks: localOrder })
    });
    if (res.ok) { setHasChanges(false); onUpdate(); }
    setSaving(false);
  }, [localOrder, projectName, version, onUpdate]);

  const fixOrder = useCallback(async () => {
    setFixing(true);
    const res = await fetch("/api/tweak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectName, version, action: "fix-pack-order" })
    });
    if (res.ok) { setHasChanges(false); onUpdate(); }
    setFixing(false);
  }, [projectName, version, onUpdate]);

  return { localOrder, setLocalOrder, hasChanges, setHasChanges, saving, fixing, handleMove, saveOrder, fixOrder };
}
