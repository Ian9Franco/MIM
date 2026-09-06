const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  buildValidationText,
  insertReleaseSection,
} = require("../release.js");

function testValidationClaimTracksExecutedGates() {
  const verified = buildValidationText(true);
  const skipped = buildValidationText(false);

  assert.match(verified, /ejecutadas y verificadas satisfactoriamente/);
  assert.doesNotMatch(skipped, /verificadas satisfactoriamente/);
  assert.match(skipped, /no fueron ejecutadas/);
}

function testNewestReleasePrecedesOlderHistoryWithCrLf() {
  const changelog = [
    "# MIM — Changelog",
    "",
    "> **Versión Actual:** v1.0.0",
    "",
    "---",
    "",
    "## 🚀 Versión 1.0.0 — Anterior (2026-09-01)",
    "",
    "- anterior",
    "",
    "---",
    "",
    "*Fin del historial*",
  ].join("\r\n");

  const nextSection = [
    "## 🚀 Versión 1.0.1 — Nueva (2026-09-06)",
    "",
    "- nueva",
    "",
    "---",
  ].join("\n");

  const updated = insertReleaseSection(changelog, nextSection);
  const nextIndex = updated.indexOf("Versión 1.0.1");
  const previousIndex = updated.indexOf("Versión 1.0.0 — Anterior");
  const footerIndex = updated.indexOf("*Fin del historial*");

  assert(nextIndex >= 0, "new release section must be inserted");
  assert(nextIndex < previousIndex, "new release must precede older history");
  assert(nextIndex < footerIndex, "new release must not be appended after the footer");
}

function run() {
  testValidationClaimTracksExecutedGates();
  testNewestReleasePrecedesOlderHistoryWithCrLf();
  testWorkflowTagResolution();
  console.log("✓ Release notes truthfulness and workflow tag contracts passed");
}

function testWorkflowTagResolution() {
  const workflow = fs.readFileSync(path.join(__dirname, "../../.github/workflows/release.yml"), "utf8");
  const script = workflow.match(/shell: node \{0\}[\s\S]*?run: \|\r?\n([\s\S]*?)\r?\n      - name: Checkout Repository/)[1]
    .split(/\r?\n/).map(line => line.replace(/^          /, "")).join("\n");
  function resolve(env) {
    let output = "";
    vm.runInNewContext(script, {
      process: { env: { GITHUB_OUTPUT: "test-output", ...env } },
      require: (name) => {
        assert.equal(name, "node:fs");
        return { appendFileSync: (file, value) => { assert.equal(file, "test-output"); output += value; } };
      },
    });
    return output;
  }
  assert.equal(resolve({ RELEASE_EVENT: "workflow_dispatch", RELEASE_REF_TYPE: "branch", RELEASE_REF_NAME: "main", RELEASE_INPUT_TAG: "v11.4.5" }), "tag=v11.4.5\n");
  assert.equal(resolve({ RELEASE_EVENT: "push", RELEASE_REF_TYPE: "tag", RELEASE_REF_NAME: "v11.4.6", RELEASE_INPUT_TAG: "v11.4.5" }), "tag=v11.4.6\n");
  for (const tag of ["", "main", "v11.4.5\ntag=main", "v11.4.5;echo bad"]) {
    assert.throws(() => resolve({ RELEASE_EVENT: "workflow_dispatch", RELEASE_INPUT_TAG: tag }), /explicit version tag/);
  }
  assert.throws(() => resolve({ RELEASE_EVENT: "push", RELEASE_REF_TYPE: "branch", RELEASE_REF_NAME: "main" }), /explicit version tag/);
  assert.match(workflow, /ref: refs\/tags\/\$\{\{ steps\.release\.outputs\.tag \}\}/);
  assert.match(workflow, /RELEASE_TAG: \$\{\{ steps\.release\.outputs\.tag \}\}/);
  assert.match(workflow, /tag_name: \$\{\{ steps\.release\.outputs\.tag \}\}/);
  assert.doesNotMatch(workflow, /github\.ref_name \|\|/);
}

run();
