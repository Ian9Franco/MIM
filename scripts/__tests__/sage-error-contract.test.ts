import assert from "node:assert/strict";
import { SAGE_ERROR_DEFINITIONS, sageErrorResponse } from "../../lib/intelligence/sage/errorContract";

async function responseBody(code: keyof typeof SAGE_ERROR_DEFINITIONS) {
  const response = sageErrorResponse(code, { details: "fixture-detail" });
  return { response, body: await response.json() };
}

async function run(): Promise<void> {
  const missing = await responseBody("MIM_CREDENTIAL_MISSING");
  assert.equal(missing.response.status, 401);
  assert.equal(missing.body.error, "NO_API_KEY");
  assert.equal(missing.body.code, "MIM_CREDENTIAL_MISSING");
  assert.equal(missing.body.retryable, false);
  assert.equal(missing.body.severity, "warning");
  assert.equal(typeof missing.body.action, "string");

  const invalid = await responseBody("MIM_CREDENTIAL_INVALID");
  assert.equal(invalid.response.status, 401);
  assert.equal(invalid.body.error, "NO_API_KEY");
  assert.equal(invalid.body.retryable, false);

  const limited = await responseBody("MIM_PROVIDER_RATE_LIMIT");
  assert.equal(limited.response.status, 429);
  assert.equal(limited.body.error, "RATE_LIMITED");
  assert.equal(limited.body.retryable, true);
  assert.equal(limited.body.details, "fixture-detail");

  const failed = await responseBody("MIM_AI_GENERATION_FAILED");
  assert.equal(failed.response.status, 502);
  assert.equal(failed.body.error, "GENERATION_FAILED");
  assert.equal(failed.body.retryable, true);
  assert.equal(failed.body.severity, "error");

  for (const definition of Object.values(SAGE_ERROR_DEFINITIONS)) {
    assert.ok(definition.action.trim().length > 0, "every SAGE error must define a user action");
    assert.ok(definition.message.trim().length > 0, "every SAGE error must define a message");
  }

  console.log("✓ SAGE error contract suite passed");
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
