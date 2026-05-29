#!/usr/bin/env node

// 灵感库 SMB 分类打标脚本：读 inspiration_prompts → 调 LLM 分类 → 回写 DB。
// 全量打标 + relevance 评分；上线时 Explore 只亮 relevance 达标的条目。
//
// 写回 4 个字段：smb_categories / product_categories / style_tags / relevance
// （relevance 列若不存在会自动 ALTER TABLE 补上）。
//
// LLM 通路（从 .env 读，优先级从高到低）：
//   1. OPENAI_API_KEY + OPENAI_BASE_URL（显式覆盖）
//   2. LLM_API_KEY + LLM_BASE_URL（后端 _llm_config 用的同一套，脚本直接复用，.env 配了就零额外设置）
//   3. SUB2API_BASE_URL 作为 base_url 回退
// 模型：CLASSIFY_MODEL > PROMPT_OPTIMIZER_MODEL > CURATE_MODEL > gpt-5.5
//
// 用法：
//   node scripts/classify-inspirations.mjs --dry-run         # 看前 5 条分类结果，不写库（无 key 用 mock）
//   node scripts/classify-inspirations.mjs                   # 给所有未分类的 github 条目打标并回写
//   node scripts/classify-inspirations.mjs --force           # 重新分类（含已分类的）
//   node scripts/classify-inspirations.mjs --include-benchmark  # 也分类 30 条 benchmark 行

import 'dotenv/config';

import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const DEFAULT_DB_PATH = path.resolve('backend/data/app.sqlite3');
const DEFAULT_MODEL = process.env.CLASSIFY_MODEL || process.env.PROMPT_OPTIMIZER_MODEL || process.env.CURATE_MODEL || 'gpt-5.5';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DRY_RUN_LIMIT = 5;
const MAX_PROMPT_CHARS = 1500;
const RETRY_DELAYS_MS = [1000, 4000, 16000];
const WRITE_BATCH_SIZE = 50;
const REQUEST_TIMEOUT_MS = 60_000;

// 五类 SMB 客户（product-spec.md §1.1）。前两类是 v1 MVP，其余三类先打标供 v2。
const SMB_CATEGORIES = [
  'cross_border_ecommerce', // 跨境电商
  'domestic_ecommerce', // 国内电商 / 直播
  'physical_store_fnb', // 实体店 / 餐饮
  'media_account', // 公众号 / 自媒体
  'smb_saas', // 中小 SaaS / 实业
];

// 商品类目（与 backend/app/main.py 的 ECOMMERCE_PRODUCT_ANALYZER_SYSTEM_PROMPT 8 类对齐）。
const PRODUCT_CATEGORIES = [
  'food',
  'fashion_apparel',
  'beauty_skincare',
  'electronics',
  'home_living',
  'bags_accessories',
  'sports_outdoor',
  'general_merchandise',
];

const SMB_SET = new Set(SMB_CATEGORIES);
const PRODUCT_SET = new Set(PRODUCT_CATEGORIES);

const systemPrompt = [
  '你是 AetherGenix 灵感库的 SMB 客户分类标注员。',
  '给定一条灵感模板（标题 + section + prompt），把它归类到面向中小企业(SMB)的客户场景，并评估它作为「电商商品图 / 营销图模板」的可用度。',
  '灵感库里混有大量通用 AI 艺术 prompt、人像、插画、负面要求(Negative Requirements)、总结条目(Final Summary)——这些都不是可用模板，relevance 必须给 0、smb_categories 留空。',
].join('');

function printHelp() {
  console.log(`灵感库 SMB 分类打标（读 inspiration_prompts → LLM 分类 → 回写 DB）。

Usage:
  node scripts/classify-inspirations.mjs [options]
  npm run classify -- [options]

Options:
  --limit N            最多处理 N 条。默认 0（全部命中的行）
  --concurrency N      并发 LLM 调用数。默认 5
  --dry-run            只处理前 5 条、打印 JSON、不写库（无 OPENAI_API_KEY 时用确定性 mock）
  --force              重新分类已分类过的行（默认只处理 relevance 为空的行）
  --include-benchmark  也分类 30 条 benchmark 行（默认只处理 github 行，保留人工筛选的 benchmark）
  --model NAME         覆盖模型。默认 CLASSIFY_MODEL / CURATE_MODEL / gpt-5.5
  --db PATH            DB 路径。默认 backend/data/app.sqlite3
  --help               显示帮助

Environment（脚本经 dotenv 读 .env，优先级从高到低）:
  OPENAI_API_KEY / OPENAI_BASE_URL   显式覆盖
  LLM_API_KEY / LLM_BASE_URL         复用后端 _llm_config 的同一套（.env 配了就零额外设置）
  SUB2API_BASE_URL                   base url 回退
  模型：CLASSIFY_MODEL > PROMPT_OPTIMIZER_MODEL > CURATE_MODEL > gpt-5.5（也可 --model）

写回字段：smb_categories / product_categories / style_tags / relevance(0-5)
五类 SMB：${SMB_CATEGORIES.join(' / ')}
v1 上线只亮 cross_border_ecommerce + domestic_ecommerce 两个 tab、relevance>=4。
`);
}

