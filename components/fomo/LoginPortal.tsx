"use client";

import React, { useState } from "react";
import { Mail, Lock, User, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface LoginPortalProps {
  onSuccess: () => void;
}

export function LoginPortal({ onSuccess }: LoginPortalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic Validation
    if (!email || !password) {
      setErrorMsg("Por favor, completá todos los campos obligatorios.");
      setLoading(false);
      return;
    }

    if (isRegister && username.trim().length < 3) {
      setErrorMsg("El nombre de usuario debe tener al menos 3 caracteres.");
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Sign Up with custom username meta-data
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
            },
          },
        });

        if (error) throw error;

        // If email confirmation is enabled, notify user. Otherwise they are logged in.
        if (data.session) {
          setSuccessMsg("¡Cuenta creada con éxito! Iniciando sesión...");
          setTimeout(() => {
            onSuccess();
          }, 1500);
        } else {
          setSuccessMsg("¡Registro exitoso! Por favor verifícá tu correo si la confirmación está activa.");
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSuccessMsg("¡Conexión exitosa! Cargando perfil...");
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }
    } catch (err: any) {
      console.error("[AuthError]:", err);
      setErrorMsg(err.message || "Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl border border-primary/20 shadow-2xl relative overflow-hidden backdrop-blur-md"
         style={{ background: "rgba(32, 13, 45, 0.4)" }}>
      {/* Decorative ambient light */}
      <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-accent/20 blur-2xl pointer-events-none" />

      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="font-headline text-lg text-white">
          {isRegister ? "Crear Cuenta de MIM" : "Conectar con MIM Cloud"}
        </h3>
        <p className="font-caption text-xs text-white/50 mt-1">
          {isRegister
            ? "Unite para compartir tus favoritos, videos y builds de modpacks."
            : "Iniciá sesión para sincronizar tus favoritos y compartir contenidos."}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/30 rounded-xl p-1 mb-6 border border-white/5">
        <button
          onClick={() => { setIsRegister(false); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${!isRegister ? "bg-primary text-background" : "text-white/60 hover:text-white"}`}
        >
          Iniciar Sesión
        </button>
        <button
          onClick={() => { setIsRegister(true); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${isRegister ? "bg-primary text-background" : "text-white/60 hover:text-white"}`}
        >
          Registrarse
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {isRegister && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Nombre de usuario</label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-primary absolute left-3 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: SteveMinecraft"
                className="w-full bg-white/4 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary focus:bg-white/8 transition-all"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Correo Electrónico</label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-primary absolute left-3 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-white/4 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary focus:bg-white/8 transition-all"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Contraseña</label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-primary absolute left-3 pointer-events-none" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/4 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary focus:bg-white/8 transition-all"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:opacity-90 active:scale-[0.98] text-background font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/10 mt-6"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : isRegister ? (
            "Crear Cuenta"
          ) : (
            "Conectar"
          )}
        </button>
      </form>
    </div>
  );
}
