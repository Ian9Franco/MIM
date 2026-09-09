"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Trash2, RefreshCw, Monitor, Copy } from "lucide-react";
import type { ServerAuditSummary } from "@/lib/server/types";

export type DiffFilterTab = "all" | "missing" | "extra" | "updates" | "mismatches" | "duplicates" | "correct";

interface ServerAuditSummaryCardsProps {
  summary: ServerAuditSummary;
  activeFilter: DiffFilterTab;
  onSelectFilter: (tab: DiffFilterTab) => void;
}

export function ServerAuditSummaryCards({
  summary,
  activeFilter,
  onSelectFilter,
}: ServerAuditSummaryCardsProps) {
  const cards = [
    {
      id: "correct" as DiffFilterTab,
      label: "Sincronizados",
      count: summary.correct,
      description: "Coinciden exactamente",
      icon: CheckCircle2,
      color: "emerald",
      borderActive: "border-emerald-500 bg-emerald-500/10 text-emerald-300",
      borderInactive: "border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400",
    },
    {
      id: "missing" as DiffFilterTab,
      label: "Faltantes",
      count: summary.missingFromServer,
      description: "En proyecto, ausentes en servidor",
      icon: Download,
      color: "rose",
      borderActive: "border-rose-500 bg-rose-500/10 text-rose-300",
      borderInactive: "border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400",
    },
    {
      id: "extra" as DiffFilterTab,
      label: "Sobrantes",
      count: summary.extraOnServer,
      description: "En servidor, no en proyecto",
      icon: Trash2,
      color: "amber",
      borderActive: "border-amber-500 bg-amber-500/10 text-amber-300",
      borderInactive: "border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400",
    },
    {
      id: "updates" as DiffFilterTab,
      label: "Versiones Distintas",
      count: summary.updatesRequired,
      description: "Hash o versión desactualizada",
      icon: RefreshCw,
      color: "sky",
      borderActive: "border-sky-500 bg-sky-500/10 text-sky-300",
      borderInactive: "border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400",
    },
    {
      id: "mismatches" as DiffFilterTab,
      label: "Client-Only / Incompatibles",
      count: summary.environmentMismatches,
      description: "No deben ir en runtime servidor",
      icon: Monitor,
      color: "purple",
      borderActive: "border-purple-500 bg-purple-500/10 text-purple-300",
      borderInactive: "border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400",
    },
    {
      id: "duplicates" as DiffFilterTab,
      label: "Duplicados / Conflictos",
      count: summary.duplicateIdentities,
      description: "Múltiples JARs del mismo mod",
      icon: Copy,
      color: "orange",
      borderActive: "border-orange-500 bg-orange-500/10 text-orange-300",
      borderInactive: "border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/60 text-zinc-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <motion.button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(card.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            className={`flex flex-col text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
              isActive ? card.borderActive : card.borderInactive
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80 truncate">
                {card.label}
              </span>
              <Icon className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="text-2xl font-bold tracking-tight text-white mb-1">
              {card.count}
            </div>

            <p className="text-[11px] leading-tight text-zinc-400 line-clamp-2">
              {card.description}
            </p>

            {isActive && (
              <motion.div
                layoutId="activeCardIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-current"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
