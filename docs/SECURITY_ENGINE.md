# Static Security Engine — Threat Detection Specification

> **Module:** `lib/security/security-scanner.ts` & `lib/security/security-data.ts`  
> **Classification:** Application Security (AppSec) / Static Bytecode Analysis  
> **Target Threat Profile:** Java Bytecode Malware, Supply-Chain Infestation (e.g. Fractureiser, Necro, BleedingPipe), Unauthorized System Execution.

---

## 🛡️ Pipeline Architecture

The Security Engine executes zero-execution static inspection of incoming Minecraft archives (`.jar`, `.zip`):

```
                       Target Mod (.jar)
                              │
                              ▼
                 [Stage 1: Manifest & Hash Audit]
                 • Compute SHA-1 and SHA-256 digests
                 • Compare against Known Malware Blacklist
                 • Check Community-Verified Whitelist
                              │
               ┌──────────────┴──────────────┐
          Known Malware?               Whitelisted?
               │                             │
          Threat: 100/100              Threat: 0/100
          (Instant Abort)              (Clean Pass)
               │                             │
               └──────────────┬──────────────┘
                              │ Proceed to Static Inspection
                              ▼
              [Stage 2: Archive & Class Extraction]
              • Inflate ZIP entry table in memory
              • Filter for compiled .class bytecode files
              • Compute Obfuscation Index (ratio of mangled names)
                              │
                              ▼
            [Stage 3: AST Pattern & Bytecode Scanning]
            • Process Execution (Runtime.exec, ProcessBuilder)
            • Native Code Loading (System.load, JNIEnv)
            • Network Exfiltration (Socket, HttpURLConnection)
            • Reflection Evasion (setAccessible, defineClass)
            • Filesystem Destruction (Mass delete, AppData access)
            • Shell Invocation (PowerShell, cmd.exe, bash)
                              │
                              ▼
             [Stage 4: Threat Scoring & Evidence Trail]
             $$\text{Raw Score} = \sum (\text{Rule Weight} \times \text{Occurrences})$$
             • VirusTotal Cloud Enrichment (background fallback)
             • Deduplicate findings with exact class origins
                              │
                              ▼
                    SecurityScanResult (JSON)
```

---

## 🔍 Threat Taxonomy & Scoring Matrix

| Category | Severity | Weight | Pattern Signatures | Risk Rationale |
|:---|:---:|:---:|:---|:---|
| **Process Execution** | Critical | **25 pts** | `Runtime.getRuntime().exec()`, `ProcessBuilder` | Spawns external operating system binaries; highly anomalous for game logic. |
| **Shell Invocation** | Critical | **20 pts** | `powershell.exe`, `cmd.exe`, `bash -c` | Command-line execution indicating shell dropper or staging payload. |
| **Native Library Load** | High | **20 pts** | `System.loadLibrary()`, `System.load()`, JNI | Executes unmanaged native code (.dll / .so), bypassing JVM memory safety. |
| **Reflection Evasion** | High | **15 pts** | `setAccessible(true)`, `ClassLoader.defineClass()` | Bypasses Java accessibility modifiers to inspect private fields or dynamically inject byte arrays. |
| **Mass Deletion** | High | **12 pts** | `Files.walk().delete()`, `FileUtils.deleteDirectory()` | Capability to wipe user files outside sandbox. |
| **Network Sockets** | Medium | **10 pts** | `java.net.Socket`, raw TCP connection | Direct socket communication outside Minecraft's protocol handler. |
| **Obfuscation Ratio** | High | **20 pts** | `> 50%` single-letter or mangled class names | High obfuscation density attempting to hide malicious bytecode. |

---

## 📊 Structured Evidence Output Example

When an archive is scanned, the engine produces an itemized audit trail:

```json
{
  "riskScore": 78,
  "riskLevel": "suspicious",
  "sha1": "7a8b9c...",
  "sha256": "3d4e5f...",
  "findings": [
    {
      "category": "process_execution",
      "severity": "critical",
      "description": "Executes system commands via Runtime.exec()",
      "scoreImpact": 25,
      "details": ["com/suspicious/mod/Payload.class"]
    },
    {
      "category": "suspicious_string",
      "severity": "critical",
      "description": "Shell command invocations: powershell",
      "scoreImpact": 20,
      "details": ["com/suspicious/mod/Downloader.class"]
    },
    {
      "category": "reflection_abuse",
      "severity": "high",
      "description": "Bypasses access modifiers via reflection",
      "scoreImpact": 15,
      "details": ["com/suspicious/mod/ReflectHelper.class"]
    }
  ],
  "summary": "SUSPICIOUS: 3 findings detected.",
  "whitelisted": false
}
```

---

## ⚡ Concurrency & Rate Limiting

- **Parallel Worker Pools:** Batch scanning (`scanSecurityBatch`) utilizes bounded concurrency (5 files per batch) to avoid I/O bottlenecks and memory exhaustion on large modpacks.
- **VirusTotal Rate-Limiting:** Background API requests are cached in `.mim-index/cache/vt-cache.json` to respect external rate quotas (4 requests/minute free-tier ceiling).
