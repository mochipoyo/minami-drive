// 特殊モード（sp1「逆走車と突然の横断」）：メニューから始められる・「怒鳴る」ボタンは特殊モードだけに出て採点に影響しない・
// 逆走車／急に渡ってくる女性／お年寄りの場面で、何もしないと減点（または事故）、止まれば「よかった運転」になる・
// ホーンで知らせると逆走車が早めに戻る・慎重に運転すれば最後まで走れて結果に場面の一覧が出る・ボタンがほかの操作部品と重ならない
import { openPage, waitMenu, startStage, ovText } from './lib.mjs';

const SHOUT_TEXT = '危ねえだろ〇ズ人間！';

// 場面の手前に車を移して、決まった運転で走らせる（mode：none＝何もしない／good＝止まってやり過ごす／horn＝止まらずホーンだけ）
const scenario = (page, kind, mode, kmh = 40) => page.evaluate(([kind, mode, kmh]) => {
  const S = window.__sim, P = S.P; const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const ev = S.EVS.find(e => e.sp && e.sp.kind === kind); if (!ev) return { err: 'event not found: ' + kind };
  // 中央通り（z=60、東向きの車線の中央は z=58.5）の区間
  const segs = S.NET.roads.filter(r => r.def.group === 'C1').map(r => ({ x0: Math.min(r.at(0).x, r.at(r.len).x), x1: Math.max(r.at(0).x, r.at(r.len).x) }));
  let xt;
  if (kind === 'wrong') { const sg = segs.find(s => Math.abs(s.x0 - ev.sp.x[0]) < 15); xt = sg.x0 + 6; }
  else { const sg = segs.find(s => ev.sp.x > s.x0 && ev.sp.x < s.x1); xt = Math.max(sg.x0 + 6, ev.sp.x - 75); }
  const V0 = kmh / 3.6;
  Object.assign(P, { x: xt, z: 58.5, h: Math.PI / 2, v: V0, gear: 'D', pbrake: false, belt: true }); S.J2.started = true;
  for (const v of S.VEH.slice()) if (!v.evt && Math.abs(v.z - 60) < 12 && Math.abs(v.x - xt) < 260) v.remove(); // 場面だけを見るため、近くのほかの車を消す
  let honked = false, sawW = false;
  for (let i = 0; i < 30 * 40 && !S.STAGE.over; i++) {
    let V = V0, shift = 0, gentle = false;
    if (mode !== 'none') {
      const W = S.VEH.find(v => v.wrong && !v.hidden && v.x > P.x - 1 && v.x - P.x < 100 && (v.d > 0.9 || sawW));
      if (W && W.d > 0.9) sawW = true;
      if (W) { if (mode === 'good') { V = 0; shift = 0.8; } else if (!honked && W.x - P.x < 85) { honked = true; S.act('hn', true); } }
      if (mode === 'good') {
        const q = S.PEDS.find(p => p.reserved && p.vis && !p.onWalk && p.mode === 'script' && !p.arrived && p.x > P.x - 3 && p.x - P.x < 45);
        if (q) V = Math.min(V, Math.sqrt(2 * 4 * Math.max(0, q.x - P.x - P.L / 2 - 3)));
        const w = S.PEDS.find(p => p.reserved && p.vis && p.onWalk && !p.arrived && p.x > P.x && p.x - P.x < 50); if (w && V > 0) { V = Math.min(V, 25 / 3.6); gentle = true; }
      }
    }
    if (honked && P.horn && i % 30 === 15) S.act('hn', false);
    const e = P.z - (58.5 - shift), he = wrapA(P.h - Math.PI / 2);
    const steer = Math.max(-1, Math.min(1, -(0.5 * e + 1.6 * he)));
    const acc = V > P.v + 0.2 ? Math.min(1, (V - P.v) * 0.6) : 0;
    let brk = V < P.v - 0.2 ? Math.min(1, (P.v - V) * 0.45 + (V === 0 ? 0.25 : 0)) : (V === 0 ? 0.6 : 0); if (gentle) brk = Math.min(brk, 0.3);
    S.INPUT.auto = { acc, brk, steer }; S.step(1);
    if (ev.judged && (kind !== 'wrong' || ev.passed) && i > 30) { for (let k = 0; k < 20; k++) { S.INPUT.auto = { acc: 0, brk: 0.5, steer: 0 }; S.step(1); } break; }
  }
  S.INPUT.auto = null; if (P.horn) S.act('hn', false);
  return { side: ev.sp.side || '', over: S.STAGE.over, crash: window.__lastCrash ? window.__lastCrash.reason : null, log: S.J2.log.map(l => l.id), good: S.J2.good.slice(), judged: !!ev.judged, vPass: Math.round(ev.vPass || 0), minClear: ev.minClear !== undefined ? +(+ev.minClear).toFixed(2) : null };
}, [kind, mode, kmh]);

