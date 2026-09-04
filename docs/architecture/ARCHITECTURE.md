# MIM System Architecture & Engineering Blueprint

Este documento describe la topología, arquitectura de software, ciclo de vida de datos y contratos de integración de **MIM (Minecraft Intelligent Manager)**. Su objetivo es brindar una referencia técnica completa que garantice la mantenibilidad, escalabilidad y la mitigación del *bus factor* para cualquier desarrollador o auditor externo.

---

## 1. Topología del Sistema y Ecosistema

MIM opera como una plataforma híbrida compuesta por dos clientes y un backend perimetral:

```mermaid
graph TD
    subgraph ClientLayer["Superficie de Clientes"]
        Desktop["MIM Desktop (Electron + Next.js App)"]
        Web["MIMweb (Next.js 14 / Edge en Vercel)"]
    end

    subgraph DefensePerimeter["Perímetro Defensivo (MIMweb)"]
        EdgeMW["Edge Middleware (web/middleware.ts)<br/>HSTS, CSP, Nosniff, Method Guard"]
        ApiGuard["API Guard Universal (web/lib/apiGuard.ts)<br/>Sliding-Window IP Rate Limiter & Zod Validation"]
    end

    subgraph CoreEngines["Motores Core del Dominio"]
        Aduana["Aduana Storage Engine (lib/storage)<br/>SHA-256 Deduplication, Hardlinks & Atomic Staging"]
        SAGE["SAGE 2.0 Diagnostic Engine (lib/intelligence/sage)<br/>ANSI Stripping, Fingerprinting, Scoring, RAG"]
        Security["Security Scanner (lib/security)<br/>Static Bytecode Analysis & Threat Signatures"]
        LicenseAudit["License Auditor (lib/modding/licenseAuditor.ts)<br/>Redistribution & Copyright Classification"]
    end

    subgraph ExternalServices["Servicios y APIs Externas"]
        CurseForge["CurseForge Core API v1"]
        Modrinth["Modrinth API v2/v3"]
        Gemini["Google Gemini 1.5 / 2.0 API"]
        OfficialTrans["Translation Providers (DeepL / Google / Libre)"]
        Supabase["Supabase DB (MIM Community Sync)"]
    end

    Desktop --> Aduana
    Desktop --> SAGE
    Desktop --> Security
    Desktop --> LicenseAudit

    Web --> EdgeMW
    EdgeMW --> ApiGuard
    ApiGuard --> CurseForge
    ApiGuard --> Modrinth
    ApiGuard --> Gemini
    ApiGuard --> OfficialTrans
    ApiGuard --> Supabase
```

---

## 2. Arquitectura Defensiva de API (Defense-in-Depth)

