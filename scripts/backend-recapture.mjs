import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output', 'playwright', 'backend-recapture');
const PROFILE_DIR = path.join(OUTPUT_DIR, 'browser-profile');
const BASE_URL = (process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const BACKEND_URL = (process.env.CAPTURE_BACKEND_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');
const LOAD_TIMEOUT_MS = Number(process.env.CAPTURE_LOAD_TIMEOUT_MS || 45_000);
const CHECK_TIMEOUT_MS = Number(process.env.CAPTURE_CHECK_TIMEOUT_MS || 25_000);
const ADMIN_SESSION_COOKIE = process.env.CAPTURE_SESSION_COOKIE || 'aethergenix_session';
const LOCALE = process.env.CAPTURE_LOCALE || 'zh-CN';
const MIN_EXPLORE_IMAGES = Number(process.env.CAPTURE_MIN_EXPLORE_IMAGES || 8);

const startedProcesses = new Set();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(filePath) {
  try {
    return Boolean(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function smokeEnv() {
  return {
    ...process.env,
    npm_config_cache: process.env.npm_config_cache || path.join(ROOT_DIR, '.tmp', 'npm-cache'),
    INSPIRATION_SYNC_ON_STARTUP: process.env.INSPIRATION_SYNC_ON_STARTUP || '0',
    VITE_BACKEND_PROXY_TARGET: process.env.VITE_BACKEND_PROXY_TARGET || BACKEND_URL,
  };
}

function createLogBuffer() {
  const lines = [];
  return {
    push(chunk) {
      const text = chunk.toString('utf8');
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        lines.push(line);
        if (lines.length > 80) lines.shift();
      }
    },
    tail() {
      return lines.join('\n');
    },
  };
}

async function fetchOk(url, timeoutMs = 5_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (!response.ok) {
    const detail = data?.detail || data?.message || response.statusText;
    throw new Error(`${url} returned HTTP ${response.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return data;
}

async function waitForHttp(url, timeoutMs, label) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${label}: ${lastError?.message || 'no response'}`);
}

async function startBackendIfNeeded() {
  if (await fetchOk(`${BACKEND_URL}/api/health`)) {
    return { started: false };
  }

  ensureDir(path.join(ROOT_DIR, '.tmp', 'dev'));
  const logs = createLogBuffer();
  const backendPort = new URL(BACKEND_URL).port || '8000';
  const backendHost = new URL(BACKEND_URL).hostname || '127.0.0.1';
  const backendArgs = [
    '-m',
    'uvicorn',
    'backend.app.main:app',
    '--host',
    backendHost,
    '--port',
    backendPort,
  ];
  if (exists(path.join(ROOT_DIR, '.env'))) {
    backendArgs.splice(3, 0, '--env-file', '.env');
  }
  const backend = spawn('python', backendArgs, {
    cwd: ROOT_DIR,
    env: smokeEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  startedProcesses.add(backend);
  backend.stdout.on('data', (chunk) => logs.push(chunk));
  backend.stderr.on('data', (chunk) => logs.push(chunk));
  backend.once('exit', (code, signal) => {
    startedProcesses.delete(backend);
    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`Backend exited early (${signal || code}).\n${logs.tail()}`);
    }
  });

  try {
    await waitForHttp(`${BACKEND_URL}/api/health`, CHECK_TIMEOUT_MS, 'FastAPI backend');
  } catch (error) {
    throw new Error(`${error.message}\n${logs.tail()}`);
  }

  return { started: true, process: backend };
}

async function startViteIfNeeded() {
  if (await fetchOk(BASE_URL)) {
    return { started: false };
  }

  const viteBin = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!exists(viteBin)) {
    throw new Error('Vite is not installed. Run npm ci before npm run capture:backend.');
  }

  const port = new URL(BASE_URL).port || '3000';
  const logs = createLogBuffer();
  const vite = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', port, '--strictPort'], {
    cwd: ROOT_DIR,
    env: smokeEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  startedProcesses.add(vite);
  vite.stdout.on('data', (chunk) => logs.push(chunk));
  vite.stderr.on('data', (chunk) => logs.push(chunk));
  vite.once('exit', (code, signal) => {
    startedProcesses.delete(vite);
    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`Vite exited early (${signal || code}).\n${logs.tail()}`);
    }
  });

  try {
    await waitForHttp(BASE_URL, CHECK_TIMEOUT_MS, 'Vite frontend');
  } catch (error) {
    throw new Error(`${error.message}\n${logs.tail()}`);
  }

  return { started: true, process: vite };
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      env: smokeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited ${code}\n${stdout}\n${stderr}`));
      }
    });
  });
}

async function createLocalAdminSession() {
  if (process.env.CAPTURE_ADMIN_SESSION) {
    return {
      session_id: process.env.CAPTURE_ADMIN_SESSION,
      owner_id: process.env.CAPTURE_ADMIN_OWNER_ID || 'provided',
      task_id: process.env.CAPTURE_TASK_ID || '',
      source: 'env',
    };
  }

  const script = String.raw`
import json
import os
import shlex
import sqlite3
from pathlib import Path

root = Path.cwd()
env_path = root / ".env"
if env_path.exists():
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        try:
            value = shlex.split(value, posix=False)[0]
        except Exception:
            value = value.strip('"').strip("'")
        os.environ.setdefault(key, value.strip('"').strip("'"))

os.environ.setdefault("INSPIRATION_SYNC_ON_STARTUP", "0")

from backend.app.db import Database
from backend.app.settings import Settings

settings = Settings.from_env()
db = Database(settings.database_path)
db.init(settings)

with sqlite3.connect(settings.database_path) as conn:
    conn.row_factory = sqlite3.Row
    requested_task_id = os.getenv("CAPTURE_TASK_ID", "").strip()
    if requested_task_id:
        row = conn.execute(
            """
            SELECT id, owner_id
            FROM image_tasks
            WHERE id = ? AND status = 'succeeded'
            """,
            (requested_task_id,),
        ).fetchone()
    else:
        row = conn.execute(
            """
            SELECT id, owner_id
            FROM image_tasks
            WHERE status = 'succeeded'
              AND COALESCE(result_history_ids_json, '[]') != '[]'
            ORDER BY created_at DESC
            LIMIT 1
            """
        ).fetchone()
    if row is None:
        raise SystemExit("No succeeded image task with result images found in local backend database")
    task_id = row["id"]
    owner_id = os.getenv("CAPTURE_ADMIN_OWNER_ID", "").strip() or row["owner_id"]

try:
    sub2api_user_id = int(str(owner_id).split(":", 1)[1])
except Exception:
    sub2api_user_id = 900001

session = db.create_session(
    owner_id=owner_id,
    sub2api_user_id=sub2api_user_id,
    email=os.getenv("CAPTURE_ADMIN_EMAIL", "local-admin@example.test"),
    username=os.getenv("CAPTURE_ADMIN_USERNAME", "local-admin"),
    role="admin",
    ttl_seconds=settings.session_ttl_seconds,
    access_token="local-admin-screenshot-token",
    refresh_token="",
    user_agent="AetherGenix backend recapture",
    ip_address="127.0.0.1",
)

ordinary_session = db.create_session(
    owner_id=owner_id,
    sub2api_user_id=sub2api_user_id,
    email=os.getenv("CAPTURE_USER_EMAIL", "local-user@example.test"),
    username=os.getenv("CAPTURE_USER_USERNAME", "local-user"),
    role="user",
    ttl_seconds=settings.session_ttl_seconds,
    access_token="local-user-screenshot-token",
    refresh_token="",
    user_agent="AetherGenix backend recapture non-admin",
    ip_address="127.0.0.1",
)

print(json.dumps({
    "session_id": session["id"],
    "user_session_id": ordinary_session["id"],
    "owner_id": owner_id,
    "task_id": task_id,
    "source": "local-db",
}))
`;

  const { stdout } = await runProcess('python', ['-c', script]);
  return JSON.parse(stdout.trim());
}

function findOnPath(names) {
  const pathValue = process.env.PATH || '';
  const pathExts = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : [''];

  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) continue;
    for (const name of names) {
      const candidates = process.platform === 'win32' && !path.extname(name)
        ? pathExts.map((ext) => path.join(dir, `${name}${ext.toLowerCase()}`))
        : [path.join(dir, name)];
      for (const candidate of candidates) {
        if (exists(candidate)) return candidate;
      }
    }
  }
  return null;
}

function findBrowserExecutable() {
  const windowsCandidates = process.platform === 'win32'
    ? [
        path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join('D:', 'AppDataMigration', 'Local', 'ms-playwright', 'chromium-1219', 'chrome-win64', 'chrome.exe'),
        path.join('D:', 'AppDataMigration', 'Local', 'ms-playwright', 'chromium-1224', 'chrome-win64', 'chrome.exe'),
      ]
    : [];

  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    process.env.BROWSER_PATH,
    ...windowsCandidates,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];

  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }

  return findOnPath(['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge', 'microsoft-edge']);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

class CdpConnection {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.ws = new WebSocket(wsUrl);
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = (event) => reject(new Error(`CDP websocket error: ${event.message || 'unknown'}`));
    });
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      clearTimeout(pending.timeout);
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(`${message.error.message || 'CDP error'} ${message.error.data || ''}`.trim()));
      } else {
        pending.resolve(message.result || {});
      }
    };
    this.ws.onclose = () => {
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(`CDP websocket closed before response ${id}`));
      }
      this.pending.clear();
    };
  }

  async send(method, params = {}, sessionId = undefined, timeoutMs = 20_000) {
    await this.ready;
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out during ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // Browser may already be gone.
    }
  }
}

async function evaluate(cdp, sessionId, fn, ...args) {
  const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed';
    throw new Error(description);
  }
  return result.result?.value;
}

async function waitFor(cdp, sessionId, fn, label, timeoutMs = LOAD_TIMEOUT_MS, ...args) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await evaluate(cdp, sessionId, fn, ...args);
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }

  const diagnostic = await evaluate(cdp, sessionId, () => ({
    href: window.location.href,
    readyState: document.readyState,
    bodyText: document.body?.innerText?.slice(0, 900) || '',
    images: Array.from(document.images).slice(0, 16).map((img) => ({
      src: img.getAttribute('src'),
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      width: Math.round(img.getBoundingClientRect().width),
      height: Math.round(img.getBoundingClientRect().height),
    })),
    dialogs: Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]')).map((node) => node.textContent?.slice(0, 140)),
  })).catch((error) => ({ error: error.message }));

  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}; diagnostic=${JSON.stringify(diagnostic)}`);
}

async function startBrowser() {
  const executable = findBrowserExecutable();
  if (!executable) {
    throw new Error('Could not find Chrome, Chromium, or Edge. Set CHROME_PATH/CHROME_BIN and rerun npm run capture:backend.');
  }

  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  ensureDir(PROFILE_DIR);

  const debugPort = await freePort();
  const args = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-gpu',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    'about:blank',
  ];
  if (process.platform === 'linux') {
    args.splice(3, 0, '--no-sandbox');
  }

  const browser = spawn(executable, args, {
    cwd: ROOT_DIR,
    env: smokeEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  startedProcesses.add(browser);
  browser.once('exit', () => startedProcesses.delete(browser));

  const versionUrl = `http://127.0.0.1:${debugPort}/json/version`;
  const version = await (async () => {
    const startedAt = Date.now();
    let lastError = null;
    while (Date.now() - startedAt < CHECK_TIMEOUT_MS) {
      try {
        return await fetchJson(versionUrl);
      } catch (error) {
        lastError = error;
        await sleep(150);
      }
    }
    throw lastError || new Error('Browser CDP did not start');
  })();

  return { browser, wsUrl: version.webSocketDebuggerUrl };
}

async function closeAnnouncementIfPresent(cdp, sessionId) {
  await evaluate(cdp, sessionId, () => {
    const closeButton = Array.from(document.querySelectorAll('button')).find((button) => {
      const name = `${button.getAttribute('aria-label') || ''} ${button.getAttribute('title') || ''} ${button.textContent || ''}`;
      return /关闭|Close|Dismiss|我知道|Got it/.test(name) && button.closest('[role="dialog"], [role="alertdialog"]');
    });
    if (closeButton) closeButton.click();
  }).catch(() => undefined);
}

async function captureRoute(cdp, sessionId, capture, sessionValues) {
  const cookieValue = capture.session === 'user'
    ? sessionValues.userSessionId
    : sessionValues.adminSessionId;
  if (cookieValue) {
    await cdp.send('Network.setCookie', {
      name: ADMIN_SESSION_COOKIE,
      value: cookieValue,
      url: BASE_URL,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }, sessionId);
  } else if (capture.session === 'user') {
    await cdp.send('Network.deleteCookies', {
      name: ADMIN_SESSION_COOKIE,
      url: BASE_URL,
    }, sessionId);
  }

  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width: capture.width,
      height: capture.height,
      deviceScaleFactor: 1,
      mobile: capture.width <= 600,
    },
    sessionId,
  );

  await cdp.send('Page.navigate', { url: new URL(capture.route, BASE_URL).toString() }, sessionId);
  await waitFor(
    cdp,
    sessionId,
    () => document.readyState !== 'loading' && Boolean(document.getElementById('root')?.children.length) && Boolean(document.querySelector('main')),
    `${capture.name} shell`,
  );
  await waitFor(cdp, sessionId, capture.wait, capture.name, LOAD_TIMEOUT_MS, ...capture.waitArgs);
  await closeAnnouncementIfPresent(cdp, sessionId);
  await sleep(capture.settleMs || 1000);
  await evaluate(cdp, sessionId, () => window.scrollTo(0, 0));

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
  const filePath = path.join(OUTPUT_DIR, capture.fileName);
  fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));

  const summary = await evaluate(cdp, sessionId, () => ({
    href: window.location.href,
    title: document.title,
    bodyText: document.body.innerText.slice(0, 320).replace(/\s+/g, ' '),
    imageCount: document.images.length,
    loadedStorageImages: Array.from(document.images).filter((img) => {
      const src = img.getAttribute('src') || '';
      return src.includes('/storage/') && img.complete && img.naturalWidth > 0;
    }).length,
    visibleLoadedStorageImages: Array.from(document.images).filter((img) => {
      const src = img.getAttribute('src') || '';
      const rect = img.getBoundingClientRect();
      return src.includes('/storage/')
        && img.complete
        && img.naturalWidth > 0
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.top < window.innerHeight;
    }).length,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));

  return {
    name: capture.name,
    route: capture.route,
    file: filePath,
    relative_file: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
    width: capture.width,
    height: capture.height,
    session: capture.session || 'admin',
    summary,
  };
}

