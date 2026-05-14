import React from "react";
import { Clock, FileText, Users, ExternalLink } from "lucide-react";

/**
 * @fileoverview Resumen del Informe Antivirus (VirusTotal & Hash Check).
 * ─────────────────────────────────────────────────────────────────────────────
 * Presenta información forense sobre un archivo .jar escaneado, incluyendo
 * su huella criptográfica SHA-256, fecha del último análisis y las detecciones
 * reportadas por los motores externos de VirusTotal.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function SecurityOverview({ modData, config }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metadato: Fecha de Escaneo */}
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-white/2">
          <div className="flex items-center gap-2 mb-2 text-[var(--color-muted)]">
            <Clock className="w-4 h-4" /><span className="text-xs font-medium">Último análisis</span>
          </div>
          <div className="text-sm font-medium">{new Date(modData.scannedAt).toLocaleString()}</div>
        </div>

        {/* Metadato: Huella Criptográfica SHA-256 */}
        {modData.sha256 && (
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-white/2">
            <div className="flex items-center gap-2 mb-2 text-[var(--color-muted)]">
              <FileText className="w-4 h-4" /><span className="text-xs font-medium">SHA-256</span>
            </div>
            <div className="text-[10px] font-mono break-all opacity-80">{modData.sha256}</div>
          </div>
        )}
      </div>

      {/* Integración Externa: Resultados de Motores VirusTotal */}
      {modData.virusTotal && (
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-white/2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: config.color }} />
              <span className="text-sm font-medium">Análisis VirusTotal</span>
            </div>
            {modData.virusTotal.detailsUrl && (
              <a 
                href={modData.virusTotal.detailsUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity" 
                style={{ color: config.color }}
              >
                Ver informe <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted)]">Detecciones de motores externos</span>
            <span className={`text-sm font-bold ${modData.virusTotal.maliciousCount > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              {modData.virusTotal.maliciousCount} / {modData.virusTotal.totalEngineCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
