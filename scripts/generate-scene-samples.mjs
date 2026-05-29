// One-shot generator for the 13 non-ecommerce scene sample thumbnails.
// Drives the REAL backend generation pipeline (sub2api via user:2's managed key),
// downloads each result into public/scene-samples/, and prints a JSON manifest.
// Failures (503 / balance / timeout) are reported per-scene; the catalog keeps a
// placeholder for any scene that does not produce an image.
//
// Usage: node scripts/generate-scene-samples.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = (process.env.GEN_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const OUT_DIR = path.join(ROOT, 'public', 'scene-samples');
const INSP = path.join(ROOT, 'backend', 'storage', 'inspirations');
const COOKIE_NAME = 'aethergenix_session';
const OWNER_ID = process.env.GEN_OWNER_ID || 'user:2';
const SUB2API_USER_ID = Number(process.env.GEN_SUB2API_USER_ID || '2');
const POLL_TIMEOUT_MS = Number(process.env.GEN_POLL_TIMEOUT_MS || 300_000);
const started = new Set();

const FOOD = path.join(INSP, 'e1ca63a2642496e43954e80f19c2d633.jpg');
const PORTRAIT = path.join(INSP, 'beb21c487128b19bb6fa712cae6dda10.jpg');
const PRODUCT = path.join(INSP, 'ba05a4c59c41b31105df8b43d28c4660.jpg');

