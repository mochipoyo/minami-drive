// 起動と、起動・描画に失敗したときの表示
import { openPage, waitMenu, startStage, bootText } from './lib.mjs';

export default async function ({ browser, url, rep }) {
  const S = 'boot';
  // 1) 通常の起動（PC・スマホ）。フォントは読み込まない状態で確認
  const sizes = [
    ['PC 1920×1080', { viewport: { width: 1920, height: 1080 } }],
    ['PC 1366×768', { viewport: { width: 1366, height: 768 } }],
    ['スマホ縦 390×844', { viewport: { width: 390, height: 844 }, touch: true }],
    ['スマホ横 844×390', { viewport: { width: 844, height: 390 }, touch: true }],
  ];
  for (const [name, o] of sizes) {
    const { ctx, page, errors } = await openPage(browser, url, o);
    let menu = true; try { await waitMenu(page); } catch (e) { menu = false; }
    const cls = await page.evaluate(() => ({ phone: document.body.classList.contains('phone'), touch: document.body.classList.contains('touch') }));
    const layoutOK = o.touch ? cls.phone && cls.touch : !cls.phone && !cls.touch;
    rep.ok(S, `${name}：起動して教習の一覧が出る（フォントなしでも起動）`, menu && layoutOK && errors.length === 0, (errors.slice(0, 2).join(' / ') || '') + ` phone=${cls.phone} touch=${cls.touch}`);
    await ctx.close();
  }

  // 2) three.js の CDN（cdnjs）が使えないとき → 予備の CDN（jsDelivr）から読み込んで起動する
  {
    const { ctx, page } = await openPage(browser, url, { block: ['cdnjs'] });
    let ok = true; try { await waitMenu(page, 30000); } catch (e) { ok = false; }
    rep.ok(S, 'cdnjs が使えないとき、予備のCDNから three.js を読み込んで起動する', ok, ok ? '' : await bootText(page));
    await ctx.close();
  }
  // 3) どのCDNも使えないとき → 理由と再読み込みボタンを出す（読み込み中のまま止まらない）
  {
    const { ctx, page } = await openPage(browser, url, { block: ['cdnjs', 'jsdelivr'] });
    await page.waitForTimeout(4000);
    const t = await bootText(page); const btn = await page.$('#loadMsg button');
    rep.ok(S, 'three.js を読み込めないとき、理由と再読み込みボタンを表示する', /読み込め/.test(t) && !!btn, t.slice(0, 90));
    await ctx.close();
  }
  // 3b) フォントの CSS（Google Fonts）が応答しない・読み込めないとき → 待ちすぎずに起動する
  //     （応答しないと、変更前はスクリプトの実行が止まり、起動しなかった）
  for (const [name, handler, limit] of [['応答しない', () => {}, 15], ['読み込めない', (r) => r.abort(), 8]]) {
    const { ctx, page, errors } = await openPage(browser, url, { goto: false });
    await page.route('https://fonts.googleapis.com/**', handler);
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'commit' });
    let ok = true; try { await waitMenu(page, 30000); } catch (e) { ok = false; }
    const sec = (Date.now() - t0) / 1000;
    rep.ok(S, `フォントのCSSが${name}ときも、${limit}秒以内に起動する`, ok && sec <= limit && errors.length === 0, `${sec.toFixed(1)}秒 ` + errors.slice(0, 1).join(''));
    await ctx.close();
  }
  // 4) WebGL が使えないとき → 分かりやすい理由と再読み込みボタン
  {
    const noGL = () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : g.call(this, t, ...a); }; };
    const { ctx, page } = await openPage(browser, url, { initScripts: [{ fn: noGL }] });
    await page.waitForTimeout(5000);
    const t = await bootText(page); const btn = await page.$('#loadMsg button');
    rep.ok(S, 'WebGL が使えないとき、分かりやすい理由と再読み込みボタンを表示する', /WebGL/.test(t) && /ブラウザ/.test(t) && !!btn && !/Error creating/.test(t), t.slice(0, 90));
    await ctx.close();
  }
  // 5) 描画の中断（WebGL コンテキストの喪失）と復帰
  {
    const { ctx, page, errors } = await openPage(browser, url);
    await waitMenu(page);
    await page.waitForFunction(() => !window.__sim.carAssets || window.__sim.carAssets().ready, null, { timeout: 60000 }).catch(() => {});// 車の3Dモデルの読み込みが終わってから（読み込みの途中と中断が重ならないように）
    await startStage(page, 's1', { hold: false });
    await page.waitForTimeout(800);
    await page.evaluate(() => { window.__lc = window.__sim.renderer().getContext().getExtension('WEBGL_lose_context'); window.__lc.loseContext(); });
    await page.waitForTimeout(800);
    const a = await page.evaluate(() => { const n = document.getElementById('sysNotice'); return { paused: window.__sim.STAGE.paused, notice: n && !n.hidden ? n.innerText.replace(/\s+/g, ' ') : '' }; });
    rep.ok(S, '描画が中断されたら運転を一時停止し、画面で知らせる', a.paused && /中断/.test(a.notice), JSON.stringify(a).slice(0, 120));
    await page.evaluate(() => window.__lc.restoreContext());
    await page.waitForTimeout(1500);
    const b = await page.evaluate(() => {
      const S = window.__sim; S.render(); const gl = S.renderer().getContext(); const px = new Uint8Array(4);
      gl.readPixels(gl.drawingBufferWidth >> 1, (gl.drawingBufferHeight * 0.65) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return { lost: gl.isContextLost(), px: [...px] };
    });
    rep.ok(S, '描画が復帰したら、再び3Dが表示される', !b.lost && (b.px[0] + b.px[1] + b.px[2]) > 30, JSON.stringify(b));
    rep.ok(S, '中断・復帰の間にエラーが出ない', errors.length === 0, errors.slice(0, 2).join(' / '));
    await ctx.close();
  }
  // 6) 端末の回転（横 → 縦）：描画の大きさと縦横比が新しい画面に合う
  //    ソフトウェア描画（SwiftShader）では運転中の1フレームが重く、resize イベントが5〜8秒ほど遅れて届くことがあるので、長めに待つ
  {
    const { ctx, page, errors } = await openPage(browser, url, { viewport: { width: 844, height: 390 }, touch: true });
    await waitMenu(page);
    await startStage(page, 'c1', { hold: false });
    await page.waitForTimeout(800);
    await page.setViewportSize({ width: 390, height: 844 });
    let ok = true;
    try { await page.waitForFunction(() => { const v = new THREE.Vector2(); window.__sim.renderer().getSize(v); return v.x === innerWidth && v.y === innerHeight && window.__sim.camera().aspect < 1; }, null, { timeout: 30000 }); } catch (e) { ok = false; }
    const r = await page.evaluate(() => { const v = new THREE.Vector2(); window.__sim.renderer().getSize(v); return { size: [v.x, v.y], aspect: +window.__sim.camera().aspect.toFixed(2), win: [innerWidth, innerHeight] }; });
    rep.ok(S, '端末を回転させても、描画の大きさと縦横比が新しい画面に合う', ok && errors.length === 0, JSON.stringify(r) + ' ' + errors.slice(0, 1).join(''));
    await ctx.close();
  }
}
