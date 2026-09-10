import {
  buildInitialQuickQuestions,
  deriveFollowUpSuggestions,
  isCanonicalQuickQuestion,
  normalizeMimbotQuestion,
} from "../../lib/intelligence/sage/mimbotQuickQuestions";
import {
  _configureQuickQuestionCacheForTests,
  _resetQuickQuestionCacheForTests,
  buildQuickQuestionCacheKey,
  getCachedQuickQuestionResponse,
  QUICK_QUESTION_TTL_MS,
  saveQuickQuestionResponse,
} from "../../lib/intelligence/sage/quickQuestionCache";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

function testInitialQuickQuestions(): void {
  const withMod = buildInitialQuickQuestions({
    category: "Conflictos",
    exceptionType: "Mixin",
    suspectedMods: ["sodium"],
    loader: "fabric",
    gameVersion: "1.20.1",
    explanation: "Conflicto de rendering",
    solutions: [],
  });
  assert(withMod[0]?.includes("sodium"), "First chip references primary suspected mod");
  assert(withMod.length === 4, "Provides exactly four starter quick questions");
}

function testCanonicalDetection(): void {
  const analysis = {
    category: "Memoria" as const,
    exceptionType: "OutOfMemory",
    suspectedMods: [] as string[],
    loader: "fabric",
    gameVersion: "1.21.1",
    explanation: "Heap space",
    solutions: [] as string[],
  };
  const starters = buildInitialQuickQuestions(analysis);
  assert(
    isCanonicalQuickQuestion(starters[1]!, analysis),
    "Recognizes canonical quick question text"
  );
  assert(
    !isCanonicalQuickQuestion("¿Cuál es el sentido de la vida?", analysis),
    "Rejects non-canonical free-form questions"
  );
}

function testFollowUpSuggestions(): void {
  const suggestions = deriveFollowUpSuggestions({
    analysis: {
      category: "Dependencias",
      exceptionType: "ModLoadingException",
      suspectedMods: ["create"],
      loader: "forge",
      gameVersion: "1.20.1",
      explanation: "Missing dependency",
      solutions: [],
    },
    lastModelReply:
      "Instalá [Cloth Config API](fomo:cloth-config) y [Architectury API](fomo:architectury-api).",
    askedQuestions: ["¿Qué causó este crash exactamente?"],
  });

  assert(suggestions.length === 2, "Returns two follow-up chips");
  assert(
    suggestions.some((chip) => chip.includes("Cloth Config API")),
    "Follow-up references mods linked in the last reply"
  );
  assert(
    !suggestions.some(
      (chip) => normalizeMimbotQuestion(chip) === normalizeMimbotQuestion("¿Qué causó este crash exactamente?")
    ),
    "Does not repeat questions already asked"
  );
}

function testFollowUpFromCategory(): void {
  const suggestions = deriveFollowUpSuggestions({
    analysis: {
      category: "Memoria",
      exceptionType: "OutOfMemoryError",
      suspectedMods: [],
      loader: "fabric",
      gameVersion: "1.21.1",
      explanation: "Heap exhausted",
      solutions: [],
    },
    lastModelReply: "El crash fue por falta de heap asignado al cliente.",
    askedQuestions: [],
  });

  assert(
    suggestions.some((chip) => /jvm|memoria|ram/i.test(chip)),
    "Uses category-aware follow-ups for memory crashes"
  );
}

function testQuickQuestionCacheRoundTrip(): void {
  _resetQuickQuestionCacheForTests();
  const storage = new MemoryStorage();
  const now = 1_700_000_000_000;
  _configureQuickQuestionCacheForTests({ storage, now });

  const crashSig = "abc123";
  const question = "¿Es un error de memoria o de dependencias?";
  saveQuickQuestionResponse(crashSig, question, "bully", "Respuesta cacheada");

  const cached = getCachedQuickQuestionResponse(crashSig, question, "bully");
  assert(cached === "Respuesta cacheada", "Returns cached quick question response");

  const otherMode = getCachedQuickQuestionResponse(crashSig, question, "standard");
  assert(otherMode === null, "Separates cache entries by personality mode");
}

function testQuickQuestionCacheExpiry(): void {
  _resetQuickQuestionCacheForTests();
  const storage = new MemoryStorage();
  const start = 1_700_000_000_000;
  _configureQuickQuestionCacheForTests({ storage, now: start });

  const crashSig = "expiry-test";
  const question = "¿Qué mod debo desactivar primero?";
  saveQuickQuestionResponse(crashSig, question, "standard", "Vieja respuesta");

  _configureQuickQuestionCacheForTests({
    storage,
    now: start + QUICK_QUESTION_TTL_MS + 1,
  });

  const expired = getCachedQuickQuestionResponse(crashSig, question, "standard");
  assert(expired === null, "Expires entries after 24 hours");
}

function testQuickQuestionCacheKeyStability(): void {
  const keyA = buildQuickQuestionCacheKey("sig", "  ¿Qué MOD?  ", "bully");
  const keyB = buildQuickQuestionCacheKey("sig", "¿qué mod?", "bully");
  assert(keyA === keyB, "Normalizes question text when building cache keys");
}

async function main(): Promise<void> {
  testInitialQuickQuestions();
  testCanonicalDetection();
  testFollowUpSuggestions();
  testFollowUpFromCategory();
  testQuickQuestionCacheRoundTrip();
  testQuickQuestionCacheExpiry();
  testQuickQuestionCacheKeyStability();
  console.log("✓ MIM-Bot quick questions & cache tests passed");
}

main().catch((error: unknown) => {
  console.error("MIM-Bot quick questions tests failed:", error);
  process.exit(1);
});
