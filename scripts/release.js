#!/usr/bin/env node

/**
 * MIM Release Manager
 *
 * Features:
 * - Detects git status
 * - Suggests release type
 * - Semantic version bump (major/minor/patch)
 * - Backup branch before release
 * - Git commit + tag + push
 * - Pull/sync option
 * - Rollback to previous tag
 * - Safe confirmations before dangerous actions
 *
 * Install:
 * npm i inquirer chalk
 *
 * package.json:
 * "scripts": {
 *   "release": "node scripts/release.js"
 * }
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const inquirer = require("inquirer");
const chalk = require("chalk");

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
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));

  // Actualizar README.md
  const readmePath = path.join(process.cwd(), "README.md");
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, "utf-8");
    // Reemplazar badge de versión
    readme = readme.replace(/Version-(\d+\.\d+\.\d+)-/g, `Version-${newVersion}-`);
    // Reemplazar sección de completado (asumiendo que la última versión es la que se acaba de completar)
    readme = readme.replace(/### ✅ Completado \(Versión \d+\.\d+\.\d+\)/g, `### ✅ Completado (Versión ${newVersion})`);
    fs.writeFileSync(readmePath, readme);
    console.log(chalk.green("README.md actualizado con la nueva versión."));
  }

  // Actualizar docs/MIM.md
  const mimDocPath = path.join(process.cwd(), "docs", "MIM.md");
  if (fs.existsSync(mimDocPath)) {
    let mimDoc = fs.readFileSync(mimDocPath, "utf-8");
    // Reemplazar versión en el encabezado
    mimDoc = mimDoc.replace(/\*\*Versión:\*\* \d+\.\d+\.\d+/g, `**Versión:** ${newVersion}`);
    // Reemplazar menciones de versión en el texto
    mimDoc = mimDoc.replace(/versión \d+\.\d+\.\d+/g, `versión ${newVersion}`);
    // Actualizar fecha
    const today = new Date().toISOString().slice(0, 10);
    mimDoc = mimDoc.replace(/\*\*Última actualización:\*\* \d{4}-\d{2}-\d{2}/g, `**Última actualización:** ${today}`);
    fs.writeFileSync(mimDocPath, mimDoc);
    console.log(chalk.green("docs/MIM.md actualizado con la nueva versión y fecha."));
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
      patch += 1;
      break;
    default:
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
  const lines = diff.split("\n").filter(Boolean).length;

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

  console.log(chalk.yellow(`\nCreating backup branch: ${branchName}`));
  run(`git checkout -b ${branchName}`);
  run("git push -u origin HEAD");

  console.log(chalk.green("Backup created. Your future self says thanks.\n"));

  const currentBranch = run("git branch --show-current", true);
  console.log(chalk.yellow(`Returning to main branch workflow from: ${currentBranch}`));
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

async function releaseFlow() {
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

  if (answers.backup) {
    createBackupBranch();
  }

  const newVersion = bumpVersion(currentVersion, answers.releaseType);

  console.log(
    chalk.yellow(`\nVersion bump: ${currentVersion} → ${newVersion}`)
  );

  updateVersion(newVersion);

  run("git add .");
  run(`git commit -m "v${newVersion} - ${answers.commitMessage}"`);
  run(`git tag v${newVersion}`);

  if (answers.pushNow) {
    run("git push");
    run("git push --tags");
  }

  console.log(chalk.green(`\nRelease completed: v${newVersion}`));
  console.log(chalk.green("Git survived. Barely.\n"));
}

async function main() {
  console.clear();
  console.log(chalk.bold.cyan("\n=== MIM Release Manager ===\n"));

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
      await releaseFlow();
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

main();
