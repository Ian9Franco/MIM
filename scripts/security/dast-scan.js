#!/usr/bin/env node

/**
 * MIM — Dynamic Application Security Testing (DAST) Scanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates active HTTP service deployment against essential security baselines:
 * 1. Security Headers: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
 * 2. CORS Misconfigurations (Wildcard origin on authenticated/mutation routes)
 * 3. Rate-Limiter Enforcement & HTTP 429 Retry-After verification
 * This is a baseline check, not a ZAP/Nuclei vulnerability scan.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const REQUIRED_HEADERS = [
  { name: "x-content-type-options", expected: "nosniff", severity: "HIGH" },
  { name: "x-frame-options", expected: ["DENY", "SAMEORIGIN"], severity: "MEDIUM" },
  { name: "referrer-policy", expected: ["strict-origin-when-cross-origin", "no-referrer"], severity: "MEDIUM" },
];

function fetchEndpoint(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === "https:" ? https : http;

    const req = client.request(
      targetUrl,
      {
        method: options.method || "GET",
        headers: options.headers || {},
        timeout: 5000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out after 5000ms"));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runDastAudit(baseUrl) {
  console.log(`\n${colors.bold}${colors.cyan}=== MIM Dynamic Security Testing (DAST) Baseline ===${colors.reset}`);
  console.log(`Target: ${baseUrl}\n`);

  let findings = 0;
  let unavailable = 0;

  // 1. Root & Base Header Audit
  console.log(`${colors.cyan}[1/3] Auditing Baseline Security Headers...${colors.reset}`);
  try {
    const res = await fetchEndpoint(baseUrl);
    console.log(`  HTTP Status: ${res.statusCode}`);
    if (res.statusCode !== 200) { unavailable++; console.error("  Root page did not return HTTP 200"); }

    for (const h of REQUIRED_HEADERS) {
      const val = res.headers[h.name];
      if (!val) {
        console.log(`  ${colors.yellow}⚠️ [${h.severity}] Missing security header:${colors.reset} ${h.name}`);
        findings++;
      } else {
        const isValid = Array.isArray(h.expected)
          ? h.expected.some((exp) => String(val).toUpperCase().includes(exp.toUpperCase()))
          : String(val).toLowerCase() === h.expected.toLowerCase();

        if (isValid) {
          console.log(`  ${colors.green}✓ Header ${h.name}:${colors.reset} ${val}`);
        } else {
          console.log(`  ${colors.yellow}⚠️ Header ${h.name} unexpected value:${colors.reset} ${val}`);
          findings++;
        }
      }
    }

    if (baseUrl.startsWith("https://")) {
      if (!res.headers["strict-transport-security"]) {
        console.log(`  ${colors.yellow}⚠️ [HIGH] Missing Strict-Transport-Security (HSTS) on HTTPS endpoint${colors.reset}`);
        findings++;
      } else {
        console.log(`  ${colors.green}✓ HSTS enabled:${colors.reset} ${res.headers["strict-transport-security"]}`);
      }
    }
  } catch (err) {
    unavailable++;
    console.error(`  Endpoint unavailable: ${err.message}`);
  }

  // 2. CORS Policy Audit
  console.log(`\n${colors.cyan}[2/3] Auditing Cross-Origin Resource Sharing (CORS) Policy...${colors.reset}`);
  try {
    const corsRes = await fetchEndpoint(`${baseUrl}/api/fomo/translate`, {
      method: "OPTIONS",
      headers: { Origin: "https://attacker-domain.evil" },
    });
    const allowOrigin = corsRes.headers["access-control-allow-origin"];
    if (![200, 204, 403].includes(corsRes.statusCode)) unavailable++;
    if (allowOrigin === "*" || allowOrigin === "https://attacker-domain.evil") {
      console.log(`  ${colors.yellow}⚠️ [MEDIUM] Wildcard CORS header detected on API endpoint${colors.reset}`);
      findings++;
    } else {
      console.log(`  ${colors.green}✓ No permissive wildcard CORS on API route: ${allowOrigin || "None declared (Strict)"}${colors.reset}`);
    }
  } catch {
    unavailable++;
    console.error("  CORS probe unavailable");
  }

  console.log("\n[3/3] Checking rate limiting with malformed JSON (no external AI calls)...");
  try {
    let limited = false;
    for (let i = 0; i < 21; i++) {
      const res = await fetchEndpoint(`${baseUrl}/api/fomo/translate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
      });
      if (res.statusCode === 429) {
        limited = true;
        if (!(Number(res.headers["retry-after"]) > 0)) findings++;
        break;
      }
      if (res.statusCode !== 400) { unavailable++; break; }
    }
    if (!limited) findings++;
  } catch (error) { unavailable++; console.error(`  Rate limit probe unavailable: ${error.message}`); }
  const status = unavailable ? "INCONCLUSIVE" : findings ? "FAILED" : "PASSED";
  console.log(`\nAudit Result: ${status} (${findings} findings, ${unavailable} unavailable checks)`);
  return { status, findings, unavailable, exitCode: unavailable ? 2 : findings ? 1 : 0 };
}

if (require.main === module) {
  const target = process.argv[2];
  if (!target) { console.error("Usage: node scripts/security/dast-scan.js <base-url>"); process.exitCode = 2; }
  else runDastAudit(target).then(result => { process.exitCode = result.exitCode; }).catch(error => {
    console.error(error); process.exitCode = 2;
  });
}

module.exports = { runDastAudit, fetchEndpoint };
