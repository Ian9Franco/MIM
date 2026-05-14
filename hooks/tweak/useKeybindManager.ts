import { useState, useMemo, useCallback } from "react";

export function useKeybindManager(keybinds: any[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pressedKeyFilter, setPressedKeyFilter] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [expandedMods, setExpandedMods] = useState<Set<string>>(new Set(["vanilla"]));

  const filteredKeybinds = useMemo(() => {
    let filtered = keybinds;
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(kb => 
        kb.name.toLowerCase().includes(term) || kb.id.toLowerCase().includes(term) ||
        kb.key.toLowerCase().includes(term) || kb.modSource?.toLowerCase().includes(term)
      );
    }
    if (pressedKeyFilter) {
      filtered = filtered.filter(kb => kb.key.toLowerCase().includes(pressedKeyFilter.toLowerCase()));
    }
    return filtered;
  }, [keybinds, searchQuery, pressedKeyFilter]);

  const filteredGrouped = useMemo(() => {
    const vanilla: any[] = [];
    const mods: Record<string, any[]> = {};
    const orphaned: any[] = [];
    for (const kb of filteredKeybinds) {
      if (kb.isOrphaned) orphaned.push(kb);
      else if (kb.modSource === "minecraft") vanilla.push(kb);
      else {
        const mod = kb.modSource || "Otros";
        if (!mods[mod]) mods[mod] = [];
        mods[mod].push(kb);
      }
    }
    return { vanilla, mods, orphaned };
  }, [filteredKeybinds]);

  const handleKeyDetect = useCallback(() => {
    setDetecting(true);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      setPressedKeyFilter(`key.keyboard.${e.key.toLowerCase()}`);
      setDetecting(false);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("keydown", handler);
    setTimeout(() => {
      window.removeEventListener("keydown", handler);
      setDetecting(false);
    }, 10000);
  }, []);

  const toggleModExpand = (mod: string) => {
    const newSet = new Set(expandedMods);
    if (newSet.has(mod)) newSet.delete(mod);
    else newSet.add(mod);
    setExpandedMods(newSet);
  };

  return { 
    searchQuery, setSearchQuery, pressedKeyFilter, setPressedKeyFilter, 
    detecting, filteredGrouped, handleKeyDetect, expandedMods, toggleModExpand,
    totalCount: filteredKeybinds.length
  };
}
