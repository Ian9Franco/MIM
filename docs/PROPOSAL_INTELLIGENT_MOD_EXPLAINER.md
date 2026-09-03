# MIM Intelligent Project Explainer & MIM-Bot — On-Demand Mod Synthesis, Multimodal Grounding & Bully AI Assistant

> **Document Type:** Systems Engineering Architecture & Implementation Specification  
> **Status:** Implemented & Active in Production (v10.5.1)  
> **Author:** MIM Architecture Team  
> **Date:** 2026-09-03  
> **Target Systems:** MIM Desktop (Electron), MIMweb (FOMO Hub), ModDetailsSheet, FomoVersionOverlay  

---

## 1. Context & Motivation

In the Minecraft modding ecosystem, hundreds of mods, resource packs, shaders, and Bedrock add-ons have incomplete, outdated, or completely missing descriptions on CurseForge and Modrinth (e.g., projects that only state *"dependency for my other mod"* or have an empty README).

Users historically had to manually leave the app, open Google, search for the author, repository, or Reddit threads to understand what a mod actually does, its real performance footprint, and whether it is safe or relevant for their modpack.

### Guiding Engineering Principles
1. **On-Demand Utility (Non-Automatic):** In accordance with the *MIM Golden Rule ("Never build an intrusive ambient assistant; build concrete on-demand tools")*, the explainer is triggered explicitly via dedicated action buttons, with zero background token or network consumption.
2. **Public / Serverless Architecture & Model Decoupling:** Zero requirement for dedicated stateful backend servers. Operates via public Gemini Multimodal REST endpoints with decoupled model resolution (`DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"`, configurable via `GEMINI_MODEL` env or settings) and client-side key storage (`localStorage.getItem("mim_gemini_api_key")`) or edge routes (`/api/fomo/explain`).
3. **Multimodal Triangulation (Metadata + Google Search + Gallery Evidence):** When descriptions are absent, minimal, or purely visual (e.g. shaders, textures, HUD mods), the engine inspects 3-5 official gallery screenshots alongside search grounding to deduce mechanical and visual changes.
4. **MIM-Bot Distinct Persona (Bully Trash-Talker Gamer):** Rather than generic, sterile corporate AI prose, MIM-Bot delivers sharp, condescending, funny gamer trash-talk that roasts potato PCs and noob questions, yet provides **100% technically accurate, zero-fluff mod analysis**.

---

## 2. Core Architectural Objectives

- **Multimodal Visual Evidence:** Download up to 3-5 representative screenshots from `mod.gallery`, inject them as base64 `inlineData` parts, and instruct Gemini to cross-reference visual cues (water/shadow/sky shaders, custom HUDs, mob/biome models, setting menus).
- **On-Demand Contextual Synthesis:** Generate a crisp, structured summary in Spanish:
  - *🎮 El Resumen de MIM-Bot*: Descanso inicial + qué añade el mod.
  - *La posta*: Dato técnico impecable de loaders y compatibilidad.
  - *📸 En capturas*: Confirmación gráfica visual de las capturas oficiales.
  - *Tu tostadora*: Roast despiadado sobre rendimiento y FPS.
  - *Veredicto*: Sentencia final sobre si vale la pena o es puro humo.
- **Search-Grounded Fallback:** Query Google Search through Gemini Search Grounding (`googleSearch`) to extract real-world context from GitHub, CurseForge, Modrinth, and community wikis.
- **Client-Side Cache & Zero Redundancy:** Store synthesized summaries in local storage (`mim_explain_${projectId}`) with image counts and sources for instant 0 ms re-renders.
- **Interactive Project Mini-Chat (`chatWithProjectAssistant`):** Lightweight conversational sub-panel scoped exclusively to the open mod to answer questions about recipes, commands, compatibility, or configuration.

---

## 3. Data Flow & Execution Pipeline

```mermaid
flowchart TD
    A[User clicks 'MIM-Bot' Action Button] --> B{Cached locally in localStorage?}
    B -- Yes --> C[Render Synthesized Summary Immediately (0 ms)]
    B -- No --> D[Extract Signals: Title, Author, Slug, URLs, Loaders]
    
    D --> E[Fetch 3-5 Gallery Screenshots in Parallel (timeout 2s)]
    E --> F[Convert Screenshots to Base64 inlineData Parts]
    
    F --> G{Has Rich Description?}
    G -- Yes --> H[Gemini Multimodal Bully Prompt: Text + Images + Metadata]
    G -- No / Sparse --> I[Gemini Multimodal + Google Search Grounding]
    
    I --> J[Gemini searches Google & inspects screenshots concurrently]
    H --> K[Cascade: 2.5 Flash -> 2.0 Flash -> 1.5 Flash]
    J --> K
    
    K -->|Success| L[Synthesize Structured Bully Summary with Accurate Facts]
    K -->|Quota 429 / Offline| M[MIM-Bot Heuristic Local Fallback Generator]
    
    L --> N[Save to Local Cache: markdown, sources, imagesAnalyzed]
    M --> N
    N --> C
```

---

## 4. UI & Visual Identity (Slime Animation Branding)

- **Eliminación de Iconografía Genérica**: Se removió el emoji de rayo (`⚡`) y los iconos estándar de chispas (`<Sparkles>`).
- **Icono Slime Animado (`/icon.png`)**:
  - Tanto el botón pill de activación (`MIM-Bot`) como el badge superior y cada respuesta individual en el chat muestran el favicon animado de MIM con rebote elástico:
    ```tsx
    <img src="/icon.png" alt="" className="w-3.5 h-3.5 object-contain animate-slime shrink-0" />
    <span className="text-purple-300 font-bold">MIM-Bot</span>
    ```
  - La animación CSS `.animate-slime` aplica `@keyframes slime-squish` con `transform-origin: bottom`, logrando consistencia visual con el header principal de la app.

---

## 5. Storage Schema & Local Persistence

```typescript
interface ModExplanationCache {
  projectId: string;          // Modrinth slug or CurseForge ID
  platform: 'modrinth' | 'curseforge' | 'chunk';
  title: string;
  author: string;
  summaryMarkdown: string;    // Markdown formatted bully explanation
  groundedSources?: Array<{ title: string; url: string }>;
  searchUsed: boolean;
  imagesAnalyzed: number;
  timestamp: number;
}
```

---

## 6. Implementation Status & Verification

- [x] **Config & Key Management:** Soporte de API Key de Gemini configurable por usuario en UI (`x-gemini-key` / `mim_gemini_api_key`) y fallback seguro con mensaje guía.
- [x] **Intelligence Explainer Service (`lib/intelligence/modExplainer.ts`):** Motor multimodal unificado en `web/lib/intelligence/modExplainer.ts` y raíz `lib/intelligence/modExplainer.ts` con cascada de modelos y fallback heurístico local.
- [x] **Bully Persona Specification:** Instrucciones de sistema agresivas y humorísticas con respuestas técnicas 100% exactas tanto en síntesis como en chat interactivo.
- [x] **Interactive Mini-Chat:** Sub-panel de chat interactivo en `ModDetailsSheet.tsx` y `FomoVersionOverlay.tsx` conectado al endpoint `/api/fomo/explain` (`mode: "chat"`).
- [x] **UI Action Trigger & Slime Branding:** Botones pill y burbujas de respuesta con micro-animación `.animate-slime` y sin emojis de rayo.
- [x] **Strict Type Safety:** Interfaz `ModHit` actualizada con `slug` y `loaders`, y llamadas de Web Crypto en `vaultEngine` compatibles con TypeScript 5+.
