import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { LOADERS } from "@/lib/constants";
import type { Loader } from "@/lib/constants";

export interface Project {
  id: string;
  name: string;
  version: string;
  loader: Loader;
}

const LOADER_COLOR: Record<string, string> = {
  forge: "#3B82F6", neoforge: "#06B6D4", fabric: "#8B5CF6", quilt: "#EC4899",
};

export function ProjectEditor({ initial, onSave, onCancel }: {
  initial?: Project; onSave: (p: Project) => void; onCancel: () => void;
}) {
  const [name,    setName]    = useState(initial?.name    ?? "");
  const [version, setVersion] = useState(initial?.version ?? "1.20.1");
  const [loader,  setLoader]  = useState<Loader>(initial?.loader ?? "forge");
  const valid = name.trim().length > 0 && version.trim().length > 0;

  // Simple ID generator for new projects
  const newId = () => Math.random().toString(36).slice(2, 9);

  return (
    <div
      className="rounded-2xl p-4 animate-scale-in"
      style={{ background: "rgba(187,150,228,0.06)", border: "1px solid var(--color-border-strong)" }}
    >
      <p className="font-label mb-3" style={{ color: "var(--color-muted)", fontSize: "0.62rem" }}>
        {initial ? "Editar proyecto" : "Nuevo proyecto"}
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del proyecto"
          className="input-base w-52"
        />
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Versión (ej: 1.20.1)"
          className="input-base w-36"
        />
        <select
          value={loader}
          onChange={(e) => setLoader(e.target.value as Loader)}
          className="input-base"
          style={{ cursor: "pointer", color: LOADER_COLOR[loader] ?? "var(--color-foreground)" }}
        >
          {LOADERS.map((l) => (
            <option key={l} value={l} style={{ background: "var(--color-background)", color: LOADER_COLOR[l] ?? "inherit" }}>
              {l}
            </option>
          ))}
        </select>

        <div className="flex gap-2 ml-auto">
          <button
            disabled={!valid}
            onClick={() => onSave({ id: initial?.id ?? newId(), name: name.trim(), version: version.trim(), loader })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-subhead text-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--color-primary)", color: "var(--color-background)" }}
          >
            <Check className="w-3.5 h-3.5" /> Guardar
          </button>
          <button
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
