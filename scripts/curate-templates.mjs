#!/usr/bin/env node

// LLM 通路：可以用以下任一方式（优先级从高到低）
// 1. 环境变量 OPENAI_API_KEY + OpenAI 兼容 endpoint (OPENAI_BASE_URL，默认 https://api.openai.com/v1)
// 2. 项目 sub2api: SUB2API_BASE_URL（参考 README）
// 默认行为：从 env 读 OPENAI_API_KEY 和 OPENAI_BASE_URL

import 'dotenv/config';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const DEFAULT_DB_PATH = path.resolve('backend/data/app.sqlite3');
const DEFAULT_OUTPUT_PATH = path.resolve('scripts/templates-candidates.json');
const DEFAULT_MODEL = process.env.CURATE_MODEL || 'gpt-5.5';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DRY_RUN_LIMIT = 5;
const MAX_PROMPT_CHARS = 1500;
const RETRY_DELAYS_MS = [1000, 4000, 16000];

const systemPrompt = [
  '你是跨境电商 + 国内电商商品主图 benchmark 模板筛选员。',
  '给定一条灵感模板（标题 + prompt + 当前 section 分类），评估它作为"商品主图"benchmark 模板的适配度。',
].join('');

function printHelp() {
  console.log(`LLM-based benchmark template curation (issue #117 / B2).

Usage:
  node scripts/curate-templates.mjs [options]
  npm run curate -- [options]

Options:
  --limit N         Evaluate at most N records. Default: 0 (all records)
  --top N           Write the top N candidates by score. Default: 100
  --concurrency N   Number of concurrent LLM calls. Default: 5
  --dry-run         Evaluate the first 5 records, print JSON to stdout, and do not write a file.
                    If OPENAI_API_KEY is not set, dry-run uses deterministic mock LLM output.
  --output PATH     Output JSON path. Default: scripts/templates-candidates.json
  --model NAME      Override the LLM model. Default: CURATE_MODEL or gpt-5.5
  --help            Show this help.

Environment:
  OPENAI_API_KEY    API key for OpenAI-compatible chat completions.
  OPENAI_BASE_URL   OpenAI-compatible base URL. Default: https://api.openai.com/v1
  SUB2API_BASE_URL  Fallback OpenAI-compatible sub2api base URL when OPENAI_BASE_URL is unset.
  CURATE_MODEL      Model override. Can also be set with --model.

Examples:
  npm run curate -- --dry-run
  npm run curate
  npm run curate -- --top 60 --concurrency 8
`);
}

function parseArgs(argv) {
  const options = {
    limit: 0,
    top: 100,
    concurrency: 5,
    dryRun: false,
    output: DEFAULT_OUTPUT_PATH,
    model: DEFAULT_MODEL,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    const equalsIndex = arg.indexOf('=');
    const [name, inlineValue] = equalsIndex >= 0
      ? [arg.slice(0, equalsIndex), arg.slice(equalsIndex + 1)]
      : [arg, undefined];
    const readValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      index += 1;
      if (index >= argv.length || argv[index].startsWith('--')) {
        throw new Error(`${name} requires a value.`);
      }
      return argv[index];
    };

    if (name === '--limit') {
      options.limit = parseNonNegativeInteger(readValue(), '--limit');
      continue;
    }
    if (name === '--top') {
      options.top = parsePositiveInteger(readValue(), '--top');
      continue;
    }
    if (name === '--concurrency') {
      options.concurrency = parsePositiveInteger(readValue(), '--concurrency');
      continue;
    }
    if (name === '--output') {
      options.output = path.resolve(readValue());
      continue;
    }
    if (name === '--model') {
      const model = readValue().trim();
      if (!model) throw new Error('--model requires a non-empty value.');
      options.model = model;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.dryRun) {
    options.limit = DRY_RUN_LIMIT;
  }

  return options;
}

