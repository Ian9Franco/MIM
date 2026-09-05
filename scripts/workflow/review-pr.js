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

const { execFileSync, execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const REPO_ROOT = path.join(__dirname, "..", "..");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

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
  const logDir = path.join(REPO_ROOT, "logs", "pr-audits");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const humanTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const sanitizedTarget = String(target).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `audit-failed-PR-${sanitizedTarget}-${timestamp}.log`;
  const filePath = path.join(logDir, fileName);

  const content = [
    "================================================================================",
    "MIM PR AUDITOR — INFORME DE FALLO DE CONTROL DE CALIDAD",
    "================================================================================",
    `Fecha y Hora:      ${humanTime}`,
    `Objetivo auditado: ${target}`,
    `Rama de trabajo:   ${branchName}`,
    `Veredicto:         REQUEST_CHANGES`,
    `Compuerta fallida: ${failedGate}`,
    `Motivo:            ${reason}`,
    "",
    "────────────────────────────────────────────────────────────────────────────────",
    "COMMITS DEL PR (vs origin/main):",
    "────────────────────────────────────────────────────────────────────────────────",
    commits || "(Sin commits detectados)",
    "",
    "────────────────────────────────────────────────────────────────────────────────",
    "ARCHIVOS MODIFICADOS (diff --stat):",
    "────────────────────────────────────────────────────────────────────────────────",
    diffStat || "(Sin archivos modificados)",
    "",
    "────────────────────────────────────────────────────────────────────────────────",
    "SALIDA DE LA COMPUERTA FALLIDA:",
    "────────────────────────────────────────────────────────────────────────────────",
    output || "(Sin salida capturada)",
    "================================================================================",
    ""
  ].join("\n");

  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function runAsyncCmd(title, cmd, args) {
  return new Promise((resolve) => {
    log(`\n  ⏳ ${title}...`, "cyan");
    const start = Date.now();
    let capturedOutput = "";

    const proc = spawn(cmd, args, {
      cwd: REPO_ROOT,
      shell: true,
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
    });

    if (proc.stdout) {
      proc.stdout.on("data", (chunk) => {
        process.stdout.write(chunk);
        capturedOutput += chunk.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on("data", (chunk) => {
        process.stderr.write(chunk);
        capturedOutput += chunk.toString();
      });
    }

    proc.on("close", (code) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      if (code === 0) {
        log(`  ✓ ${title} completado exitosamente (${elapsed}s)`, "green");
        resolve({ ok: true, elapsed, output: capturedOutput });
      } else {
        log(`  ✗ ${title} falló con código ${code} (${elapsed}s)`, "red");
        resolve({ ok: false, elapsed, code, output: capturedOutput });
      }
    });

    proc.on("error", (err) => {
      log(`  ✗ Fallo al ejecutar ${title}: ${err.message}`, "red");
      resolve({ ok: false, elapsed: 0, code: 1, output: err.message });
    });
  });
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

async function runAllQualityGates(contextLabel = "COMPUERTAS DE CALIDAD") {
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "dim");
  log(`🛡️  EJECUTANDO ${contextLabel}`, "bold");
  log(`─────────────────────────────────────────────────────────────────────────────`, "dim");

  const gates = [
    { title: "1. Verificación Estructural de API Guard", cmd: "npm", args: ["run", "lint:api-guard"], reason: "Fallo en la auditoría estructural de API Guard (rutas desprotegidas)." },
    { title: "2. Verificación de Fronteras de Arquitectura", cmd: "npm", args: ["run", "lint:architecture"], reason: "Fallo en las fronteras de arquitectura (dependencias cruzadas no permitidas)." },
    { title: "3. Contratos de Fronteras Arquitectónicas", cmd: "npm", args: ["run", "test:architecture"], reason: "Fallo en la suite de pruebas de contratos arquitectónicos." },
    { title: "4. Verificación de Tipos TypeScript (Raíz / Desktop)", cmd: "npx", args: ["tsc", "--noEmit"], reason: "Fallo en la comprobación estática de TypeScript (Raíz)." },
    { title: "5. Verificación de Tipos TypeScript (MIMweb)", cmd: "npx", args: ["tsc", "--project", "web/tsconfig.json", "--noEmit"], reason: "Fallo en la comprobación estática de TypeScript (web/tsconfig.json)." },
    { title: "6. Suite de Tests Unificados (npm test)", cmd: "node", args: ["scripts/test-runner.js"], reason: "Fallo en una o más suites del Test Runner unificado de MIM." },
  ];

  for (const g of gates) {
    const res = await runAsyncCmd(g.title, g.cmd, g.args);
    if (!res.ok) {
      return {
        ok: false,
        gateTitle: g.title,
        reason: g.reason,
        output: res.output,
      };
    }
  }

  return { ok: true };
}

/**
 * Auditoría segura de PR/rama:
 * - Descarga y cambia a la rama del PR.
 * - Compara contra origin/main (commits, archivos, commits atrasados).
 * - Ejecuta las 6 compuertas de calidad.
 * - Emite veredicto estructurado:
 *     REQUEST_CHANGES -> Si alguna compuerta falla (genera log y aborta).
 *     HOLD            -> Si aprueba las compuertas pero la rama está atrasada con main.
 *     READY           -> Si aprueba el 100% y está al día con main (habilita npm run pr:promote).
 * - NUNCA realiza merge ni push automático a main.
 */
async function handleAudit(target) {
  checkCleanWorkingDirectory();

  const isPrNumber = /^[#]?\d+$/.test(target);
  let branchToCheckout = target;

  log(`\n─────────────────────────────────────────────────────────────────────────────`, "dim");
  log(`🔍 MIM SAFE PR AUDITOR — Auditoría de Integridad: ${target}`, "bold");
  log(`─────────────────────────────────────────────────────────────────────────────`, "dim");

  if (isPrNumber) {
    const prNum = target.replace("#", "");
    branchToCheckout = `pr-${prNum}`;
    log(`• Descargando Pull Request #${prNum} desde origin...`, "cyan");
    try {
      runGit(["fetch", "origin", `pull/${prNum}/head:${branchToCheckout}`]);
    } catch {
      log(`No se pudo descargar 'pull/${prNum}/head'. Intentando checkout directo si la rama existe...`, "yellow");
    }
  } else {
    validateBranchName(target);
    log(`• Obteniendo cambios remotos de '${target}'...`, "cyan");
    try {
      runGit(["fetch", "origin", target]);
    } catch {}
  }

  log(`• Haciendo checkout a '${branchToCheckout}'...`, "cyan");
  runGit(["checkout", branchToCheckout]);

  try {
    runGit(["pull"]);
  } catch {}

  // Sincronizar referencia de origin/main para cálculo preciso de divergencia
  try {
    runGit(["fetch", "origin", "main"]);
  } catch {}

  let commits = "";
  try {
    commits = runGit(["log", "--oneline", "origin/main..HEAD", "-n", "10"]);
  } catch {}

  let diffStat = "";
  try {
    diffStat = runGit(["diff", "--stat", "origin/main..HEAD"]);
  } catch {}

  let behindCount = 0;
  try {
    const countStr = runGit(["rev-list", "--count", "HEAD..origin/main"]);
    behindCount = parseInt(countStr, 10) || 0;
  } catch {}

  log(`\n📦 Commits introducidos (vs origin/main):`, "bold");
  console.log(commits || "  (Sin diferencias de commits nuevos respecto a main)");

  log(`\n📁 Archivos modificados:`, "bold");
  console.log(diffStat || "  (Sin diferencias de archivos con origin/main)");

  if (behindCount > 0) {
    log(`\n⚠️  Estado de sincronización: Esta rama está ${behindCount} commit(s) por detrás de origin/main.`, "yellow");
  } else {
    log(`\n✓ Estado de sincronización: Al día con origin/main (0 commits behind).`, "green");
  }

  // Ejecutar compuertas completas
  const gateResult = await runAllQualityGates("COMPUERTAS DE CALIDAD — AUDITORÍA DE PR");

  if (!gateResult.ok) {
    cleanTransientTestArtifacts();

    const logPath = saveFailureLog(
      target,
      branchToCheckout,
      gateResult.gateTitle,
      gateResult.reason,
      gateResult.output,
      commits,
      diffStat
    );

    log(`\n─────────────────────────────────────────────────────────────────────────────`, "red");
    log(`🚨 VEREDICTO: [REQUEST_CHANGES] — CONTROL DE CALIDAD NO SUPERADO`, "red");
    log(`─────────────────────────────────────────────────────────────────────────────`, "red");
    log(`Compuerta fallida: ${gateResult.gateTitle}`, "red");
    log(`Motivo:            ${gateResult.reason}`, "red");
    log(`\n📄 Reporte detallado del fallo guardado en:`, "yellow");
    log(`   ${logPath}`, "bold");
    log(`\nAuditoría Segura: Ningún cambio fue mergeado a 'main' ni subido a origin.\n`, "yellow");
    log(`Opciones siguientes:`);
    log(`  👉 Para volver a main sin tocar nada:`, "yellow");
    log(`     npm run pr:return\n`);
    process.exit(1);
  }

  cleanTransientTestArtifacts();

  if (behindCount > 0) {
    log(`\n─────────────────────────────────────────────────────────────────────────────`, "yellow");
    log(`⏸️  VEREDICTO: [HOLD] — COMPUERTAS APROBADAS PERO RAMA DESACTUALIZADA`, "yellow");
    log(`─────────────────────────────────────────────────────────────────────────────`, "yellow");
    log(`• La rama '${branchToCheckout}' superó el 100% de las compuertas de calidad.`);
    log(`• Sin embargo, está ${behindCount} commit(s) por detrás de 'origin/main'.`, "yellow");
    log(`\nAcción requerida antes de promover:`, "bold");
    log(`  1. Traer los cambios más recientes de main para evitar regresiones o conflictos:`, "cyan");
    log(`     git merge origin/main   (o git rebase origin/main)`);
    log(`  2. Volver a auditar:`, "cyan");
    log(`     npm run pr:audit ${target}\n`);
    log(`  👉 Para volver a main sin mergear:`, "dim");
    log(`     npm run pr:return\n`, "dim");
    return;
  }

  log(`\n─────────────────────────────────────────────────────────────────────────────`, "green");
  log(`✅ VEREDICTO: [READY] — LISTO PARA PROMOCIÓN MANUAL A MAIN`, "green");
  log(`─────────────────────────────────────────────────────────────────────────────`, "green");
  log(`• La rama '${branchToCheckout}' superó el 100% de las compuertas de calidad.`);
  log(`• Está completamente al día con 'origin/main' (0 commits behind).`);
  log(`• Principio de Auditoría Segura: NO se realizó auto-merge ni auto-push destructivo.`);
  log(`\nAcción recomendada:`, "bold");
  log(`  👉 Para mergear y subir a main de forma manual y explícita:`, "cyan");
  log(`     npm run pr:promote\n`);
  log(`  👉 Para volver a main sin mergear:`, "yellow");
  log(`     npm run pr:return\n`);
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

function listAvailableTargets() {
  log("\n📡 Consultando ramas y PRs en GitHub...", "cyan");
  try {
    runGit(["fetch", "origin"]);
  } catch {}

  const openPrs = [];
  const closedPrs = [];

  try {
    const rawPrs = runGit(["ls-remote", "origin", "refs/pull/*/head"]);
    const lines = rawPrs.split("\n").filter(Boolean);
    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length >= 2) {
        const hash = parts[0].trim();
        const match = parts[1].match(/refs\/pull\/(\d+)\/head/);
        if (match) {
          let isMerged = false;
          try {
            execSync(`git merge-base --is-ancestor ${hash} main`, { cwd: REPO_ROOT, stdio: "ignore" });
            isMerged = true;
          } catch {
            isMerged = false;
          }
          if (isMerged) {
            closedPrs.push(match[1]);
          } else {
            openPrs.push(match[1]);
          }
        }
      }
    }
  } catch {}

  let openBranches = [];
  try {
    const rawBranches = runGit(["branch", "-r", "--no-merged", "main"]);
    openBranches = rawBranches
      .split("\n")
      .map((b) => b.trim().replace(/^origin\//, ""))
      .filter((b) => b && !b.startsWith("HEAD") && b !== "main" && b !== "master" && !b.startsWith("backup/"));
  } catch {}

  let mergedBranches = [];
  try {
    const rawMerged = runGit(["branch", "-r", "--merged", "main"]);
    mergedBranches = rawMerged
      .split("\n")
      .map((b) => b.trim().replace(/^origin\//, ""))
      .filter((b) => b && !b.startsWith("HEAD") && b !== "main" && b !== "master" && !b.startsWith("backup/"));
  } catch {}

  log("\n─────────────────────────────────────────────────────────────────────────────", "dim");
  log("🟢 PENDIENTES / ABIERTAS (Esperando tu revisión o auditoría):", "green");
  log("─────────────────────────────────────────────────────────────────────────────", "dim");

  if (openPrs.length > 0 || openBranches.length > 0) {
    if (openPrs.length > 0) {
      log("  🔢 Pull Requests:", "bold");
      for (const pr of openPrs) {
        log(`     • PR #${pr}  ➔  npm run pr:audit ${pr}`, "green");
      }
    }
    if (openBranches.length > 0) {
      log("\n  🌿 Ramas:", "bold");
      for (const br of openBranches) {
        log(`     • ${br}  ➔  npm run pr:audit ${br}`, "green");
      }
    }
  } else {
    log("  (No hay PRs ni ramas pendientes. ¡Todo al día!)", "dim");
  }

  log("\n─────────────────────────────────────────────────────────────────────────────", "dim");
  log("⚪ CERRADAS / RESUELTAS (Ya incorporadas en main):", "dim");
  log("─────────────────────────────────────────────────────────────────────────────", "dim");

  if (closedPrs.length > 0 || mergedBranches.length > 0) {
    if (closedPrs.length > 0) {
      log(`  🔢 PRs resueltos: ${closedPrs.map((p) => `#${p}`).join(", ")}`, "dim");
    }
    if (mergedBranches.length > 0) {
      log(`  🌿 Ramas ya mergeadas: ${mergedBranches.join(", ")}`, "dim");
    }
  } else {
    log("  (Sin historial reciente de merges)", "dim");
  }
  log("");
}

async function main() {
  const rawArgs = process.argv.slice(2).filter((arg) => arg !== "--");

  if (
    rawArgs.length === 0 ||
    rawArgs.includes("--help") ||
    rawArgs.includes("-h") ||
    rawArgs.includes("--list") ||
    rawArgs.includes("-l")
  ) {
    log("\n📖 Uso de MIM Safe PR Auditor & Workflow:", "bold");
    log("  npm run pr:audit <pr | rama>        Auditoría segura: corre compuertas y emite veredicto (READY/HOLD/REQUEST_CHANGES).");
    log("  npm run gatekeeper <pr | rama>      Alias idéntico a pr:audit.");
    log("  npm run pr:review                   Lista todos los PRs y ramas disponibles para auditar.");
    log("  npm run pr:review <pr | rama>       Audita e inspecciona un PR o rama.");
    log("  npm run pr:promote                  Promoción manual: mergea la rama auditada a main tras verificar compuertas.");
    log("  npm run pr:return                   Vuelve a main de forma segura sin mergear.\n");
    log("Ejemplos:");
    log("  npm run pr:audit 15");
    log("  npm run pr:review 15");
    log("  npm run pr:promote");

    listAvailableTargets();
    process.exit(0);
  }

  const firstArg = rawArgs[0];

  if (
    firstArg === "audit" ||
    firstArg === "--audit" ||
    firstArg === "gatekeeper" ||
    firstArg === "--gatekeeper" ||
    firstArg === "-g"
  ) {
    const target = rawArgs[1];
    if (!target) {
      log("\n❌ Falta especificar el PR o rama para auditar.", "red");
      log("Uso: npm run pr:audit <numero_de_pr | nombre_de_rama>", "yellow");
      log("Ejemplo: npm run pr:audit 15\n", "yellow");
      listAvailableTargets();
      process.exit(1);
    }
    await handleAudit(target);
    return;
  }

  if (firstArg === "promote" || firstArg === "--promote" || firstArg === "-m" || firstArg === "--merge") {
    await handlePromote();
    return;
  }

  if (firstArg === "return" || firstArg === "--return" || firstArg === "-r" || firstArg === "--back" || firstArg === "--abort") {
    handleReturn();
    return;
  }

  await handleAudit(firstArg);
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
