import React from "react";
import { DraftActivityFeed } from "@/components/fomo/community/DraftActivityFeed";

export function DraftActivityTab({ draftId, isModern }: { draftId: string; isModern: boolean }) {
  return (
    <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
      <h3 className={`text-lg font-bold capitalize ${isModern ? "text-foreground" : "text-white"}`}>Registro de Actividad</h3>
      <DraftActivityFeed draftId={draftId} isModern={isModern} />
    </div>
  );
}
