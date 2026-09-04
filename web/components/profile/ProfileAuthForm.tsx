"use client";

import React from "react";
import { User, Mail, Key, Loader2 } from "lucide-react";

interface ProfileAuthFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  isRegistering: boolean;
  setIsRegistering: (v: boolean) => void;
  authLoading: boolean;
  handleAuth: (e: React.FormEvent) => void;
}

export function ProfileAuthForm({
  email,
  setEmail,
  password,
  setPassword,
  username,
  setUsername,
  isRegistering,
  setIsRegistering,
  authLoading,
  handleAuth,
}: ProfileAuthFormProps) {
  return (
    <div className="my-auto bg-surface/80 border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-orange-500" />
        </div>
        <h2 className="text-md font-bold text-white">FOMO Cloud Sync</h2>
        <p className="text-xs text-white/40 mt-1">
          Accedé a tus modpacks, ránkings y proyectos favoritos en cualquier dispositivo.
        </p>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col gap-4">
        {isRegistering && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Nombre de usuario</label>
            <div className="relative">
              <User className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tu apodo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-white/40 uppercase font-mono">Contraseña</label>
          <div className="relative">
            <Key className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/20 focus:border-orange-500/50 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {authLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRegistering ? "Registrarme" : "Iniciar Sesión"}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="text-[11px] text-orange-400 font-semibold hover:underline"
        >
          {isRegistering ? "¿Ya tenés cuenta? Iniciá sesión" : "¿No tenés cuenta? Registrate gratis"}
        </button>
      </div>
    </div>
  );
}
