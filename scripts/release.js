#!/usr/bin/env node

/**
 * MIM Release Manager (Híbrido: Modo Interactivo o Automático 1-Click)
 * ─────────────────────────────────────────────────────────────────────────────
 * Modos:
 * 1. Automático (1-Click, sin pausas, compuertas obligatorias):
 *    npm run release:auto [patch|minor|major] ["mensaje opcional"]
 * 
 * 2. Interactivo (Asistente manual con menú y confirmaciones):
 *    npm run release (o npm run release:interactive)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const inquirer = require("inquirer");
const chalk = require("chalk");
const { runAllQualityGates } = require("./workflow/review-pr.js");

const packagePath = path.join(process.cwd(), "package.json");

function run(command, silent = false) {
  try {
    const result = execSync(command, {
      stdio: silent ? "pipe" : "inherit",
      encoding: "utf-8",
    });
    return result?.trim() || "";
  } catch (error) {
    console.log(chalk.red(`\nCommand failed: ${command}`));
    process.exit(1);
  }
}

function getCurrentVersion() {
  if (!fs.existsSync(packagePath)) {
    console.log(chalk.red("package.json not found. Git is disappointed."));
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  return pkg.version;
}

function updateVersion(newVersion) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(chalk.green(`  ✓ package.json actualizado a v${newVersion}`));

  const today = new Date().toISOString().slice(0, 10);

  // README.md
  const readmePath = path.join(process.cwd(), "README.md");
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, "utf-8");
    readme = readme.replace(/Version-(\d+\.\d+\.\d+)-/g, `Version-${newVersion}-`);
    readme = readme.replace(/### ✅ \*\*v\d+\.\d+\.\d+/g, `### ✅ **v${newVersion}`);
    fs.writeFileSync(readmePath, readme);
    console.log(chalk.green("  ✓ README.md actualizado con la nueva versión."));
  }

  // docs/architecture/MIM.md
  const mimDocPath = fs.existsSync(path.join(process.cwd(), "docs", "architecture", "MIM.md"))
    ? path.join(process.cwd(), "docs", "architecture", "MIM.md")
    : path.join(process.cwd(), "docs", "MIM.md");
  if (fs.existsSync(mimDocPath)) {
    let mimDoc = fs.readFileSync(mimDocPath, "utf-8");
    mimDoc = mimDoc.replace(/\*\*Versión:\*\* \d+\.\d+\.\d+/g, `**Versión:** ${newVersion}`);
    mimDoc = mimDoc.replace(/versión \d+\.\d+\.\d+/g, `versión ${newVersion}`);
    mimDoc = mimDoc.replace(/\*\*Última actualización:\*\* \d{4}-\d{2}-\d{2}/g, `**Última actualización:** ${today}`);
    fs.writeFileSync(mimDocPath, mimDoc);
    console.log(chalk.green("  ✓ docs/architecture/MIM.md actualizado con la nueva versión y fecha."));
  }

  // docs/releases/CHANGELOG.md
  const changelogPath = fs.existsSync(path.join(process.cwd(), "docs", "releases", "CHANGELOG.md"))
    ? path.join(process.cwd(), "docs", "releases", "CHANGELOG.md")
    : path.join(process.cwd(), "docs", "CHANGELOG.md");
  if (fs.existsSync(changelogPath)) {
    let changelog = fs.readFileSync(changelogPath, "utf-8");
    changelog = changelog.replace(/> \*\*Versión Actual:\*\* v?\d+\.\d+\.\d+/g, `> **Versión Actual:** v${newVersion}`);
    changelog = changelog.replace(/> \*\*Última actualización:\*\* \d{4}-\d{2}-\d{2}/g, `> **Última actualización:** ${today}`);
    fs.writeFileSync(changelogPath, changelog);
    console.log(chalk.green("  ✓ docs/releases/CHANGELOG.md actualizado con la nueva versión y fecha."));
  }

  // docs/planning/PROJECT_STATUS.md
  const statusPath = path.join(process.cwd(), "docs", "planning", "PROJECT_STATUS.md");
  if (fs.existsSync(statusPath)) {
    let statusDoc = fs.readFileSync(statusPath, "utf-8");
    statusDoc = statusDoc.replace(/\*\*Versión:\*\* v?\d+\.\d+\.\d+/g, `**Versión:** v${newVersion}`);
    fs.writeFileSync(statusPath, statusDoc);
    console.log(chalk.green("  ✓ docs/planning/PROJECT_STATUS.md actualizado"));
  }

  // docs/planning/ROADMAP.md
  const roadmapPath = path.join(process.cwd(), "docs", "planning", "ROADMAP.md");
  if (fs.existsSync(roadmapPath)) {
    let roadmapDoc = fs.readFileSync(roadmapPath, "utf-8");
    roadmapDoc = roadmapDoc.replace(/# MIM — Roadmap Oficial & Estado de Evolución \(v?\d+\.\d+\.\d+\)/g, `# MIM — Roadmap Oficial & Estado de Evolución (v${newVersion})`);
    roadmapDoc = roadmapDoc.replace(/> \*\*Versión Actual:\*\* v?\d+\.\d+\.\d+/g, `> **Versión Actual:** v${newVersion}`);
    roadmapDoc = roadmapDoc.replace(/\|\s*\*\*Última actualización:\*\*\s*\d{4}-\d{2}-\d{2}/g, `| **Última actualización:** ${today}`);
    fs.writeFileSync(roadmapPath, roadmapDoc);
    console.log(chalk.green("  ✓ docs/planning/ROADMAP.md actualizado"));
  }
}

function bumpVersion(version, type) {
  let [major, minor, patch] = version.split(".").map(Number);

  switch (type) {
    case "major":
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case "minor":
      minor += 1;
      patch = 0;
      break;
    case "patch":
    default:
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

function gitStatus() {
  return run("git status --short", true);
}

function gitDiffStat() {
  return run("git diff --stat", true);
}

function suggestReleaseType(diff) {
  const lines = diff ? diff.split("\n").filter(Boolean).length : 0;
  if (lines > 20) return "major";
  if (lines > 8) return "minor";
  return "patch";
}

function createBackupBranch() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  const branchName = `backup/${timestamp}`;
  try {
    run(`git branch ${branchName}`);
    console.log(chalk.dim(`  ✓ Rama de seguridad local creada: ${branchName}`));
  } catch {}
}

function listTags() {
  const tags = run("git tag", true);
  return tags ? tags.split("\n") : [];
}

async function rollbackFlow() {
  const tags = listTags();
  if (!tags.length) {
    console.log(chalk.red("No tags found. Time travel unavailable."));
    return;
  }

  const { selectedTag } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedTag",
      message: "Select a version to rollback to:",
      choices: tags.reverse(),
    },
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Rollback to ${selectedTag}? This is where heroes become villains.`,
      default: false,
    },
  ]);

  if (!confirm) return;
  run(`git checkout tags/${selectedTag}`);
  console.log(chalk.green(`Checked out ${selectedTag}`));
}

function syncRepo() {
  console.log(chalk.cyan("\nSyncing repository..."));
  run("git fetch --all --prune");
  run("git pull");
  console.log(chalk.green("Repo synced. Civilization restored.\n"));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MODO AUTOMÁTICO (1-Click, Sin prompts, con todos los tests)
// ─────────────────────────────────────────────────────────────────────────────
async function automatedReleaseFlow() {
  console.log(chalk.bold.cyan("\n╔════════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║  MIM — Release Automatizado en 1 Solo Paso (Push & Deploy)     ║"));
  console.log(chalk.bold.cyan("╚════════════════════════════════════════════════════════════════╝\n"));

  const currentBranch = run("git branch --show-current", true);
  if (currentBranch !== "main" && currentBranch !== "master") {
    console.log(chalk.red(`❌ Debés estar parado en la rama 'main' para hacer release (rama actual: '${currentBranch}').`));
    console.log(chalk.yellow("Volvé a main con 'git checkout main' o 'npm run pr:return'.\n"));
    process.exit(1);
  }

  console.log(chalk.cyan("• Sincronizando 'main' con origin..."));
  try {
    run("git pull origin main");
  } catch {}

  // Compuertas de calidad obligatorias
  console.log(chalk.bold("\n🛡️  COMPUERTAS DE CALIDAD PRE-RELEASE:"));
  const gateResult = await runAllQualityGates("COMPUERTAS DE CALIDAD PRE-RELEASE (TESTEOS OBLIGATORIOS)");
  if (!gateResult.ok) {
    console.log(chalk.bold.red("\n🚨 RELEASE ABORTADA: Las compuertas de calidad no pasaron."));
    console.log(chalk.red(`Motivo: ${gateResult.reason}`));
    console.log(chalk.yellow("No se modificó ninguna versión ni se subió ningún tag a GitHub.\n"));
    process.exit(1);
  }

  const rawArgs = process.argv.slice(2).filter((a) => a !== "--" && a !== "--auto" && a !== "-a");
  let releaseType = "patch";
  let commitMessage = "";

  const validTypes = ["patch", "minor", "major"];
  if (rawArgs.length > 0 && validTypes.includes(rawArgs[0].toLowerCase())) {
    releaseType = rawArgs[0].toLowerCase();
    commitMessage = rawArgs.slice(1).join(" ").trim();
  } else if (rawArgs.length > 0) {
    const diff = gitDiffStat();
    releaseType = suggestReleaseType(diff);
    commitMessage = rawArgs.join(" ").trim();
  } else {
    const diff = gitDiffStat();
    releaseType = suggestReleaseType(diff);
  }

  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, releaseType);

  if (!commitMessage) {
    commitMessage = `Release v${newVersion} — Sistemas y Criterio Técnico MIM`;
  }

  console.log(chalk.bold.magenta(`\n🚀 Nueva versión calculada: v${currentVersion} ➔ v${newVersion} (${releaseType.toUpperCase()})`));
  console.log(chalk.cyan(`📝 Mensaje de commit: "${commitMessage}"\n`));

  createBackupBranch();

  console.log(chalk.bold("📦 Actualizando nomenclatura de versionado global:"));
  updateVersion(newVersion);

  console.log(chalk.bold("\n🏷️  Creando commit y tag de Git:"));
  run("git add .");
  run(`git commit -m "chore(release): v${newVersion} - ${commitMessage}"`);
  run(`git tag v${newVersion}`);
  console.log(chalk.green(`  ✓ Tag local 'v${newVersion}' creado exitosamente`));

  console.log(chalk.bold("\n☁️  Pusheando a GitHub (dispara compilación en la nube):"));
  run("git push origin main");
  run(`git push origin v${newVersion}`);

  console.log(chalk.bold.green("\n════════════════════════════════════════════════════════════════"));
  console.log(chalk.bold.green(`🎉 ¡RELEASE v${newVersion} PUBLICADO CON ÉXITO!`));
  console.log(chalk.bold.green("════════════════════════════════════════════════════════════════"));
  console.log(chalk.cyan("• Commits y Tag pusheados a 'origin/main'."));
  console.log(chalk.cyan("• GitHub Actions ha comenzado a compilar el binario .exe standalone y"));
  console.log(chalk.cyan("  publicará la Release oficial con los ejecutables en GitHub."));
  console.log(chalk.bold.yellow("\nSeguí el progreso del build en vivo aquí:"));
  console.log(chalk.bold.underline("👉 https://github.com/Ian9Franco/MIM/actions\n"));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MODO INTERACTIVO ORIGINAL (Control manual paso a paso con inquirer)
// ─────────────────────────────────────────────────────────────────────────────
async function interactiveReleaseFlow() {
  const status = gitStatus();

  if (!status) {
    console.log(chalk.yellow("No changes detected. Beautiful. Also useless."));
    return;
  }

  console.log(chalk.cyan("\nDetected changes:\n"));
  console.log(status);

  const diff = gitDiffStat();
  console.log(chalk.cyan("\nDiff summary:\n"));
  console.log(diff || "No diff summary available.");

  const suggested = suggestReleaseType(diff);
  const currentVersion = getCurrentVersion();

  console.log(
    chalk.magenta(`\nCurrent version: ${currentVersion} | Suggested: ${suggested}`)
  );

  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "runGates",
      message: "Ejecutar todas las compuertas de calidad antes de continuar?",
      default: true,
    },
    {
      type: "confirm",
      name: "backup",
      message: "Create backup branch before release?",
      default: true,
    },
    {
      type: "list",
      name: "releaseType",
      message: "Select release type:",
      choices: ["major", "minor", "patch"],
      default: suggested,
    },
    {
      type: "input",
      name: "commitMessage",
      message: "Commit message:",
      validate: (input) => !!input || "Commit message required",
    },
    {
      type: "confirm",
      name: "pushNow",
      message: "Push to origin after commit?",
      default: true,
    },
  ]);

  if (answers.runGates) {
    console.log(chalk.bold("\n🛡️  EJECUTANDO COMPUERTAS DE CALIDAD:"));
    const gateResult = await runAllQualityGates("COMPUERTAS DE CALIDAD PRE-RELEASE");
    if (!gateResult.ok) {
      console.log(chalk.red(`\n🚨 Control de calidad fallido: ${gateResult.reason}`));
      process.exit(1);
    }
  }

  if (answers.backup) {
    createBackupBranch();
  }

  const newVersion = bumpVersion(currentVersion, answers.releaseType);
  console.log(chalk.yellow(`\nVersion bump: ${currentVersion} → ${newVersion}`));

  updateVersion(newVersion);

  run("git add .");
  run(`git commit -m "v${newVersion} - ${answers.commitMessage}"`);
  run(`git tag v${newVersion}`);

  if (answers.pushNow) {
    run("git push origin main");
    run(`git push origin v${newVersion}`);
  }

  console.log(chalk.green(`\nRelease completed: v${newVersion}`));
  console.log(chalk.green("Git survived. Barely.\n"));
}

async function main() {
  const isAuto = process.argv.includes("--auto") || process.argv.includes("-a");

  if (isAuto) {
    await automatedReleaseFlow();
    return;
  }

  console.clear();
  console.log(chalk.bold.cyan("\n=== MIM Release Manager (Control Interactivo) ===\n"));

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Choose your weapon:",
      choices: [
        "Release new version",
        "Rollback to previous version",
        "Sync repository (pull/fetch)",
        "Exit",
      ],
    },
  ]);

  switch (action) {
    case "Release new version":
      await interactiveReleaseFlow();
      break;

    case "Rollback to previous version":
      await rollbackFlow();
      break;

    case "Sync repository (pull/fetch)":
      syncRepo();
      break;

    default:
      console.log(chalk.gray("Exiting. No disasters today."));
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.log(chalk.red(`\n❌ Error en release: ${err.message}\n`));
    process.exit(1);
  });
}