function parseArgs(argv) {
  const options = {
    limit: 0,
    concurrency: 5,
    dryRun: false,
    force: false,
    includeBenchmark: false,
    model: DEFAULT_MODEL,
    db: DEFAULT_DB_PATH,
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
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--include-benchmark') {
      options.includeBenchmark = true;
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
    if (name === '--concurrency') {
      options.concurrency = parsePositiveInteger(readValue(), '--concurrency');
      continue;
    }
    if (name === '--model') {
      const model = readValue().trim();
      if (!model) throw new Error('--model requires a non-empty value.');
      options.model = model;
      continue;
    }
    if (name === '--db') {
      options.db = path.resolve(readValue());
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.dryRun) {
    options.limit = options.limit > 0 ? Math.min(options.limit, DRY_RUN_LIMIT) : DRY_RUN_LIMIT;
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

  const apiKey = resolveApiKey();
  const useMock = options.dryRun && !apiKey;
  if (!apiKey && !useMock) {
    console.error('OPENAI_API_KEY is required unless --dry-run is used. Dry-run without a key uses mock LLM output.');
    process.exitCode = 1;
    return;
  }

  const { DatabaseSync } = await importNodeSqlite();
  const database = new DatabaseSync(options.db, { readOnly: options.dryRun });

  try {
    if (!options.dryRun) {
      database.exec('PRAGMA busy_timeout = 5000');
      const added = ensureRelevanceColumn(database);
      if (added) console.error('Added column inspiration_prompts.relevance (INTEGER).');
    }

    const hasRelevance = columnExists(database, 'relevance');
    const rows = readRows(database, { ...options, hasRelevance });
    const total = rows.length;

    if (total === 0) {
      console.error('No matching rows. (Already classified? Use --force to re-run, --include-benchmark to include benchmark rows.)');
      return;
    }

    if (useMock) {
      console.error('Dry-run: OPENAI_API_KEY is not set, using deterministic mock LLM output.');
    }
    console.error(`Classifying ${total} row(s)${options.dryRun ? ' (dry-run, no DB writes)' : ''}…`);

    const startedAt = performance.now();
    const summary = { written: 0, errors: [], bySmb: {}, byRelevance: {} };
    const dryRunPreview = [];
    const pendingWrites = [];
    let processed = 0;

    await runPool(rows, options.concurrency, async (item) => {
      let evaluation;
      try {
        evaluation = useMock
          ? mockEvaluate(item)
          : await evaluateWithRetries(item, { apiKey, baseUrl: resolveBaseUrl(), model: options.model });
      } catch (error) {
        summary.errors.push({ id: item.id, error: error instanceof Error ? error.message : String(error) });
        return;
      }

      if (options.dryRun) {
        dryRunPreview.push({ id: item.id, title: item.title, section: item.section, ...evaluation });
      } else {
        pendingWrites.push({ id: item.id, evaluation });
        if (pendingWrites.length >= WRITE_BATCH_SIZE) {
          summary.written += flushWrites(database, pendingWrites);
        }
      }

      summary.byRelevance[evaluation.relevance] = (summary.byRelevance[evaluation.relevance] || 0) + 1;
      for (const smb of evaluation.smb_categories) {
        summary.bySmb[smb] = (summary.bySmb[smb] || 0) + 1;
      }

      processed += 1;
      if (processed % 25 === 0 || processed === total) {
        console.error(`Processed ${processed}/${total}, ${summary.written} written, ${summary.errors.length} errors`);
      }
    });

    if (!options.dryRun) {
      summary.written += flushWrites(database, pendingWrites);
    }

    if (options.dryRun) {
      console.log(JSON.stringify(dryRunPreview, null, 2));
    }

    printSummary(summary, total, performance.now() - startedAt, options);
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

function columnExists(database, columnName) {
  return database
    .prepare('PRAGMA table_info(inspiration_prompts)')
    .all()
    .some((column) => column.name === columnName);
}

function ensureRelevanceColumn(database) {
  if (columnExists(database, 'relevance')) return false;
  database.exec('ALTER TABLE inspiration_prompts ADD COLUMN relevance INTEGER');
  return true;
}

function readRows(database, { includeBenchmark, force, limit, hasRelevance }) {
  const where = [];
  if (!includeBenchmark) where.push("template_type = 'github'");
  if (!force && hasRelevance) where.push('relevance IS NULL');

  const sql = `
    SELECT id, title, prompt, image_url, section, author
    FROM inspiration_prompts
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY id
    ${limit > 0 ? 'LIMIT ?' : ''}
  `;
  const rows = limit > 0 ? database.prepare(sql).all(limit) : database.prepare(sql).all();
  return rows.map(normalizeRow);
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

function writeRow(database, id, evaluation) {
  database
    .prepare(
      `UPDATE inspiration_prompts
       SET smb_categories = ?, product_categories = ?, style_tags = ?, relevance = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      JSON.stringify(evaluation.smb_categories),
      JSON.stringify(evaluation.product_categories),
      JSON.stringify(evaluation.style_tags),
      evaluation.relevance,
      new Date().toISOString(),
      id,
    );
}

function flushWrites(database, buffer) {
  if (buffer.length === 0) return 0;
  const batch = buffer.splice(0, buffer.length);
  database.exec('BEGIN');
  try {
    for (const { id, evaluation } of batch) {
      writeRow(database, id, evaluation);
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return batch.length;
}

function resolveApiKey() {
  return (process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '').trim();
}

function resolveBaseUrl() {
  return (process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || process.env.SUB2API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

  return normalizeEvaluation(parseJsonObject(extractMessageContent(payload)));
}

function buildUserPrompt(item) {
  return `标题：${item.title}
当前 section：${item.section}
作者：${item.author}
Prompt 内容：${truncate(item.prompt, MAX_PROMPT_CHARS)}

只输出 JSON：
{
  "relevance": 0,
  "smb_categories": [],
  "product_categories": [],
  "style_tags": [],
  "rationale": ""
}

字段规则：
- relevance：0-5 整数。0=不是可用电商/营销图模板（通用艺术图、人像、插画、负面要求、总结条目都给 0）；3=可用；5=高质量、可直接用的商品主图/场景图模板。
- smb_categories：从 ${SMB_CATEGORIES.join(' / ')} 选 0 个或多个；不确定就留空。
- product_categories：从 ${PRODUCT_CATEGORIES.join(' / ')} 选 0 个或多个。
- style_tags：小写 snake_case，自由概括风格（如 clean_white_bg / lifestyle / premium_studio / advertising）。
- rationale：30 字内中文说明。`;
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
  const relevanceRaw = Number(raw?.relevance);
  const relevance = Number.isFinite(relevanceRaw) ? Math.max(0, Math.min(5, Math.round(relevanceRaw))) : 0;
  return {
    relevance,
    smb_categories: normalizeEnumArray(raw?.smb_categories, SMB_SET),
    product_categories: normalizeEnumArray(raw?.product_categories, PRODUCT_SET),
    style_tags: normalizeStyleTags(raw?.style_tags),
    rationale: truncate(String(raw?.rationale ?? '').trim(), 30),
  };
}

function normalizeEnumArray(value, allowed) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter((item) => allowed.has(item)))];
}

function normalizeStyleTags(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => String(item).trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, ''))
        .filter((tag) => tag.length > 0 && tag.length <= 40),
    ),
  ].slice(0, 8);
}

function mockEvaluate(item) {
  const text = `${item.title} ${item.section} ${item.prompt}`.toLowerCase();
  const junkSignals = ['negative requirement', 'final summary', 'all prompts', '负面', '总结'];
  if (junkSignals.some((signal) => text.includes(signal)) && !text.includes('product')) {
    return normalizeEvaluation({ relevance: 0, smb_categories: [], product_categories: [], style_tags: [], rationale: '结构条目，非模板' });
  }

  const productHits = countHits(text, ['product', 'packaging', 'studio', 'advertising', 'brand', '商品', '产品', '包装', '主图', '电商']);
  const lifestyleHits = countHits(text, ['lifestyle', 'scene', 'natural', 'kitchen', 'home', 'outdoor', '场景', '生活', '自然']);
  const weakHits = countHits(text, ['portrait', 'character', 'fantasy', 'landscape', 'architecture', '插画', '人物', '风景']);
  const score = 2 + productHits * 0.8 + lifestyleHits * 0.4 - weakHits * 0.6;

  return normalizeEvaluation({
    relevance: Math.max(0, Math.min(5, Math.round(score))),
    smb_categories: inferSmb(text),
    product_categories: inferCategories(text),
    style_tags: inferStyleTags(text),
    rationale: productHits > 0 ? '具备商品展示潜力' : '风格参考',
  });
}

function countHits(text, signals) {
  return signals.reduce((count, signal) => count + (text.includes(signal) ? 1 : 0), 0);
}

function inferSmb(text) {
  const result = [];
  if (['amazon', 'shopify', 'global', '英文', '海外', '跨境'].some((s) => text.includes(s))) result.push('cross_border_ecommerce');
  if (['小红书', '淘宝', '天猫', '京东', '直播', '国潮'].some((s) => text.includes(s))) result.push('domestic_ecommerce');
  if (['menu', 'restaurant', 'cafe', '餐', '菜单', '门店'].some((s) => text.includes(s))) result.push('physical_store_fnb');
  if (['poster', 'cover', 'article', '公众号', '封面', '配图'].some((s) => text.includes(s))) result.push('media_account');
  if (['logo', 'saas', 'website', 'app', '官网', '宣传册', 'ppt'].some((s) => text.includes(s))) result.push('smb_saas');
  return result.length > 0 ? result : ['cross_border_ecommerce', 'domestic_ecommerce'];
}

function inferCategories(text) {
  const categories = [
    ['food', ['food', 'drink', 'coffee', 'tea', 'snack', 'fruit', 'burger', '食品', '饮料', '咖啡', '茶', '零食', '水果']],
    ['fashion_apparel', ['apparel', 'fashion', 'shirt', 'dress', 'shoe', '服装', '时尚', '衣服', '鞋']],
    ['electronics', ['electronics', 'phone', 'headphone', 'camera', 'device', '电子', '手机', '耳机', '相机']],
    ['beauty_skincare', ['skincare', 'cosmetic', 'beauty', 'cream', 'serum', '护肤', '美妆', '面霜', '精华']],
    ['home_living', ['home', 'furniture', 'decor', 'kitchen', '家居', '家具', '厨房']],
    ['bags_accessories', ['bag', 'backpack', 'handbag', 'jewelry', 'watch', '包', '背包', '手袋', '首饰', '手表']],
    ['sports_outdoor', ['sport', 'outdoor', 'fitness', 'hiking', '运动', '户外', '健身']],
  ];
  const matches = categories.filter(([, signals]) => signals.some((s) => text.includes(s))).map(([category]) => category);
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
  const matches = tags.filter(([, signals]) => signals.some((s) => text.includes(s))).map(([tag]) => tag);
  return matches.length > 0 ? matches : ['product_reference'];
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  async function consume() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, consume);
  await Promise.all(workers);
}

function printSummary(summary, total, elapsedMs, options) {
  console.error('');
  console.error(`Completed in ${(elapsedMs / 1000).toFixed(1)}s`);
  if (!options.dryRun) console.error(`Wrote ${summary.written}/${total} rows to DB.`);
  console.error(`Errors: ${summary.errors.length}`);

  const relevanceLine = [0, 1, 2, 3, 4, 5].map((score) => `${score}:${summary.byRelevance[score] || 0}`).join('  ');
  console.error(`Relevance distribution  ${relevanceLine}`);
  const launchable = (summary.byRelevance[4] || 0) + (summary.byRelevance[5] || 0);
  console.error(`Launch-worthy (relevance>=4): ${launchable}`);

  console.error('By SMB:');
  for (const smb of SMB_CATEGORIES) {
    const mvp = smb === 'cross_border_ecommerce' || smb === 'domestic_ecommerce' ? '  (v1 MVP)' : '';
    console.error(`  ${smb.padEnd(24)} ${summary.bySmb[smb] || 0}${mvp}`);
  }

  if (summary.errors.length > 0) {
    console.error(`First errors: ${summary.errors.slice(0, 3).map((entry) => `${entry.id}: ${entry.error}`).join(' | ')}`);
  }
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
