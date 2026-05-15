import React from "react";
import { Keybind } from "@/app/api/tweak/lib/types";

interface KeyboardMapProps {
  keybinds: Keybind[];
}

const KEYBOARD_LAYOUT = [
  ["Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
  ["Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter"],
  ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shift"],
  ["Ctrl", "Win", "Alt", "Space", "Alt", "Win", "Menu", "Ctrl"]
];

// Mapping helper to match Minecraft key IDs to our visual layout
const keyMap: Record<string, string> = {
  "key.keyboard.escape": "Esc",
  "key.keyboard.f1": "F1",
  "key.keyboard.f2": "F2",
  "key.keyboard.f3": "F3",
  "key.keyboard.f4": "F4",
  "key.keyboard.f5": "F5",
  "key.keyboard.f6": "F6",
  "key.keyboard.f7": "F7",
  "key.keyboard.f8": "F8",
  "key.keyboard.f9": "F9",
  "key.keyboard.f10": "F10",
  "key.keyboard.f11": "F11",
  "key.keyboard.f12": "F12",
  "key.keyboard.grave.accent": "`",
  "key.keyboard.1": "1",
  "key.keyboard.2": "2",
  "key.keyboard.3": "3",
  "key.keyboard.4": "4",
  "key.keyboard.5": "5",
  "key.keyboard.6": "6",
  "key.keyboard.7": "7",
  "key.keyboard.8": "8",
  "key.keyboard.9": "9",
  "key.keyboard.0": "0",
  "key.keyboard.minus": "-",
  "key.keyboard.equal": "=",
  "key.keyboard.backspace": "Backspace",
  "key.keyboard.tab": "Tab",
  "key.keyboard.q": "Q",
  "key.keyboard.w": "W",
  "key.keyboard.e": "E",
  "key.keyboard.r": "R",
  "key.keyboard.t": "T",
  "key.keyboard.y": "Y",
  "key.keyboard.u": "U",
  "key.keyboard.i": "I",
  "key.keyboard.o": "O",
  "key.keyboard.p": "P",
  "key.keyboard.left.bracket": "[",
  "key.keyboard.right.bracket": "]",
  "key.keyboard.backslash": "\\",
  "key.keyboard.caps.lock": "Caps",
  "key.keyboard.a": "A",
  "key.keyboard.s": "S",
  "key.keyboard.d": "D",
  "key.keyboard.f": "F",
  "key.keyboard.g": "G",
  "key.keyboard.h": "H",
  "key.keyboard.j": "J",
  "key.keyboard.k": "K",
  "key.keyboard.l": "L",
  "key.keyboard.semicolon": ";",
  "key.keyboard.apostrophe": "'",
  "key.keyboard.enter": "Enter",
  "key.keyboard.left.shift": "Shift",
  "key.keyboard.z": "Z",
  "key.keyboard.x": "X",
  "key.keyboard.c": "C",
  "key.keyboard.v": "V",
  "key.keyboard.b": "B",
  "key.keyboard.n": "N",
  "key.keyboard.m": "M",
  "key.keyboard.comma": ",",
  "key.keyboard.period": ".",
  "key.keyboard.slash": "/",
  "key.keyboard.right.shift": "Shift",
  "key.keyboard.left.control": "Ctrl",
  "key.keyboard.left.win": "Win",
  "key.keyboard.left.alt": "Alt",
  "key.keyboard.space": "Space",
  "key.keyboard.right.alt": "Alt",
  "key.keyboard.right.win": "Win",
  "key.keyboard.menu": "Menu",
  "key.keyboard.right.control": "Ctrl",
};

export const KeyboardMap: React.FC<KeyboardMapProps> = ({ keybinds }) => {
  // Count actions per key
  const heatmap: Record<string, Keybind[]> = {};
  keybinds.forEach(kb => {
    const visualKey = keyMap[kb.key] || kb.key;
    if (!heatmap[visualKey]) heatmap[visualKey] = [];
    heatmap[visualKey].push(kb);
  });

  const getHeatColor = (count: number) => {
    if (count === 0) return "bg-zinc-800/50 border-zinc-700 text-zinc-500";
    if (count === 1) return "bg-yellow-500/20 border-yellow-500/50 text-yellow-200";
    if (count === 2) return "bg-orange-500/40 border-orange-500/70 text-orange-100 shadow-[0_0_10px_rgba(249,115,22,0.3)]";
    return "bg-red-600/60 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse";
  };

  return (
    <div className="p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl backdrop-blur-xl overflow-x-auto font-sans">
      <div className="flex flex-col gap-2 min-w-[800px]">
        {KEYBOARD_LAYOUT.map((row, i) => (
          <div key={i} className="flex gap-1.5 justify-center">
            {row.map((key, j) => {
              const bounds = heatmap[key] || [];
              const count = bounds.length;
              const colorClass = getHeatColor(count);
              
              // Special widths for non-standard keys
              let width = "w-10";
              if (key === "Space") width = "w-64";
              if (key === "Backspace") width = "w-20";
              if (key === "Enter") width = "w-24";
              if (key === "Shift") width = "w-28";
              if (key === "Tab" || key === "\\") width = "w-14";
              if (key === "Caps") width = "w-16";
              if (key === "Ctrl" || key === "Alt" || key === "Win") width = "w-12";

              return (
                <div
                  key={j}
                  title={count > 0 ? `${count} acciones: ${bounds.map(b => b.name).join(", ")}` : "Disponible"}
                  className={`h-10 ${width} flex items-center justify-center rounded-lg border text-[10px] font-bold transition-all cursor-default ${colorClass}`}
                >
                  {key}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Heatmap Legend */}
      <div className="mt-6 flex justify-center gap-6 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zinc-800 border border-zinc-700"></div>
          Libre
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/50"></div>
          Ocupada
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500/40 border border-orange-500/70"></div>
          Conflicto (2)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-600/60 border border-red-500"></div>
          Crítico (3+)
        </div>
      </div>
    </div>
  );
};
