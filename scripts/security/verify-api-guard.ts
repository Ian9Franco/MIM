#!/usr/bin/env node

/**
 * MIM — API Guard Coverage & Perimeter Defense Verifier
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforces systematic perimeter defense across all Next.js App Router endpoints.
 * 
 * Rules:
 * 1. 100% of routes in `web/app/api/` MUST use `withApiGuard`.
 * 2. 100% of External API & AI routes in `app/api/` (Modrinth, CurseForge, Gemini, YouTube, etc.)
 *    MUST use `withApiGuard`.
 * 3. Fails CI/build with exit code 1 if any required route lacks the guard wrapper.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

// Patterns designating external/AI routes requiring mandatory protection
const CRITICAL_DESKTOP_PATTERNS = [
  /app\/api\/fomo\/explain/,
  /app\/api\/sage\/chat/,
  /app\/api\/curseforge\//,
  /app\/api\/modrinth\//,
  /app\/api\/bedrock\//,
  /app\/api\/fomo\/youtube-/,
  /app\/api\/fomo\/community-rankings/,
];

function findRouteFiles(dir: string, baseDir = dir): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findRouteFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name === "route.ts") {
      const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
      results.push(rel);
    }
  }
  return results;
}

export function auditApiGuard(): {
  total: number;
  guarded: number;
  violations: string[];
  coveragePercent: number;
} {
  const webRoutes = findRouteFiles(path.join(process.cwd(), "web", "app", "api"));
  const desktopRoutes = findRouteFiles(path.join(process.cwd(), "app", "api"));
  const allRoutes = [...webRoutes, ...desktopRoutes];

  const violations: string[] = [];
  let guardedCount = 0;
  let criticalCount = 0;
  let criticalGuardedCount = 0;

  console.log(`\n${colors.cyan}${colors.bold}🔍 Auditing API Guard Perimeter Defense (${allRoutes.length} routes found)...${colors.reset}`);

  for (const route of allRoutes) {
    const content = fs.readFileSync(path.join(process.cwd(), route), "utf-8");
    const hasGuard = /withApiGuard\s*\(/.test(content);

    const isWeb = route.startsWith("web/");
    const isCriticalDesktop = CRITICAL_DESKTOP_PATTERNS.some((p) => p.test(route));
    const isRequired = isWeb || isCriticalDesktop;

    if (hasGuard) {
      guardedCount++;
      if (isRequired) criticalGuardedCount++;
    }

    if (isRequired) {
      criticalCount++;
      if (!hasGuard) {
        violations.push(route);
      }
    }
  }

  const coveragePercent = Math.round((guardedCount / allRoutes.length) * 100);
  const criticalCoveragePercent = criticalCount > 0 ? Math.round((criticalGuardedCount / criticalCount) * 100) : 100;

  console.log("\n─────────────────────────────────────────────────────────────────────────────");
  console.log(`${colors.bold}API Guard Verification Summary:${colors.reset}`);
  console.log(`  • Web Endpoints (Public Edge):       ${webRoutes.length} routes`);
  console.log(`  • Desktop Endpoints:                 ${desktopRoutes.length} routes`);
  console.log(`  • Critical External / AI Routes:     ${criticalGuardedCount} / ${criticalCount} (${criticalCoveragePercent}%)`);
  console.log(`  • Total Systemic Coverage:           ${guardedCount} / ${allRoutes.length} (${coveragePercent}%)`);
  console.log("─────────────────────────────────────────────────────────────────────────────");

  if (violations.length > 0) {
    console.error(`\n${colors.red}${colors.bold}🚨 VIOLATION: ${violations.length} critical endpoint(s) lack withApiGuard wrapper:${colors.reset}`);
    for (const v of violations) {
      console.error(`  ${colors.red}✗${colors.reset} ${v}`);
    }
    console.error(`\n${colors.yellow}Policy: All public/web routes and all external/AI routes MUST be wrapped with withApiGuard.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.green}${colors.bold}✓ All required critical and public edge routes are protected by withApiGuard!${colors.reset}\n`);
  }

  return {
    total: allRoutes.length,
    guarded: guardedCount,
    violations,
    coveragePercent,
  };
}

// CLI execution
if (require.main === module) {
  const result = auditApiGuard();
  if (result.violations.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
