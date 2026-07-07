"use client";

import React, { useState } from "react";
import { X, Settings2, Check, Trash2, Plus } from "lucide-react";

interface ChannelPickerModalProps {
  show: boolean;
  onClose: () => void;
  showcaseChannels: string[];
  handleSaveShowcaseChannels: (newChannels: string[]) => void;
}

export default function ChannelPickerModal({
  show,
  onClose,
  showcaseChannels,
  handleSaveShowcaseChannels,
}: ChannelPickerModalProps) {
  const [newShowcaseChannelInput, setNewShowcaseChannelInput] = useState("");

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl border shadow-2xl flex flex-col gap-0 animate-scale-in overflow-hidden"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--color-foreground)" }}>
              Canales del Showcase
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--color-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col gap-4 p-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {/* Suggested Channels List */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase font-mono tracking-widest mb-1" style={{ color: "var(--color-muted)" }}>
              Canales sugeridos
            </span>
            {[
              "https://www.youtube.com/@EnderVerseMC",
              "https://www.youtube.com/@KreksuMinecraft",
              "https://www.youtube.com/@NoxusMods",
              "https://www.youtube.com/@sir_color",
              "https://www.youtube.com/@Wero_lovernite",
            ].map((ch) => {
              const active = showcaseChannels.includes(ch);
              const handle = ch.includes("@") ? "@" + ch.split("@")[1] : ch.split("/").pop();
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    if (active) {
                      handleSaveShowcaseChannels(showcaseChannels.filter((c) => c !== ch));
                    } else {
                      handleSaveShowcaseChannels([...showcaseChannels, ch]);
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left"
                  style={{
                    background: active
                      ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                      : "color-mix(in srgb, var(--color-surface) 60%, var(--color-card))",
                    borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                    color: active ? "var(--color-primary)" : "var(--color-foreground)",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0"
                    style={{
                      borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                      background: active ? "var(--color-primary)" : "transparent",
                    }}
                  >
                    {active && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="truncate">{handle}</span>
                </button>
              );
            })}
          </div>

          {/* Custom channels list */}
          {showcaseChannels.filter(
            (c) =>
              ![
                "https://www.youtube.com/@EnderVerseMC",
                "https://www.youtube.com/@KreksuMinecraft",
                "https://www.youtube.com/@NoxusMods",
                "https://www.youtube.com/@sir_color",
                "https://www.youtube.com/@Wero_lovernite",
              ].includes(c)
          ).length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] font-bold uppercase font-mono tracking-widest mb-1" style={{ color: "var(--color-muted)" }}>
                Canales agregados
              </span>
              {showcaseChannels
                .filter(
                  (c) =>
                    ![
                      "https://www.youtube.com/@EnderVerseMC",
                      "https://www.youtube.com/@KreksuMinecraft",
                      "https://www.youtube.com/@NoxusMods",
                      "https://www.youtube.com/@sir_color",
                      "https://www.youtube.com/@Wero_lovernite",
                    ].includes(c)
                )
                .map((ch) => {
                  const handle = ch.includes("@") ? "@" + ch.split("@")[1] : ch.split("/").pop();
                  return (
                    <div
                      key={ch}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border"
                      style={{
                        background: "color-mix(in srgb, var(--color-surface) 60%, var(--color-card))",
                        borderColor: "var(--color-border)",
                        color: "var(--color-foreground)",
                      }}
                    >
                      <span className="truncate flex-1">{handle}</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleSaveShowcaseChannels(showcaseChannels.filter((c) => c !== ch));
                        }}
                        className="p-1 rounded-lg hover:bg-white/5 text-red-500 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Add custom channel form */}
          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-[10px] font-bold uppercase font-mono tracking-widest" style={{ color: "var(--color-muted)" }}>
              Agregar canal personalizado
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="@Handle o URL"
                value={newShowcaseChannelInput}
                onChange={(e) => setNewShowcaseChannelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const raw = newShowcaseChannelInput.trim();
                    if (raw) {
                      let finalUrl = raw.startsWith("http") ? raw : `https://www.youtube.com/@${raw.replace(/^@/, "")}`;
                      finalUrl = finalUrl.replace(/\/$/, "");
                      if (!showcaseChannels.includes(finalUrl)) {
                        handleSaveShowcaseChannels([...showcaseChannels, finalUrl]);
                      }
                      setNewShowcaseChannelInput("");
                    }
                  }
                }}
                className="flex-1 rounded-xl py-2 px-3 text-xs outline-none transition-all"
                style={{
                  background: "color-mix(in srgb, var(--color-surface) 60%, var(--color-card))",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const raw = newShowcaseChannelInput.trim();
                  if (raw) {
                    let finalUrl = raw.startsWith("http") ? raw : `https://www.youtube.com/@${raw.replace(/^@/, "")}`;
                    finalUrl = finalUrl.replace(/\/$/, "");
                    if (!showcaseChannels.includes(finalUrl)) {
                      handleSaveShowcaseChannels([...showcaseChannels, finalUrl]);
                    }
                    setNewShowcaseChannelInput("");
                  }
                }}
                className="p-2 rounded-xl text-white active:scale-95 transition-all shrink-0 flex items-center justify-center"
                style={{ background: "var(--color-primary)" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between border-t gap-3" style={{ borderColor: "var(--color-border)" }}>
          <button
            type="button"
            onClick={() => {
              const defaults = [
                "https://www.youtube.com/@EnderVerseMC",
                "https://www.youtube.com/@KreksuMinecraft",
                "https://www.youtube.com/@NoxusMods",
                "https://www.youtube.com/@sir_color",
                "https://www.youtube.com/@Wero_lovernite",
              ];
              handleSaveShowcaseChannels(defaults);
            }}
            className="text-[10px] font-bold uppercase transition-colors"
            style={{ color: "var(--color-muted)" }}
          >
            Restaurar sugeridos
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-white font-bold text-xs active:scale-[0.98] transition-all"
            style={{ background: "var(--color-primary)" }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
