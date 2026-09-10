import {
  appendJsonOutputInstruction,
  buildDeterministicDependencyExplain,
  extractJsonFromModelText,
  parseDependencyExplainResponse,
  renderDependencyExplainMarkdown,
  validateDependencyExplainModel,
} from "../../lib/intelligence/dependencyExplain";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

async function testExtractJsonFromFencedBlock(): Promise<void> {
  const raw = 'Here you go:\n```json\n{"summary":"Falta cloth","severity":"critical","actions":[{"type":"install","modId":"cloth-config","label":"Instalar Cloth Config"}]}\n```';
  const parsed = extractJsonFromModelText(raw);
  assert(
    validateDependencyExplainModel(parsed).success,
    "Extracts and validates JSON from fenced model output"
  );
}

async function testRejectInvalidModelJson(): Promise<void> {
  const invalid = parseDependencyExplainResponse('{"summary":"","actions":[]}');
  assert(invalid === null, "Rejects JSON that fails Zod schema");
}

async function testDeterministicFallback(): Promise<void> {
  const structured = buildDeterministicDependencyExplain(
    "create",
    "Create",
    [
      { modId: "cloth-config", name: "Cloth Config", status: "missing", requiredVersion: "11.0.0" },
      { modId: "architectury", name: "Architectury", status: "installed", currentVersion: "9.0.0" },
    ],
    "standard"
  );
  assert(structured.actions.some((a) => a.type === "install"), "Deterministic fallback proposes install for missing deps");
  const markdown = renderDependencyExplainMarkdown(structured, "Create");
  assert(markdown.includes("Create"), "Deterministic markdown includes mod name");
}

async function testAppendJsonInstruction(): Promise<void> {
  const prompt = appendJsonOutputInstruction("Explain deps");
  assert(prompt.includes("EXCLUSIVAMENTE"), "Prompt requests JSON-only output");
}

async function main(): Promise<void> {
  await testExtractJsonFromFencedBlock();
  await testRejectInvalidModelJson();
  await testDeterministicFallback();
  await testAppendJsonInstruction();
  console.log("Dependency explain structured output tests passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
