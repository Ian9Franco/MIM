import type { ThreatCategory, SecurityFinding } from "./types";

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

export const KNOWN_MALWARE_HASHES = new Set<string>([]);
