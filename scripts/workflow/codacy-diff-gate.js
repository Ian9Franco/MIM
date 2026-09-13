#!/usr/bin/env node

/**
 * MIM — Codacy diff gate (local PR simulator)
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs stricter ESLint (eslint.codacy.mjs) only on files changed vs origin/main,
 * respecting exclude_paths from .codacy.yml — mirrors the Codacy PR diff gate.
 *
 * Usage:
 *   npm run codacy:diff
 *   npm run codacy:diff -- --base develop
 *   npm run codacy:diff -- --include-worktree   # also lint unstaged/staged edits
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { execFileSync, spawnSync } = require("child_process");
const path = require("path");
const { REPO_ROOT, log, saveGateFailureLog } = require("./ci-gates");
const { loadCodacyExcludes, filterAnalyzableFiles, normalizePath } = require("./codacy-excludes");

const ANALYZABLE_EXT = /\.(tsx?|jsx?|mjs|cjs)$/i;
const ESLINT_CODACY_CONFIG = path.join(REPO_ROOT, "eslint.codacy.mjs");

function runGit(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
}

function tryRunGit(args) {
  try {
    return runGit(args);
  } catch {
    return "";
  }
}

function resolveBaseBranch(argv) {
  const baseFlag = argv.findIndex((arg) => arg === "--base" || arg === "-b");
  if (baseFlag >= 0 && argv[baseFlag + 1]) {
    return argv[baseFlag + 1];
  }
  return "origin/main";
}

function resolveIncludeWorktree(argv) {
  return argv.includes("--include-worktree") || argv.includes("--worktree");
}

function fetchBase(baseBranch) {
  const remoteBranch = baseBranch.startsWith("origin/") ? baseBranch.slice("origin/".length) : baseBranch;
  tryRunGit(["fetch", "origin", remoteBranch]);
}

function collectDiffFiles(baseBranch, includeWorktree) {
  const files = new Set();

  const committed = tryRunGit(["diff", "--name-only", "--diff-filter=ACMR", `${baseBranch}...HEAD`]);
  for (const line of committed.split(/\r?\n/)) {
    if (line.trim()) files.add(normalizePath(line.trim()));
  }

  if (includeWorktree) {
    for (const cmd of [["diff", "--name-only", "--diff-filter=ACMR", "HEAD"], ["diff", "--name-only", "--diff-filter=ACMR", "--cached"]]) {
      const extra = tryRunGit(cmd);
      for (const line of extra.split(/\r?\n/)) {
        if (line.trim()) files.add(normalizePath(line.trim()));
      }
    }
  }

  return [...files];
}

function runEslintCodacy(files) {
  const existing = files.filter((file) => {
    try {
      const abs = path.join(REPO_ROOT, file);
      require("fs").accessSync(abs);
      return true;
    } catch {
      return false;
    }
  });

  if (existing.length === 0) {
    return { ok: true, output: "", skipped: true };
  }

  const eslintCmd = [
    "npx",
    "eslint",
    "--config",
    ESLINT_CODACY_CONFIG,
    "--max-warnings",
    "0",
    ...existing,
  ];

  const result = spawnSync(eslintCmd[0], eslintCmd.slice(1), {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    shell: true,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
  });

  const output = `${result.stdout || ""}${result.stderr || ""}`;
  return { ok: result.status === 0, output, skipped: false };
}

function main() {
  const argv = process.argv.slice(2);
  const baseBranch = resolveBaseBranch(argv);
  const includeWorktree = resolveIncludeWorktree(argv);

  log("\n╔════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  MIM CODACY DIFF GATE — simulacro local del check de PR       ║", "cyan");
  log("╚════════════════════════════════════════════════════════════════╝", "cyan");
  log(`\nBase:   ${baseBranch}`, "dim");
  log(`Config: eslint.codacy.mjs + .codacy.yml exclude_paths`, "dim");
  if (includeWorktree) log("Scope:  commits + working tree", "dim");
  else log("Scope:  commits en la rama vs base (como Codacy en PR)", "dim");

  fetchBase(baseBranch);

  const rawFiles = collectDiffFiles(baseBranch, includeWorktree);
  const excludeRegexes = loadCodacyExcludes(REPO_ROOT);
  const files = filterAnalyzableFiles(rawFiles, excludeRegexes);

  if (files.length === 0) {
    log("\n✓ Sin archivos fuente analizables en el diff (nada que validar).", "green");
    log("  Tip: usá --include-worktree si solo tenés cambios sin commitear.\n", "dim");
    process.exit(0);
  }

  log(`\nArchivos a analizar (${files.length}):`, "bold");
  for (const file of files.slice(0, 25)) {
    log(`  • ${file}`, "dim");
  }
  if (files.length > 25) {
    log(`  … y ${files.length - 25} más`, "dim");
  }

  log("\n⏳ ESLint (perfil Codacy)…", "cyan");
  const eslint = runEslintCodacy(files);

  if (eslint.ok) {
    log("\n─────────────────────────────────────────────────────────────────────────────", "green");
    log("✅ CODACY DIFF GATE — APROBADO", "green");
    log("─────────────────────────────────────────────────────────────────────────────", "green");
    log("El diff pasó ESLint estricto. Para paridad total (Semgrep/duplicación), corré:", "green");
    log("  npm run codacy:cli\n", "dim");
    process.exit(0);
  }

  const branch = tryRunGit(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown";
  const logPath = saveGateFailureLog({
    logSubdir: "codacy-diff-gates",
    filePrefix: "codacy-diff-failed",
    target: branch,
    branchName: branch,
    failedGate: "Codacy diff — ESLint estricto",
    failedGateId: "codacy-diff-eslint",
    reason: "ESLint (perfil Codacy) reportó errores en archivos del diff.",
    output: eslint.output,
    extraSections: [
      { title: "Base", content: baseBranch },
      { title: "Archivos analizados", content: files.join("\n") },
    ],
  });

  log("\n─────────────────────────────────────────────────────────────────────────────", "red");
  log("🚨 CODACY DIFF GATE — FALLÓ", "red");
  log("─────────────────────────────────────────────────────────────────────────────", "red");
  if (eslint.output) {
    log("\n" + eslint.output.trimEnd(), "red");
  }
  log(`\n📄 Log completo:\n   ${logPath}`, "yellow");
  log("\nCorregí los issues y volvé a correr: npm run codacy:diff\n", "dim");
  process.exit(1);
}

main();
