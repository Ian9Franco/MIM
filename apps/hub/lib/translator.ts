/**
 * Official Translation Service for MIM Web.
 * 
 * Supports compliant, official translation providers:
 * 1. DeepL API (Free and Pro tiers) via DEEPL_API_KEY
 * 2. Google Cloud Translation API (v2) via GOOGLE_TRANSLATE_API_KEY
 * 3. LibreTranslate (Self-hosted or hosted instance) via LIBRETRANSLATE_URL
 * 
 * No unofficial scraping or non-compliant Google endpoints are used.
 */

export interface TranslationResult {
  translatedText: string;
  provider: "deepl" | "google-cloud" | "libretranslate" | "none";
  degraded: boolean;
  reason?: string;
}

/**
 * Translates text using the DeepL official API.
 * Uses api-free.deepl.com for keys ending in :fx, otherwise api.deepl.com.
 */
async function translateWithDeepL(text: string, apiKey: string, targetLang = "ES"): Promise<string> {
  const isFreeTier = apiKey.endsWith(":fx") || !process.env.DEEPL_API_URL?.includes("api.deepl.com");
  const endpoint = process.env.DEEPL_API_URL || (isFreeTier ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang.toUpperCase(),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`DeepL API responded with HTTP ${res.status}: ${errBody}`);
    }

    const data = (await res.json()) as {
      translations?: Array<{ detected_source_language?: string; text: string }>;
    };

    if (!data.translations || data.translations.length === 0) {
      throw new Error("DeepL API returned empty translation array");
    }

    return data.translations[0].text;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Translates text using official Google Cloud Translation API (v2).
 */
async function translateWithGoogleCloud(text: string, apiKey: string, targetLang = "es"): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        target: targetLang.toLowerCase(),
        format: "text",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Google Cloud Translation API responded with HTTP ${res.status}: ${errBody}`);
    }

    const data = (await res.json()) as {
      data?: {
        translations?: Array<{ translatedText: string }>;
      };
    };

    const translated = data?.data?.translations?.[0]?.translatedText;
    if (typeof translated !== "string") {
      throw new Error("Google Cloud Translation returned invalid response format");
    }

    return translated;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Translates text using a LibreTranslate instance.
 */
async function translateWithLibreTranslate(text: string, baseUrl: string, apiKey?: string, targetLang = "es"): Promise<string> {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/translate`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const bodyPayload: Record<string, string> = {
      q: text,
      source: "auto",
      target: targetLang.toLowerCase(),
      format: "text",
    };
    if (apiKey) {
      bodyPayload.api_key = apiKey;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`LibreTranslate responded with HTTP ${res.status}: ${errBody}`);
    }

    const data = (await res.json()) as { translatedText?: string };
    if (typeof data.translatedText !== "string") {
      throw new Error("LibreTranslate returned missing translatedText");
    }

    return data.translatedText;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Dispatches translation to the configured official provider.
 * Priority order:
 * 1. DeepL (DEEPL_API_KEY)
 * 2. Google Cloud Translation (GOOGLE_TRANSLATE_API_KEY)
 * 3. LibreTranslate (LIBRETRANSLATE_URL)
 */
export async function translateText(sourceText: string, targetLang = "es"): Promise<TranslationResult> {
  const deeplKey = process.env.DEEPL_API_KEY?.trim();
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim() || process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim();
  const libreUrl = process.env.LIBRETRANSLATE_URL?.trim();
  const libreKey = process.env.LIBRETRANSLATE_API_KEY?.trim();

  // 1. DeepL
  if (deeplKey) {
    try {
      const translated = await translateWithDeepL(sourceText, deeplKey, targetLang);
      return {
        translatedText: translated,
        provider: "deepl",
        degraded: false,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("[/web/lib/translator] DeepL translation failed, attempting fallbacks:", errMsg);
    }
  }

  // 2. Google Cloud Translation API
  if (googleKey) {
    try {
      const translated = await translateWithGoogleCloud(sourceText, googleKey, targetLang);
      return {
        translatedText: translated,
        provider: "google-cloud",
        degraded: false,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("[/web/lib/translator] Google Cloud translation failed:", errMsg);
    }
  }

  // 3. LibreTranslate
  if (libreUrl) {
    try {
      const translated = await translateWithLibreTranslate(sourceText, libreUrl, libreKey, targetLang);
      return {
        translatedText: translated,
        provider: "libretranslate",
        degraded: false,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("[/web/lib/translator] LibreTranslate failed:", errMsg);
    }
  }

  // If no official provider is configured, fail gracefully without hitting unofficial scraping endpoints.
  const reason = !deeplKey && !googleKey && !libreUrl
    ? "No official translation provider configured (set DEEPL_API_KEY, GOOGLE_TRANSLATE_API_KEY or LIBRETRANSLATE_URL)."
    : "All configured official translation providers failed.";

  return {
    translatedText: sourceText,
    provider: "none",
    degraded: true,
    reason,
  };
}