function captureDefinitions(taskId, inspirationTotal) {
  return [
    {
      name: 'explore-gallery-success-desktop',
      route: '/explore',
      fileName: 'explore-gallery-success-desktop.png',
      width: 1440,
      height: 1000,
      waitArgs: [MIN_EXPLORE_IMAGES],
      wait: (minimumImages) => {
        const imgs = Array.from(document.querySelectorAll('main img[src*="/storage/inspirations"]'));
        const loaded = imgs.filter((img) => {
          const rect = img.getBoundingClientRect();
          return img.complete && img.naturalWidth > 0 && rect.width > 0 && rect.height > 0;
        });
        return location.pathname === '/explore' && loaded.length >= minimumImages;
      },
    },
    {
      name: 'explore-gallery-success-mobile',
      route: '/explore',
      fileName: 'explore-gallery-success-mobile.png',
      width: 390,
      height: 844,
      waitArgs: [2],
      wait: (minimumImages) => {
        const imgs = Array.from(document.querySelectorAll('main img[src*="/storage/inspirations"]'));
        const loaded = imgs.filter((img) => {
          const rect = img.getBoundingClientRect();
          return img.complete && img.naturalWidth > 0 && rect.width > 0 && rect.height > 0;
        });
        const visibleLoaded = loaded.filter((img) => {
          const rect = img.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight;
        });
        return location.pathname === '/explore'
          && loaded.length >= minimumImages
          && visibleLoaded.length >= 1
          && document.documentElement.scrollWidth <= window.innerWidth + 1;
      },
    },
    {
      name: 'workspace-success-result-desktop',
      route: `/workspace/${encodeURIComponent(taskId)}`,
      fileName: 'workspace-success-result-desktop.png',
      width: 1440,
      height: 1100,
      waitArgs: [],
      wait: () => {
        const text = document.body.innerText;
        const imgs = Array.from(document.querySelectorAll('main img[src*="/storage/images"]'));
        const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0);
        return location.pathname.startsWith('/workspace/')
          && /已完成|生成结果|结果已生成|Generated assets are ready/.test(text)
          && loaded.length >= 1;
      },
    },
    {
      name: 'workspace-success-result-mobile',
      route: `/workspace/${encodeURIComponent(taskId)}`,
      fileName: 'workspace-success-result-mobile.png',
      width: 390,
      height: 844,
      waitArgs: [],
      wait: () => {
        const text = document.body.innerText;
        const imgs = Array.from(document.querySelectorAll('main img[src*="/storage/images"]'));
        const loaded = imgs.filter((img) => img.complete && img.naturalWidth > 0);
        return location.pathname.startsWith('/workspace/')
          && /已完成|生成结果|结果已生成|Generated assets are ready/.test(text)
          && loaded.length >= 1
          && document.documentElement.scrollWidth <= window.innerWidth + 1;
      },
    },
    {
      name: 'config-admin-desktop',
      route: '/config',
      fileName: 'config-admin-desktop.png',
      width: 1440,
      height: 1200,
      waitArgs: [inspirationTotal],
      wait: (total) => {
        const text = document.body.innerText;
        const totalLoaded = Number(total) > 0 ? text.includes(String(total)) : /已同步|cases synced/.test(text);
        return location.pathname === '/config'
          && /账号会话|AetherGenix Account Session/.test(text)
          && /SUB2API 管理员 ADMIN API KEY|Sub2API Admin API Key/i.test(text)
          && totalLoaded;
      },
    },
    {
      name: 'config-non-admin-redirect-mobile',
      route: '/config',
      fileName: 'config-non-admin-redirect-mobile.png',
      width: 390,
      height: 844,
      session: 'user',
      waitArgs: [],
      wait: () => {
        const text = document.body.innerText;
        const forbidden = /Sub2API|Admin API Key|管理员 JWT|管理员 Admin API Key|备用访问密钥|测试连接/i;
        return location.pathname === '/account'
          && /我的|账户|Account/.test(text)
          && !forbidden.test(text)
          && document.documentElement.scrollWidth <= window.innerWidth + 1;
      },
    },
  ];
}

