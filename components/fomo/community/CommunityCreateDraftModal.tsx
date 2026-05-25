"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Blocks, Loader2 } from "lucide-react";
import { supabase } from "@/lib/core/supabaseClient";
import { useAuth } from "@/components/security/AuthContext";

export function CommunityCreateDraftModal({
  isOpen,
  onClose,
  onSuccess,
  currentTheme,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDraft: any) => void;
  currentTheme: string;
}) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minecraftVersion, setMinecraftVersion] = useState("1.20.1");
  const [loader, setLoader] = useState("fabric");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isModern = currentTheme === "modern";
  const bgClass = isModern ? "bg-card text-card-foreground border-border" : "bg-[#111113] text-white border-white/10";
  const inputClass = isModern 
    ? "bg-background text-foreground border-border focus:ring-primary" 
    : "bg-black/50 text-white border-white/10 focus:ring-primary";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("drafts")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          description: description.trim(),
          minecraft_version: minecraftVersion,
          loader,
          visibility: "private",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      onSuccess(data);
      onClose();
      setName("");
      setDescription("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al crear el draft");
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in`}>
      <div className={`relative w-full max-w-md p-6 border rounded-2xl shadow-2xl flex flex-col gap-4 ${bgClass}`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 transition-colors ${isModern ? "text-muted-foreground hover:text-foreground" : "text-white/40 hover:text-white"}`}
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Blocks className="w-5 h-5 text-primary" />
            Crear nuevo Draft
          </h3>
          <p className={`text-sm mt-1 ${isModern ? "text-muted-foreground" : "text-white/60"}`}>
            Inicia un nuevo modpack colaborativo. Podrás invitar amigos después.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Nombre del Draft</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Survival Tecnológico"
              className={`p-2 rounded-lg border text-sm focus:ring-2 outline-none transition-all ${inputClass}`}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Descripción (Opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata este modpack?"
              className={`p-2 rounded-lg border text-sm focus:ring-2 outline-none resize-none h-20 transition-all ${inputClass}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Minecraft</label>
              <select
                value={minecraftVersion}
                onChange={(e) => setMinecraftVersion(e.target.value)}
                className={`p-2 rounded-lg border text-sm focus:ring-2 outline-none transition-all ${inputClass}`}
              >
                <option value="1.20.4">1.20.4</option>
                <option value="1.20.1">1.20.1</option>
                <option value="1.19.4">1.19.4</option>
                <option value="1.19.2">1.19.2</option>
                <option value="1.18.2">1.18.2</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Loader</label>
              <select
                value={loader}
                onChange={(e) => setLoader(e.target.value)}
                className={`p-2 rounded-lg border text-sm focus:ring-2 outline-none transition-all ${inputClass}`}
              >
                <option value="fabric">Fabric</option>
                <option value="forge">Forge</option>
                <option value="neoforge">NeoForge</option>
                <option value="quilt">Quilt</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${isModern ? "text-muted-foreground hover:bg-muted" : "text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
