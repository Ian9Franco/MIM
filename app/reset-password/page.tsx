"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/core/supabaseClient";
import { Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("Esperando enlace de recuperación...");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const type = searchParams.get("type");
    const accessToken = searchParams.get("access_token");
    if (type !== "recovery" || !accessToken) {
      setStatus("error");
      setMessage(
        "El enlace no es válido. Usá el enlace de recuperación recibido por correo o volvé a solicitarlo desde la app."
      );
      return;
    }

    const verifyLink = async () => {
      setStatus("loading");
      setMessage("Verificando enlace de recuperación...");
      const { data, error } = await supabase.auth.getSessionFromUrl();
      if (error) {
        console.error("Password recovery URL error:", error);
        setStatus("error");
        setMessage(
          "No se pudo validar el enlace. Es posible que haya expirado o que el token sea incorrecto."
        );
        return;
      }

      if (data?.session) {
        setStatus("success");
        setMessage("Enlace validado. Ingresá tu nueva contraseña.");
        setSessionReady(true);
      } else {
        setStatus("error");
        setMessage(
          "No se encontró una sesión válida. Intenta solicitar el restablecimiento nuevamente."
        );
      }
    };

    verifyLink();
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || !confirmPassword) {
      setStatus("error");
      setMessage("Completá ambos campos de contraseña.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setStatus("loading");
    setMessage("Actualizando contraseña...");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error("Password update error:", error);
      setStatus("error");
      setMessage(
        "No se pudo actualizar la contraseña. Probá de nuevo o solicitá un nuevo enlace."
      );
      return;
    }

    setStatus("success");
    setMessage("Contraseña actualizada con éxito. Ya podés iniciar sesión con tu nueva contraseña.");
    setPassword("");
    setConfirmPassword("");
    setSessionReady(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/60 p-10 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white">Restablecer contraseña</h1>
            <p className="text-xs text-white/50">Completá el formulario si ya recibiste el enlace de recuperación.</p>
          </div>
        </div>

        <div className={`mb-6 rounded-2xl border px-4 py-3 ${status === "error" ? "border-red-500/20 bg-red-500/10 text-red-200" : status === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/80"}`}>
          <div className="flex items-center gap-2 text-xs">
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : status === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{message}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-xs">
            <label className="font-semibold uppercase tracking-[0.2em] text-white/50">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === "loading" || !sessionReady}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-semibold uppercase tracking-[0.2em] text-white/50">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={status === "loading" || !sessionReady}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={!sessionReady || status === "loading"}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Procesando..." : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
