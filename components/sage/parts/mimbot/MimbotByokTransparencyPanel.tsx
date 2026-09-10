"use client";

import React from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import {
  MIMBOT_BYOK_DATA_SENT,
  MIMBOT_BYOK_NOT_PROMISED,
  MIMBOT_BYOK_PROVIDER_LINKS,
} from "@/lib/intelligence/sage/mimbotByokTransparency";

export function MimbotByokTransparencyPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-purple-500/20 bg-black/30 space-y-2 ${
        compact ? "p-2.5 text-[10px]" : "p-3 text-[11px]"
      }`}
    >
      <div className="flex items-center gap-1.5 font-semibold text-purple-200">
        <ShieldAlert className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>Transparencia BYOK</span>
      </div>

      <div className="space-y-1.5 text-white/65 leading-relaxed">
        <p className="font-medium text-white/75">Qué datos salen de tu dispositivo:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {MIMBOT_BYOK_DATA_SENT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5 text-white/65 leading-relaxed">
        <p className="font-medium text-amber-200/90">Qué MIM no promete:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {MIMBOT_BYOK_NOT_PROMISED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {MIMBOT_BYOK_PROVIDER_LINKS.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-100 hover:underline"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
