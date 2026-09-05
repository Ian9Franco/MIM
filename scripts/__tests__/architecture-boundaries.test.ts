import assert from "node:assert/strict";
import { inspectSource, resolveRepoImport } from "../architecture/verify-boundaries";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("resolves root aliases and relative imports inside the repository", () => {
  assert.equal(resolveRepoImport("lib/modding/foo.ts", "@/components/Foo"), "components/Foo");
  assert.equal(resolveRepoImport("lib/modding/foo.ts", "../../app/api/shared"), "app/api/shared");
  assert.equal(resolveRepoImport("lib/modding/foo.ts", "zod"), null);
});

test("rejects core engine imports from UI through aliases", () => {
  const violations = inspectSource("lib/security/check.ts", 'import Button from "@/components/Button";');
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "core-engines-must-not-depend-on-ui");
});

test("rejects relative core engine imports from app", () => {
  const violations = inspectSource("lib/intelligence/sage/engine.ts", 'export { helper } from "../../../app/helper";');
  assert.equal(violations.length, 1);
  assert.equal(violations[0].target, "app/helper");
});

test("rejects dynamic imports and require calls that cross boundaries", () => {
  const source = `
    async function load() { return import("@/components/HeavyPanel"); }
    const desktop = require("../../standalone/main");
  `;
  const violations = inspectSource("lib/modding/runtime.ts", source);
  assert.equal(violations.length, 2);
});

test("rejects web imports from the Electron standalone runtime", () => {
  const violations = inspectSource("web/lib/runtime.ts", 'import x from "../../standalone/main";');
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "web-must-not-depend-on-desktop-runtime");
});

test("allows dependencies toward core and third-party packages", () => {
  const source = `
    import { scan } from "@/lib/security/scanner";
    import { z } from "zod";
  `;
  assert.deepEqual(inspectSource("components/ScanPanel.tsx", source), []);
  assert.deepEqual(inspectSource("lib/security/scan.ts", 'import { z } from "zod";'), []);
});

test("does not treat comments or strings as imports", () => {
  const source = `
    // import Button from "@/components/Button"
    const example = 'require("@/components/Fake")';
  `;
  assert.deepEqual(inspectSource("lib/modding/parser.ts", source), []);
});

console.log("Architecture boundary contract suite passed.");
