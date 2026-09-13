#!/usr/bin/env node

/**
 * MIM — Codacy Analysis CLI gate (paridad máxima con Codacy Cloud)
 * ─────────────────────────────────────────────────────────────────────────────
 * Usa @codacy/analysis-cli con --diff. Requiere init previo:
 *   npm run codacy:init          # sin token (auto-detect, ~3–10 min la 1ª vez)
 *   npm run codacy:init:remote    # con CODACY_API_TOKEN (misma config que el PR)
 *
 * La primera corrida descarga @codacy/analysis-cli + analizadores en ~/.codacy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { REPO_ROOT, log, saveGateFailureLog } = require("./ci-gates");
const { resolveCodacyInvocation, assertCodacyCliInstalled } = require("./codacy-cli-run");

const CONFIG_PATH = path.join(REPO_ROOT, ".codacy", "codacy.config.json");

/** Bundled / JS-friendly tools that work on Windows (Semgrep/Opengrep is Linux/macOS only). */
const WINDOWS_ANALYZE_TOOLS = ["ESLint9", "Stylelint", "Spectral"];

function buildAnalyzeArgs(argv) {
  const baseFlag = argv.findIndex((arg) => arg === "--base" || arg === "-b");
  const baseBranch = baseFlag >= 0 && argv[baseFlag + 1] ? argv[baseFlag + 1] : null;
  const onWindows = process.platform === "win32";
  const installDeps =
    !argv.includes("--no-install") && (!onWindows || argv.includes("--install"));

  const analyzeArgs = ["analyze", "--diff", "--no-log"];
  if (baseBranch) analyzeArgs.push(baseBranch);

  if (onWindows) {
    for (const tool of WINDOWS_ANALYZE_TOOLS) {
      analyzeArgs.push("--tool", tool);
    }
    if (installDeps) analyzeArgs.push("--install-dependencies");
    else analyzeArgs.push("--fail-if-missing");
    return { analyzeArgs, onWindows, installDeps };
  }

  if (installDeps) analyzeArgs.push("--install-dependencies");
  else analyzeArgs.push("--fail-if-missing");
  return { analyzeArgs, onWindows, installDeps };
}

function runCodacy(args, options = {}) {
  const { inherit = false, timeout } = options;
  const { cmd, args: cmdArgs, shell } = resolveCodacyInvocation(REPO_ROOT, args);
  const result = spawnSync(cmd, cmdArgs, {
    cwd: REPO_ROOT,
    encoding: inherit ? undefined : "utf-8",
    shell: shell ?? false,
    stdio: inherit ? "inherit" : "pipe",
    env: {
      ...process.env,
      CODACY_DISABLE_UPDATE_CHECK: "1",
      NODE_OPTIONS: "--max-old-space-size=4096",
    },
    timeout,
  });
  if (inherit) {
    return { ok: result.status === 0, status: result.status, output: "" };
  }
  return {
    ok: result.status === 0,
    status: result.status,
    output: `${result.stdout || ""}${result.stderr || ""}`,
  };
}

function ensureConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return true;
  }

  log("⚠️  Falta .codacy/codacy.config.json", "yellow");
  log("   Primera vez: descarga el CLI de Codacy y genera la config (~3–10 min).", "dim");
  log("   También podés correr por separado: npm run codacy:init\n", "dim");
  log("⏳ codacy-analysis init --auto Critical,High,Security …", "cyan");

  const init = runCodacy(["init", "--auto", "Critical,High,Security"], { inherit: true });
  if (!init.ok) {
    log("\nFalló codacy-analysis init. Probá manualmente:\n  npm run codacy:init\n", "red");
    return false;
  }

  log("\n⏳ codacy-analysis update-config (sincroniza exclude_paths de .codacy.yml)…", "cyan");
  const update = runCodacy(["update-config"], { inherit: true });
  if (!update.ok) {
    log("update-config falló — continuá igual; revisá .codacy.yml si hace falta.", "yellow");
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    log("\nNo se generó .codacy/codacy.config.json tras init.", "red");
    return false;
  }

  log("✓ Config local lista en .codacy/codacy.config.json\n", "green");
  return true;
}

function main() {
  const argv = process.argv.slice(2);
  const { analyzeArgs, onWindows, installDeps } = buildAnalyzeArgs(argv);

  log("\n╔════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  MIM CODACY CLI GATE — análisis oficial (--diff)              ║", "cyan");
  log("╚════════════════════════════════════════════════════════════════╝", "cyan");

  if (onWindows) {
    log("\nℹ️  Windows: Opengrep/Semgrep no tiene binario win32 (solo Linux/macOS).", "dim");
    log("   Este gate corre ESLint9 + Stylelint + Spectral. Security rules: Codacy Cloud en el PR.", "dim");
    if (!installDeps) {
      log("   Modo rápido (--no-install por defecto en Windows). Forzá install: npm run codacy:cli -- --install\n", "dim");
    }
  }

  const installError = assertCodacyCliInstalled(REPO_ROOT);
  if (installError) {
    log(`\n❌ ${installError}`, "red");
    process.exit(1);
  }

  if (!ensureConfig()) {
    process.exit(1);
  }

  log("⏳ codacy-analysis analyze --diff …", "cyan");
  if (installDeps) log("   (descargando analizadores faltantes — puede tardar varios minutos)\n", "dim");
  else log("");
  const analysis = runCodacy(analyzeArgs, { inherit: true, timeout: 30 * 60 * 1000 });

  if (analysis.ok) {
    log("\n✅ CODACY CLI — sin issues en el diff.", "green");
    if (onWindows) {
      log("   Semgrep/Opengrep: validá en el check de Codacy del PR (corre en Linux).", "dim");
      log("   ESLint estricto local: npm run codacy:diff\n", "dim");
    } else {
      log("");
    }
    process.exit(0);
  }

  const logPath = saveGateFailureLog({
    logSubdir: "codacy-cli-gates",
    filePrefix: "codacy-cli-failed",
    target: "local",
    branchName: "local",
    failedGate: "Codacy Analysis CLI (--diff)",
    failedGateId: "codacy-cli",
    reason: "codacy-analysis reportó issues o herramientas faltantes.",
    output: analysis.output || "(salida en consola — init/analyze con stdio inherit)",
  });

  log("\n🚨 CODACY CLI GATE — FALLÓ", "red");
  log(`📄 Log: ${logPath}`, "yellow");
  log("\nPara reglas idénticas a Codacy Cloud:\n  set CODACY_API_TOKEN=… && npm run codacy:init:remote\n", "dim");
  log("Para el día a día (más rápido): npm run codacy:diff\n", "dim");
  process.exit(analysis.status === 0 ? 1 : analysis.status || 1);
}

main();
