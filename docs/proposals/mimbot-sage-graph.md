# SAGE 3.0 & MIM-Bot Diagnostic Copilot — Deep Crash Diagnosis, FOMO Graph Intelligence, BYOK Local AI & Preventative Log Profiling

> **Document Type:** Systems Engineering Architecture & Implementation Proposal  
> **Status:** Proposal & Backlog Specification  
> **Author:** MIM Architecture Team  
> **Date:** 2026-09-03  
> **Target Systems:** SAGE Engine (`lib/intelligence/sage/`), MIM Desktop (Electron), FOMO Integration Services  

---

## 1. Visión General y Motivación

El motor de diagnóstico **SAGE 2.0** de MIM cuenta con una base determinista rigurosa: desinfección ANSI, loader fingerprinting, clasificación taxonómica con 100% de precisión en benchmarks empíricos, y guardrails RAG anti-alucinaciones. 

> [!IMPORTANT]
> **SAGE es un motor exclusivo de MIM Desktop (Electron)**. No está disponible ni opera en MIMweb (MIM Hub) dado que requiere acceso de bajo nivel al sistema de archivos del usuario (`.minecraft/`, `crash-reports/`, `logs/latest.log`, archivos NBT binarios y monitorización de procesos Java en el sistema operativo). Toda la inteligencia, claves y memoria de SAGE residen de forma 100% local y soberana en la máquina del jugador.

Sin embargo, los usuarios se enfrentan a escenarios de modding que exceden los patrones estáticos de un crash report convencional:
1. **Incompatibilidades silenciosas o no documentadas**: Mods que no declaran incompatibilidad formal en CurseForge o Modrinth pero colisionan a nivel de Mixin Injection en el bytecode.
2. **Dependencias rotas o desactualizadas**: Errores en cadena donde un mod falla no por culpa propia, sino porque una sub-dependencia requerida en el árbol transitivo está ausente o desfasada.
3. **Degradación de rendimiento y comportamientos anómalos sin crash**: Servidores y partidas locales que sufren tick-lag, spam excesivo de packets o memory leaks en `latest.log` sin llegar a generar un crash report.
4. **Falta de razonamiento avanzado y búsqueda en vivo**: Necesidad de triangular issues abiertos de GitHub, changelogs recientes y modelos de frontera (ChatGPT Pro / GPT-4o / o1 / o3-mini, Google Gemini Pro) sin comprometer la privacidad del usuario ni generar costos de infraestructura para el proyecto.

Esta propuesta define la arquitectura de **SAGE 3.0**, integrando a **MIM-Bot** como un copiloto de diagnóstico interactivo, multimodal y con lógica de descarte fundamentada en el grafo de FOMO y análisis de logs en tiempo real.

---

## 2. Pilares de Arquitectura e Innovación

### 2.1. BYOK Multi-Model AI Engine (Bring Your Own Key) & Soberanía de Datos
* **Modelos Soportados**: Integración directa con proveedores de frontera:
  - **OpenAI**: ChatGPT Pro, GPT-4o, o1, o3-mini vía API oficial.
  - **Google Cloud / AI Studio**: Gemini 1.5 Pro, Gemini 2.5 Pro con Google Search Grounding.
* **Almacenamiento Local & Seguro (Zero Cloud Leak / Sin paso por Vercel)**:
  - Las API Keys del usuario residen **estrictamente de forma local en la aplicación Electron**, encriptadas mediante la API nativa del sistema operativo (`safeStorage` de Electron / DPAPI en Windows, Keychain en macOS, Secret Service en Linux).
  - Las llamadas a OpenAI y Gemini Pro se realizan de forma directa cliente-a-proveedor (client-to-API) desde el proceso de Electron. **Ninguna API key pasa jamás por servidores intermedios de Vercel ni por la infraestructura de MIMweb.**

### 2.2. Caché Persistente Local en la App de Escritorio (Zero Token Re-Consumption)
* **Firma Criptográfica Determinista**:
  $$\text{CrashSignature} = \text{SHA-256}(\text{loader} + \text{mc\_version} + \text{normalized\_stacktrace} + \text{suspect\_mod\_ids})$$
* **Persistencia Local en Disco (`.mim-index/cache/sage-cache.json`)**:
  - Cuando el usuario ejecuta un diagnóstico con su API Key (OpenAI o Gemini Pro), el resultado enriquecido (causa raíz sintetizada, pasos de remediación, mods a actualizar o desinstalar) se persiste localmente en la caché de la aplicación de escritorio.
  - Si el mismo crash vuelve a ocurrir o se re-abre el reporte, SAGE entrega la solución al instante (**0 ms y 0 consumo de tokens de API**), garantizando máxima economía de cuota y disponibilidad offline completa.

