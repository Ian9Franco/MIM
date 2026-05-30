"use client";

import React, { createContext, useContext } from "react";
import { PillToggleGroup } from "@/components/ui/primitives";
import { ModrinthIcon, CurseForgeIcon, BedrockIcon } from "@/components/fomo/parts/FomoPlatformIcons";

export type FomoDiscoverApi = Record<string, unknown> & {
  query: string;
  source: string;
  setSource: (v: "modrinth" | "curseforge" | "all" | "chunk") => void;
};

const FomoDiscoverContext = createContext<FomoDiscoverApi | null>(null);

export function FomoDiscoverProvider({
  discover,
  children,
}: {
  discover: FomoDiscoverApi;
  children: React.ReactNode;
}) {
  return (
    <FomoDiscoverContext.Provider value={discover}>
      {children}
    </FomoDiscoverContext.Provider>
  );
}

const SOURCE_OPTIONS = [
  { value: "all", label: "Ambos" },
  { value: "modrinth", label: "Modrinth", icon: <ModrinthIcon /> },
  { value: "curseforge", label: "CurseForge", icon: <CurseForgeIcon /> },
  { value: "chunk", label: "Bedrock", icon: <BedrockIcon /> },
];

function sourceOptionsFor(discover: FomoDiscoverApi) {
  return SOURCE_OPTIONS.filter(
    (s) =>
      s.value !== "all" ||
      (discover.query.length > 0 &&
        (discover.source === "all" || discover.query.startsWith("author:")))
  );
}

/** Barra de fuente dentro de Explorar (usa API discover directamente). */
export function FomoDiscoverSourceBar({ discover }: { discover: FomoDiscoverApi }) {
  return (
    <PillToggleGroup
      options={sourceOptionsFor(discover)}
      value={discover.source}
      onChange={(v: string) =>
        discover.setSource(v as "modrinth" | "curseforge" | "all" | "chunk")
      }
      className="p-1.5 shrink-0"
      ariaLabel="Seleccionar fuente Modrinth o CurseForge"
    />
  );
}

/** Source toggle para el header del shell — requiere estar dentro de FomoDiscoverProvider. */
export function FomoDiscoverSourceToggle() {
  const discover = useContext(FomoDiscoverContext);
  if (!discover) return null;
  return <FomoDiscoverSourceBar discover={discover} />;
}
