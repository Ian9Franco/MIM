# MIM — Application Security & Threat Model Specification

> **Classification:** Application Security (AppSec) / Software Supply-Chain Defense  
> **Methodology:** STRIDE Threat Modeling Framework & Attack Tree Analysis  
> **Target Environment:** Java Virtual Machine (JVM), Desktop Modpack Client, Cloud Sync Infrastructure  
> **Reference Benchmark:** The 2023 CurseForge/Modrinth *Fractureiser* Malware Outbreak

---

## 🎯 Threat Modeling Scope & Assets

MIM operates as a desktop management platform executing on user workstations with access to local filesystems, `.minecraft` configurations, and Supabase cloud synchronization.

### Critical Assets at Risk:
1. **Host Operating System Integrity:** Protection against unmanaged binary execution, ransomware droppers, and shell escalation.
2. **User Authentication Secrets:** Minecraft session bearer tokens, Microsoft OAuth credentials, Supabase JWTs, and local environment variables.
3. **Player Save Data & World Files:** Binary NBT state (`playerdata/*.dat`, `level.dat`) representing hundreds of hours of game progress.
4. **Network Bandwidth & Compute:** Protection against crypto-mining or distributed botnet agents embedded in JAR archives.

---

## 🛡️ STRIDE Threat Matrix & Defenses

| STRIDE Category | Threat Scenario in Modding Ecosystem | MIM Vulnerability Surface | Implemented Mitigation in MIM | Defense Status |
|:---|:---|:---|:---|:---:|
| **Spoofing** | **T-01:** Attacker uploads malware named `sodium-mc1.20.1-0.5.8.jar` with malicious payload. | User downloads mod based solely on filename. | **Content-Addressed Hashing (Aduana):** Compares SHA-512 cryptographic digests against official upstream provider hashes; filenames are strictly hints, never proof of identity. | 🟢 Mitigated |
| **Tampering** | **T-02:** Corrupted world chunk or malicious NBT file causes host JVM crash or data destruction. | In-place file edits during player recovery. | **Zero-Loss Invariant (NBT Rescue):** Mandatory `.mim_bak` snapshot flushed before any byte is modified. Writes go to `.tmp` buffers validated against RFC 1952 Gzip headers prior to atomic renaming. | 🟢 Mitigated |
| **Repudiation** | **T-03:** User or admin cannot determine which mod introduced suspicious network sockets or process calls. | Anonymous file additions in large modpacks. | **Itemized Evidence Audit Trail:** Security Engine attributes every AST pattern match to the exact `.class` file inside the ZIP archive with line-level details. | 🟢 Mitigated |
| **Information Disclosure** | **T-04:** Mod extracts browser cookies, Discord tokens, or Minecraft `launcher_accounts.json` via HTTP. | Arbitrary Java socket and HTTP client creation. | **Static Bytecode AST Rules:** Flags `java.net.Socket`, raw TCP streams, and anomalous HTTP clients; scores against community-verified mod whitelists. | 🟢 Mitigated |
| **Denial of Service** | **T-05:** ZipBomb or recursive compression archive causes host Out-Of-Memory (OOM) or disk exhaustion. | Decompressing massive archives during scanning. | **I/O Guardrails:** Aduana and Security Engine enforce strict file ceilings (archives $> 500\text{ MB}$ bypass full in-memory decompression) and bounded concurrency (5 files/chunk). | 🟢 Mitigated |
| **Elevation of Privilege** | **T-06:** Stage-1 dropper executes `Runtime.getRuntime().exec("powershell -Command ...")` or drops native `.dll` via JNI. | Java mods executing unmanaged native commands. | **Static Threat Engine:** Critical rules flag `ProcessBuilder`, `Runtime.exec`, `System.loadLibrary`, and shell command strings before the mod is ever placed in the active game directory. | 🟢 Mitigated |

---

