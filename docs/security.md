# MIM — Security Layer Documentation
> **Threat Detection Engine v1.0**

## Overview

El Security Layer de MIM proporciona análisis de comportamiento de archivos JAR para detectar patrones potencialmente maliciosos antes de la instalación.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Security Layer                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────┐     ┌───────────────────┐     ┌─────────────────┐ │
│  │  JAR Input        │────▶│  Bytecode         │────▶│  Risk Scoring   │ │
│  │  (source/builds)  │     │  Analyzer         │     │  Engine         │ │
│  └───────────────────┘     └───────────────────┘     └─────────────────┘ │
│          │                         │                          │          │
│          ▼                         ▼                          ▼          │
│  ┌───────────────────┐     ┌───────────────────┐     ┌─────────────────┐ │
│  │  Hash Checker     │     │  Pattern Matcher  │     │  Findings DB    │ │
│  │  (Known Malware)  │     │  (100+ patterns)  │     │  (Categorized)  │ │
│  └───────────────────┘     └───────────────────┘     └─────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │  API Response     │
                          │  /api/security/scan│
                          └───────────────────┘
```

---

## Sistema de Scoring (0-100)

| Score | Nivel | Acción Recomendada |
|-------|-------|-------------------|
| 0-30 | 🟢 **Clean** | Instalación segura |
| 31-60 | 🟡 **Caution** | Revisar hallazgos antes de instalar |
| 61-85 | 🟠 **Suspicious** | Verificación manual requerida |
| 86-100 | 🔴 **Critical** | Bloquear inmediatamente — Probable malware |

---

## Categorías de Amenazas Detectadas

### 🔴 Process Execution (Peso: 25)
- `Runtime.exec()` — Ejecuta comandos del sistema
- `ProcessBuilder` — Crea procesos externos
- **Impacto:** Máximo riesgo — Permite ejecutar cualquier código

### 🟠 Native Code (Peso: 20)
- `System.loadLibrary()` — Carga DLLs/SOs
- JNI (Java Native Interface) — Código nativo
- **Impacto:** Bypass de seguridad de Java, acceso directo al sistema

### 🟡 Reflection Abuse (Peso: 15)
- `setAccessible(true)` — Acceso a campos privados
- `defineClass()` — Carga dinámica de clases
- `MethodHandles` — Manipulación avanzada
- **Impacto:** Puede usarse para exploits o compatibilidad legítima

### 🟡 Network Calls (Peso: 15)
- `URL.openConnection()` — Conexiones HTTP/HTTPS
- `Socket` — Conexiones de red directas
- `HttpClient` — Cliente moderno HTTP
- **Impacto:** Común en mods legítimos (update checks), pero puede ser exfiltración

### 🟡 Obfuscation (Peso: 10)
- Nombres de clase cortos/random (`a.class`, `b$c.class`)
- Encriptación de strings en runtime
- Control flow obfuscation
- **Impacto:** Puede indicar protección IP o esconder código malicioso

### 🟡 File System (Peso: 10)
- Borrado masivo de archivos
- Escritura fuera de `.minecraft`
- **Impacto:** Podría destruir datos del usuario

### 🔵 Manifest Anomalies (Peso: 3)
- JARs sin metadata de mod estándar
- Contiene ejecutables (.exe, .bat) + clases Java
- **Impacto:** Indicador débil pero sospechoso

---

## API Usage

### Single File Scan
```bash
POST /api/security/scan
Content-Type: application/json

{
  "filePath": "D:\\.mine\\source\\1.20.1\\forge\\.essential\\tech\\create-1.20.1.jar"
}
```

**Response:**
```json
{
  "success": true,
  "batch": false,
  "result": {
    "riskScore": 15,
    "riskLevel": "clean",
    "sha1": "a1b2c3d4e5f6...",
    "findings": [
      {
        "category": "network_call",
        "severity": "medium",
        "description": "Makes HTTP/HTTPS connections",
        "scoreImpact": 8
      }
    ],
    "summary": "Low-risk patterns detected. Review findings before installing.",
    "scannedAt": "2026-05-04T23:45:00.000Z"
  }
}
```

### Batch Scan
```bash
POST /api/security/scan
Content-Type: application/json

{
  "filePaths": [
    "D:\\.mine\\source\\1.20.1\\forge\\.essential\\...\\mod1.jar",
    "D:\\.mine\\source\\1.20.1\\forge\\.essential\\...\\mod2.jar"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "batch": true,
  "results": [...],
  "highestRisk": {...},
  "summary": "Scanned 2 files. 1 suspicious file found."
}
```

---

## Files del Sistema

| File | Propósito |
|------|-----------|
| `lib/security-scanner.ts` | Motor de análisis y scoring |
| `lib/types.ts` | Tipos TypeScript (SecurityScanResult, etc.) |
| `app/api/security/scan/route.ts` | Endpoint API |
| `docs/security.md` | Esta documentación |

---

## Patrones Detectados (Bytecode Analysis)

El scanner analiza bytecode Java buscando:

1. **Llamadas a Runtime.exec()** — Ejecución de shell commands
2. **Carga de librerías nativas** — DLL injection risk
3. **Abuso de reflection** — Bypass de seguridad
4. **Conexiones de red** — Potential data exfiltration
5. **Ofuscación extrema** — Intentos de ocultar comportamiento
6. **Strings sospechosos** — `powershell`, `cmd.exe`, `keylogger`, etc.

---

## Base de Datos de Malware Conocido

```typescript
const KNOWN_MALWARE_HASHES: Set<string> = new Set([
  // SHA-1 hashes de malware conocido
  // Actualizar regularmente desde fuentes como:
  // - VirusTotal
  // - URLhaus
  // - Community submissions
]);
```

**Nota:** El sistema está diseñado para integrarse con bases de datos externas de hashes de malware.

---

## Roadmap de Mejoras

### v1.1 — Mejoras Inmediatas
- [ ] Base de datos de hashes actualizable vía API
- [ ] Whitelist de mods verificados (Modrinth/CurseForge checksums)
- [ ] UI para mostrar risk score en ModCard

### v1.2 — Análisis Avanzado
- [ ] Decompilación parcial para análisis de flujo
- [ ] Detección de C2 (Command & Control) patterns
- [ ] Behavioral analysis simulation

### v2.0 — Integración ML
- [ ] Modelo de ML entrenado en dataset de mods limpios vs malware
- [ ] Reducción de falsos positivos
- [ ] Clasificación automática de intención (legítima vs maliciosa)

---

## Regla de Oro de Seguridad

> **"Nunca confíes, siempre verifica"**

Incluso los mods populares pueden comprometerse. El Threat Detection Engine proporciona una capa adicional de protección, pero:

- Descarga solo de fuentes oficiales (Modrinth, CurseForge)
- Mantén el sistema y Java actualizados
- Usa backups de tus mundos
- Reporta mods sospechosos a la comunidad

---

*MIM Threat Detection Engine — Hecho con ⚡ por desarrolladores paranoicos*
