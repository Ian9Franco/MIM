# MIM Intelligent Project Explainer — Architecture Proposal for On-Demand Mod Synthesis & Public Search Grounding

> **Document Type:** Systems Engineering Architecture Proposal  
> **Status:** Proposed / Backlog Design  
> **Author:** MIM Architecture Team  
> **Date:** 2026-09-03  
> **Target Systems:** MIM Desktop (Electron), MIMweb (FOMO Hub), ModDetailsSheet, ModCard  

---

## 1. Context & Motivation

In the Minecraft modding ecosystem, hundreds of mods, resource packs, shaders, and Bedrock add-ons have incomplete, outdated, or completely missing descriptions on CurseForge and Modrinth (e.g., projects that only state *"dependency for my other mod"* or have an empty README).

Users currently have to manually leave the app, open Google, search for the author, repository, or Reddit threads to understand what a mod actually does and whether it is safe or relevant for their modpack.

### Guiding Engineering Principles
1. **On-Demand Utility (Non-Automatic):** In accordance with the *MIM Golden Rule ("Never build a chatbot assistant; build concrete tools")*, the explainer must be triggered explicitly via a dedicated action button (identical to the existing translation button), without ambient background token consumption.
2. **Public / Serverless Architecture & Model Decoupling:** Zero requirement for dedicated stateful backend servers. Operates via public Gemini Multimodal REST endpoints with decoupled model resolution (`DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"`, configurable via `GEMINI_MODEL` env or settings) and client-side key storage or lightweight edge routes.
3. **Multimodal Triangulation (Metadata + Google Search + Gallery Evidence):** When descriptions are absent, minimal, or purely visual (e.g. shaders, textures, HUD mods), the engine inspects 3-5 official gallery screenshots alongside search grounding to deduce mechanical and visual changes.

---

## 2. Core Architectural Objectives

- **Multimodal Visual Evidence:** Download up to 4-5 representative screenshots from `mod.gallery`, inject them as base64 `inlineData` parts, and instruct Gemini to cross-reference visual cues (water/shadow/sky shaders, custom HUDs, mob/biome models, setting menus).
- **On-Demand Contextual Synthesis:** Generate a crisp, structured summary in Spanish:
  - *¿Qué hace?* (Función principal).
  - *Ámbito y Categoría* (Cliente / Servidor / Ambos; Shaders, Contenido, Rendimiento).
  - *Evidencia Visual (Galería Oficial)* (Confirmación gráfica de lo observado en capturas).
  - *Aspectos Clave* (Viñetas técnicas).
- **Search-Grounded Fallback:** Query Google Search through Gemini Search Grounding (`googleSearch`) to extract real-world context from GitHub, CurseForge, Modrinth, and community wikis.
- **Client-Side Cache & Zero Redundancy:** Store synthesized summaries in local storage (`mim_explain_${projectId}`) with image counts and sources for instant 0 ms re-renders.

---

## 3. Data Flow & Execution Pipeline

```mermaid
flowchart TD
    A[User clicks 'Explicar con IA' Button] --> B{Cached locally?}
    B -- Yes --> C[Render Synthesized Summary Immediately (0 ms)]
    B -- No --> D[Extract Available Signals: Title, Author, Slug, URLs, Loaders]
    
    D --> E[Fetch 3-5 Gallery Screenshots in Parallel (timeout 2.5s)]
    E --> F[Convert Screenshots to Base64 inlineData Parts]
    
    F --> G{Has Rich Description?}
    G -- Yes --> H[Gemini Multimodal Prompt: Text + Images + Metadata]
    G -- No / Sparse --> I[Gemini Multimodal + Google Search Grounding]
    
    I --> J[Gemini searches Google & inspects screenshots concurrently]
    H --> K[Synthesize Structured Spanish Summary with Visual Evidence]
    J --> K
    
    K --> L[Save to Local Cache: markdown, sources, imagesAnalyzed]
    L --> C
```

---

## 4. API & Integration Design

### A. Gemini Public API Request Schema
Direct call to Google Gemini Flash API (`v1beta/models/gemini-1.5-flash:generateContent` or `gemini-2.0-flash`):

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Explica de forma concisa y profesional qué hace este mod de Minecraft. Si no hay descripción, investiga con Google Search usando el nombre, autor y enlaces provistos.\n\nNombre: Sodium Extra\nAutor: FlashyReese\nSlug: sodium-extra\nEnlaces: https://github.com/FlashyReese/sodium-extra\nDescripción actual: (vacía)"
        }
      ]
    }
  ],
  "tools": [
    {
      "google_search": {}
    }
  ],
  "generationConfig": {
    "temperature": 0.2,
    "maxOutputTokens": 600
  }
}
```

### B. UI Integration in `ModDetailsSheet.tsx` & `FomoModCard.tsx`
- Adds an **"✨ Explicar con IA"** button alongside the existing **"🌐 Traducir"** button.
- Displays loading spinner with animated shimmer skeleton during grounding retrieval (< 1.2s).
- Formats output with high-readability tags: *¿Qué hace?*, *¿Dónde se instala?* (Cliente/Servidor), *Aspectos clave*.

---

## 5. Storage Schema (IndexedDB / Local Cache)

```typescript
interface ModExplanationCache {
  projectId: string;          // Modrinth slug or CurseForge ID
  platform: 'modrinth' | 'curseforge' | 'custom';
  title: string;
  author: string;
  summary: string;           // Markdown / HTML formatted explanation
  groundedSources?: string[]; // URLs cited by Google Search Grounding
  timestamp: number;         // Epoch timestamp for TTL expiration (e.g. 30 days)
}
```

---

## 6. Implementation Checklist

- [ ] **Config & Key Management:** Add optional user API key field in Settings modal / LocalStorage (`MIM_GEMINI_API_KEY`) or fallback to embedded public proxy endpoint.
- [ ] **Intelligence Explainer Service (`lib/intelligence/modExplainer.ts`):** Module for query formulation, search grounding request, and error handling.
- [ ] **UI Action Trigger:** Connect "Explicar con IA" button in `ModDetailsSheet.tsx` and `ModCard.tsx`.
- [ ] **Cache Layer:** IndexedDB persistence with `mim_mod_explanations` store.
