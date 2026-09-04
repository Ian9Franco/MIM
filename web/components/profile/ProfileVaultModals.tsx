"use client";

import React from "react";
import {
  Shield,
  Upload,
  Download,
  Lock,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  Loader2,
} from "lucide-react";
import type { MimVaultSchema, EncryptedVaultEnvelope } from "../../lib/vault/vaultEngine";
import type { VaultImportResult } from "../../lib/vault/vaultImporter";

interface ProfileVaultModalsProps {
  showExportModal: boolean;
  setShowExportModal: (v: boolean) => void;
  isExportingVault: boolean;
  encryptVaultCheckbox: boolean;
  setEncryptVaultCheckbox: (v: boolean) => void;
  vaultPassphrase: string;
  setVaultPassphrase: (v: string) => void;
  handleExportVault: () => Promise<void>;
  userDraftsCount: number;
  userFavoritesCount: number;
  userFollowedAuthorsCount: number;

  showImportModal: boolean;
  setShowImportModal: (v: boolean) => void;
  importFileName: string;
  isEncryptedVault: boolean;
  importPassphrase: string;
  setImportPassphrase: (v: string) => void;
  importPassError: string | null;
  handleDecryptVault: () => Promise<void>;
  importValidation: { valid: boolean; error?: string } | null;
  parsedVault: MimVaultSchema | null;
  isImporting: boolean;
  importResult: VaultImportResult | null;
  handleExecuteImport: () => Promise<void>;
}

export function ProfileVaultModals({
  showExportModal,
  setShowExportModal,
  isExportingVault,
  encryptVaultCheckbox,
  setEncryptVaultCheckbox,
  vaultPassphrase,
  setVaultPassphrase,
  handleExportVault,
  userDraftsCount,
  userFavoritesCount,
  userFollowedAuthorsCount,

  showImportModal,
  setShowImportModal,
  importFileName,
  isEncryptedVault,
  importPassphrase,
  setImportPassphrase,
  importPassError,
  handleDecryptVault,
  importValidation,
  parsedVault,
  isImporting,
  importResult,
  handleExecuteImport,
}: ProfileVaultModalsProps) {
  return (
    <>
      {/* ── Modal de Exportación ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12131a] border border-emerald-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Shield className="w-4 h-4" /> Exportar Bóveda Soberana
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              Se generará un archivo <code className="text-emerald-300 font-mono">.mimvault</code> con tus{" "}
              <strong>{userDraftsCount} borradores</strong>, <strong>{userFavoritesCount} favoritos</strong> y{" "}
              <strong>{userFollowedAuthorsCount} autores</strong>, firmado con suma de verificación SHA-256.
            </p>

            {/* Opción Cifrado Zero-Knowledge */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={encryptVaultCheckbox}
                  onChange={(e) => setEncryptVaultCheckbox(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span className="font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Cifrado Zero-Knowledge (AES-256-GCM)
                </span>
              </label>
              <p className="text-[11px] text-white/40 leading-relaxed pl-6">
                Protege el contenido con contraseña usando PBKDF2 (100.000 iteraciones). Nadie sin la clave podrá leer tus modpacks.
              </p>

              {encryptVaultCheckbox && (
                <div className="pt-2 pl-6">
                  <input
                    type="password"
                    placeholder="Contraseña de la bóveda..."
                    value={vaultPassphrase}
                    onChange={(e) => setVaultPassphrase(e.target.value)}
                    className="w-full bg-black/40 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExportVault}
                disabled={isExportingVault || (encryptVaultCheckbox && !vaultPassphrase.trim())}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {isExportingVault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Descargar Bóveda (.mimvault)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Importación / Restauración ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12131a] border border-indigo-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Upload className="w-4 h-4" /> Restaurar Bóveda Soberana
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-white/50 font-mono truncate">
              Archivo: <span className="text-white font-bold">{importFileName}</span>
            </div>

            {/* Caso 1: Archivo Cifrado */}
            {isEncryptedVault && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <Lock className="w-4 h-4" /> Bóveda Cifrada Detectada (AES-256-GCM)
                </div>
                <p className="text-[11px] text-white/60">
                  Esta bóveda está protegida. Introduce la contraseña definida durante su exportación para descifrarla:
                </p>
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Contraseña de la bóveda..."
                    value={importPassphrase}
                    onChange={(e) => setImportPassphrase(e.target.value)}
                    className="w-full bg-black/40 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-400"
                  />
                  {importPassError && (
                    <p className="text-[11px] text-rose-400 font-semibold">{importPassError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDecryptVault}
                  disabled={!importPassphrase.trim()}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Descifrar y Validar
                </button>
              </div>
            )}

            {/* Caso 2: Validación de Integridad */}
            {importValidation && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  importValidation.valid
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}
              >
                {importValidation.valid ? (
                  <>
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Integridad SHA-256 Verificada con éxito.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{importValidation.error || "Fallo en la validación del archivo."}</span>
                  </>
                )}
              </div>
            )}

            {/* Caso 3: Desglose de Contenido y Botón Restaurar */}
            {parsedVault && !isEncryptedVault && importValidation?.valid && !importResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="block text-base font-bold text-white font-mono">
                      {parsedVault.data.drafts?.length || 0}
                    </span>
                    <span className="text-[10px] text-white/40 uppercase">Borradores</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="block text-base font-bold text-white font-mono">
                      {parsedVault.data.favorites?.length || 0}
                    </span>
                    <span className="text-[10px] text-white/40 uppercase">Favoritos</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="block text-base font-bold text-white font-mono">
                      {parsedVault.data.followedAuthors?.length || 0}
                    </span>
                    <span className="text-[10px] text-white/40 uppercase">Autores</span>
                  </div>
                </div>

                <p className="text-[11px] text-white/50 leading-relaxed text-center">
                  Los datos se sincronizarán con tu cuenta actual de forma idempotente sin duplicar contenido existente.
                </p>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Restaurando en tu cuenta...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" /> Restaurar en mi Cuenta
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Resultado Exitoso */}
            {importResult && (
              <div className="space-y-3 text-center pt-2">
                {importResult.success ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                      <Check className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white">¡Bóveda Restaurada con Éxito!</h4>
                    <p className="text-xs text-white/60">
                      Se restauraron {importResult.draftsImported} borradores, {importResult.itemsImported} items,{" "}
                      {importResult.favoritesImported} favoritos y {importResult.authorsImported} autores.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Actualizar Vista
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {importResult.error || "Ocurrió un error durante la importación."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
