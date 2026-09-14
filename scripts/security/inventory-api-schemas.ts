#!/usr/bin/env node

/**
 * API-02b — Inventory Zod contracts on App Router handlers.
 *
 * Mutations (POST/PUT/PATCH/DELETE) should declare bodySchema on withApiGuard.
 * GET handlers that read search params should declare querySchema.
 */

import fs from "fs";
import path from "path";
import { analyzeRouteSource } from "./verify-api-guard";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function findRouteFiles(dir: string, rootDir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findRouteFiles(fullPath, rootDir));
    else if (entry.isFile() && entry.name === "route.ts") {
      results.push(path.relative(rootDir, fullPath).replace(/\\/g, "/"));
    }
  }
  return results;
}

export function inventoryApiSchemas(rootDir = process.cwd()) {
  const routes = [
    path.join(rootDir, "app", "api"),
    path.join(rootDir, "apps", "hub", "app", "api"),
  ]
    .flatMap((routeRoot) => findRouteFiles(routeRoot, rootDir))
    .sort();

  const missingMutations: string[] = [];
  const missingGetQuery: string[] = [];
  let withBody = 0;
  let withQuery = 0;
  let mutations = 0;
  let gets = 0;

  for (const route of routes) {
    const sourceText = fs.readFileSync(path.join(rootDir, route), "utf-8");
    const analysis = analyzeRouteSource(sourceText, route);
    const usesSearchParams = /searchParams|req\.url|request\.url/.test(sourceText);

    for (const coverage of analysis.schemaCoverage) {
      if (coverage.hasBodySchema) withBody += 1;
      if (coverage.hasQuerySchema) withQuery += 1;
      if (MUTATION_METHODS.has(coverage.method)) {
        mutations += 1;
        if (!coverage.hasBodySchema && !coverage.hasQuerySchema) {
          missingMutations.push(`${route} [${coverage.method}]`);
        }
      } else if (coverage.method === "GET") {
        gets += 1;
        if (usesSearchParams && !coverage.hasQuerySchema && !coverage.hasParamsSchema) {
          missingGetQuery.push(`${route} [GET]`);
        }
      }
    }
  }

  return {
    routes: routes.length,
    mutations,
    gets,
    withBody,
    withQuery,
    missingMutations,
    missingGetQuery,
  };
}

if (require.main === module) {
  const result = inventoryApiSchemas();
  console.log("\nAPI-02b Zod schema inventory");
  console.log(`  routes: ${result.routes}`);
  console.log(`  mutations: ${result.mutations} (bodySchema/querySchema present on ${result.withBody} handlers)`);
  console.log(`  GET handlers: ${result.gets} (querySchema present on ${result.withQuery} handlers)`);
  if (result.missingMutations.length) {
    console.log(`\nMutations without bodySchema/querySchema (${result.missingMutations.length}):`);
    for (const item of result.missingMutations) console.log(`  - ${item}`);
  } else {
    console.log("\nAll mutation handlers declare a Zod schema on withApiGuard.");
  }
  if (result.missingGetQuery.length) {
    console.log(`\nGET handlers that read URL params without querySchema (${result.missingGetQuery.length}):`);
    for (const item of result.missingGetQuery) console.log(`  - ${item}`);
  }
  process.exit(0);
}
