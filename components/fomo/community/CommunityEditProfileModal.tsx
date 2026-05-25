"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { UserCog, Trash2, KeyRound, ZoomIn, Info, Eye, EyeOff, RefreshCw } from "lucide-react";
import { ImageCropper } from "@/components/fomo/core/ImageCropper";
import { supabase } from "@/lib/core/supabaseClient";

type BannerMeta = {
  zoom: number;
  x: number;
  y: number;
  blur: number;
};

interface CommunityEditProfileModalProps {
  showEditProfileModal: boolean;
  setShowEditProfileModal: (show: boolean) => void;
  editUsername: string;
  setEditUsername: (val: string) => void;
  editColor: string;
  setEditColor: (val: string) => void;
  editAvatarUrl: string | null;
  setEditAvatarUrl: (val: string | null) => void;
  editBannerUrl: string | null;
  setEditBannerUrl: (val: string | null) => void;
  editBannerMeta: BannerMeta | null;
  savingProfile: boolean;
  handleSaveProfile: (
    e: React.FormEvent,
    finalAvatar?: string | null,
    finalBanner?: string | null,
    finalBannerMeta?: BannerMeta | null
  ) => Promise<void>;
  onStatus: (msg: string, type: "success" | "error" | "warning" | "info") => void;
}

