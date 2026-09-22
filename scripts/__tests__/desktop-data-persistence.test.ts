import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mim-desktop-data-"));
  const canonical = path.join(root, "canonical-index");
  const installIndex = path.join(root, "install", ".mim-index");
  const previousEnv = {
    MIM_DESKTOP_RUNTIME: process.env.MIM_DESKTOP_RUNTIME,
    MIM_PORTABLE_DIR: process.env.MIM_PORTABLE_DIR,
    cwd: process.cwd(),
  };

  try {
    fs.mkdirSync(installIndex, { recursive: true });
    fs.writeFileSync(
      path.join(installIndex, "mim-settings.json"),
      JSON.stringify({
        mimIndexPath: installIndex,
        downloadsPath: "C:/Users/me/Downloads",
        geminiApiKey: "legacy-plaintext-key",
      }),
    );
    fs.writeFileSync(
      path.join(installIndex, "mim-secrets.enc.json"),
      JSON.stringify({ version: 1, values: { geminiApiKey: "encrypted-placeholder" } }),
    );

    process.env.MIM_DESKTOP_RUNTIME = "1";
    process.env.MIM_PORTABLE_DIR = canonical;
    process.chdir(path.join(root, "install"));

    const desktopDataRoot = require("../../lib/core/desktopDataRoot") as typeof import("../../lib/core/desktopDataRoot");
    desktopDataRoot._resetDesktopMigrationGuardForTests();
    desktopDataRoot.ensureDesktopDataMigrated(canonical);

    const settingsModule = require("../../lib/core/settings") as typeof import("../../lib/core/settings");
    settingsModule._resetSettingsRuntimeForTests();
    assert.equal(settingsModule.getMimIndexPath(), canonical);

    const publicSettings = settingsModule.getPublicSettings();
    assert.equal(publicSettings.downloadsPath, "C:/Users/me/Downloads");
    assert.equal(publicSettings.apiKeysConfigured.geminiApiKey, true);

    const persisted = JSON.parse(fs.readFileSync(path.join(canonical, "mim-settings.json"), "utf8"));
    assert.equal(persisted.mimIndexPath, canonical);
    assert.equal(persisted.geminiApiKey, undefined);
    assert.equal(fs.existsSync(path.join(canonical, "mim-secrets.enc.json")), true);

    console.log("Desktop data persistence migration suite passed.");
  } finally {
    process.chdir(previousEnv.cwd);
    if (previousEnv.MIM_DESKTOP_RUNTIME === undefined) delete process.env.MIM_DESKTOP_RUNTIME;
    else process.env.MIM_DESKTOP_RUNTIME = previousEnv.MIM_DESKTOP_RUNTIME;
    if (previousEnv.MIM_PORTABLE_DIR === undefined) delete process.env.MIM_PORTABLE_DIR;
    else process.env.MIM_PORTABLE_DIR = previousEnv.MIM_PORTABLE_DIR;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