### 2.3. Búsqueda Web en Vivo (Google Search & Issue Grounding)
* Activación automática de búsqueda web en tiempo real cuando:
  - La causa raíz pertenezca a un mod recientemente lanzado (< 30 días).
  - La excepción sea desconocida o un `MixinApplyError` sin precedentes en la base estática.
  - Se requiera verificar si existe un issue abierto o pull request con hotfix en los repositorios de GitHub de los autores del mod.

### 2.4. Inteligencia de Grafo FOMO & Motor de Descarte Lógico
* **Conexión con el Grafo de Dependencias**:
  - Consulta en tiempo real a las APIs de CurseForge y Modrinth vía FOMO para obtener el árbol completo de dependencias directas y transitivas de los mods presentes en el stack trace.
* **Árbol de Descarte Lógico (Heuristic Elimination Tree)**:
  - Prohibido el azar o las sugerencias especulativas.
  - **Paso 1 (Determinista)**: Análisis de stack trace y bytecode targets por SAGE 2.0.
  - **Paso 2 (Validación de Grafo)**: Verificación de si faltan dependencias requeridas o si alguna versión instalada está por debajo del mínimo exigido por los manifiestos.
  - **Paso 3 (Triangulación de Mixins)**: Identificación de mods que inyectan código en las mismas clases de Minecraft (ej. colisiones en `net.minecraft.client.renderer.LevelRenderer`).
  - **Paso 4 (Aislamiento de Incompatibilidades No Documentadas)**: Presentación de un plan de descarte ordenado por probabilidad matemática para que el usuario desactive secuencialmente solo los candidatos lógicamente implicados.

### 2.5. Análisis Preventivo de Logs y Salud de Runtime (Local & Servidor)
* **Ingesta Continua de Logs (`latest.log`, `debug.log`)**:
  - SAGE evoluciona de ser una herramienta post-mortem (tras el crash) a un **monitor preventivo del estado del juego**.
* **Detección de Anomalías**:
  - **Packet / Entity Spam**: Identificación de entidades desbocadas o spam de eventos que tiran los TPS en servidores.
  - **Memory Leaks & GC Stalls**: Análisis de patrones repetitivos de garbage collection antes de que ocurra un `OutOfMemoryError`.
  - **Warnings Críticos Ocultos**: Detección de fallos en registración de bloques, biomas o recipes que corrompen mundos a largo plazo.
* **Recomendaciones de Optimización de Alto Impacto**:
  - Sugerencia proactiva del stack de rendimiento óptimo según versión y loader (ej. Fabric/NeoForge: *Sodium + Lithium + FerriteCore + ModernFix + ImmediatelyFast + C2ME*).
  - Recomendación de flags de optimización JVM específicas (ZGC, Shenandoah, G1GC tuning) según la memoria RAM asignada al perfil.

---

## 3. Topología de Flujo de Datos (SAGE 3.0 + MIM-Bot)

```mermaid
flowchart TD
    subgraph Ingesta["1. Entrada de Diagnóstico"]
        CR[Crash Report / Stack Trace]
        LOGS[Runtime Logs: latest.log / debug.log]
    end

    subgraph Determinista["2. Pipeline Determinista SAGE"]
        PARSER[Parser ANSI & Normalizer]
        CLASSIF[Classifier & Culprit Scorer]
        GUARD[Guardrails RAG Anti-Alucinaciones]
    end

    subgraph LocalCache["3. Capa de Caché Local Determinista (.mim-index)"]
        HASH[SHA-256 Crash Signature]
        LOCAL_CACHE{¿Existe en Caché Local?}
        INSTANT_FIX[Entrega Inmediata desde Caché Local (0 ms / 0 tokens)]
    end

    subgraph FomoGraph["4. Inteligencia de Grafo FOMO"]
        GRAPH[FOMO Dependency Graph]
        DEPS[Verificar Dependencias Directas & JiJ]
        MIXIN[Correlación de Mixins & Colisiones]
        ELIMINATION[Árbol de Descarte Lógico]
    end

    subgraph LocalAI["5. MIM-Bot Copilot (BYOK Local - Electron)"]
        KEY_STORE[(Sovereign Vault - safeStorage OS)]
        OPENAI[OpenAI: GPT-4o / ChatGPT Pro / o1 / o3-mini]
        GEMINI[Google Gemini Pro + Search Grounding]
        FALLBACK[Local Heuristic Engine Offline]
    end

    subgraph Salida["6. Entrega y Resolución"]
        UI_REPORT[Panel Interactivo MIM-Bot]
        FIX_ACTION[Acción de 1-Click: Actualizar / Desactivar / Reparar]
        PERSIST_CACHE[Guardar en .mim-index/cache/sage-cache.json]
    end

    CR --> PARSER
    LOGS --> PARSER
    PARSER --> CLASSIF
    CLASSIF --> HASH
    HASH --> LOCAL_CACHE
    
    LOCAL_CACHE -- Sí --> INSTANT_FIX --> UI_REPORT
    LOCAL_CACHE -- No --> GUARD
    
    GUARD --> GRAPH
    GRAPH --> DEPS
    GRAPH --> MIXIN
    DEPS --> ELIMINATION
    MIXIN --> ELIMINATION
    
    ELIMINATION --> KEY_STORE
    KEY_STORE -->|Clave Configurada| OPENAI
    KEY_STORE -->|Clave Configurada| GEMINI
    KEY_STORE -->|Sin Claves| FALLBACK
    
    OPENAI --> UI_REPORT
    GEMINI --> UI_REPORT
    FALLBACK --> UI_REPORT
    
    UI_REPORT --> FIX_ACTION
    UI_REPORT -.->|Persistir Resultado| PERSIST_CACHE
    PERSIST_CACHE -.-> LOCAL_CACHE
```

