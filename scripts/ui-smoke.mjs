#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const TMP_ROOT = path.join(ROOT_DIR, '.tmp', 'ui-smoke');
const ISSUE_SCREENSHOT_DIR = path.join(ROOT_DIR, '.tmp', 'issue-49');
const TEMP_DIR = path.join(TMP_ROOT, 'temp');
const NPM_CACHE_DIR = path.join(TMP_ROOT, 'npm-cache');
const PROFILE_DIR = path.join(TMP_ROOT, `browser-profile-${process.pid}`);
const CHECK_TIMEOUT_MS = 45_000;
const LOAD_TIMEOUT_MS = 30_000;
const CDP_COMMAND_TIMEOUT_MS = 60_000;
const SMOKE_TIMEOUT_MS = Number(process.env.UI_SMOKE_TIMEOUT_MS || 240_000);
const UNHANDLED_API_STORAGE_KEY = 'aethergenix_smoke_unhandled_api';
const API_CALL_STORAGE_KEY = 'aethergenix_smoke_api_calls';
const LONG_ERROR =
  'AetherGenix smoke long error: ' +
  'this deliberately verbose upstream failure message should wrap inside the mobile viewport instead of creating horizontal overflow. '.repeat(8);

const failures = [];
const processes = new Set();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWindowsAbsoluteOnC(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === 'win32' && /^c:\\/i.test(resolved);
}

function smokeEnv() {
  ensureDir(TEMP_DIR);
  ensureDir(NPM_CACHE_DIR);
  return {
    ...process.env,
    TEMP: TEMP_DIR,
    TMP: TEMP_DIR,
    npm_config_cache: NPM_CACHE_DIR,
    VITE_API_BASE_URL: '',
  };
}

function assertNodeRuntime() {
  const major = Number(process.versions.node.split('.')[0]);
  if (!Number.isFinite(major) || major < 22) {
    throw new Error(`Node.js 22 or newer is required for npm run smoke:ui. Current runtime: ${process.version}`);
  }
}

async function getAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 200; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error(`Could not find an available port near ${startPort}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.json();
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

async function startVite(port) {
  const viteBin = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    throw new Error('Vite is not installed. Run npm ci before npm run smoke:ui.');
  }

  const logs = createLogBuffer();
  const vite = spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: ROOT_DIR,
      env: smokeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  processes.add(vite);
  vite.stdout.on('data', (chunk) => logs.push(chunk));
  vite.stderr.on('data', (chunk) => logs.push(chunk));
  vite.once('exit', (code, signal) => {
    processes.delete(vite);
    if (code !== 0 && signal !== 'SIGTERM') {
      failures.push(`Vite exited early (${signal || code}).\n${logs.tail()}`);
    }
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForHttp(baseUrl, CHECK_TIMEOUT_MS, 'Vite dev server');
  } catch (error) {
    throw new Error(`${error.message}\n${logs.tail()}`);
  }
  return { baseUrl, process: vite };
}

function executableExists(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath) && fs.statSync(filePath).isFile();
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
        if (executableExists(candidate)) return candidate;
      }
    }
  }
  return null;
}

function findBrowserExecutable() {
  const envCandidates = [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    process.env.BROWSER_PATH,
  ];

  const windowsCandidates = process.platform === 'win32'
    ? [
        path.join('D:', 'AppDataMigration', 'Local', 'ms-playwright', 'chromium-1219', 'chrome-win64', 'chrome.exe'),
        path.join('D:', 'AppDataMigration', 'Local', 'ms-playwright', 'chromium-1224', 'chrome-win64', 'chrome.exe'),
        path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ]
    : [];

  const macCandidates = process.platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ]
    : [];

  const linuxCandidates = process.platform === 'linux'
    ? [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
        '/opt/google/chrome/chrome',
      ]
    : [];

  for (const candidate of [...envCandidates, ...windowsCandidates, ...macCandidates, ...linuxCandidates]) {
    if (candidate && executableExists(candidate)) return candidate;
  }

  return findOnPath([
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'chrome',
    'msedge',
    'microsoft-edge',
  ]);
}

async function startBrowser(debugPort) {
  const executable = findBrowserExecutable();
  if (!executable) {
    throw new Error(
      'Could not find Chrome, Chromium, or Edge. Set CHROME_PATH/CHROME_BIN to a browser executable and rerun npm run smoke:ui.',
    );
  }

  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  ensureDir(PROFILE_DIR);

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

  const logs = createLogBuffer();
  const browser = spawn(executable, args, {
    cwd: ROOT_DIR,
    env: smokeEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  processes.add(browser);
  browser.stdout.on('data', (chunk) => logs.push(chunk));
  browser.stderr.on('data', (chunk) => logs.push(chunk));
  browser.once('exit', () => processes.delete(browser));

  const versionUrl = `http://127.0.0.1:${debugPort}/json/version`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < CHECK_TIMEOUT_MS) {
    if (browser.exitCode !== null) {
      throw new Error(`Browser exited before CDP became available.\n${logs.tail()}`);
    }
    try {
      const version = await fetchJson(versionUrl);
      if (version.webSocketDebuggerUrl) {
        return { browser, executable, webSocketDebuggerUrl: version.webSocketDebuggerUrl };
      }
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`Timed out waiting for browser CDP.\n${logs.tail()}`);
}

async function decodeWebSocketData(data) {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  if (data && typeof data.arrayBuffer === 'function') {
    return Buffer.from(await data.arrayBuffer()).toString('utf8');
  }
  return String(data);
}

class CdpConnection {
  constructor(wsUrl) {
    if (typeof WebSocket !== 'function') {
      throw new Error('Node.js WebSocket support is required. Use Node 22 or newer.');
    }
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', (event) => reject(new Error(`CDP websocket error: ${event.message || 'unknown'}`)), {
        once: true,
      });
    });
    this.ws.addEventListener('message', (event) => {
      decodeWebSocketData(event.data)
        .then((text) => this.handleMessage(text))
        .catch((error) => {
          for (const { reject } of this.pending.values()) reject(error);
          this.pending.clear();
        });
    });
    this.ws.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('CDP websocket closed'));
      this.pending.clear();
    });
  }

  handleMessage(text) {
    const message = JSON.parse(text);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ''}`));
      } else {
        resolve(message.result || {});
      }
      return;
    }
    const listeners = this.listeners.get(message.method);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      listener(message);
    }
  }

  send(method, params = {}, sessionId = undefined, timeoutMs = CDP_COMMAND_TIMEOUT_MS) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for CDP command ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (error) {
      const pending = this.pending.get(id);
      this.pending.delete(id);
      pending?.reject(error);
    }
    return promise;
  }

  waitForEvent(method, predicate = () => true, timeoutMs = LOAD_TIMEOUT_MS, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for CDP event ${method}`));
      }, timeoutMs);
      const listener = (message) => {
        if (sessionId && message.sessionId !== sessionId) return;
        if (!predicate(message.params || {}, message)) return;
        cleanup();
        resolve(message.params || {});
      };
      const cleanup = () => {
        clearTimeout(timer);
        const listeners = this.listeners.get(method);
        if (!listeners) return;
        listeners.delete(listener);
        if (listeners.size === 0) this.listeners.delete(method);
      };
      if (!this.listeners.has(method)) this.listeners.set(method, new Set());
      this.listeners.get(method).add(listener);
    });
  }

  close() {
    this.ws.close();
  }
}

