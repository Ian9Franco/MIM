import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { LOADERS } from "@/lib/constants";
import { LOADER_COLORS } from "@/constants/app";
import type { Loader } from "@/lib/constants";
import type { Project } from "@/lib/types";

/**
 * Componente para crear o editar un proyecto.
 * @param initial - Proyecto inicial a editar (si es undefined, se crea uno nuevo).
 * @param onSave - Callback que se ejecuta al presionar Guardar.
 * @param onCancel - Callback que se ejecuta al presionar la X.
 */

export function ProjectEditor({ initial, onSave, onCancel }: {
  initial?: Project; onSave: (p: Project) => void; onCancel: () => void;
}) {
  const MC_VERSIONS = [
    "1.21.4", "1.21.3", "1.21.1", "1.21",
    "1.20.6", "1.20.4", "1.20.2", "1.20.1",
    "1.19.4", "1.19.2", "1.18.2", "1.17.1",
    "1.16.5", "1.15.2", "1.14.4", "1.12.2"
  ];

  const [name,    setName]    = useState(initial?.name    ?? "");
  const [version, setVersion] = useState(initial?.version ?? "1.20.1");
  const [loader,  setLoader]  = useState<Loader>(initial?.loader ?? "forge");
  const [isCustom, setIsCustom] = useState(() => initial?.version ? !MC_VERSIONS.includes(initial.version) : false);

  const valid = name.trim().length > 0 && version.trim().length > 0;

  const handleSelectChange = (val: string) => {
    if (val === "custom") {
      setIsCustom(true);
      setVersion("");
    } else {
      setVersion(val);
    }
  };

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

        {isCustom ? (
          <div className="flex items-center gap-1.5">
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Versión (ej: 1.20.1)"
              className="input-base w-36"
            />
            <button
              type="button"
              onClick={() => {
                setIsCustom(false);
                setVersion("1.20.1");
              }}
              className="px-2.5 py-2.5 rounded-xl text-[10px] uppercase font-bold border transition-colors hover:bg-white/5 shrink-0"
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
              title="Volver a versiones populares"
            >
              Lista
            </button>
          </div>
        ) : (
          <select
            value={version}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="input-base w-36"
            style={{ cursor: "pointer" }}
          >
            {MC_VERSIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
            <option value="custom">Otra...</option>
          </select>
        )}
        <select
          value={loader}
          onChange={(e) => setLoader(e.target.value as Loader)}
          className="input-base"
          style={{ cursor: "pointer", color: LOADER_COLORS[loader] ?? "var(--color-foreground)" }}
        >
          {LOADERS.map((l) => (
            <option key={l} value={l} style={{ background: "var(--color-background)", color: LOADER_COLORS[l] ?? "inherit" }}>
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
