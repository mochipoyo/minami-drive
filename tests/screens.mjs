// 比較用のスクリーンショットを撮る（合否の判定はしない）。
// 使い方：LABEL=after node screens.mjs   → results/screens/after/ に保存
//   SITE_ROOT=別のフォルダ で、変更前の版などを撮れる。SIZES=pc1366,phoneL のように絞れる
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, openPage, waitMenu, startStage, runAuto, RESULTS_DIR } from './lib.mjs';

const LABEL = process.env.LABEL || 'latest';
const OUT = path.join(RESULTS_DIR, 'screens', LABEL);
fs.mkdirSync(OUT, { recursive: true });
const SIZES = {
  pc1920: { viewport: { width: 1920, height: 1080 } },
  pc1366: { viewport: { width: 1366, height: 768 } },
  phoneP: { viewport: { width: 390, height: 844 }, touch: true },
  phoneL: { viewport: { width: 844, height: 390 }, touch: true },
};
const pick = (process.env.SIZES || Object.keys(SIZES).join(',')).split(',');
// 運転中の場面：教習を始めて、お手本の自動運転で少し走らせてから撮る
const DRIVE = [['town', 's1', 4], ['exp', 'e2', 3], ['city', 'c1', 4], ['park', 'p3', 3], ['night', 'c3', 4]];

const srv = await startServer();
const browser = await launch();
for (const k of pick) {
  const { ctx, page, errors } = await openPage(browser, srv.url, SIZES[k]);
  await waitMenu(page);
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${k}_${name}.png`), timeout: 120000 });
  await shot('menu');
  for (const [name, id, sec] of DRIVE) {
    await page.reload(); await waitMenu(page);
    await startStage(page, id);
    await page.evaluate((sec) => { const S = window.__sim; S.auto(true, {}); for (let i = 0; i < sec * 30; i++) { S.step(1); if (S.STAGE.paused) S.answer(); } S.auto(false); S.render(); S.render(); }, sec);
    await shot(name);
  }
  // 結果画面：はじめての路上を最後まで
  await page.reload(); await waitMenu(page);
  await startStage(page, 's1');
  await runAuto(page, 200);
  await page.waitForTimeout(1500);
  await shot('result');
  // 標識クイズ
  await page.reload(); await waitMenu(page);
  await page.click('.tab[data-k="sign"]'); await page.click('#bQuiz'); await page.waitForTimeout(400);
  await shot('quiz');
  console.log(k, 'done', errors.length ? 'errors: ' + errors.slice(0, 2).join(' / ') : '');
  await ctx.close();
}
await browser.close(); await srv.close();
console.log('saved to', OUT);
