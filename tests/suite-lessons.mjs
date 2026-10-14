// 26教習と特殊モード：メニューから開始 → 運転 → 最初からやり直す → 原簿（メニュー）にもどる。代表的な教習は最後まで走って結果を確認
import { openPage, waitMenu, startStage, runAuto, ovText } from './lib.mjs';

// 自動運転（お手本）で最後まで走れることを確認済みの教習（乱数を固定した場合）
const FINISH = (process.env.FINISH || 's1,s4,e1,e3').split(',').filter(Boolean);

export default async function ({ browser, url, rep }) {
  const S = 'lessons';
  const { ctx, page, errors } = await openPage(browser, url);
  await waitMenu(page);
  const stages = await page.evaluate(() => window.__sim.STAGES.map((s, i) => ({ id: s.id, cat: s.cat, name: s.name, i, scoring: s.scoring !== false })));
  // 既存の26教習（順番も同じ）のあとに、特殊モードが1つ
  const BASE26 = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 'e1', 'e2', 'e3', 'e4', 'a1', 'e5', 'c1', 'c2', 'c3', 'f2', 'p1', 'p2', 'p3', 'p4', 'sg1', 'sg2', 'sg3', 'a2', 'a3'];
  const ids = stages.map(s => s.id);
  rep.ok(S, '既存の26教習がそろっていて、順番も変わらない', BASE26.every((id, i) => ids[i] === id), ids.slice(0, 26).join(','));
  rep.ok(S, 'そのあとに特殊モードが1つ、東京（新宿）が5つと自由走行が1つある（26＋1＋6）', stages.length === 33 && ids[26] === 'sp1' && stages[26].cat === 'special' && ids.slice(27).join(',') === 't1,t2,t3,t4,t5,f3' && stages.slice(27, 32).every(s => s.cat === 'tokyo') && stages[32].cat === 'free', `${stages.length}教習 ${ids.slice(26).join(',')}`);
  const only = (process.env.ONLY_STAGES || '').split(',').filter(Boolean);
  for (const st of stages) {
    if (only.length && !only.includes(st.id)) continue;
    const e0 = errors.length; let step = 'メニュー';
    try {
      await page.click(`.tabs .tab[data-k="${st.cat}"]`);
      step = '一覧'; await page.click(`tr.row[data-i="${st.i}"]`);
      step = '説明'; await page.click('#bGo');
      step = '開始'; await page.waitForFunction((i) => window.__sim.STAGE.running && window.__sim.STAGE.idx === i && !document.getElementById('hud').hidden, st.i, { timeout: 30000 });
      // 運転が進むまで待つ（ソフトウェア描画では最初のフレームが遅いことがある。最大15秒）
      await page.waitForFunction(() => window.__sim.STAGE.time > 0.05, null, { timeout: 15000 }).catch(() => {});
      const a = await page.evaluate(() => ({ t: window.__sim.STAGE.time, score: window.__sim.J2.score, paused: window.__sim.STAGE.paused }));
      step = '一時停止'; await page.keyboard.press('Escape'); await page.waitForSelector('#bRe', { timeout: 5000 });
      step = 'やり直し'; await page.click('#bRe');
      await page.waitForTimeout(800);
      const b = await page.evaluate((i) => ({ run: window.__sim.STAGE.running, idx: window.__sim.STAGE.idx === i, t: window.__sim.STAGE.time, score: window.__sim.J2.score, ov: !document.getElementById('ov').hidden }), st.i);
      step = 'メニューへ'; await page.keyboard.press('Escape'); await page.waitForSelector('#bMenu', { timeout: 5000 }); await page.click('#bMenu');
      await waitMenu(page, 15000);
      const ok = a.t > 0 && a.score === 100 && b.run && b.idx && b.t < 2 && b.score === 100 && errors.length === e0;
      rep.ok(S, `${st.id} ${st.name}：開始・やり直し・メニューへもどる`, ok, `開始後t=${a.t.toFixed(1)} やり直し後t=${b.t.toFixed(1)} ${errors.slice(e0, e0 + 2).join(' / ')}`);
    } catch (e) {
      rep.ok(S, `${st.id} ${st.name}：開始・やり直し・メニューへもどる`, false, `${step}で失敗：${e.message.split('\n')[0]}`);
      await page.evaluate(() => { try { window.__sim.STAGE.paused = false; } catch (e) {} }).catch(() => {});
      await page.reload(); await waitMenu(page);
    }
  }
  // 代表的な教習を最後まで（お手本の自動運転）。終了 → 結果画面 → もう一度 で再開できること
  for (const id of FINISH) {
    const st = stages.find(s => s.id === id); if (!st) continue;
    await page.reload(); await waitMenu(page); // 前の教習の影響（信号の周期など）をなくす
    await startStage(page, id);
    const r = await runAuto(page, 300);
    await page.waitForTimeout(1500);
    const t = await ovText(page);
    const resultOK = r.over && (/合格|不合格/.test(t) || /事故が起きました/.test(t));
    let again = false;
    if (resultOK) { await page.click('#bAgain'); await page.waitForTimeout(600); again = await page.evaluate((i) => window.__sim.STAGE.running && window.__sim.STAGE.idx === i && window.__sim.STAGE.time < 2, st.i); }
    rep.ok(S, `${id} ${st.name}：最後まで走って結果が出て、「もう一度」で再開できる`, resultOK && again, `${r.score}点 ${r.log.join(',')} ${t.match(/合格|不合格|事故が起きました/)?.[0] || ''}`);
    await page.evaluate(() => { window.__hold = false; });
    await page.keyboard.press('Escape'); await page.waitForSelector('#bMenu', { timeout: 5000 }).catch(() => {}); await page.click('#bMenu').catch(() => {});
    await waitMenu(page, 15000).catch(() => {});
  }
  rep.ok(S, 'エラーが出ない（26教習と特殊モード）', errors.length === 0, errors.slice(0, 3).join(' / '));
  await ctx.close();
}
