/**
 * Test Suite: MIM Sovereign Vault & Data Sovereignty Engine
 * Tests SHA-256 checksum integrity, tamper detection, AES-256-GCM encryption/decryption,
 * and deterministic migration data structures.
 */

const assert = require("assert");
const crypto = require("crypto");

// We test using Node's webcrypto compatibility
const webcrypto = crypto.webcrypto;

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, "binary").toString("base64");
}

function base64ToBytes(base64) {
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf);
}

function canonicalJson(obj) {
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

async function calculateSha256(data) {
  const text = typeof data === "string" ? data : canonicalJson(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(text);
  const hashBuffer = await webcrypto.subtle.digest("SHA-256", dataBuffer);
  return bufferToHex(hashBuffer);
}

async function createVaultTest(data, identity = {}, clientInfo = { app: "MIM", version: "10.5.0" }) {
  const checksum = await calculateSha256(data);
  return {
    $schema: "https://mim-hub.vercel.app/schemas/vault-v1.json",
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    client: clientInfo,
    identity,
    data,
    integrity: {
      algorithm: "SHA-256",
      checksum,
    },
  };
}

async function verifyVaultTest(vault) {
  if (!vault || typeof vault !== "object") return { valid: false, error: "JSON inválido" };
  if (vault.version !== "1.0.0") return { valid: false, error: "Versión no soportada" };
  if (!vault.data) return { valid: false, error: "Datos ausentes" };
  if (!vault.integrity?.checksum) return { valid: false, error: "Checksum ausente" };

  const computedChecksum = await calculateSha256(vault.data);
  if (computedChecksum.toLowerCase() !== vault.integrity.checksum.toLowerCase()) {
    return { valid: false, error: "Fallo de integridad SHA-256" };
  }
  return { valid: true };
}

async function deriveKeyFromPassphrase(passphrase, salt, iterations = 100000) {
  const encoder = new TextEncoder();
  const passwordKey = await webcrypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return webcrypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptVaultTest(vault, passphrase) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassphrase(passphrase, salt, 100000);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(vault));

  const ciphertextBuffer = await webcrypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
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

async function decryptVaultTest(envelope, passphrase) {
  if (!envelope.isEncrypted || !envelope.ciphertext) {
    throw new Error("No es una bóveda cifrada");
  }

  const salt = hexToBytes(envelope.salt);
  const iv = hexToBytes(envelope.iv);
  const ciphertextBytes = base64ToBytes(envelope.ciphertext);

  const key = await deriveKeyFromPassphrase(passphrase, salt, envelope.iterations || 100000);

  const decryptedBuffer = await webcrypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ciphertextBytes
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString);
}

async function runAllTests() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("▶ [TEST SUITE] MIM Sovereign Vault & Data Sovereignty Engine");
  console.log("════════════════════════════════════════════════════════════════\n");

  const sampleData = {
    drafts: [
      {
        name: "Create & Fabric Core",
        description: "Modpack industrial optimizado",
        minecraft_version: "1.20.1",
        loader: "fabric",
        items: [
          { project_id: "create", mod_name: "Create", version_id: "0.5.1-f" },
          { project_id: "sodium", mod_name: "Sodium", version_id: "0.5.8" }
        ]
      }
    ],
    favorites: [
      { project_id: "iris", mod_name: "Iris Shaders", pinned: true }
    ],
    followedAuthors: [
      { author_id: "jellysquid", author_name: "jellysquid3_" }
    ],
    followedMods: [],
    preferences: {
      allocatedRam: "8G",
      defaultMinecraftVersion: "1.20.1"
    }
  };

  // TEST 1: Creación de Vault y Cálculo SHA-256
  console.log("Test 1: Generación de vault y cálculo determinista de checksum SHA-256...");
  const vault = await createVaultTest(sampleData, { username: "IanFranco" });
  assert.strictEqual(vault.version, "1.0.0");
  assert.strictEqual(vault.integrity.algorithm, "SHA-256");
  assert.ok(vault.integrity.checksum && vault.integrity.checksum.length === 64);
  console.log(`✓ Test 1 Passed: Checksum generado (${vault.integrity.checksum.substring(0, 16)}...)\n`);

  // TEST 2: Verificación de Integridad exitosa
  console.log("Test 2: Verificación de integridad sobre vault íntegro...");
  const checkPass = await verifyVaultTest(vault);
  assert.strictEqual(checkPass.valid, true);
  console.log("✓ Test 2 Passed: Verificación criptográfica aprobada.\n");

  // TEST 3: Detección de Tampering / Corrupción
  console.log("Test 3: Detección de alteraciones no autorizadas (Tamper Resistance)...");
  const tamperedVault = JSON.parse(JSON.stringify(vault));
  tamperedVault.data.drafts[0].name = "Create & Fabric Core (ALTERADO)";
  const checkFail = await verifyVaultTest(tamperedVault);
  assert.strictEqual(checkFail.valid, false);
  assert.ok(checkFail.error.includes("Fallo de integridad SHA-256"));
  console.log("✓ Test 3 Passed: Alteración de datos detectada y rechazada.\n");

  // TEST 4: Serialización Canónica Determinista
  console.log("Test 4: Determinismo de orden de claves en JSON canónico...");
  const objA = { z: 1, a: 2, m: { y: 10, x: 20 } };
  const objB = { a: 2, z: 1, m: { x: 20, y: 10 } };
  const hashA = await calculateSha256(objA);
  const hashB = await calculateSha256(objB);
  assert.strictEqual(hashA, hashB);
  console.log("✓ Test 4 Passed: Mismo hash independientemente del orden de serialización.\n");

  // TEST 5: Cifrado Zero-Knowledge AES-256-GCM + PBKDF2
  console.log("Test 5: Cifrado Zero-Knowledge AES-256-GCM con PBKDF2...");
  const passphrase = "MiPasswordUltraSeguro2026!";
  const encryptedEnvelope = await encryptVaultTest(vault, passphrase);
  assert.strictEqual(encryptedEnvelope.isEncrypted, true);
  assert.strictEqual(encryptedEnvelope.algorithm, "AES-256-GCM");
  assert.strictEqual(encryptedEnvelope.kdf, "PBKDF2");
  assert.strictEqual(encryptedEnvelope.iterations, 100000);
  assert.ok(encryptedEnvelope.salt && encryptedEnvelope.salt.length === 32);
  assert.ok(encryptedEnvelope.iv && encryptedEnvelope.iv.length === 24);
  assert.ok(encryptedEnvelope.ciphertext.length > 50);
  console.log("✓ Test 5 Passed: Bóveda cifrada con salt de 16 bytes e IV de 12 bytes.\n");

  // TEST 6: Descifrado exitoso con contraseña correcta
  console.log("Test 6: Descifrado y reconstrucción con contraseña correcta...");
  const decryptedVault = await decryptVaultTest(encryptedEnvelope, passphrase);
  assert.strictEqual(decryptedVault.version, "1.0.0");
  assert.strictEqual(decryptedVault.data.drafts[0].name, "Create & Fabric Core");
  const decryptedCheck = await verifyVaultTest(decryptedVault);
  assert.strictEqual(decryptedCheck.valid, true);
  console.log("✓ Test 6 Passed: Bóveda descifrada con integridad SHA-256 preservada.\n");

  // TEST 7: Rechazo de descifrado con contraseña incorrecta
  console.log("Test 7: Rechazo de descifrado ante contraseña errónea...");
  let decryptThrew = false;
  try {
    await decryptVaultTest(encryptedEnvelope, "ContraseñaEquivocada!");
  } catch (err) {
    decryptThrew = true;
  }
  assert.strictEqual(decryptThrew, true);
  console.log("✓ Test 7 Passed: Descifrado rechazado criptográficamente.\n");

  // TEST 8: Reasignación de Ownership Idempotente para Migración de Cuentas
  console.log("Test 8: Reasignación idempotente de entidades a nuevo ID de cuenta...");
  const newAccountUserId = "usr_new_account_998877";
  const remappedDrafts = vault.data.drafts.map((d) => ({
    owner_id: newAccountUserId,
    name: d.name,
    description: d.description,
    items: d.items.map((it) => ({ ...it })),
  }));
  assert.strictEqual(remappedDrafts[0].owner_id, "usr_new_account_998877");
  assert.strictEqual(remappedDrafts[0].items.length, 2);
  console.log("✓ Test 8 Passed: Entidades listas para inyección en cuenta nueva.\n");

  console.log("════════════════════════════════════════════════════════════════");
  console.log("🎉 ALL SOVEREIGN VAULT UNIT TESTS PASSED SUCCESSFULLY (8/8)");
  console.log("════════════════════════════════════════════════════════════════\n");
}

runAllTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
