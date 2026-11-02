const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { Project } = require("ts-morph");

const ROOT = path.resolve(__dirname, "..");
const OUT_PLAN = path.join(__dirname, "organize-plan-full.json");
const OUT_LOG = path.join(__dirname, "organize-applied-log.json");

function posix(p) {
  return p.replace(/\\/g, "/");
}

function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function propose(rel) {
  // rel uses posix separators
  if (!rel.startsWith("src/")) return rel; // only organize src
  const parts = rel.split("/");
  if (
    parts[1] &&
    ["app", "features", "infrastructure", "shared", "components", "screens", "hooks", "contexts", "services", "utils", "constants", "types", "store", "navigation", "database"].includes(parts[1])
  )
    return rel;
  const filename = parts[parts.length - 1];
  // heuristics
  if (/Screen\.(tsx|jsx|ts|js)$/.test(filename)) return `src/screens/${filename}`;
  if (/Navigator\.(tsx|jsx|ts|js)$/.test(filename) || /Navigator/.test(filename)) return `src/navigation/${filename}`;
  if (/^use[A-Z].*\.(ts|tsx|js|jsx)$/.test(filename)) return `src/hooks/${filename}`;
  if (/Service\.(ts|tsx|js|jsx)$/.test(filename) || /service/i.test(filename)) return `src/services/${filename}`;
  if (/\.?(utils|helpers?)\./i.test(filename) || parts[1] === "utils") return `src/utils/${filename}`;
  if (/\.?(types?)\./i.test(filename) || parts[1] === "types") return `src/types/${filename}`;
  if (/\.?(slice|store)\./i.test(filename) || parts[1] === "store") return `src/store/${filename}`;
  if (/^[A-Z].*\.(tsx|jsx)$/.test(filename)) return `src/components/common/${filename}`;
  return rel;
}

function buildMoves() {
  const files = glob.sync("src/**/*.{ts,tsx,js,jsx}", { cwd: ROOT, nodir: true, ignore: ["src/**/*.d.ts"] });
  const moves = [];
  for (const f of files) {
    const rel = posix(f);
    const prop = propose(rel);
    if (prop !== rel) {
      moves.push({ from: rel, to: prop });
    }
  }
  return moves;
}

async function apply() {
  const moves = buildMoves();
  fs.writeFileSync(OUT_PLAN, JSON.stringify({ generatedAt: new Date().toISOString(), moves }, null, 2));
  if (moves.length === 0) {
    console.log("No moves to apply. Plan saved to", OUT_PLAN);
    return;
  }

  // perform physical moves
  for (const m of moves) {
    const src = path.join(ROOT, m.from);
    const dest = path.join(ROOT, m.to);
    ensureDirSync(path.dirname(dest));
    if (!fs.existsSync(src)) {
      console.warn("Source not found, skipping", m.from);
      continue;
    }
    // if dest exists, skip or rename with suffix
    if (fs.existsSync(dest)) {
      console.warn("Destination exists, skipping move for", m.from, "->", m.to);
      continue;
    }
    fs.renameSync(src, dest);
    console.log("Moved", m.from, "->", m.to);
  }

  // update imports using ts-morph
  const project = new Project({ tsConfigFilePath: path.join(ROOT, "tsconfig.json"), skipAddingFilesFromTsConfig: true });
  const srcFiles = glob.sync("**/*.{ts,tsx,js,jsx}", { cwd: path.join(ROOT, "src"), nodir: true });
  for (const f of srcFiles) {
    project.addSourceFileAtPath(path.join(ROOT, "src", f));
  }
  // also add scripts that may import
  project.addSourceFilesAtPaths(path.join(ROOT, "scripts", "**/*.{ts,tsx,js,jsx}"));

  await project.resolveSourceFileDependencies();

  // map moved absolute paths
  const moveMap = new Map();
  for (const m of moves) {
    const absFrom = path.join(ROOT, m.from);
    const absTo = path.join(ROOT, m.to);
    moveMap.set(path.normalize(absFrom), path.normalize(absTo));
  }

  const changedFiles = new Set();
  for (const sf of project.getSourceFiles()) {
    let edited = false;
    const imports = sf.getImportDeclarations();
    for (const imp of imports) {
      const resolved = imp.getModuleSpecifierSourceFile();
      if (!resolved) continue;
      const resolvedPath = path.normalize(resolved.getFilePath());
      if (moveMap.has(resolvedPath)) {
        const newAbs = moveMap.get(resolvedPath);
        const rel = path.relative(path.dirname(sf.getFilePath()), newAbs);
        let spec = rel.replace(/\\/g, "/");
        if (!spec.startsWith(".")) spec = "./" + spec;
        // remove extension for ts imports if present
        spec = spec.replace(/\.(ts|tsx|js|jsx)$/, "");
        imp.setModuleSpecifier(spec);
        edited = true;
        console.log("Updated import in", sf.getFilePath(), "to", spec);
      }
    }
    if (edited) {
      sf.saveSync();
      changedFiles.add(sf.getFilePath());
    }
  }

  fs.writeFileSync(OUT_LOG, JSON.stringify({ appliedAt: new Date().toISOString(), moved: moves, updatedFiles: Array.from(changedFiles) }, null, 2));
  console.log("Apply complete. Log at", OUT_LOG);
}

apply().catch((err) => {
  console.error(err);
  process.exit(1);
});
