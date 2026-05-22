import fs from "fs";
import path from "path";

/**
 * Utility to manually parse .env.local and bypass Next.js environment variable mangling/truncation.
 * This is necessary for long API keys or keys containing special characters like '$'.
 */
export function getRawEnv(key: string): string | null {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return process.env[key] || null;

    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;

      const [lineKey, ...valueParts] = trimmedLine.split("=");
      if (lineKey.trim() === key) {
        let value = valueParts.join("=").trim();
        
        // Remove surrounding quotes if they exist
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        return value;
      }
    }
  } catch (err) {
    console.error(`[getRawEnv] Error reading .env.local for key ${key}:`, err);
  }

  return process.env[key] || null;
}
