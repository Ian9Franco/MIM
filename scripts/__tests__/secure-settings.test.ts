import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { createSecretStore } = require("../../standalone/secret-store");

function fakeSafeStorage(available = true) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (value: string) => Buffer.from(`protected:${[...value].reverse().join("")}`, "utf8"),
    decryptString: (value: Buffer) => {
      const encrypted = value.toString("utf8");
      assert.ok(encrypted.startsWith("protected:"));
      return [...encrypted.slice("protected:".length)].reverse().join("");
    },
  };
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mim-secure-settings-"));

  try {
  const settingsPath = path.join(root, "mim-settings.json");
  const secretsPath = path.join(root, "mim-secrets.enc.json");
  const sentinelGemini = "gemini-plaintext-must-disappear";
  const sentinelCurseForge = "curseforge-plaintext-must-disappear";

  fs.writeFileSync(settingsPath, JSON.stringify({
    downloadsPath: "C:/Downloads",
    geminiApiKey: sentinelGemini,
    curseforgeApiKey: sentinelCurseForge,
  }));

  const store = createSecretStore({
    safeStorage: fakeSafeStorage(),
    settingsPath,
    secretsPath,
  });

  const migrated = store.migratePlaintextSettings();
  assert.equal(migrated.geminiApiKey, sentinelGemini);
  assert.equal(migrated.curseforgeApiKey, sentinelCurseForge);

  const publicSettings = fs.readFileSync(settingsPath, "utf8");
  assert.equal(publicSettings.includes(sentinelGemini), false);
  assert.equal(publicSettings.includes(sentinelCurseForge), false);
  assert.equal(JSON.parse(publicSettings).downloadsPath, "C:/Downloads");

  const encryptedEnvelope = fs.readFileSync(secretsPath, "utf8");
  assert.equal(encryptedEnvelope.includes(sentinelGemini), false);
  assert.equal(encryptedEnvelope.includes(sentinelCurseForge), false);
  assert.deepEqual(store.readAll(), migrated);

  store.update({ geminiApiKey: "replacement-gemini", curseforgeApiKey: "" });
  assert.deepEqual(store.readAll(), { geminiApiKey: "replacement-gemini" });
  assert.deepEqual(store.toEnvironment(), { MIM_SECRET_GEMINI: "replacement-gemini" });

  const unavailableSettings = path.join(root, "unavailable-settings.json");
  const unavailableSecrets = path.join(root, "unavailable-secrets.json");
  fs.writeFileSync(unavailableSettings, JSON.stringify({ geminiApiKey: sentinelGemini }));
  const unavailableStore = createSecretStore({
    safeStorage: fakeSafeStorage(false),
    settingsPath: unavailableSettings,
    secretsPath: unavailableSecrets,
  });
  assert.throws(() => unavailableStore.migratePlaintextSettings(), /safeStorage is not available/);
  assert.equal(fs.readFileSync(unavailableSettings, "utf8").includes(sentinelGemini), true);
  assert.equal(fs.existsSync(unavailableSecrets), false);

    process.env.HOME = root;
    process.env.USERPROFILE = root;
    const apiSettingsDir = path.join(root, ".mim-index");
    process.env.MIM_PORTABLE_DIR = apiSettingsDir;
    fs.mkdirSync(apiSettingsDir, { recursive: true });
    fs.writeFileSync(path.join(apiSettingsDir, "mim-settings.json"), JSON.stringify({
      downloadsPath: "C:/LegacyDownloads",
      geminiApiKey: "legacy-api-contract-secret",
    }));
    const settingsModule = require("../../lib/core/settings") as typeof import("../../lib/core/settings");
    const migratedPublicSettings = settingsModule.getPublicSettings();
    assert.equal(migratedPublicSettings.apiKeysConfigured.geminiApiKey, true);
    assert.equal(
      fs.readFileSync(path.join(apiSettingsDir, "mim-settings.json"), "utf8").includes("legacy-api-contract-secret"),
      false,
    );
    const response = await settingsModule.saveSettings({
      downloadsPath: "C:/SafeDownloads",
      geminiApiKey: "api-contract-secret",
    });
    assert.equal("geminiApiKey" in response, false);
    assert.equal(response.apiKeysConfigured.geminiApiKey, true);
    const persistedSettings = fs.readFileSync(path.join(root, ".mim-index", "mim-settings.json"), "utf8");
    assert.equal(persistedSettings.includes("api-contract-secret"), false);
    assert.equal(JSON.parse(persistedSettings).downloadsPath, "C:/SafeDownloads");

    console.log("Secure settings migration and secret boundary suite passed.");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
