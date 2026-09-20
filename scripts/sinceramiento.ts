#!/usr/bin/env ts-node
/**
 * npm run sinceramiento — run (or force-re-run) sinceramiento_01.
 */

import { ensureSinceramiento01 } from "../lib/core/mimIndex/runMigrations";

const force = process.argv.includes("--force");
const report = ensureSinceramiento01({ force });
if (!report) {
  console.log("[sinceramiento_01] nothing to do");
  process.exit(0);
}
console.log(JSON.stringify(report, null, 2));
