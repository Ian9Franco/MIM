"use client";

import React from "react";
import { Download, Package, RefreshCw, X } from "lucide-react";
import { useDesktopAppUpdater } from "@/hooks/useDesktopAppUpdater";

interface DesktopUpdateBannerProps {
  onOpenSettings?: () => void;
}

export function DesktopUpdateBanner({ onOpenSettings }: DesktopUpdateBannerProps) {
  const updater = useDesktopAppUpdater();

  if (!updater.showBanner) return null;

  const latestLabel = updater.versionInfo?.latest ? `v${updater.versionInfo.latest}` : "nueva versión";

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/10 backdrop-blur-md">
      <div className="max-w-400 mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="min-w-0">
            {updater.status === "update-available" && (
              <p className="text-xs text-emerald-100 truncate">
                Actualización de MIM disponible: <span className="font-mono font-semibold">{latestLabel}</span>
              </p>
            )}
            {updater.status === "downloading" && (
              <p className="text-xs text-emerald-100 truncate">
                Descargando {latestLabel}… <span className="font-mono">{updater.downloadPercent}%</span>
              </p>
            )}
            {updater.status === "downloaded" && (
              <p className="text-xs text-emerald-100 truncate">
                {latestLabel} descargada. Reiniciá MIM para completar la instalación.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {updater.status === "update-available" && (
            <button
              type="button"
              onClick={() => void updater.downloadUpdate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 text-[11px] font-bold hover:bg-emerald-500/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
          )}

          {updater.status === "downloading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-emerald-200/80">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Descargando
            </span>
          )}

          {updater.status === "downloaded" && (
            <button
              type="button"
              onClick={() => void updater.installUpdate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 text-[11px] font-bold hover:bg-emerald-400 transition-all"
            >
              <Package className="w-3.5 h-3.5" />
              Reiniciar e instalar
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg border border-white/10 text-[11px] text-white/70 hover:text-white hover:bg-white/5 transition-all"
            >
              Ajustes
            </button>
          )}

          {updater.status === "update-available" && (
            <button
              type="button"
              onClick={updater.dismissBanner}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
              title="Ocultar por ahora"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