// Prompts mirror src/components/ecommerce/sceneCatalog.ts NON_ECOMMERCE_SCENES.
const SCENES = [
  ['physical_store_fnb', 'dish_hero', FOOD, 'Appetizing hero food photography of the uploaded dish, shot 45-degree angle with a 90mm macro lens, shallow depth of field. Natural soft window light from the side, warm and inviting tones, fresh steam and glistening texture, garnish in sharp focus. Clean rustic wooden or matte ceramic surface, softly blurred restaurant background, professional food-commercial color grading. Vibrant, fresh, mouth-watering.'],
  ['physical_store_fnb', 'promo_poster', FOOD, 'Eye-catching promotional poster for a food & beverage shop featuring the uploaded product as the hero. Bold high-contrast layout with strong headline space at the top, energetic warm color blocks, dynamic splash and ingredient accents around the product. Clear price-tag / discount badge area, modern sans-serif typographic hierarchy, balanced negative space for Chinese promo copy. Vivid, commercial, conversion-focused.'],
  ['physical_store_fnb', 'menu', FOOD, 'Clean digital menu board layout presenting the uploaded item as the featured dish. Elegant grid composition with a large hero photo plus a tidy list area for item names and prices, consistent food-photography treatment, warm neutral background, subtle brand accent color. Generous margins, refined typographic rhythm, restaurant-menu aesthetic that reads clearly on a screen.'],
  ['physical_store_fnb', 'moments', FOOD, 'Cozy lifestyle square photo of the uploaded food/product styled for a WeChat Moments post. Authentic hand-held everyday feel, warm natural light, a real café or home table setting with tasteful props, soft bokeh background. Casual but premium, inviting and shareable, color graded warm and friendly. 1:1 composition with the product naturally placed off-center.'],
  ['physical_store_fnb', 'storefront', FOOD, 'Photorealistic storefront signage mockup featuring the uploaded brand/product. Modern shop facade at golden hour, illuminated channel-letter or lightbox sign, clean awning and entrance, tasteful materials (wood, metal, warm light). Street-level perspective, inviting and upscale small-business look, realistic lighting and reflections.'],

  ['media_account', 'article_cover', PORTRAIT, 'WeChat official-account article cover, wide 2.35:1 banner composition with the uploaded subject as focal point. Editorial magazine feel, strong title area with clear typographic hierarchy, refined color palette and tasteful accent, balanced negative space for a Chinese headline. Crisp, modern, scroll-stopping thumbnail that stays legible when small.'],
  ['media_account', 'inline_image', PORTRAIT, 'Clean in-article illustration based on the uploaded subject. Minimal, well-lit, single clear focal point on a soft neutral or gently colored background, generous breathing room, consistent editorial style. Calm and readable, optimized to break up body text without distracting, soft shadows and balanced composition.'],
  ['media_account', 'banner', PORTRAIT, 'Wide hero banner featuring the uploaded subject, designed for the top of an article or landing page. Cinematic horizontal composition, depth through layering and soft gradient lighting, clear focal subject with ample copy space on one side. Polished brand-grade look, modern color grading, high visual impact.'],
  ['media_account', 'quote_card', PORTRAIT, 'Minimalist quote card with the uploaded subject as a subtle supporting visual. Large clean area reserved for a short bold Chinese quote, elegant typographic emphasis, refined color palette, gentle texture or gradient, tasteful accent line or mark. Calm, premium, highly shareable social card aesthetic, 1:1 or 4:5 composition.'],

  ['smb_saas', 'logo', PRODUCT, 'Clean, modern vector-style logo concept derived from the uploaded mark/product. Simple geometric construction, balanced proportions, a single confident brand color plus neutral, scalable and memorable, presented centered on a clean light background. Professional tech-brand identity look, crisp edges, no clutter.'],
  ['smb_saas', 'hero', PRODUCT, 'SaaS website hero visual featuring the uploaded product. Modern, airy composition with the product floating on a soft gradient or subtle 3D-mesh background, gentle ambient lighting and tasteful glow, generous copy space on the left. Premium, trustworthy tech aesthetic, crisp UI-grade rendering, balanced and uncluttered.'],
  ['smb_saas', 'feature', PRODUCT, 'Feature highlight graphic built around the uploaded product/screenshot. Clean isometric or floating-card presentation, clear single-feature focus, soft shadows and rounded surfaces, calm professional color palette with one accent, space for a short caption. Modern product-marketing look, polished and easy to read.'],
  ['smb_saas', 'deck', PRODUCT, 'Clean presentation/brochure key visual featuring the uploaded subject. Corporate-modern composition, plenty of structured negative space for headings and bullet copy, restrained color system with a single brand accent, soft professional lighting. Crisp, business-grade, consistent with a slide-deck or printed brochure aesthetic.'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ok(url) {
  try { return (await fetch(url)).ok; } catch { return false; }
}

async function waitHttp(url, timeoutMs, label) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    try { if ((await fetch(url)).ok) return; } catch (e) { last = e; }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${label}: ${last?.message || 'no response'}`);
}

function startBackend() {
  return new Promise(async (resolve, reject) => {
    if (await ok(`${BACKEND}/api/health`)) { resolve(false); return; }
    const port = new URL(BACKEND).port || '8000';
    const host = new URL(BACKEND).hostname || '127.0.0.1';
    const lines = [];
    const proc = spawn('python', ['-m', 'uvicorn', 'backend.app.main:app', '--env-file', '.env', '--host', host, '--port', port], {
      cwd: ROOT,
      env: { ...process.env, INSPIRATION_SYNC_ON_STARTUP: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    started.add(proc);
    const cap = (c) => { const t = c.toString(); lines.push(t); if (lines.length > 60) lines.shift(); };
    proc.stdout.on('data', cap);
    proc.stderr.on('data', cap);
    proc.once('exit', (code, sig) => { started.delete(proc); if (code && sig !== 'SIGTERM') console.error('backend exited', code, lines.join('')); });
    try { await waitHttp(`${BACKEND}/api/health`, 40_000, 'backend'); resolve(true); }
    catch (e) { reject(new Error(`${e.message}\n${lines.join('')}`)); }
  });
}

function runPython(code) {
  return new Promise((resolve, reject) => {
    const p = spawn('python', ['-c', code], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (c) => out += c);
    p.stderr.on('data', (c) => err += c);
    p.once('exit', (code) => code === 0 ? resolve(out.trim()) : reject(new Error(`python exit ${code}: ${err || out}`)));
  });
}

async function createSession() {
  const code = `
import json, os
os.environ.setdefault("INSPIRATION_SYNC_ON_STARTUP", "0")
from backend.app.db import Database
from backend.app.settings import Settings
s = Settings.from_env()
db = Database(s.database_path); db.init(s)
sess = db.create_session(owner_id=${JSON.stringify(OWNER_ID)}, sub2api_user_id=${SUB2API_USER_ID},
  email="scene-sampler@local.test", username="scene-sampler", role="user",
  ttl_seconds=s.session_ttl_seconds, access_token="scene-sampler", refresh_token="",
  user_agent="scene-sampler", ip_address="127.0.0.1")
print(json.dumps({"id": sess["id"], "db": str(s.database_path)}))
`;
  return JSON.parse(await runPython(code));
}

async function generateOne(cookie, scene) {
  const [customerKey, sceneKey, input, prompt] = scene;
  const outPath = path.join(OUT_DIR, `${customerKey}_${sceneKey}.png`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    return { file: `/scene-samples/${customerKey}_${sceneKey}.png`, taskId: 'cached', skipped: true };
  }
  if (!fs.existsSync(input)) throw new Error(`input image missing: ${input}`);
  const buf = fs.readFileSync(input);
  const form = new FormData();
  form.set('image', new Blob([buf], { type: 'image/jpeg' }), path.basename(input));
  form.set('reference_notes', JSON.stringify([{ index: 0, role: '商品主图', note: '', primary: true }]));
  form.set('style', prompt);
  form.set('size', '1024x1024');
  form.set('aspect_ratio', '1:1');
  form.set('quality', 'auto');
  form.set('n', '1');

  const res = await fetch(`${BACKEND}/api/ecommerce/generate`, { method: 'POST', headers: { Cookie: cookie }, body: form });
  const text = await res.text();
  let task; try { task = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${task?.detail || text.slice(0, 200)}`);
  const taskId = task.id;

  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await sleep(2500);
    const r = await fetch(`${BACKEND}/api/tasks/${encodeURIComponent(taskId)}`, { headers: { Cookie: cookie } });
    const t = await r.json();
    if (t.status === 'succeeded') {
      const item = (t.items || []).find((i) => i.status === 'succeeded' && i.image_url);
      if (!item) throw new Error('succeeded but no image_url');
      const imgRes = await fetch(`${BACKEND}${item.image_url}`, { headers: { Cookie: cookie } });
      if (!imgRes.ok) throw new Error(`download HTTP ${imgRes.status}`);
      const out = path.join(OUT_DIR, `${customerKey}_${sceneKey}.png`);
      fs.writeFileSync(out, Buffer.from(await imgRes.arrayBuffer()));
      return { file: `/scene-samples/${customerKey}_${sceneKey}.png`, taskId };
    }
    if (t.status === 'failed') throw new Error(`task failed: ${t.error || 'unknown'}`);
  }
  throw new Error('poll timeout');
}

function cleanup() {
  for (const p of started) { try { p.kill(); } catch {} }
}
process.once('SIGINT', () => { cleanup(); process.exit(130); });
process.once('SIGTERM', () => { cleanup(); process.exit(143); });

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const backendStarted = await startBackend();
  const sess = await createSession();
  const cookie = `${COOKIE_NAME}=${sess.id}`;
  console.error(`[gen] backend=${BACKEND} startedByScript=${backendStarted} db=${sess.db} owner=${OWNER_ID}`);

  const manifest = { generated: [], failed: [] };
  for (const scene of SCENES) {
    const label = `${scene[0]}/${scene[1]}`;
    try {
      const r = await generateOne(cookie, scene);
      manifest.generated.push({ scene: label, ...r });
      console.error(`[gen] OK   ${label} -> ${r.file}`);
    } catch (e) {
      manifest.failed.push({ scene: label, error: e.message });
      console.error(`[gen] FAIL ${label}: ${e.message}`);
    }
  }
  console.log(JSON.stringify(manifest, null, 2));
  cleanup();
  await sleep(300);
}

main().catch((e) => { console.error(e.stack || e.message); cleanup(); process.exit(1); });
