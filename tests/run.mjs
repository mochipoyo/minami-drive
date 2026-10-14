// 動作確認をまとめて実行する。使い方：cd tests && npm install && npm test
//   SUITES=boot,storage のように一部だけ実行できる。結果は results/latest.json にも保存
import { startServer, launch, Report } from './lib.mjs';

const ALL = ['boot', 'storage', 'input', 'timing', 'scoring', 'lessons', 'special', 'assets', 'shinjuku'];
const suites = (process.env.SUITES || ALL.join(',')).split(',').filter(Boolean);
const srv = await startServer();
const browser = await launch();
const rep = new Report();
const t0 = Date.now();
for (const s of suites) {
  console.log(`\n=== ${s} ===`);
  try { const mod = await import(`./suite-${s}.mjs`); await mod.default({ browser, url: srv.url, rep }); }
  catch (e) { rep.ok(s, 'テストの実行が途中で止まった', false, e.message.split('\n')[0]); }
}
await browser.close(); await srv.close();
const failed = rep.failed;
console.log(`\n${rep.rows.length - failed.length} / ${rep.rows.length} 項目が成功（${Math.round((Date.now() - t0) / 1000)}秒）`);
for (const f of failed) console.log(`  ✗ [${f.suite}] ${f.name} — ${f.detail.slice(0, 160)}`);
rep.save(process.env.OUT || 'latest.json');
process.exit(failed.length ? 1 : 0);
