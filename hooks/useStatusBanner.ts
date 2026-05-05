"use client";
import { useState, useCallback } from "react";

export type StatusType = "success" | "error" | "info";

export function useStatusBanner() {
  const [status, setStatus] = useState<{text: string, type: StatusType} | null>(null);

  const showStatus = useCallback((text: string, type: StatusType = "info") => {
    setStatus({ text, type });
    setTimeout(() => setStatus(null), 5000);
  }, []);

  const clearStatus = useCallback(() => setStatus(null), []);

  return { status, showStatus, clearStatus };
}
