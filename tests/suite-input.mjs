// 入力が押しっぱなしにならないか（キーボード・タッチ）
import { openPage, waitMenu, startStage, readyToGo, setHidden } from './lib.mjs';

export default async function ({ browser, url, rep }) {
  const S = 'input';
  // 1) キーボード：押したままウィンドウのフォーカスが外れる
  {
    const { ctx, page, errors } = await openPage(browser, url);
    await waitMenu(page); await startStage(page, 's1', { hold: false }); await readyToGo(page);
    await page.keyboard.down('KeyW'); await page.keyboard.down('KeyA'); await page.keyboard.down('KeyH');
    await page.waitForTimeout(400);
    const a = await page.evaluate(() => ({ W: !!window.__sim.KEY.KeyW, A: !!window.__sim.KEY.KeyA, horn: !!window.__sim.P.horn }));
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(200);
    const b = await page.evaluate(() => ({ W: !!window.__sim.KEY.KeyW, A: !!window.__sim.KEY.KeyA, horn: !!window.__sim.P.horn }));
    rep.ok(S, 'キーを押したままフォーカスが外れたら、アクセル・ハンドル・クラクションを離した状態にする', a.W && a.A && a.horn && !b.W && !b.A && !b.horn, `押下中${JSON.stringify(a)} → 外れた後${JSON.stringify(b)}`);
    await page.keyboard.up('KeyW'); await page.keyboard.up('KeyA'); await page.keyboard.up('KeyH');
    // 矢印キーとスペースでページがスクロールしない（既存の動作）
    await page.keyboard.down('ArrowDown'); await page.keyboard.up('ArrowDown'); await page.keyboard.press('Space');
    const sc = await page.evaluate(() => [window.scrollX, window.scrollY]);
    rep.ok(S, '矢印キー・スペースでページがスクロールしない', sc[0] === 0 && sc[1] === 0, JSON.stringify(sc));
    rep.ok(S, 'キーボード操作でエラーが出ない', errors.length === 0, errors.slice(0, 2).join(' / '));
    await ctx.close();
  }
  // 2) タッチ：ペダルとハンドルを触ったまま、ほかのアプリに切り替える（指は離していない）
  {
    const { ctx, page, errors } = await openPage(browser, url, { viewport: { width: 844, height: 390 }, touch: true });
    await waitMenu(page); await startStage(page, 's1', { hold: false }); await readyToGo(page);
    await page.waitForTimeout(400);
    const cdp = await ctx.newCDPSession(page);
    const at = (id, fx = 0.5, fy = 0.5) => page.evaluate(([id, fx, fy]) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left + r.width * fx, y: r.top + r.height * fy }; }, [id, fx, fy]);
    const acc = await at('pedAcc'), w0 = await at('wheel', 0.5, 0.1), w1 = await at('wheel', 0.9, 0.5);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: acc.x, y: acc.y, id: 1 }, { x: w0.x, y: w0.y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: acc.x, y: acc.y, id: 1 }, { x: w1.x, y: w1.y, id: 2 }] });
    await page.waitForTimeout(400);
    const a = await page.evaluate(() => ({ acc: !!window.__sim.INPUT.touchAcc, steer: +(window.__sim.INPUT.touchSteer || 0).toFixed(2) }));
    await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await setHidden(page, true);
    await page.waitForTimeout(200);
    await setHidden(page, false); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    const b = await page.evaluate(() => ({ acc: !!window.__sim.INPUT.touchAcc, pedalDown: document.getElementById('pedAcc').classList.contains('down'), paused: window.__sim.STAGE.paused }));
    // 再開して少し待つ：ハンドルが戻り、アクセルが入っていないこと
    await page.evaluate(() => { const r = document.getElementById('bRes'); if (r) r.click(); });
    // ハンドルは指を離すと少しずつ戻る。ソフトウェア描画ではフレームが遅いので、戻るまで待つ（最大10秒）
    await page.waitForFunction(() => Math.abs(window.__sim.INPUT.touchSteer || 0) < 0.02, null, { timeout: 10000 }).catch(() => {});
    const c = await page.evaluate(() => ({ acc: !!window.__sim.INPUT.touchAcc, steer: +(window.__sim.INPUT.touchSteer || 0).toFixed(2), paused: window.__sim.STAGE.paused }));
    rep.ok(S, 'タッチ：触ったまま別のアプリに切り替えたら一時停止し、ペダルとハンドルを離した状態にする', a.acc && Math.abs(a.steer) > 0.1 && b.paused && !b.acc && !b.pedalDown && !c.acc && Math.abs(c.steer) < 0.1, `触っている間${JSON.stringify(a)} 切替後${JSON.stringify(b)} 再開後${JSON.stringify(c)}`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    // 3) pointercancel（OSのジェスチャーなどでタッチが中断された）
    await page.waitForTimeout(200);
    const br = await at('pedBrake');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: br.x, y: br.y, id: 3 }] });
    await page.waitForTimeout(150);
    const d1 = await page.evaluate(() => !!window.__sim.INPUT.touchBrk);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await page.waitForTimeout(150);
    const d2 = await page.evaluate(() => ({ brk: !!window.__sim.INPUT.touchBrk, down: document.getElementById('pedBrake').classList.contains('down') }));
    rep.ok(S, 'タッチが中断（pointercancel）されたら、ブレーキを離した状態にする', d1 && !d2.brk && !d2.down, `押下${d1} → 中断後${JSON.stringify(d2)}`);
    rep.ok(S, 'タッチ操作でエラーが出ない', errors.length === 0, errors.slice(0, 2).join(' / '));
    await ctx.close();
  }
}