## 🌲 Attack Tree Analysis: Java Supply-Chain Attack (Fractureiser Model)

```
Goal: Execute Malicious Payload on Player Host Machine
├── 1. Infiltrate Modpack Distribution
│   ├── A. Compromise Developer CurseForge/Modrinth Account (Upstream)
│   └── B. Spoof Popular Mod Name on Third-Party Mirrors
│
├── 2. Circumvent Client-Side Verification
│   ├── A. Rely on Filename Identity (Exploits lack of hash verification)
│   │   └── [DEFENSE: Aduana rejects mismatch via SHA-512 / SHA-1 checksums]
│   └── B. Conceal Malicious Logic in Compiled Bytecode
│       └── [DEFENSE: Security Engine extracts and decompiles .class entries]
│
└── 3. Execute Dropper on Victim Machine
    ├── A. Spawn Shell Process via Runtime.exec / ProcessBuilder
    │   └── [DEFENSE: Security Engine flags Process Execution -> Critical (Score +25)]
    ├── B. Load Unmanaged Native Library (.dll / .so via JNI)
    │   └── [DEFENSE: Security Engine flags Native Code Load -> High (Score +20)]
    └── C. Establish Reverse Shell via Raw TCP Socket
        └── [DEFENSE: Security Engine flags Network Socket -> Medium (Score +10)]
```

---

## 🔒 Defense-in-Depth Implementation

```
Incoming Mod (.jar)
         │
         ▼
[Layer 1: Cryptographic Digest] ──> Reject if hash diverges from Modrinth/CurseForge manifest
         │
         ▼
[Layer 2: Static Bytecode AST]   ──> Decompress .class files; evaluate STRIDE threat patterns
         │
         ▼
[Layer 3: Threat Score (0-100)] ──> Composite scoring with weighted severity
         │
         ▼
[Layer 4: Cloud Intelligence]   ──> VirusTotal multi-engine hash enrichment (rate-limited cache)
         │
         ▼
[Layer 5: Decision Barrier]     ──> Clean (0-30) | Caution (31-60) | Suspicious (61-85) | Critical (86-100)
```

---

## ⚠️ Residual Risks & Operational Limitations

1. **Pure String Encryption / Dynamic Obfuscation:** Heavily encrypted reflection payloads using AES/XOR strings cannot always be demangled via static heuristics alone without dynamic runtime instrumentation (JVM Sandboxing / Agent).
2. **Third-Party API Dependency:** VirusTotal enrichment is constrained by public API quotas (4 req/min); background rate-limiting and local SQLite/JSON caching mitigate starvation.

---

## 🛡️ Dynamic Application Security Testing (DAST) & Live Traffic Pentesting

Beyond zero-execution static bytecode analysis, active cloud and web surface endpoints (`mim-hub.vercel.app`) undergo continuous dynamic testing:

### 1. Automated Baseline DAST Runner (`scripts/security/dast-scan.js`)
- **HTTP Hardening Audit:** Evaluates CSP, HSTS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
- **CORS Misconfiguration:** Verifies strict rejection of arbitrary origins on stateful and translation routes.
- **Rate-Limiter Boundary:** Asserts HTTP 429 throttling and `Retry-After` headers under traffic spikes.

### 2. Live Environment Scanning Specifications
- **OWASP ZAP Baseline Scan:**
  ```bash
  docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
    -t https://mim-hub.vercel.app -r docs/security/zap-baseline-report.html
  ```
- **ProjectDiscovery Nuclei Vulnerability Assessment:**
  ```bash
  nuclei -u https://mim-hub.vercel.app \
    -tags cve,misconfig,exposure,rate-limit -severity medium,high,critical
  ```

### Acceptance Criteria:
- **Zero Critical / High Severity Findings:** Any reported injection, privilege escalation, or CORS bypass halts release staging.
- **Idempotent Rate Limiting:** Public proxy routes must never pass upstream traffic unbounded.

