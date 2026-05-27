import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const ignoredDirs = new Set([
  '.git',
  '.pytest_cache',
  '.tmp',
  'benchmark',
  'backend/data',
  'backend/storage',
  'dist',
  'docs/design-references',
  'node_modules',
]);

const ignoredFiles = new Set();
const ignoredPrefixes = [];

function textFromCodes(codes) {
  return String.fromCharCode(...codes);
}

const forbiddenTerms = [
  [74, 111, 107, 111, 65, 73],
  [74, 111, 107, 111, 32, 73, 109, 97, 103, 101],
  [106, 111, 107, 111, 45, 105, 109, 97, 103, 101, 50],
  [106, 111, 107, 111, 45, 105, 109, 97, 103, 101],
  [106, 111, 107, 111, 95, 115, 101, 115, 115, 105, 111, 110],
  [106, 111, 107, 111, 95, 103, 117, 101, 115, 116],
  [99, 111, 109, 46, 106, 111, 107, 111, 46, 105, 109, 97, 103, 101],
  [74, 111, 107, 111, 32, 85, 115, 101, 114],
  [106, 111, 107, 111],
  [114, 101, 97, 99, 116, 45, 101, 120, 97, 109, 112, 108, 101],
  [103, 101, 116, 45, 109, 111, 110, 101, 121],
  [97, 105, 46, 103, 101, 116, 45, 109, 111, 110, 101, 121, 46, 108, 111, 99, 107, 101, 114],
  [105, 109, 97, 103, 101, 46, 103, 101, 116, 45, 109, 111, 110, 101, 121, 46, 108, 111, 99, 107, 101, 114],
];

const patterns = forbiddenTerms.map((codes) => new RegExp(textFromCodes(codes).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

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
