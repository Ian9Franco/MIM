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

const { execSync, spawn } = require("child_process");
const path = require("path");

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

function runGit(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
  } catch (err) {
    throw new Error(`Error ejecutando 'git ${cmd}': ${err.message}`);
  }
}

function runAsyncCmd(title, cmd, args) {
  return new Promise((resolve) => {
    log(`\n  ⏳ ${title}...`, "cyan");
    const start = Date.now();
    const proc = spawn(cmd, args, {
      cwd: REPO_ROOT,
      shell: true,
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
    });

    proc.on("close", (code) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      if (code === 0) {
        log(`  ✓ ${title} completado exitosamente (${elapsed}s)`, "green");
        resolve(true);
      } else {
        log(`  ✗ ${title} falló con código ${code} (${elapsed}s)`, "red");
        resolve(false);
      }
    });

    proc.on("error", (err) => {
      log(`  ✗ Fallo al ejecutar ${title}: ${err.message}`, "red");
      resolve(false);
    });
  });
}

function checkCleanWorkingDirectory() {
  const status = runGit("status --porcelain");
  if (status.length > 0) {
    log("\n⚠️  ADVERTENCIA DE SEGURIDAD:", "yellow");
    log("Tenés cambios pendientes sin commitear en tu árbol de trabajo actual:", "yellow");
    console.log(status);
    log("\nPara no perder trabajo, hacé 'git stash' o commiteá tus cambios antes de revisar otro PR.\n", "yellow");
    process.exit(1);
  }
}

function getCurrentBranch() {
  return runGit("rev-parse --abbrev-ref HEAD");
}

async function handlePromote() {
  const currentBranch = getCurrentBranch();
  if (currentBranch === "main" || currentBranch === "master") {
    log("\n❌ Ya estás parado en 'main'. Para promover un PR primero revisalo con 'npm run pr:review <rama>'.\n", "red");
    process.exit(1);
  }

  checkCleanWorkingDirectory();

  log(`\n🚀 Promoviendo rama '${currentBranch}' a 'main'...`, "bold");
  log("1. Cambiando a 'main'...", "cyan");
  runGit("checkout main");

  log("2. Sincronizando 'main' con origin...", "cyan");
  try {
    runGit("pull origin main");
  } catch {
    log("Aviso: no se pudo hacer pull de origin/main o ya está al día.", "dim");
  }

  log(`3. Mergeando '${currentBranch}' en 'main'...`, "cyan");
  runGit(`merge ${currentBranch}`);

  log("4. Pusheando a 'origin/main'...", "cyan");
  runGit("push origin main");

  log(`\n🎉 ¡ÉXITO TOTAL!`, "green");
  log(`La rama '${currentBranch}' fue mergeada y pusheada a 'origin/main'.`, "green");
  log(`Tu main local y remoto ahora tienen todos los cambios probados.\n`, "green");
}

