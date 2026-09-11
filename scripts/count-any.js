const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === "node_modules" || file === ".git" || file === ".next" || file === "dist" || file === "build") return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(".");
let total = 0;
let fileCounts = [];

files.forEach(f => {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  let count = 0;
  lines.forEach(l => {
    const code = l.split("//")[0];
    const matches = code.match(/:\s*any\b|as\s+any\b|<any>/g);
    if (matches) {
      count += matches.length;
    }
  });
  if (count > 0) {
    fileCounts.push({ file: f.replace(/\\/g, "/"), count });
    total += count;
  }
});

fileCounts.sort((a, b) => b.count - a.count);
console.log("Total remaining any:", total);
console.log("Top 40 files with any:");
fileCounts.slice(0, 40).forEach(x => console.log(`${x.count.toString().padStart(4, " ")} | ${x.file}`));
