import React from "react";
import { DraftActivityFeed } from "@/components/fomo/community/DraftActivityFeed";

export function DraftOverviewTab({ draftId, isModern }: { draftId: string; isModern: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 flex flex-col gap-4">
        <h3 className={`text-lg font-bold ${isModern ? "text-foreground" : "text-white"}`}>Overview</h3>
        <p className={`text-sm ${isModern ? "text-muted-foreground" : "text-white/60"}`}>
          Bienvenido al draft. Aquí se coordinan las ideas antes de compilar el modpack.
          Usa la pestaña de <b>Items</b> para agregar contenido desde Discover o la comunidad.
        </p>
      </div>
      <div className="md:col-span-1 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
        <DraftActivityFeed draftId={draftId} isModern={isModern} />
      </div>
    </div>
  );
}