// 慎重な運転：ふだんはお手本の自動運転。逆走車・道路を渡っている人がいる間は止まって待ち、歩道に人が見えたら速度を落とす
const carefulRun = (page, maxSec) => page.evaluate((maxSec) => {
  const S = window.__sim, P = S.P; let auto = true; S.auto(true, {}); let t = 0; let manualT = 0;
  while (t < maxSec * 30 && !S.STAGE.over) {
    const W = S.VEH.find(v => v.wrong && !v.hidden && v.script && v.x > P.x - 2 && v.x - P.x < 110);
    const ped = S.PEDS.find(p => p.reserved && p.vis && !p.onWalk && p.mode === 'script' && !p.arrived && p.x > P.x - 4 && p.x - P.x < 55);
    const walker = S.PEDS.find(p => p.reserved && p.vis && p.onWalk && !p.arrived && p.x > P.x && p.x - P.x < 60);
    const hold = (W && (W.d > 0.9 || W.v > 0.1)) || ped;
    if (hold) { if (auto) { S.auto(false); auto = false; } manualT++;
      const brk = P.v > 0.3 ? 0.45 : 0.6; S.INPUT.auto = { acc: 0, brk, steer: Math.max(-1, Math.min(1, -(0.5 * (P.z - 58.5) + 1.6 * (P.h - Math.PI / 2)))) };// 急ブレーキにならない強さ（約3.7m/s²）
    } else { if (!auto) { S.INPUT.auto = null; S.auto(true, {}); auto = true; } S.AUTO.maxKmh = walker ? 25 : 0; }
    S.step(1); if (S.STAGE.paused) S.answer(); t++;
  }
  S.auto(false); S.AUTO.maxKmh = 0;
  return { over: S.STAGE.over, t: Math.round(t / 30), score: S.J2.score, log: S.J2.log.map(l => l.id), good: S.J2.good.slice(), crash: window.__lastCrash ? window.__lastCrash.reason : null, manualSec: Math.round(manualT / 30) };
}, maxSec);

