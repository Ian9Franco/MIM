import React, { useEffect, useState } from "react";
import { Globe, Loader2, Package, CheckCircle } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";
import { PendingFile } from "@/lib/core/types";

interface World {
  folderName: string;
  displayName: string;
  iconBase64: string | null;
  path: string;
  datapacks?: string[];
}

interface WorldsSectionProps {
  pendingFiles: PendingFile[];
}

export function WorldsSection({ pendingFiles }: WorldsSectionProps) {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  const pendingDatapacks = pendingFiles.filter(f => f.meta?.projectType === "datapack" || f.path.toLowerCase().endsWith(".zip"));

  const fetchWorlds = () => {
    setLoading(true);
    fetch("/api/minecraft/worlds")
      .then((res) => res.json())
      .then((data) => {
        setWorlds(data.worlds || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch worlds:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorlds();
  }, []);

  return (
    <section className="animate-fade-up mt-8">
      <SectionHeading
        icon={<Globe className="w-4 h-4" />}
        title="Mundos Guardados"
        sub="Mundos detectados en tu carpeta del juego"
        badge={worlds.length}
        accentColor="var(--color-primary)"
      />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted">Cargando mundos...</span>
          </div>
        ) : worlds.length === 0 ? (
          <div className="col-span-full p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted">No se encontraron mundos.</p>
          </div>
        ) : (
          worlds.map((world) => (
            <div
              key={world.folderName}
              className="p-4 rounded-2xl border border-white/5 bg-white/3 hover:bg-white/5 transition-all group flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                {world.iconBase64 ? (
                  <img
                    src={world.iconBase64}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shadow-md"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-subhead text-sm truncate" style={{ color: "var(--color-foreground)" }}>
                    {world.displayName}
                  </h3>
                  <p className="font-caption text-xs text-muted truncate">{world.folderName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted mt-1">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> {world.datapacks?.length || 0} Datapacks
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
