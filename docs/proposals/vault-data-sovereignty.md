# MIM Sovereign Vault — Architecture Proposal for Account Recovery & Data Sovereignty

> **Document Type:** Systems Engineering Architecture Proposal  
> **Status:** Proposed / Backlog Design  
> **Author:** MIM Architecture Team  
> **Date:** 2026-09-03  
> **Target Systems:** MIM Desktop (Electron), MIMweb (FOMO Hub PWA), Supabase Infrastructure  

---

## 1. Context & Motivation

MIM orchestrates distributed user state across local clients (IndexedDB, local filesystem) and cloud infrastructure (Supabase PostgreSQL, Realtime WebSockets). 

While Supabase provides real-time collaboration and cross-device sync, relying exclusively on remote cloud infrastructure introduces critical points of failure:

1. **Cloud Provider Dormancy (PaaS Lifecycle):** Free-tier Supabase projects enter a paused state after 7 days of inactivity. If a user returns after months, their cloud state may be temporarily unavailable or deleted upon project reclamation.
2. **Account Recovery Failure Modes:** If a user loses access to their authentication provider (e.g. lost OAuth account, unreachable recovery email, or forgotten credentials), their curated drafts, collections, and configurations become inaccessible.
3. **Vendor Lock-In vs. Data Sovereignty:** In high-grade software systems, users must maintain ultimate sovereignty over their data. The state of a user's ecosystem should exist as a portable, cryptographically verifiable, offline artifact that can be inspected, backed up, and migrated at will.

To solve this, we propose the **MIM Sovereign Vault (Blackbox Backup System)**.

---

## 2. Core Architectural Objectives

- **Zero Cloud Lock-In:** Enable 100% functional state restoration without depending on Supabase availability or project persistence.
- **Idempotent Account Migration:** Provide deterministic re-seeding allowing a user to inject their entire state into a freshly registered account (`User_xxxxxxxx`) in < 500 ms with automatic ownership remapping.
- **Cryptographic Integrity Verification:** Guard against data corruption or manual tampering using SHA-256 checksums.
- **Optional Zero-Knowledge Encryption:** Allow users to protect their private drafts and notes using client-side AES-256-GCM encryption before exporting.
- **Background Desktop Snapshots:** Silently write automated rolling snapshots to the local filesystem in MIM Desktop (`%APPDATA%/.mim/vaults/`).

---

## 3. Vault Data Specification (`.mimvault`)

The vault is a versioned JSON payload (or compressed gzip stream with the `.mimvault` extension):

```json
{
  "$schema": "https://mim-hub.vercel.app/schemas/vault-v1.json",
  "version": "1.0.0",
  "exportedAt": "2026-09-03T15:45:00.000Z",
  "client": {
    "app": "MIM Desktop",
    "version": "10.5.0",
    "platform": "win32-x64"
  },
  "identity": {
    "username": "IanFranco",
    "avatar_url": "https://...",
    "color": "#4F46E5",
    "banner_theme": "dark-indigo"
  },
  "data": {
    "drafts": [
      {
        "name": "Create & Fabric 1.20.1 Core",
        "description": "Base industrial optimizada con shaders complementarios",
        "visibility": "private",
        "created_at": "2026-05-28T14:20:00.000Z",
        "items": [
          {
            "slug": "create",
            "name": "Create",
            "version": "0.5.1-f",
            "source": "modrinth",
            "hash_sha512": "a3f8c...",
            "hash_sha1": "b7e2d..."
          },
          {
            "slug": "sodium",
            "name": "Sodium",
            "version": "0.5.8",
            "source": "modrinth",
            "hash_sha512": "c9a1b...",
            "hash_sha1": "d4e5f..."
          }
        ]
      }
    ],
    "collections": [
      {
        "id": "essentials-qol",
        "name": "Essentials Quality of Life",
        "modIds": ["appleskin", "jei", "jade"]
      }
    ],
    "followed": {
      "youtube_channels": ["@ModdedMinecraft", "@CreateCommunity"],
      "curators": ["author_uuid_1", "author_uuid_2"]
    },
    "localPreferences": {
      "allocatedRam": "8G",
      "jvmArgs": "-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions",
      "preferredLoader": "fabric",
      "defaultMinecraftVersion": "1.20.1"
    }
  },
  "integrity": {
    "algorithm": "SHA-256",
    "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
}
```

---

## 4. Key Subsystems & Workflows

### 4.1. Account Migration & Re-Seeding Pipeline
When importing a vault into a new account:
1. **Schema & Integrity Validation:** The client parses the JSON, calculates the SHA-256 digest of the `data` block, and compares it with `integrity.checksum`. If corrupted, the import is halted.
2. **Deterministic Ownership Remapping:**
   ```typescript
   // Remap all draft entities to the active session user
   const sanitizedDrafts = vault.data.drafts.map((draft) => ({
     id: crypto.randomUUID(),
     owner_id: currentSession.user.id,
     name: draft.name,
     description: draft.description,
     visibility: draft.visibility,
     updated_at: new Date().toISOString()
   }));
   ```
3. **Idempotent Batch Upsert:** Writes to PostgreSQL via Supabase client, using `ON CONFLICT (owner_id, name) DO UPDATE` to ensure safe, duplicate-free execution.

### 4.2. Zero-Knowledge Client-Side Encryption (Optional Mode)
For users storing sensitive modpack configurations, private notes, or club communications:
- **Key Derivation:** Web Crypto API `crypto.subtle.deriveKey` using PBKDF2 with 100,000 iterations and a unique 16-byte cryptographic salt.
- **Cipher:** `AES-256-GCM` with a 12-byte initialization vector (IV).
- The exported `.mimvault` contains `{ salt, iv, ciphertext, authTag }`. The server never observes plaintext data or encryption keys.

### 4.3. Desktop Silent Rolling Snapshots
In MIM Desktop (Electron runtime):
- Upon application shutdown or significant mutation (e.g. draft creation, collection edit), MIM writes an atomic snapshot to:
  `%APPDATA%/MIM/vaults/snapshot_latest.json`
- Maintains a rolling history of the last 3 weekly snapshots (`snapshot_YYYYWW.json`).
- If Supabase returns network or server errors (`HTTP 5xx` or dormancy), the UI prompts:
  > *"Cloud synchronization is currently unreachable. Would you like to restore your local snapshot from 2026-09-03?"*

---

## 5. Integration with Existing MIM Engines

| Engine | Integration Point | Benefit |
|:---|:---|:---|
| **Aduana (CAS)** | Draft items store cryptographic SHA-512/SHA-1 hashes. | When restoring a vault on a new machine, Aduana deduplicates files already present in the local cache, requiring zero redundant network downloads. |
| **FOMO Cloud** | Offline mutation replay queue (`pending_mutations`). | The vault import acts as a batch mutation event, seamlessly flowing through the event bus and sync worker. |
| **Event Bus (`MimEventMap`)** | Emits `vault:exported`, `vault:imported`, and `vault:restoration-completed`. | UI components reactively refresh lists, avatars, and drafts without full page reloads. |

---

## 6. Implementation Phasing

1. **Phase 1 (Core Export/Import):** Add "Export Sovereign Vault" and "Import Vault" buttons to `ProfileTab.tsx` and Settings. Implements plaintext JSON format with SHA-256 integrity verification.
2. **Phase 2 (Desktop Background Snapshots):** Implement background filesystem snapshot writer in `standalone/main.js` and Electron IPC channel.
3. **Phase 3 (Encrypted Vaults):** Add optional AES-256-GCM passphrase protection using native Web Crypto API.
