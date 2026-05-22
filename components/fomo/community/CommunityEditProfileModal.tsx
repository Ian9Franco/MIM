"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { UserCog, RefreshCw, ZoomIn, Move, Trash2, Eye, EyeOff } from "lucide-react";
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

const cropAndResizeImage = (
  base64Src: string,
  zoom: number,
  posX: number,
  posY: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo obtener el contexto del canvas"));
        return;
      }
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = Math.max(128 / imgWidth, 128 / imgHeight);
      
      const drawWidth = imgWidth * ratio * zoom;
      const drawHeight = imgHeight * ratio * zoom;
      
      // Since preview circle is 64x64 and canvas is 128x128, multiply offsets by 2
      const finalPosX = posX * 2;
      const finalPosY = posY * 2;
      
      const drawX = (128 - drawWidth) / 2 + finalPosX;
      const drawY = (128 - drawHeight) / 2 + finalPosY;
      
      ctx.clearRect(0, 0, 128, 128);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (err) => reject(err);
    img.src = base64Src;
  });
};

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
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [bannerZoom, setBannerZoom] = useState(1);
  const [bannerPosX, setBannerPosX] = useState(0);
  const [bannerPosY, setBannerPosY] = useState(0);
  const [bannerBlur, setBannerBlur] = useState(0);
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
      setZoom(1);
      setPosX(0);
      setPosY(0);
      setBannerZoom((editBannerMeta?.zoom ?? 1));
      setBannerPosX((editBannerMeta?.x ?? 0));
      setBannerPosY((editBannerMeta?.y ?? 0));
      setBannerBlur((editBannerMeta?.blur ?? 0));
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordError(null);
    }
  }, [showEditProfileModal, editBannerMeta]);

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
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          console.error("Password update error:", error);
          setPasswordError("No se pudo cambiar la contraseña. Intentá de nuevo.");
          return;
        }
      }

      let finalAvatar = editAvatarUrl;
      let finalBanner = editBannerUrl;
      if (rawImage) {
        finalAvatar = await cropAndResizeImage(rawImage, zoom, posX, posY);
        setEditAvatarUrl(finalAvatar);
      }
      if (rawBanner) {
        finalBanner = rawBanner;
        setEditBannerUrl(finalBanner);
      }
      const finalBannerMeta: BannerMeta | null = finalBanner
        ? { zoom: bannerZoom, x: bannerPosX, y: bannerPosY, blur: bannerBlur }
        : null;
      await handleSaveProfile(e, finalAvatar, finalBanner, finalBannerMeta);
      if (newPassword) {
        setNewPassword("");
        setConfirmPassword("");
        onStatus("Contraseña cambiada correctamente.", "success");
      }
    } catch (err) {
      console.error(err);
      onStatus("Error al procesar la imagen de perfil.", "error");
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
                {rawImage ? (
                  <img 
                    src={rawImage} 
                    alt="" 
                    className="w-full h-full object-cover pointer-events-none select-none" 
                    style={{
                      transform: `translate(${posX}px, ${posY}px) scale(${zoom})`,
                      transformOrigin: "center center"
                    }}
                  />
                ) : editAvatarUrl ? (
                  <img src={editAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: editColor || 'var(--primary)' }}
                  >
                    {(editUsername || "U").charAt(0)}
                  </div>
                )}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer transition-opacity">
                  Subir PNG
                  <input 
                    type="file" 
                    accept="image/png" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== "image/png") {
                          onStatus("Solo se permiten imágenes PNG.", "error");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setRawImage(reader.result as string);
                          setZoom(1);
                          setPosX(0);
                          setPosY(0);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <span className={`text-[9px] ${isModern ? 'text-muted-foreground' : 'text-white/40'}`}>Haz click para subir un ícono PNG</span>

              {(editAvatarUrl || rawImage) && (
                <button
                  type="button"
                  onClick={() => {
                    setRawImage(null);
                    setEditAvatarUrl(null);
                  }}
                  className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-all cursor-pointer bg-transparent border-none"
                >
                  <Trash2 className="w-3 h-3" /> Eliminar avatar
                </button>
              )}
            </div>

            {rawImage && (
              <div className={`p-3 border rounded-xl space-y-2 animate-fade-in text-[10px] ${isModern ? 'bg-muted/40 border-border' : 'bg-white/5 border-white/10'}`}>
                <div className={`flex items-center justify-between font-bold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>
                  <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5 text-primary" /> Zoom ({zoom.toFixed(1)}x)</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05"
                  value={zoom} 
                  onChange={e => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                
                <div className={`flex items-center justify-between font-bold pt-1 ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-primary" /> Posición X ({posX}px)</span>
                </div>
                <input 
                  type="range" 
                  min="-35" 
                  max="35" 
                  step="1"
                  value={posX} 
                  onChange={e => setPosX(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />

                <div className={`flex items-center justify-between font-bold pt-1 ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-primary" /> Posición Y ({posY}px)</span>
                </div>
                <input 
                  type="range" 
                  min="-35" 
                  max="35" 
                  step="1"
                  value={posY} 
                  onChange={e => setPosY(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 h-24">
                {rawBanner ? (
                  <img
                    src={rawBanner}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${bannerPosX}px, ${bannerPosY}px) scale(${bannerZoom})`,
                      filter: `blur(${bannerBlur}px)`,
                      transformOrigin: "center center",
                    }}
                  />
                ) : editBannerUrl ? (
                  <img
                    src={editBannerUrl}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${bannerPosX}px, ${bannerPosY}px) scale(${bannerZoom})`,
                      filter: `blur(${bannerBlur}px)`,
                      transformOrigin: "center center",
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/50">
                    Banner del perfil
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer transition-opacity">
                  Subir banner PNG
                  <input
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== "image/png") {
                          onStatus("Solo se permiten imágenes PNG.", "error");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => setRawBanner(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              {(editBannerUrl || rawBanner) && (
                <button
                  type="button"
                  onClick={() => {
                    setRawBanner(null);
                    setEditBannerUrl(null);
                  }}
                  className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-all cursor-pointer bg-transparent border-none"
                >
                  <Trash2 className="w-3 h-3" /> Eliminar banner
                </button>
              )}
            </div>

            {(editBannerUrl || rawBanner) && (
              <div className={`p-3 border rounded-xl space-y-3 text-[10px] ${isModern ? 'bg-muted/40 border-border' : 'bg-white/5 border-white/10'}`}>
                <div className={`flex items-center justify-between font-bold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>
                  <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5 text-primary" /> Zoom ({bannerZoom.toFixed(2)}x)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={bannerZoom}
                  onChange={(e) => setBannerZoom(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />

                <div className={`flex items-center justify-between font-bold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-primary" /> Posición X ({bannerPosX}px)</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="2"
                  value={bannerPosX}
                  onChange={(e) => setBannerPosX(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />

                <div className={`flex items-center justify-between font-bold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>
                  <span className="flex items-center gap-1"><Move className="w-3.5 h-3.5 text-primary" /> Posición Y ({bannerPosY}px)</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="2"
                  value={bannerPosY}
                  onChange={(e) => setBannerPosY(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />

                <div className={`flex items-center justify-between font-bold ${isModern ? 'text-muted-foreground' : 'text-white/60'}`}>
                  <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5 text-primary" /> Desenfoque ({bannerBlur}px)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  step="1"
                  value={bannerBlur}
                  onChange={(e) => setBannerBlur(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
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
    </div>
  , portalTarget);
}
