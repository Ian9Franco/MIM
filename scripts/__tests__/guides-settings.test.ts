import assert from "node:assert/strict";

const GUIDES_KEY = "guides_enabled";

function mockWindow(storage: Record<string, string> = {}) {
  const store = { ...storage };
  const localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  const win = { localStorage, dispatchEvent: () => true };
  (globalThis as any).window = win;
  (globalThis as any).localStorage = localStorage;
  return store;
}

async function main() {
  mockWindow();
  const { isGuidesEnabled, shouldShowPanelOnboarding } = await import("../../lib/guides/guidesSettings");

  mockWindow({ [GUIDES_KEY]: "false" });
  assert.equal(shouldShowPanelOnboarding("onboarding_fomo"), false);

  mockWindow({ [GUIDES_KEY]: "true" });
  assert.equal(shouldShowPanelOnboarding("onboarding_fomo"), true);

  mockWindow({ [GUIDES_KEY]: "true", onboarding_fomo: "true" });
  assert.equal(shouldShowPanelOnboarding("onboarding_fomo"), false);

  mockWindow({ [GUIDES_KEY]: "false", onboarding_fomo: "true" });
  assert.equal(shouldShowPanelOnboarding("onboarding_fomo"), false);

  mockWindow({ [GUIDES_KEY]: "true" });
  assert.equal(isGuidesEnabled(), true);

  console.log("guides-settings test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
