import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mimIndexLayout } from "../../lib/core/mimIndex/layout";
import { runSinceramiento01 } from "../../lib/core/mimIndex/sinceramiento01";

function writeFile(file: string, contents: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, "utf-8");
}

function main(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mim-sinceramiento-"));
  const dest = path.join(root, "canonical-index");
  const home = path.join(root, "home");
  const cwd = path.join(root, "cwd");
  const sourceBase = path.join(root, "source");
  const fakeDevIndex = path.join(root, "dev-index");

  try {
    writeFile(path.join(home, ".mim-index", "data", "whitelist.json"), JSON.stringify(["sodium"]));
    writeFile(path.join(cwd, ".mim-index", "cache", "sage-cache.json"), JSON.stringify({ sig: { culprit: "optifine" } }));
    writeFile(path.join(cwd, "lib", ".mim-index", "cache", "vt-cache.json"), JSON.stringify({ hash: { malicious: false } }));
    writeFile(path.join(cwd, "mim-collections.json"), JSON.stringify([{ id: "local-1", name: "Club" }]));
    writeFile(path.join(sourceBase, ".mim-index", "download-history.json"), JSON.stringify([{ fileName: "mod.jar" }]));
    writeFile(path.join(sourceBase, ".mim-index", "tweak", "master_options.txt"), "renderDistance:12");
    writeFile(path.join(sourceBase, "_projects", "Foo", "mods", "keep.jar"), "jar");
    writeFile(path.join(sourceBase, ".projects", "Foo", ".fomo-registry.json"), JSON.stringify({ proj: "ver" }));
    writeFile(path.join(fakeDevIndex, "remote-cache.json"), JSON.stringify({ version: 1 }));
    fs.mkdirSync(path.join(home, ".mim-index", "staging"), { recursive: true });
    fs.mkdirSync(path.join(home, ".mim-index", "player-rescue"), { recursive: true });

    const first = runSinceramiento01({
      destIndex: dest,
      sourceBase,
      cwd,
      homedir: home,
      extraLegacyIndexes: [fakeDevIndex],
    });

    const layout = mimIndexLayout(dest);
    assert.equal(first.id, "sinceramiento_01");
    assert.ok(fs.existsSync(layout.marker), "marker must be written");
    assert.equal(JSON.parse(fs.readFileSync(layout.whitelist, "utf-8"))[0], "sodium");
    assert.equal(JSON.parse(fs.readFileSync(layout.sageCache, "utf-8")).sig.culprit, "optifine");
    assert.equal(JSON.parse(fs.readFileSync(layout.vtCache, "utf-8")).hash.malicious, false);
    assert.equal(JSON.parse(fs.readFileSync(layout.collections, "utf-8"))[0].id, "local-1");
    assert.equal(JSON.parse(fs.readFileSync(layout.downloadHistory, "utf-8"))[0].fileName, "mod.jar");
    assert.ok(fs.existsSync(path.join(layout.tweak, "master_options.txt")));
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(sourceBase, "_projects", "Foo", ".fomo-registry.json"), "utf-8")).proj,
      "ver",
    );
    assert.ok(fs.existsSync(path.join(sourceBase, "_projects", "Foo", "mods", "keep.jar")), "_projects content must stay");
    assert.equal(JSON.parse(fs.readFileSync(layout.settings, "utf-8")).mimIndexPath, dest);

    assert.equal(fs.existsSync(path.join(home, ".mim-index")), false, "homedir zombie index must be deleted");
    assert.equal(fs.existsSync(path.join(cwd, ".mim-index")), false, "cwd zombie index must be deleted");
    assert.equal(fs.existsSync(path.join(cwd, "lib", ".mim-index")), false, "lib zombie index must be deleted");
    assert.equal(fs.existsSync(path.join(sourceBase, ".mim-index")), false, "sourceBase/.mim-index must be deleted");
    assert.equal(fs.existsSync(path.join(sourceBase, ".projects")), false, ".projects must be deleted");
    assert.equal(fs.existsSync(path.join(cwd, "mim-collections.json")), false);
    assert.equal(fs.existsSync(fakeDevIndex), false);
    assert.equal(fs.existsSync(layout.staging), false, "empty staging must not be kept");
    assert.equal(fs.existsSync(layout.playerRescue), false, "empty player-rescue must not be kept");

    const second = runSinceramiento01({
      destIndex: dest,
      sourceBase,
      cwd,
      homedir: home,
      extraLegacyIndexes: [fakeDevIndex],
    });
    assert.equal(second.ranAt, first.ranAt, "second run must no-op via marker");
    assert.ok(fs.existsSync(path.join(sourceBase, "_projects", "Foo", "mods", "keep.jar")));

    console.log("✓ sinceramiento_01 migrates allowlisted files, deletes zombies, and is idempotent");

    const isolationRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mim-sinceramiento-iso-"));
    const isolationDest = path.join(isolationRoot, "dest");
    const realDevIndex = path.join("D:", ".MIM", "source", ".mim-index");
    const realHomeIndex = path.join(os.homedir(), ".mim-index");
    const realCwdIndex = path.join(process.cwd(), ".mim-index");
    const sawDev = fs.existsSync(realDevIndex);
    const sawHome = fs.existsSync(realHomeIndex);
    const sawCwd = fs.existsSync(realCwdIndex);
    try {
      runSinceramiento01({
        destIndex: isolationDest,
        sourceBase: path.join("D:", ".MIM", "source"),
        cwd: process.cwd(),
        homedir: os.homedir(),
        extraLegacyIndexes: [realDevIndex],
      });
      if (sawDev) {
        assert.ok(fs.existsSync(realDevIndex), "tmp dest must not delete D:\\.MIM\\source\\.mim-index");
      }
      if (sawHome) {
        assert.ok(fs.existsSync(realHomeIndex), "tmp dest must not delete the real homedir index");
      }
      if (sawCwd) {
        assert.ok(fs.existsSync(realCwdIndex), "tmp dest must not delete the repo .mim-index");
      }
      console.log("✓ sinceramiento_01 dest-in-tmpdir does not scan real D:/cwd/homedir indexes");
    } finally {
      fs.rmSync(isolationRoot, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
