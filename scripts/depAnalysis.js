const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { Project, SyntaxKind } = require("ts-morph");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(__dirname, "dep-analysis.json");

function sha1(s) {
  return crypto.createHash("sha1").update(s, "utf8").digest("hex");
}

async function main() {
  const project = new Project({ tsConfigFilePath: path.join(ROOT, "tsconfig.json"), skipFileDependencyResolution: false });
  const patterns = [path.join(ROOT, "src", "**", "*.{ts,tsx,js,jsx}"), path.join(ROOT, "functions", "src", "**", "*.{ts,tsx,js,jsx}")];
  const sourceFiles = project.addSourceFilesAtPaths(patterns);
  await project.resolveSourceFileDependencies();

  const files = {};
  const byHash = {};

  for (const sf of sourceFiles) {
    const filePath = path.relative(ROOT, sf.getFilePath()).replace(/\\/g, "/");
    const text = sf.getFullText();
    const hash = sha1(text);
    if (!byHash[hash]) byHash[hash] = [];
    byHash[hash].push(filePath);

    const imports = sf.getImportDeclarations().map((d) => {
      const mod = d.getModuleSpecifierValue();
      const resolved = d.getModuleSpecifierSourceFile();
      const resolvedPath = resolved ? path.relative(ROOT, resolved.getFilePath()).replace(/\\/g, "/") : mod;
      return { raw: mod, resolved: resolvedPath };
    });

    const exports = sf.getExportSymbols().map((s) => s.getName());

    files[filePath] = { imports, exports, hash, lines: text.split(/\r?\n/).length };
  }

  // build graph
  const graph = {};
  for (const f in files) {
    graph[f] = files[f].imports.map((i) => i.resolved);
  }

  // detect cycles using DFS
  const cycles = [];
  const temp = new Set();
  const perm = new Set();
  const stack = [];

  function visit(n) {
    if (temp.has(n)) {
      const idx = stack.indexOf(n);
      cycles.push(stack.slice(idx).concat(n));
      return;
    }
    if (perm.has(n)) return;
    temp.add(n);
    stack.push(n);
    const neigh = graph[n] || [];
    for (const m of neigh) {
      if (typeof m !== "string") continue;
      if (!graph[m]) continue;
      visit(m);
    }
    temp.delete(n);
    perm.add(n);
    stack.pop();
  }

  for (const n of Object.keys(graph)) visit(n);

  // incoming edges
  const incoming = {};
  for (const a of Object.keys(graph)) {
    for (const b of graph[a]) {
      incoming[b] = incoming[b] || new Set();
      incoming[b].add(a);
    }
  }

  // orphans: source files that have no incoming edges and are not typical entry points
  const entryCandidates = new Set(["App.tsx", "index.ts", "index.tsx", "App.js", "index.js"]);
  const orphans = [];
  for (const f of Object.keys(files)) {
    const incomingCount = incoming[f] ? incoming[f].size : 0;
    const base = path.basename(f);
    if (incomingCount === 0 && !entryCandidates.has(base)) orphans.push({ file: f });
  }

  // duplicates by hash
  const duplicates = Object.values(byHash).filter((arr) => arr.length > 1);

  const out = { generatedAt: new Date().toISOString(), fileCount: Object.keys(files).length, cycles, orphans, duplicates, files };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
