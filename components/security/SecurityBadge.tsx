/**
 * Security Badge — Interactive Visual Security Indicator
 * ─────────────────────────────────────────────────────────────────────────────
 * Badge interactivo y estético para mostrar el nivel de seguridad de mods
 * con animaciones suaves y tooltips detallados.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Info, ExternalLink } from "lucide-react";

interface SecurityBadgeProps {
  riskScore: number;
  riskLevel: "clean" | "caution" | "suspicious" | "critical";
  virusTotal?: {
    maliciousCount: number;
    totalEngineCount: number;
    detailsUrl?: string;
  } | null;
  compact?: boolean;
  showTooltip?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SecurityBadge({
  riskScore,
  riskLevel,
  virusTotal,
  compact = false,
  showTooltip = true,
  onClick,
  className = ""
}: SecurityBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getSecurityConfig = (level: string) => {
    const configs = {
      clean: {
        icon: ShieldCheck,
        color: "#10b981",
        bgColor: "rgba(16, 185, 129, 0.1)",
        borderColor: "rgba(16, 185, 129, 0.2)",
        label: "Seguro",
        description: "Sin amenazas detectadas"
      },
      caution: {
        icon: ShieldAlert,
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.1)",
        borderColor: "rgba(245, 158, 11, 0.2)",
        label: "Precaución",
        description: "Revisar recomendado"
      },
      suspicious: {
        icon: ShieldX,
        color: "#f97316",
        bgColor: "rgba(249, 115, 22, 0.1)",
        borderColor: "rgba(249, 115, 22, 0.2)",
        label: "Sospechoso",
        description: "Alto riesgo detectado"
      },
      critical: {
        icon: ShieldX,
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        borderColor: "rgba(239, 68, 68, 0.2)",
        label: "Crítico",
        description: "Malware probable"
      }
    };
    return configs[level as keyof typeof configs] || configs.clean;
  };

  const config = getSecurityConfig(riskLevel);
  const Icon = config.icon;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowDetails(!showDetails);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Badge Principal */}
      <button
        onClick={handleClick}
        className={`
          inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold
          transition-all duration-300 hover:scale-105 active:scale-95
          border cursor-pointer relative overflow-hidden group
          ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}
        `}
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          color: config.color,
          borderWidth: "1px"
        }}
        title={showTooltip ? `${config.label}: ${config.description}` : undefined}
      >
        {/* Efecto de brillo al hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
          style={{ background: `linear-gradient(45deg, transparent, ${config.color}, transparent)` }}
        />
        
        <Icon className="w-3 h-3 flex-shrink-0" />
        
        {!compact && (
          <>
            <span className="relative z-10">{config.label}</span>
            <span className="w-1 h-1 rounded-full opacity-60" style={{ backgroundColor: config.color }} />
            <span className="relative z-10 font-mono text-xs">{riskScore}</span>
          </>
        )}

        {/* Indicador de VirusTotal */}
        {virusTotal && !compact && (
          <div 
            className="w-1.5 h-1.5 rounded-full ml-0.5"
            style={{
              backgroundColor: virusTotal.maliciousCount > 0 ? "#ef4444" : "#10b981"
            }}
          />
        )}
      </button>

      {/* Tooltip Detallado */}
      {showDetails && (
        <div className="absolute z-50 mt-2 p-3 rounded-xl shadow-2xl border min-w-64 animate-fade-in"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            right: 0,
            top: "100%"
          }}>
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: config.bgColor }}
            >
              <Icon className="w-5 h-5" style={{ color: config.color }} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-bold text-sm" style={{ color: "var(--color-foreground)" }}>
                  Análisis de Seguridad
                </h4>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  style={{ color: "var(--color-muted)" }}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--color-muted)" }}>Nivel de Riesgo</span>
                  <span className="text-xs font-bold" style={{ color: config.color }}>
                    {config.label}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--color-muted)" }}>Puntuación</span>
                  <span className="text-xs font-mono font-bold" style={{ color: config.color }}>
                    {riskScore}/100
                  </span>
                </div>

                {virusTotal && (
                  <div className="pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                        VirusTotal
                      </span>
                      {virusTotal.detailsUrl && (
                        <a
                          href={virusTotal.detailsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ color: config.color }}
                        >
                          Ver informe
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                        Detecciones
                      </span>
                      <span className={`text-xs font-bold ${
                        virusTotal.maliciousCount > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {virusTotal.maliciousCount}/{virusTotal.totalEngineCount}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    {config.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Flecha del tooltip */}
          <div className="absolute -top-2 right-4 w-4 h-4 rotate-45 border-l border-t"
            style={{
              backgroundColor: "var(--color-card)",
              borderColor: "var(--color-border)"
            }}
          />
        </div>
      )}
    </div>
  );
}

// Versión compacta para ModCards
export function SecurityBadgeCompact({
  riskScore,
  riskLevel,
  onClick
}: Pick<SecurityBadgeProps, 'riskScore' | 'riskLevel' | 'onClick'>) {
  return (
    <SecurityBadge
      riskScore={riskScore}
      riskLevel={riskLevel}
      compact={true}
      onClick={onClick}
      className="ml-2"
    />
  );
}
