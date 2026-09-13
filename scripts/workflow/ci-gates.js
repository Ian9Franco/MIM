/**
 * MIM — Shared CI quality gates (GitHub Actions parity + PR audit subset).
 * Used by pre-push-gate.js and review-pr.js to avoid drift before push/merge.
 */

const { spawn } = require("child_process");
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

/** Six gates used by npm run pr:audit (subset — no eslint/build). */
const PR_AUDIT_GATES = [
  {
    id: "api-guard",
    title: "1. Verificación Estructural de API Guard",
    cmd: "npm",
    args: ["run", "lint:api-guard"],
    reason: "Fallo en la auditoría estructural de API Guard (rutas desprotegidas).",
  },
  {
    id: "architecture-lint",
    title: "2. Verificación de Fronteras de Arquitectura",
    cmd: "npm",
    args: ["run", "lint:architecture"],
    reason: "Fallo en las fronteras de arquitectura (dependencias cruzadas no permitidas).",
  },
  {
    id: "architecture-tests",
    title: "3. Contratos de Fronteras Arquitectónicas",
    cmd: "npm",
    args: ["run", "test:architecture"],
    reason: "Fallo en la suite de pruebas de contratos arquitectónicos.",
  },
  {
    id: "tsc-root",
    title: "4. Verificación de Tipos TypeScript (Raíz / Desktop)",
    cmd: "npx",
    args: ["tsc", "--noEmit"],
    reason: "Fallo en la comprobación estática de TypeScript (Raíz).",
  },
  {
    id: "tsc-hub",
    title: "5. Verificación de Tipos TypeScript (MIM Hub)",
    cmd: "npx",
    args: ["tsc", "--project", "apps/hub/tsconfig.json", "--noEmit"],
    reason: "Fallo en la comprobación estática de TypeScript (apps/hub/tsconfig.json).",
  },
  {
    id: "test-runner",
    title: "6. Suite de Tests Unificados (npm test)",
    cmd: "node",
    args: ["scripts/test-runner.js"],
    reason: "Fallo en una o más suites del Test Runner unificado de MIM.",
  },
];

/**
 * Full mirror of .github/workflows/ci.yml (except Codacy upload and optional live MIMbot).
 * Run locally before git push to catch the same failures CI would report.
 */
