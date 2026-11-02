const fs = require("fs");
const path = require("path");
const glob = require("glob");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(__dirname, "organize-plan.json");

const rules = [
  { test: /^src\\components\\/, dest: "src/components" },
  { test: /^src\\screens\\/, dest: "src/screens" },
  { test: /^src\\hooks\\/, dest: "src/hooks" },
  { test: /^src\\contexts\\/, dest: "src/contexts" },
  { test: /^src\\services\\/, dest: "src/services" },
  { test: /^src\\utils\\/, dest: "src/utils" },
  { test: /^src\\constants\\/, dest: "src/constants" },
  { test: /^src\\types\\/, dest: "src/types" },
  { test: /^src\\store\\/, dest: "src/store" },
  { test: /^assets\\/, dest: "src/assets/images" },
];

function proposeNewPath(rel) {
  // normalize separators
  const n = rel.replace(/\\/g, "/");
  // keep files already in intended folders
  for (const r of rules) {
    const rx = new RegExp(r.test);
  }
  // simple rules: if path includes known segment, keep; otherwise try to map by top folder
  const parts = n.split("/");
  if (parts[0] === "src") {
    const top = parts[1];
    switch (top) {
      case "app":
      case "features":
      case "infrastructure":
      case "shared":
        return n;
      case "components":
        return n;
      case "screens":
        return n;
      case "hooks":
        return n;
      case "contexts":
        return n;
      case "services":
        return n;
      case "utils":
        return n;
      case "constants":
        return n;
      case "types":
        return n;
      case "store":
        return n;
      case "navigation":
        return n; // keep nav
      case "database":
        return n;
      default:
        // if file name looks like a component (PascalCase .tsx) move to components/common
        const filename = parts[parts.length - 1];
        if (/^[A-Z].*\.tsx?$/.test(filename)) {
          return `src/components/common/${filename}`;
        }
        return n;
    }
  } else if (parts[0] === "assets") {
    // images -> src/assets/images
    return `src/assets/images/${parts.slice(1).join("/")}`;
  }
  return n;
}

function main() {
  const files = glob.sync("**/*.{ts,tsx,js,jsx,png,jpg,svg,json}", {
    cwd: ROOT,
    nodir: true,
    ignore: ["node_modules/**", "android/**", "ios/**", "build/**", "dist/**", "__trash__/**"],
  });
  const plan = [];
  for (const f of files) {
    const rel = f.replace(/\\/g, "/");
    // skip package and root configs
    if (rel === "package.json" || rel.startsWith("node_modules/")) continue;
    const proposed = proposeNewPath(rel);
    if (proposed !== rel) {
      plan.push({ from: rel, to: proposed });
    }
  }
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), plan }, null, 2), "utf8");
  console.log("Wrote plan to", OUT, "with", plan.length, "proposed moves");
}

main();
