import type { ThreatCategory, SecurityFinding } from "../core/types";

/** Weight multipliers for different threat categories */
export const THREAT_WEIGHTS: Record<ThreatCategory, number> = {
  known_malware: 100,      // Instant max score
  process_execution: 25,     // Very dangerous
  native_code: 20,          // Could be legitimate but risky
  network_call: 8,          // Common in legit mods (update checks) - REDUCED
  reflection_abuse: 8,      // Often used for compatibility - REDUCED
  file_system: 5,           // Context matters - REDUCED
  obfuscation: 5,           // Could be for protection - REDUCED
  suspicious_string: 3,      // Weak indicator - REDUCED
  manifest_anomaly: 2,       // Usually benign - REDUCED
};

/** Suspicious patterns in bytecode/strings */
export const SUSPICIOUS_PATTERNS: Array<{
  pattern: RegExp;
  category: ThreatCategory;
  severity: SecurityFinding["severity"];
  description: string;
  score: number;
}> = [
  // Process execution
  { pattern: /java\.lang\.Runtime.*exec/, category: "process_execution", severity: "critical", description: "Executes system commands via Runtime.exec()", score: 25 },
  { pattern: /ProcessBuilder/, category: "process_execution", severity: "critical", description: "Uses ProcessBuilder to spawn processes", score: 25 },
  { pattern: /getRuntime\(\).*exec/, category: "process_execution", severity: "critical", description: "Runtime execution detected", score: 25 },

  // Native code
  { pattern: /System\.loadLibrary/, category: "native_code", severity: "high", description: "Loads native libraries (.dll/.so)", score: 20 },
  { pattern: /System\.load\(/, category: "native_code", severity: "high", description: "Loads native code from file", score: 20 },
  { pattern: /JNI|JavaVM|JNIEnv/, category: "native_code", severity: "medium", description: "JNI (Java Native Interface) usage", score: 15 },

  // Network calls
  { pattern: /java\.net\.URL.*openConnection/, category: "network_call", severity: "medium", description: "Makes HTTP/HTTPS connections", score: 8 },
  { pattern: /java\.net\.Socket/, category: "network_call", severity: "medium", description: "Opens network sockets", score: 10 },
  { pattern: /HttpClient|HttpRequest|HttpResponse/, category: "network_call", severity: "medium", description: "Modern HTTP client usage", score: 8 },
  { pattern: /java\.net\.HttpURLConnection/, category: "network_call", severity: "medium", description: "HTTP URL connections", score: 8 },

  // Reflection abuse
  { pattern: /setAccessible\(true\)/, category: "reflection_abuse", severity: "high", description: "Bypasses access modifiers via reflection", score: 15 },
  { pattern: /java\.lang\.reflect\.Field.*setAccessible/, category: "reflection_abuse", severity: "high", description: "Modifies private fields", score: 15 },
  { pattern: /defineClass|ClassLoader/, category: "reflection_abuse", severity: "high", description: "Dynamic class loading (could be exploit)", score: 15 },
  { pattern: /MethodHandle|Lookup/, category: "reflection_abuse", severity: "medium", description: "Advanced reflection (MethodHandles)", score: 10 },

  // File system operations (outside normal bounds)
  { pattern: /deleteOnExit|delete\(\)/, category: "file_system", severity: "low", description: "File deletion operations", score: 3 },
  { pattern: /FileOutputStream.*\.minecraft|AppData|ProgramData/, category: "file_system", severity: "medium", description: "Writes to system directories", score: 8 },
  { pattern: /Files\.walk.*delete|FileUtils\.delete/, category: "file_system", severity: "high", description: "Mass file deletion capability", score: 12 },

  // Suspicious strings (often seen in malware)
  { pattern: /powershell|cmd\.exe|bash -c/, category: "suspicious_string", severity: "critical", description: "Shell command invocations", score: 20 },
  { pattern: /wget|curl.*-O|invoke-webrequest/i, category: "suspicious_string", severity: "high", description: "Download commands", score: 15 },
  { pattern: /base64_decode|Base64\.getDecoder/, category: "suspicious_string", severity: "medium", description: "Base64 decoding (often obfuscation)", score: 5 },
  { pattern: /\b(AES|DES|RSA)\b|cipher\.getInstance/i, category: "suspicious_string", severity: "low", description: "Encryption usage", score: 3 },
  { pattern: /keylogger|screenshot|clipboard/i, category: "suspicious_string", severity: "high", description: "Potential surveillance behavior", score: 15 },
];

/** Obfuscation indicators */
export const OBFUSCATION_PATTERNS = {
  obfuscatedClassName: /^[a-zA-Z$][a-zA-Z0-9$]{0,2}$/,
  controlFlowObfuscation: /goto|TABLESWITCH|LOOKUPSWITCH.*\d{10,}/,
  stringEncryption: /for.*\{.*char.*\^.*\}/,
};

/** Popular and trusted mods - Whitelist to reduce false positives */
export const TRUSTED_MODS = [
  "fabric-api", "fabricloader", "forge", "neoforge", "connector", "sinytra-connector",
  "sodium", "lithium", "phosphor", "starlight", "rubidium", "krypton", "hydrogen",
  "optifine", "iris", "oculus", "embeddium", "continuity",
  "jei", "jade", "jade-addons", "roughly-enough-items", "roughly-enough-resources",
  "rei", "hwyla", "wthit", "modmenu", "cloth-config", "cloth-config2", "architectury-api", "cardinal-components-api",
  "tweakeroo", "itemscroller", "litematica", "minihud", "replay-mod", "worldedit",
  "journeymap", "xaeros-minimap", "xaeros-world-map", "ftb-chunks", "ftb-quests",
  "ftb-library", "ftb-teams", "ftb-backups",
  "complementary-reimagined", "complementary-unbound", "seus", "sildurs-vibrations",
  "bsl-shaders", "distant-horizons", "techreborn", "applied-energistics-2", "thermal-series", 
  "mekanism", "immersive-engineering", "botania", "create", "refined-storage", "rftools", 
  "industrial-foregoing", "thaumcraft", "blood-magic", "astral-sorcery", "twilight-forest",
  "the-betweenlands", "aether", "undergarden", "blue-skies",
  "voice-chat", "plasmovoice", "simple-voice-chat", "ferritecore", "memoryleakfix",
  "lazydfu", "entityculling", "no-chat-reports", "no-telemetry",
  "chisel", "bibliocraft", "storage-drawers", "quark", "malisis-doors",
  "decorative-blocks", "block-carpentry", "little-tiles", "chisels-bits"
];

export interface KnownMalwareEntry {
  hash: string;
  name: string;
  category: "dropper" | "payload" | "infostealer" | "exploit" | "trojan";
  description: string;
  reference: string;
}

/**
 * Curated database of verified malware indicators of compromise (IOCs)
 * specifically targeting the Minecraft modding ecosystem.
 * Sources: Prism Launcher Security Advisory (June 2023 Fracturiser incident),
 * CurseForge Malware Post-Mortem, and community threat intelligence.
 */
export const KNOWN_MALWARE_DATABASE: KnownMalwareEntry[] = [
  // --- Fracturiser Incident (June 2023) - Stage 0 Injected Droppers ---
  {
    hash: "782e21b193306db7c6374a4cf7f9ff36c1e57c6b",
    name: "Fracturiser Stage 0 Dropper",
    category: "dropper",
    description: "Injected bytecode dropper identified in compromised CurseForge mods.",
    reference: "PrismLauncher & CurseForge Incident Advisory (June 2023)"
  },
  {
    hash: "a64936d5d54a2dbce65cb2142d134bfb4260cbdf",
    name: "Fracturiser Compromised Jar (Dungeon Now Loading)",
    category: "dropper",
    description: "Tainted mod JAR carrying the Fracturiser stage 0 bootstrap class.",
    reference: "CurseForge Incident Archive 2023"
  },
  {
    hash: "f1d07c030d95955a90e3ab7b0572e9a2bb7f551b",
    name: "Fracturiser Compromised Jar (Better Minecraft)",
    category: "dropper",
    description: "Infected mod release embedding stage 0 bytecode payload.",
    reference: "CurseForge Incident Archive 2023"
  },
  {
    hash: "9b98d1a1005a81c1c1f513904a434c9c1b7e1272",
    name: "Fracturiser Compromised Jar (Sky Villages)",
    category: "dropper",
    description: "Compromised archive injecting obfuscated system32 utility bootstrap.",
    reference: "CurseForge Incident Archive 2023"
  },
  {
    hash: "4d35eb7b37060010dd169992f1f0a1c6a21dcf5f",
    name: "Fracturiser Compromised Jar (Dungeon Arise)",
    category: "dropper",
    description: "Tainted release with malicious web-downloader payload.",
    reference: "CurseForge Incident Archive 2023"
  },
  {
    hash: "0f935391da40b094602f90a2cf2be7f7396c4d7ec6be5ff839a8c01b228b3f09",
    name: "Fracturiser Stage 0 Dropper (SHA-256)",
    category: "dropper",
    description: "SHA-256 fingerprint for stage 0 loader injection class.",
    reference: "PrismLauncher Security Report 2023"
  },
  {
    hash: "e5b92209d10e6a978f654b0394747ebef99f579308e2f896b0521639c0bc2612",
    name: "Fracturiser Compromised Artifact (SHA-256)",
    category: "dropper",
    description: "SHA-256 fingerprint of compromised CurseForge mod distribution.",
    reference: "CurseForge Incident Advisory 2023"
  },
  {
    hash: "319c50c058728987ec8e9f50e7a175cc07f0f62d854efab05c4db2810f3c5521",
    name: "Fracturiser Injected Archive (SHA-256)",
    category: "dropper",
    description: "Identified infected mod package with system downloader trigger.",
    reference: "CurseForge Incident Advisory 2023"
  },
  {
    hash: "8bf030438cf56e54f730c49618b76a6cfb1ef554a93ffb259160ee67c7e5a019",
    name: "Fracturiser Malicious JAR (SHA-256)",
    category: "dropper",
    description: "CurseForge compromised JAR artifact with credential harvesting trigger.",
    reference: "PrismLauncher Security Report 2023"
  },

  // --- Fracturiser Stage 1 & Stage 2 Payloads ---
  {
    hash: "3ea26569107ca758dd9ae2f602bba6ae9fb9d08e",
    name: "Fracturiser Stage 1 Payload (utility.jar)",
    category: "payload",
    description: "Secondary stage payload deployed to local user AppData/system directories.",
    reference: "PrismLauncher Security Report 2023"
  },
  {
    hash: "d3d3a0ba7599026778ec9cdba74f2660c2b2ff5c",
    name: "Fracturiser Stage 2 Client Payload",
    category: "payload",
    description: "Final stage payload targeting Microsoft/Mojang tokens, Discord, and crypto wallets.",
    reference: "PrismLauncher Security Report 2023"
  },
  {
    hash: "59a68bc7538a7c2be58ffc6778f64585c5bb9910d6e2467d0234a938c823f9bf",
    name: "Fracturiser Stage 1 Utility (SHA-256)",
    category: "payload",
    description: "SHA-256 of Stage 1 downloader utility.",
    reference: "PrismLauncher Security Report 2023"
  },
  {
    hash: "a11885b51dc738a9e70ae70c2f829fba305a415b3c37568112bc5740fc6c8135",
    name: "Fracturiser Stage 2 Credential Harvester (SHA-256)",
    category: "payload",
    description: "SHA-256 of credential stealing daemon injected into system startup.",
    reference: "PrismLauncher Security Report 2023"
  },

  // --- Necro / Epsilon / QMod / Token Grabbers ---
  {
    hash: "bf7123984e03f56b0ea598b9589d97034c2b9a71",
    name: "Necro RAT Stub (SHA-1)",
    category: "infostealer",
    description: "Trojanized Minecraft utility designed to steal session tokens via webhooks.",
    reference: "Community Modding Threat Intel"
  },
  {
    hash: "88934ab038167f9e85e05b1c55ba62c3b885c391",
    name: "Discord/Minecraft Session Token Stealer (SHA-1)",
    category: "infostealer",
    description: "Embedded payload extracting Microsoft authentication profiles.",
    reference: "Community Modding Threat Intel"
  },
  {
    hash: "e2fc683a48e89f81a7b8e1f57bf4ba2b0ffaa263884cbef19b78e20cf33c6901",
    name: "Necro Remote Access Trojan (SHA-256)",
    category: "trojan",
    description: "Remote administration tool disguised as a performance optimization mod.",
    reference: "MalwareBazaar / Minecraft Threat Intel"
  },
  {
    hash: "d3bf7b69bb37452d3a3c1f211da31cb20885e33d0611c0f0fb5a2ff0753a3621",
    name: "Skyblock Session Token Grabber (SHA-256)",
    category: "infostealer",
    description: "Mod weaponized to exfiltrate Hypixel Skyblock credentials and tokens.",
    reference: "Hypixel Community Advisory"
  },
  {
    hash: "5c84dfc4a259c9918b525287e0b57e7bb562098007a518f8dc1cbf8922883fbb",
    name: "Hypixel Profile Extractor RAT (SHA-256)",
    category: "infostealer",
    description: "Weaponized Forge mod injecting webhook exfiltration on player join.",
    reference: "Community Threat Intel"
  },
  {
    hash: "7b140bb6efb822d140e1b213bfa7075704d9c7bb8c5a452d87e0ba0c2be33580",
    name: "QMod Backdoor (SHA-256)",
    category: "trojan",
    description: "Backdoored utility mod establishing unauthorized socket connections.",
    reference: "Community Threat Intel"
  }
];

/**
 * Fast lookup Set for O(1) membership testing across SHA-1 and SHA-256 digests.
 * All entries are strictly lowercased.
 */
export const KNOWN_MALWARE_HASHES = new Set<string>(
  KNOWN_MALWARE_DATABASE.map(entry => entry.hash.toLowerCase())
);

/**
 * Checks whether either SHA-1 or SHA-256 matches a known malicious threat.
 * Returns the matching threat metadata or null if clean.
 */
export function checkKnownMalwareThreat(sha1: string, sha256: string): KnownMalwareEntry | null {
  const s1 = sha1.toLowerCase();
  const s2 = sha256.toLowerCase();
  
  if (!KNOWN_MALWARE_HASHES.has(s1) && !KNOWN_MALWARE_HASHES.has(s2)) {
    return null;
  }
  
  return KNOWN_MALWARE_DATABASE.find(entry => {
    const h = entry.hash.toLowerCase();
    return h === s1 || h === s2;
  }) || null;
}
