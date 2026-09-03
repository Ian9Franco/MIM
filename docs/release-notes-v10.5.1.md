# MIM v10.5.1 — MIM-Bot Bully Intelligence, Slime UI Branding & CI Hardening

Version 10.5.1 introduces the official **MIM-Bot** intelligent mod assistant with an aggressive gamer bully personality, interactive on-demand project mini-chat, responsive slime micro-animations, and strict TypeScript/Web Crypto type safety hardening across Web and Desktop engines.

---

## ⚡ Highlights & New Features

### 🤖 MIM-Bot: Bully Persona & Multimodal Grounding
- **Ruthless Bully Persona:** Sarcastic, condescending, hilarious gamer trash-talk that roasts potato PCs, noob setups, and lack of log reading, while maintaining **100% technical factual accuracy** on loaders, dependencies, and mechanics.
- **Multimodal Visual Evidence:** Inspects 3–5 gallery screenshots alongside Google Search Grounding to decipher mods, shaders, and resource packs with missing descriptions.
- **Interactive Project Mini-Chat (`chatWithProjectAssistant`):** Scoped conversational sub-panel for recipes, compatibility, and configs without leaving the mod view.
- **Resilient Cascade & Local Fallback:** Automatically cascades across Gemini 2.5 Flash -> 2.0 Flash -> 1.5 Flash -> Local Heuristic Engine on quota exhaustion (HTTP 429).

### 🎨 Visual Identity: Animated Slime Micro-Interactions
- **Brand Alignment:** Removed generic lightning bolt emojis (`⚡`) and sparkles (`<Sparkles>`).
- **Elastic Bouncing Slime (`.animate-slime`):** Miniature animated favicon (`/icon.png`) on pill action buttons, analysis banners, and individual response bubbles.

### 🛠️ Systems & CI Type Hardening
- **`ModHit` Parity:** Added optional `slug` and `loaders` fields across `web` and `core`, eliminating TypeScript build failures.
- **Web Crypto Compatibility:** Fixed buffer type overloads in `vaultEngine.ts` for strict TypeScript 5+ (`BufferSource` casting and polymorphic `bufferToHex`).
- **Web Sound Extensions:** Extended `FomoSoundKind` to support `"pop"` and `"sparkle"`.

---

## 📦 Release Assets & Binaries

| Asset | Type | Description |
|:---|:---|:---|
| **`MIM Setup 10.5.1.exe`** | Windows NSIS Installer | Full installation with Desktop/Start menu shortcuts and background auto-update support. |
| **`MIM 10.5.1.exe`** | Portable Executable | Standalone binary requiring zero installation or admin privileges. |
| **`MIM Setup 10.5.1.exe.blockmap`** | Blockmap | SHA-256 block mapping enabling differential delta updates. |
| **`latest.yml`** | Manifest | Version integrity metadata for `electron-updater`. |
