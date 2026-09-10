"use client";

import React from "react";

interface MimbotQuickQuestionsProps {
  quickQuestions: string[];
  onSelectQuestion: (question: string) => void;
  variant?: "initial" | "follow-up";
}

export function MimbotQuickQuestions({
  quickQuestions,
  onSelectQuestion,
  variant = "initial",
}: MimbotQuickQuestionsProps) {
  return (
    <div className="space-y-1 pt-0.5">
      {variant === "follow-up" && (
        <p className="text-[10px] text-purple-300/60 font-medium">Seguimientos sugeridos</p>
      )}
      <div className="flex flex-wrap gap-1.5">
      {quickQuestions.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectQuestion(chip)}
          className="px-2.5 py-1 rounded-lg bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 hover:text-white text-[11px] border border-purple-500/20 transition-all text-left active:scale-95"
        >
          {chip}
        </button>
      ))}
      </div>
    </div>
  );
}
