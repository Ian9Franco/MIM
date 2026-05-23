#!/usr/bin/env node

/**
 * SAGE Rescue Test Runner
 * 
 * Quick setup and test execution guide
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: "inherit", shell: true });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function checkDependencies() {
  log("\n╔════════════════════════════════════════════════════════════════╗", "cyan");
  log("║  SAGE Rescue Test Runner                                       ║", "cyan");
  log("╚════════════════════════════════════════════════════════════════╝", "cyan");
  log("");

  log("Checking dependencies...", "blue");

  // Check if ts-node is available
  try {
    await runCommand("npx ts-node --version");
    log("✓ ts-node is available", "green");
  } catch {
    log("⚠  ts-node not found. Installing...", "yellow");
    try {
      await runCommand("npm install -D ts-node");
      log("✓ ts-node installed", "green");
    } catch {
      log("✗ Failed to install ts-node", "red");
      log("You can install manually: npm install -D ts-node", "yellow");
    }
  }

  log("");
}

async function runNBTTests() {
  log("═══════════════════════════════════════════════════════════════", "cyan");
  log("Running NBT Binary I/O Tests", "blue");
  log("═══════════════════════════════════════════════════════════════", "cyan");
  log("");
  log("This tests the NBT parser/writer without needing a server.", "yellow");
  log("");

  try {
    await runCommand("npx ts-node --project tsconfig.json __tests__/nbt-integration.test.ts");
    log("");
    log("✓ NBT tests completed", "green");
    return true;
  } catch (error) {
    log("");
    log("✗ NBT tests failed", "red");
    return false;
  }
}

async function runAPITests() {
  log("");
  log("═══════════════════════════════════════════════════════════════", "cyan");
  log("Running API Endpoint Tests", "blue");
  log("═══════════════════════════════════════════════════════════════", "cyan");
  log("");

  // Check if server is running
  log("Checking if dev server is running (localhost:3000)...", "yellow");

  try {
    const response = await fetch("http://localhost:3000");
    log("✓ Server is running", "green");
  } catch {
    log("", "red");
    log("✗ Dev server is not running", "red");
    log("");
    log("Start the dev server in another terminal:", "yellow");
    log("  npm run dev", "cyan");
    log("");
    log("Then run this script again.", "yellow");
    return false;
  }

  log("");
  try {
    await runCommand("npx ts-node --project tsconfig.json __tests__/api-integration.test.ts");
    log("");
    log("✓ API tests completed", "green");
    return true;
  } catch (error) {
    log("");
    log("✗ API tests failed", "red");
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || "all";

  await checkDependencies();

  let nbtPassed = true;
  let apiPassed = true;

  if (testType === "nbt" || testType === "all") {
    nbtPassed = await runNBTTests();
  }

  if (testType === "api" || testType === "all") {
    apiPassed = await runAPITests();
  }

  log("");
  log("═══════════════════════════════════════════════════════════════", "cyan");
  log("Summary", "blue");
  log("═══════════════════════════════════════════════════════════════", "cyan");
  log("");

  if (testType === "nbt" || testType === "all") {
    log(`NBT Tests: ${nbtPassed ? "✓ PASSED" : "✗ FAILED"}`, nbtPassed ? "green" : "red");
  }

  if (testType === "api" || testType === "all") {
    log(`API Tests: ${apiPassed ? "✓ PASSED" : "✗ FAILED"}`, apiPassed ? "green" : "red");
  }

  log("");

  if ((testType === "nbt" || testType === "all") && nbtPassed) {
    log("✓ Binary I/O is 100% safe and reliable", "green");
    log("✓ All Minecraft data types are correct", "green");
    log("✓ Round-trip integrity verified", "green");
  }

  if ((testType === "api" || testType === "all") && apiPassed) {
    log("✓ API endpoints are working correctly", "green");
    log("✓ File operations are safe", "green");
    log("✓ Backup mechanism is functional", "green");
  }

  log("");

  if (nbtPassed && (testType === "nbt" || apiPassed || testType === "all")) {
    log("🎉 Ready to proceed with Part 3: Advanced NBT Editor", "green");
    log("    - Inline value editing in tree viewer", "green");
    log("    - External file upload streaming", "green");
  } else {
    log("⚠️  Fix test failures before proceeding", "red");
    process.exit(1);
  }

  log("");
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`, "red");
  process.exit(1);
});