function parseNonNegativeInteger(value, flag) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${flag} must be a non-negative integer.`);
  }
  return number;
}

function parsePositiveInteger(value, flag) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return number;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error('Run with --help for usage.');
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim() || '';
  const useMock = options.dryRun && !apiKey;
  if (!apiKey && !useMock) {
    console.error('OPENAI_API_KEY is required unless --dry-run is used. Dry-run without a key uses mock LLM output.');
    process.exitCode = 1;
    return;
  }

  const startedAt = performance.now();
  const rows = await readInspirations(DEFAULT_DB_PATH, options.limit);
  const total = rows.length;
  const errors = [];
  let evaluated = 0;

  if (total === 0) {
    const emptyOutput = buildOutput({
      model: options.model,
      totalEvaluated: 0,
      candidates: [],
      errors,
    });
    await finish(emptyOutput, options, startedAt);
    return;
  }

  if (useMock) {
    console.error('Dry-run: OPENAI_API_KEY is not set, using deterministic mock LLM output.');
  }

  const results = await runPool(rows, options.concurrency, async (item) => {
    try {
      const evaluation = useMock
        ? mockEvaluate(item)
        : await evaluateWithRetries(item, {
            apiKey,
            baseUrl: resolveBaseUrl(),
            model: options.model,
          });
      return {
        ok: true,
        value: toCandidate(item, evaluation),
      };
    } catch (error) {
      const errorItem = {
        id: String(item.id),
        error: error instanceof Error ? error.message : String(error),
      };
      errors.push(errorItem);
      return {
        ok: false,
        error: errorItem,
      };
    } finally {
      evaluated += 1;
      if (evaluated % 10 === 0 || evaluated === total) {
        console.error(`Evaluated ${evaluated}/${total}, ${errors.length} errors`);
      }
    }
  });

  const allCandidates = results
    .filter((result) => result.ok)
    .map((result) => result.value)
    .sort((left, right) => right.score - left.score || String(left.id).localeCompare(String(right.id)));
  const candidates = allCandidates
    .slice(0, options.top);

  const output = buildOutput({
    model: options.model,
    totalEvaluated: total,
    candidates,
    errors,
  });

  await finish(output, options, startedAt, allCandidates);
}

async function readInspirations(dbPath, limit) {
  const { DatabaseSync } = await importNodeSqlite();
  const database = new DatabaseSync(dbPath, { readOnly: true });

  try {
    const sql = `
      SELECT id, title, prompt, image_url, section, author
      FROM inspiration_prompts
      ORDER BY id
      ${limit > 0 ? 'LIMIT ?' : ''}
    `;
    return limit > 0
      ? database.prepare(sql).all(limit).map(normalizeRow)
      : database.prepare(sql).all().map(normalizeRow);
  } finally {
    database.close();
  }
}

async function importNodeSqlite() {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = (warning, ...args) => {
    if (args[0] === 'ExperimentalWarning') return undefined;
    return originalEmitWarning.call(process, warning, ...args);
  };
  try {
    return await import('node:sqlite');
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

function normalizeRow(row) {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    prompt: String(row.prompt ?? ''),
    image_url: String(row.image_url ?? ''),
    section: String(row.section ?? ''),
    author: String(row.author ?? ''),
  };
}

function resolveBaseUrl() {
  return (process.env.OPENAI_BASE_URL || process.env.SUB2API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function evaluateWithRetries(item, client) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await evaluateWithLlm(item, client);
    } catch (error) {
      lastError = error;
      if (attempt >= RETRY_DELAYS_MS.length) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

async function evaluateWithLlm(item, { apiKey, baseUrl, model }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserPrompt(item) },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`LLM request failed (${response.status}): ${bodyText.slice(0, 500)}`);
  }

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    throw new Error(`LLM response was not valid JSON: ${bodyText.slice(0, 500)}`);
  }

  const content = extractMessageContent(payload);
  return normalizeEvaluation(parseJsonObject(content));
}

function buildUserPrompt(item) {
  return `标题：${item.title}
当前 section：${item.section}
Prompt 内容：${truncate(item.prompt, MAX_PROMPT_CHARS)}

请输出 JSON：
\`\`\`json
{
  "score": 0-10,
  "rationale": "30 字内说明",
  "suggested_smb": ["cross_border_ecommerce"/"domestic_ecommerce"],
  "suggested_product_categories": ["food"/"apparel"/"electronics"/"skincare"/"home"/"bags"/...],
  "suggested_style_tags": ["clean_white_bg"/"natural_scene"/"premium_studio"/"advertising"/"lifestyle"/...]
}
\`\`\``;
}

function extractMessageContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  throw new Error('LLM response did not contain choices[0].message.content.');
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(jsonText.slice(start, end + 1));
    }
    throw new Error(`Could not parse LLM JSON object: ${text.slice(0, 500)}`);
  }
}

