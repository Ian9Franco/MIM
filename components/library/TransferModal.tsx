import React, { useState, useEffect } from "react";
import { X, ArrowLeftRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { Project } from "@/lib/core/types";

interface TransferModalProps {
  onClose: () => void;
  activeProject: Project;
  projects: Project[];
}

export function TransferModal({ onClose, activeProject, projects }: TransferModalProps) {
  const [sourceProjectName, setSourceProjectName] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filter projects sharing the same version AND loader but with a different name/id
  const candidates = projects.filter(
    (p) => p.id !== activeProject.id && 
           p.version === activeProject.version && 
           p.loader === activeProject.loader
  );

  // Auto-select "Librería Global" if available
  useEffect(() => {
    setSourceProjectName("__global__");
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceProjectName) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/project/transfer-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceProject: sourceProjectName,
          targetProject: activeProject.name,
          version: activeProject.version,
          loader: activeProject.loader,
          category: category,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: "success", message: `¡Transferencia completada! ${data.transferred} archivos movidos.` });
        window.dispatchEvent(new CustomEvent("refresh-system"));
        setTimeout(onClose, 2000);
      } else {
        setStatus({ type: "error", message: data.error || "Error al transferir mods." });
      }
    } catch {
      setStatus({ type: "error", message: "Error de red al intentar transferir." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="absolute inset-0 z-50 flex items-start justify-center p-4 animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="rounded-[2rem] w-[92%] max-w-[340px] overflow-hidden flex flex-col shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] animate-scale-up border cursor-default mt-4"
        style={{ 
          background: "linear-gradient(165deg, #1A1A1A 0%, #0D0D0D 100%)", 
          borderColor: "rgba(255,255,255,0.12)",
          boxShadow: "0 0 60px -10px rgba(187,150,228,0.2), 0 32px 64px -12px rgba(0,0,0,0.8)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
              style={{ background: "rgba(187,150,228,0.1)", border: "1px solid rgba(187,150,228,0.2)", color: "#BB96E4" }}
            >
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-headline tracking-tight" style={{ color: "var(--color-foreground)" }}>
                Transferencia Local
              </h3>
              <p className="text-[0.6rem] opacity-40 mt-0.5 uppercase tracking-[0.2em] font-black">
                {activeProject.version} • {activeProject.loader.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-all hover:bg-white/5 hover:scale-110 active:scale-90"
            style={{ color: "var(--color-muted)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleTransfer} className="p-6 space-y-5">
          {/* Source Project */}
          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase tracking-[0.2em] block ml-1" style={{ color: "var(--color-muted)" }}>
              Origen
            </label>
            <div className="relative group">
              <select
                value={sourceProjectName}
                onChange={(e) => setSourceProjectName(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border font-body text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none cursor-pointer hover:border-white/20"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "var(--color-foreground)",
                }}
              >
                <option value="__global__" className="bg-[#0D0D0D]">Librería Global ({activeProject.loader.toUpperCase()})</option>
                {candidates.map((p) => (
                  <option key={p.id} value={p.name} className="bg-[#0D0D0D]">
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Category selector */}
          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase tracking-[0.2em] block ml-1" style={{ color: "var(--color-muted)" }}>
              Colección
            </label>
            <div className="relative group">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border font-body text-[0.8rem] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none cursor-pointer hover:border-white/20"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "var(--color-foreground)",
                }}
              >
                <option value="all" className="bg-[#0D0D0D]">Todas las categorías</option>
                <option value=".essential" className="bg-[#0D0D0D]">Contenido (.essential)</option>
                <option value=".local" className="bg-[#0D0D0D]">Cliente (.local)</option>
                <option value=".server" className="bg-[#0D0D0D]">Servidor (.server)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Notification Status */}
          {status && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 text-[0.65rem] font-bold border animate-fade-in ${
                status.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              }`}
            >
              {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{status.message}</span>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-label text-[0.65rem] font-bold transition-all hover:bg-white/5 border active:scale-95"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "var(--color-foreground)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !sourceProjectName}
              className="flex-[1.5] py-3 rounded-xl font-label text-[0.65rem] font-bold transition-all flex items-center justify-center gap-2 text-white hover:scale-[1.03] active:scale-[0.97] shadow-xl"
              style={{
                background: "linear-gradient(135deg, #FF9E7D 0%, #EA8E6D 100%)",
                boxShadow: "0 10px 25px -5px rgba(234,142,109,0.4)",
              }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Transferir</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
