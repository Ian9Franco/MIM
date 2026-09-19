"use client";

import { useCallback, useEffect, useState } from "react";
import type { MimUpdaterStatus } from "@/types/mim-desktop";

export type DesktopUpdaterUiStatus =
  | "idle"
  | "checking"
  | "update-available"
  | "up-to-date"
  | "downloading"
  | "downloaded"
  | "unsupported"
  | "error";

export interface DesktopUpdaterState {
  isDesktop: boolean;
  status: DesktopUpdaterUiStatus;
  versionInfo: { current: string; latest: string | null } | null;
  downloadPercent: number;
  errorMsg: string;
  unsupportedReason: string | null;
  bannerDismissed: boolean;
  checkUpdate: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismissBanner: () => void;
  unsupportedMessage: string;
  showBanner: boolean;
}

function getDismissKey(latest: string | null | undefined) {
  return `mim-update-banner-dismissed:${latest || "unknown"}`;
}

function readDismissed(latest: string | null | undefined) {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(getDismissKey(latest)) === "1";
}

export function useDesktopAppUpdater(): DesktopUpdaterState {
  const desktopApi = typeof window !== "undefined" ? window.mimDesktop : undefined;
  const [status, setStatus] = useState<DesktopUpdaterUiStatus>("idle");
  const [versionInfo, setVersionInfo] = useState<{ current: string; latest: string | null } | null>(null);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!desktopApi) return;

    const unsubscribe = desktopApi.onUpdaterStatus((payload: MimUpdaterStatus) => {
      if (payload.status === "checking") {
        setStatus("checking");
        setErrorMsg("");
        return;
      }
      if (payload.status === "update-available") {
        setStatus("update-available");
        setVersionInfo((prev) => ({
          current: payload.current || prev?.current || "unknown",
          latest: payload.latest || null,
        }));
        setBannerDismissed(readDismissed(payload.latest));
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: {
            text: `Nueva versión de MIM disponible: v${payload.latest || "?"}`,
            type: "info",
          },
        }));
        return;
      }
      if (payload.status === "update-not-available") {
        setStatus("up-to-date");
        setVersionInfo((prev) => ({
          current: payload.current || prev?.current || "unknown",
          latest: payload.latest || payload.current || null,
        }));
        return;
      }
      if (payload.status === "downloading") {
        setStatus("downloading");
        setDownloadPercent(payload.percent || 0);
        setBannerDismissed(false);
        return;
      }
      if (payload.status === "downloaded") {
        setStatus("downloaded");
        setVersionInfo((prev) => ({
          current: payload.current || prev?.current || "unknown",
          latest: payload.latest || null,
        }));
        setBannerDismissed(false);
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: {
            text: "Actualización descargada. Reiniciá MIM para instalarla.",
            type: "success",
          },
        }));
        return;
      }
      if (payload.status === "error") {
        setStatus("error");
        setErrorMsg(payload.message || "No se pudo verificar actualizaciones.");
      }
    });

    desktopApi.getVersion().then((info) => {
      if (!info.supported) {
        setStatus("unsupported");
        setUnsupportedReason(info.reason || "unsupported");
        setVersionInfo({ current: info.current, latest: info.latest || null });
        return;
      }
      const latest = info.latest || null;
      setVersionInfo({ current: info.current, latest });
      if (latest && latest !== info.current) {
        setStatus("update-available");
        setBannerDismissed(readDismissed(latest));
        window.dispatchEvent(new CustomEvent("fomo-show-status", {
          detail: {
            text: `Nueva versión de MIM disponible: v${latest}`,
            type: "info",
          },
        }));
        return;
      }
      setStatus("idle");
    }).catch((err: unknown) => {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "No se pudo leer la versión local.");
    });

    return unsubscribe;
  }, [desktopApi]);

  const checkUpdate = useCallback(async () => {
    if (!desktopApi) return;
    setStatus("checking");
    setErrorMsg("");
    try {
      const result = await desktopApi.checkForUpdates();
      if (!result.supported) {
        setStatus("unsupported");
        setUnsupportedReason(result.reason || "unsupported");
        return;
      }
      setVersionInfo({
        current: result.current || versionInfo?.current || "unknown",
        latest: result.latest || null,
      });
      if (result.updateAvailable) {
        setStatus("update-available");
        setBannerDismissed(readDismissed(result.latest));
      } else {
        setStatus("up-to-date");
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "No se pudo verificar actualizaciones.");
    }
  }, [desktopApi, versionInfo?.current]);

  const downloadUpdate = useCallback(async () => {
    if (!desktopApi) return;
    setStatus("downloading");
    setErrorMsg("");
    try {
      await desktopApi.downloadUpdate();
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Fallo al descargar la actualización.");
    }
  }, [desktopApi]);

  const installUpdate = useCallback(async () => {
    if (!desktopApi) return;
    try {
      await desktopApi.installUpdate();
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Fallo al instalar la actualización.");
    }
  }, [desktopApi]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(getDismissKey(versionInfo?.latest), "1");
    }
  }, [versionInfo?.latest]);

  const unsupportedMessage =
    unsupportedReason === "portable"
      ? "La versión portable no admite auto-update. Descargá el instalador (MIM Setup) desde GitHub Releases."
      : unsupportedReason === "development"
        ? "El auto-update solo está disponible en builds empaquetados."
        : "Auto-update no disponible en este entorno.";

  const showBanner = Boolean(
    desktopApi
    && !bannerDismissed
    && (status === "update-available" || status === "downloading" || status === "downloaded")
  );

  return {
    isDesktop: Boolean(desktopApi),
    status,
    versionInfo,
    downloadPercent,
    errorMsg,
    unsupportedReason,
    bannerDismissed,
    checkUpdate,
    downloadUpdate,
    installUpdate,
    dismissBanner,
    unsupportedMessage,
    showBanner,
  };
}
