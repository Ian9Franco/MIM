#!/usr/bin/env node

/**
 * MIM — AI PR Local Inspector & Quality Gate Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatiza el ciclo de revisión y promoción de PRs creados por agentes/IAs:
 * 
 * Modos de uso:
 *   1. Revisar un PR o rama:
 *      npm run pr:review <numero_pr | nombre_rama>
 *      Ejemplo: npm run pr:review 14
 *      Ejemplo: npm run pr:review audit/api-guard-fail-closed
 * 
 *   2. Promover y mergear a main (tras verificar):
 *      npm run pr:review --promote
 * 
 *   3. Volver a main sin mergear:
 *      npm run pr:review --return
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { execFileSync, spawn } = require("child_process");
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
    return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
  } catch (err) {
    throw new Error(`Error ejecutando 'git ${args.join(" ")}': ${err.message}`);
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
    "MIM GATEKEEPER — INFORME DE FALLO DE AUDITORÍA AUTOMÁTICA",
    "================================================================================",
    `Fecha y Hora:      ${humanTime}`,
    `Objetivo auditado: ${target}`,
    `Rama de trabajo:   ${branchName}`,
    `Compuerta fallida: ${failedGate}`,
    `Motivo:            ${reason}`,
    "",
    "────────────────────────────────────────────────────────────────────────────────",
    "COMMITS DEL PR (vs main):",
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
    log("\nPara no perder trabajo, hacé 'git stash' o commiteá tus cambios antes de revisar otro PR.\n", "yellow");
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

async function handleGatekeeper(target) {
  checkCleanWorkingDirectory();

  const isPrNumber = /^[#]?\d+$/.test(target);
  let branchToCheckout = target;

  log(`\n─────────────────────────────────────────────────────────────────────────────`, "dim");
  log(`🤖 MIM GATEKEEPER AUTOMÁTICO — Inspección, Testeo y Auto-Push: ${target}`, "bold");
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

  let commits = "";
  try {
    commits = runGit(["log", "--oneline", "main..HEAD", "-n", "10"]);
  } catch {}

  let diffStat = "";
  try {
    diffStat = runGit(["diff", "--stat", "main..HEAD"]);
  } catch {}

  log(`\n📦 Commits introducidos (vs main):`, "bold");
  console.log(commits || "  (Sin diferencias de commits con main)");

  log(`\n📁 Archivos modificados:`, "bold");
  console.log(diffStat || "  (Sin diferencias con main)");

  // Ejecutar las compuertas completas
  const gateResult = await runAllQualityGates("COMPUERTAS DE CALIDAD — GATEKEEPER AUTOMÁTICO");

  if (!gateResult.ok) {
    cleanTransientTestArtifacts();
    runGit(["checkout", "main"]);

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
    log(`🚨 GATEKEEPER BLOQUEÓ LA PROMOCIÓN: CONTROL DE CALIDAD NO SUPERADO`, "red");
    log(`─────────────────────────────────────────────────────────────────────────────`, "red");
    log(`Compuerta fallida: ${gateResult.gateTitle}`, "red");
    log(`Motivo:            ${gateResult.reason}`, "red");
    log(`\n📄 Se generó un reporte detallado del fallo con fecha y hora en:`, "yellow");
    log(`   ${logPath}`, "bold");
    log(`\nNingún cambio fue incorporado a 'main' ni subido a origin. Tu main está a salvo.\n`, "yellow");
    process.exit(1);
  }

  // Todo verde -> Auto-merge y push
  cleanTransientTestArtifacts();
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "green");
  log(`✅ COMPUERTAS 100% EN VERDE — EJECUTANDO AUTO-PROMOCIÓN A MAIN`, "green");
  log(`─────────────────────────────────────────────────────────────────────────────`, "green");

  log("1. Cambiando a 'main'...", "cyan");
  runGit(["checkout", "main"]);

  log("2. Sincronizando con origin/main...", "cyan");
  try {
    runGit(["pull", "origin", "main"]);
  } catch {}

  log(`3. Mergeando '${branchToCheckout}' en 'main'...`, "cyan");
  try {
    runGit(["merge", branchToCheckout]);
  } catch (err) {
    log(`\n🚨 Error durante git merge: ${err.message}`, "red");
    process.exit(1);
  }

  log("4. Pusheando a 'origin/main' con bypass de administrador...", "cyan");
  runGit(["push", "origin", "main"]);

  log(`\n🎉 ¡GATEKEEPER EXITOSO!`, "green");
  log(`El PR/rama '${target}' superó el 100% de los testeos, fue mergeado a main y pusheado a origin/main con éxito.`, "green");
  log(`Tu repositorio local y remoto ya tienen los cambios incorporados.\n`, "green");
}

async function handlePromote() {
  const currentBranch = getCurrentBranch();
  if (currentBranch === "main" || currentBranch === "master") {
    log("\n❌ Ya estás parado en 'main'. Para promover un PR primero revisalo con 'npm run pr:review <rama>'.\n", "red");
    process.exit(1);
  }

  checkCleanWorkingDirectory();
  cleanTransientTestArtifacts();

  log(`\n🚀 Iniciando promoción de rama '${currentBranch}' a 'main'...`, "bold");
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

  log(`\n🎉 ¡ÉXITO TOTAL!`, "green");
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

async function reviewTarget(target) {
  checkCleanWorkingDirectory();

  const isPrNumber = /^[#]?\d+$/.test(target);
  let branchToCheckout = target;

  log(`\n─────────────────────────────────────────────────────────────────────────────`, "dim");
  log(`🔍 MIM AI PR Inspector — Inspeccionando: ${target}`, "bold");
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
    } catch {
      // Puede ser rama local o tracking
    }
  }

  log(`• Haciendo checkout a '${branchToCheckout}'...`, "cyan");
  runGit(["checkout", branchToCheckout]);

  try {
    runGit(["pull"]);
  } catch {
    // Si no tiene upstream configurado no pasa nada
  }

  // 1. Mostrar resumen de commits
  log(`\n📦 Commits introducidos (vs main):`, "bold");
  try {
    const commits = runGit(["log", "--oneline", "main..HEAD", "-n", "10"]);
    if (commits) {
      console.log(commits);
    } else {
      log("  (La rama está al mismo nivel o detrás de main)", "dim");
    }
  } catch {
    log("  (No se pudo comparar commits contra main)", "dim");
  }

  // 2. Mostrar resumen de archivos modificados
  log(`\n📁 Archivos modificados:`, "bold");
  try {
    const diffStat = runGit(["diff", "--stat", "main..HEAD"]);
    if (diffStat) {
      console.log(diffStat);
    } else {
      log("  (Sin diferencias con main)", "dim");
    }
  } catch {
    log("  (No se pudo obtener diff con main)", "dim");
  }

  // 3. Quality Gates
  const gateResult = await runAllQualityGates("COMPUERTAS DE CALIDAD LOCALES");
  if (!gateResult.ok) {
    printFailureReport(gateResult.reason);
    return;
  }

  // 4. Veredicto Final
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "green");
  log(`✅ VEREDICTO: EL PR CUMPLE 100% DE LOS ESTÁNDARES DE INGENIERÍA`, "green");
  log(`─────────────────────────────────────────────────────────────────────────────`, "green");
  log(`Todas las compuertas pasaron en verde. Podés revisar los archivos si querés.`);
  log(`  👉 Para mergear y subir a main:`, "cyan");
  log(`     npm run pr:promote  (o npm run pr:review promote)\n`);
  log(`  👉 Para descartar o volver a main sin mergear:`, "yellow");
  log(`     npm run pr:return   (o npm run pr:review return)\n`);
}

function printFailureReport(reason) {
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "red");
  log(`🚨 VEREDICTO: EL PR NO SUPERA LOS CONTROLES DE CALIDAD`, "red");
  log(`─────────────────────────────────────────────────────────────────────────────`, "red");
  log(`Motivo: ${reason}`, "red");
  log(`\nEl código contiene fallas o no cumple con las políticas de seguridad de MIM.`);
  log(`Opciones siguientes:`);
  log(`  👉 Para volver a main sin mergear:`, "yellow");
  log(`     npm run pr:return\n`);
  process.exit(1);
}

function listAvailableTargets() {
  log("\n📡 Consultando ramas y PRs en GitHub...", "cyan");
  try {
    runGit("fetch origin");
  } catch {}

  const openPrs = [];
  const closedPrs = [];

  try {
    const rawPrs = runGit("ls-remote origin refs/pull/*/head");
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
    const rawBranches = runGit("branch -r --no-merged main");
    openBranches = rawBranches
      .split("\n")
      .map((b) => b.trim().replace(/^origin\//, ""))
      .filter((b) => b && !b.startsWith("HEAD") && b !== "main" && b !== "master" && !b.startsWith("backup/"));
  } catch {}

  let mergedBranches = [];
  try {
    const rawMerged = runGit("branch -r --merged main");
    mergedBranches = rawMerged
      .split("\n")
      .map((b) => b.trim().replace(/^origin\//, ""))
      .filter((b) => b && !b.startsWith("HEAD") && b !== "main" && b !== "master" && !b.startsWith("backup/"));
  } catch {}

  log("\n─────────────────────────────────────────────────────────────────────────────", "dim");
  log("🟢 PENDIENTES / ABIERTAS (Esperando tu revisión):", "green");
  log("─────────────────────────────────────────────────────────────────────────────", "dim");

  if (openPrs.length > 0 || openBranches.length > 0) {
    if (openPrs.length > 0) {
      log("  🔢 Pull Requests:", "bold");
      for (const pr of openPrs) {
        log(`     • PR #${pr}  ➔  npm run pr:review ${pr}`, "green");
      }
    }
    if (openBranches.length > 0) {
      log("\n  🌿 Ramas:", "bold");
      for (const br of openBranches) {
        log(`     • ${br}  ➔  npm run pr:review ${br}`, "green");
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
    log("\n📖 Uso de MIM Workflow & Gatekeeper:", "bold");
    log("  npm run gatekeeper <pr | rama>      1-Click: Trae PR, testea TODO. Si pasa ➔ push directo. Si falla ➔ log con fecha.");
    log("  npm run pr:review                   Lista todos los PRs y ramas disponibles para revisar.");
    log("  npm run pr:review <numero_o_rama>   Inspecciona y audita un PR o rama de la IA.");
    log("  npm run pr:promote                  Mergea la rama inspeccionada a main (tras verificar compuertas).");
    log("  npm run pr:return                   Vuelve a main de forma segura.\n");
    log("Ejemplos:");
    log("  npm run gatekeeper 15");
    log("  npm run pr:review 15");

    listAvailableTargets();
    process.exit(0);
  }

  const firstArg = rawArgs[0];

  if (firstArg === "gatekeeper" || firstArg === "--gatekeeper" || firstArg === "-g") {
    const target = rawArgs[1];
    if (!target) {
      log("\n❌ Falta especificar el PR o rama para el Gatekeeper.", "red");
      log("Uso: npm run gatekeeper <numero_de_pr | nombre_de_rama>", "yellow");
      log("Ejemplo: npm run gatekeeper 15\n", "yellow");
      listAvailableTargets();
      process.exit(1);
    }
    await handleGatekeeper(target);
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

  await reviewTarget(firstArg);
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