export function CommunityEditProfileModal({
  showEditProfileModal,
  setShowEditProfileModal,
  editUsername,
  setEditUsername,
  editColor,
  setEditColor,
  editAvatarUrl,
  setEditAvatarUrl,
  editBannerUrl,
  setEditBannerUrl,
  savingProfile,
  editBannerMeta,
  handleSaveProfile,
  onStatus
}: CommunityEditProfileModalProps) {
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.className = "fomo-edit-profile-modal-portal";
    setPortalElement(el);
    document.body.appendChild(el);

    return () => {
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    };
  }, []);

  const [rawImage, setRawImage] = useState<string | null>(null);
  const [rawBanner, setRawBanner] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("official");

  useEffect(() => {
    const update = () => setCurrentTheme(document.documentElement.getAttribute("data-theme") || "official");
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (showEditProfileModal) {
      setRawImage(null);
      setRawBanner(null);
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordError(null);
    }
  }, [showEditProfileModal]);

  const portalTarget = portalElement instanceof HTMLElement ? portalElement : null;
  if (!showEditProfileModal || !portalTarget) return null;

  const isModern = currentTheme === "modern";
  const precuratedColors = ["#F05A28", "#10B981", "#8B5CF6", "#F43F5E", "#F59E0B", "#3B82F6"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setPasswordError("Las contraseñas no coinciden.");
        return;
      }
      if (newPassword.length > 0 && newPassword.length < 8) {
        setPasswordError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
    }

    setLocalSaving(true);
    try {
      if (newPassword && newPassword.trim().length > 0) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          console.error("Password update error:", error);
          setPasswordError("No se pudo cambiar la contraseña. Intentá de nuevo.");
          return;
        }
      }

      await handleSaveProfile(e, editAvatarUrl, editBannerUrl, null);
      if (newPassword) {
        setNewPassword("");
        setConfirmPassword("");
        onStatus("Contraseña cambiada correctamente.", "success");
      }
    } catch (err) {
      console.error(err);
      onStatus("Error al guardar el perfil.", "error");
    } finally {
      setLocalSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <form 
        onSubmit={handleSubmit} 
        className={`border rounded-3xl p-6 w-full max-w-[95vw] lg:max-w-4xl max-h-[calc(100vh-5rem)] overflow-y-auto space-y-4 shadow-2xl relative z-[99999] ${isModern ? 'bg-card text-foreground border-border shadow-[0_20px_60px_rgba(13,39,80,0.16)]' : 'bg-[#121214] border-white/15'}`}
      >
        <h3 className={`text-sm font-bold flex items-center gap-2 ${isModern ? 'text-foreground' : 'text-white'}`}>
          <UserCog className="w-4 h-4 text-primary" /> Editar Perfil
        </h3>
        
        <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-16 h-16 rounded-full border-2 overflow-hidden flex items-center justify-center text-background font-bold text-lg uppercase shadow-inner relative group bg-black/20" 
                style={{ 
                  borderColor: editColor || 'var(--primary)' 
                }}
              >
                {editAvatarUrl ? (
                  <img src={editAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: editColor || 'var(--primary)' }}
                  >
                    {(editUsername || "U").charAt(0)}
                  </div>
                )}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer transition-opacity text-center px-2">
                  Subir<br/>JPG / PNG
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setRawImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <span className={`text-[9px] ${isModern ? 'text-muted-foreground' : 'text-white/40'}`}>Haz click para subir un ícono JPG/PNG</span>

              {(editAvatarUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditAvatarUrl(null);
                  }}
                  className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-all cursor-pointer bg-transparent border-none"
                >
                  <Trash2 className="w-3 h-3" />
                  Eliminar
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 h-24">
                {editBannerUrl ? (
                  <img
                    src={editBannerUrl}
                    alt="Banner preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Sin Banner</span>
                  </div>
                )}
                
                <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer transition-opacity text-center px-2">
                  Subir Banner<br/>(JPG / PNG)
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setRawBanner(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              {(editBannerUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditBannerUrl(null);
                  }}
                  className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-all cursor-pointer bg-transparent border-none"
                >
                  <Trash2 className="w-3 h-3" /> Eliminar Banner
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1">
              <label className={`text-[10px] font-bold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>Nombre de Usuario</label>
              <input 
                type="text" 
                required
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Nombre de usuario"
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors ${isModern ? 'bg-background border-border text-foreground placeholder:text-muted-foreground' : 'bg-black/20 border-white/10 text-white'}`}
              />
            </div>

            {/* Color Picker / Curated Colors Grid */}
            <div className="space-y-2">
              <label className={`text-[10px] font-bold block ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>Color de Acento del Perfil</label>
              <div className="grid grid-cols-6 gap-2">
                {precuratedColors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={`h-6 rounded-lg border-2 transition-all cursor-pointer ${editColor === c ? 'border-foreground scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="color" 
                  value={editColor.startsWith("#") && editColor.length === 7 ? editColor : "#F05A28"}
                  onChange={(e) => setEditColor(e.target.value)}
                  className={`w-8 h-8 rounded border cursor-pointer ${isModern ? 'border-border bg-background' : 'border-white/10 bg-transparent'}`}
                />
                <input 
                  type="text" 
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="#F05A28"
                  className={`flex-1 border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary transition-colors ${isModern ? 'bg-background border-border text-foreground' : 'bg-black/20 border-white/10 text-white'}`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Change Password */}
            <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={`text-[10px] font-bold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>Cambiar contraseña</p>
                  <p className="text-[9px] text-muted">Dejar en blanco si no querés cambiarla.</p>
                </div>
                <span className="text-[9px] uppercase tracking-[0.2em] text-primary">Opcional</span>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <label className={`text-[10px] font-semibold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>Nueva contraseña</label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors ${isModern ? 'bg-background border-border text-foreground placeholder:text-muted-foreground' : 'bg-black/20 border-white/10 text-white'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-8 text-muted hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <label className={`text-[10px] font-semibold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>Confirmar nueva contraseña</label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-colors ${isModern ? 'bg-background border-border text-foreground placeholder:text-muted-foreground' : 'bg-black/20 border-white/10 text-white'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-8 text-muted hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordError && (
                  <p className="text-[10px] text-red-400">{passwordError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            type="button" 
            onClick={() => setShowEditProfileModal(false)}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${isModern ? 'bg-muted/50 border-border text-foreground hover:bg-muted' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={savingProfile || localSaving}
            className="flex-1 px-3 py-2 rounded-xl bg-primary hover:opacity-90 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {(savingProfile || localSaving) ? <RefreshCw className="w-3 animate-spin" /> : "Guardar"}
          </button>
        </div>
      </form>
      
      {rawImage && (
        <ImageCropper
          imageUrl={rawImage}
          aspectRatio={1}
          shape="circle"
          isModern={isModern}
          onCancel={() => setRawImage(null)}
          onSave={(croppedUrl) => {
            setEditAvatarUrl(croppedUrl);
            setRawImage(null);
          }}
        />
      )}

      {rawBanner && (
        <ImageCropper
          imageUrl={rawBanner}
          aspectRatio={16/9}
          shape="rect"
          isModern={isModern}
          onCancel={() => setRawBanner(null)}
          onSave={(croppedUrl) => {
            setEditBannerUrl(croppedUrl);
            setRawBanner(null);
          }}
        />
      )}
    </div>
  , portalTarget);
}
