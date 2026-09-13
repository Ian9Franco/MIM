const assert = require("node:assert/strict");
const {
  parseExcludePaths,
  globToRegExp,
  filterAnalyzableFiles,
  isSourceFile,
} = require("../workflow/codacy-excludes");
const { CODACY_DIFF_GATE } = require("../workflow/ci-gates");

function run() {
  const sampleYaml = `
exclude_paths:
  - scripts/__tests__/**
  - app/api/project/fix-issue/route.ts
  - "*.tsbuildinfo"
`;

  const excludes = parseExcludePaths(sampleYaml);
  assert.deepEqual(excludes, [
    "scripts/__tests__/**",
    "app/api/project/fix-issue/route.ts",
    "*.tsbuildinfo",
  ]);

  const regexes = excludes.map(globToRegExp);
  const files = filterAnalyzableFiles(
    [
      "components/server/ServerAdminPanel.tsx",
      "scripts/__tests__/foo.test.ts",
      "app/api/project/fix-issue/route.ts",
      "README.md",
      "lib/foo.tsbuildinfo",
    ],
    regexes
  );

  assert.deepEqual(files, ["components/server/ServerAdminPanel.tsx"]);
  assert.equal(isSourceFile("foo.tsx"), true);
  assert.equal(isSourceFile("foo.md"), false);

  assert.equal(CODACY_DIFF_GATE.id, "codacy-diff");
  assert.ok(CODACY_DIFF_GATE.args.includes("scripts/workflow/codacy-diff-gate.js"));

  console.log("✓ Codacy diff gate helpers and CI catalog entry");
}

run();