---

## 4. Diseño del Copiloto MIM-Bot en SAGE

### 4.1. Modos de Personalidad
* **Modo Bully Gamer (Por Defecto)**:
  - Fiel a la identidad de MIM-Bot: roastea al usuario por meter 300 mods en una laptop tostadora con 4GB de RAM o por combinar mods incompatibles archiconocidos (ej. *"¿En serio le pusiste OptiFine a Fabric 1.20.1 en 2026? Mereces que se te queme la gráfica"*), pero **inmediatamente entrega la solución técnica 100% exacta y sin rodeos**.
* **Modo Pro Engineer (Toggle Configurable)**:
  - Tono sobrio, directo, enfocado en administración de servidores y debugging profesional.

### 4.2. Acciones de Reparación en 1-Clic
El informe interactivo de MIM-Bot no se limita a texto, sino que despliega botones de acción reactivos dentro de Electron:
- `[Descargar Dependencia Faltante]`: Descarga automática desde Modrinth/CurseForge a la carpeta `mods/`.
- `[Desactivar Candidato Sospechoso]`: Renombra el archivo a `.disabled` sin borrar el archivo.
- `[Aplicar Stack de Optimización Recomendado]`: Instala los mods de rendimiento sugeridos para el loader activo.

---

## 5. Plan de Implementación por Fases

| Fase | Alcance Técnico | Entregables Principales |
| :--- | :--- | :--- |
| **Fase 1: Conexión FOMO Graph** | Integración del grafo de dependencias de CurseForge/Modrinth en el pipeline de SAGE. | `lib/intelligence/sage/fomoCorrelator.ts`, detección de dependencias y colisiones. |
| **Fase 2: Motor BYOK Local** | Almacenamiento seguro de llaves en Electron con `safeStorage` y conectores directos a OpenAI/Gemini. | `lib/intelligence/ai/byokClient.ts`, soporte GPT-4o, ChatGPT Pro, Gemini Pro. |
| **Fase 3: Caché Persistente Local** | Generación de firmas deterministas SHA-256 de crash y serialización concurrente segura en disco. | `lib/intelligence/sage/cacheEngine.ts`, `.mim-index/cache/sage-cache.json`. |
| **Fase 4: Profiler de Logs Vivos** | Parser de streaming para `latest.log` y `debug.log`, detector de packet spam y tick-lag. | `lib/intelligence/sage/logProfiler.ts`, recomendaciones de JVM y rendimiento. |
| **Fase 5: UI & MIM-Bot Chat** | Panel interactivo de chat en el módulo de SAGE de Electron con acciones en 1-clic. | Componente `SageCopilotPanel.tsx` con integración de animaciones y slime branding. |

---

## 6. Consideraciones de Seguridad y Privacidad

1. **Aislamiento de Claves (Strict Zero-Trust)**:
   - Las llaves privadas de OpenAI y Google nunca se guardan en cookies, no se pasan como query parameters, no se guardan en Git y **nunca se envían al backend web de Vercel**.
2. **Anonimización Rigurosa de Reportes**:
   - Todo path de Windows/Linux (`C:\Users\<username>\...`) es sustituido por tokens genéricos (`<USER_DIR>/...`).
   - IPs de servidores, tokens de sesión de Minecraft y UUIDs de jugadores son eliminados antes de cualquier cómputo de hash o consulta a modelos de IA.
