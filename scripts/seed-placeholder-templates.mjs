import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '../backend/data/app.sqlite3');

if (!existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const requiredColumns = [
  'template_type',
  'smb_categories',
  'product_categories',
  'style_tags',
  'default_aspect_ratio',
  'default_size',
  'curator_note',
];

const sizeByAspectRatio = {
  '1:1': '1024x1024',
  '3:4': '896x1184',
  '4:3': '1184x896',
  '2:3': '832x1248',
  '9:16': '768x1360',
};

const productRules = [
  ['beauty_skincare', ['beauty', 'skincare', 'skin care', 'serum', 'cosmetic', 'makeup', 'lotion', 'cream', 'perfume', 'fragrance', 'lipstick']],
  ['fashion_apparel', ['fashion', 'apparel', 'clothing', 'outfit', 'lookbook', 'sneaker', 'shoe', 'streetwear', 'jersey', 'dress', 'swimwear', 'hanbok']],
  ['food_beverage', ['food', 'beverage', 'coffee', 'soda', 'drink', 'burger', 'hot dog', 'yerba', 'mate', 'nescafe', 'nescafé', 'energy drink', 'can']],
  ['home_furniture', ['furniture', 'chair', 'sofa', 'couch', 'armchair', 'living room', 'home decor', 'kitchen', 'bouquet', 'vase']],
  ['tech_electronics', ['tech', 'electronics', 'camera', 'smartwatch', 'watch ultra', 'phone', 'gadget', 'device']],
  ['jewelry_accessories', ['jewelry', 'accessory', 'accessories', 'watch', 'glasses', 'earrings', 'necklace', 'bag', 'cap']],
  ['consumer_packaged_goods', ['packaged', 'packaging', 'package', 'box', 'bottle', 'jar', 'label', 'pump', 'container', 'diorama']],
  ['sports_outdoor', ['sports', 'outdoor', 'stadium', 'football', 'running', 'run ', 'athleisure', 'nike', 'clog']],
];

const noteByProductCategory = {
  beauty_skincare: '美妆护肤电商主图模板',
  fashion_apparel: '服饰穿搭商品展示模板',
  food_beverage: '食品饮品商业广告模板',
  home_furniture: '家居家具生活场景模板',
  tech_electronics: '3C电子产品英雄图模板',
  jewelry_accessories: '饰品配件精致特写模板',
  consumer_packaged_goods: '快消包装商品主图模板',
  sports_outdoor: '运动户外商品场景模板',
};

const candidateKeywords = [
  'e-commerce',
  'ecommerce',
  'product',
  'commercial',
  'advertising',
  'advertisement',
  'campaign',
  'lifestyle',
  'studio shot',
  'product shot',
  'white background',
  'clean white',
  'pack shot',
  'lookbook',
  'apparel',
  'cosmetic',
  'skincare',
  'food',
  'beverage',
  'furniture',
  'electronics',
  'jewelry',
  'fashion',
  'sneaker',
  'shoe',
  'watch',
  'bag',
  'bottle',
  'perfume',
  'fragrance',
  'camera',
  'coffee',
  'packaging',
];

const negativeKeywords = [
  'anime',
  'manga',
  'character',
  'mascot',
  'fantasy',
  'sci-fi',
  'cyberpunk',
  'warrior',
  'dragon',
  'monster',
  'comic',
  'worksheet',
  'paint-by-numbers',
  'logo',
  'typography',
  'thumbnail',
  'avatar',
  'headshot',
  'graduation portrait',
  'birthday portrait',
  'selfie',
];

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function countMatches(text, words) {
  return words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
}

function rowText(row) {
  return `${row.section || ''} ${row.title || ''} ${row.prompt || ''}`.toLowerCase();
}

function scoreCandidate(row) {
  const text = rowText(row);
  const title = String(row.title || '').toLowerCase();
  let score = countMatches(text, candidateKeywords) * 4;

  if (title.includes('e-commerce main image')) score += 24;
  if (title.includes('product marketing')) score += 16;
  if (text.includes('product advertisement') || text.includes('commercial ad')) score += 10;
  if (text.includes('white background') || text.includes('clean white studio')) score += 8;
  if (text.includes('hero') || text.includes('main image')) score += 6;
  if (text.includes('premium') || text.includes('luxury')) score += 4;

  score -= countMatches(text, negativeKeywords) * 8;
  if (title.includes('profile / avatar')) score -= 80;
  if (title.includes('youtube thumbnail')) score -= 40;
  if (title.includes('comic / storyboard')) score -= 30;
  if ((title.includes('portrait') || text.includes('portrait')) && !text.includes('product')) score -= 18;
  if ((title.includes('illustration') || title.includes('sketch')) && !text.includes('product')) score -= 24;

  return score;
}

function isCandidate(row) {
  const text = rowText(row);
  return scoreCandidate(row) >= 12 && includesAny(text, candidateKeywords);
}

function productCategoriesFor(row) {
  const text = rowText(row);
  const scored = productRules
    .map(([category, words]) => [category, countMatches(text, words)])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);

  if (scored.length === 0) return ['consumer_packaged_goods'];
  return scored.slice(0, 2);
}

