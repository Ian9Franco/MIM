"use client";

import React, { useState, useEffect } from "react";
import { FlaskConical, ChevronDown, X } from "lucide-react";
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
        onClick={clearActiveDraft}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${
          isModern ? "bg-primary/10 border-primary/20" : "bg-primary/20 border-primary/30"
        }`}
        title="Desactivar Draft"
      >
        <FlaskConical className={`w-3.5 h-3.5 ${isModern ? "text-primary" : "text-primary"}`} style={{ transformOrigin: "bottom center", animation: "pendulum 1.5s infinite ease-in-out" }} />
        <span className={`text-xs font-bold ${isModern ? "text-primary" : "text-primary"}`}>
          Draft: {activeDraft.name}
        </span>
        <X className={`w-3.5 h-3.5 ml-1 ${isModern ? "text-primary/70" : "text-primary/70"}`} />
      </button>
    </>
  );
}
