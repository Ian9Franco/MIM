const { execSync } = require("child_process");

function collectPullRequests(runGit, repoRoot) {
  const openPrs = [];
  const closedPrs = [];
  try {
    const rawPrs = runGit(["ls-remote", "origin", "refs/pull/*/head"]);
    for (const line of rawPrs.split("\n").filter(Boolean)) {
      const parts = line.split("\t");
      if (parts.length < 2) continue;
      const hash = parts[0].trim();
      const match = parts[1].match(/refs\/pull\/(\d+)\/head/);
      if (!match) continue;
      let isMerged = false;
      try {
        execSync(`git merge-base --is-ancestor ${hash} main`, { cwd: repoRoot, stdio: "ignore" });
        isMerged = true;
      } catch {
        isMerged = false;
      }
      (isMerged ? closedPrs : openPrs).push(match[1]);
    }
  } catch {
    /* ignore */
  }
  return { openPrs, closedPrs };
}

function collectRemoteBranches(runGit, merged) {
  const flag = merged ? "--merged" : "--no-merged";
  try {
    return runGit(["branch", "-r", flag, "main"])
      .split("\n")
      .map((b) => b.trim().replace(/^origin\//, ""))
      .filter((b) => b && !b.startsWith("HEAD") && b !== "main" && b !== "master" && !b.startsWith("backup/"));
  } catch {
    return [];
  }
}

function listAvailableTargets(runGit, repoRoot, log) {
  log("\n📡 Consultando ramas y PRs en GitHub...", "cyan");
  try {
    runGit(["fetch", "origin"]);
  } catch {
    /* ignore */
  }

  const { openPrs, closedPrs } = collectPullRequests(runGit, repoRoot);
  const openBranches = collectRemoteBranches(runGit, false);
  const mergedBranches = collectRemoteBranches(runGit, true);

  log("\n─────────────────────────────────────────────────────────────────────────────", "dim");
  log("🟢 PENDIENTES / ABIERTAS (Esperando tu revisión o auditoría):", "green");
  if (openPrs.length > 0 || openBranches.length > 0) {
    for (const pr of openPrs) log(`     • PR #${pr}  ➔  npm run pr:audit ${pr}`, "green");
    for (const br of openBranches) log(`     • ${br}  ➔  npm run pr:audit ${br}`, "green");
  } else {
    log("  (No hay PRs ni ramas pendientes. ¡Todo al día!)", "dim");
  }

  log("\n⚪ CERRADAS / RESUELTAS (Ya incorporadas en main):", "dim");
  if (closedPrs.length > 0 || mergedBranches.length > 0) {
    if (closedPrs.length > 0) log(`  PRs resueltos: ${closedPrs.map((p) => `#${p}`).join(", ")}`, "dim");
    if (mergedBranches.length > 0) log(`  Ramas mergeadas: ${mergedBranches.join(", ")}`, "dim");
  } else {
    log("  (Sin historial reciente de merges)", "dim");
  }
  log("");
}

module.exports = { listAvailableTargets };
