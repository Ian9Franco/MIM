#!/usr/bin/env node

/**
 * MIM — Safe PR Auditor & Quality Gate Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatiza el ciclo de inspección, auditoría de calidad y promoción de PRs:
 * 
 * Modos de uso:
 *   1. Auditar un PR o rama (emite READY, HOLD o REQUEST_CHANGES sin merge destructivo):
 *      npm run pr:audit <numero_pr | nombre_rama>
 *      (Alias compatibles: npm run gatekeeper <id>, npm run pr:review <id>)
 * 
 *   2. Promover y mergear a main (tras verificar y confirmar el veredicto READY):
 *      npm run pr:promote
 * 
 *   3. Volver a main sin mergear:
 *      npm run pr:return
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { execFileSync } = require("child_process");
const {
  REPO_ROOT,
  log,
  runAsyncCmd,
  runGates,
  saveGateFailureLog,
  PR_AUDIT_GATES,
} = require("./ci-gates");
const { handleAudit: runAudit } = require("./review-pr-audit");
const { runReviewPrCli } = require("./review-pr-cli");

function runGit(args) {
  try {
    const gitArgs = Array.isArray(args) ? args : args.split(" ");
    return execFileSync("git", gitArgs, { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
  } catch (err) {
    throw new Error(`Error ejecutando 'git ${Array.isArray(args) ? args.join(" ") : args}': ${err.message}`);
  }
}

function validateBranchName(branch) {
  try {
    runGit(["check-ref-format", "--branch", branch]);
  } catch {
    throw new Error(`Nombre de rama inválido: '${branch}'`);
  }
}

function saveFailureLog(target, branchName, failedGate, reason, output, commits, diffStat) {
  return saveGateFailureLog({
    logSubdir: "pr-audits",
    filePrefix: "audit-failed-PR",
    target,
    branchName,
    failedGate,
    reason,
    output,
    extraSections: [
      { title: "COMMITS DEL PR (vs origin/main)", content: commits || "(Sin commits detectados)" },
      { title: "ARCHIVOS MODIFICADOS (diff --stat)", content: diffStat || "(Sin archivos modificados)" },
    ],
  });
}

async function runAllQualityGates(contextLabel = "COMPUERTAS DE CALIDAD") {
  return runGates(PR_AUDIT_GATES, contextLabel);
}

function cleanTransientTestArtifacts() {
  try {
    runGit(["checkout", "--", ".mim-index", "lib/.mim-index"]);
  } catch {}
  try {
    runGit(["clean", "-f", "docs/ADUANA_BENCHMARKS.md", "docs/SAGE_EVALUATION.md"]);
  } catch {}
}

function checkCleanWorkingDirectory() {
  cleanTransientTestArtifacts();
  const rawStatus = runGit(["status", "--porcelain"]);
  const lines = rawStatus
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.includes(".mim-index") && !l.includes("ADUANA_BENCHMARKS.md") && !l.includes("SAGE_EVALUATION.md"));

  if (lines.length > 0) {
    log("\n⚠️  ADVERTENCIA DE SEGURIDAD:", "yellow");
    log("Tenés cambios pendientes sin commitear en tu árbol de trabajo actual:", "yellow");
    console.log(lines.join("\n"));
    log("\nPara no perder trabajo, hacé 'git stash' o commiteá tus cambios antes de auditar otro PR.\n", "yellow");
    process.exit(1);
  }
}

function getCurrentBranch() {
  return runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
}

const auditCtx = {
  runGit,
  validateBranchName,
  log,
  checkCleanWorkingDirectory,
  cleanTransientTestArtifacts,
  runAllQualityGates,
  saveFailureLog,
};

async function handleAudit(target) {
  return runAudit(auditCtx, target);
}

async function handlePromote() {
  const currentBranch = getCurrentBranch();
  if (currentBranch === "main" || currentBranch === "master") {
    log("\n❌ Ya estás parado en 'main'. Para promover un PR primero audítalo con 'npm run pr:audit <rama>'.\n", "red");
    process.exit(1);
  }

  checkCleanWorkingDirectory();
  cleanTransientTestArtifacts();

  log(`\n🚀 Iniciando promoción explícita de rama '${currentBranch}' a 'main'...`, "bold");
  log("1. Cambiando a 'main'...", "cyan");
  runGit(["checkout", "main"]);

  log("2. Sincronizando 'main' con origin...", "cyan");
  try {
    runGit(["pull", "origin", "main"]);
  } catch {
    log("Aviso: no se pudo hacer pull de origin/main o ya está al día.", "dim");
  }

  log(`3. Mergeando '${currentBranch}' en 'main'...`, "cyan");
  try {
    runGit(["merge", currentBranch]);
  } catch (err) {
    log(`\n🚨 Fallo durante git merge '${currentBranch}': ${err.message}`, "red");
    runGit(["checkout", currentBranch]);
    process.exit(1);
  }

  log("\n4. Verificando calidad en 'main' antes de autorizar el push a origin...", "cyan");
  const gateResult = await runAllQualityGates("COMPUERTAS DE CALIDAD PRE-PUSH (EN MAIN)");
  if (!gateResult.ok) {
    log("\n🚨 BLOQUEO DE SEGURIDAD PRE-PUSH:", "red");
    log("Las compuertas de calidad fallaron en el merge local de 'main'.", "red");
    log("Restaurando 'main' al estado intacto de origin/main...", "yellow");
    try {
      runGit(["reset", "--hard", "origin/main"]);
    } catch {}
    runGit(["checkout", currentBranch]);
    printFailureReport(`Promoción abortada pre-push: ${gateResult.reason}\nNingún cambio fue subido a origin/main.`);
    return;
  }

  log("\n5. Compuertas 100% en verde. Pusheando a 'origin/main'...", "cyan");
  runGit(["push", "origin", "main"]);

  log(`\n🎉 ¡PROMOCIÓN EXITOSA!`, "green");
  log(`La rama '${currentBranch}' superó todas las pruebas, fue mergeada y pusheada a 'origin/main'.`, "green");
  log(`Tu main local y remoto ahora tienen todos los cambios probados.\n`, "green");
}

function handleReturn() {
  const currentBranch = getCurrentBranch();
  if (currentBranch === "main") {
    log("\nYa estás en 'main'.", "green");
    return;
  }
  checkCleanWorkingDirectory();
  cleanTransientTestArtifacts();
  runGit(["checkout", "main"]);
  log("\n✓ Volviste a la rama 'main' de forma segura.\n", "green");
}

function printFailureReport(reason) {
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "red");
  log(`🚨 VEREDICTO: [REQUEST_CHANGES] — NO SUPERA CONTROLES PRE-PUSH`, "red");
  log(`─────────────────────────────────────────────────────────────────────────────`, "red");
  log(`Motivo: ${reason}`, "red");
  log(`\nEl código contiene fallas o no cumple con las políticas de calidad de MIM.`);
  log(`Opciones siguientes:`);
  log(`  👉 Para volver a main sin mergear:`, "yellow");
  log(`     npm run pr:return\n`);
  process.exit(1);
}

async function main() {
  const rawArgs = process.argv.slice(2).filter((arg) => arg !== "--");
  await runReviewPrCli(
    { log, handleAudit, handlePromote, handleReturn, runGit, repoRoot: REPO_ROOT },
    rawArgs
  );
}

module.exports = {
  runAllQualityGates,
  runAsyncCmd,
  runGit,
  REPO_ROOT,
};

if (require.main === module) {
  main().catch((err) => {
    log(`\n❌ Error inesperado: ${err.message}\n`, "red");
    process.exit(1);
  });
}
