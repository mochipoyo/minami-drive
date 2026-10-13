// テスト共通の道具：このリポジトリを手元のWebサーバーで配信し、Playwright（Chromium）で開く。
// three.js は CDN の代わりに node_modules の同じ版（r128）を返すので、オフラインでも同じ結果になる。
// フォント（Google Fonts）はわざと読み込まない（フォントが読み込めないときの起動確認も兼ねる）。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
// SITE_ROOT を指定すると、別のフォルダ（変更前の版など）を配信して同じテストを実行できる
export const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : path.resolve(TESTS_DIR, '..');
export const RESULTS_DIR = path.join(TESTS_DIR, 'results');
const THREE_FILE = path.join(TESTS_DIR, 'node_modules', 'three', 'build', 'three.min.js');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml' };

export function startServer(root = ROOT) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const fp = path.join(root, p);
      if (!fp.startsWith(root) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(fp).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => new Promise(r => srv.close(r)) }));
  });
}

// GPUのない環境でも動くよう、既定ではソフトウェア描画（SwiftShader）。GL=gpu で実際のGPUを使う
export function launch() {
  const args = process.env.GL === 'gpu' ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  return chromium.launch({ args, headless: process.env.HEADED ? false : true });
}

// 乱数を固定する（テストのたびに同じ交通・歩行者になるように）。ゲームの R()（教習の乱数）は window.__seed で固定。
// 注意：同じページで教習を続けると、信号の周期などが前の教習に左右される。結果を比べるときはページを読み込み直してから始める
const seedRandom = (seed) => { let s = seed >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

export async function openPage(browser, url, o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1366, height: 768 }, hasTouch: !!o.touch, isMobile: !!o.touch, deviceScaleFactor: o.dpr || 1 });
  const page = await ctx.newPage();
  // ソフトウェア描画や同時実行で遅い環境でも止まらないよう、待ち時間を長めにする
  page.setDefaultNavigationTimeout(120000); page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (/Failed to load resource/.test(t) && !o.strictResources) return; if (o.ignore && o.ignore.test(t)) return; errors.push('console: ' + t.split('\n')[0].slice(0, 200)); });
  if (o.seedRandom !== false) await page.addInitScript(seedRandom, o.randomSeed || 12345);
  for (const s of o.initScripts || []) await page.addInitScript(s.fn, s.arg);
  const block = o.block || [];
  await page.route('https://cdnjs.cloudflare.com/**', r => block.includes('cdnjs') ? r.abort() : r.fulfill({ path: THREE_FILE, contentType: 'text/javascript' }));
  await page.route('https://cdn.jsdelivr.net/**', r => block.includes('jsdelivr') ? r.abort() : r.fulfill({ path: THREE_FILE, contentType: 'text/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.route('https://fonts.gstatic.com/**', r => r.abort());
  if (o.goto !== false) await page.goto(url);
  return { ctx, page, errors };
}

export const waitSim = (page, ms = 60000) => page.waitForFunction(() => !!window.__sim, null, { timeout: ms });
export const waitMenu = (page, ms = 60000) => page.waitForFunction(() => !!window.__sim && !document.getElementById('ov').hidden && !!document.querySelector('.tabs .tab'), null, { timeout: ms });
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 教習を直接はじめる（UIを通さない）。hold=true ならメインループを止め、step() で決まった刻みで進める
export async function startStage(page, id, { seed = 1, hold = true } = {}) {
  await page.evaluate(([id, seed, hold]) => {
    try { localStorage.setItem('mdk_guide_seen', '1'); } catch (e) {}
    window.__hold = hold; window.__seed = seed; const S = window.__sim;
    S.startStage(S.STAGES.findIndex(s => s.id === id));
    document.getElementById('ov').hidden = true; const g = document.getElementById('guide'); if (g) g.hidden = true;
  }, [id, seed, hold]);
}
// 発進の準備（ベルト・D・パーキングブレーキ解除）を済ませる
export const readyToGo = (page) => page.evaluate(() => { const S = window.__sim, P = S.P; P.belt = true; P.gear = 'D'; P.pbrake = false; S.J2.started = true; });
// 自動運転（お手本）で最後まで走らせる。maxSec はゲーム内の秒
export const runAuto = (page, maxSec = 300) => page.evaluate((maxSec) => {
  const S = window.__sim; S.auto(true, {}); let t = 0;
  while (t < maxSec && !S.STAGE.over) { for (let k = 0; k < 30 && !S.STAGE.over; k++) { S.step(1); if (S.STAGE.paused) S.answer(); } t++; }
  S.auto(false); return { over: S.STAGE.over, t, score: S.J2.score, major: S.J2.major, log: S.J2.log.map(l => l.id) };
}, maxSec);
// 画面の非表示・表示を模擬する（別のアプリやタブに切り替えたとき）
export const setHidden = (page, hidden) => page.evaluate((hidden) => {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  Object.defineProperty(document, 'visibilityState', { value: hidden ? 'hidden' : 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);
export const ovText = (page) => page.evaluate(() => document.getElementById('ov').hidden ? '' : document.getElementById('ov').innerText);
export const bootText = (page) => page.evaluate(() => { const m = document.getElementById('loadMsg'); return m && !m.hidden ? m.innerText.replace(/\s+/g, ' ') : ''; });

// 結果を集める
export class Report {
  constructor() { this.rows = []; }
  ok(suite, name, pass, detail = '') {
    this.rows.push({ suite, name, pass: !!pass, detail: String(detail || '') });
    console.log(`${pass ? '  ✓' : '  ✗'} [${suite}] ${name}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`);
  }
  get failed() { return this.rows.filter(r => !r.pass); }
  save(file) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(RESULTS_DIR, file), JSON.stringify({ date: new Date().toISOString(), passed: this.rows.length - this.failed.length, total: this.rows.length, rows: this.rows }, null, 2));
  }
}
