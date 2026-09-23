const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { listLegacySettingsCandidates } = require("../../standalone/legacy-candidates");
const { createSecretStore } = require("../../standalone/secret-store");

function fakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`protected:${[...value].reverse().join("")}`, "utf8"),
    decryptString: (value) => {
      const encrypted = value.toString("utf8");
      assert.ok(encrypted.startsWith("protected:"));
      return [...encrypted.slice("protected:".length)].reverse().join("");
    },
  };
}

function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mim-legacy-candidates-"));
  try {
    const homeIndex = path.join(root, "home", ".mim-index");
    const standaloneDir = path.join(root, "standalone");
    const devSourceIndex = path.join(root, "dev", ".mim-index");
    const installDir = path.join(root, "Program Files", "MIM");
    const portableDir = path.join(root, "portable");
    const oldRoots = [homeIndex, standaloneDir, devSourceIndex];

    fs.mkdirSync(homeIndex, { recursive: true });
    fs.mkdirSync(installDir, { recursive: true });
    fs.mkdirSync(portableDir, { recursive: true });
    fs.writeFileSync(
      path.join(homeIndex, "mim-settings.json"),
      JSON.stringify({ downloadsPath: "C:/Users/me/Downloads" }),
    );
    fs.writeFileSync(
      path.join(installDir, "mim-settings.json"),
      JSON.stringify({ downloadsPath: "C:/Install/Downloads" }),
    );

    const skipped = listLegacySettingsCandidates({
      portableSettings: path.join(portableDir, "mim-settings.json"),
      trustedRoots: oldRoots,
      homeIndex,
      standaloneDir,
      devSourceIndex,
      installRoots: [installDir, path.join(installDir, ".mim-index")],
    });
    assert.deepEqual(skipped, [path.resolve(path.join(homeIndex, "mim-settings.json"))]);

    const withInstallRoot = listLegacySettingsCandidates({
      portableSettings: path.join(portableDir, "mim-settings.json"),
      trustedRoots: [...oldRoots, installDir],
      homeIndex,
      standaloneDir,
      devSourceIndex,
      installRoots: [installDir],
    });
    assert.ok(
      withInstallRoot.includes(path.resolve(path.join(installDir, "mim-settings.json"))),
      "install settings are recovered once the install directory is trusted",
    );

    const store = createSecretStore({
      safeStorage: fakeSafeStorage(),
      settingsPath: path.join(portableDir, "mim-settings.json"),
      secretsPath: path.join(portableDir, "mim-secrets.enc.json"),
      trustedRoots: [...oldRoots, portableDir],
    });
    store.update({ geminiApiKey: "desktop-save-still-works" });
    assert.equal(store.readAll().geminiApiKey, "desktop-save-still-works");

    const main = fs.readFileSync(path.join(__dirname, "../../standalone/main.js"), "utf8");
    const init = main.slice(main.indexOf("function initializeSecretStore"));
    const createAt = init.indexOf("secretStore = createSecretStore");
    const recoverAt = init.indexOf("recoverPortableSettings(");
    assert.ok(createAt > 0 && recoverAt > createAt, "secret store is created before legacy recovery");
    assert.match(main, /listInstallDataRoots\(\)/, "packaged install roots stay in the trusted set");

    console.log("Legacy credential candidates skip untrusted install paths.");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