function handleReturn() {
  const currentBranch = getCurrentBranch();
  if (currentBranch === "main") {
    log("\nYa estás en 'main'.", "green");
    return;
  }
  checkCleanWorkingDirectory();
  runGit("checkout main");
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
      runGit(`fetch origin pull/${prNum}/head:${branchToCheckout}`);
    } catch {
      log(`No se pudo descargar 'pull/${prNum}/head'. Intentando checkout directo si la rama existe...`, "yellow");
    }
  } else {
    log(`• Obteniendo cambios remotos de '${target}'...`, "cyan");
    try {
      runGit(`fetch origin ${target}`);
    } catch {
      // Puede ser rama local o tracking
    }
  }

  log(`• Haciendo checkout a '${branchToCheckout}'...`, "cyan");
  runGit(`checkout ${branchToCheckout}`);

  try {
    runGit("pull");
  } catch {
    // Si no tiene upstream configurado no pasa nada
  }

  // 1. Mostrar resumen de commits
  log(`\n📦 Commits introducidos (vs main):`, "bold");
  try {
    const commits = runGit("log --oneline main..HEAD -n 10");
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
    const diffStat = runGit("diff --stat main..HEAD");
    if (diffStat) {
      console.log(diffStat);
    } else {
      log("  (Sin diferencias con main)", "dim");
    }
  } catch {
    log("  (No se pudo obtener diff con main)", "dim");
  }

  // 3. Quality Gates
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "dim");
  log(`🛡️  EJECUTANDO COMPUERTAS DE CALIDAD LOCALES`, "bold");
  log(`─────────────────────────────────────────────────────────────────────────────`, "dim");

  // Gate 1: Structural API Guard
  const gate1 = await runAsyncCmd("1. Verificación Estructural de API Guard", "npm", ["run", "lint:api-guard"]);
  if (!gate1) {
    printFailureReport("Fallo en la auditoría estructural de API Guard (rutas desprotegidas).");
    return;
  }

  // Gate 2: TypeScript Compilation
  const gate2 = await runAsyncCmd("2. Verificación de Tipos TypeScript (tsc --noEmit)", "npx", ["tsc", "--noEmit"]);
  if (!gate2) {
    printFailureReport("Fallo en la comprobación estática de TypeScript.");
    return;
  }

  // Gate 3: MIM Test Runner
  const gate3 = await runAsyncCmd("3. Suite de Tests Unificados (npm test)", "node", ["scripts/test-runner.js"]);
  if (!gate3) {
    printFailureReport("Fallo en una o más suites del Test Runner de MIM.");
    return;
  }

  // 4. Veredicto Final
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "green");
  log(`✅ VEREDICTO: EL PR CUMPLE 100% DE LOS ESTÁNDARES DE INGENIERÍA`, "green");
  log(`─────────────────────────────────────────────────────────────────────────────`, "green");
  log(`Todas las compuertas pasaron en verde. Podés revisar los archivos si querés.`);
  log(`\nOpciones siguientes:`);
  log(`  👉 Para mergear y subir a main:`, "cyan");
  log(`     npm run pr:review --promote\n`);
  log(`  👉 Para descartar o volver a main sin mergear:`, "yellow");
  log(`     npm run pr:review --return\n`);
}

function printFailureReport(reason) {
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "red");
  log(`🚨 VEREDICTO: EL PR NO SUPERA LOS CONTROLES DE CALIDAD`, "red");
  log(`─────────────────────────────────────────────────────────────────────────────`, "red");
  log(`Motivo: ${reason}`, "red");
  log(`\nEl código contiene fallas o no cumple con las políticas de seguridad de MIM.`);
  log(`Opciones siguientes:`);
  log(`  👉 Para volver a main sin mergear:`, "yellow");
  log(`     npm run pr:review --return\n`);
  process.exit(1);
}

async function main() {
  const rawArgs = process.argv.slice(2).filter((arg) => arg !== "--");

  if (rawArgs.length === 0 || rawArgs.includes("--help") || rawArgs.includes("-h")) {
    log("\n📖 Uso de MIM AI PR Inspector:", "bold");
    log("  npm run pr:review <numero_o_rama>   Inspecciona y audita un PR o rama de la IA.");
    log("  npm run pr:review --promote         Mergea la rama inspeccionada a main y la pushea.");
    log("  npm run pr:review --return          Vuelve a main de forma segura.\n");
    log("Ejemplos:");
    log("  npm run pr:review 15");
    log("  npm run pr:review audit/api-guard-fail-closed\n");
    process.exit(0);
  }

  const firstArg = rawArgs[0];

  if (firstArg === "--promote" || firstArg === "-m" || firstArg === "--merge") {
    await handlePromote();
    return;
  }

  if (firstArg === "--return" || firstArg === "-r" || firstArg === "--back" || firstArg === "--abort") {
    handleReturn();
    return;
  }

  await reviewTarget(firstArg);
}

main().catch((err) => {
  log(`\n❌ Error inesperado: ${err.message}\n`, "red");
  process.exit(1);
});
