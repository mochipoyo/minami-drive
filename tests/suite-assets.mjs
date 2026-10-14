// 車の3Dモデル（assets/cars/*.glb）と見た目の強化：読み込めたら差し替わる・読み込めなくても今までの形で動く・
// ライトの点灯が引き継がれる・近く用と遠く用の切り替え・品質ごとの材質・空の雲。運転の物理や採点は変えない（sim equivalence は別途）
import { openPage, waitMenu, startStage, runAuto } from './lib.mjs';

const waitAssets = (page) => page.waitForFunction(() => window.__sim.carAssets().ready, null, { timeout: 60000 });

export default async function ({ browser, url, rep }) {
  const S = 'assets';
  // 1) 読み込み：11車種すべて。差し替わった車は body・detail・lights（ltype 属性）を持つ。寸法は CARTYPES のまま
  {
    const { ctx, page, errors } = await openPage(browser, url, { strictResources: true });
    await waitMenu(page); await waitAssets(page);
    const st = await page.evaluate(() => window.__sim.carAssets());
    rep.ok(S, '車の3Dモデルが11車種とも読み込める', st.state === 'ready' && st.loaded === 11 && st.errors === 0, JSON.stringify(st));
    await startStage(page, 'c1', { seed: 1 });
    const r = await page.evaluate(() => { const S = window.__sim; const out = { n: S.VEH.length, glb: 0, procedural: [], bad: [] };
      for (const v of S.VEH) { const m = v.m; if (!m.glb) { out.procedural.push(v.kind === 'car' ? v.type : v.kind); continue; } out.glb++;
        const lt = m.lights.geometry.attributes.ltype; const inGrp = m.body.parent === m.grp && m.lights.parent === m.grp;
        if (!lt || !inGrp || !m.body.geometry.attributes.position) out.bad.push(v.type); }
      const P = S.P.model; out.player = !!P.glb && P.L === 3.99 && P.W === 1.69; return out; });
    const proc = [...new Set(r.procedural)];
    rep.ok(S, '車（car）はすべて3Dモデルに差し替わり、自転車・バイクはそのまま。自車も差し替わる', r.glb > 0 && r.bad.length === 0 && proc.every(k => k === 'bike' || k === 'moto') && r.player, `glb=${r.glb}/${r.n} そのまま=${proc.join(',')} bad=${r.bad.join(',')}`);
    // ライト：ブレーキを踏むと lights の材質が変わる（setCarLights が差し替えた lights に効く）
    const lt = await page.evaluate(() => { const S = window.__sim; const P = S.P; const m = P.model; P.belt = true; P.gear = 'D'; P.pbrake = false; S.J2.started = true;
      S.KEY.KeyW = true; for (let i = 0; i < 60; i++) S.step(1); S.KEY.KeyW = false; const a = m.lights.material; S.KEY.KeyS = true; for (let i = 0; i < 10; i++) S.step(1); S.KEY.KeyS = false; const b = m.lights.material;
      P.blink = 'L'; for (let i = 0; i < 3; i++) S.step(1); const c = m.lights.material; return { brakeChanged: a !== b, blinkChanged: b !== c, lt: m.lights.geometry.attributes.ltype.count > 0 }; });
    rep.ok(S, 'ブレーキ・ウインカーでライトの表示が変わる（差し替えたモデルでも）', lt.brakeChanged && lt.blinkChanged && lt.lt, JSON.stringify(lt));
    // 近く用・遠く用：PC（品質「高」）では近くの車が近く用（lod0）、遠くの車は遠く用（lod1）
    const lod = await page.evaluate(() => { const S = window.__sim; S.auto(true, {}); for (let i = 0; i < 30 * 25; i++) { S.step(1); if (S.STAGE.paused) S.answer(); } S.auto(false); S.render(); const P = S.P; const cam = S.camera().position; let near0 = 0, near1 = 0, far1 = 0, far0 = 0;
      for (const v of S.VEH) { if (!v.m.glb) continue; const d = Math.hypot(v.x - cam.x, v.z - cam.z); if (d < 80) { if (v.m.glb.lod === 0) near0++; else near1++; } else if (d > 100) { if (v.m.glb.lod === 1) far1++; else far0++; } }
      return { near0, near1, far1, far0, q: S.STAGE && document.body.className, player: S.P.model.glb.lod }; });
    rep.ok(S, '近く（80m以内）の車は近く用、遠く（100m以上）の車は遠く用の形になる（PC）', lod.near1 === 0 && lod.far0 === 0 && lod.player === 0 && lod.near0 > 0 && lod.far1 > 0, JSON.stringify(lod));
    rep.ok(S, 'エラーが出ない（読み込みあり）', errors.length === 0, errors.slice(0, 3).join(' / '));
    await ctx.close();
  }
  // 2) 読み込めないとき（assets/ が 404）：今までの形のまま動き、エラーも出ない。走って結果も出る
  {
    const { ctx, page, errors } = await openPage(browser, url, { ignore: /assets\// });
    await page.route('**/assets/**', r => r.abort());
    await page.reload(); await waitMenu(page);
    await page.waitForFunction(() => window.__sim.carAssets().state === 'off', null, { timeout: 60000 }).catch(() => {});
    const st = await page.evaluate(() => window.__sim.carAssets());
    await startStage(page, 's1', { seed: 1 });
    const r = await runAuto(page, 200);
    const glb = await page.evaluate(() => window.__sim.VEH.filter(v => v.m.glb).length + (window.__sim.P.model.glb ? 1 : 0));
    rep.ok(S, 'assets/ が読み込めなくても、今までの形で最後まで走れる', st.state === 'off' && glb === 0 && r.over && r.score === 100, `state=${st.state} glb=${glb} ${r.score}点`);
    rep.ok(S, 'エラーが出ない（読み込みなし）', errors.filter(e => !/assets\//.test(e)).length === 0, errors.slice(0, 3).join(' / '));
    await ctx.close();
  }
  // 3) 見た目の強化：PC（高）では路面が凹凸つきの材質・塗装がクリアコート・空に雲。スマホ（低）では今までの材質で雲なし
  for (const [name, o, high] of [['PC 1366×768', { viewport: { width: 1366, height: 768 } }, true], ['スマホ 844×390', { viewport: { width: 844, height: 390 }, touch: true }, false]]) {
    const { ctx, page, errors } = await openPage(browser, url, o);
    await waitMenu(page);
    const r = await page.evaluate(() => { const S = window.__sim; let road = null; S.scene().traverse(o => { if (o.userData.batchKey === 'road' && !road) road = o.material; });
      const sky = S.scene().children.find(o => o.material && o.material.uniforms && o.material.uniforms.cloudAmt); return { road: road && road.type, normal: !!(road && road.normalMap), paint: S.P.model.body.material.type, cloud: sky ? sky.material.uniforms.cloudAmt.value : null }; });
    const ok = high ? (r.road === 'MeshStandardMaterial' && r.normal && r.paint === 'MeshPhysicalMaterial' && r.cloud > 0) : (r.road === 'MeshLambertMaterial' && !r.normal && r.cloud === 0);
    rep.ok(S, `${name}：${high ? '路面は凹凸つき、塗装はクリアコート、空に雲' : '路面と塗装は今までの材質、雲なし'}`, ok, JSON.stringify(r));
    // 雨：路面が濡れた見た目（粗さが下がる）に変わり、晴れに戻すと戻る
    if (high) { const w = await page.evaluate(() => { const S = window.__sim; let road = null; S.scene().traverse(o => { if (o.userData.batchKey === 'road' && !road) road = o.material; }); S.setEnv('rain'); const a = road.roughness; S.setEnv('day'); const b = road.roughness; return { a, b }; });
      rep.ok(S, '雨では路面が濡れた見た目（粗さが下がる）になり、晴れで戻る', w.a < 0.6 && w.b > 0.8, JSON.stringify(w)); }
    rep.ok(S, `エラーが出ない（${name}）`, errors.length === 0, errors.slice(0, 3).join(' / '));
    await ctx.close();
  }
}
