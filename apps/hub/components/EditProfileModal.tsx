"use client";

import React, { useEffect, useState } from "react";
import { X, Pencil, User, Upload, Trash2, Loader2, Check } from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";
import { ImageCropper } from "./ImageCropper";

interface EditProfileModalProps {
  show: boolean;
  onClose: () => void;
  session: any;
  profile: any;
  setProfile: (profile: any) => void;
  supabase: SupabaseClient;
  resizeAndCompressImage: (file: File, maxWidth: number, maxHeight: number) => Promise<string>;
}

export default function EditProfileModal({
  show,
  onClose,
  session,
  profile,
  setProfile,
  supabase,
}: EditProfileModalProps) {
  const [editUsername, setEditUsername] = useState(profile?.username || "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile?.avatar_url || "");
  const [editBannerUrl, setEditBannerUrl] = useState(profile?.banner_url || "");
  const [editColor, setEditColor] = useState(profile?.color || "#F05A28");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editProfileStatus, setEditProfileStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [rawAvatar, setRawAvatar] = useState<string | null>(null);
  const [rawBanner, setRawBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!show) return;
    setEditUsername(profile?.username || "");
    setEditAvatarUrl(profile?.avatar_url || "");
    setEditBannerUrl(profile?.banner_url || "");
    setEditColor(profile?.color || "#F05A28");
    setEditProfileStatus(null);
  }, [show, profile]);

  if (!show || !session) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    setSavingProfile(true);
    setEditProfileStatus(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: editUsername.trim() || profile?.username,
          avatar_url: editAvatarUrl.trim() || null,
          banner_url: editBannerUrl.trim() || null,
          color: editColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (error) throw error;

      // Re-fetch updated profile
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (updatedProfile) setProfile(updatedProfile);

      setEditProfileStatus({ msg: "¡Perfil actualizado con éxito!", ok: true });
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setEditProfileStatus({ msg: err.message || "Error al guardar", ok: false });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl flex flex-col gap-0 animate-scale-in overflow-hidden"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
              Editar Perfil
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--color-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 p-5">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
              Nombre de usuario
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
              <input
                type="text"
                placeholder="Tu nombre visible"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full rounded-xl py-3 pl-10 pr-4 text-xs outline-none transition-all"
                style={{
                  background: "color-mix(in srgb, var(--color-surface) 60%, var(--color-card))",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              />
            </div>
          </div>

          {/* Avatar Upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
              Avatar (Seleccionar imagen)
            </label>
            <div className="flex gap-3 items-center">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border bg-black/20" style={{ borderColor: "var(--color-border)" }}>
                {editAvatarUrl ? (
                  <img src={editAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6" style={{ color: "var(--color-muted)" }} />
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex gap-2">
                  <label
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                    style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary)" }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Elegir foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setRawAvatar(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                  </label>
                  {editAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setEditAvatarUrl("")}
                      className="px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-500/10 text-red-500 border border-red-500/20 active:scale-95 transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                  JPG, PNG o WEBP. Redimensionado automáticamente.
                </span>
              </div>
            </div>
          </div>

          {/* Banner Upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
              Banner (Seleccionar imagen)
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative w-full h-24 rounded-2xl overflow-hidden flex items-center justify-center border bg-black/20" style={{ borderColor: "var(--color-border)" }}>
                {editBannerUrl ? (
                  <img src={editBannerUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: "var(--color-muted)" }}>Sin Banner</span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <label
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                  style={{ background: "color-mix(in srgb, var(--color-primary) 15%, transparent)", color: "var(--color-primary)" }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Elegir banner
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setRawBanner(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                </label>
                {editBannerUrl && (
                  <button
                    type="button"
                    onClick={() => setEditBannerUrl("")}
                    className="px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-500/10 text-red-500 border border-red-500/20 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Color */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
              Color de perfil
            </label>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl border shrink-0"
                style={{ background: editColor, borderColor: "var(--color-border)" }}
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-full h-9 rounded-xl border cursor-pointer"
                style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
              />
              {/* Quick color presets */}
              <div className="flex gap-1.5 shrink-0">
                {["#F05A28", "#E11D48", "#7C3AED", "#0EA5E9", "#10B981"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-all active:scale-95"
                    style={{
                      background: c,
                      borderColor: editColor === c ? "white" : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Status feedback */}
          {editProfileStatus && (
            <div
              className="text-xs rounded-xl px-4 py-2.5 text-center font-semibold"
              style={{
                background: editProfileStatus.ok
                  ? "color-mix(in srgb, #10B981 12%, transparent)"
                  : "color-mix(in srgb, #EF4444 12%, transparent)",
                color: editProfileStatus.ok ? "#10B981" : "#EF4444",
                border: `1px solid ${editProfileStatus.ok ? "#10B98130" : "#EF444430"}`,
              }}
            >
              {editProfileStatus.msg}
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={savingProfile}
            className="w-full text-white font-semibold text-xs rounded-xl py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
            style={{ background: "var(--color-primary)" }}
          >
            {savingProfile ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Guardar cambios
              </>
            )}
          </button>
        </form>
      </div>
      {rawAvatar && (
        <ImageCropper
          imageUrl={rawAvatar}
          aspectRatio={1}
          shape="circle"
          onCancel={() => setRawAvatar(null)}
          onSave={(croppedUrl) => {
            setEditAvatarUrl(croppedUrl);
            setRawAvatar(null);
          }}
        />
      )}
      {rawBanner && (
        <ImageCropper
          imageUrl={rawBanner}
          aspectRatio={8 / 3}
          shape="rect"
          onCancel={() => setRawBanner(null)}
          onSave={(croppedUrl) => {
            setEditBannerUrl(croppedUrl);
            setRawBanner(null);
          }}
        />
      )}
    </div>
  );
}
