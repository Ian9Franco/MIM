/**
 * MIM Sovereign Vault — Cryptographic Engine
 * Handles portable .mimvault generation, deterministic SHA-256 integrity verification,
 * and optional Zero-Knowledge AES-256-GCM encryption with PBKDF2.
 */

export interface VaultDraftItem {
  project_id: string;
  mod_name: string;
  source?: string;
  category?: string;
  content_type?: string;
  side?: string;
  version_id?: string;
  dependencies?: any;
}

export interface VaultDraft {
  id?: string;
  name: string;
  description?: string;
  minecraft_version?: string;
  loader?: string;
  visibility?: "private" | "public" | "unlisted";
  cover_image?: string;
  created_at?: string;
  updated_at?: string;
  items: VaultDraftItem[];
}

export interface VaultFavorite {
  project_id: string;
  mod_id?: string;
  mod_name?: string;
  author?: string;
  platform?: string;
  source?: string;
  summary?: string;
  icon_url?: string;
  pinned?: boolean;
  created_at?: string;
}

export interface VaultFollowedAuthor {
  author_id?: string;
  author_name: string;
  platform?: string;
  source?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface VaultFollowedMod {
  mod_id: string;
  source?: string;
  created_at?: string;
}

export interface VaultIdentity {
  username?: string;
  avatar_url?: string;
  color?: string;
  banner_url?: string;
  banner_meta?: any;
}

export interface VaultPreferences {
  allocatedRam?: string;
  jvmArgs?: string;
  preferredLoader?: string;
  defaultMinecraftVersion?: string;
  geminiApiKey?: string;
  [key: string]: any;
}

export interface VaultData {
  drafts: VaultDraft[];
  favorites: VaultFavorite[];
  followedAuthors: VaultFollowedAuthor[];
  followedMods: VaultFollowedMod[];
  preferences?: VaultPreferences;
}

export interface VaultIntegrity {
  algorithm: "SHA-256";
  checksum: string;
}

export interface MimVaultSchema {
  $schema: string;
  version: string;
  exportedAt: string;
  client: {
    app: string;
    version: string;
    platform?: string;
  };
  identity: VaultIdentity;
  data: VaultData;
  integrity: VaultIntegrity;
}

export interface EncryptedVaultEnvelope {
  $schema: string;
  version: string;
  isEncrypted: true;
  algorithm: "AES-256-GCM";
  kdf: "PBKDF2";
  iterations: number;
  salt: string;       // Hex encoded 16-byte salt
  iv: string;         // Hex encoded 12-byte IV
  ciphertext: string; // Base64 encoded ciphertext + authTag
  exportedAt: string;
  client: {
    app: string;
    version: string;
  };
}

export type AnyVault = MimVaultSchema | EncryptedVaultEnvelope;

/**
 * Convierte un ArrayBuffer a cadena Hexadecimal
 */
function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convierte una cadena Hexadecimal a Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convierte Uint8Array a Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convierte Base64 a Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Normaliza y serializa un objeto para cálculo determinista de hash
 */
export function canonicalJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`);
  return `{${pairs.join(",")}}`;
}

/**
 * Calcula la suma de verificación SHA-256 de un bloque de datos
 */
export async function calculateSha256(data: any): Promise<string> {
  const text = typeof data === "string" ? data : canonicalJson(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Construye un objeto MimVaultSchema válido con checksum calculado
 */
export async function createVault(
  data: VaultData,
  identity: VaultIdentity = {},
  clientInfo = { app: "MIM", version: "10.5.0" }
): Promise<MimVaultSchema> {
  const checksum = await calculateSha256(data);

  return {
    $schema: "https://mim-hub.vercel.app/schemas/vault-v1.json",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    client: {
      app: clientInfo.app,
      version: clientInfo.version,
    },
    identity,
    data,
    integrity: {
      algorithm: "SHA-256",
      checksum,
    },
  };
}

/**
 * Verifica la integridad criptográfica de un vault en texto plano
 */
export async function verifyVault(vault: MimVaultSchema): Promise<{ valid: boolean; error?: string }> {
  if (!vault || typeof vault !== "object") {
    return { valid: false, error: "El archivo no contiene un JSON válido." };
  }
  if (vault.version !== "1.0.0") {
    return { valid: false, error: `Versión de vault no soportada: ${vault.version || "desconocida"}.` };
  }
  if (!vault.data || typeof vault.data !== "object") {
    return { valid: false, error: "El bloque de datos del vault está ausente o corrupto." };
  }
  if (!vault.integrity?.checksum) {
    return { valid: false, error: "Falta la suma de verificación criptográfica en el vault." };
  }

  const computedChecksum = await calculateSha256(vault.data);
  if (computedChecksum.toLowerCase() !== vault.integrity.checksum.toLowerCase()) {
    return {
      valid: false,
      error: `Fallo de integridad SHA-256: los datos fueron alterados o están corruptos.\n(Esperado: ${vault.integrity.checksum.substring(
        0,
        12
      )}..., Calculado: ${computedChecksum.substring(0, 12)}...)`,
    };
  }

  return { valid: true };
}

/**
 * Deriva una clave AES-GCM a partir de una contraseña y salt usando PBKDF2
 */
async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Cifra un vault usando AES-256-GCM y PBKDF2 (Zero-Knowledge)
 */
export async function encryptVault(
  vault: MimVaultSchema,
  passphrase: string
): Promise<EncryptedVaultEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassphrase(passphrase, salt, 100000);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(vault));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
    },
    key,
    plaintext
  );

  return {
    $schema: "https://mim-hub.vercel.app/schemas/vault-v1.json",
    version: "1.0.0",
    isEncrypted: true,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2",
    iterations: 100000,
    salt: bufferToHex(salt),
    iv: bufferToHex(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    exportedAt: new Date().toISOString(),
    client: vault.client,
  };
}

/**
 * Descifra un sobre cifrado EncryptedVaultEnvelope con la contraseña provista
 */
export async function decryptVault(
  envelope: EncryptedVaultEnvelope,
  passphrase: string
): Promise<MimVaultSchema> {
  if (!envelope.isEncrypted || !envelope.ciphertext) {
    throw new Error("El archivo provisto no es una bóveda cifrada válida.");
  }

  const salt = hexToBytes(envelope.salt);
  const iv = hexToBytes(envelope.iv);
  const ciphertextBytes = base64ToBytes(envelope.ciphertext);

  const key = await deriveKeyFromPassphrase(passphrase, salt, envelope.iterations || 100000);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      key,
      ciphertextBytes as BufferSource
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    const vault = JSON.parse(jsonString) as MimVaultSchema;

    const verification = await verifyVault(vault);
    if (!verification.valid) {
      throw new Error(`Bóveda descifrada pero con datos corruptos: ${verification.error}`);
    }

    return vault;
  } catch (err: any) {
    throw new Error("Contraseña incorrecta o archivo de bóveda dañado.");
  }
}

/**
 * Genera un nombre de archivo estándar para la descarga del vault
 */
export function generateVaultFilename(username?: string, isEncrypted = false): string {
  const safeName = (username || "user").replace(/[^a-zA-Z0-9_-]/g, "");
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const suffix = isEncrypted ? ".enc" : "";
  return `mim-vault-${safeName}-${dateStr}${suffix}.mimvault`;
}