function buildMockScript() {
  const imageOne = makeDataImage('#E3FF74', '#1a1917', 'Smoke A');
  const imageTwo = makeDataImage('#FE6E00', '#111110', 'Smoke B');
  return `
(() => {
  window.__aethergenixSmokeErrors = [];
  window.addEventListener('error', (event) => {
    window.__aethergenixSmokeErrors.push(event.message || String(event.error || 'window error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    window.__aethergenixSmokeErrors.push(reason && reason.message ? reason.message : String(reason || 'unhandled rejection'));
  });

  const imageOne = ${JSON.stringify(imageOne)};
  const imageTwo = ${JSON.stringify(imageTwo)};
  const brokenImage = '/smoke-broken-image.png';
  const longError = ${JSON.stringify(LONG_ERROR)};
  const initialSmokeParams = new URL(window.location.href).searchParams;
  const initialLocale = initialSmokeParams.get('smoke_locale') === 'zh-CN' ? 'zh-CN' : 'en-US';
  const seriesPlan = initialLocale === 'zh-CN'
    ? {
        source: '测试相册',
        style_guide: '高对比商品图册，使用统一的荧光绿强调色。',
        items: [
          {
            index: 1,
            title: '封面图',
            copy: '图册主图',
            layout_type: 'cover',
            visual_goal: '建立整组图的视觉方向',
            prompt: '第一张测试预览图'
          },
          {
            index: 2,
            title: '细节对比',
            copy: '第二张用于对比的图',
            layout_type: 'detail',
            visual_goal: '展示同组结果差异',
            prompt: '第二张测试预览图'
          }
        ]
      }
    : {
        source: 'Smoke launch album',
        style_guide: 'High-contrast catalog frames with matching lime accents and concise product storytelling.',
        items: [
          {
            index: 1,
            title: 'Hero cover',
            copy: 'Lead image for the generated collection',
            layout_type: 'cover',
            visual_goal: 'Establish the collection look',
            prompt: 'First smoke preview image'
          },
          {
            index: 2,
            title: 'Detail comparison',
            copy: 'Second image for side-by-side selection',
            layout_type: 'detail',
            visual_goal: 'Show how the set compares',
            prompt: 'Second smoke preview image'
          }
        ]
      };
  const task = {
    id: 'smoke-task',
    owner_id: 'smoke-guest',
    mode: 'generate',
    prompt: 'Smoke gate workspace fixture with two previewable images',
    model: 'smoke-model',
    size: '1024x1024',
    aspect_ratio: '1:1',
    quality: 'auto',
    status: 'succeeded',
    error: null,
    result: { series_plan: seriesPlan },
    created_at: '2026-05-18T00:00:00Z',
    updated_at: '2026-05-18T00:00:00Z',
    started_at: '2026-05-18T00:00:01Z',
    completed_at: '2026-05-18T00:00:02Z',
    items: [
      makeHistoryItem('smoke-image-1', 0, imageOne, 'First smoke preview image', { series_plan: seriesPlan }),
      makeHistoryItem('smoke-image-2', 1, imageTwo, 'Second smoke preview image')
    ]
  };
  const singleImageTask = {
    ...task,
    id: 'smoke-single-task',
    prompt: 'Smoke gate workspace fixture with one previewable image',
    result: null,
    items: [
      makeHistoryItem('smoke-single-image-1', 0, imageOne, 'Only smoke preview image')
    ]
  };
  const activeTask = {
    ...task,
    status: 'running',
    completed_at: null,
    updated_at: '2026-05-18T00:00:04Z'
  };
  const failedTask = {
    ...task,
    status: 'failed',
    error: longError,
    completed_at: '2026-05-18T00:00:05Z',
    updated_at: '2026-05-18T00:00:05Z',
    items: []
  };
  const regeneratedTask = {
    ...task,
    id: 'smoke-regenerated-task',
    prompt: 'Smoke task toast prompt',
    updated_at: '2026-05-18T00:00:06Z'
  };
  const brokenImageTask = {
    ...task,
    items: task.items.map((item, index) => ({
      ...item,
      image_url: index === 0 ? brokenImage : item.image_url
    }))
  };
  const favoriteItem = {
    id: 'smoke-favorite-1',
    source_url: 'smoke://fixture',
    source_item_id: 'smoke-favorite-1',
    section: 'Smoke',
    title: 'Smoke favorite case',
    author: 'Smoke Gate',
    prompt: 'Favorite case prompt that should render without overflowing the mobile viewport',
    image_url: imageOne,
    source_link: null,
    favorited: true,
    favorite_created_at: '2026-05-18T00:00:00Z',
    synced_at: '2026-05-18T00:00:00Z',
    created_at: '2026-05-18T00:00:00Z',
    updated_at: '2026-05-18T00:00:00Z'
  };

  function makeHistoryItem(id, batchIndex, imageUrl, prompt, taskResult = null) {
    return {
      id,
      owner_id: 'smoke-guest',
      task_id: 'smoke-task',
      batch_index: batchIndex,
      mode: 'generate',
      prompt,
      model: 'smoke-model',
      size: '1024x1024',
      aspect_ratio: '1:1',
      quality: 'auto',
      status: 'succeeded',
      image_url: imageUrl,
      image_path: null,
      input_image_url: null,
      input_image_path: null,
      revised_prompt: null,
      usage: null,
      provider_response: null,
      task_prompt: prompt,
      task_result: taskResult,
      task_request: null,
      error: null,
      published: false,
      published_inspiration_id: null,
      published_at: null,
      created_at: '2026-05-18T00:00:00Z',
      updated_at: '2026-05-18T00:00:00Z'
    };
  }

  function json(data, init = {}) {
    return Promise.resolve(new Response(JSON.stringify(data), {
      status: init.status || 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  function recordUnhandledApi(message) {
    try {
      const existing = JSON.parse(window.localStorage.getItem(${JSON.stringify(UNHANDLED_API_STORAGE_KEY)}) || '[]');
      existing.push(message);
      window.localStorage.setItem(${JSON.stringify(UNHANDLED_API_STORAGE_KEY)}, JSON.stringify(existing));
    } catch {}
    console.error(message);
  }

  function recordApiCall(call) {
    try {
      const key = ${JSON.stringify(API_CALL_STORAGE_KEY)};
      const existing = JSON.parse(window.localStorage.getItem(key) || '[]');
      existing.push(call);
      window.localStorage.setItem(key, JSON.stringify(existing));
    } catch {}
  }

  try {
    window.localStorage.setItem('aethergenix_locale', initialLocale);
    window.localStorage.setItem('aethergenix_theme', 'light');
    if (smokeAnnouncement()) {
      window.localStorage.removeItem('aethergenix_announcement_seen_at');
    }
  } catch {}

  const originalFetch = window.fetch.bind(window);
  function smokeState() {
    return new URL(window.location.href).searchParams.get('smoke_state') || '';
  }

  function smokeAuthenticated() {
    const currentParams = new URL(window.location.href).searchParams;
    return initialSmokeParams.get('smoke_auth') === '1' ||
      initialSmokeParams.get('smoke_admin') === '1' ||
      currentParams.get('smoke_auth') === '1' ||
      currentParams.get('smoke_admin') === '1';
  }

  function smokeAdmin() {
    const currentParams = new URL(window.location.href).searchParams;
    return initialSmokeParams.get('smoke_admin') === '1' || currentParams.get('smoke_admin') === '1';
  }

  function smokeAnnouncement() {
    return new URL(window.location.href).searchParams.get('smoke_announcement') === '1';
  }

  function smokeEmailVerify() {
    return new URL(window.location.href).searchParams.get('smoke_verify') === '1';
  }

  window.fetch = (input, init) => {
    const rawUrl = typeof input === 'string' ? input : input && input.url;
    const url = new URL(rawUrl || '', window.location.origin);
    if (!url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    if (url.pathname === '/api/auth/session') {
      const authenticated = smokeAuthenticated();
      const isAdmin = smokeAdmin();
      return json({
        authenticated,
        owner_id: 'smoke-guest',
        guest_id: 'smoke-guest-id',
        api_key_source: authenticated ? 'managed' : 'manual',
        user: authenticated
          ? { id: 24, email: 'smoke@example.test', username: isAdmin ? 'smoke-admin' : 'smoke-user', role: isAdmin ? 'admin' : 'user' }
          : null
      });
    }

    if (url.pathname === '/api/site-settings') {
      const authenticated = smokeAuthenticated();
      const isAdmin = smokeAdmin();
      const announcementEnabled = smokeAnnouncement();
      const settings = {
        default_locale: 'en-US',
        announcement: announcementEnabled
          ? {
              enabled: true,
              title: 'Smoke Announcement',
              body: 'This announcement verifies dialog semantics, focus containment, and 44px close controls.',
              updated_at: 'smoke-announcement-issue-45-46'
            }
          : { enabled: false, title: '', body: '', updated_at: null },
        inspiration_sources: [],
        recharge_url: 'https://accounts.aethergenix.test/recharge',
        viewer: { authenticated, is_admin: isAdmin }
      };
      if (isAdmin) {
        settings.upstream = {
          provider_base_url: 'https://sub2api.example.test/v1',
          auth_base_url: 'https://sub2api.example.test',
          effective_provider_base_url: 'https://sub2api.example.test/v1',
          effective_auth_base_url: 'https://sub2api.example.test',
          recharge_url: 'https://accounts.aethergenix.test/recharge',
          effective_recharge_url: 'https://accounts.aethergenix.test/recharge',
          sub2api_admin_token_set: true,
          sub2api_admin_token_hint: 'admin-***smoke',
          sub2api_admin_jwt_set: true,
          sub2api_admin_jwt_hint: 'eyJ***smoke',
          trial_balance_usd: 2,
          configured_trial_balance_usd: 2
        };
      }
      return json(settings);
    }

    if (url.pathname === '/api/auth/public-settings') {
      return json({
        registration_enabled: true,
        email_verify_enabled: smokeEmailVerify(),
        force_email_on_third_party_signup: false,
        promo_code_enabled: false,
        invitation_code_enabled: false,
        totp_enabled: false,
        turnstile_enabled: false,
        turnstile_site_key: '',
        backend_mode_enabled: false,
        site_name: 'AetherGenix',
        site_subtitle: ''
      });
    }

    if (url.pathname === '/api/account') {
      const authenticated = smokeAuthenticated();
      const isAdmin = smokeAdmin();
      return json({
        viewer: {
          authenticated,
          owner_id: 'smoke-guest',
          guest_id: 'smoke-guest-id',
          api_key_source: authenticated ? 'managed' : 'manual',
          user: authenticated
            ? { id: 24, email: 'smoke@example.test', username: isAdmin ? 'smoke-admin' : 'smoke-user', role: isAdmin ? 'admin' : 'user' }
            : null
        },
        user: {
          name: authenticated ? (isAdmin ? 'Smoke Admin' : 'Smoke User') : 'Smoke Guest',
          email: authenticated ? 'smoke@example.test' : null,
          username: authenticated ? (isAdmin ? 'smoke-admin' : 'smoke-user') : null,
          role: authenticated ? (isAdmin ? 'admin' : 'user') : null,
          authenticated,
          guest: !authenticated,
          api_key_set: false,
          api_key_source: authenticated ? 'managed' : 'manual',
          model: 'smoke-model'
        },
        balance: { ok: true, remaining: authenticated ? 12.3456 : 0, raw: null },
        stats: { total: task.items.length, succeeded: task.items.length, edits: 0, last_generation_at: task.completed_at }
      });
    }

    if (url.pathname === '/api/config') {
      return json({
        owner_id: 'user:24',
        model: 'gpt-image-2',
        default_size: '2K',
        default_quality: 'auto',
        user_name: 'Smoke Admin',
        managed_by_auth: true,
        api_key_set: true,
        api_key_hint: 'sk-***smoke',
        api_key_source: 'managed',
        api_key_editable: true,
        authenticated: true
      });
    }

    if (url.pathname === '/api/ledger') {
      return json({
        items: [
          {
            id: 'smoke-ledger-1',
            owner_id: 'user:24',
            event_type: 'image_generation',
            amount: -0.0123,
            currency: 'USD',
            description: 'Smoke generation usage',
            history_id: 'smoke-image-1',
            metadata: { cost_source: 'sub2api_actual_cost' },
            created_at: '2026-05-18T00:00:03Z'
          }
        ]
      });
    }

    if (url.pathname === '/api/tasks') {
      const state = smokeState();
      return json({ items: state === 'empty' ? [] : state === 'active-drawer' ? [activeTask] : [task] });
    }

    if (url.pathname === '/api/tasks/smoke-task') {
      const state = smokeState();
      if (state === 'broken-image') return json(brokenImageTask);
      if (state === 'active-workspace') return json(activeTask);
      if (state === 'failed-workspace') return json(failedTask);
      if (state === 'single-workspace') return json(singleImageTask);
      return json(task);
    }

    if (url.pathname === '/api/tasks/smoke-regenerated-task') {
      return json(regeneratedTask);
    }

    if (url.pathname === '/api/tasks/smoke-task/download.zip') {
      return Promise.resolve(new Response('smoke zip fixture', {
        status: 200,
        headers: { 'Content-Type': 'application/zip' }
      }));
    }

    if (url.pathname.startsWith('/api/tasks/')) {
      return json({ detail: 'Smoke fixture task not found' }, { status: 404 });
    }

    if (url.pathname === '/api/history') {
      const query = (url.searchParams.get('q') || '').trim();
      const items = smokeState() === 'empty' || query ? [] : task.items;
      return json({ items });
    }

    if (url.pathname === '/api/inspirations/favorites') {
      const limit = Number(url.searchParams.get('limit') || 24);
      const offset = Number(url.searchParams.get('offset') || 0);
      const query = (url.searchParams.get('q') || '').trim();
      const items = smokeState() === 'empty' || query ? [] : [favoriteItem];
      return json({ items, total: items.length, limit, offset });
    }

    if (url.pathname === '/api/inspirations/stats') {
      return json({
        total: 1,
        last_synced_at: '2026-05-18T00:00:00Z',
        sections: 1,
        section_counts: [{ section: 'Smoke', count: 1 }],
        source_url: 'https://example.test/smoke-cases',
        source_urls: ['https://example.test/smoke-cases'],
        source_counts: [{ source_url: 'https://example.test/smoke-cases', count: 1, last_synced_at: '2026-05-18T00:00:00Z' }],
        sync_interval_seconds: 3600,
        last_error: null
      });
    }

    if (url.pathname === '/api/inspirations/smoke-favorite-1/favorite' && ((init && init.method) || '').toUpperCase() === 'DELETE') {
      return json({ ok: true, item: { ...favoriteItem, favorited: false } });
    }

    const historyPublishMatch = url.pathname.match(/^\\/api\\/history\\/(smoke-image-[12])\\/publish$/);
    if (historyPublishMatch) {
      const id = historyPublishMatch[1];
      const method = ((init && init.method) || 'GET').toUpperCase();
      recordApiCall({ type: 'history-publish', id, method });
      const sourceItem = task.items.find((item) => item.id === id) || task.items[0];
      const item = {
        ...sourceItem,
        published: method !== 'DELETE',
        published_inspiration_id: method !== 'DELETE' ? 'smoke-published-case' : null,
        published_at: method !== 'DELETE' ? '2026-05-18T00:00:03Z' : null
      };
      if (method === 'POST') return json({ ok: true, item, inspiration: { ...favoriteItem, id: 'smoke-published-case' } });
      if (method === 'DELETE') return json({ ok: true, item });
    }

    const historyDeleteMatch = url.pathname.match(/^\\/api\\/history\\/(smoke-image-[12])$/);
    if (historyDeleteMatch && ((init && init.method) || '').toUpperCase() === 'DELETE') {
      return json({ ok: true });
    }

    if (url.pathname === '/api/images/generate' && ((init && init.method) || '').toUpperCase() === 'POST') {
      let body = null;
      try {
        body = init && typeof init.body === 'string' ? JSON.parse(init.body) : null;
      } catch {}
      recordApiCall({ type: 'generate', body });
      return json(regeneratedTask);
    }

    if (url.pathname === '/api/inspirations') {
      const state = smokeState() || url.searchParams.get('smoke_state');
      const limit = Number(url.searchParams.get('limit') || 48);
      const offset = Number(url.searchParams.get('offset') || 0);
      if (state === 'long-error') {
        return json({ detail: longError }, { status: 500 });
      }
      if (state === 'filled') {
        return json({ items: [favoriteItem], total: 1, limit, offset });
      }
      return json({ items: [], total: 0, limit, offset });
    }

    const method = (init && init.method) || (input && input.method) || 'GET';
    const message = 'Unhandled smoke API: ' + method + ' ' + url.pathname;
    recordUnhandledApi(message);
    return json({ detail: message }, { status: 500 });
  };
})();
`;
}

