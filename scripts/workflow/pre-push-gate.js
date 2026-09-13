#!/usr/bin/env node

/**
 * MIM — Pre-Push CI Gate (local Codacy/Actions parity)
 * ─────────────────────────────────────────────────────────────────────────────
 * Ejecuta las mismas compuertas que GitHub Actions antes de `git push`.
 * Evita sorpresas en el PR: tsc, eslint, tests, DAST y builds de producción.
 *
 * Uso:
 *   npm run pre:push              # Espejo completo de CI (~15–25 min)
 *   npm run pre:push:quick        # Sin test:coverage ni builds (~8 min)
 *   npm run pre:push:lint         # Solo tsc + eslint + arquitectura (~2 min)
 *
 * Codacy analiza el diff en el PR (ESLint más estricto que local). Este gate
 * no lo reemplaza, pero cubre el 100% de los jobs de .github/workflows/ci.yml
 * excepto upload a Codacy y eval live de MIMbot (requiere secrets).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { execFileSync } = require("child_process");
const {
  log,
  runGates,
  saveGateFailureLog,
  CI_PUSH_GATES,
  CI_PUSH_QUICK_GATES,
  CI_PUSH_LINT_GATES,
} = require("./ci-gates");

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf-8", cwd: require("./ci-gates").REPO_ROOT }).trim();
}

function resolveMode(argv) {
  if (argv.includes("--lint") || argv.includes("--lint-only")) return "lint";
  if (argv.includes("--quick")) return "quick";
  return "full";
}

function selectGates(mode) {
  if (mode === "lint") return CI_PUSH_LINT_GATES;
  if (mode === "quick") return CI_PUSH_QUICK_GATES;
  return CI_PUSH_GATES;
}

function describeMode(mode) {
  if (mode === "lint") return "LINT + TSC + ARQUITECTURA (rápido)";
  if (mode === "quick") return "CI sin builds ni test:coverage";
  return "CI COMPLETO (paridad con GitHub Actions)";
}

async function main() {
  const mode = resolveMode(process.argv.slice(2));
  const gates = selectGates(mode);

  let branch = "unknown";
  let ahead = 0;
  let behind = 0;
  try {
    branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {}

  try {
    runGit(["fetch", "origin", "main"]);
    ahead = parseInt(runGit(["rev-list", "--count", "origin/main..HEAD"]), 10) || 0;
    behind = parseInt(runGit(["rev-list", "--count", "HEAD..origin/main"]), 10) || 0;
  } catch {}

  log("\n╔════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  MIM PRE-PUSH GATE — Espejo local de CI / anti-sorpresa PR    ║", "cyan");
  log("╚════════════════════════════════════════════════════════════════╝", "cyan");
  log(`\nModo:   ${describeMode(mode)}`, "bold");
  log(`Rama:   ${branch}`, "dim");
  if (ahead > 0) log(`Commits por pushear vs origin/main: ${ahead}`, "dim");
  if (behind > 0) {
    log(`⚠️  Estás ${behind} commit(s) atrás de origin/main — el PR puede pedir merge/rebase.`, "yellow");
  }

  log("\nReferencia: .github/workflows/ci.yml", "dim");
  log("Codacy (PR): analiza diff con ESLint estricto — revisá el check en GitHub si falla.\n", "dim");

  const result = await runGates(gates, `PRE-PUSH — ${describeMode(mode)}`);

  if (!result.ok) {
    const logPath = saveGateFailureLog({
      logSubdir: "pre-push-gates",
      filePrefix: "pre-push-failed",
      target: branch,
      branchName: branch,
      failedGate: result.gateTitle,
      failedGateId: result.gateId,
      ciJob: result.ciJob,
      reason: result.reason,
      output: result.output,
      extraSections: [
        { title: "Modo", content: describeMode(mode) },
        { title: "Compuertas ejecutadas", content: gates.map((g) => g.title).join("\n") },
      ],
    });

    log("\n─────────────────────────────────────────────────────────────────────────────", "red");
    log("🚨 PRE-PUSH GATE — FALLÓ (no pushees hasta corregir)", "red");
    log("─────────────────────────────────────────────────────────────────────────────", "red");
    log(`Compuerta:  ${result.gateTitle}`, "red");
    if (result.ciJob) log(`Job CI:     ${result.ciJob}`, "yellow");
    log(`Motivo:     ${result.reason}`, "red");
    log(`\n📄 Log completo:\n   ${logPath}`, "yellow");
    log("\nSugerencias:", "bold");
    log("  • Corregí el fallo y volvé a correr: npm run pre:push", "dim");
    log("  • Iteración rápida: npm run pre:push:lint", "dim");
    log("  • Sin builds (más rápido): npm run pre:push:quick\n", "dim");
    process.exit(1);
  }

  log("\n─────────────────────────────────────────────────────────────────────────────", "green");
  log("✅ PRE-PUSH GATE — APROBADO", "green");
  log("─────────────────────────────────────────────────────────────────────────────", "green");
  log("Paridad local con CI superada. Seguro para git push.", "green");
  log("Recordá: Codacy puede marcar issues nuevos en el diff del PR.\n", "dim");
}

main().catch((error) => {
  log(`\nFatal: ${error.message}`, "red");
  process.exit(1);
});