Todas las rutas públicas de MIMweb (`web/app/api/*`) implementan un modelo de seguridad por capas en profundidad:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Cliente / Navegador
    participant MW as Edge Middleware (web/middleware.ts)
    participant Guard as withApiGuard (web/lib/apiGuard.ts)
    participant Limiter as In-Memory Sliding Limiter
    participant Zod as Esquema Zod (Query/Body)
    participant Route as Route Handler Interno
    participant Provider as Proveedor Externo

    Client->>MW: HTTP Request (/api/*)
    Note over MW: Inyección HSTS, nosniff, frame-deny, CORS
    MW->>Guard: Pasa solicitud sanitizada
    Guard->>Limiter: checkRateLimit(clientIp)
    alt Cuota excedida
        Limiter-->>Client: HTTP 429 Too Many Requests (Retry-After, X-RateLimit-*)
    else Cuota válida
        Guard->>Zod: safeParse(params / body)
        alt Parámetros inválidos
            Zod-->>Client: HTTP 400 Bad Request (JSON de issues)
        else Payload validado
            Guard->>Route: Ejecuta handler tipado
            Route->>Provider: Consume API externa segura
            Provider-->>Route: Respuesta upstream
            Route-->>Guard: Genera Response
            Guard-->>Client: HTTP 200 OK (Cabeceras de defensa inyectadas)
        end
    end
```

### Componentes Clave:
- **`web/middleware.ts`**: Aplica filtrado de métodos HTTP autorizados (`GET`, `POST`, `OPTIONS`, `HEAD`), preflight de CORS y encabezados de protección universal (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **`web/lib/apiGuard.ts`**: Higher-Order Function `withApiGuard` que encapsula:
  - Extracción robusta de IP considerando proxies (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`).
  - Rate limiting en memoria con ventana deslizante (default: 60 req/min para búsquedas, 20 req/min para IA y traducción).
  - Validación y coercitividad tipada con esquemas Zod tanto para Query (`querySchema`) como para Body (`bodySchema`).
  - Captura y manejo seguro de excepciones sin fuga de stack traces internos.

---

## 3. Pipeline de Diagnóstico SAGE 2.0

SAGE (Systemic Automated Guidance & Evaluation) procesa logs de errores y crash dumps de Minecraft:

```mermaid
flowchart LR
    CrashLog["Log Crudo (.log / .txt)"] --> ANSI["1. ANSI Cleaner<br/>parser.ts"]
    ANSI --> Fingerprint["2. Fingerprinting Loader<br/>Forge / Fabric / NeoForge / Quilt"]
    Fingerprint --> TraceExtract["3. Extractor de Stack Frames<br/>Exception & Root Cause Isolation"]
    TraceExtract --> Classifier["4. Classifier & Scorer<br/>classifier.ts / scorer.ts"]
    Classifier --> Taxonomy["5. Core Taxonomy Matcher<br/>OOM, Mixin Conflict, Incompat"]
    Taxonomy --> RAG["6. Guardrails & Knowledge RAG<br/>Soluciones Validadas"]
    RAG --> Diagnosis["Reporte Diagnóstico Estructurado"]
```

---

## 4. Motor de Almacenamiento y Deduplicación Aduana

Aduana gestiona el almacenamiento masivo de mods, modpacks, shaders y resourcepacks con cero duplicación física en disco:

```mermaid
flowchart TD
    FileIn["Archivo Descargado (JAR / ZIP)"] --> Hash["Cálculo SHA-256 en Stream"]
    Hash --> DedupeCheck{"¿Existe Hash en Vault?"}
    DedupeCheck -- Sí --> Hardlink["Genera Hardlink / Symlink<br/>(0 bytes de espacio adicional)"]
    DedupeCheck -- No --> StoreVault["Mueve a Storage Vault Central<br/>(/lib/.mim-index/vault)"]
    StoreVault --> RegisterIndex["Registra Metadata en SQLite/Index"]
    Hardlink --> AtomicStaging["Atomic Staging en Perfil de Juego"]
    RegisterIndex --> AtomicStaging
```

---

## 5. Motor de Amenazas y Seguridad (Security Scanner)

El pipeline de análisis de seguridad de archivos JAR de terceros opera en 4 fases:

1. **Chequeo de Hash Inmediato**: Comparación contra la base de datos de 19 firmas de amenazas conocidas de alto impacto (Fracturiser, Necro RAT, etc.).
2. **Caché y Consulta VirusTotal**: Conexión con VT API v3 con caché local persistente en `lib/.mim-index/cache/vt-cache.json` para minimizar consumo de cuotas.
3. **Análisis Estático de Bytecode**: Inspección profunda de archivos `.class` dentro del archivo ZIP/JAR buscando invocaciones reflectivas sospechosas (`Runtime.getRuntime().exec`, `ProcessBuilder`, sockets de red ocultos, payloads ofuscados).
4. **Auditoría de Licencias y Redistribución**: Clasificación automática del archivo (`PERMISSIVE`, `COPYLEFT`, `RESTRICTED`, `UNKNOWN`) advirtiendo sobre cláusulas restrictivas o "All Rights Reserved" antes de empaquetar modpacks.

---

## 6. Convenciones de Código y Estándares del Proyecto

- **Sin Carpeta `src`**: Todo el código principal vive en la raíz (`app/`, `web/`, `lib/`, `components/`, `hooks/`, `services/`).
- **Límite de Modularidad**: Ningún componente debe superar **600 líneas de código funcional** (sin contar comentarios ni interfaces de documentación).
- **Testing Headless**: La verificación se realiza mediante `npm test` ejecutando las 10 suites especializadas de `scripts/test-runner.js`.
- **Verificación Visual**: Reservada exclusivamente para el desarrollador humano (sin subagentes de navegador ni capturas de pantalla invasivas).
