import { useState, useCallback, useEffect, useRef } from "react";
import { fetchCollections, createCollection, addModToCollection } from "@/services/api";
import type { ModHit, Project } from "@/lib/types";

export function useFomoSidebarManager(open: boolean, discover: any, showStatus: any) {
  const [mode, setMode] = useState<"spotlight" | "discover" | "collections" | "followed">("spotlight");
  const [addingToCollectionFor, setAddingToCollectionFor] = useState<ModHit | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [collectionsList, setCollectionsList] = useState<any[]>([]);
  const [loadingColls, setLoadingColls] = useState(false);
  const [isCreatingColl, setIsCreatingColl] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [newCollTarget, setNewCollTarget] = useState<"local" | "modrinth">("local");
  const [addingToCollId, setAddingToCollId] = useState<string | null>(null);

  const loadCollections = async () => {
    setLoadingColls(true);
    try { const { collections } = await fetchCollections(); setCollectionsList(collections || []); }
    catch (e) { console.error(e); }
    finally { setLoadingColls(false); }
  };

  const handleBulkAddToCollection = async (coll: any) => {
    setAddingToCollId(coll.id);
    const mods = discover.selectedMods;
    let success = 0;
    for (const mod of mods) {
      const { error } = await addModToCollection(coll.id, mod, coll.isLocal ? "local" : "modrinth");
      if (!error) success++;
    }
    showStatus(`${success}/${mods.length} ítems añadidos a "${coll.name}"`, success === mods.length ? "success" : "info");
    setBulkAdding(false); setAddingToCollId(null); discover.clearSelection();
  };

  const handleBulkCreateCollection = async () => {
    if (!newCollName.trim() || discover.selectedMods.length === 0) return;
    setLoadingColls(true);
    const { collection, error } = await createCollection(newCollName, discover.selectedMods[0], newCollTarget);
    if (error) { showStatus(error, "error"); setLoadingColls(false); return; }
    let success = 1;
    for (let i = 1; i < discover.selectedMods.length; i++) {
      const { error: addErr } = await addModToCollection(collection!.id, discover.selectedMods[i], newCollTarget);
      if (!addErr) success++;
    }
    showStatus(`Colección "${newCollName}" creada con ${success} ítems.`, "success");
    setBulkAdding(false); setLoadingColls(false); discover.clearSelection();
  };

  const [isTransitioning, setIsTransitioning] = useState(false);
  const isDetailsOpen = !!discover.selectingVersionFor;
  const lastDetails = useRef(isDetailsOpen);

  useEffect(() => {
    if (isDetailsOpen !== lastDetails.current) {
      setIsTransitioning(true);
      const t = setTimeout(() => setIsTransitioning(false), 450);
      lastDetails.current = isDetailsOpen;
      return () => clearTimeout(t);
    }
  }, [isDetailsOpen]);



  return { mode, setMode, addingToCollectionFor, setAddingToCollectionFor, bulkAdding, setBulkAdding, collectionsList, loadingColls, isCreatingColl, setIsCreatingColl, newCollName, setNewCollName, newCollTarget, setNewCollTarget, addingToCollId, loadCollections, handleBulkAddToCollection, handleBulkCreateCollection, isTransitioning, isDetailsOpen };
}