function styleTagsFor(row) {
  const text = rowText(row);
  const tags = [];
  const add = (tag, condition) => {
    if (condition && !tags.includes(tag)) tags.push(tag);
  };

  add('white_background', /white (background|studio)|clean white|plain white|seamless/.test(text));
  add('lifestyle', /lifestyle|model|worn|wearing|holding|presenting|scene|field|kitchen|cafe|street|living room/.test(text));
  add('premium_studio', /studio|luxury|premium|commercial|product shot|advertisement|ad photography/.test(text));
  add('flat_lay', /flat lay|flat-lay|overhead|top-down/.test(text));
  add('hero_close_up', /hero|close-up|close up|forced perspective|dominates the foreground/.test(text));
  add('hand_held', /handheld|hand-held|holding|held|wrist/.test(text));
  add('golden_hour', /golden hour|sunlit|sunset|morning light|warm morning/.test(text));
  add('product_macro', /macro|serum|lipstick|perfume|fragrance|watch|jewelry|bottle|jar|can/.test(text));
  add('advertising', /advertising|advertisement|campaign|commercial|ad /.test(text));
  add('festive', /christmas|holiday|festive|thanksgiving|new year/.test(text));
  add('editorial', /editorial|magazine|lookbook|campaign board|catalog/.test(text));
  add('minimalist', /minimalist|minimal|clean lines|negative space|clean studio/.test(text));

  for (const fallback of ['premium_studio', 'advertising', 'minimalist']) {
    if (tags.length >= 3) break;
    if (!tags.includes(fallback)) tags.push(fallback);
  }

  return tags.slice(0, 3);
}

function aspectRatioFor(row) {
  const text = rowText(row);

  if (/9:16|vertical format|story format|tiktok|reels/.test(text)) return '9:16';
  if (/2:3/.test(text)) return '2:3';
  if (/3:4|portrait|vertical|full-body|catalog/.test(text)) return '3:4';
  if (/4:3|horizontal|wide|landscape|16:9|campaign board/.test(text)) return '4:3';
  if (/1:1|square|main image|white background|product hero/.test(text)) return '1:1';

  return /lifestyle|scene|field|kitchen|street/.test(text) ? '4:3' : '1:1';
}

function smbCategoriesFor(index, total) {
  const crossOnly = Math.min(10, total);
  const domesticOnly = Math.min(10, Math.max(0, total - crossOnly));

  if (index < crossOnly) return ['cross_border_ecommerce'];
  if (index < crossOnly + domesticOnly) return ['domestic_ecommerce'];
  return ['cross_border_ecommerce', 'domestic_ecommerce'];
}

const db = new Database(dbPath);
const columns = db.prepare('PRAGMA table_info(inspiration_prompts)').all().map((column) => column.name);
const missingColumns = requiredColumns.filter((column) => !columns.includes(column));

if (missingColumns.length > 0) {
  console.error(`Missing B1 template metadata columns: ${missingColumns.join(', ')}. Run the B1 migration before this seed.`);
  process.exit(1);
}

const rows = db.prepare('SELECT id, section, title, prompt, template_type FROM inspiration_prompts').all();
const existingBenchmarkIds = new Set(
  rows.filter((row) => row.template_type === 'benchmark').map((row) => row.id),
);
const selectedIds = new Set(existingBenchmarkIds);

const candidates = rows
  .filter((row) => !selectedIds.has(row.id) && isCandidate(row))
  .sort((a, b) => scoreCandidate(b) - scoreCandidate(a) || String(a.id).localeCompare(String(b.id)));

for (const row of candidates) {
  if (selectedIds.size >= Math.max(30, existingBenchmarkIds.size)) break;
  selectedIds.add(row.id);
}

const selectedRows = rows
  .filter((row) => selectedIds.has(row.id))
  .sort((a, b) => scoreCandidate(b) - scoreCandidate(a) || String(a.id).localeCompare(String(b.id)));

const update = db.prepare(`
  UPDATE inspiration_prompts
  SET
    template_type = 'benchmark',
    smb_categories = @smb_categories,
    product_categories = @product_categories,
    style_tags = @style_tags,
    default_aspect_ratio = @default_aspect_ratio,
    default_size = @default_size,
    curator_note = @curator_note
  WHERE id = @id
`);

const applyUpdates = db.transaction((pickedRows) => {
  pickedRows.forEach((row, index) => {
    const default_aspect_ratio = aspectRatioFor(row);
    const product_categories = productCategoriesFor(row);
    update.run({
      id: row.id,
      smb_categories: JSON.stringify(smbCategoriesFor(index, pickedRows.length)),
      product_categories: JSON.stringify(product_categories),
      style_tags: JSON.stringify(styleTagsFor(row)),
      default_aspect_ratio,
      default_size: sizeByAspectRatio[default_aspect_ratio],
      curator_note: noteByProductCategory[product_categories[0]],
    });
  });
});

applyUpdates(selectedRows);

const distribution = selectedRows.reduce(
  (counts, row, index) => {
    const categories = smbCategoriesFor(index, selectedRows.length);
    if (categories.length === 2) counts.both += 1;
    else if (categories[0] === 'cross_border_ecommerce') counts.cross += 1;
    else counts.domestic += 1;
    return counts;
  },
  { cross: 0, domestic: 0, both: 0 },
);

console.log(
  `Updated ${selectedRows.length} rows. SMB distribution: cross_border=${distribution.cross}, domestic=${distribution.domestic}, both=${distribution.both}.`,
);
