"use client";

import React, { useState } from "react";
import { Info, AlertTriangle, CheckCircle, Download, Trash2 } from "lucide-react";
import { SecurityHeader, getSecurityConfig } from "./parts/SecurityHeader";
import { SecurityOverview } from "./parts/SecurityOverview";

export function SecurityDetailsModal({ isOpen, onClose, modData, onQuarantine, onWhitelist, onRescan }: any) {
  const [activeTab, setActiveTab] = useState<"overview" | "findings" | "recommendations">("overview");
  if (!isOpen) return null;

  const config = getSecurityConfig(modData.riskLevel);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--color-card)] rounded-2xl shadow-2xl border border-[var(--color-border)] animate-slide-up overflow-hidden flex flex-col">
        <SecurityHeader modData={modData} onClose={onClose} />

        <div className="flex border-b border-[var(--color-border)]">
          {[
            { id: "overview", label: "Resumen", icon: Info },
            { id: "findings", label: "Detecciones", icon: AlertTriangle },
            { id: "recommendations", label: "Recomendaciones", icon: CheckCircle }
          ].map((tab) => (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${activeTab === tab.id ? "text-white" : "text-[var(--color-muted)] opacity-60"}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: config.gradient }} />}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "overview" && <SecurityOverview modData={modData} config={config} />}
          
          {activeTab === "findings" && (
            <div className="space-y-3">
              {modData.findings?.length ? modData.findings.map((f: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] border-l-4" style={{ borderLeftColor: f.severity === 'critical' ? '#ef4444' : '#f59e0b' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5">{f.type}</span>
                    <span className="text-[10px] opacity-50">{f.severity.toUpperCase()}</span>
                  </div>
                  <p className="text-sm opacity-90">{f.description}</p>
                </div>
              )) : (
                <div className="text-center py-12 opacity-50"><CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" /><p>No se detectaron amenazas</p></div>
              )}
            </div>
          )}

          {activeTab === "recommendations" && (
            <div className="space-y-3">
              {modData.recommendations?.length ? modData.recommendations.map((rec: string, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] flex gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><p className="text-sm">{rec}</p>
                </div>
              )) : <div className="text-center py-12 opacity-30"><Info className="w-12 h-12 mx-auto mb-3" /><p>Sin recomendaciones específicas</p></div>}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[var(--color-border)] flex justify-between gap-3">
          {onRescan && <button onClick={onRescan} className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2"><Download className="w-4 h-4" /> Re-analizar</button>}
          <div className="flex gap-2">
            {onWhitelist && <button onClick={onWhitelist} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Whitelist</button>}
            {onQuarantine && <button onClick={onQuarantine} className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Quarantena</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
