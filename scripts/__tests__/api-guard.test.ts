/**
 * API Guard enforcement tests
 *
 * Covers both sides of the contract:
 * 1. Structural route verification cannot be fooled by comments/strings/imports.
 * 2. The real desktop and web withApiGuard wrappers execute validation,
 *    rate limiting, handler dispatch, and defensive headers.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { z } from "zod";
import { withApiGuard as withDesktopApiGuard } from "../../lib/apiGuard";
import { withApiGuard as withWebApiGuard } from "../../web/lib/apiGuard";
import {
  analyzeRouteSource,
  auditApiGuard,
} from "../security/verify-api-guard";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function pass(msg: string) {
  console.log(`  ${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg: string, details?: unknown): never {
  console.error(`  ${colors.red}✗${colors.reset} ${msg}`);
  if (details !== undefined) console.error("    Details:", details);
  process.exit(1);
}

function assert(condition: boolean, msg: string, details?: unknown) {
  if (!condition) fail(msg, details);
  pass(msg);
}

function assertStructuralEnforcement() {
  const directGuarded = analyzeRouteSource(`
    import { withApiGuard } from "@/lib/apiGuard";
    export const GET = withApiGuard({}, async () => new Response("ok"));
  `);
  assert(
    directGuarded.handlers.length === 1 && directGuarded.violations.length === 0,
    "Accepts a directly guarded exported HTTP handler",
    directGuarded
  );

  const aliasedGuarded = analyzeRouteSource(`
    import { withApiGuard as guard } from "@/lib/apiGuard";
    const protectedHandler = guard({}, async () => new Response("ok"));
    export { protectedHandler as POST };
  `);
  assert(
    aliasedGuarded.handlers.includes("POST") && aliasedGuarded.violations.length === 0,
    "Traces an immutable exported alias back to the real guard import",
    aliasedGuarded
  );

  const fixturePath = path.join(
    process.cwd(),
    "scripts",
    "__tests__",
    "fixtures",
    "api-guard",
    "unsafe-comment-only.route.ts"
  );
  const unsafeFixture = fs.readFileSync(fixturePath, "utf-8");
  const unsafeAnalysis = analyzeRouteSource(unsafeFixture, fixturePath);
  assert(
    unsafeAnalysis.handlers.includes("GET") &&
      unsafeAnalysis.violations.some((violation) => violation.method === "GET"),
    "Rejects the negative fixture even though it contains import/comment/string guard decoys",
    unsafeAnalysis
  );

  const fakeGuardModule = analyzeRouteSource(`
    import { withApiGuard } from "./fake-guard";
    export const PUT = withApiGuard({}, async () => new Response("unsafe"));
  `);
  assert(
    fakeGuardModule.violations.some((violation) => violation.method === "PUT"),
    "Rejects a same-named wrapper imported from an untrusted module",
    fakeGuardModule
  );

  const reExportedHandler = analyzeRouteSource(`
    export { handler as DELETE } from "./handler";
  `);
  assert(
    reExportedHandler.violations.some((violation) => violation.method === "DELETE"),
    "Fails closed on HTTP handler re-exports that cannot be structurally proven",
    reExportedHandler
  );

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mim-api-guard-"));
  try {
    const tempRouteDir = path.join(tempRoot, "app", "api", "negative-probe");
    fs.mkdirSync(tempRouteDir, { recursive: true });
    fs.writeFileSync(path.join(tempRouteDir, "route.ts"), unsafeFixture, "utf-8");

    const audit = auditApiGuard(tempRoot);
    assert(audit.totalRoutes === 1, "Auditor auto-discovers route.ts without a manual route list", audit);
    assert(
      audit.violations.some((violation) => violation.includes("[GET]")),
      "Auditor rejects a deliberately unsafe discovered route for its GET handler",
      audit
    );

    const exemptAudit = auditApiGuard(tempRoot, {
      "app/api/negative-probe/route.ts": {
        reason: "Test probe deliberately exempted for testing",
        methods: ["GET"],
      },
    });
    assert(
      exemptAudit.violations.length === 0,
      "Auditor respects explicit allowlist exceptions with documented reasons",
      exemptAudit
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function assertDesktopGuardRuntime() {
  const bodySchema = z.object({
    name: z.string().trim().min(1),
  });

  let handlerCalls = 0;
  const guarded = withDesktopApiGuard(
    {
      bodySchema,
      rateLimit: {
        windowMs: 60_000,
        maxRequests: 1,
        customIdentifier: (request) => request.headers.get("x-test-id") || "desktop-test",
      },
    },
    async ({ body }) => {
      handlerCalls += 1;
      return Response.json({ name: body.name });
    }
  );

  const invalid = await guarded(
    new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-id": "desktop-invalid-body",
      },
      body: JSON.stringify({ name: "" }),
    })
  );
  assert(invalid.status === 400, "Desktop guard rejects invalid Zod request bodies");
  assert(handlerCalls === 0, "Desktop guard does not dispatch invalid bodies to the handler");

  const makeValidRequest = () =>
    new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-id": "desktop-rate-limit",
      },
      body: JSON.stringify({ name: "sodium" }),
    });

  const success = await guarded(makeValidRequest());
  assert(success.status === 200, "Desktop guard dispatches a valid request");
  assert(handlerCalls === 1, "Desktop guarded handler executes exactly once for the valid request");
  assert(
    success.headers.get("x-content-type-options") === "nosniff",
    "Desktop guard injects the defensive nosniff header"
  );
  assert(
    success.headers.get("x-ratelimit-limit") === "1",
    "Desktop guard injects rate-limit metadata"
  );

  const limited = await guarded(makeValidRequest());
  assert(limited.status === 429, "Desktop guard actively enforces its request quota");
  assert(handlerCalls === 1, "Rate-limited requests never reach the desktop handler");
}

async function assertWebGuardRuntime() {
  const querySchema = z.object({
    page: z.coerce.number().int().min(1),
  });

  let handlerCalls = 0;
  const guarded = withWebApiGuard(
    {
      querySchema,
      rateLimit: {
        windowMs: 60_000,
        maxRequests: 5,
        customIdentifier: (request) => request.headers.get("x-test-id") || "web-test",
      },
    },
    async ({ query }) => {
      handlerCalls += 1;
      return Response.json({ page: query.page });
    }
  );

  const invalid = await guarded(
    new Request("http://localhost/api/test?page=0", {
      headers: { "x-test-id": "web-invalid-query" },
    })
  );
  assert(invalid.status === 400, "Web guard rejects invalid Zod query parameters");
  assert(handlerCalls === 0, "Web guard does not dispatch invalid queries to the handler");

  const success = await guarded(
    new Request("http://localhost/api/test?page=2", {
      headers: { "x-test-id": "web-valid-query" },
    })
  );
  assert(success.status === 200, "Web guard dispatches a valid query");
  assert(handlerCalls === 1, "Web guarded handler executes after validation");
  assert(
    success.headers.get("x-content-type-options") === "nosniff",
    "Web guard injects the defensive nosniff header"
  );
  assert(
    success.headers.get("x-ratelimit-limit") === "5",
    "Web guard injects rate-limit metadata"
  );
}

async function run() {
  console.log(`\n${colors.cyan}${colors.bold}▶ Executing API Guard enforcement tests...${colors.reset}\n`);

  assertStructuralEnforcement();
  await assertDesktopGuardRuntime();
  await assertWebGuardRuntime();

  console.log(`\n${colors.green}${colors.bold}✓ All API Guard enforcement tests passed!${colors.reset}\n`);
}

run().catch((err) => {
  fail("Unhandled test error", err);
});
