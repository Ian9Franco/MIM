const fs = require("fs");
const path = require("path");

const SECRET_FIELDS = [
  "modrinthApiKey",
  "curseforgeApiKey",
  "virusTotalApiKey",
  "geminiApiKey",
];

const SECRET_ENV = {
  modrinthApiKey: "MIM_SECRET_MODRINTH",
  curseforgeApiKey: "MIM_SECRET_CURSEFORGE",
  virusTotalApiKey: "MIM_SECRET_VIRUSTOTAL",
  geminiApiKey: "MIM_SECRET_GEMINI",
};

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(temporaryPath, filePath);
}

function createSecretStore({ safeStorage, settingsPath, secretsPath }) {
  function assertAvailable() {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Electron safeStorage is not available on this system");
    }
  }

  function readEncryptedValues() {
    if (!fs.existsSync(secretsPath)) return {};
    const envelope = JSON.parse(fs.readFileSync(secretsPath, "utf8"));
    if (envelope.version !== 1 || typeof envelope.values !== "object" || !envelope.values) {
      throw new Error("Unsupported or malformed MIM secret-store envelope");
    }

    const values = {};
    for (const field of SECRET_FIELDS) {
      const encrypted = envelope.values[field];
      if (typeof encrypted !== "string" || encrypted.length === 0) continue;
      values[field] = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    }
    return values;
  }

  function writeEncryptedValues(values) {
    assertAvailable();
    const encrypted = {};
    for (const field of SECRET_FIELDS) {
      const value = values[field];
      if (typeof value !== "string" || value.length === 0) continue;
      encrypted[field] = safeStorage.encryptString(value).toString("base64");
    }
    writeJsonAtomic(secretsPath, { version: 1, values: encrypted });
  }

  function update(partial) {
    const current = readEncryptedValues();
    for (const field of SECRET_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(partial, field)) continue;
      const value = typeof partial[field] === "string" ? partial[field].trim() : "";
      if (value) current[field] = value;
      else delete current[field];
    }
    writeEncryptedValues(current);
    return current;
  }

  function migratePlaintextSettings() {
    if (!fs.existsSync(settingsPath)) return readEncryptedValues();
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const legacySecrets = {};
    let foundPlaintext = false;

    for (const field of SECRET_FIELDS) {
      if (typeof settings[field] === "string" && settings[field].trim()) {
        legacySecrets[field] = settings[field].trim();
        foundPlaintext = true;
      }
    }

    if (!foundPlaintext) return readEncryptedValues();

    // Persist the encrypted copy first. If encryption fails, the legacy file is
    // deliberately left untouched so migration cannot destroy credentials.
    const migrated = update(legacySecrets);
    for (const field of SECRET_FIELDS) delete settings[field];
    writeJsonAtomic(settingsPath, settings);
    return migrated;
  }

  function toEnvironment(values = readEncryptedValues()) {
    const environment = {};
    for (const field of SECRET_FIELDS) {
      if (values[field]) environment[SECRET_ENV[field]] = values[field];
    }
    return environment;
  }

  return {
    migratePlaintextSettings,
    readAll: readEncryptedValues,
    update,
    toEnvironment,
  };
}

module.exports = { createSecretStore, SECRET_FIELDS, SECRET_ENV };
