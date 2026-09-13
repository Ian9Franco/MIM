const { printRequestChanges, printHold, printReady } = require("./review-pr-verdicts");

async function checkoutAuditTarget(runGit, validateBranchName, log, target) {
  const isPrNumber = /^[#]?\d+$/.test(target);
  let branchToCheckout = target;
  if (isPrNumber) {
    const prNum = target.replace("#", "");
    branchToCheckout = `pr-${prNum}`;
    log(`• Descargando Pull Request #${prNum} desde origin...`, "cyan");
    try {
      runGit(["fetch", "origin", `pull/${prNum}/head:${branchToCheckout}`]);
    } catch {
      log(`No se pudo descargar pull/${prNum}/head. Intentando checkout directo...`, "yellow");
    }
  } else {
    validateBranchName(target);
    try {
      runGit(["fetch", "origin", target]);
    } catch {
      /* ignore */
    }
  }
  runGit(["checkout", branchToCheckout]);
  try {
    runGit(["pull"]);
  } catch {
    /* ignore */
  }
  try {
    runGit(["fetch", "origin", "main"]);
  } catch {
    /* ignore */
  }
  return branchToCheckout;
}

function readAuditDiff(runGit) {
  let commits = "";
  let diffStat = "";
  let behindCount = 0;
  try {
    commits = runGit(["log", "--oneline", "origin/main..HEAD", "-n", "10"]);
  } catch {
    /* ignore */
  }
  try {
    diffStat = runGit(["diff", "--stat", "origin/main..HEAD"]);
  } catch {
    /* ignore */
  }
  try {
    behindCount = parseInt(runGit(["rev-list", "--count", "HEAD..origin/main"]), 10) || 0;
  } catch {
    /* ignore */
  }
  return { commits, diffStat, behindCount };
}

async function handleAudit(ctx, target) {
  const { runGit, validateBranchName, log, checkCleanWorkingDirectory, cleanTransientTestArtifacts, runAllQualityGates, saveFailureLog } = ctx;
  checkCleanWorkingDirectory();
  log(`\n🔍 MIM SAFE PR AUDITOR — Auditoría de Integridad: ${target}`, "bold");
  const branchToCheckout = await checkoutAuditTarget(runGit, validateBranchName, log, target);
  const { commits, diffStat, behindCount } = readAuditDiff(runGit);

  log(`\n📦 Commits introducidos (vs origin/main):`, "bold");
  console.log(commits || "  (Sin diferencias de commits nuevos respecto a main)");
  log(`\n📁 Archivos modificados:`, "bold");
  console.log(diffStat || "  (Sin diferencias de archivos con origin/main)");

  const gateResult = await runAllQualityGates("COMPUERTAS DE CALIDAD — AUDITORÍA DE PR");
  if (!gateResult.ok) {
    cleanTransientTestArtifacts();
    const logPath = saveFailureLog(target, branchToCheckout, gateResult.gateTitle, gateResult.reason, gateResult.output, commits, diffStat);
    printRequestChanges(log, gateResult, logPath);
    process.exit(1);
  }

  cleanTransientTestArtifacts();
  if (behindCount > 0) {
    printHold(log, branchToCheckout, behindCount, target);
    return;
  }
  printReady(log, branchToCheckout);
}

module.exports = { handleAudit };
