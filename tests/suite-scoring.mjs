// 採点：100点から始まる・減点・重大違反・合格判定・自由走行・0点の下限・事故・ベスト記録の保存と復元
import { openPage, waitMenu, startStage, runAuto, ovText } from './lib.mjs';

// 自動運転で走り出してから、一定時間だけ速度を上げる（速度超過を起こす）
const speedBurst = (page, overKmh, sec = 2.2) => page.evaluate(([overKmh, sec]) => {
  const S = window.__sim; S.auto(true, {}); let k = 0;
  while (S.P.v < 3 && k < 30 * 60) { S.step(1); if (S.STAGE.paused) S.answer(); k++; }
  const lim = S.J2.limit.v; const v = (lim + overKmh) / 3.6; const v0 = S.P.v;
  for (let i = 0; i < Math.round(sec * 30); i++) { S.P.v = v; S.step(1); }
  S.P.v = v0; // 元の速度にもどす（急ブレーキなど、ほかの減点を起こさないため）
  return { lim, log: S.J2.log.map(l => l.id), score: S.J2.score, major: S.J2.major };
}, [overKmh, sec]);

export default async function ({ browser, url, rep }) {
  const S = 'scoring';
  const { ctx, page, errors } = await openPage(browser, url);
  await waitMenu(page);

  // 1) 100点から始まり、正しく走れば合格。記録が保存され、再読み込み後もメニューに出る
  await startStage(page, 's1');
  const s0 = await page.evaluate(() => window.__sim.J2.score);
  const r1 = await runAuto(page, 200);
  await page.waitForTimeout(1500);
  const t1 = await ovText(page);
  rep.ok(S, '100点から始まり、減点なしで走り終えると「合格」と点数が出る', s0 === 100 && r1.over && r1.score === 100 && /合格/.test(t1) && /100/.test(t1), `開始${s0}点 → ${r1.score}点 ${r1.log.join(',')}`);
  const best1 = await page.evaluate(() => JSON.parse(localStorage.getItem('mdk_best') || 'null'));
  rep.ok(S, 'ベスト記録が保存される', best1 && best1.s1 && best1.s1.score === 100 && best1.s1.pass === true, JSON.stringify(best1));
  await page.reload(); await waitMenu(page);
  const row = await page.evaluate(() => { const r = document.querySelector('tr.row[data-i="0"]'); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
  rep.ok(S, '再読み込みしても、メニューにベスト記録（100点・合格）が出る', /100/.test(row) && /合格/.test(row), row.slice(0, 60));

  // 2) 速度超過（+12km/h）：減点され、結果に違反と条文が出る。ベスト記録は下がらない
  await page.reload(); await waitMenu(page);
  await startStage(page, 's1');
  const b2 = await speedBurst(page, 12);
  const r2 = await runAuto(page, 200);
  await page.waitForTimeout(1500);
  const t2 = await ovText(page);
  rep.ok(S, '速度超過で10点減点される', b2.log.includes('speed') && r2.score === 90, `上限${b2.lim}km/h 減点:${r2.log.join(',')} → ${r2.score}点`);
  rep.ok(S, '結果画面に、減点された運転と条文が出る', /速度超過/.test(t2) && /道路交通法/.test(t2), t2.match(/減点された運転[\s\S]{0,60}/)?.[0]?.replace(/\s+/g, ' ') || '');
  const best2 = await page.evaluate(() => JSON.parse(localStorage.getItem('mdk_best') || 'null'));
  rep.ok(S, '点数が低い回ではベスト記録を下げない', best2.s1.score === 100, JSON.stringify(best2.s1));

  // 3) 重大な違反（20km/h以上の速度超過）：70点以上でも不合格
  await page.reload(); await waitMenu(page);
  await startStage(page, 's1');
  const b3 = await speedBurst(page, 25);
  const r3 = await runAuto(page, 200);
  await page.waitForTimeout(1500);
  const t3 = await ovText(page);
  rep.ok(S, '重大な違反があると、70点以上でも「不合格」になる', b3.log.includes('speedBig') && r3.major && r3.score >= 70 && /不合格/.test(t3) && /重大な違反あり/.test(t3), `${r3.score}点 major=${r3.major}`);

  // 4) 0点の下限：違反を続けても0点より下がらない
  const r4 = await page.evaluate(() => {
    const S = window.__sim; S.startStage(S.STAGES.findIndex(s => s.id === 's1')); document.getElementById('ov').hidden = true;
    const P = S.P; P.belt = true; P.gear = 'D'; P.pbrake = false; S.J2.started = true; S.step(5);
    const x = P.x, z = P.z, h = P.h; const v = (S.J2.limit.v + 25) / 3.6; let minScore = 100;
    for (let i = 0; i < 30 * 75; i++) { P.v = v; S.step(1); P.x = x; P.z = z; P.h = h; minScore = Math.min(minScore, S.J2.score); }
    return { score: S.J2.score, minScore, n: S.J2.log.length };
  });
  rep.ok(S, '違反を続けても、点数は0点より下がらない', r4.score === 0 && r4.minScore === 0, `違反${r4.n}回 → ${r4.score}点`);

  // 5) 自由走行（採点なし）：速度超過しても減点されず、記録も保存されない
  await startStage(page, 's7');
  const b5 = await speedBurst(page, 30, 3);
  const best5 = await page.evaluate(() => JSON.parse(localStorage.getItem('mdk_best') || '{}'));
  await page.evaluate(() => { window.__hold = false; });
  await page.keyboard.press('Escape'); await page.click('#bMenu'); await waitMenu(page, 15000);
  rep.ok(S, '自由走行（採点なし）では減点されず、記録も保存されない', b5.log.length === 0 && b5.score === 100 && !best5.s7, `減点${b5.log.length} ${b5.score}点 s7記録=${JSON.stringify(best5.s7 || null)}`);

  // 6) 事故：前の車に追突すると中止の画面になり、記録は更新されない
  await page.reload(); await waitMenu(page);
  await startStage(page, 's1');
  const r6 = await page.evaluate(() => {
    const S = window.__sim, P = S.P; P.belt = true; P.gear = 'D'; P.pbrake = false; S.J2.started = true; S.step(30);
    const car = S.VEH.filter(v => !v.hidden && v.type !== 'bike' && v.lane).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
    if (!car) return { err: 'no car' };
    const fx = Math.sin(car.h), fz = -Math.cos(car.h);
    P.x = car.x - fx * 7; P.z = car.z - fz * 7; P.h = car.h; P.v = car.v + 8; P.loc = S.locate(P.x, P.z, 0);
    for (let i = 0; i < 90 && !S.STAGE.over; i++) { P.v = Math.max(P.v, car.v + 8); S.step(1); }
    return { over: S.STAGE.over, score: S.J2.score, major: S.J2.major, log: S.J2.log.map(l => l.id) };
  });
  await page.waitForTimeout(1600);
  const t6 = await ovText(page);
  const best6 = await page.evaluate(() => JSON.parse(localStorage.getItem('mdk_best') || 'null'));
  rep.ok(S, '事故を起こすと運転を中止し、「事故が起きました」の画面になる', r6.over && r6.log.includes('crash') && /事故が起きました/.test(t6), JSON.stringify(r6));
  rep.ok(S, '事故の回はベスト記録を更新しない', best6 && best6.s1 && best6.s1.score === 100, JSON.stringify(best6 && best6.s1));
  rep.ok(S, 'エラーが出ない（採点）', errors.length === 0, errors.slice(0, 2).join(' / '));
  await ctx.close();
}