function makeDataImage(accent, background, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="${background}"/><circle cx="256" cy="224" r="132" fill="${accent}"/><text x="256" y="390" fill="${accent}" font-family="Arial, sans-serif" font-size="48" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

class SmokePage {
  constructor(connection, sessionId, baseUrl) {
    this.connection = connection;
    this.sessionId = sessionId;
    this.baseUrl = baseUrl;
    this.navigationSeq = 0;
  }

  async init() {
    await this.connection.send('Page.enable', {}, this.sessionId);
    await this.connection.send('Runtime.enable', {}, this.sessionId);
    await this.connection.send('DOM.enable', {}, this.sessionId);
    await this.connection.send('Page.addScriptToEvaluateOnNewDocument', { source: buildMockScript() }, this.sessionId);
  }

  async navigate(urlPath, options = {}) {
    const width = options.width || 1280;
    const height = options.height || 900;
    this.navigationSeq += 1;
    const url = new URL(urlPath, this.baseUrl);
    url.searchParams.set('smoke_nav', String(this.navigationSeq));
    const targetUrl = url.toString();
    const expectedPathname = options.expectedPathname || null;
    await this.connection.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: width <= 600 },
      this.sessionId,
    );
    const waitForAppContent = () => this.waitFor(
      (expectedUrl, expectedFinalPathname) => {
        const root = document.getElementById('root');
        const urlMatched = expectedFinalPathname
          ? window.location.pathname === expectedFinalPathname
          : window.location.href === expectedUrl;
        return urlMatched &&
          Boolean(document.querySelector('main')) &&
          Boolean(root?.children.length) &&
          document.body.innerText.trim().length > 0;
      },
      expectedPathname ? `app content for ${urlPath} redirected to ${expectedPathname}` : `app content for ${urlPath}`,
      options.waitTimeoutMs || LOAD_TIMEOUT_MS,
      targetUrl,
      expectedPathname,
    );

    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const navigationError = await this.connection
        .send('Page.navigate', { url: targetUrl }, this.sessionId, CDP_COMMAND_TIMEOUT_MS)
        .then(() => null)
        .catch((error) => error);
      try {
        await waitForAppContent();
        await sleep(options.settleMs || 250);
        return;
      } catch (error) {
        lastError = navigationError || error;
      }
      await this.connection.send('Page.stopLoading', {}, this.sessionId).catch(() => undefined);
      await sleep(500);
    }

    throw lastError || new Error(`Could not navigate to ${urlPath}`);
  }

  async evaluate(fn, ...args) {
    const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
    const result = await this.connection.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      this.sessionId,
    );
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(description || 'Browser evaluation failed');
    }
    return result.result?.value;
  }

  async waitFor(fn, label, timeoutMs = LOAD_TIMEOUT_MS, ...args) {
    const startedAt = Date.now();
    let lastError = null;
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const value = await this.evaluate(fn, ...args);
        if (value) return value;
      } catch (error) {
        lastError = error;
      }
      await sleep(100);
    }
    const diagnostic = await this.evaluate(() => ({
      href: window.location.href,
      readyState: document.readyState,
      title: document.title,
      bodyText: document.body?.innerText?.slice(0, 500) || '',
      rootHtml: document.getElementById('root')?.innerHTML?.slice(0, 500) || '',
      smokeErrors: window.__aethergenixSmokeErrors || [],
    })).catch((error) => ({ error: error.message }));
    throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}; diagnostic=${JSON.stringify(diagnostic)}`);
  }

  async pressKey(key, options = {}) {
    const map = {
      Tab: { code: 'Tab', keyCode: 9 },
      Escape: { code: 'Escape', keyCode: 27 },
      Enter: { code: 'Enter', keyCode: 13 },
      ' ': { code: 'Space', keyCode: 32 },
    };
    const entry = map[key];
    if (!entry) throw new Error(`Unsupported key ${key}`);
    const modifiers = options.shift ? 8 : 0;
    const keyDownType = key === 'Tab' ? 'keyDown' : 'rawKeyDown';
    await this.connection.send(
      'Input.dispatchKeyEvent',
      {
        type: keyDownType,
        key,
        code: entry.code,
        windowsVirtualKeyCode: entry.keyCode,
        nativeVirtualKeyCode: entry.keyCode,
        modifiers,
      },
      this.sessionId,
    );
    await this.connection.send(
      'Input.dispatchKeyEvent',
      {
        type: 'keyUp',
        key,
        code: entry.code,
        windowsVirtualKeyCode: entry.keyCode,
        nativeVirtualKeyCode: entry.keyCode,
        modifiers,
      },
      this.sessionId,
    );
    await sleep(60);
  }

  async insertText(text) {
    await this.connection.send('Input.insertText', { text }, this.sessionId);
    await sleep(60);
  }

  async screenshot(filePath) {
    ensureDir(path.dirname(filePath));
    const result = await this.connection.send(
      'Page.captureScreenshot',
      { format: 'png', fromSurface: true },
      this.sessionId,
    );
    fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
  }
}

async function createSmokePage(connection, baseUrl) {
  await withTimeout(connection.ready, CHECK_TIMEOUT_MS, 'CDP websocket connect');
  const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
  const page = new SmokePage(connection, sessionId, baseUrl);
  await page.init();
  return page;
}

function domSnapshotHelpers() {
  return {
    text: `
      function isVisible(element) {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (element.closest('[aria-hidden="true"]')) return false;
        const rects = element.getClientRects();
        return rects.length > 0 && Array.from(rects).some((rect) => rect.width > 0 && rect.height > 0);
      }

      function normalize(text) {
        return (text || '').replace(/\\s+/g, ' ').trim();
      }

      function accessibleName(element) {
        const ariaLabel = normalize(element.getAttribute('aria-label'));
        if (ariaLabel) return ariaLabel;
        const labelledBy = normalize(element.getAttribute('aria-labelledby'));
        if (labelledBy) {
          const labelled = labelledBy
            .split(/\\s+/)
            .map((id) => document.getElementById(id))
            .filter(Boolean)
            .map((node) => normalize(node.innerText || node.textContent))
            .filter(Boolean)
            .join(' ');
          if (labelled) return labelled;
        }
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          const labels = element.labels ? Array.from(element.labels).map((label) => normalize(label.innerText || label.textContent)).filter(Boolean) : [];
          if (labels.length) return labels.join(' ');
          if (element.id) {
            const label = document.querySelector('label[for="' + CSS.escape(element.id) + '"]');
            const labelText = normalize(label?.innerText || label?.textContent);
            if (labelText) return labelText;
          }
        }
        if (element instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(element.type)) {
          const value = normalize(element.value);
          if (value) return value;
        }
        const text = normalize(element.innerText || element.textContent);
        if (text) return text;
        const imgAlt = Array.from(element.querySelectorAll('img[alt]'))
          .map((img) => normalize(img.getAttribute('alt')))
          .find(Boolean);
        if (imgAlt) return imgAlt;
        const svgTitle = Array.from(element.querySelectorAll('svg title'))
          .map((title) => normalize(title.textContent))
          .find(Boolean);
        if (svgTitle) return svgTitle;
        const title = normalize(element.getAttribute('title'));
        if (title) return title;
        return '';
      }

      function describeElement(element) {
        const rect = element.getBoundingClientRect();
        const parts = [element.tagName.toLowerCase()];
        if (element.id) parts.push('#' + element.id);
        const className = normalize(element.className && String(element.className)).split(' ').filter(Boolean).slice(0, 4).join('.');
        if (className) parts.push('.' + className);
        return parts.join('') + ' at ' + Math.round(rect.left) + ',' + Math.round(rect.top);
      }

      function focusableElements(container = document) {
        return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
          .filter((element) => isVisible(element) && !element.closest('[inert]'));
      }

      function inputHasLabel(input) {
        if (normalize(input.getAttribute('aria-label'))) return true;
        if (normalize(input.getAttribute('aria-labelledby'))) return true;
        if (input.id && document.querySelector('label[for="' + CSS.escape(input.id) + '"]')) return true;
        return Boolean(input.closest('label'));
      }
    `,
  };
}

async function assertNoUnnamedButtons(page, context) {
  const result = await page.evaluate((helpersText) => {
    eval(helpersText);
    return Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((element) => isVisible(element))
      .map((element) => ({ name: accessibleName(element), element: describeElement(element) }))
      .filter((item) => !item.name)
      .map((item) => item.element);
  }, domSnapshotHelpers().text);
  if (result.length > 0) {
    throw new Error(`${context} has unnamed buttons: ${result.join('; ')}`);
  }
}

async function assertNoUnnamedMainActionControls(page, context) {
  const result = await page.evaluate((helpersText) => {
    eval(helpersText);
    const scope = document.querySelector('main') || document;
    return Array.from(scope.querySelectorAll('button, [role="button"], a[href]'))
      .filter((element) => isVisible(element))
      .map((element) => ({ name: accessibleName(element), element: describeElement(element) }))
      .filter((item) => !item.name)
      .map((item) => item.element);
  }, domSnapshotHelpers().text);
  if (result.length > 0) {
    throw new Error(`${context} has unnamed main action controls: ${result.join('; ')}`);
  }
}

async function assertRouteActionsAndMobile(page, context) {
  await assertNoUnnamedButtons(page, context);
  await assertNoUnnamedMainActionControls(page, context);
  await assertNoHorizontalOverflow(page, `${context} mobile`);
}

async function submitMainSearch(page, query, _buttonNamePattern, context) {
  const inputResult = await page.evaluate((helpersText) => {
    eval(helpersText);
    const scope = document.querySelector('main') || document;
    const searchInput = Array.from(scope.querySelectorAll('input[type="text"], input[type="search"], input:not([type])'))
      .filter((element) => isVisible(element))
      .find((element) => /search/i.test(accessibleName(element)) || /search/i.test(element.getAttribute('placeholder') || ''));
    if (!searchInput) return { ok: false, reason: 'search input not found' };
    searchInput.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(searchInput, '');
    } else {
      searchInput.value = '';
    }
    return { ok: true };
  }, domSnapshotHelpers().text);
  if (!inputResult.ok) throw new Error(`${context}: ${inputResult.reason}`);
  await page.insertText(query);
  await sleep(120);
  await page.pressKey('Enter');
  await sleep(900);
}

async function clickMainControl(page, namePattern, context) {
  const result = await page.evaluate((helpersText, pattern) => {
    eval(helpersText);
    const matcher = new RegExp(pattern, 'i');
    const scopes = [document.querySelector('main'), document].filter(Boolean);
    let control = null;
    for (const scope of scopes) {
      control = Array.from(scope.querySelectorAll('button, [role="button"], a[href]'))
        .filter((element) => isVisible(element))
        .map((element) => ({ element, name: accessibleName(element) }))
        .find((item) => matcher.test(item.name));
      if (control) break;
    }
    if (!control) {
      const names = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
        .filter((element) => isVisible(element))
        .map((element) => accessibleName(element))
        .filter(Boolean)
        .slice(0, 12);
      return { ok: false, names };
    }
    control.element.click();
    return { ok: true, name: control.name };
  }, domSnapshotHelpers().text, namePattern);
  if (!result.ok) {
    throw new Error(`${context}: control matching /${namePattern}/ not found; visible controls=${(result.names || []).join(', ')}`);
  }
  return result.name;
}

async function assertNoHorizontalOverflow(page, context) {
  const result = await page.evaluate((helpersText) => {
    eval(helpersText);
    const scrollingElement = document.scrollingElement || document.documentElement;
    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
    const scrollWidth = Math.max(scrollingElement.scrollWidth, document.body.scrollWidth, document.documentElement.scrollWidth);
    const offenders = Array.from(document.body.querySelectorAll('*'))
      .filter((element) => isVisible(element))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > viewportWidth + 1 || rect.left < -1)
      .map(({ element, rect }) => `${describeElement(element)} right=${Math.round(rect.right)} left=${Math.round(rect.left)}`)
      .slice(0, 6);
    return { ok: scrollWidth <= viewportWidth + 1, viewportWidth, scrollWidth, offenders };
  }, domSnapshotHelpers().text);
  if (!result.ok) {
    throw new Error(`${context} has horizontal overflow: viewport=${result.viewportWidth}, scrollWidth=${result.scrollWidth}, offenders=${result.offenders.join('; ')}`);
  }
}

async function assertDialogSemantics(page, context, options = {}) {
  const result = await page.evaluate((helpersText, checkInputs) => {
    eval(helpersText);
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { ok: false, errors: ['missing role=dialog'] };
    const errors = [];
    if (dialog.getAttribute('aria-modal') !== 'true') errors.push('missing aria-modal=true');
    const labelledBy = normalize(dialog.getAttribute('aria-labelledby'));
    if (!labelledBy) {
      errors.push('missing aria-labelledby');
    } else {
      const title = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((node) => normalize(node.textContent || node.innerText))
        .join(' ');
      if (!title) errors.push('aria-labelledby does not resolve to a title');
    }

    const unnamedButtons = Array.from(dialog.querySelectorAll('button, [role="button"]'))
      .filter((element) => isVisible(element))
      .filter((element) => !accessibleName(element))
      .map(describeElement);
    if (unnamedButtons.length) errors.push(`unnamed dialog buttons: ${unnamedButtons.join('; ')}`);

    const closeButton = Array.from(dialog.querySelectorAll('button'))
      .filter((element) => isVisible(element))
      .find((element) => /close|关闭/i.test(accessibleName(element)));
    if (!closeButton) errors.push('missing named close button');

    if (checkInputs) {
      const unlabeledInputs = Array.from(dialog.querySelectorAll('input, textarea, select'))
        .filter((input) => isVisible(input))
        .filter((input) => !inputHasLabel(input))
        .map(describeElement);
      if (unlabeledInputs.length) errors.push(`unlabeled inputs: ${unlabeledInputs.join('; ')}`);
    }

    return { ok: errors.length === 0, errors };
  }, domSnapshotHelpers().text, Boolean(options.checkInputs));
  if (!result.ok) {
    throw new Error(`${context} dialog semantics failed: ${result.errors.join('; ')}`);
  }
}

async function assertNamedControlsMinTarget(page, context, patterns, minimum = 44) {
  const result = await page.evaluate((helpersText, rawPatterns, minSize) => {
    eval(helpersText);
    const controls = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
      .filter((element) => isVisible(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name: accessibleName(element),
          width: rect.width,
          height: rect.height,
          description: describeElement(element),
        };
      });
    const errors = [];
    for (const rawPattern of rawPatterns) {
      const pattern = new RegExp(rawPattern, 'i');
      const matches = controls.filter((control) => pattern.test(control.name));
      if (!matches.length) {
        errors.push(`missing control matching /${rawPattern}/`);
        continue;
      }
      for (const control of matches) {
        if (control.width + 0.5 < minSize || control.height + 0.5 < minSize) {
          errors.push(`${control.name || control.description} is ${Math.round(control.width)}x${Math.round(control.height)}`);
        }
      }
    }
    return { ok: errors.length === 0, errors, controls };
  }, domSnapshotHelpers().text, patterns, minimum);
  if (!result.ok) {
    throw new Error(`${context} has controls below ${minimum}px: ${result.errors.join('; ')}`);
  }
}

async function assertFormControlsMinTarget(page, context, patterns, minimum = 44) {
  const result = await page.evaluate((helpersText, rawPatterns, minSize) => {
    eval(helpersText);
    const controls = Array.from(document.querySelectorAll('input, textarea, select'))
      .filter((element) => isVisible(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name: accessibleName(element) || normalize(element.getAttribute('placeholder')),
          width: rect.width,
          height: rect.height,
          description: describeElement(element),
        };
      });
    const errors = [];
    for (const rawPattern of rawPatterns) {
      const pattern = new RegExp(rawPattern, 'i');
      const matches = controls.filter((control) => pattern.test(control.name));
      if (!matches.length) {
        errors.push(`missing form control matching /${rawPattern}/`);
        continue;
      }
      for (const control of matches) {
        if (control.width + 0.5 < minSize || control.height + 0.5 < minSize) {
          errors.push(`${control.name || control.description} is ${Math.round(control.width)}x${Math.round(control.height)}`);
        }
      }
    }
    return { ok: errors.length === 0, errors, controls };
  }, domSnapshotHelpers().text, patterns, minimum);
  if (!result.ok) {
    throw new Error(`${context} has form controls below ${minimum}px: ${result.errors.join('; ')}`);
  }
}

async function assertNoNamedControls(page, context, patterns) {
  const result = await page.evaluate((helpersText, rawPatterns) => {
    eval(helpersText);
    const controls = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
      .filter((element) => isVisible(element))
      .map((element) => ({ name: accessibleName(element), description: describeElement(element) }));
    const errors = [];
    for (const rawPattern of rawPatterns) {
      const pattern = new RegExp(rawPattern, 'i');
      const matches = controls.filter((control) => pattern.test(control.name));
      if (matches.length) {
        errors.push(`unexpected control matching /${rawPattern}/: ${matches.map((control) => control.name || control.description).join(', ')}`);
      }
    }
    return { ok: errors.length === 0, errors };
  }, domSnapshotHelpers().text, patterns);
  if (!result.ok) {
    throw new Error(`${context} has duplicate or forbidden controls: ${result.errors.join('; ')}`);
  }
}

async function assertExploreEntryIsBrandOnly(page, context) {
  const result = await page.evaluate((helpersText) => {
    eval(helpersText);
    const exploreLinks = Array.from(document.querySelectorAll('a[href]'))
      .filter((element) => isVisible(element))
      .map((element) => {
        const href = element.getAttribute('href') || '';
        const pathname = new URL(href, window.location.origin).pathname;
        const rect = element.getBoundingClientRect();
        return {
          name: accessibleName(element),
          href,
          pathname,
          title: normalize(element.getAttribute('title')),
          testId: element.getAttribute('data-testid') || '',
          width: rect.width,
          height: rect.height,
          description: describeElement(element),
        };
      })
      .filter((link) => link.pathname === '/explore');
    const brandLinks = exploreLinks.filter((link) => link.testId === 'brand-home-link');
    const nonBrandLinks = exploreLinks.filter((link) => link.testId !== 'brand-home-link');
    const brand = brandLinks[0];
    const labelPattern = /^(Inspiration homepage|灵感探索)$/i;
    const errors = [];
    if (brandLinks.length !== 1) {
      errors.push(`expected one visible brand /explore link, found ${brandLinks.length}`);
    }
    if (nonBrandLinks.length) {
      errors.push(`unexpected visible non-brand /explore links: ${nonBrandLinks.map((link) => `${link.name || link.description} <${link.href}>`).join('; ')}`);
    }
    if (brand && (!labelPattern.test(brand.name) || !labelPattern.test(brand.title))) {
      errors.push(`brand /explore link is named "${brand.name}" with title "${brand.title}"`);
    }
    if (brand && (brand.width + 0.5 < 44 || brand.height + 0.5 < 44)) {
      errors.push(`brand /explore target is ${Math.round(brand.width)}x${Math.round(brand.height)}`);
    }
    return { ok: errors.length === 0, errors };
  }, domSnapshotHelpers().text);
  if (!result.ok) {
    throw new Error(`${context} should expose /explore only through the brand entry: ${result.errors.join('; ')}`);
  }
}

async function assertFocusContained(page, context) {
  await page.waitFor(() => {
    const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
    return Boolean(dialog && dialog.contains(document.activeElement));
  }, `${context} initial focus inside dialog`);

  for (let index = 0; index < 14; index += 1) {
    await page.pressKey('Tab');
    const inside = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
      return Boolean(dialog && dialog.contains(document.activeElement));
    });
    if (!inside) throw new Error(`${context} focus escaped after Tab ${index + 1}`);
  }

  for (let index = 0; index < 4; index += 1) {
    await page.pressKey('Tab', { shift: true });
    const inside = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
      return Boolean(dialog && dialog.contains(document.activeElement));
    });
    if (!inside) throw new Error(`${context} focus escaped after Shift+Tab ${index + 1}`);
  }
}

async function assertEscClosesDialog(page, context) {
  await page.pressKey('Escape');
  await page.waitFor(() => !document.querySelector('[role="dialog"]'), `${context} closes on Escape`);
}

async function assertNoUnhandledSmokeApi(page) {
  const unhandled = await page.evaluate((storageKey) => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    } catch {
      return ['Could not parse smoke API storage'];
    }
  }, UNHANDLED_API_STORAGE_KEY);
  if (unhandled.length > 0) {
    throw new Error(unhandled.join('; '));
  }
}

const ORDINARY_ACCOUNT_FORBIDDEN_TERMS = [
  { label: 'Sub2API', pattern: '\\bSub2API\\b' },
  { label: 'API Key', pattern: '\\bAPI\\s*Key\\b' },
  { label: 'backup access key', pattern: '\\bbackup\\s+access\\s+key\\b' },
  { label: 'provider URL', pattern: '\\bprovider\\s+(base\\s+)?url\\b' },
  { label: 'provider_base_url', pattern: '\\bprovider_base_url\\b' },
  { label: 'auth URL', pattern: '\\bauth\\s+(base\\s+)?url\\b' },
  { label: 'auth_base_url', pattern: '\\bauth_base_url\\b' },
  { label: '/v1/usage', pattern: '/v1/usage' },
  { label: 'billing', pattern: '\\bbilling\\b' },
  { label: 'order', pattern: '\\border\\b' },
  { label: 'payment', pattern: '\\bpayment\\b' },
  { label: 'finance', pattern: '\\bfinance\\b' },
  { label: 'Admin Token', pattern: '\\bAdmin\\s+Token\\b' },
  { label: 'JWT', pattern: '\\bJWT\\b' },
];

async function assertNoOrdinaryAccountForbiddenTerms(page, context) {
  const result = await page.evaluate((terms) => {
    const text = document.body.innerText || '';
    return terms
      .filter(({ pattern }) => new RegExp(pattern, 'i').test(text))
      .map(({ label }) => label);
  }, ORDINARY_ACCOUNT_FORBIDDEN_TERMS);
  if (result.length > 0) {
    throw new Error(`${context} exposes forbidden ordinary-user terms: ${result.join(', ')}`);
  }
}

async function assertOrdinaryAccountSurface(page, context) {
  await page.waitFor(
    () => /Available Credits|可用余额/.test(document.body.innerText) &&
      /Current Balance|当前余额/.test(document.body.innerText) &&
      /12\.3456/.test(document.body.innerText),
    `${context} account balance surface`,
  );
  await assertNoUnnamedButtons(page, context);
  await assertNoHorizontalOverflow(page, `${context} mobile`);
  await assertNoOrdinaryAccountForbiddenTerms(page, context);

  const result = await page.evaluate((helpersText) => {
    eval(helpersText);
    const scope = document.querySelector('main') || document;
    const text = scope.innerText || '';
    const links = Array.from(scope.querySelectorAll('a[href]'))
      .filter((element) => isVisible(element))
      .map((element) => ({
        name: accessibleName(element),
        href: element.href,
        target: element.getAttribute('target') || '',
      }));
    const rechargeLinks = links.filter((link) => /^(Open Recharge Page|打开充值页面)$/.test(link.name));
    const sameOriginManagementLinks = links.filter((link) => {
      try {
        const parsed = new URL(link.href);
        return parsed.origin === window.location.origin && /^\/(billing|recharge|config)\/?$/.test(parsed.pathname);
      } catch {
        return false;
      }
    });
    return {
      ok:
        window.location.pathname === '/account' &&
        /AetherGenix/.test(text) &&
        /Available Credits|可用余额/.test(text) &&
        /Current Balance|当前余额/.test(text) &&
        /Signed in to AetherGenix|已登录 AetherGenix/.test(text) &&
        /12\.3456/.test(text) &&
        rechargeLinks.length === 1 &&
        rechargeLinks[0].href === 'https://accounts.aethergenix.test/recharge' &&
        rechargeLinks[0].target === '_blank' &&
        sameOriginManagementLinks.length === 0,
      pathname: window.location.pathname,
      text: text.slice(0, 700),
      links,
      sameOriginManagementLinks,
    };
  }, domSnapshotHelpers().text);
  if (!result.ok) {
    throw new Error(`${context} account handoff surface mismatch: ${JSON.stringify(result)}`);
  }
}

async function assertAdminConfigSurface(page, context) {
  await page.waitFor(
    () => /Sub2API Integration/i.test(document.body.innerText) &&
      /Sub2API Admin API Key/i.test(document.body.innerText) &&
      /Sub2API Admin JWT/i.test(document.body.innerText),
    `${context} admin settings surface`,
  );
  const result = await page.evaluate(() => {
    const text = document.body.innerText || '';
    return {
      ok:
        window.location.pathname === '/config' &&
        /Sub2API Integration/i.test(text) &&
        /Sub2API Admin API Key/i.test(text) &&
        /Sub2API Admin JWT/i.test(text) &&
        /Sub2API \/v1 proxy URL/i.test(text) &&
        /Sub2API auth management URL/i.test(text) &&
        /Test Link/i.test(text),
      pathname: window.location.pathname,
      text: text.slice(0, 900),
    };
  });
  if (!result.ok) {
    throw new Error(`${context} admin config surface mismatch: ${JSON.stringify(result)}`);
  }
}

async function runCheck(name, fn) {
  process.stdout.write(`- ${name} ... `);
  try {
    await fn();
    console.log('ok');
  } catch (error) {
    console.log('FAIL');
    failures.push(`${name}: ${error.message}`);
  }
}

async function runSmokeChecks(page, baseUrl) {
  console.log('UI smoke checks: account-center routes, non-account routes, unnamed buttons, dialog a11y, Esc, Tab focus containment, keyboard access, mobile overflow, dark-first.');

  await runCheck('dark-first keeps .dark despite old light localStorage and no visible theme toggle', async () => {
    const html = await fetch(baseUrl).then((response) => response.text());
    if (!/<html[^>]*class=["'][^"']*\bdark\b/i.test(html)) {
      throw new Error('initial HTML does not include class="dark" on <html>');
    }
    await page.navigate('/explore?smoke_state=empty', { width: 1280, height: 900, waitTimeoutMs: LOAD_TIMEOUT_MS * 3 });
    const result = await page.evaluate((helpersText) => {
      eval(helpersText);
      const themeToggleNames = Array.from(document.querySelectorAll('button, [role="button"]'))
        .filter((element) => isVisible(element))
        .map((element) => accessibleName(element))
        .filter((name) => /theme|light|dark|主题|浅色|深色/i.test(name));
      return {
        hasDark: document.documentElement.classList.contains('dark'),
        storedTheme: window.localStorage.getItem('aethergenix_theme'),
        themeToggleNames,
      };
    }, domSnapshotHelpers().text);
    if (!result.hasDark) throw new Error('documentElement is missing .dark after app boot');
    if (result.storedTheme !== 'light') throw new Error('old light localStorage fixture was not installed');
    if (result.themeToggleNames.length) throw new Error(`visible theme toggle buttons found: ${result.themeToggleNames.join(', ')}`);
  });

  await runCheck('/account ordinary user shows the AetherGenix balance and external recharge handoff', async () => {
    await page.navigate('/account?smoke_auth=1', { width: 390, height: 844 });
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'account-ordinary-mobile.png'));
    await assertOrdinaryAccountSurface(page, '/account ordinary user');
  });

  await runCheck('/billing legacy route resolves to the ordinary account surface', async () => {
    await page.navigate('/billing?smoke_auth=1', { width: 390, height: 844, expectedPathname: '/account' });
    await assertOrdinaryAccountSurface(page, '/billing legacy redirect');
  });

  await runCheck('/recharge legacy route resolves to the ordinary account surface', async () => {
    await page.navigate('/recharge?smoke_auth=1', { width: 390, height: 844, expectedPathname: '/account' });
    await assertOrdinaryAccountSurface(page, '/recharge legacy redirect');
  });

  await runCheck('/config non-admin route resolves to the ordinary account surface', async () => {
    await page.navigate('/config?smoke_auth=1', { width: 390, height: 844, expectedPathname: '/account' });
    await assertOrdinaryAccountSurface(page, '/config non-admin redirect');
  });

  await runCheck('/config admin route remains reachable with Sub2API technical settings', async () => {
    await page.navigate('/config?smoke_auth=1&smoke_admin=1', { width: 1280, height: 900 });
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'config-admin-desktop.png'));
    await assertAdminConfigSurface(page, '/config admin');
  });

  await runCheck('/explore empty state has named buttons and no mobile overflow', async () => {
    await page.navigate('/explore?smoke_state=empty', { width: 390, height: 844 });
    await page.waitFor(() => /No cases available yet|暂时|鏆傛椂/.test(document.body.innerText), '/explore empty state');
    await assertNoUnnamedButtons(page, '/explore empty');
    await assertNoHorizontalOverflow(page, '/explore empty mobile');
  });

  await runCheck('/explore long error wraps without mobile overflow', async () => {
    await page.navigate('/explore?smoke_state=long-error', { width: 390, height: 844 });
    await page.waitFor(() => document.body.innerText.includes('AetherGenix smoke long error'), '/explore long error state');
    await assertNoUnnamedButtons(page, '/explore long error');
    await assertNoHorizontalOverflow(page, '/explore long error mobile');
  });

  await runCheck('/explore detail modal keeps 44px close and action targets', async () => {
    await page.navigate('/explore?smoke_auth=1&smoke_state=filled', { width: 390, height: 844 });
    await page.waitFor(
      () => Boolean(document.querySelector('button[aria-label*="Smoke favorite case"]')),
      '/explore filled fixture card',
    );
    await clickMainControl(page, '^Preview Smoke favorite case$', '/explore detail open');
    await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), '/explore detail dialog');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'explore-detail-mobile.png'));
    await assertDialogSemantics(page, 'Explore detail modal');
    await assertNoHorizontalOverflow(page, 'Explore detail modal mobile');
    await assertNamedControlsMinTarget(page, 'Explore detail modal actions', [
      '^Close$',
      '^Clone Prompt Create$',
      '^Copy Smoke favorite case$',
      '^Remove Favorite Smoke favorite case$',
    ]);
    await assertEscClosesDialog(page, 'Explore detail modal');
  });

  await runCheck('/create entry shows the local product wizard on mobile', async () => {
    await page.navigate('/create', { width: 390, height: 844 });
    await assertNoUnnamedButtons(page, '/create');
    await assertNoHorizontalOverflow(page, '/create mobile');
    const routedToCreate = await page.evaluate(() => window.location.pathname === '/create');
    if (!routedToCreate) throw new Error('/create entry did not stay on /create');
    await page.waitFor(() => /PNG\s*\/\s*JPEG\s*\/\s*WEBP/i.test(document.body.innerText || ''), '/create product wizard upload guidance');
    await assertNamedControlsMinTarget(page, '/create product wizard controls', ['\u5f00\u59cb\u521b\u4f5c']);
    await assertNoNamedControls(page, '/create no placeholder workflow controls', [
      '\u8425\u9500\u5e7f\u544a\u56fe',
      '\u6587\u751f\u56fe',
      'AI \u6539\u56fe',
    ]);
    await assertNoNamedControls(page, '/create no legacy composer controls', [
      '^Image Generation',
      '^Commerce Image',
      '^Add reference image$',
      '^AI Optimize$',
      '^Generate Image$',
    ]);
  });

  await runCheck('/create product workflow opens the inline category launcher on tablet', async () => {
    await page.navigate('/create?smoke_auth=1', { width: 1100, height: 900 });
    await assertNoHorizontalOverflow(page, '/create tablet launcher');
    const routedToCreate = await page.evaluate(() => window.location.pathname === '/create');
    if (!routedToCreate) throw new Error('/create tablet entry did not stay on /create');
    await clickMainControl(page, '\u5f00\u59cb\u521b\u4f5c', '/create product workflow entry');
    await page.waitFor(() => /Beauty & Skincare/i.test(document.body.innerText || ''), '/create tablet category launcher');
    await assertNoHorizontalOverflow(page, '/create tablet category launcher');
    await assertNoUnnamedButtons(page, '/create tablet category launcher');
    await assertNoNamedControls(page, '/create category launcher is inline', ['^Close$']);
    await assertNamedControlsMinTarget(page, '/create tablet category actions', [
      '^Exit$',
      'Beauty & Skincare',
      'Tech & Electronics',
      'Sports & Outdoor',
    ]);
  });

  await runCheck('/create inline launcher exits back to the product wizard', async () => {
    await page.navigate('/create?smoke_auth=1', { width: 390, height: 844 });
    await clickMainControl(page, '\u5f00\u59cb\u521b\u4f5c', '/create product workflow entry before exit');
    await page.waitFor(() => /Beauty & Skincare/i.test(document.body.innerText || ''), '/create category launcher before exit');
    await clickMainControl(page, '^Exit$', '/create launcher exit');
    await page.waitFor(() => /PNG\s*\/\s*JPEG\s*\/\s*WEBP/i.test(document.body.innerText || ''), '/create product wizard after exit');
    await assertNoHorizontalOverflow(page, '/create after launcher exit');
    await assertNamedControlsMinTarget(page, '/create product workflow remains available', ['\u5f00\u59cb\u521b\u4f5c']);
  });

  await runCheck('shell icon controls keep 44px tap targets', async () => {
    await page.navigate('/explore?smoke_state=empty', { width: 1280, height: 900, waitTimeoutMs: LOAD_TIMEOUT_MS * 3 });
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'shell-desktop.png'));
    await assertNamedControlsMinTarget(page, 'desktop shell', ['^Inspiration homepage$|^灵感探索$', '^Language$', '^Tasks$', '^Announcement$']);
    await assertExploreEntryIsBrandOnly(page, 'desktop shell');
    await assertNamedControlsMinTarget(page, 'desktop primary navigation', [
      '^Create$|^创作$',
      '^Task Center$|^任务中心$',
      '^Favorites$|^我的收藏$',
    ]);
    const languageMenuOpened = await page.evaluate((helpersText) => {
      eval(helpersText);
      const button = document.querySelector('[data-testid="shell-language-button"]');
      if (!(button instanceof HTMLElement) || !isVisible(button)) {
        return { ok: false, reason: 'missing visible language menu trigger' };
      }
      button.click();
      return { ok: true };
    }, domSnapshotHelpers().text);
    if (!languageMenuOpened.ok) {
      throw new Error(`shell language menu unavailable: ${languageMenuOpened.reason || 'unknown failure'}`);
    }
    await assertNamedControlsMinTarget(page, 'shell language menu', ['^中文$', '^English$']);
    const languageOpened = await page.evaluate((helpersText) => {
      eval(helpersText);
      const zhButton = Array.from(document.querySelectorAll('[role="menuitemradio"]'))
        .filter((element) => isVisible(element))
        .find((element) => /^中文$/.test(accessibleName(element)));
      if (!(zhButton instanceof HTMLElement)) {
        return { ok: false, reason: 'missing visible Chinese language option' };
      }
      zhButton.click();
      return { ok: true };
    }, domSnapshotHelpers().text);
    if (!languageOpened.ok) {
      throw new Error(`language switch entry unavailable: ${languageOpened.reason || 'unknown failure'}`);
    }
    await page.waitFor(
      () => window.localStorage.getItem('aethergenix_locale') === 'zh-CN',
      'language switch stores zh-CN',
    );
    const menuReopened = await page.evaluate(() => {
      const button = document.querySelector('[data-testid="shell-language-button"]');
      if (!(button instanceof HTMLElement)) return false;
      button.click();
      return true;
    });
    if (!menuReopened) throw new Error('could not reopen shell language menu after switching to zh-CN');
    await page.waitFor(
      () => Boolean(document.querySelector('[data-testid="shell-language-menu"]')),
      'shell language menu reopens after zh-CN switch',
    );
    const zhLanguageState = await page.evaluate((helpersText) => {
      eval(helpersText);
      const button = document.querySelector('[data-testid="shell-language-button"]');
      if (!(button instanceof HTMLElement)) return { ok: false, reason: 'missing language menu after switch' };
      const englishButton = Array.from(document.querySelectorAll('[role="menuitemradio"]'))
        .filter((element) => isVisible(element))
        .find((element) => /^English$/.test(accessibleName(element)));
      return {
        ok: Boolean(englishButton),
        locale: window.localStorage.getItem('aethergenix_locale'),
        menuName: accessibleName(button),
        hasEnglishOption: Boolean(englishButton),
      };
    }, domSnapshotHelpers().text);
    if (!zhLanguageState.ok || zhLanguageState.locale !== 'zh-CN' || !zhLanguageState.hasEnglishOption) {
      throw new Error(`language menu did not expose zh-CN state with English available: ${JSON.stringify(zhLanguageState)}`);
    }
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'shell-language-zh-desktop.png'));
    const resetMenuOpened = await page.evaluate(() => {
      const menu = document.querySelector('[data-testid="shell-language-menu"]');
      if (menu) return true;
      const button = document.querySelector('[data-testid="shell-language-button"]');
      if (!(button instanceof HTMLElement)) return false;
      button.click();
      return true;
    });
    if (!resetMenuOpened) throw new Error('could not open language menu before resetting to en-US');
    await page.waitFor(
      () => Boolean(document.querySelector('[data-testid="shell-language-menu"]')),
      'shell language menu open before en-US reset',
    );
    const languageReset = await page.evaluate((helpersText) => {
      eval(helpersText);
      const englishButton = Array.from(document.querySelectorAll('[role="menuitemradio"]'))
        .filter((element) => isVisible(element))
        .find((element) => /^English$/.test(accessibleName(element)));
      if (!(englishButton instanceof HTMLElement)) return false;
      englishButton.click();
      return true;
    }, domSnapshotHelpers().text);
    if (!languageReset) throw new Error('could not switch language back to en-US');
    await page.waitFor(
      () => window.localStorage.getItem('aethergenix_locale') === 'en-US',
      'language switch stores en-US',
    );
    await page.navigate('/create?smoke_auth=1', { width: 1280, height: 900 });
    const brandOpenedExplore = await page.evaluate((helpersText) => {
      eval(helpersText);
      const brandLink = document.querySelector('[data-testid="brand-home-link"]');
      if (!(brandLink instanceof HTMLElement) || !isVisible(brandLink)) return false;
      if (!/^(Inspiration homepage|灵感探索)$/i.test(accessibleName(brandLink))) return false;
      if (!/^(Inspiration homepage|灵感探索)$/i.test(normalize(brandLink.getAttribute('title')))) return false;
      brandLink.click();
      return true;
    }, domSnapshotHelpers().text);
    if (!brandOpenedExplore) throw new Error('could not find or click brand home link');
    await page.waitFor(() => window.location.pathname === '/explore', 'brand home navigates to /explore');
    await page.navigate('/explore?smoke_state=empty', { width: 1280, height: 900, waitTimeoutMs: LOAD_TIMEOUT_MS * 3 });
    await assertExploreEntryIsBrandOnly(page, 'desktop shell after brand navigation');
    const drawerOpened = await page.evaluate((helpersText) => {
      eval(helpersText);
      const taskButton = Array.from(document.querySelectorAll('button'))
        .filter((element) => isVisible(element))
        .find((element) => /^Tasks(?:$|:)/i.test(accessibleName(element)));
      if (!taskButton) return false;
      taskButton.focus();
      taskButton.click();
      return true;
    }, domSnapshotHelpers().text);
    if (!drawerOpened) throw new Error('could not open TaskDrawer from shell task control');
    await page.waitFor(() => Boolean(document.querySelector('aside:not([aria-hidden="true"])[role="dialog"]')), 'TaskDrawer open');
    await assertDialogSemantics(page, 'TaskDrawer');
    await assertFocusContained(page, 'TaskDrawer');
    await assertNamedControlsMinTarget(page, 'TaskDrawer close', ['^Close$']);
    await assertNamedControlsMinTarget(page, 'TaskDrawer empty actions', [
      '^History Directory$|^历史目录$',
      '^Create$|^Create Image$',
    ]);
    await assertEscClosesDialog(page, 'TaskDrawer');
    const returnedToTaskButton = await page.evaluate((helpersText) => {
      eval(helpersText);
      const active = document.activeElement;
      return active instanceof HTMLElement && /^Tasks$/i.test(accessibleName(active));
    }, domSnapshotHelpers().text);
    if (!returnedToTaskButton) throw new Error('focus did not return to shell task control after TaskDrawer close');
    await page.navigate('/explore?smoke_auth=1&smoke_state=active-drawer', { width: 1280, height: 900 });
    const activeDrawerOpened = await page.evaluate((helpersText) => {
      eval(helpersText);
      const taskButton = Array.from(document.querySelectorAll('button'))
        .filter((element) => isVisible(element))
        .find((element) => /^Tasks(?:$|:)/i.test(accessibleName(element)));
      if (!taskButton) return false;
      taskButton.click();
      return true;
    }, domSnapshotHelpers().text);
    if (!activeDrawerOpened) throw new Error('could not open TaskDrawer with active task fixture');
    await page.waitFor(() => Boolean(document.querySelector('aside:not([aria-hidden="true"])[role="dialog"]')), 'TaskDrawer active open');
    await page.waitFor(() => /Smoke gate workspace fixture/i.test(document.body.innerText), 'TaskDrawer active task fixture');
    await assertNamedControlsMinTarget(page, 'TaskDrawer active preview controls', [
      '^Preview\\s+1$',
      '^Preview\\s+2$',
    ]);
    await assertEscClosesDialog(page, 'TaskDrawer active');
    await page.navigate('/explore?smoke_state=empty', { width: 390, height: 844 });
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'shell-mobile.png'));
    await assertNamedControlsMinTarget(page, 'mobile shell', ['^Inspiration homepage$|^灵感探索$', '^Language$', '^Tasks$', '^Announcement$']);
    await assertExploreEntryIsBrandOnly(page, 'mobile shell');
    await assertNamedControlsMinTarget(page, 'mobile primary navigation', [
      '^Create$|^创作$',
      '^Tasks$|^任务$',
      '^Favorites$|^收藏$',
      '^Me$|^我的$',
    ]);
  });

  await runCheck('AnnouncementModal has dialog semantics, focus management, Esc close, and 44px close controls', async () => {
    await page.navigate('/explore?smoke_state=empty&smoke_announcement=1', { width: 1280, height: 900 });
    await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'AnnouncementModal dialog desktop');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'announcement-desktop.png'));
    await assertDialogSemantics(page, 'AnnouncementModal');
    await assertNoUnnamedButtons(page, 'AnnouncementModal open state');
    await assertFocusContained(page, 'AnnouncementModal');
    await assertNamedControlsMinTarget(page, 'AnnouncementModal desktop', ['^Close$']);
    await assertEscClosesDialog(page, 'AnnouncementModal');

    const reopened = await page.evaluate((helpersText) => {
      eval(helpersText);
      const announcementButton = Array.from(document.querySelectorAll('button'))
        .filter((element) => isVisible(element))
        .find((element) => /^Announcement$/i.test(accessibleName(element)));
      if (!announcementButton) return false;
      announcementButton.focus();
      announcementButton.click();
      return true;
    }, domSnapshotHelpers().text);
    if (!reopened) throw new Error('could not reopen AnnouncementModal from shell trigger');
    await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'AnnouncementModal reopened from trigger');
    await assertFocusContained(page, 'AnnouncementModal reopened from trigger');
    await assertEscClosesDialog(page, 'AnnouncementModal reopened from trigger');
    const returnedToTrigger = await page.evaluate((helpersText) => {
      eval(helpersText);
      const active = document.activeElement;
      return active instanceof HTMLElement && /^Announcement$/i.test(accessibleName(active));
    }, domSnapshotHelpers().text);
    if (!returnedToTrigger) throw new Error('focus did not return to announcement trigger after Escape');

    await page.navigate('/explore?smoke_state=empty&smoke_announcement=1', { width: 390, height: 844 });
    await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'AnnouncementModal dialog mobile');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'announcement-mobile.png'));
    await assertNoHorizontalOverflow(page, 'AnnouncementModal mobile');
    await assertNamedControlsMinTarget(page, 'AnnouncementModal mobile', ['^Close$']);
  });

  await runCheck('AuthModal has dialog semantics, named controls, Esc close, and Tab containment', async () => {
    await page.navigate('/explore', { width: 1280, height: 900 });
    const opened = await page.evaluate((helpersText) => {
      eval(helpersText);
      const loginButton = Array.from(document.querySelectorAll('button'))
        .filter((element) => isVisible(element))
        .find((element) => /^(login|sign in)$/i.test(accessibleName(element)) || /登录|鐧诲綍/.test(accessibleName(element)));
      if (!loginButton) return false;
      loginButton.click();
      return true;
    }, domSnapshotHelpers().text);
    if (!opened) throw new Error('could not find visible Login/Sign In button');
    await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'AuthModal dialog');
    await assertDialogSemantics(page, 'AuthModal', { checkInputs: true });
    await assertNoUnnamedButtons(page, 'AuthModal open state');
    await assertFocusContained(page, 'AuthModal');
    await assertNamedControlsMinTarget(page, 'AuthModal close', ['^Close$']);
    await assertFormControlsMinTarget(page, 'AuthModal login fields', [
      '^Email$',
      '^Password$',
    ]);
    await assertEscClosesDialog(page, 'AuthModal');
  });

  await runCheck('AuthModal register verification controls keep 44px targets', async () => {
    await page.navigate('/explore?smoke_verify=1', { width: 390, height: 844 });
    await clickMainControl(page, '^Start creating$|^开始创作$', 'open AuthModal from Explore create entry');
    await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'AuthModal register dialog');
    await assertDialogSemantics(page, 'AuthModal register', { checkInputs: true });
    await assertNoHorizontalOverflow(page, 'AuthModal register mobile');
    await assertFormControlsMinTarget(page, 'AuthModal register fields', [
      '^Email$',
      '^Password$',
      '^Verify Code$',
    ]);
    await assertNamedControlsMinTarget(page, 'AuthModal register send-code action', ['^Send Code$']);
    await assertEscClosesDialog(page, 'AuthModal register');
  });

  await runCheck('/history signed-out gate has named actions and no mobile overflow', async () => {
    await page.navigate('/history', { width: 390, height: 844 });
    await page.waitFor(() => /Sign in to view (?:the )?History Directory|登录后查看历史目录/.test(document.body.innerText), '/history signed-out gate');
    await assertRouteActionsAndMobile(page, '/history signed-out');
  });

  await runCheck('/history empty state has named actions and no mobile overflow', async () => {
    await page.navigate('/history?smoke_auth=1&smoke_state=empty', { width: 390, height: 844 });
    await page.waitFor(() => /No generation history yet|还没有生成记录/.test(document.body.innerText), '/history empty state');
    await assertRouteActionsAndMobile(page, '/history empty');
  });

  await runCheck('/history search-empty state has named actions and no mobile overflow', async () => {
    await page.navigate('/history?smoke_auth=1&smoke_state=empty', { width: 390, height: 844 });
    await page.waitFor(() => /No generation history yet|还没有生成记录/.test(document.body.innerText), '/history empty before search');
    await submitMainSearch(page, 'unmatched smoke history query', 'apply history filter|应用历史筛选', '/history search-empty');
    await page.waitFor(() => /No matching history|没有匹配的历史记录/.test(document.body.innerText), '/history search-empty state');
    await assertRouteActionsAndMobile(page, '/history search-empty');
    await assertFormControlsMinTarget(page, '/history search input', ['^Search prompts']);
    await assertNamedControlsMinTarget(page, '/history clear search action', ['^Clear search$']);
  });

  await runCheck('/history authenticated surface has named buttons and no mobile overflow', async () => {
    await page.navigate('/history?smoke_auth=1', { width: 390, height: 844 });
    await page.waitFor(() => /First smoke preview image/i.test(document.body.innerText), '/history fixture item');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'history-card-mobile.png'));
    await assertRouteActionsAndMobile(page, '/history');
    await assertNamedControlsMinTarget(page, '/history card actions', [
      '^Download ZIP$',
      '^Re-Generate$',
      '^Publish Case$',
      '^Delete$',
    ]);
  });

  await runCheck('/history delete confirmation keeps 44px action targets', async () => {
    await page.navigate('/history?smoke_auth=1', { width: 390, height: 844 });
    await page.waitFor(() => /First smoke preview image/i.test(document.body.innerText), '/history fixture item before delete confirm');
    await clickMainControl(page, '^Delete$', '/history delete confirm trigger');
    await page.waitFor(() => /Delete 2 image records/i.test(document.body.innerText), '/history delete confirmation');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'history-delete-confirm-mobile.png'));
    await assertNoHorizontalOverflow(page, '/history delete confirmation mobile');
    await assertFocusContained(page, '/history delete confirmation');
    await assertNamedControlsMinTarget(page, '/history delete confirmation actions', [
      '^Cancel$',
      '^Delete 2 records$',
    ]);
  });

  await runCheck('/history card preview has dialog semantics and closes with Escape', async () => {
    await page.navigate('/history?smoke_auth=1', { width: 1280, height: 900 });
    await page.waitFor(() => /First smoke preview image/i.test(document.body.innerText), '/history fixture item for preview');
    await clickMainControl(page, '^Preview\\s+1$|^预览\\s+1$', '/history preview');
    await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), '/history preview dialog');
    await assertDialogSemantics(page, 'History ImagePreviewModal');
    await assertNoUnnamedButtons(page, 'History ImagePreviewModal open state');
    await assertEscClosesDialog(page, 'History ImagePreviewModal');
  });

  await runCheck('/favorites signed-out gate has named actions and no mobile overflow', async () => {
    await page.navigate('/favorites', { width: 390, height: 844 });
    await page.waitFor(() => /Sign in to manage favorites|登录后管理收藏/.test(document.body.innerText), '/favorites signed-out gate');
    await assertRouteActionsAndMobile(page, '/favorites signed-out');
  });

  await runCheck('/favorites empty state has named actions and no mobile overflow', async () => {
    await page.navigate('/favorites?smoke_auth=1&smoke_state=empty', { width: 390, height: 844 });
    await page.waitFor(() => /No favorite cases yet|还没有收藏案例/.test(document.body.innerText), '/favorites empty state');
    await assertRouteActionsAndMobile(page, '/favorites empty');
  });

  await runCheck('/favorites search-empty state has named actions and no mobile overflow', async () => {
    await page.navigate('/favorites?smoke_auth=1', { width: 390, height: 844 });
    await page.waitFor(() => /Smoke favorite case/i.test(document.body.innerText), '/favorites fixture before search');
    await submitMainSearch(page, 'unmatched smoke favorite query', '^Search$|搜索', '/favorites search-empty');
    await page.waitFor(() => /No matching favorites|没有匹配的收藏/.test(document.body.innerText), '/favorites search-empty state');
    await assertRouteActionsAndMobile(page, '/favorites search-empty');
    await assertFormControlsMinTarget(page, '/favorites search input', ['^Search favorite cases']);
    await assertNamedControlsMinTarget(page, '/favorites clear search action', ['^Clear search$']);
  });

  await runCheck('/favorites authenticated surface has named buttons and no mobile overflow', async () => {
    await page.navigate('/favorites?smoke_auth=1', { width: 390, height: 844 });
    await page.waitFor(() => /Smoke favorite case/i.test(document.body.innerText), '/favorites fixture item');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'favorites-card-mobile.png'));
    await assertRouteActionsAndMobile(page, '/favorites');
    await assertNamedControlsMinTarget(page, '/favorites card controls', [
      '^Preview Smoke favorite case$',
      '^Clone Prompt Smoke favorite case$',
      '^Remove Favorite Smoke favorite case$',
    ]);
  });

  await runCheck('/favorites card preview has dialog semantics and closes with Escape', async () => {
    await page.navigate('/favorites?smoke_auth=1', { width: 1280, height: 900 });
    await page.waitFor(() => /Smoke favorite case/i.test(document.body.innerText), '/favorites fixture item for preview');
    await clickMainControl(page, '^Preview Smoke favorite case$|^预览 Smoke favorite case$', '/favorites preview');
    await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), '/favorites preview dialog');
    await assertDialogSemantics(page, 'Favorites ImagePreviewModal');
    await assertNoUnnamedButtons(page, 'Favorites ImagePreviewModal open state');
    await assertEscClosesDialog(page, 'Favorites ImagePreviewModal');
  });

  await runCheck('/favorites remove action reaches local empty state', async () => {
    await page.navigate('/favorites?smoke_auth=1', { width: 390, height: 844 });
    await page.waitFor(() => /Smoke favorite case/i.test(document.body.innerText), '/favorites fixture item before remove');
    await clickMainControl(page, '^Remove Favorite Smoke favorite case$|^取消收藏 Smoke favorite case$', '/favorites remove');
    await page.waitFor(() => /No favorite cases yet|还没有收藏案例/.test(document.body.innerText), '/favorites empty after remove');
    await assertRouteActionsAndMobile(page, '/favorites after remove');
  });

  await runCheck('/tasks authenticated surface has named buttons and no mobile overflow', async () => {
    await page.navigate('/tasks?smoke_auth=1', { width: 390, height: 844 });
    await page.waitFor(() => document.body.innerText.includes('Smoke gate workspace fixture'), '/tasks fixture item');
    await assertRouteActionsAndMobile(page, '/tasks');
    await assertNamedControlsMinTarget(page, '/tasks batch preview controls', [
      '^Preview\\s+1$',
      '^Preview\\s+2$',
    ]);
    await assertNamedControlsMinTarget(page, '/tasks completed actions', [
      '^History Directory$|^历史目录$',
      '^Download ZIP$',
    ]);
  });

  await runCheck('/tasks deep fallback empty state has named actions and no mobile overflow', async () => {
    await page.navigate('/tasks?smoke_auth=1&smoke_state=empty', { width: 390, height: 844 });
    await page.waitFor(() => /No tasks yet|还没有任务/.test(document.body.innerText), '/tasks empty fallback');
    await assertRouteActionsAndMobile(page, '/tasks empty');
    await assertNamedControlsMinTarget(page, '/tasks empty actions', ['^Create$|^Create Image$']);
  });

  await runCheck('/tasks deep fallback filter-empty state has named actions and no mobile overflow', async () => {
    await page.navigate('/tasks?smoke_auth=1', { width: 390, height: 844 });
    await page.waitFor(() => document.body.innerText.includes('Smoke gate workspace fixture'), '/tasks fixture before filter');
    await clickMainControl(page, '^Active\\s+0$|^运行中\\s+0$', '/tasks active filter');
    await page.waitFor(() => /No tasks are processing|暂无正在处理的任务/.test(document.body.innerText), '/tasks active-empty filter');
    await assertRouteActionsAndMobile(page, '/tasks active-empty');
  });

  await runCheck('/workspace missing task fallback has named buttons and no mobile overflow', async () => {
    await page.navigate('/workspace/smoke-missing?smoke_auth=1', { width: 390, height: 844 });
    await page.waitFor(() => document.body.innerText.includes('Smoke fixture task not found'), '/workspace missing task fallback');
    await assertNoUnnamedButtons(page, '/workspace missing task');
    await assertNoHorizontalOverflow(page, '/workspace missing task mobile');
  });

  await runCheck('/workspace running task owns progress and context on mobile', async () => {
    await page.navigate('/workspace/smoke-task?smoke_state=active-workspace', { width: 390, height: 844 });
    await page.waitFor(() => /Generating images|Task progress/i.test(document.body.innerText), '/workspace running workbench');
    await assertNoUnnamedButtons(page, '/workspace running task');
    await assertNoHorizontalOverflow(page, '/workspace running task mobile');
    await assertNamedControlsMinTarget(page, '/workspace running navigation', ['^Back$']);
    const progressSurface = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasPrompt: /Prompt \/ Context/i.test(text),
        hasParameters: /Task parameters/i.test(text),
        hasExpected: /Expected result/i.test(text),
        hasTaskId: /Task ID/i.test(text),
      };
    });
    if (!progressSurface.hasPrompt || !progressSurface.hasParameters || !progressSurface.hasExpected || !progressSurface.hasTaskId) {
      throw new Error(`/workspace running state is missing workbench context: ${JSON.stringify(progressSurface)}`);
    }
  });

  await runCheck('/workspace failed task keeps reason and next actions in the workbench', async () => {
    await page.navigate('/workspace/smoke-task?smoke_state=failed-workspace', { width: 390, height: 844 });
    await page.waitFor(() => /Generation failed|Failure reason/i.test(document.body.innerText), '/workspace failed workbench');
    await assertNoUnnamedButtons(page, '/workspace failed task');
    await assertNoHorizontalOverflow(page, '/workspace failed task mobile');
    await assertNamedControlsMinTarget(page, '/workspace failed task actions', [
      '^Back$',
      '^Revise prompt in Create$',
      '^Retry with current settings$',
    ]);
  });

  await runCheck('/workspace selected asset lane defaults to first asset and switches on mobile', async () => {
    await page.navigate('/workspace/smoke-task', { width: 1440, height: 900 });
    await page.waitFor(() => /Generated assets are ready|Smoke launch album/i.test(document.body.innerText), '/workspace selected asset fixture desktop');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'workspace-selected-lane-desktop.png'));
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'workspace-album-baseline-desktop.png'));

    await page.navigate('/workspace/smoke-task', { width: 390, height: 844 });
    await page.waitFor(() => /Generated assets are ready|Smoke launch album/i.test(document.body.innerText), '/workspace selected asset fixture');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'workspace-selected-lane-mobile.png'));
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'workspace-album-baseline-mobile.png'));
    await assertNoHorizontalOverflow(page, '/workspace selected asset mobile');
    await assertNoUnnamedButtons(page, '/workspace selected asset');
    const mobilePrimaryAssetVisible = await page.evaluate(() => {
      const asset = document.querySelector('button[aria-label="Select asset 1"]');
      if (!(asset instanceof HTMLElement)) return { ok: false, reason: 'missing Select asset 1 button' };
      const rect = asset.getBoundingClientRect();
      const visibleBeforeBottomNav = rect.top < window.innerHeight - 72 && rect.bottom > 0;
      return {
        ok: visibleBeforeBottomNav,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        viewport: window.innerHeight,
      };
    });
    if (!mobilePrimaryAssetVisible.ok) {
      throw new Error(`/workspace album mobile must show the primary result asset in the first viewport: ${JSON.stringify(mobilePrimaryAssetVisible)}`);
    }
    await assertNamedControlsMinTarget(page, '/workspace selected asset actions', [
      '^Back$',
      '^Select asset 1$',
      '^Select asset 2$',
      '^Preview selected$',
      '^Reuse selected prompt$',
      '^Create variant$',
      '^Publish selected$',
      '^Preview all$',
      '^Download ZIP$',
    ]);
    await assertNoNamedControls(page, '/workspace selected lane removes duplicated task-scoped actions', [
      '^Reuse prompt$',
      '^Regenerate$',
      '^Publish case$',
    ]);
    const albumState = await page.evaluate(() => {
      const text = document.body.innerText;
      const gridButtons = Array.from(document.querySelectorAll('button'))
        .map((button) => button.getAttribute('aria-label') || button.innerText || '')
        .filter((name) => /Select asset/i.test(name));
      const planButtons = Array.from(document.querySelectorAll('button, a[href], [role="button"]'))
        .map((control) => control.getAttribute('aria-label') || control.textContent || '')
        .filter((name) => /Hero cover|Detail comparison/i.test(name));
      const domText = document.body.textContent || '';
      return {
        ok:
          /Smoke launch album/i.test(text) &&
          /Current 1 of 2/i.test(text) &&
          !/High-contrast catalog frames/i.test(text) &&
          /Hero cover/i.test(domText) &&
          /Detail comparison/i.test(domText) &&
          gridButtons.length === 2 &&
          planButtons.length === 0,
        hasTitle: /Smoke launch album/i.test(text),
        hasCurrent: /Current 1 of 2/i.test(text),
        hasVerboseStyleGuide: /High-contrast catalog frames/i.test(text),
        hasPlanInDom: /Hero cover/i.test(domText) && /Detail comparison/i.test(domText),
        gridButtons,
        planButtons,
      };
    });
    if (!albumState.ok) throw new Error(`/workspace album baseline missing summary or clean selection cards: ${JSON.stringify(albumState)}`);
    const defaultState = await page.evaluate((helpersText) => {
      eval(helpersText);
      const controls = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
        .filter((element) => isVisible(element))
        .map((element) => ({ element, name: accessibleName(element) }));
      const first = controls.find((control) => /^Select asset 1$/i.test(control.name));
      const second = controls.find((control) => /^Select asset 2$/i.test(control.name));
      const text = document.body.innerText;
      const domText = document.body.textContent || '';
      return {
        ok:
          first?.element.getAttribute('aria-pressed') === 'true' &&
          second?.element.getAttribute('aria-pressed') === 'false' &&
          /Asset 1 of 2/i.test(text) &&
          /First smoke preview image/i.test(domText) &&
          /Not published/i.test(text),
        firstPressed: first?.element.getAttribute('aria-pressed'),
        secondPressed: second?.element.getAttribute('aria-pressed'),
        hasAssetText: /Asset 1 of 2/i.test(text),
        hasPrompt: /First smoke preview image/i.test(domText),
      };
    }, domSnapshotHelpers().text);
    if (!defaultState.ok) throw new Error(`/workspace selected default state mismatch: ${JSON.stringify(defaultState)}`);

    await clickMainControl(page, '^Select asset 2$', '/workspace select second asset');
    await page.waitFor(() => /Asset 2 of 2/i.test(document.body.innerText) && /Second smoke preview image/i.test(document.body.textContent || ''), '/workspace selected asset switched');
    const switchedState = await page.evaluate((helpersText) => {
      eval(helpersText);
      const controls = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
        .filter((element) => isVisible(element))
        .map((element) => ({ element, name: accessibleName(element) }));
      const first = controls.find((control) => /^Select asset 1$/i.test(control.name));
      const second = controls.find((control) => /^Select asset 2$/i.test(control.name));
      return {
        ok:
          first?.element.getAttribute('aria-pressed') === 'false' &&
          second?.element.getAttribute('aria-pressed') === 'true',
        firstPressed: first?.element.getAttribute('aria-pressed'),
        secondPressed: second?.element.getAttribute('aria-pressed'),
      };
    }, domSnapshotHelpers().text);
    if (!switchedState.ok) throw new Error(`/workspace selected switch state mismatch: ${JSON.stringify(switchedState)}`);

    const mobileOrder = await page.evaluate((helpersText) => {
      eval(helpersText);
      const controls = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
        .filter((element) => isVisible(element))
        .map((element) => ({ element, name: accessibleName(element), rect: element.getBoundingClientRect() }));
      const previewAll = controls.find((control) => /^Preview all$/i.test(control.name));
      const downloadZip = controls.find((control) => /^Download ZIP$/i.test(control.name));
      const taskParameters = Array.from(document.querySelectorAll('*'))
        .filter((element) => isVisible(element))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: normalize(element.innerText || element.textContent),
            top: rect.top,
            area: rect.width * rect.height,
          };
        })
        .filter((item) => /^Task parameters$/i.test(item.text))
        .sort((a, b) => a.top - b.top || a.area - b.area)[0];
      if (!previewAll || !downloadZip || !taskParameters) {
        return {
          ok: false,
          reason: `missing layout target preview=${Boolean(previewAll)} download=${Boolean(downloadZip)} meta=${Boolean(taskParameters)}`,
        };
      }
      const previewSelected = controls.find((control) => /^Preview selected$/i.test(control.name));
      const createVariant = controls.find((control) => /^Create variant$/i.test(control.name));
      return {
        ok:
          previewSelected &&
          createVariant &&
          previewSelected.rect.top < taskParameters.top &&
          createVariant.rect.top < taskParameters.top &&
          previewAll.rect.top < taskParameters.top &&
          downloadZip.rect.top < taskParameters.top,
        previewSelectedTop: Math.round(previewSelected?.rect.top || 0),
        createVariantTop: Math.round(createVariant?.rect.top || 0),
        previewTop: Math.round(previewAll.rect.top),
        downloadTop: Math.round(downloadZip.rect.top),
        metaTop: Math.round(taskParameters.top),
      };
    }, domSnapshotHelpers().text);
    if (!mobileOrder.ok) {
      throw new Error(`/workspace selected and collection actions must appear before task metadata: ${JSON.stringify(mobileOrder)}`);
    }
  });

  await runCheck('/workspace single image result does not show album chrome', async () => {
    await page.navigate('/workspace/smoke-task?smoke_state=single-workspace', { width: 390, height: 844 });
    await page.waitFor(() => /Generated assets are ready|Asset 1 of 1/i.test(document.body.innerText) && /Only smoke preview image/i.test(document.body.textContent || ''), '/workspace single image fixture');
    await assertNoHorizontalOverflow(page, '/workspace single image mobile');
    await assertNoUnnamedButtons(page, '/workspace single image');
    const singleState = await page.evaluate((helpersText) => {
      eval(helpersText);
      const text = document.body.innerText;
      const domText = document.body.textContent || '';
      const controls = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
        .filter((element) => isVisible(element))
        .map((element) => accessibleName(element));
      return {
        ok:
          /Asset 1 of 1/i.test(text) &&
          /Only smoke preview image/i.test(domText) &&
          !/Task album/i.test(text) &&
          !/Series collection/i.test(text) &&
          !/Collection actions/i.test(text) &&
          !/Batch/i.test(text) &&
          !controls.some((name) => /^Preview all$|^Download ZIP$/i.test(name)),
        hasSelected: /Asset 1 of 1/i.test(text),
        hasAlbum: /Task album|Series collection|Collection actions|Batch/i.test(text),
        hasPromptInDom: /Only smoke preview image/i.test(domText),
        controls,
      };
    }, domSnapshotHelpers().text);
    if (!singleState.ok) throw new Error(`/workspace single image must not show album chrome: ${JSON.stringify(singleState)}`);
  });

  await runCheck('/workspace zh-CN locale keeps Workspace labels in Chinese', async () => {
    await page.navigate('/workspace/smoke-task?smoke_locale=zh-CN', { width: 390, height: 844 });
    await page.waitFor(() => /结果已生成|相册|批量/.test(document.body.innerText), '/workspace zh-CN fixture');
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'workspace-locale-zh-mobile.png'));
    await assertNoHorizontalOverflow(page, '/workspace zh-CN mobile');
    await assertNoUnnamedButtons(page, '/workspace zh-CN');
    const localeState = await page.evaluate((helpersText) => {
      eval(helpersText);
      const text = document.body.innerText;
      const controls = Array.from(document.querySelectorAll('button, [role="button"], a[href]'))
        .filter((element) => isVisible(element))
        .map((element) => accessibleName(element));
      return {
        ok:
          /结果已生成/.test(text) &&
          /相册/.test(text) &&
          /批量/.test(text) &&
          /结果/.test(text) &&
          /已选/.test(text) &&
          /操作/.test(text) &&
          controls.some((name) => /^选择第 1 张$/.test(name)) &&
          controls.some((name) => /^预览全部$/.test(name)) &&
          controls.some((name) => /^打包下载$/.test(name)) &&
          controls.some((name) => /^预览选中$/.test(name)) &&
          controls.some((name) => /^生成变体$/.test(name)) &&
          !/\bAlbum\b|Batch|Result assets|Selected actions|Preview selected|Download ZIP/.test(text),
        controls,
        text: text.slice(0, 600),
      };
    }, domSnapshotHelpers().text);
    if (!localeState.ok) {
      throw new Error(`/workspace zh-CN labels must not fall back to English: ${JSON.stringify(localeState)}`);
    }
  });

  await runCheck('/workspace selected publish and unpublish call only the selected asset', async () => {
    await page.navigate('/workspace/smoke-task', { width: 390, height: 844 });
    await page.waitFor(() => /Asset 1 of 2/i.test(document.body.innerText) && /First smoke preview image/i.test(document.body.textContent || ''), '/workspace selected publish fixture');
    await clickMainControl(page, '^Select asset 2$', '/workspace select second asset for publish');
    await page.evaluate((key) => window.localStorage.setItem(key, '[]'), API_CALL_STORAGE_KEY);
    await clickMainControl(page, '^Publish selected$', '/workspace publish selected');
    await page.waitFor(() => /Unpublish selected|Published/i.test(document.body.innerText), '/workspace selected asset published');
    const publishCalls = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '[]'), API_CALL_STORAGE_KEY);
    const publishScoped = publishCalls.filter((call) => call.type === 'history-publish');
    if (publishScoped.length !== 1 || publishScoped[0].id !== 'smoke-image-2' || publishScoped[0].method !== 'POST') {
      throw new Error(`/workspace publish selected must call only smoke-image-2 once: ${JSON.stringify(publishCalls)}`);
    }

    await page.evaluate((key) => window.localStorage.setItem(key, '[]'), API_CALL_STORAGE_KEY);
    await clickMainControl(page, '^Unpublish selected$', '/workspace unpublish selected');
    await page.waitFor(() => /Publish selected|Not published/i.test(document.body.innerText), '/workspace selected asset unpublished');
    const unpublishCalls = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '[]'), API_CALL_STORAGE_KEY);
    const unpublishScoped = unpublishCalls.filter((call) => call.type === 'history-publish');
    if (unpublishScoped.length !== 1 || unpublishScoped[0].id !== 'smoke-image-2' || unpublishScoped[0].method !== 'DELETE') {
      throw new Error(`/workspace unpublish selected must call only smoke-image-2 once: ${JSON.stringify(unpublishCalls)}`);
    }
  });

  await runCheck('/workspace selected regenerate uses the selected prompt only', async () => {
    await page.navigate('/workspace/smoke-task', { width: 390, height: 844 });
    await page.waitFor(() => /Asset 1 of 2/i.test(document.body.innerText) && /First smoke preview image/i.test(document.body.textContent || ''), '/workspace selected regenerate fixture');
    await clickMainControl(page, '^Select asset 2$', '/workspace select second asset for regenerate');
    await page.evaluate((key) => window.localStorage.setItem(key, '[]'), API_CALL_STORAGE_KEY);
    await clickMainControl(page, '^Create variant$', '/workspace create selected variant');
    await page.waitFor(() => window.location.pathname.includes('/workspace/smoke-regenerated-task'), '/workspace regenerated task route');
    const generateCalls = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || '[]'), API_CALL_STORAGE_KEY);
    const selectedGenerate = generateCalls.filter((call) => call.type === 'generate');
    if (
      selectedGenerate.length !== 1 ||
      selectedGenerate[0].body?.prompt !== 'Second smoke preview image' ||
      selectedGenerate[0].body?.n !== 1
    ) {
      throw new Error(`/workspace selected regenerate must send selected prompt with n=1: ${JSON.stringify(generateCalls)}`);
    }
  });

  await runCheck('/workspace failed image retry action keeps a 44px target', async () => {
    await page.navigate('/workspace/smoke-task?smoke_state=broken-image', { width: 390, height: 844 });
    await page.waitFor(() => /Retry|重新加载/.test(document.body.innerText), '/workspace failed image retry');
    await assertNoHorizontalOverflow(page, '/workspace failed image mobile');
    await assertNamedControlsMinTarget(page, '/workspace failed image retry', ['^Retry$']);
  });

  await runCheck('/workspace selection and selected preview are keyboard-openable', async () => {
    await page.navigate('/workspace/smoke-task', { width: 1280, height: 900 });
    await page.waitFor(() => document.querySelectorAll('button[aria-label^="Select asset"], button[aria-label*="选择资产"]').length >= 2, '/workspace select asset buttons');
    await assertNoUnnamedButtons(page, '/workspace');
    const selectionStatus = await page.evaluate((helpersText) => {
      eval(helpersText);
      const buttons = Array.from(document.querySelectorAll('button'))
        .filter((element) => isVisible(element))
        .map((element) => ({ element, name: accessibleName(element) }))
        .filter((item) => /^Select asset\s+\d+$/i.test(item.name) || /选择资产\s+\d+/.test(item.name));
      if (buttons.length < 2) return { ok: false, reason: `expected at least two select buttons, found ${buttons.length}` };
      const names = buttons.map((item) => item.name);
      if (new Set(names).size !== names.length) return { ok: false, reason: `select button names are not distinct: ${names.join(', ')}` };
      buttons[1].element.focus();
      return {
        ok: document.activeElement === buttons[1].element,
        names,
      };
    }, domSnapshotHelpers().text);
    if (!selectionStatus.ok) throw new Error(selectionStatus.reason || 'select button could not be focused');
    await page.pressKey('Enter');
    let selectionChanged = await page.waitFor(() => /Asset 2 of 2/i.test(document.body.innerText) && /Second smoke preview image/i.test(document.body.textContent || ''), '/workspace keyboard selection changed by Enter', 1_000)
      .then(() => true)
      .catch(() => false);
    if (!selectionChanged) {
      await page.pressKey(' ');
      selectionChanged = await page.waitFor(() => /Asset 2 of 2/i.test(document.body.innerText) && /Second smoke preview image/i.test(document.body.textContent || ''), '/workspace keyboard selection changed by Space', 1_000)
        .then(() => true)
        .catch(() => false);
    }
    if (!selectionChanged) {
      const diagnostic = await page.evaluate((helpersText) => {
        eval(helpersText);
        const active = document.activeElement;
        return {
          activeName: active instanceof HTMLElement ? accessibleName(active) : '',
          activeTag: active instanceof HTMLElement ? active.tagName.toLowerCase() : '',
          bodyText: document.body.innerText.slice(0, 500),
        };
      }, domSnapshotHelpers().text);
      throw new Error(`Timed out waiting for selected asset keyboard activation; diagnostic=${JSON.stringify(diagnostic)}`);
    }
    const selectedActionFocused = await page.evaluate((helpersText) => {
      eval(helpersText);
      const previewSelected = Array.from(document.querySelectorAll('button'))
        .filter((element) => isVisible(element))
        .find((element) => /^Preview selected$/i.test(accessibleName(element)));
      if (!(previewSelected instanceof HTMLElement)) return false;
      previewSelected.focus();
      return document.activeElement === previewSelected;
    }, domSnapshotHelpers().text);
    if (!selectedActionFocused) throw new Error('Preview selected action could not be focused');
    await page.pressKey('Enter');
    const openedByEnter = await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'ImagePreviewModal opened by selected preview keyboard action', 1_000)
      .then(() => true)
      .catch(() => false);
    if (!openedByEnter) {
      await page.pressKey(' ');
      const openedBySpace = await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'ImagePreviewModal opened by selected preview Space action', 1_000)
        .then(() => true)
        .catch(() => false);
      if (openedBySpace) return;
      const diagnostic = await page.evaluate((helpersText) => {
        eval(helpersText);
        const active = document.activeElement;
        const beforeClick = Boolean(document.querySelector('[role="dialog"]'));
        if (active instanceof HTMLElement) active.click();
        return {
          activeName: active instanceof HTMLElement ? accessibleName(active) : '',
          activeTag: active instanceof HTMLElement ? active.tagName.toLowerCase() : '',
          beforeClick,
          afterClick: Boolean(document.querySelector('[role="dialog"]')),
        };
      }, domSnapshotHelpers().text);
      throw new Error(`Timed out waiting for ImagePreviewModal opened by selected preview keyboard action; diagnostic=${JSON.stringify(diagnostic)}`);
    }
  });

  await runCheck('ImagePreviewModal has dialog semantics, named controls, Esc close, and Tab containment', async () => {
    await page.screenshot(path.join(ISSUE_SCREENSHOT_DIR, 'image-preview-modal-desktop.png'));
    await assertDialogSemantics(page, 'ImagePreviewModal');
    await assertNoUnnamedButtons(page, 'ImagePreviewModal open state');
    await assertFocusContained(page, 'ImagePreviewModal');
    await assertNamedControlsMinTarget(page, 'ImagePreviewModal top and icon controls', [
      '^Download$',
      '^Open Original$',
      '^Close$',
      '^Previous$',
      '^Next$',
    ]);
    await assertEscClosesDialog(page, 'ImagePreviewModal');
  });

  await runCheck('all API calls are handled by smoke fixtures', async () => {
    await assertNoUnhandledSmokeApi(page);
  });
}

function terminate(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
}

function installProcessCleanup() {
  const cleanup = () => {
    for (const child of processes) terminate(child);
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });
}

async function main() {
  assertNodeRuntime();
  installProcessCleanup();
  ensureDir(TMP_ROOT);
  if (isWindowsAbsoluteOnC(TMP_ROOT) || isWindowsAbsoluteOnC(TEMP_DIR) || isWindowsAbsoluteOnC(NPM_CACHE_DIR)) {
    throw new Error(`Smoke temp/cache paths must not resolve under C:. Current temp root: ${TMP_ROOT}`);
  }

  console.log(`Using temp/cache root: ${TMP_ROOT}`);
  const vitePort = await getAvailablePort(4317);
  const debugPort = await getAvailablePort(9517);
  console.log(`Starting Vite on http://127.0.0.1:${vitePort}`);
  const { baseUrl, process: viteProcess } = await startVite(vitePort);
  console.log(`Starting browser CDP on port ${debugPort}`);
  const browserInfo = await startBrowser(debugPort);
  const connection = new CdpConnection(browserInfo.webSocketDebuggerUrl);

  try {
    console.log('Creating smoke page');
    const page = await createSmokePage(connection, baseUrl);
    console.log(`Using browser: ${browserInfo.executable}`);
    await runSmokeChecks(page, baseUrl);
  } finally {
    connection.close();
    terminate(browserInfo.browser);
    terminate(viteProcess);
  }

  if (failures.length > 0) {
    console.error('\nUI smoke failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nUI smoke passed.');
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

withTimeout(main(), SMOKE_TIMEOUT_MS, 'UI smoke').catch((error) => {
  console.error('\nUI smoke failed:');
  console.error(`- ${error.message}`);
  process.exit(1);
});