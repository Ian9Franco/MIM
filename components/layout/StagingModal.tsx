"use client";

import React, { useState } from "react";
import { X, Check, Trash2, ExternalLink, Package, MoveRight, AlertCircle, Loader2, PackageOpen, ArrowBigRight, ArrowBigRightDash } from "lucide-react";
import { useStaging, StagingFile } from "@/hooks/useStaging";
import { OnboardingTour } from "@/components/ui/OnboardingTour";

interface StagingModalProps {
  onClose: () => void;
}

export function StagingModal({ onClose }: StagingModalProps) {
  const { files, isLoading, resolve, clear, hasFiles } = useStaging();
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  React.useEffect(() => {
    const seen = localStorage.getItem("onboarding_staging");
    const guidesEnabled = localStorage.getItem("guides_enabled") === "true";
    if (!seen || guidesEnabled) {
      setShowOnboarding(true);
    }
  }, []);

  const onboardingSteps = [
    {
      target: '#onboarding-staging-info',
      title: '¿Qué es Staging?',
      content: 'Acá van a parar los archivos cuando la carpeta de Minecraft no está disponible. Es como una sala de espera.'
    },
    {
      target: '#onboarding-staging-files',
      title: 'Archivos en Espera',
      content: 'Acá ves la lista de archivos. Podés moverlos uno por uno o borrarlos si ya no los querés.'
    },
    {
      target: '#onboarding-staging-actions',
      title: 'Mover Todo',
      content: 'Con este botón podés mandar todos los archivos de golpe a su carpeta correspondiente en el juego.'
    }
  ];

  const handleResolveAll = async () => {
    setError(null);
    setProcessing("all");
    const result = await resolve();
    setProcessing(null);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  const handleResolveSingle = async (f: StagingFile) => {
    setError(null);
    setProcessing(f.path);
    const result = await resolve(f.path);
    setProcessing(null);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  const handleClearSingle = async (f: StagingFile) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar ${f.name} de Staging?`)) return;
    setProcessing(f.path);
    await clear(f.path);
    setProcessing(null);
  };

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl glass rounded-3xl overflow-hidden shadow-2xl animate-bounce-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PackageOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-headline tracking-tight">Staging</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Archivos pendientes de ubicación</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {!hasFiles && !isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              <p className="text-sm">No hay archivos en Staging.<br/>Todo está en su lugar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div id="onboarding-staging-info" className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-6 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm leading-relaxed">
                  Estos archivos se guardaron aquí porque la carpeta de Minecraft no estaba disponible. 
                  Una vez configurada la ruta en ajustes, puedes moverlos a su ubicación definitiva.
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-200/80 leading-relaxed">
                    {error}
                  </div>
                </div>
              )}

              <div id="onboarding-staging-files" className="space-y-3">
                {files.map((f) => (
                  <div key={f.path} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/8 transition-all">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      f.type === 'shader' ? 'bg-indigo-500/20 text-indigo-400' : 
                      f.type === 'resourcepack' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-white/10 text-white/40'
                    }`}>
                      <Package className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-wider mt-0.5">
                        {f.type === 'shader' ? 'Shaderpack' : f.type === 'resourcepack' ? 'Resource Pack' : 'Desconocido'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveSingle(f)}
                        disabled={!!processing}
                        className="h-8 px-3 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-xs flex items-center gap-2"
                      >
                        {processing === f.path ? <Loader2 className="w-3 h-3 animate-spin" /> : <MoveRight className="w-3 h-3" />}
                        Mover
                      </button>
                      <button
                        onClick={() => handleClearSingle(f)}
                        disabled={!!processing}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {hasFiles && (
          <div id="onboarding-staging-actions" className="p-6 border-t border-white/10 bg-white/5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {files.length} archivo{files.length !== 1 ? 's' : ''} pendiente{files.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm rounded-xl hover:bg-white/5 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handleResolveAll();
                  setKeepOpen(true);
                  setTimeout(() => setKeepOpen(false), 5000);
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={!!processing}
                className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)] transition-all flex items-center gap-2"
              >
                {processing === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : (isHovered || keepOpen ? <PackageOpen className="w-4 h-4" /> : <Package className="w-4 h-4" />)}
                Mover Todo al Juego
              </button>
            </div>
          </div>
        )}
      </div>

      {showOnboarding && (
        <OnboardingTour 
          steps={onboardingSteps} 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem("onboarding_staging", "true");
          }} 
        />
      )}
    </div>
  );
}
