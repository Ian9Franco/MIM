import {
  _configureChatHistoryStoreForTests,
  _resetChatHistoryStoreForTests,
  clearAllChatHistory,
  clearChatHistory,
  isChatHistoryEnabled,
  loadChatHistory,
  saveChatHistory,
  setChatHistoryEnabled,
} from "../../lib/intelligence/sage/chatHistoryStore";
import { buildMimbotDemoPreview } from "../../lib/intelligence/sage/mimbotDemoExamples";
import {
  MIMBOT_BYOK_DATA_SENT,
  MIMBOT_BYOK_PROVIDER_LINKS,
} from "../../lib/intelligence/sage/mimbotByokTransparency";

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

function testHistoryRoundTrip(): void {
  _resetChatHistoryStoreForTests();
  const storage = new MemoryStorage();
  _configureChatHistoryStoreForTests(storage);

  setChatHistoryEnabled(true);
  assert(isChatHistoryEnabled(), "Persists opt-in flag");

  const crashSig = "crash-signature-test";
  const messages = [
    { role: "user" as const, text: "¿Qué pasó?" },
    { role: "model" as const, text: "Faltó una dependencia." },
  ];

  saveChatHistory(crashSig, messages);
  const restored = loadChatHistory(crashSig);
  assert(restored.length === 2, "Restores saved conversation for crash signature");
  assert(restored[1]?.text.includes("dependencia"), "Preserves model response text");
}

function testHistoryPerCrashIsolation(): void {
  _resetChatHistoryStoreForTests();
  _configureChatHistoryStoreForTests(new MemoryStorage());
  setChatHistoryEnabled(true);

  saveChatHistory("sig-a", [{ role: "user", text: "A" }]);
  saveChatHistory("sig-b", [{ role: "user", text: "B" }]);

  assert(loadChatHistory("sig-a")[0]?.text === "A", "Keeps histories isolated by crash signature");
  assert(loadChatHistory("sig-b")[0]?.text === "B", "Stores separate entry per crash");
}

function testClearHistory(): void {
  _resetChatHistoryStoreForTests();
  _configureChatHistoryStoreForTests(new MemoryStorage());
  setChatHistoryEnabled(true);

  saveChatHistory("sig-clear", [{ role: "user", text: "temp" }]);
  clearChatHistory("sig-clear");
  assert(loadChatHistory("sig-clear").length === 0, "Clears history for one crash");

  saveChatHistory("sig-one", [{ role: "user", text: "1" }]);
  saveChatHistory("sig-two", [{ role: "user", text: "2" }]);
  clearAllChatHistory();
  assert(loadChatHistory("sig-one").length === 0, "Clears all local chat history");
}

function testDisableOptIn(): void {
  _resetChatHistoryStoreForTests();
  _configureChatHistoryStoreForTests(new MemoryStorage());
  setChatHistoryEnabled(true);
  saveChatHistory("sig-off", [{ role: "user", text: "persist?" }]);
  setChatHistoryEnabled(false);
  clearAllChatHistory();

  assert(!isChatHistoryEnabled(), "Opt-in can be disabled");
  assert(loadChatHistory("sig-off").length === 0, "History store empty after disable workflow");
}

function testDemoPreview(): void {
  const preview = buildMimbotDemoPreview({
    category: "Dependencias",
    exceptionType: "ModLoadingException",
    suspectedMods: ["create"],
    loader: "forge",
    gameVersion: "1.20.1",
    explanation: "Missing API",
    solutions: [],
  });

  assert(preview.valueProps.length >= 3, "Demo preview explains product value");
  assert(preview.exampleQuestion.length > 0, "Includes static example question");
  assert(preview.exampleAnswer.includes("Cloth Config"), "Uses category-specific static answer");
}

function testByokTransparencyCopy(): void {
  assert(MIMBOT_BYOK_DATA_SENT.length >= 3, "Lists data sent to providers");
  assert(
    MIMBOT_BYOK_PROVIDER_LINKS.some((link) => link.url.includes("google")),
    "Links official provider policies"
  );
}

async function main(): Promise<void> {
  testHistoryRoundTrip();
  testHistoryPerCrashIsolation();
  testClearHistory();
  testDisableOptIn();
  testDemoPreview();
  testByokTransparencyCopy();
  console.log("✓ MIM-Bot chat history & privacy tests passed");
}

main().catch((error: unknown) => {
  console.error("MIM-Bot chat history tests failed:", error);
  process.exit(1);
});
