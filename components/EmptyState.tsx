import React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="py-14 text-center rounded-2xl animate-fade-in"
      style={{ border: "1px dashed var(--color-border)", background: "rgba(255,255,255,0.01)" }}
    >
      <div
        className="w-11 h-11 mx-auto mb-3.5 rounded-xl flex items-center justify-center animate-float"
        style={{ background: "rgba(187,150,228,0.06)", border: "1px solid var(--color-border)" }}
      >
        <Inbox className="w-5 h-5" style={{ color: "var(--color-muted)" }} />
      </div>
      <p className="font-body-med text-sm" style={{ color: "var(--color-muted)" }}>{message}</p>
    </div>
  );
}
