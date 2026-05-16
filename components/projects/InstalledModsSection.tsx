import React, { useEffect, useState } from "react";
import { Package, Loader2, Search, Trash2 } from "lucide-react";
import { SectionHeading } from "../ui/SectionHeading";

interface Mod {
  fileName: string;
  size: number;
  mtime: string;
  path: string;
}

export function InstalledModsSection() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/minecraft/mods")
      .then((res) => res.json())
      .then((data) => {
        setMods(data.mods || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch installed mods:", err);
        setLoading(false);
      });
  }, []);

  const filteredMods = mods.filter((mod) =>
    mod.fileName.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <section className="animate-fade-up">
      <SectionHeading
        icon={<Package className="w-4 h-4" />}
        title="Mods Instalados"
        sub="Detectados en .minecraft/mods"
        badge={mods.length}
        accentColor="var(--color-primary)"
      />

      <div className="mt-4 mb-3 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Buscar mods instalados..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-primary focus:outline-none text-sm transition-colors"
        />
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted">Cargando mods...</span>
          </div>
        ) : filteredMods.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted">No se encontraron mods.</p>
          </div>
        ) : (
          filteredMods.map((mod) => (
            <div
              key={mod.fileName}
              className="p-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 transition-all group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-muted" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-subhead text-sm truncate" style={{ color: "var(--color-foreground)" }}>
                    {mod.fileName}
                  </h3>
                  <p className="font-caption text-xs text-muted">
                    {formatSize(mod.size)} • {new Date(mod.mtime).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`¿Seguro que quieres borrar ${mod.fileName}?`)) {
                    fetch("/api/delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ path: mod.path })
                    }).then(() => {
                      setMods(mods.filter((m) => m.path !== mod.path));
                    });
                  }
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
