"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/core/supabaseClient";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock
} from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("loading");

  const [message, setMessage] = useState(
    "Verificando enlace de recuperación..."
  );

  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash.includes("access_token")) {
      setStatus("error");
      setMessage(
        "El enlace no es válido o expiró."
      );
      return;
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          event === "PASSWORD_RECOVERY" &&
          session
        ) {
          setSessionReady(true);

          setStatus("success");

          setMessage(
            "Enlace validado. Ingresá tu nueva contraseña."
          );

          return;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!password || !confirmPassword) {
      setStatus("error");

      setMessage(
        "Completá ambos campos de contraseña."
      );

      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");

      setMessage(
        "Las contraseñas no coinciden."
      );

      return;
    }

    if (password.length < 8) {
      setStatus("error");

      setMessage(
        "La contraseña debe tener al menos 8 caracteres."
      );

      return;
    }

    setStatus("loading");

    setMessage("Actualizando contraseña...");

    const { error } =
      await supabase.auth.updateUser({
        password
      });

    if (error) {
      console.error(
        "Password update error:",
        error
      );

      setStatus("error");

      setMessage(
        "No se pudo actualizar la contraseña. Probá nuevamente."
      );

      return;
    }

    setStatus("success");

    setMessage(
      "Contraseña actualizada correctamente. Ya podés iniciar sesión."
    );

    setPassword("");
    setConfirmPassword("");
    setSessionReady(false);
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/60 p-10 shadow-2xl backdrop-blur-xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </span>

          <div>
            <h1 className="text-lg font-bold text-white">
              Restablecer contraseña
            </h1>

            <p className="text-xs text-white/50">
              Completá el formulario si ya abriste el enlace de recuperación.
            </p>
          </div>
        </div>

        {/* Status */}
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 ${
            status === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : status === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-white/80"
          }`}
        >
          <div className="flex items-center gap-2 text-xs">
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}

            <span>{message}</span>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1 text-xs">
            <label className="font-semibold uppercase tracking-[0.2em] text-white/50">
              Nueva contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              disabled={
                status === "loading" ||
                !sessionReady
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-semibold uppercase tracking-[0.2em] text-white/50">
              Confirmar contraseña
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              disabled={
                status === "loading" ||
                !sessionReady
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={
              !sessionReady ||
              status === "loading"
            }
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading"
              ? "Procesando..."
              : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}