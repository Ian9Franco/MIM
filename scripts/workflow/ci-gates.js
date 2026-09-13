/**
 * MIM — Shared CI quality gates (GitHub Actions parity + PR audit subset).
 * Used by pre-push-gate.js and review-pr.js to avoid drift before push/merge.
 */

const path = require("path");
const { saveGateFailureLog: writeGateFailureLog } = require("./gate-failure-log");
const { runSingleGate } = require("./run-single-gate");

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

async function runAsyncCmd(title, cmd, args) {
  log(`\n  ⏳ ${title}...`, "cyan");
  const res = await runSingleGate(REPO_ROOT, { cmd, args });
  if (res.ok) log(`  ✓ ${title} completado exitosamente (${res.elapsed}s)`, "green");
  else log(`  ✗ ${title} falló con código ${res.code} (${res.elapsed}s)`, "red");
  return res;
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

const CODACY_DIFF_GATE = {
  id: "codacy-diff",
  title: "8. Codacy diff — ESLint estricto en archivos del PR",
  cmd: "node",
  args: ["scripts/workflow/codacy-diff-gate.js"],
  reason: "ESLint (perfil Codacy) encontró issues de alta severidad en el diff vs main.",
  ciJob: "codacy-pr-gate",
};

const CI_PUSH_LINT_GATES = [
  ...CI_PUSH_GATES.filter((gate) =>
    ["tsc-root", "tsc-hub", "eslint-root", "eslint-hub", "api-guard", "architecture-lint", "architecture-tests"].includes(gate.id)
  ),
  CODACY_DIFF_GATE,
];

async function runGates(gates, contextLabel = "COMPUERTAS DE CALIDAD") {
  log(`\n─────────────────────────────────────────────────────────────────────────────`, "dim");
  log(`🛡️  ${contextLabel}`, "bold");
  log(`─────────────────────────────────────────────────────────────────────────────`, "dim");

  for (const gate of gates) {
    log(`\n  ⏳ ${gate.title}...`, "cyan");
    const res = await runSingleGate(REPO_ROOT, gate);
    if (res.ok) {
      log(`  ✓ ${gate.title} (${res.elapsed}s)`, "green");
      continue;
    }
    log(`  ✗ ${gate.title} — exit ${res.code} (${res.elapsed}s)`, "red");
    return {
      ok: false,
      gateId: gate.id,
      gateTitle: gate.title,
      ciJob: gate.ciJob,
      reason: gate.reason,
      output: res.output,
    };
  }

  return { ok: true };
}

function saveGateFailureLog(options) {
  return writeGateFailureLog(REPO_ROOT, options);
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
  CODACY_DIFF_GATE,
};
