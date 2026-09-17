const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function testAppUpdaterSourceExports() {
  const source = fs.readFileSync(path.join(__dirname, "../../standalone/app-updater.js"), "utf8");
  assert.match(source, /function setupAppUpdater/);
  assert.match(source, /function isUpdaterSupported/);
  assert.match(source, /function isPortableRuntime/);
  assert.match(source, /getAutoUpdater/);
}

function testPreloadExposesDesktopBridge() {
  const preload = fs.readFileSync(path.join(__dirname, "../../standalone/preload.js"), "utf8");
  assert.match(preload, /contextBridge\.exposeInMainWorld\('mimDesktop'/);
  assert.match(preload, /mim:updater:check/);
  assert.match(preload, /mim:updater:status/);
}

function testMainWiresUpdaterAndPreload() {
  const main = fs.readFileSync(path.join(__dirname, "../../standalone/main.js"), "utf8");
  assert.match(main, /require\('\.\/app-updater'\)/);
  assert.match(main, /setupAppUpdater/);
  assert.match(main, /preload\.js/);
}

function testElectronBuilderPublishConfig() {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8"));
  assert.equal(rootPkg.dependencies["electron-updater"], "^6.8.3");
  assert.equal(rootPkg.build?.publish?.provider, "github");
  assert.equal(rootPkg.build?.publish?.owner, "Ian9Franco");
  assert.equal(rootPkg.build?.publish?.repo, "MIM");
}

function run() {
  testAppUpdaterSourceExports();
  testPreloadExposesDesktopBridge();
  testMainWiresUpdaterAndPreload();
  testElectronBuilderPublishConfig();
  console.log("✓ Desktop auto-update packaging contracts passed");
}

run();
