// 保存データ（localStorage）がない・壊れている・書き込めないときの起動と保存
import { openPage, waitMenu, startStage, runAuto, ovText } from './lib.mjs';

// ページを開く前に保存データを入れる（初回の読み込みだけ。再読み込みでは入れ直さない）
const seedStorage = (data) => { try { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v); } catch (e) {} };
const throwingStorage = () => { const thr = () => { throw new DOMException('denied', 'SecurityError'); }; Storage.prototype.getItem = thr; Storage.prototype.setItem = thr; Storage.prototype.removeItem = thr; };

async function finishS1(page) {
  await startStage(page, 's1', { hold: true });
  const r = await runAuto(page, 200);
  await page.waitForTimeout(1500);
  return r;
}

export default async function ({ browser, url, rep }) {
  const S = 'storage';
  const menuState = (page) => page.evaluate(() => ({ text: document.getElementById('ov').innerText, touch: document.body.classList.contains('touch') }));
  const signText = async (page) => { await page.click('.tab[data-k="sign"]'); await page.waitForTimeout(300); const t = await page.evaluate(() => document.getElementById('ov').innerText); await page.click('.tab[data-k="town"]'); return t; };

  // 1) 保存データなし（はじめて遊ぶ人）
  {
    const { ctx, page, errors } = await openPage(browser, url);
    let ok = true; try { await waitMenu(page); } catch (e) { ok = false; }
    rep.ok(S, '保存データがなくても起動する', ok && errors.length === 0, errors.slice(0, 2).join(' / '));
    await ctx.close();
  }
  // 2) いまの形式の正しいデータ → そのまま読み込み、記録が消えない
  {
    const data = { mdk_best: JSON.stringify({ s1: { score: 90, pass: true }, s2: { score: 60, pass: false } }), mdk_settings: JSON.stringify({ sound: false, voice: false, mirrors: true, shadow: true, touch: 'auto', sideOnPhone: false, quality: 'auto', rearCam: true }), mdk_sign_quiz: JSON.stringify({ best: 7 }), mdk_tab: JSON.stringify('town') };
    const { ctx, page, errors } = await openPage(browser, url, { initScripts: [{ fn: seedStorage, arg: data }] });
    await waitMenu(page);
    const row = await page.evaluate(() => { const r = document.querySelector('tr.row[data-i="0"]'); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
    const sign = await signText(page);
    rep.ok(S, 'いまの形式の記録・設定・クイズ記録を読み込む', /90/.test(row) && /合格/.test(row) && /クイズの最高 7\/10/.test(sign), row.slice(0, 60));
    // s1 を100点で走り終える → 90点より高いので更新。s2 の記録は残る
    const r = await finishS1(page);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mdk_best') || 'null'));
    rep.ok(S, 'より高い点で更新し、ほかの教習の記録は消えない', r.over && saved && saved.s1 && saved.s1.score === r.score && saved.s2 && saved.s2.score === 60, JSON.stringify(saved));
    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('mdk_settings') || 'null'));
    rep.ok(S, '設定（効果音オフなど）を勝手に書き換えない', settings && settings.sound === false && settings.voice === false, JSON.stringify(settings));
    rep.ok(S, 'エラーが出ない（正しいデータ）', errors.length === 0, errors.slice(0, 2).join(' / '));
    await ctx.close();
  }
  // 3) 壊れた JSON
  {
    const data = { mdk_settings: '{bad', mdk_best: '{"s1":', mdk_sign_quiz: 'nope', mdk_tab: '{' };
    const { ctx, page, errors } = await openPage(browser, url, { initScripts: [{ fn: seedStorage, arg: data }] });
    let ok = true; try { await waitMenu(page); } catch (e) { ok = false; }
    const m = ok ? await menuState(page) : { text: '' }; const sign = ok ? await signText(page) : '';
    rep.ok(S, '壊れたJSONでも起動し、表示に undefined などが出ない', ok && !/undefined|NaN|null/.test(m.text + sign) && errors.length === 0, errors.slice(0, 2).join(' / '));
    await ctx.close();
  }
  // 4) 型の違う値（古い版や手作業で書き換えた場合）
  {
    const data = { mdk_settings: JSON.stringify({ touch: 'yes', quality: 42, sound: 'x', mirrors: 0 }), mdk_best: JSON.stringify({ s1: 5, s2: { score: 'a' }, c1: null, s3: { score: 80, pass: true } }), mdk_sign_quiz: '7', mdk_env_s7: JSON.stringify('xyz') };
    const { ctx, page, errors } = await openPage(browser, url, { viewport: { width: 844, height: 390 }, touch: true, initScripts: [{ fn: seedStorage, arg: data }] });
    let ok = true; try { await waitMenu(page); } catch (e) { ok = false; }
    const m = ok ? await menuState(page) : { text: '', touch: false }; const sign = ok ? await signText(page) : '';
    rep.ok(S, '型の違う値があっても、表示に undefined などが出ない', ok && !/undefined|NaN/.test(m.text + sign), (m.text + sign).match(/.{0,12}(undefined|NaN).{0,12}/)?.[0] || '');
    rep.ok(S, '型の違う設定値で、スマホのタッチ操作が無効にならない', m.touch, `touch=${m.touch}`);
    rep.ok(S, '正しい記録（s3 80点）は残す', ok && /80/.test(await page.evaluate(() => { const i = window.__sim.STAGES.findIndex(s => s.id === 's3'); const r = document.querySelector(`tr.row[data-i="${i}"]`); return r ? r.innerText : ''; })), '');
    // 自由走行の時間帯・天気が不正な値でも始められる
    const freeOK = await page.evaluate(() => { try { const S = window.__sim; const i = S.STAGES.findIndex(s => s.id === 's7'); document.querySelector('.tab[data-k="free"]').click(); document.querySelector(`tr.row[data-i="${i}"]`).click(); document.getElementById('bGo').click(); return S.STAGE.running; } catch (e) { return 'ERR ' + e.message; } });
    rep.ok(S, '時間帯の保存値が不正でも自由走行を始められる', freeOK === true, String(freeOK));
    rep.ok(S, 'エラーが出ない（型の違う値）', errors.length === 0, errors.slice(0, 2).join(' / '));
    await ctx.close();
  }
  // 5) 記録が配列など別の形 → 走り終えたら、記録がきちんと保存される
  {
    const { ctx, page, errors } = await openPage(browser, url, { initScripts: [{ fn: seedStorage, arg: { mdk_best: '[]' } }] });
    await waitMenu(page);
    const r = await finishS1(page);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mdk_best') || 'null'));
    rep.ok(S, '記録の形が違っても、走り終えた記録が保存される', r.over && saved && !Array.isArray(saved) && saved.s1 && saved.s1.score === r.score, JSON.stringify(saved));
    await ctx.close();
  }
  // 6) 保存できない（プライベートブラウズなどで localStorage が例外を出す）
  {
    const { ctx, page, errors } = await openPage(browser, url, { initScripts: [{ fn: throwingStorage }] });
    let ok = true; try { await waitMenu(page); } catch (e) { ok = false; }
    const note = ok ? (await ovText(page)) : '';
    rep.ok(S, '保存できない環境でも起動する', ok, '');
    rep.ok(S, '保存できない環境では、記録が残らないことをメニューで知らせる', /保存できない/.test(note), note.match(/[^\n]*保存[^\n]*/)?.[0] || '');
    if (ok) {
      const r = await finishS1(page); const t = await ovText(page);
      rep.ok(S, '保存できない環境でも、教習を走り終えて結果が出る', r.over && /合格|不合格/.test(t), `over=${r.over}`);
    }
    rep.ok(S, 'エラーが出ない（保存できない環境）', errors.length === 0, errors.slice(0, 2).join(' / '));
    await ctx.close();
  }
}