export default async function ({ browser, url, rep }) {
  const S = 'special';
  const { ctx, page, errors } = await openPage(browser, url);
  await waitMenu(page);

  // 1) メニュー：「特殊モード」のタブ（いちばん最後）から始められる。説明に時間帯・天気の選択がある
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.tabs .tab')].map(t => t.dataset.k));
  rep.ok(S, 'メニューに「特殊モード」のタブがある（既存の7つのタブのあと）', tabs.join(',') === 'town,city,exp,aori,park,sign,free,special', tabs.join(','));
  await page.click('.tabs .tab[data-k="special"]');
  const rows = await page.evaluate(() => [...document.querySelectorAll('tr.row')].map(r => ({ i: +r.dataset.i, t: r.innerText.replace(/\s+/g, ' ') })));
  rep.ok(S, '特殊モードの一覧に「逆走車と突然の横断」がある', rows.length === 1 && /逆走車と突然の横断/.test(rows[0].t), rows.map(r => r.t.slice(0, 40)).join(' / '));
  await page.click(`tr.row[data-i="${rows[0].i}"]`);
  const intro = await ovText(page);
  const chips = await page.evaluate(() => document.querySelectorAll('.envc').length);
  rep.ok(S, '説明画面に、場面の説明・条文・時間帯と天気の選択がある', /逆走/.test(intro) && /第71条第2号の2/.test(intro) && /第54条第2項/.test(intro) && chips === 5, `chips=${chips}`);
  await page.evaluate(() => { try { localStorage.setItem('mdk_guide_seen', '1'); } catch (e) {} });
  await page.click('#bGo');
  await page.waitForFunction(() => window.__sim.STAGE.running && !document.getElementById('hud').hidden, null, { timeout: 30000 });
  const vis1 = await page.evaluate(() => { const b = document.getElementById('btnShout'); return !b.hidden && b.getClientRects().length > 0; });
  rep.ok(S, 'メニューから始めると、運転画面に「怒鳴る」ボタンが出る', vis1);

  // 2) ほかの教習ではボタンが出ず、G キーを押しても何も起きない
  for (const id of ['s1', 'c1', 's7']) {
    await startStage(page, id, { seed: 1 });
    const r = await page.evaluate(async () => {
      const S = window.__sim; const hidden = document.getElementById('btnShout').hidden; const log0 = S.J2.log.length, sc0 = S.J2.score;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG', key: 'g', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyG', key: 'g', bubbles: true }));
      await new Promise(r => setTimeout(r, 100));
      return { hidden, bubble: !document.getElementById('shoutBubble').hidden, same: S.J2.log.length === log0 && S.J2.score === sc0 };
    });
    rep.ok(S, `${id}：「怒鳴る」ボタンは出ず、G キーでも何も起きない`, r.hidden && !r.bubble && r.same, JSON.stringify(r));
  }

  // 3) 特殊モード：ボタン（マウス）と G キーで怒鳴る。ふきだしの文字は指定どおり。採点は変わらない。少しすると消える
  await page.reload(); await waitMenu(page);
  await startStage(page, 'sp1', { seed: 5 });
  const b = await page.evaluate(() => { const r = document.getElementById('btnShout').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const sc0 = await page.evaluate(() => ({ score: window.__sim.J2.score, n: window.__sim.J2.log.length }));
  await page.mouse.click(b.x, b.y);
  const s1 = await page.evaluate(() => { const e = document.getElementById('shoutBubble'); return { shown: !e.hidden, text: e.textContent, score: window.__sim.J2.score, n: window.__sim.J2.log.length }; });
  rep.ok(S, 'ボタンを押すと「危ねえだろ〇ズ人間！」のふきだしが出る', s1.shown && s1.text === SHOUT_TEXT, JSON.stringify(s1));
  rep.ok(S, '怒鳴っても点数・減点の記録は変わらない', s1.score === sc0.score && s1.n === sc0.n, `${sc0.score}→${s1.score}`);
  await page.waitForTimeout(2600);
  const gone = await page.evaluate(() => document.getElementById('shoutBubble').hidden);
  rep.ok(S, 'ふきだしは少しすると消える', gone);
  await page.keyboard.down('KeyG'); await page.keyboard.up('KeyG');
  const s2 = await page.evaluate(() => !document.getElementById('shoutBubble').hidden);
  rep.ok(S, 'G キーでも怒鳴れる', s2);

  // 4) 場面ごとの確認：何もしない（40km/hのまま）と減点か事故、止まってやり過ごすと「よかった運転」
  const cases = [[1, 'wrong'], [1, 'woman'], [1, 'old'], [2, 'woman'], [4, 'old']];
  for (const [seed, kind] of cases) {
    for (const mode of ['none', 'good']) {
      await page.reload(); await waitMenu(page);
      await startStage(page, 'sp1', { seed });
      const r = await scenario(page, kind, mode);
      const name = { wrong: '逆走車', woman: '急に渡ってくる女性', old: '渡ってくるお年寄り' }[kind] + (r.side ? `（${r.side === 'L' ? '左' : '右'}の歩道から）` : '');
      if (mode === 'none') {
        const ok = kind === 'wrong' ? (r.log.includes('spWrong') || r.crash === '逆走してきた車と衝突しました。')
          : kind === 'woman' ? (r.crash === '歩行者と接触しました。' || r.log.includes('near') || r.log.includes('pedSide'))
            : (r.log.includes('spElder') || r.crash === '歩行者と接触しました。');
        rep.ok(S, `seed${seed} ${name}：何もしないと減点（または事故）`, ok && !r.err, JSON.stringify(r));
      } else {
        const praise = { wrong: 'spWrongOK', woman: 'spJayOK', old: 'spElderOK' }[kind];
        const bad = r.log.filter(id => ['spWrong', 'spElder', 'near', 'pedSide', 'crash', 'hardBrake', 'horn'].includes(id));
        rep.ok(S, `seed${seed} ${name}：止まってやり過ごすと「よかった運転」になり、減点されない`, r.good.includes(praise) && !bad.length && !r.crash && !r.err, JSON.stringify(r));
      }
    }
  }
  // ホーン：止まらずに走り続けても、早めにホーンで知らせれば逆走車は自分の車線に戻る（ホーンの減点もない）
  await page.reload(); await waitMenu(page);
  await startStage(page, 'sp1', { seed: 1 });
  const rh = await scenario(page, 'wrong', 'horn');
  rep.ok(S, '逆走車：ホーンで知らせると早めに戻り、間隔をあけてすれ違う（ホーンの減点なし）', !rh.crash && !rh.log.includes('spWrong') && !rh.log.includes('horn') && rh.minClear >= 1.2, JSON.stringify(rh));

  // 5) 慎重に運転すると最後まで走れて、結果に「特殊モードで起きたこと」（3つとも○）と怒鳴った回数が出る
  await page.reload(); await waitMenu(page);
  await startStage(page, 'sp1', { seed: 5 });
  { const b2 = await page.evaluate(() => { const r = document.getElementById('btnShout').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.click(b2.x, b2.y); await page.waitForTimeout(1300); await page.keyboard.down('KeyG'); await page.keyboard.up('KeyG'); }// 2回怒鳴ってから走る
  const fr = await carefulRun(page, 300);
  await page.waitForTimeout(1500);
  const res = await ovText(page);
  const checks = (res.match(/特殊モードで起きたこと([\s\S]*?)(減点された運転|よかった運転|もう一度)/) || [])[1] || '';
  const okLines = checks.split('\n').filter(l => /^○/.test(l));
  rep.ok(S, '慎重に運転すると最後まで走れる（事故なし・特殊モードの減点なし）', fr.over && !fr.crash && !fr.log.some(id => ['spWrong', 'spElder', 'crash', 'near', 'pedSide'].includes(id)), JSON.stringify(fr));
  rep.ok(S, '結果画面に、逆走車・女性・お年寄りの3つの場面が○で出る', okLines.length === 3 && /逆走車/.test(checks) && /女性/.test(checks) && /お年寄り/.test(checks), checks.replace(/\s+/g, ' ').slice(0, 200));
  rep.ok(S, '結果画面に、怒鳴った回数（採点には影響しない）が出る', /怒鳴った回数：2回（採点には影響しません）/.test(res), (res.match(/怒鳴った回数[^\n]*/) || [''])[0]);
  const nextBtn = await page.evaluate(() => !!document.getElementById('bNext'));
  rep.ok(S, '特殊モードの結果画面には「次の教習へ」が出ない（最後の教習）', !nextBtn);
  const errMain = errors.slice(); await ctx.close();// 次の確認の前に閉じる（描画が続いて、ほかのページの起動が遅くならないように）

  // 6) 「怒鳴る」ボタンが、ほかの操作部品・ミラー・表示と重ならない（PC・スマホ縦横・小さい横画面）
  const lay = [];
  for (const v of ['1366x768', '1280x720', '1024x768', '844x390t', '667x375t', '568x320t', '390x844t']) {
    const touch = v.endsWith('t'); const [w, h] = v.replace('t', '').split('x').map(Number);
    const o = await openPage(browser, url, { viewport: { width: w, height: h }, touch }); lay.push(o.errors);
    await waitMenu(o.page, 120000);
    const box = async (id) => { await startStage(o.page, id, { seed: 1 }); return o.page.evaluate(() => {
      const box = {}; for (const id of ['cluster', 'btnShout', 'ctrlBar', 'touchL', 'touchR', 'mirL', 'mirR', 'mirRear', 'hudTR', 'hudTL', 'lamps']) { const e = document.getElementById(id); let p = e, vis = !!e; while (p) { if (p.hidden) vis = false; p = p.parentElement; } if (!vis || !e.getClientRects().length) continue; const b = e.getBoundingClientRect(); if (b.width < 1) continue; box[id] = [b.left, b.top, b.right, b.bottom]; }
      return box; }); };
    const base = await box('s1'), sp = await box('sp1');
    const ov = (a, b) => a && b && a[0] < b[2] - 0.5 && b[0] < a[2] - 0.5 && a[1] < b[3] - 0.5 && b[1] < a[3] - 0.5;
    const hits = ['ctrlBar', 'touchL', 'touchR', 'mirL', 'mirR', 'mirRear', 'hudTR', 'hudTL'].filter(k => ov(sp.btnShout, sp[k]));
    const inView = sp.btnShout && sp.btnShout[0] >= 0 && sp.btnShout[1] >= 0 && sp.btnShout[2] <= w && sp.btnShout[3] <= h;
    // PC では計器の大きさが変わらない（タッチ操作では計器の中に入る）
    const same = touch || (JSON.stringify(base.cluster) === JSON.stringify(sp.cluster) && JSON.stringify(base.lamps) === JSON.stringify(sp.lamps));
    rep.ok(S, `${v}${touch ? '（タッチ）' : ''}：「怒鳴る」ボタンが画面内にあり、ほかの部品と重ならない${touch ? '' : '・計器の大きさは変わらない'}`, !!sp.btnShout && inView && !hits.length && same, `重なり:${hits.join(',') || 'なし'} btn=${JSON.stringify((sp.btnShout || []).map(Math.round))}`);
    await o.ctx.close();
  }
  const all = errMain.concat(...lay);
  rep.ok(S, 'エラーが出ない（特殊モード）', all.length === 0, all.slice(0, 3).join(' / '));
}
