/**
 * @fileoverview ConfirmModal – Modal de confirmación reutilizable con estilos de la app
 */

"use client";

import React from "react";
import { X, AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";
import { COLORS } from "@/theme/tokens";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
  children?: React.ReactNode;
}

const typeConfig = {
  danger: {
    icon: AlertTriangle,
    iconBg: "rgba(239,68,68,0.15)",
    iconColor: "#f87171",
    confirmBg: "rgba(239,68,68,0.2)",
    confirmBorder: "rgba(239,68,68,0.35)",
    confirmColor: "#f87171",
    confirmHover: "rgba(239,68,68,0.3)",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "rgba(255,208,102,0.15)",
    iconColor: "#FFD066",
    confirmBg: "rgba(255,208,102,0.2)",
    confirmBorder: "rgba(255,208,102,0.35)",
    confirmColor: "#FFD066",
    confirmHover: "rgba(255,208,102,0.3)",
  },
  info: {
    icon: Info,
    iconBg: "rgba(102,200,160,0.15)",
    iconColor: "#66C8A0",
    confirmBg: "rgba(102,200,160,0.2)",
    confirmBorder: "rgba(102,200,160,0.35)",
    confirmColor: "#66C8A0",
    confirmHover: "rgba(102,200,160,0.3)",
  },
  success: {
    icon: CheckCircle,
    iconBg: "rgba(102,200,160,0.15)",
    iconColor: "#66C8A0",
    confirmBg: "rgba(102,200,160,0.2)",
    confirmBorder: "rgba(102,200,160,0.35)",
    confirmColor: "#66C8A0",
    confirmHover: "rgba(102,200,160,0.3)",
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  type = "info",
  isLoading = false,
  children,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-up"
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.borderStrong}`,
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: config.iconBg }}
          >
            <Icon className="w-6 h-6" style={{ color: config.iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-lg" style={{ color: COLORS.foreground }}>
              {title}
            </h3>
            <p className="font-caption mt-1 text-sm" style={{ color: COLORS.muted }}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors shrink-0"
            style={{ color: COLORS.muted }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Children content (optional) */}
        {children && (
          <div className="px-5 pb-3">
            {children}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 p-5 pt-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl font-label text-sm font-bold transition-all disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.muted,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl font-label text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: config.confirmBg,
              border: `1px solid ${config.confirmBorder}`,
              color: config.confirmColor,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = config.confirmHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = config.confirmBg)}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
