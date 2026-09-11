"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, Download, Upload, Loader2, ChevronDown } from "lucide-react";

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
  const [expanded, setExpanded] = React.useState(false);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-gradient-to-br from-emerald-950/20 via-indigo-950/15 to-surface/80 border border-emerald-500/20 rounded-2xl p-3.5 shadow-lg"
    >
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Respaldo y migración</h3>
            <p className="mt-0.5 text-[9px] text-white/45">Bóveda Soberana · .mimvault</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
      {expanded && (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <p className="px-1 pt-3 text-[10px] leading-relaxed text-white/50">
        Respaldá tus borradores, favoritos y creadores en un archivo portable e independiente de la nube.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
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
      </div>
      </motion.div>
      )}
      </AnimatePresence>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFilePicked}
        accept=".mimvault,.json"
        className="hidden"
      />
    </motion.section>
  );
}