const CI_PUSH_GATES = [
  {
    id: "tsc-root",
    title: "1. TypeScript — Desktop / Raíz",
    cmd: "npx",
    args: ["tsc", "--noEmit"],
    reason: "TypeScript (raíz) no compila.",
    ciJob: "lint-and-typecheck",
  },
  {
    id: "tsc-hub",
    title: "2. TypeScript — MIM Hub",
    cmd: "npx",
    args: ["tsc", "--project", "apps/hub/tsconfig.json", "--noEmit"],
    reason: "TypeScript (apps/hub) no compila.",
    ciJob: "lint-and-typecheck",
  },
  {
    id: "eslint-root",
    title: "3. ESLint — Desktop",
    cmd: "npm",
    args: ["run", "lint"],
    reason: "ESLint Desktop superó el techo de warnings o reportó errores.",
  },
  {
    id: "eslint-hub",
    title: "4. ESLint — MIM Hub",
    cmd: "npm",
    args: ["run", "lint:hub"],
    reason: "ESLint Hub superó el techo de warnings o reportó errores.",
    ciJob: "lint-and-typecheck",
  },
  {
    id: "api-guard",
    title: "5. API Guard — rutas blindadas",
    cmd: "npm",
    args: ["run", "lint:api-guard"],
    reason: "API Guard detectó rutas sin withApiGuard.",
    ciJob: "lint-and-typecheck",
  },
  {
    id: "architecture-lint",
    title: "6. Architecture — fronteras de dependencias",
    cmd: "npm",
    args: ["run", "lint:architecture"],
    reason: "Violación de fronteras arquitectónicas.",
    ciJob: "lint-and-typecheck",
  },
  {
    id: "architecture-tests",
    title: "7. Architecture — contratos de frontera",
    cmd: "npm",
    args: ["run", "test:architecture"],
    reason: "Tests de contratos arquitectónicos fallaron.",
    ciJob: "lint-and-typecheck",
  },
  {
    id: "test-coverage",
    title: "8. Systems Test Suite + Coverage (Codacy input)",
    cmd: "npm",
    args: ["run", "test:coverage"],
    reason: "Una o más suites del test runner fallaron.",
    ciJob: "test-and-evaluate",
    slow: true,
  },
  {
    id: "sage-errors",
    title: "9. SAGE Error Contract",
    cmd: "npm",
    args: ["run", "test:sage-errors"],
    reason: "Contrato de errores SAGE roto.",
    ciJob: "test-and-evaluate",
  },
  {
    id: "sage-stream",
    title: "10. SAGE Streaming Contract",
    cmd: "npm",
    args: ["run", "test:sage-stream"],
    reason: "Contrato de streaming SAGE roto.",
    ciJob: "test-and-evaluate",
  },
  {
    id: "sage-guardrails",
    title: "11. SAGE Chat Guardrails",
    cmd: "npm",
    args: ["run", "test:sage-chat-guardrails"],
    reason: "Guardrails de chat SAGE fallaron.",
    ciJob: "test-and-evaluate",
  },
  {
    id: "eval-mimbot",
    title: "12. MIMbot Eval Fixtures (SAGE-05)",
    cmd: "npm",
    args: ["run", "eval:mimbot"],
    reason: "Fixtures de evaluación MIMbot inválidos.",
    ciJob: "test-and-evaluate",
  },
  {
    id: "dast",
    title: "13. DAST Security Baseline",
    cmd: "node",
    args: ["scripts/security/dast-scan.js"],
    reason: "Auditoría DAST de seguridad falló.",
    ciJob: "dast-security-audit",
  },
  {
    id: "build-desktop",
    title: "14. Next.js Production Build — Desktop",
    cmd: "npm",
    args: ["run", "build"],
    reason: "Build de producción Desktop falló.",
    ciJob: "build-production",
    slow: true,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
  {
    id: "build-hub",
    title: "15. Next.js Production Build — MIM Hub",
    cmd: "npm",
    args: ["run", "build:hub"],
    reason: "Build de producción Hub falló.",
    ciJob: "build-production",
    slow: true,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
];

const CI_PUSH_QUICK_GATES = CI_PUSH_GATES.filter((gate) => !gate.slow);

const CI_PUSH_LINT_GATES = CI_PUSH_GATES.filter((gate) =>
  ["tsc-root", "tsc-hub", "eslint-root", "eslint-hub", "api-guard", "architecture-lint", "architecture-tests"].includes(gate.id)
);

async function runGates(gates, contextLabel = "COMPUERTAS DE CALIDAD") {
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "dim");
  log(`🛡️  ${contextLabel}`, "bold");
  log(`─────────────────────────────────────────────────────────────────────────────`, "dim");

  for (const gate of gates) {
    const env = gate.env ? { ...process.env, ...gate.env } : process.env;
    const res = await new Promise((resolve) => {
      log(`\n  ⏳ ${gate.title}...`, "cyan");
      const start = Date.now();
      let capturedOutput = "";

      const proc = spawn(gate.cmd, gate.args, {
        cwd: REPO_ROOT,
        shell: true,
        env: { ...env, NODE_OPTIONS: "--max-old-space-size=4096" },
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
          log(`  ✓ ${gate.title} (${elapsed}s)`, "green");
          resolve({ ok: true, elapsed, output: capturedOutput });
        } else {
          log(`  ✗ ${gate.title} — exit ${code} (${elapsed}s)`, "red");
          resolve({ ok: false, elapsed, code, output: capturedOutput });
        }
      });
      proc.on("error", (err) => {
        resolve({ ok: false, elapsed: 0, code: 1, output: err.message });
      });
    });

    if (!res.ok) {
      return {
        ok: false,
        gateId: gate.id,
        gateTitle: gate.title,
        ciJob: gate.ciJob,
        reason: gate.reason,
        output: res.output,
      };
    }
  }

  return { ok: true };
}

function saveGateFailureLog(options) {
  const {
    logSubdir = "gate-failures",
    filePrefix = "gate-failed",
    target = "local",
    branchName = "unknown",
    failedGate = "unknown",
    failedGateId,
    ciJob,
    reason = "Unknown",
    output = "",
    extraSections = [],
  } = options;

  const logDir = path.join(REPO_ROOT, "logs", logSubdir);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const humanTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const sanitizedTarget = String(target).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${filePrefix}-${sanitizedTarget}-${timestamp}.log`;
  const filePath = path.join(logDir, fileName);

  const sections = [
    ["Fecha y Hora", humanTime],
    ["Objetivo", target],
    ["Rama", branchName],
    ["Compuerta fallida", failedGate],
    ...(failedGateId ? [["Gate ID", failedGateId]] : []),
    ...(ciJob ? [["Job CI equivalente", ciJob]] : []),
    ["Motivo", reason],
  ];

  let content = [
    "================================================================================",
    "MIM — INFORME DE FALLO DE COMPUERTA DE CALIDAD",
    "================================================================================",
    ...sections.flatMap(([label, value]) => [`${label}:`.padEnd(22) + value, ""]),
  ].join("\n");

  for (const section of extraSections) {
    content += [
      "",
      "────────────────────────────────────────────────────────────────────────────────",
      `${section.title}:`,
      "────────────────────────────────────────────────────────────────────────────────",
      section.content || "(vacío)",
    ].join("\n");
  }

  content += [
    "",
    "────────────────────────────────────────────────────────────────────────────────",
    "SALIDA DE LA COMPUERTA FALLIDA:",
    "────────────────────────────────────────────────────────────────────────────────",
    output || "(Sin salida capturada)",
    "================================================================================",
    "",
  ].join("\n");

  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

module.exports = {
  REPO_ROOT,
  colors,
  log,
  runAsyncCmd,
  runGates,
  saveGateFailureLog,
  PR_AUDIT_GATES,
  CI_PUSH_GATES,
  CI_PUSH_QUICK_GATES,
  CI_PUSH_LINT_GATES,
};