function normalizeEvaluation(raw) {
  const score = Number(raw?.score);
  return {
    score: Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0,
    rationale: truncate(String(raw?.rationale ?? '').trim(), 30),
    suggested_smb: normalizeStringArray(raw?.suggested_smb),
    suggested_product_categories: normalizeStringArray(raw?.suggested_product_categories),
    suggested_style_tags: normalizeStringArray(raw?.suggested_style_tags),
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

function mockEvaluate(item) {
  const text = `${item.title} ${item.section} ${item.prompt}`.toLowerCase();
  const productSignals = ['product', 'packaging', 'studio', 'advertising', 'brand', '商品', '产品', '包装', '主图', '电商'];
  const lifestyleSignals = ['lifestyle', 'scene', 'natural', 'kitchen', 'home', 'outdoor', '场景', '生活', '自然'];
  const weakSignals = ['portrait', 'character', 'fantasy', 'landscape', 'architecture', '插画', '人物', '风景'];

  const productHits = countHits(text, productSignals);
  const lifestyleHits = countHits(text, lifestyleSignals);
  const weakHits = countHits(text, weakSignals);
  const score = Math.max(0, Math.min(10, 6 + productHits * 0.8 + lifestyleHits * 0.35 - weakHits * 0.45));

  return normalizeEvaluation({
    score: Number(score.toFixed(1)),
    rationale: productHits > 0 ? '具备商品展示潜力' : '可作为风格参考',
    suggested_smb: inferSmb(text),
    suggested_product_categories: inferCategories(text),
    suggested_style_tags: inferStyleTags(text),
  });
}

function countHits(text, signals) {
  return signals.reduce((count, signal) => count + (text.includes(signal) ? 1 : 0), 0);
}

function inferSmb(text) {
  const domesticSignals = ['国潮', '小红书', '淘宝', '天猫', '京东', '中文'];
  const crossBorderSignals = ['amazon', 'shopify', 'global', '英文', '海外', '跨境'];
  const result = [];
  if (crossBorderSignals.some((signal) => text.includes(signal))) result.push('cross_border_ecommerce');
  if (domesticSignals.some((signal) => text.includes(signal))) result.push('domestic_ecommerce');
  return result.length > 0 ? result : ['cross_border_ecommerce', 'domestic_ecommerce'];
}

function inferCategories(text) {
  const categories = [
    ['food', ['food', 'drink', 'coffee', 'tea', 'snack', 'fruit', '食品', '饮料', '咖啡', '茶', '零食', '水果']],
    ['apparel', ['apparel', 'fashion', 'shirt', 'dress', 'shoe', '服装', '时尚', '衣服', '鞋']],
    ['electronics', ['electronics', 'phone', 'headphone', 'camera', 'device', '电子', '手机', '耳机', '相机']],
    ['skincare', ['skincare', 'cosmetic', 'beauty', 'cream', 'serum', '护肤', '美妆', '面霜', '精华']],
    ['home', ['home', 'furniture', 'decor', 'kitchen', '家居', '家具', '厨房']],
    ['bags', ['bag', 'backpack', 'handbag', '包', '背包', '手袋']],
  ];
  const matches = categories
    .filter(([, signals]) => signals.some((signal) => text.includes(signal)))
    .map(([category]) => category);
  return matches.length > 0 ? matches : ['general_merchandise'];
}

function inferStyleTags(text) {
  const tags = [
    ['clean_white_bg', ['white background', 'clean background', '白底', '纯白']],
    ['natural_scene', ['natural', 'scene', 'outdoor', '自然', '场景', '户外']],
    ['premium_studio', ['premium', 'studio', 'luxury', '高端', '棚拍', '奢华']],
    ['advertising', ['advertising', 'campaign', 'poster', '广告', '海报']],
    ['lifestyle', ['lifestyle', 'daily', '生活', '日常']],
  ];
  const matches = tags
    .filter(([, signals]) => signals.some((signal) => text.includes(signal)))
    .map(([tag]) => tag);
  return matches.length > 0 ? matches : ['product_reference'];
}

async function runPool(items, concurrency, worker, onSettled) {
  const results = new Array(items.length);
  let cursor = 0;

  async function consume() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const result = await worker(items[index], index);
      results[index] = result;
      onSettled?.(result);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, consume);
  await Promise.all(workers);
  return results;
}

function toCandidate(item, evaluation) {
  return {
    id: item.id,
    title: item.title,
    prompt: item.prompt,
    image_url: item.image_url,
    section: item.section,
    score: evaluation.score,
    rationale: evaluation.rationale,
    suggested_smb: evaluation.suggested_smb,
    suggested_product_categories: evaluation.suggested_product_categories,
    suggested_style_tags: evaluation.suggested_style_tags,
  };
}

function buildOutput({ model, totalEvaluated, candidates, errors }) {
  return {
    generated_at: new Date().toISOString(),
    model,
    total_evaluated: totalEvaluated,
    candidates,
    errors,
  };
}

async function finish(output, options, startedAt, scoredItems = output.candidates) {
  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  const averageScore = scoredItems.length > 0
    ? scoredItems.reduce((sum, item) => sum + item.score, 0) / scoredItems.length
    : 0;
  const distribution = {
    '>=8': scoredItems.filter((item) => item.score >= 8).length,
    '>=7': scoredItems.filter((item) => item.score >= 7 && item.score < 8).length,
    '<7': scoredItems.filter((item) => item.score < 7).length,
  };

  if (options.dryRun) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    await mkdir(path.dirname(options.output), { recursive: true });
    await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    console.error(`Wrote ${output.candidates.length} candidates to ${path.relative(process.cwd(), options.output)}`);
  }

  console.error(`Completed in ${elapsedSeconds.toFixed(1)}s`);
  console.error(`Average score: ${averageScore.toFixed(2)}`);
  console.error(`Score distribution: >=8 ${distribution['>=8']}, >=7 ${distribution['>=7']}, <7 ${distribution['<7']}`);
}

function truncate(value, maxChars) {
  const text = String(value ?? '');
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const currentPath = fileURLToPath(import.meta.url);

if (invokedPath === currentPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
