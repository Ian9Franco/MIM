const { listAvailableTargets } = require("./review-pr-targets");

function printHelp(log) {
  log("\n📖 Uso de MIM Safe PR Auditor & Workflow:", "bold");
  log("  npm run pr:audit <pr | rama>        Auditoría segura (READY/HOLD/REQUEST_CHANGES).");
  log("  npm run pr:promote                  Merge manual a main tras verificar compuertas.");
  log("  npm run pr:return                   Vuelve a main sin mergear.\n");
}

function resolveCommand(rawArgs) {
  const firstArg = rawArgs[0];
  if (!firstArg || firstArg === "--help" || firstArg === "-h" || firstArg === "--list" || firstArg === "-l") return { type: "help" };
  if (["audit", "--audit", "gatekeeper", "--gatekeeper", "-g"].includes(firstArg)) {
    return { type: "audit", target: rawArgs[1] };
  }
  if (["promote", "--promote", "-m", "--merge"].includes(firstArg)) return { type: "promote" };
  if (["return", "--return", "-r", "--back", "--abort"].includes(firstArg)) return { type: "return" };
  return { type: "audit", target: firstArg };
}

async function runReviewPrCli(ctx, rawArgs) {
  const { log, handleAudit, handlePromote, handleReturn, runGit, repoRoot } = ctx;
  const command = resolveCommand(rawArgs);
  if (command.type === "help") {
    printHelp(log);
    listAvailableTargets(runGit, repoRoot, log);
    return;
  }
  if (command.type === "promote") {
    await handlePromote();
    return;
  }
  if (command.type === "return") {
    handleReturn();
    return;
  }
  if (!command.target) {
    log("\n❌ Falta especificar el PR o rama para auditar.", "red");
    listAvailableTargets(runGit, repoRoot, log);
    process.exit(1);
  }
  await handleAudit(command.target);
}

module.exports = { runReviewPrCli };
