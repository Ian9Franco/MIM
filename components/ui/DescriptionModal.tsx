import React from "react";
import { X } from "lucide-react";
import { markdownToHtml } from "@/utils/markdown";
import { openExternal } from "@/utils/format";

interface DescriptionModalProps {
  modDescription: {
    title?: string;
    description?: string;
    body?: string;
    url?: string;
    modName?: string;
  };
  onClose: () => void;
}

export function DescriptionModal({ modDescription, onClose }: DescriptionModalProps) {
  const descriptionHtml = modDescription.body
    ? markdownToHtml(modDescription.body)
    : '<span class="opacity-70">No hay documentación detallada (body) disponible para este mod en Modrinth.</span>';

  const handleBodyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a[data-external-link='true']") as HTMLAnchorElement | null;
    if (!anchor?.href) return;
    event.preventDefault();
    openExternal(anchor.href);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" 
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border-strong)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h2 className="text-xl font-headline" style={{ color: "var(--color-foreground)" }}>
              {modDescription.title || modDescription.modName || "Descripción del Mod"}
            </h2>
            {modDescription.url && (
              <button
                type="button"
                onClick={() => openExternal(modDescription.url!)}
                className="text-sm hover:underline mt-1 block"
                style={{ color: "var(--color-accent)" }}
              >
                Ver en Modrinth ↗
              </button>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl transition-colors hover:bg-white/10" 
            style={{ color: "var(--color-muted)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar">
          {modDescription.description && (
            <p className="font-body-med mb-6 text-sm italic" style={{ color: "var(--color-primary)" }}>
              "{modDescription.description}"
            </p>
          )}
          <div
            className="text-sm leading-relaxed break-words"
            style={{ color: "var(--color-muted)", lineHeight: "1.7" }}
            onClick={handleBodyClick}
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </div>
      </div>
    </div>
  );
}
