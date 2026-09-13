/** Suite catalog for scripts/test-runner.js */
module.exports = [{ name: "Monorepo Package Contracts", cmd: "npx", args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/monorepo-arch3-arch4.test.ts"] },
    { name: "Server Engine & Recovery", cmd: "npm", args: ["run", "test:server"] },
    { name: "Network Resilience", cmd: "npm", args: ["run", "test:network"] },
    {
      name: "SAGE NBT Binary Safe Recovery (12 Tests)",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/nbt-integration.test.ts"]
    },
    {
      name: "SAGE 2.0 Diagnostic Evaluation (125 Cases)",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/evaluation/sage-eval.ts"]
    },
    {
      name: "SAGE Eval Metrics & CI Gate (SAGE-02/03)",
      cmd: "npx",
      args: ["ts-node", "--project", "tsconfig.scripts.json", "scripts/__tests__/sage-eval-metrics.test.ts"]
    },
    {
      name: "SAGE Corpus Provenance & Splits (SAGE-01)",
      cmd: "npx",
      args: ["ts-node", "--project", "tsconfig.scripts.json", "scripts/__tests__/sage-eval-corpus.test.ts"]
    },
    {
      name: "SAGE 2.0 Core Taxonomy & Parser Unit Suite",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/sage-unit.test.ts"]
    },
    {
      name: "SAGE Real Chat Guardrail Contract",
      cmd: "npm",
      args: ["run", "test:sage-chat-guardrails"]
    },
    {
      name: "SAGE 2.0 Knowledge Base Matcher & Safety Validator",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/evaluation/test-rag.ts"]
    },
    {
      name: "Aduana Deduplication & Storage Verification",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/benchmarks/aduana-benchmark.ts"]
    },
    {
      name: "Security Static Bytecode & Threat Engine Unit Suite",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/security-scanner.test.ts"]
    },
    {
      name: "Security Threat Intelligence & Rate Limiter",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/security-malware-and-ratelimit.test.ts"]
    },
    {
      name: "Critical API Integration & Zod Schema Contracts",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/critical-api-integration.test.ts"]
    },
    {
      name: "Pre-Push CI Gate Catalog (CI parity)",
      cmd: "npm",
      args: ["run", "test:pre-push-gate"]
    },
    {
      name: "AI Provider Request Lifecycle Contract",
      cmd: "npm",
      args: ["run", "test:ai-provider"]
    },
    {
      name: "AI Analysis Queue (BOT-07)",
      cmd: "npm",
      args: ["run", "test:ai-analysis-queue"]
    },
    {
      name: "MIMbot Eval Fixtures (SAGE-05 structure gate)",
      cmd: "npm",
      args: ["run", "eval:mimbot"]
    },
    {
      name: "MIM-Bot Personality & Heuristic Fallback Engine",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/bot-personality.test.ts"]
    },
    {
      name: "Multimodal Project Explainer Contract",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/mod-explainer.test.ts"]
    },
    {
      name: "Multimodal Project Explainer Batch (BOT-07)",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/mod-explainer-batch.test.ts"]
    },
    {
      name: "Third-Party Modpack License Auditor",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/license-auditor.test.ts"]
    },
    {
      name: "API Guard Universal Defense Perimeter",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/api-guard.test.ts"]
    },
    {
      name: "SAGE 3.0 MIM-Bot Copilot & Graph Intelligence",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/sage-mimbot.test.ts"]
    },
    {
      name: "SAGE Cache Runtime Adapter Contract",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/sage-cache-runtime.test.ts"]
    },
    {
      name: "SAGE Streaming Transport Contract",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/sage-stream-contract.test.ts"]
    },
    {
      name: "Home Discover Controller Contract",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/home-discover.test.ts"]
    },
    {
      name: "Home Drafts Controller Contract",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/home-drafts.test.ts"]
    },
    {
      name: "Home Drafts CRUD Repository (REC-03)",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/home-drafts-crud.test.ts"]
    },
    {
      name: "Server Manager Manifest & Reconciliation Foundation",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/server-manager-foundation.test.ts"]
    },
    {
      name: "Release Notes Truthfulness Contract",
      cmd: "node",
      args: ["scripts/__tests__/release-notes.test.js"]
    },
    {
      name: "API Guard Systemic Route Perimeter Auditor",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/security/verify-api-guard.ts"]
    },
    {
      name: "Architecture Dependency Boundary Auditor",
      cmd: "npx",
      args: ["ts-node", "--project", "tsconfig.scripts.json", "scripts/architecture/verify-boundaries.ts"]
    },
    {
      name: "Architecture Boundary Contract Suite",
      cmd: "npx",
      args: ["ts-node", "--project", "tsconfig.scripts.json", "scripts/__tests__/architecture-boundaries.test.ts"]
    },
    {
      name: "Scoped CI Detection & Surface Impact (ARCH-7)",
      cmd: "npx",
      args: ["ts-node", "-r", "tsconfig-paths/register", "--project", "tsconfig.scripts.json", "scripts/__tests__/scoped-ci-detection.test.ts"]
    },
    {
      name: "Secure Settings Migration & Secret Boundary",
      cmd: "npx",
      args: ["ts-node", "--project", "tsconfig.scripts.json", "scripts/__tests__/secure-settings.test.ts"]
    }];
