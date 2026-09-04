"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Download, Upload, Loader2 } from "lucide-react";

interface ProfileSovereignVaultCardProps {
  isExportingVault: boolean;
  onOpenExportModal: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilePicked: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function ProfileSovereignVaultCard({
  isExportingVault,
  onOpenExportModal,
  fileInputRef,
  onFilePicked,
}: ProfileSovereignVaultCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-gradient-to-br from-emerald-950/20 via-indigo-950/15 to-surface/80 border border-emerald-500/20 rounded-3xl p-5 shadow-xl space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Bóveda Soberana (MIM Vault)</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                SHA-256
              </span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
              Respaldá tus borradores, favoritos y creadores en un archivo portable{" "}
              <code className="text-emerald-300 font-mono">.mimvault</code> independiente de la nube.
            </p>
          </div>
        </div>
      </div>

      {/* Acciones principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={onOpenExportModal}
          disabled={isExportingVault}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isExportingVault ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-emerald-400" />
          )}
          Exportar Bóveda (.mimvault)
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-xs font-bold transition-all active:scale-[0.98]"
        >
          <Upload className="w-4 h-4 text-indigo-400" />
          Restaurar / Migrar Bóveda
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFilePicked}
          accept=".mimvault,.json"
          className="hidden"
        />
      </div>
    </motion.section>
  );
}
