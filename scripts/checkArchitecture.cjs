const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "src");
const errors = [];

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

const allowedRoots = new Set(["app", "features", "infrastructure", "shared"]);
const files = filesIn(sourceRoot).filter((file) => /\.tsx?$/.test(file));

for (const file of files) {
  const relative = path.relative(sourceRoot, file).replace(/\\/g, "/");
  if (!allowedRoots.has(relative.split("/")[0])) {
    errors.push(`${relative}: place source under app, features, infrastructure, or shared.`);
  }
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const isController = /^features\/[^/]+\/hooks\/use.*Screen\.ts$/.test(relative);
  const isFeatureComponent = /^features\/[^/]+\/components\//.test(relative);
  const isFeatureView = /^features\/[^/]+\/(components|screens)\//.test(relative);

  function visit(node) {
    if (isController && (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node))) {
      errors.push(`${relative}: screen hooks must not render JSX.`);
    }
    if (ts.isStringLiteral(node) && node.text.startsWith(".") && node.parent) {
      const parent = node.parent;
      const isModule = (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node;
      const isModuleCall = ts.isCallExpression(parent) && parent.arguments[0] === node &&
        (parent.expression.kind === ts.SyntaxKind.ImportKeyword || parent.expression.getText(source) === "require");
      if (isModule || isModuleCall) {
        const target = path.resolve(path.dirname(file), node.text);
        const candidates = [target, ...[".ts", ".tsx", ".js", ".json", "/index.ts", "/index.tsx"].map((extension) => target + extension)];
        if (!candidates.some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) {
          errors.push(`${relative}: unresolved relative module ${node.text}.`);
        }
        if (relative.startsWith("shared/") && !path.relative(sourceRoot, target).replace(/\\/g, "/").startsWith("shared/")) {
          errors.push(`${relative}: shared modules cannot depend on app, features, or infrastructure (${node.text}).`);
        }
      }
    }
    if (isFeatureView && ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const modulePath = node.moduleSpecifier.text.replace(/\\/g, "/");
      const importsLogicModule = /(?:^|\/)(services|repositories|store)(?:\/|$)/.test(modulePath) ||
        /(?:^|\/)[^/]*Service(?:\.[^/]*)?$/.test(modulePath);
      const isTypeOnly = node.importClause?.isTypeOnly === true;
      if (importsLogicModule && !isTypeOnly) {
        errors.push(`${relative}: views must receive service, repository, and store data through feature hooks (${modulePath}).`);
      }
      if (isFeatureComponent && !isTypeOnly && /(?:^|\/)use[^/]*Screen(?:\.[^/]*)?$/.test(modulePath)) {
        errors.push(`${relative}: feature components must not runtime-import screen hooks (${modulePath}).`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Architecture checks passed for ${files.length} source files.`);
}
