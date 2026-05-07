import { useState, useEffect, useCallback } from "react";

export interface StagingFile {
  path: string;
  name: string;
  type: "shader" | "resourcepack" | "unknown";
  relPath: string;
}

export function useStaging() {
  const [files, setFiles] = useState<StagingFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/staging");
      const data = await res.json();
      const files = data.files || [];
      setFiles(files);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("staging-status-changed", { detail: files.length > 0 }));
      }
    } catch (e) {
      console.error("Failed to fetch staging files:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolve = async (filePath?: string) => {
    try {
      const res = await fetch("/api/staging", {
        method: "POST",
        body: JSON.stringify({ action: "resolve", filePath }),
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
      }
      return data;
    } catch (e) {
      console.error("Failed to resolve staging:", e);
      return { success: false, error: "Network error" };
    }
  };

  const clear = async (filePath?: string) => {
    try {
      const res = await fetch("/api/staging", {
        method: "POST",
        body: JSON.stringify({ action: "clear", filePath }),
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
      }
      return data;
    } catch (e) {
      console.error("Failed to clear staging:", e);
      return { success: false, error: "Network error" };
    }
  };

  useEffect(() => {
    refresh();
    // Refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    files,
    isLoading,
    refresh,
    resolve,
    clear,
    hasFiles: files.length > 0
  };
}
