const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEP = path.join(__dirname, "dep-analysis.json");
const TRASH = path.join(ROOT, "__trash__");
const LOG = path.join(TRASH, "quarantine-log.json");

if (!fs.existsSync(DEP)) {
  console.error("Missing dep-analysis.json - run scripts/depAnalysis.js first");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DEP, "utf8"));
const reasons = [];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

ensureDir(TRASH);

function moveFile(relPath, reason) {
  const src = path.join(ROOT, relPath);
  if (!fs.existsSync(src)) return reasons.push({ file: relPath, reason: "not-found" });
  const dest = path.join(TRASH, relPath);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  // keep original in place for now; mark in log
  reasons.push({ file: relPath, reason });
}

for (const o of data.orphans || []) {
  moveFile(o.file, "orphan (no incoming imports)");
}

for (const dupGroup of data.duplicates || []) {
  // keep first, quarantine the rest
  for (let i = 1; i < dupGroup.length; i++) moveFile(dupGroup[i], `duplicate of ${dupGroup[0]}`);
}

fs.writeFileSync(LOG, JSON.stringify({ generatedAt: new Date().toISOString(), items: reasons }, null, 2), "utf8");
console.log("Quarantine complete - log at", LOG);
