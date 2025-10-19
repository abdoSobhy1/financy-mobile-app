const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(__dirname, 'scan-report.json');

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', '.expo', '.next', '.git', 'android', 'ios', 'gradle', 'functions/lib']);
const EXT_TYPE_MAP = {
  '.ts': 'script',
  '.tsx': 'component',
  '.js': 'script',
  '.jsx': 'component',
  '.json': 'config',
  '.png': 'asset',
  '.jpg': 'asset',
  '.jpeg': 'asset',
  '.svg': 'asset',
  '.ttf': 'asset',
  '.otf': 'asset',
  '.md': 'doc'
};

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    const rel = path.relative(ROOT, full);
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      // also skip typical build folders by name
      if (/^build$|^dist$|^node_modules$|^\.expo$|^\.next$/i.test(ent.name)) continue;
      walk(full, files);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      files.push({ full, rel, name: ent.name, ext });
    }
  }
  return files;
}

function analyzeFile(file) {
  const content = fs.readFileSync(file.full, 'utf8');
  const stats = fs.statSync(file.full);
  const lines = content.split(/\r?\n/).length;
  const importMatches = content.match(/^\s*import\s.+$/mg) || [];
  const exportMatches = content.match(/^\s*export\s.+$/mg) || [];
  const requireMatches = content.match(/require\(/g) || [];
  const type = EXT_TYPE_MAP[file.ext] || 'other';
  return {
    path: file.rel.replace(/\\/g, '/'),
    fullPath: file.full,
    name: file.name,
    ext: file.ext,
    type,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    mtime: stats.mtime,
    lines,
    imports: importMatches.length + requireMatches.length,
    exports: exportMatches.length
  };
}

function main() {
  console.log('Scanning', ROOT);
  const rawFiles = walk(ROOT, []);
  const analyzed = rawFiles.map(analyzeFile).sort((a,b)=> a.path.localeCompare(b.path));
  const summary = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    fileCount: analyzed.length
  };
  const out = { summary, files: analyzed };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', OUT);
}

main();
