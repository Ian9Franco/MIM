const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fileStats = [];
const webFiles = [];
const rootFiles = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (["node_modules", ".git", ".next", "dist", "coverage", "out", "artifacts"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(tsx|ts|jsx|js|mjs|cjs)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      const nonCommentLines = lines.filter((l) => {
        const t = l.trim();
        return t.length > 0 && !t.startsWith("//") && !t.startsWith("/*") && !t.startsWith("*");
      }).length;
      const hash = crypto.createHash("sha256").update(content.trim()).digest("hex");

      const record = {
        path: fullPath,
        name: entry.name,
        totalLines: lines.length,
        functionalLines: nonCommentLines,
        hash,
        size: content.length,
      };

      fileStats.push(record);
      if (fullPath.startsWith("web/")) {
        webFiles.push(record);
      } else {
        rootFiles.push(record);
      }
    }
  }
}

scanDir(".");
fileStats.sort((a, b) => b.functionalLines - a.functionalLines);

console.log("=== 1. MODULARITY VIOLATIONS: FILES EXCEEDING 600 FUNCTIONAL LINES ===");
const violations = fileStats.filter((f) => f.functionalLines > 600);
violations.forEach((f) => {
  console.log(`❌ [>600 LINES] ${f.functionalLines} functional lines (${f.totalLines} total) -> ${f.path}`);
});

console.log("\n=== 2. MODULARITY AT-RISK: FILES BETWEEN 450 AND 600 FUNCTIONAL LINES ===");
const atRisk = fileStats.filter((f) => f.functionalLines >= 450 && f.functionalLines <= 600);
atRisk.forEach((f) => {
  console.log(`⚠️ [450-600 LINES] ${f.functionalLines} functional lines (${f.totalLines} total) -> ${f.path}`);
});

console.log("\n=== 3. EXACT CODE DUPLICATION (WEB vs ROOT) ===");
webFiles.forEach((wf) => {
  const match = rootFiles.find((rf) => rf.hash === wf.hash);
  if (match) {
    console.log(`🔁 [EXACT MATCH] ${wf.path} <=> ${match.path} (${wf.functionalLines} func lines)`);
  }
});

console.log("\n=== 4. SIMILAR / FORKED FILES (WEB vs ROOT) ===");
webFiles.forEach((wf) => {
  const match = rootFiles.find((rf) => rf.name === wf.name && rf.hash !== wf.hash);
  if (match) {
    console.log(`🔀 [FORKED FILE] ${wf.path} (${wf.functionalLines} lines) <=> ${match.path} (${match.functionalLines} lines)`);
  }
});
