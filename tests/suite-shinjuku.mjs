// 東京・新宿駅周辺の地図（実在の地図データ）：読み込み、多角形の交差点、教習が自動運転で最後まで走れること、
// 地図データを読み込めないときの案内、既存の地図（みなみ町など）が多角形の交差点を使わないこと
import { openPage, waitMenu, startStage, runAuto, ovText } from './lib.mjs';

const waitMap = (page) => page.waitForFunction(() => ['ready', 'off'].includes(window.__sim.shinjuku().state), null, { timeout: 120000 });

export default async function ({ browser, url, rep }) {
  const S = 'shinjuku';
  // 1) 読み込みと道路網
  {
    const { ctx, page, errors } = await openPage(browser, url, { strictResources: true });
    await waitMenu(page); await waitMap(page);
    const st = await page.evaluate(() => window.__sim.shinjuku());
    rep.ok(S, '新宿の地図データ（assets/maps/shinjuku.json）が裏で読み込まれる', st.state === 'ready' && st.n > 300, JSON.stringify(st));
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.tabs .tab')].map(e => e.textContent));
    rep.ok(S, '原簿に「東京」の区分がある', tabs.some(t => /東京/.test(t)), tabs.join('|'));
    await startStage(page, 'f3', { seed: 1 });
    const net = await page.evaluate(() => { const S = window.__sim; const N = S.NET; const xs = N.nodes.filter(n => n.kind === 'x'); const P = S.P;
      return { map: N.map.id, roads: N.roads.length, x: xs.length, poly: xs.filter(n => n.poly && n.poly.length >= 4).length, signals: xs.filter(n => n.signal).length, lanes: N.lanes.length, conns: N.conns.length, veh: S.VEH.length, peds: S.PEDS.length, loc: P.loc && P.loc.kind + ':' + (P.loc.band || '') }; });
    rep.ok(S, '道路網ができる（道路300本以上・交差点150以上・すべて多角形・信号あり・車と歩行者が出る）', net.map === 'shinjuku' && net.roads >= 300 && net.x >= 150 && net.poly === net.x && net.signals >= 30 && net.veh > 40 && net.peds > 100, JSON.stringify(net));
    rep.ok(S, '自車は車線の上から始まる', net.loc === 'road:lane', net.loc);
    // 交差点の接続路（右左折の線）は、交差点の中（または接続路のそば）として走れる所になっている
    const drv = await page.evaluate(() => { const S = window.__sim; let bad = 0, tot = 0; for (const c of S.NET.conns) { for (let i = 1; i < c.pts.length - 1; i += 3) { tot++; const q = S.locate(c.pts[i].x, c.pts[i].z); if (!q || (q.kind === 'road' && q.band !== 'lane' && q.band !== 'shoulder' && !(q.band === 'median'))) bad++; } } return { bad, tot }; });
    rep.ok(S, '右左折の線の上はすべて走れる所（縁石に当たらない）', drv.bad === 0, JSON.stringify(drv));
    // 右折レーン：分離帯の広い幹線の、信号のある交差点の手前にだけ付く（02g shinjukuTurnLanes）。対向車線と重ならない
    const tl = await page.evaluate(() => { const S = window.__sim; const ps = []; for (const r of S.NET.roads) for (const p of r.patches) if (p.kind === 'turnR') ps.push({ r, p });
      const bad = ps.filter(({ r, p }) => { const n = p.dir > 0 ? r.endNode : r.startNode; const hasR = p.conns.some(c => c.turn === 'R'); const overlap = r.nB && r.nF && r.med.w < r.w - 0.05; return !n || !n.signal || !hasR || overlap || !p.inLeg; });
      const names = [...new Set(ps.map(({ r }) => r.name))]; return { n: ps.length, bad: bad.length, names }; });
    rep.ok(S, '右折レーンが幹線（青梅街道・北通り・ふれあい通り・甲州街道など）の信号交差点の手前にあり、右折の線につながる', tl.n >= 20 && tl.bad === 0 && tl.names.includes('北通り') && tl.names.includes('ふれあい通り'), JSON.stringify(tl));
    // 近い信号どうしは同じ周期（02g shinjukuSignalSync）：靖国通りの新宿区役所前（n30 付近）の信号は、隣の信号と同じ表示
    const sync = await page.evaluate(() => { const S = window.__sim; let best = null, bd = 1e9; for (const n of S.NET.nodes) { if (!n.signal) continue; const d = Math.hypot(n.x - 203, n.z + 307); if (d < bd) { bd = d; best = n; } }
      const g = S.SIGS.get(best.k); const near = [...S.SIGS.values()].filter(s => s !== g && Math.hypot(s.n.x - best.x, s.n.z - best.z) < 70); return { id: best.id, off: g.def.offset, same: near.every(s => s.cur[0] === g.cur[0] && s.cur[1] === g.cur[1] && Math.abs(s.t - g.t) < 0.01), near: near.length }; });
    rep.ok(S, '近い信号どうし（靖国通りの歌舞伎町前）は同じ周期にそろっている', sync.off === 0 && sync.near >= 1 && sync.same, JSON.stringify(sync));
    rep.ok(S, 'エラーが出ない（読み込み・組み立て）', errors.length === 0, errors.slice(0, 3).join(' / '));
    await ctx.close();
  }
  // 2) 教習を自動運転で最後まで（事故なし）。t5 は右折レーンから右折すること（rightPos なし）
  for (const id of ['t1', 't2', 't3', 't4', 't5']) {
    const { ctx, page, errors } = await openPage(browser, url);
    await waitMenu(page); await waitMap(page);
    await startStage(page, id, { seed: 1 });
    const r = await runAuto(page, 420);
    const extra = id === 't5' ? !r.log.includes('rightPos') : id === 't4' ? !r.log.includes('curb') && !r.log.includes('noEntry') : true;
    rep.ok(S, `${id}：自動運転で停止位置まで走りきれる（事故なし${id === 't5' ? '・右折レーンから右折' : id === 't4' ? '・縁石や逆走なし' : ''}）`, r.over && !r.log.includes('crash') && r.score >= 40 && extra, `over=${r.over} ${r.t}秒 ${r.score}点 ${r.log.join(',')}`);
    rep.ok(S, `エラーが出ない（${id}）`, errors.length === 0, errors.slice(0, 3).join(' / '));
    await ctx.close();
  }
  // 3) 地図データを読み込めないとき：案内を出して原簿に戻れる。みなみ町の教習はそのまま動く
  {
    const { ctx, page, errors } = await openPage(browser, url, { ignore: /assets\/maps/ });
    await page.route('**/assets/maps/**', r => r.abort());
    await page.reload(); await waitMenu(page); await waitMap(page);
    const st = await page.evaluate(() => window.__sim.shinjuku());
    await page.evaluate(() => { const S = window.__sim; S.startStage(S.STAGES.findIndex(s => s.id === 't1')); });
    await page.waitForFunction(() => !document.getElementById('ov').hidden && /読み込めませんでした|読み込んでいます/.test(document.getElementById('ov').innerText), null, { timeout: 30000 }).catch(() => {});
    const txt = await ovText(page);
    rep.ok(S, '地図データを読み込めないときは、始めずに案内を出す', st.state === 'off' && /読み込めませんでした/.test(txt), `state=${st.state} ${txt.slice(0, 60)}`);
    const back = await page.evaluate(() => { const b = document.getElementById('bMenuSj'); if (!b) return 'nobtn'; b.click(); return document.getElementById('ov').innerText.slice(0, 20); });
    rep.ok(S, '「原簿にもどる」で原簿に戻れる', back !== 'nobtn', back);
    await startStage(page, 's1', { seed: 1 });
    const r = await runAuto(page, 200);
    rep.ok(S, 'みなみ町の教習はそのまま走れる', r.over && r.score === 100, `${r.over} ${r.score}`);
    rep.ok(S, 'エラーが出ない（読み込めないとき）', errors.filter(e => !/assets\/maps/.test(e)).length === 0, errors.slice(0, 3).join(' / '));
    await ctx.close();
  }
  // 4) 既存の地図は多角形の交差点を使わない（今までと同じ形）
  {
    const { ctx, page, errors } = await openPage(browser, url);
    await waitMenu(page);
    const r = {};
    for (const id of ['s1', 'c1', 'p1']) { await startStage(page, id, { seed: 1 }); r[id] = await page.evaluate(() => { const N = window.__sim.NET; return { map: N.map.id, poly: N.nodes.filter(n => n.poly).length, fil: N.nodes.filter(n => n.kind === 'x' && n.fil.length).length }; }); }
    rep.ok(S, 'みなみ町・さくら区・駐車場の交差点は今までの形（多角形なし・隅切りあり）', Object.values(r).every(v => v.poly === 0) && r.s1.fil > 0 && r.c1.fil > 0, JSON.stringify(r));
    rep.ok(S, 'エラーが出ない（既存の地図）', errors.length === 0, errors.slice(0, 3).join(' / '));
    await ctx.close();
  }
}
