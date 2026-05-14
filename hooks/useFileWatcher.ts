import { useState, useEffect, useRef } from "react";
import type { PendingFile } from "@/lib/types";

/**
 * Genera un "fingerprint" o huella única para un archivo pendiente
 * basado en sus metadatos. Se utiliza para detectar archivos duplicados.
 */
function getPendingFingerprint(file: PendingFile): string {
  const meta = file.meta;
  return [
    meta?.modId || "unknown",
    meta?.modName || file.fileName,
    meta?.modVersion || "unknown",
    meta?.gameVersion || "unknown",
    meta?.loader || "unknown",
    meta?.projectType || "unknown",
    meta?.sha1 || "no-sha1",
  ].join("|").toLowerCase();
}

export function useFileWatcher() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const es = new EventSource("/api/watcher");
    
    es.onopen = () => setLoading(false);
    es.onerror = () => setLoading(false);
    
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        
        if (data.type === "deleted") {
          setPendingFiles((prev) => prev.filter((f) => f.path !== data.path));
          return;
        }

        const pending: PendingFile = data;
        if (pending?.fileName) {
          setPendingFiles((prev) => {
            if (prev.find((f) => f.path === pending.path)) return prev;

            const duplicate = prev.find((f) => getPendingFingerprint(f) === getPendingFingerprint(pending));
            if (duplicate) {
              void fetch("/api/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: pending.path }),
              });
              return prev;
            }

            return [...prev, pending];
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("[useFileWatcher] Parse error:", err);
      }
    };

    return () => es.close();
  }, []);

  return { pendingFiles, setPendingFiles, loading };
}
