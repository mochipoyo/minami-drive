// 時間の進み方：画面が隠れたときの一時停止、処理が止まったあとの急な時間差
import { openPage, waitMenu, startStage, setHidden } from './lib.mjs';

export default async function ({ browser, url, rep }) {
  const S = 'timing';
  const { ctx, page, errors } = await openPage(browser, url);
  await waitMenu(page);
  // 高速道路（走行中から始まる教習）で確かめる
  await startStage(page, 'e2', { hold: false });
  await page.waitForTimeout(1200);
  const snap = () => page.evaluate(() => { const S = window.__sim; return { x: S.P.x, z: S.P.z, v: S.P.v, t: S.STAGE.time, score: S.J2.score, log: S.J2.log.length, paused: S.STAGE.paused }; });
  // 1) 画面が隠れたら一時停止し、その間は進まない・減点されない
  const a = await snap();
  await setHidden(page, true);
  await page.waitForTimeout(2500);
  const b = await snap();
  await setHidden(page, false);
  await page.waitForTimeout(500);
  const c = await snap();
  const moved = Math.hypot(c.x - b.x, c.z - b.z);
  rep.ok(S, '画面が隠れたら一時停止し、その間は進まず減点もされない', b.paused && c.paused && moved < 0.01 && c.t === b.t && c.score === a.score && c.log === a.log, `隠れる前 t=${a.t.toFixed(2)} 隠れた後 t=${b.t.toFixed(2)} 戻った後 t=${c.t.toFixed(2)} paused=${c.paused} 移動${moved.toFixed(3)}m`);
  // 再開
  await page.evaluate(() => { const r = document.getElementById('bRes'); if (r) r.click(); });
  // ソフトウェア描画では1フレームが遅いので、時間が進むまで待つ（最大10秒）
  await page.waitForFunction((t) => window.__sim.STAGE.time > t, c.t, { timeout: 10000 }).catch(() => {});
  const d = await snap();
  rep.ok(S, '一時停止から再開すると、続きから走る', !d.paused && d.t > c.t, `t=${d.t.toFixed(2)} paused=${d.paused}`);
  // 2) メインスレッドが1.5秒止まった（重い処理やタブの切り替え）あとの1フレームで、時間が飛ばない
  const e0 = await snap();
  await page.evaluate(() => new Promise(res => { const t0 = performance.now(); while (performance.now() - t0 < 1500) { } requestAnimationFrame(() => requestAnimationFrame(res)); }));
  const e1 = await snap();
  const dt = e1.t - e0.t, dist = Math.hypot(e1.x - e0.x, e1.z - e0.z);
  rep.ok(S, '1.5秒止まったあとでも、ゲームの時間が一気に進まない（1フレーム最大0.05秒。急加速・瞬間移動しない）', dt <= 0.3 && dist <= Math.abs(e0.v) * 0.3 + 0.5, `進んだ時間 ${dt.toFixed(3)}秒・距離 ${dist.toFixed(2)}m（速度 ${(e0.v * 3.6).toFixed(0)}km/h）`);
  rep.ok(S, 'エラーが出ない（時間の進み方）', errors.length === 0, errors.slice(0, 2).join(' / '));
  await ctx.close();
}
