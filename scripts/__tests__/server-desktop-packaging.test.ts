import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

async function run() {
  const root = path.join(__dirname, "../..");
  const main = fs.readFileSync(path.join(root, "standalone/main.js"), "utf8");
  assert.match(main, /MIM_DESKTOP_RUNTIME:\s*['"]1['"]/, "packaged Electron must set desktop runtime");

  const header = fs.readFileSync(path.join(root, "components/layout/LayoutHeader.tsx"), "utf8");
  assert.match(header, /href="\/servers"/, "Desktop header must expose /servers");

  assert.ok(fs.existsSync(path.join(root, "app/servers/page.tsx")));
  assert.ok(fs.existsSync(path.join(root, "app/api/server/inspect/route.ts")));
  assert.ok(fs.existsSync(path.join(root, "app/api/server/sync/apply/route.ts")));
  assert.ok(fs.existsSync(path.join(root, "app/api/server/recovery/route.ts")));

  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
    build?: { files?: string[]; asar?: boolean };
    main?: string;
  };
  assert.equal(pkg.main, "standalone/main.js");
  assert.equal(pkg.build?.asar, false);
  assert.ok(pkg.build?.files?.includes("standalone/*.js"));
  assert.ok(pkg.build?.files?.some((entry) => entry.includes(".next/standalone")));
  console.log("✓ Desktop packaging contract includes Server Manager surface");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
