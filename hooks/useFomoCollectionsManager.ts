import { useState, useCallback, useEffect, useRef } from "react";
import { fetchCollections, fetchCollectionMods, createCollection, addModToCollection, downloadCollection, fetchOfficialCollections } from "@/services/api";
import type { CollectionEntry, ModHit } from "@/lib/types";

export function useFomoCollectionsManager(loader: string, gameVersion: string, onStatus: any) {
  const [collections, setCollections] = useState<any[]>([]);
  const [officialCollections, setOfficialCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<CollectionEntry | null>(null);
  const [viewMods, setViewMods] = useState<ModHit[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [collDl, setCollDl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [targetType, setTargetType] = useState<"local" | "modrinth">("modrinth");
  const [newName, setNewName] = useState("MIM");
  const [deletingColl, setDeletingColl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ collections: c }, { collections: o }] = await Promise.all([fetchCollections(), fetchOfficialCollections()]);
    setCollections(c || []); setOfficialCollections(o || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (viewing) {
      const fetchMods = async () => {
        setViewLoading(true);
        const { mods, error } = await fetchCollectionMods(viewing.id);
        if (error) onStatus(error, "error");
        setViewMods(mods || []);
        setViewLoading(false);
      };
      fetchMods();
    } else {
      setViewMods([]);
    }
  }, [viewing, onStatus]);

  const handleDownloadColl = async (coll: CollectionEntry) => {
    setCollDl(coll.id);
    const { count, error } = await downloadCollection(coll.id, loader, gameVersion);
    if (error) onStatus(error, "error");
    else onStatus(`${count} mods descargados de "${coll.name}"`, "success");
    setCollDl(null);
  };

  const handleDelete = async (coll: CollectionEntry) => {
    setDeletingColl(coll.id);
    try {
      const ep = coll.isLocal ? "/api/local-collections" : "/api/modrinth/collections";
      const res = await fetch(ep, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionId: coll.id }) });
      if (res.ok) { onStatus(`Colección "${coll.name}" eliminada`, "success"); load(); }
    } catch { onStatus("Error al eliminar", "error"); }
    finally { setDeletingColl(null); setConfirmDelete(null); }
  };

  const publishLocalCollection = async (coll: any) => {
    if (!coll.isLocal) return;
    setPublishing(coll.id);
    try {
      onStatus(`Iniciando publicación de "${coll.name}" en Modrinth...`, "info");
      const { collection: remote, error } = await createCollection(coll.name, coll.projects[0], "modrinth");
      if (error) { onStatus(error, "error"); return; }
      
      let success = 1;
      for (let i = 1; i < coll.projects.length; i++) {
        const { error: addErr } = await addModToCollection(remote!.id, coll.projects[i], "modrinth");
        if (!addErr) success++;
      }
      onStatus(`Colección "${coll.name}" publicada en Modrinth con ${success} mods`, "success");
      load();
    } catch { onStatus("Error al publicar en Modrinth", "error"); }
    finally { setPublishing(null); }
  };

  return { collections, officialCollections, loading, viewing, setViewing, viewMods, setViewMods, viewLoading, setViewLoading, collDl, creating, setCreating, targetType, setTargetType, newName, setNewName, deletingColl, confirmDelete, setConfirmDelete, publishing, load, handleDownloadColl, handleDelete, publishLocalCollection };
}
