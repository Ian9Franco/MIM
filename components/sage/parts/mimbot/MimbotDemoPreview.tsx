"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import type { MimbotDemoPreview as MimbotDemoPreviewData } from "@/lib/intelligence/sage/mimbotDemoExamples";

interface MimbotDemoPreviewProps {
  preview: MimbotDemoPreviewData;
  onConfigureKey: () => void;
}

export function MimbotDemoPreview({ preview, onConfigureKey }: MimbotDemoPreviewProps) {
  return (
    <div className="rounded-xl border border-purple-500/25 bg-purple-950/20 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-purple-200">{preview.headline}</p>
          <p className="text-[10px] text-white/55 leading-relaxed">
            Ejemplo estático de lo que MIM-Bot puede hacer cuando conectás tu clave. No consume cuota
            ni llama al proveedor.
          </p>
        </div>
      </div>

      <ul className="space-y-1">
        {preview.valueProps.map((prop) => (
          <li key={prop} className="text-[10px] text-white/70 leading-relaxed flex gap-1.5">
            <span className="text-purple-400 shrink-0">•</span>
            <span>{prop}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-white/10 bg-black/30 p-2.5 space-y-2">
        <p className="text-[10px] text-purple-300/80 font-medium">Ejemplo de intercambio</p>
        <div className="text-[10px] rounded-lg bg-purple-900/30 border border-purple-500/20 px-2 py-1.5 text-white/85">
          {preview.exampleQuestion}
        </div>
        <div className="text-[10px] rounded-lg bg-black/40 border border-white/5 px-2 py-1.5 text-white/75 leading-relaxed">
          {preview.exampleAnswer}
        </div>
      </div>

      <button
        type="button"
        onClick={onConfigureKey}
        className="w-full px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-all active:scale-[0.99]"
      >
        Conectar mi clave de Gemini para chat real
      </button>
    </div>
  );
}
