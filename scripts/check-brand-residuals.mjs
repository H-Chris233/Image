import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const ignoredDirs = new Set([
  '.git',
  '.pytest_cache',
  '.tmp',
  'backend/data',
  'backend/storage',
  'dist',
  'node_modules',
]);

const ignoredFiles = new Set([
  'docs/issues/aethergenix-joko-residual-cleanup-issues.md',
  'scripts/check-brand-residuals.mjs',
]);

const ignoredPrefixes = [
  'docs/reviews/',
];

const patterns = [
  /JokoAI/i,
  /Joko Image/i,
  /joko-image2/i,
  /joko-image/i,
  /joko_session/i,
  /joko_guest/i,
  /com\.joko\.image/i,
  /Joko User/i,
  /\bJoko\b/i,
  /joko/i,
  /react-example/i,
];

const binaryExtensions = new Set([
  '.ico',
  '.jar',
  '.jpg',
  '.jpeg',
  '.png',
  '.sqlite3',
  '.webp',
  '.zip',
]);

function normalize(filePath) {
  return filePath.split(path.sep).join('/');
}

function shouldIgnore(relativePath) {
  const normalized = normalize(relativePath);
  if (ignoredFiles.has(normalized)) return true;
  return ignoredPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function shouldSkipDir(relativePath) {
  const normalized = normalize(relativePath);
  return ignoredDirs.has(normalized);
}

async function collectFiles(dir, base = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = base ? path.join(base, entry.name) : entry.name;
    const absolutePath = path.join(root, relativePath);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(relativePath)) {
        files.push(...await collectFiles(absolutePath, relativePath));
      }
      continue;
    }
    if (entry.isFile() && !shouldIgnore(relativePath)) {
      files.push(relativePath);
    }
  }
  return files;
}

const findings = [];
for (const file of await collectFiles(root)) {
  if (binaryExtensions.has(path.extname(file).toLowerCase())) continue;
  let text;
  try {
    text = await readFile(path.join(root, file), 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\u0000')) continue;

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (patterns.some((pattern) => pattern.test(line))) {
      findings.push(`${normalize(file)}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (findings.length > 0) {
  console.error('Forbidden legacy brand strings found:');
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('Brand residual check passed.');
