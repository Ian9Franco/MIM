const assert = require("node:assert/strict");
const {
  CI_PUSH_GATES,
  CI_PUSH_LINT_GATES,
  CI_PUSH_QUICK_GATES,
  PR_AUDIT_GATES,
  CODACY_DIFF_GATE,
} = require("../workflow/ci-gates");

function assertGateIds(gates, requiredIds) {
  const ids = gates.map((gate) => gate.id);
  for (const id of requiredIds) {
    assert.ok(ids.includes(id), `Missing gate id: ${id}`);
  }
}

function assertNoDuplicateIds(gates) {
  const seen = new Set();
  for (const gate of gates) {
    assert.ok(!seen.has(gate.id), `Duplicate gate id: ${gate.id}`);
    seen.add(gate.id);
  }
}

function run() {
  assert.ok(PR_AUDIT_GATES.length >= 6, "PR audit gates defined");
  assert.ok(CI_PUSH_GATES.length >= 14, "CI push gates mirror workflow");
  assertNoDuplicateIds(CI_PUSH_GATES);

  assertGateIds(CI_PUSH_GATES, [
    "tsc-root",
    "tsc-hub",
    "eslint-root",
    "eslint-hub",
    "api-guard",
    "architecture-lint",
    "architecture-tests",
    "test-coverage",
    "dast",
    "build-desktop",
    "build-hub",
  ]);

  const quickIds = new Set(CI_PUSH_QUICK_GATES.map((g) => g.id));
  assert.ok(!quickIds.has("build-desktop"), "Quick mode skips desktop build");
  assert.ok(!quickIds.has("build-hub"), "Quick mode skips hub build");
  assert.ok(!quickIds.has("test-coverage"), "Quick mode skips test:coverage");

  const lintIds = new Set(CI_PUSH_LINT_GATES.map((g) => g.id));
  assert.ok(lintIds.has("eslint-root") && lintIds.has("tsc-root"));
  assert.ok(lintIds.has("codacy-diff"), "Lint mode includes Codacy diff simulator");
  assert.ok(!lintIds.has("test-coverage"), "Lint mode skips full test suite");
  assert.equal(CODACY_DIFF_GATE.id, "codacy-diff");

  for (const gate of CI_PUSH_GATES) {
    assert.ok(gate.title && gate.cmd && gate.args?.length, `Invalid gate definition: ${gate.id}`);
    assert.ok(gate.reason, `Gate missing reason: ${gate.id}`);
  }

  console.log("✓ CI gate catalog matches GitHub Actions jobs");
  console.log(`  PR audit: ${PR_AUDIT_GATES.length} gates`);
  console.log(`  Pre-push full: ${CI_PUSH_GATES.length} gates`);
  console.log(`  Pre-push quick: ${CI_PUSH_QUICK_GATES.length} gates`);
  console.log(`  Pre-push lint: ${CI_PUSH_LINT_GATES.length} gates`);
}

run();