async function cleanup() {
  for (const child of Array.from(startedProcesses)) {
    try {
      child.kill();
    } catch {
      // Process may already be gone.
    }
  }
  await sleep(250);
  try {
    fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  } catch {
    // Windows can keep profile files locked briefly; leave screenshots intact.
  }
}

process.once('SIGINT', () => {
  cleanup().finally(() => process.exit(130));
});
process.once('SIGTERM', () => {
  cleanup().finally(() => process.exit(143));
});

async function main() {
  ensureDir(OUTPUT_DIR);

  const backend = await startBackendIfNeeded();
  const frontend = await startViteIfNeeded();
  const adminSession = await createLocalAdminSession();
  const cookie = `${ADMIN_SESSION_COOKIE}=${adminSession.session_id}`;

  const [siteSettings, inspirationStats, session, task] = await Promise.all([
    fetchJson(`${BASE_URL}/api/site-settings`, { headers: { Cookie: cookie } }),
    fetchJson(`${BASE_URL}/api/inspirations/stats`, { headers: { Cookie: cookie } }),
    fetchJson(`${BASE_URL}/api/auth/session`, { headers: { Cookie: cookie } }),
    fetchJson(`${BASE_URL}/api/tasks/${encodeURIComponent(adminSession.task_id)}`, { headers: { Cookie: cookie } }),
  ]);

  if (!session.authenticated || session.user?.role !== 'admin') {
    throw new Error(`Local admin session did not hydrate as admin: ${JSON.stringify(session)}`);
  }
  if (task.status !== 'succeeded' || !Array.isArray(task.items) || task.items.length === 0) {
    throw new Error(`Target task is not a succeeded task with items: ${JSON.stringify({ id: task.id, status: task.status, itemCount: task.items?.length || 0 })}`);
  }

  const { browser, wsUrl } = await startBrowser();
  const cdp = new CdpConnection(wsUrl);
  await cdp.ready;

  let browserClosed = false;
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        try {
          localStorage.setItem('aethergenix_locale', ${JSON.stringify(LOCALE)});
          localStorage.setItem('aethergenix_announcement_seen_at', ${JSON.stringify(siteSettings?.announcement?.updated_at || '')});
        } catch {}
      `,
    }, sessionId);
    await cdp.send('Network.setCookie', {
      name: ADMIN_SESSION_COOKIE,
      value: adminSession.session_id,
      url: BASE_URL,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }, sessionId);

    const captures = [];
    const sessionValues = {
      adminSessionId: adminSession.session_id,
      userSessionId: adminSession.user_session_id,
    };
    for (const capture of captureDefinitions(adminSession.task_id, inspirationStats.total)) {
      captures.push(await captureRoute(cdp, sessionId, capture, sessionValues));
    }

    const manifest = {
      captured_at: new Date().toISOString(),
      base_url: BASE_URL,
      backend_url: BACKEND_URL,
      backend_started_by_script: backend.started,
      frontend_started_by_script: frontend.started,
      backend: 'FastAPI via Vite proxy /api and /storage',
      session_cookie_name: ADMIN_SESSION_COOKIE,
      admin_session_source: adminSession.source,
      admin_owner_id: adminSession.owner_id,
      non_admin_session_available: Boolean(adminSession.user_session_id),
      task_id: adminSession.task_id,
      inspiration_total: inspirationStats.total,
      captures,
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log(JSON.stringify(manifest, null, 2));

    await cdp.send('Browser.close').catch(() => undefined);
    browserClosed = true;
  } finally {
    cdp.close();
    if (!browserClosed && !browser.killed) {
      browser.kill();
    }
    await cleanup();
  }
}

main().catch(async (error) => {
  await cleanup();
  console.error(error.stack || error.message);
  process.exit(1);
});
