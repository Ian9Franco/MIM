const assert = require("node:assert/strict");
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
  console.log("✓ Release notes truthfulness contract passed (2 cases)");
}

run();
