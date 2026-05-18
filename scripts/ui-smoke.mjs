#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const TMP_ROOT = path.join(ROOT_DIR, '.tmp', 'ui-smoke');
const TEMP_DIR = path.join(TMP_ROOT, 'temp');
const NPM_CACHE_DIR = path.join(TMP_ROOT, 'npm-cache');
const PROFILE_DIR = path.join(TMP_ROOT, 'browser-profile');
const CHECK_TIMEOUT_MS = 45_000;
const LOAD_TIMEOUT_MS = 15_000;
const CDP_COMMAND_TIMEOUT_MS = 10_000;
const SMOKE_TIMEOUT_MS = 120_000;
const UNHANDLED_API_STORAGE_KEY = 'aethergenix_smoke_unhandled_api';
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
  const imageOne = ${JSON.stringify(imageOne)};
  const imageTwo = ${JSON.stringify(imageTwo)};
  const longError = ${JSON.stringify(LONG_ERROR)};
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
    result: null,
    created_at: '2026-05-18T00:00:00Z',
    updated_at: '2026-05-18T00:00:00Z',
    started_at: '2026-05-18T00:00:01Z',
    completed_at: '2026-05-18T00:00:02Z',
    items: [
      makeHistoryItem('smoke-image-1', 0, imageOne, 'First smoke preview image'),
      makeHistoryItem('smoke-image-2', 1, imageTwo, 'Second smoke preview image')
    ]
  };

  function makeHistoryItem(id, batchIndex, imageUrl, prompt) {
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
      task_result: null,
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

  try {
    window.localStorage.setItem('aethergenix_locale', 'en-US');
    window.localStorage.setItem('aethergenix_theme', 'light');
  } catch {}

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const rawUrl = typeof input === 'string' ? input : input && input.url;
    const url = new URL(rawUrl || '', window.location.origin);
    if (!url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    if (url.pathname === '/api/auth/session') {
      return json({
        authenticated: false,
        owner_id: 'smoke-guest',
        guest_id: 'smoke-guest-id',
        api_key_source: 'manual',
        user: null
      });
    }

    if (url.pathname === '/api/site-settings') {
      return json({
        default_locale: 'en-US',
        announcement: { enabled: false, title: '', body: '', updated_at: null },
        inspiration_sources: [],
        recharge_url: '',
        viewer: { authenticated: false, is_admin: false }
      });
    }

    if (url.pathname === '/api/auth/public-settings') {
      return json({
        registration_enabled: true,
        email_verify_enabled: false,
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
      return json({
        viewer: {
          authenticated: false,
          owner_id: 'smoke-guest',
          guest_id: 'smoke-guest-id',
          api_key_source: 'manual',
          user: null
        },
        user: {
          name: 'Smoke Guest',
          email: null,
          username: null,
          role: null,
          authenticated: false,
          guest: true,
          api_key_set: false,
          api_key_source: 'manual',
          model: 'smoke-model'
        },
        balance: { ok: true, remaining: 0, raw: null },
        stats: { total: 0, succeeded: 0, edits: 0, last_generation_at: null }
      });
    }

    if (url.pathname === '/api/tasks') {
      return json({ items: [task] });
    }

    if (url.pathname === '/api/tasks/smoke-task') {
      return json(task);
    }

    if (url.pathname === '/api/inspirations') {
      const state = new URL(window.location.href).searchParams.get('smoke_state') || url.searchParams.get('smoke_state');
      const limit = Number(url.searchParams.get('limit') || 48);
      const offset = Number(url.searchParams.get('offset') || 0);
      if (state === 'long-error') {
        return json({ detail: longError }, { status: 500 });
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
    await this.connection.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: width <= 600 },
      this.sessionId,
    );
    const loadEvent = this.connection.waitForEvent('Page.loadEventFired', () => true, LOAD_TIMEOUT_MS, this.sessionId);
    await this.connection.send('Page.navigate', { url: `${this.baseUrl}${urlPath}` }, this.sessionId);
    await loadEvent;
    await this.waitFor(
      () => Boolean(document.querySelector('main')) && document.body.innerText.trim().length > 0,
      `app content for ${urlPath}`,
    );
    await sleep(options.settleMs || 250);
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

  async waitFor(fn, label, timeoutMs = LOAD_TIMEOUT_MS) {
    const startedAt = Date.now();
    let lastError = null;
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const value = await this.evaluate(fn);
        if (value) return value;
      } catch (error) {
        lastError = error;
      }
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
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
}

async function createSmokePage(connection, baseUrl) {
  await connection.ready;
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

async function assertFocusContained(page, context) {
  await page.waitFor(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return Boolean(dialog && dialog.contains(document.activeElement));
  }, `${context} initial focus inside dialog`);

  for (let index = 0; index < 14; index += 1) {
    await page.pressKey('Tab');
    const inside = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return Boolean(dialog && dialog.contains(document.activeElement));
    });
    if (!inside) throw new Error(`${context} focus escaped after Tab ${index + 1}`);
  }

  for (let index = 0; index < 4; index += 1) {
    await page.pressKey('Tab', { shift: true });
    const inside = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
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
  console.log('UI smoke checks: unnamed buttons, dialog a11y, Esc, Tab focus containment, keyboard access, mobile overflow, dark-first.');

  await runCheck('dark-first keeps .dark despite old light localStorage and no visible theme toggle', async () => {
    const html = await fetch(baseUrl).then((response) => response.text());
    if (!/<html[^>]*class=["'][^"']*\bdark\b/i.test(html)) {
      throw new Error('initial HTML does not include class="dark" on <html>');
    }
    await page.navigate('/explore?smoke_state=empty', { width: 1280, height: 900 });
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

  await runCheck('/create upload reference control is keyboard reachable and mobile has no overflow', async () => {
    await page.navigate('/create', { width: 390, height: 844 });
    await assertNoUnnamedButtons(page, '/create');
    await assertNoHorizontalOverflow(page, '/create mobile');
    const uploadFocusable = await page.evaluate((helpersText) => {
      eval(helpersText);
      const controls = focusableElements(document)
        .filter((element) => /upload reference|drop or upload reference|添加参考|上传参考|涓婁紶/i.test(accessibleName(element)));
      const upload = controls[0];
      if (!upload) return { ok: false, reason: 'upload reference control not found' };
      upload.focus();
      return {
        ok: document.activeElement === upload,
        name: accessibleName(upload),
        tag: upload.tagName.toLowerCase(),
      };
    }, domSnapshotHelpers().text);
    if (!uploadFocusable.ok) throw new Error(uploadFocusable.reason || `upload control did not receive focus (${uploadFocusable.name || 'unnamed'})`);
    if (!uploadFocusable.name) throw new Error('upload reference control has no accessible name');
  });

  await runCheck('AuthModal has dialog semantics, named controls, Esc close, and Tab containment', async () => {
    await page.navigate('/create', { width: 1280, height: 900 });
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
    await assertEscClosesDialog(page, 'AuthModal');
  });

  await runCheck('/workspace preview buttons are keyboard-openable and distinguishable', async () => {
    await page.navigate('/workspace/smoke-task', { width: 1280, height: 900 });
    await page.waitFor(() => document.querySelectorAll('button[aria-label^="Preview"], button[aria-label*="棰勮"]').length >= 2, '/workspace preview buttons');
    await assertNoUnnamedButtons(page, '/workspace');
    const previewStatus = await page.evaluate((helpersText) => {
      eval(helpersText);
      const buttons = Array.from(document.querySelectorAll('button'))
        .filter((element) => isVisible(element))
        .map((element) => ({ element, name: accessibleName(element) }))
        .filter((item) => /^Preview\s+\d+$/i.test(item.name) || /棰勮.*\d+/.test(item.name));
      if (buttons.length < 2) return { ok: false, reason: `expected at least two preview buttons, found ${buttons.length}` };
      const names = buttons.map((item) => item.name);
      if (new Set(names).size !== names.length) return { ok: false, reason: `preview button names are not distinct: ${names.join(', ')}` };
      buttons[0].element.focus();
      return {
        ok: document.activeElement === buttons[0].element,
        names,
      };
    }, domSnapshotHelpers().text);
    if (!previewStatus.ok) throw new Error(previewStatus.reason || 'preview button could not be focused');
    await page.pressKey('Enter');
    const openedByEnter = await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'ImagePreviewModal opened by keyboard', 1_000)
      .then(() => true)
      .catch(() => false);
    if (!openedByEnter) {
      await page.pressKey(' ');
      const openedBySpace = await page.waitFor(() => Boolean(document.querySelector('[role="dialog"]')), 'ImagePreviewModal opened by Space', 1_000)
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
      throw new Error(`Timed out waiting for ImagePreviewModal opened by keyboard; diagnostic=${JSON.stringify(diagnostic)}`);
    }
  });

  await runCheck('ImagePreviewModal has dialog semantics, named controls, Esc close, and Tab containment', async () => {
    await assertDialogSemantics(page, 'ImagePreviewModal');
    await assertNoUnnamedButtons(page, 'ImagePreviewModal open state');
    await assertFocusContained(page, 'ImagePreviewModal');
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

  const vitePort = await getAvailablePort(4317);
  const debugPort = await getAvailablePort(9517);
  const { baseUrl, process: viteProcess } = await startVite(vitePort);
  const browserInfo = await startBrowser(debugPort);
  const connection = new CdpConnection(browserInfo.webSocketDebuggerUrl);

  try {
    const page = await createSmokePage(connection, baseUrl);
    console.log(`Using browser: ${browserInfo.executable}`);
    console.log(`Using temp/cache root: ${TMP_ROOT}`);
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
