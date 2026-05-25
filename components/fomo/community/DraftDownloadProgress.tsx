"use client";

import React, { useEffect, useState } from "react";
import { DownloadCloud, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { downloadEvents } from "@/lib/downloads/downloadEvents";
import { DownloadSessionState } from "@/lib/downloads/downloadTypes";
import { downloadBroker } from "@/lib/downloads/DraftDownloadBroker";

export function DraftDownloadProgress({ isModern }: { isModern?: boolean }) {
  const [activeSession, setActiveSession] = useState<DownloadSessionState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Escuchar el progreso
    const onStarted = ({ session }: any) => {
      setActiveSession(session);
      setVisible(true);
    };
    
    const onProgress = ({ session }: any) => {
      // Solo actualiza si es la sesión actual
      setActiveSession(prev => prev?.sessionId === session.sessionId ? { ...session } : prev);
    };

    const onCompleted = ({ session }: any) => {
      setActiveSession(prev => prev?.sessionId === session.sessionId ? { ...session } : prev);
      
      // Auto-esconder después de 3 segundos
      setTimeout(() => {
        setVisible(false);
        setActiveSession(null);
      }, 3000);
      
      // NOTA: Se ha eliminado el disparo automático de /api/classify
      // para permitir que los archivos queden en "Descargas" y el usuario 
      // decida cuándo enviarlos al juego, especialmente en modo MIMu.
    };

    const onFailed = ({ session, error }: any) => {
      setActiveSession(prev => prev?.sessionId === session.sessionId ? { ...session, status: "failed" } : prev);
      setTimeout(() => setVisible(false), 5000);
    };

    const cleanupStarted = downloadEvents.on("session:started", onStarted);
    const cleanupProgress = downloadEvents.on("session:progress", onProgress);
    const cleanupCompleted = downloadEvents.on("session:completed", onCompleted);
    const cleanupFailed = downloadEvents.on("session:failed", onFailed);

    return () => {
      cleanupStarted();
      cleanupProgress();
      cleanupCompleted();
      cleanupFailed();
    };
  }, []);

  if (!visible || !activeSession) return null;

  const percentage = Math.round((activeSession.completedTasks / activeSession.totalTasks) * 100) || 0;
  const isDone = activeSession.status === "completed";
  const isFailed = activeSession.status === "failed";

  return (
    <div className={`fixed bottom-6 right-6 z-[999] p-4 rounded-2xl border shadow-2xl animate-slide-up w-80 transition-all ${
      isModern ? "bg-white border-black/10 text-slate-800" : "bg-neutral-900 border-white/10 text-white"
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isDone ? "bg-emerald-500/20 text-emerald-500" : 
          isFailed ? "bg-red-500/20 text-red-500" : 
          "bg-primary/20 text-primary"
        }`}>
          {isDone ? <CheckCircle2 className="w-5 h-5" /> : 
           isFailed ? <XCircle className="w-5 h-5" /> : 
           <DownloadCloud className="w-5 h-5 animate-pulse" />}
        </div>
        <div className="flex flex-col flex-1">
          <span className="font-bold text-sm">
            {isDone ? "¡Descarga Completa!" : 
             isFailed ? "Error en la descarga" : 
             "Instalando Snapshot..."}
          </span>
          <span className={`text-xs ${isModern ? "text-slate-500" : "text-white/50"}`}>
            {activeSession.completedTasks} de {activeSession.totalTasks} completados
          </span>
        </div>
        {!isDone && !isFailed && (
          <span className="font-black text-primary text-sm">{percentage}%</span>
        )}
      </div>

      <div className={`w-full h-2 rounded-full overflow-hidden ${isModern ? "bg-slate-100" : "bg-white/10"}`}>
        <div 
          className={`h-full transition-all duration-300 ${
            isDone ? "bg-emerald-500" : 
            isFailed ? "bg-red-500" : 
            "bg-primary"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
