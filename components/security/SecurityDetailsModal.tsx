/**
 * Security Details Modal — Interactive Security Analysis Viewer
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal estético e interactivo para mostrar análisis de seguridad detallados
 * con animaciones suaves y acciones directas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { X, Shield, ShieldCheck, ShieldAlert, ShieldX, ExternalLink, Download, Trash2, CheckCircle, AlertTriangle, Info, FileText, Clock, Users } from "lucide-react";

interface SecurityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  modData: {
    name: string;
    fileName: string;
    version: string;
    riskScore: number;
    riskLevel: "clean" | "caution" | "suspicious" | "critical";
    virusTotal?: {
      maliciousCount: number;
      totalEngineCount: number;
      detailsUrl?: string;
      scanDate?: string;
    } | null;
    findings?: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
      location?: string;
    }>;
    scannedAt: string;
    sha256?: string;
    recommendations?: string[];
  };
  onQuarantine?: () => void;
  onWhitelist?: () => void;
  onRescan?: () => void;
}

export function SecurityDetailsModal({
  isOpen,
  onClose,
  modData,
  onQuarantine,
  onWhitelist,
  onRescan
}: SecurityDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "findings" | "recommendations">("overview");

  if (!isOpen) return null;

  const getSecurityConfig = (level: string) => {
    const configs = {
      clean: {
        icon: ShieldCheck,
        color: "#10b981",
        bgColor: "rgba(16, 185, 129, 0.1)",
        borderColor: "rgba(16, 185, 129, 0.2)",
        label: "Seguro",
        gradient: "linear-gradient(135deg, #10b981, #059669)"
      },
      caution: {
        icon: ShieldAlert,
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.1)",
        borderColor: "rgba(245, 158, 11, 0.2)",
        label: "Precaución",
        gradient: "linear-gradient(135deg, #f59e0b, #d97706)"
      },
      suspicious: {
        icon: ShieldX,
        color: "#f97316",
        bgColor: "rgba(249, 115, 22, 0.1)",
        borderColor: "rgba(249, 115, 22, 0.2)",
        label: "Sospechoso",
        gradient: "linear-gradient(135deg, #f97316, #ea580c)"
      },
      critical: {
        icon: ShieldX,
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        borderColor: "rgba(239, 68, 68, 0.2)",
        label: "Crítico",
        gradient: "linear-gradient(135deg, #ef4444, #dc2626)"
      }
    };
    return configs[level as keyof typeof configs] || configs.clean;
  };

  const config = getSecurityConfig(modData.riskLevel);
  const Icon = config.icon;

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: "#10b981",
      medium: "#f59e0b", 
      high: "#f97316",
      critical: "#ef4444"
    };
    return colors[severity as keyof typeof colors] || "#6b7280";
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-2xl shadow-2xl border animate-slide-up overflow-hidden"
        style={{ 
          background: "var(--color-card)",
          borderColor: "var(--color-border)"
        }}
      >
        {/* Header */}
        <div className="relative p-6 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: config.gradient }}
              >
                <Icon className="w-8 h-8 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--color-foreground)" }}>
                  Análisis de Seguridad
                </h2>
                <p className="text-sm font-medium" style={{ color: config.color }}>
                  {modData.name}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                  {modData.fileName} • {modData.version}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:bg-white/5"
              style={{ color: "var(--color-muted)" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Risk Score Display */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold" style={{ color: config.color }}>
                {modData.riskScore}
              </div>
              <div className="text-sm" style={{ color: "var(--color-muted)" }}>
                <div>/100</div>
                <div className="font-medium" style={{ color: config.color }}>
                  {config.label}
                </div>
              </div>
            </div>
            
            {modData.virusTotal && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                style={{ 
                  backgroundColor: config.bgColor,
                  borderColor: config.borderColor
                }}
              >
                <span className="text-xs font-medium" style={{ color: config.color }}>
                  VirusTotal
                </span>
                <span className={`text-xs font-bold ${
                  modData.virusTotal.maliciousCount > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {modData.virusTotal.maliciousCount}/{modData.virusTotal.totalEngineCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--color-border)" }}>
          {[
            { id: "overview", label: "Resumen", icon: Info },
            { id: "findings", label: "Detecciones", icon: AlertTriangle },
            { id: "recommendations", label: "Recomendaciones", icon: CheckCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? "" : "opacity-60 hover:opacity-80"
              }`}
              style={{ 
                color: activeTab === tab.id ? "var(--color-foreground)" : "var(--color-muted)"
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: config.gradient }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Scan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" style={{ color: "var(--color-muted)" }} />
                    <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                      Último análisis
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: "var(--color-foreground)" }}>
                    {new Date(modData.scannedAt).toLocaleString()}
                  </div>
                </div>
                
                {modData.sha256 && (
                  <div className="p-4 rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" style={{ color: "var(--color-muted)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                        SHA-256
                      </span>
                    </div>
                    <div className="text-xs font-mono break-all" style={{ color: "var(--color-foreground)" }}>
                      {modData.sha256}
                    </div>
                  </div>
                )}
              </div>

              {/* VirusTotal Details */}
              {modData.virusTotal && (
                <div className="p-4 rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" style={{ color: config.color }} />
                      <span className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                        Análisis VirusTotal
                      </span>
                    </div>
                    {modData.virusTotal.detailsUrl && (
                      <a
                        href={modData.virusTotal.detailsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                        style={{ color: config.color }}
                      >
                        Ver informe completo
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                      Motores que detectaron amenazas
                    </span>
                    <span className={`text-sm font-bold ${
                      modData.virusTotal.maliciousCount > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {modData.virusTotal.maliciousCount} de {modData.virusTotal.totalEngineCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "findings" && (
            <div className="space-y-3">
              {modData.findings?.length ? (
                modData.findings.map((finding, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-xl border animate-fade-in"
                    style={{ 
                      borderColor: "var(--color-border)",
                      borderLeft: `3px solid ${getSeverityColor(finding.severity)}`
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium px-2 py-1 rounded-full"
                            style={{ 
                              backgroundColor: `${getSeverityColor(finding.severity)}20`,
                              color: getSeverityColor(finding.severity)
                            }}
                          >
                            {finding.type}
                          </span>
                          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                            {finding.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--color-foreground)" }}>
                          {finding.description}
                        </p>
                        {finding.location && (
                          <p className="text-xs mt-2 font-mono" style={{ color: "var(--color-muted)" }}>
                            📍 {finding.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                    No se detectaron amenazas
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                    Este mod parece ser seguro
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "recommendations" && (
            <div className="space-y-3">
              {modData.recommendations?.length ? (
                modData.recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-xl border animate-fade-in flex gap-3"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-foreground)" }}>
                      {rec}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Info className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                    No hay recomendaciones específicas
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t flex items-center justify-between gap-3" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2">
            {onRescan && (
              <button
                onClick={onRescan}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ 
                  backgroundColor: "var(--color-accent-bg)",
                  color: "var(--color-accent)",
                  border: "1px solid var(--color-accent-border)"
                }}
              >
                <Download className="w-4 h-4" />
                Re-analizar
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {modData.riskLevel !== "clean" && onWhitelist && (
              <button
                onClick={onWhitelist}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ 
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.2)"
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Whitelist
              </button>
            )}
            
            {(modData.riskLevel === "suspicious" || modData.riskLevel === "critical") && onQuarantine && (
              <button
                onClick={onQuarantine}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ 
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.2)"
                }}
              >
                <Trash2 className="w-4 h-4" />
                Cuarentena
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
