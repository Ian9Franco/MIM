"use client";

import React, { useEffect } from "react";
import { FlaskConical } from "lucide-react";
import { useActiveDraft } from "@/hooks/fomo/useActiveDraft";
import { activeDraftManager } from "@/lib/fomo/activeDraftManager";
import { supabase } from "@/lib/core/supabaseClient";

export function FomoActiveDraftSelector({ isModern }: { isModern?: boolean }) {
  const { activeDraft, clearActiveDraft } = useActiveDraft();

  useEffect(() => {
    if (activeDraft) {
      activeDraftManager.validate(supabase);
    }
  }, [activeDraft?.id]);

  if (!activeDraft) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pendulum {
          0% { transform: rotate(-12deg); }
          50% { transform: rotate(12deg); }
          100% { transform: rotate(-12deg); }
        }
      `}} />
      <button
        type="button"
        onClick={clearActiveDraft}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer hover:opacity-90 active:scale-95 ${
          isModern ? "bg-primary/10 border-primary/20" : "bg-primary/20 border-primary/30"
        }`}
        title={`Draft activo: ${activeDraft.name}. Clic para desactivar.`}
        aria-label={`Desactivar draft ${activeDraft.name}`}
      >
        <FlaskConical
          className="w-4 h-4 text-primary"
          style={{ transformOrigin: "bottom center", animation: "pendulum 1.5s infinite ease-in-out" }}
        />
      </button>
    </>
  );
}
