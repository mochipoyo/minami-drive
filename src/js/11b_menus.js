// ===== 11b_menus.js : 教習原簿（メニュー）・結果・設定 =====
// 保存データは形と値を確かめてから使う（壊れた値・型の違う値で表示が崩れたり、タッチ操作が消えたりしないように）。正しい値はそのまま使う
const SETTINGS_DEF={sound:true,voice:true,mirrors:true,shadow:true,touch:'auto',sideOnPhone:false,quality:'auto',rearCam:true};
function cleanSettings(v){const o=Object.assign({},SETTINGS_DEF);if(!v||typeof v!=='object'||Array.isArray(v))return o;
  for(const k in v){const d=SETTINGS_DEF[k],x=v[k];if(d===undefined){o[k]=x;continue;}
    if(k==='touch'?['auto','on','off'].includes(x):k==='quality'?['auto','high','mid','low'].includes(x):typeof x===typeof d)o[k]=x;}return o;}
function cleanBest(v){const o={};if(!v||typeof v!=='object'||Array.isArray(v))return o;
  for(const k in v){const e=v[k];if(e&&typeof e==='object'&&typeof e.score==='number'&&isFinite(e.score))o[k]=Object.assign({},e,{score:Math.max(0,Math.min(100,e.score)),pass:!!e.pass});}return o;}
const SETTINGS=cleanSettings(store('mdk_settings'));
let BEST=cleanBest(store('mdk_best'));
// 保存できるか（プライベートブラウズなどで保存できない環境では、メニューで知らせる）
const STORE_OK=(()=>{try{localStorage.setItem('mdk_probe','1');localStorage.removeItem('mdk_probe');return true;}catch(e){return false;}})();
function ov(html){const o=$('ov');o.innerHTML=html;o.hidden=false;o.scrollTop=0;const b=o.querySelector('button.go');if(b)setTimeout(()=>b.focus({preventScroll:true}),30);return o;}
function closeOv(){$('ov').hidden=true;$('ov').innerHTML='';}
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// メニューのカテゴリ（タブ）
const MENU_CATS=[{k:'town',t:'一般道',sub:'みなみ町'},{k:'city',t:'都会',sub:'さくら区'},{k:'tokyo',t:'東京',sub:'新宿駅周辺'},{k:'exp',t:'高速道路',sub:'みなみ自動車道'},{k:'aori',t:'あおり運転',sub:'受けたら・しない'},{k:'park',t:'駐車',sub:'車庫入れ・縦列'},{k:'sign',t:'標識',sub:'コース・図鑑'},{k:'free',t:'自由走行',sub:'採点なし'}];
function menuCat(){const c=store('mdk_tab');return MENU_CATS.some(x=>x.k===c&&STAGES.some(s=>s.cat===x.k)||x.k===c&&x.k==='sign')?c:'town';}
function showMenu(cat){STAGE.running=false;STAGE.menu=true;$('hud').hidden=true;applyMirrors();$('eew').hidden=true;$('phone').hidden=true;
  cat=(typeof cat==='string'&&cat)||menuCat();const cats=MENU_CATS.filter(c=>STAGES.some(s=>s.cat===c.k)||(c.k==='sign'&&typeof showSignBook==='function'));
  const list=STAGES.map((s,i)=>({s,i})).filter(e=>e.s.cat===cat);
  const rows=list.map(({s,i},n)=>{const b=BEST[s.id];const stamp=s.scoring===false?'':b?(b.pass?'<span class="stamp">合格</span>':'<span class="stamp ng">再<br>教習</span>'):'';
    return`<tr class="row" data-i="${i}" tabindex="0"><td class="no">${n+1}</td><td class="ttl"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></td><td class="best">${b&&s.scoring!==false?b.score+'<small>点</small>':'—'}</td><td class="stampCell">${stamp}</td></tr>`;}).join('');
  const extra=cat==='sign'&&typeof signMenuExtra==='function'?signMenuExtra():'';
  ov(`<div class="card" role="dialog" aria-label="教習原簿"><header><div><div class="eyebrow">教習原簿 ・ 2026年10月の交通ルール対応</div><h1>みなみ町ドライブ教習</h1></div><div class="plate">仮免許練習中</div></header>
    <div class="body"><p class="lede">架空の「みなみ町」、都会の「さくら区」、高速道路「みなみ自動車道」、自動車学校とスーパーの駐車場、標識の練習コースを運転して、交通ルールと危ない場面への対応を練習します。違反するとその場で知らせ、結果画面で条文つきの解説を確認できます。生活道路の法定速度30km/h（2026年9月1日施行）、自転車の側方通過（2026年4月1日施行）、妨害運転（あおり運転）の対象行為の追加（同日施行）にも対応しています。</p>
    <div class="tabs" role="tablist" aria-label="教習の種類">${cats.map(c=>`<button role="tab" class="tab" data-k="${c.k}" aria-selected="${c.k===cat}"><b>${esc(c.t)}</b><small>${esc(c.sub)}</small></button>`).join('')}</div>
    ${rows?`<table class="genbo"><thead><tr><th>No.</th><th>教習項目</th><th style="text-align:right">最高点</th><th>判定</th></tr></thead><tbody>${rows}</tbody></table>`:''}${extra}
    <div class="btnRow"><button class="ghost" id="bHelp">操作方法</button><button class="ghost" id="bSet">設定</button><button class="ghost" id="bAbout">このゲームについて・出典</button></div>
    <p class="small">採点はゲーム独自の基準（100点からの減点、70点以上かつ重大違反なしで合格）です。実際の技能検定の採点基準とは異なります。</p>${STORE_OK?'':'<p class="small">このブラウザでは記録や設定を保存できない状態のため、再読み込みしたりページを閉じたりすると消えます（サイトデータの保存をブロックしている場合など）。</p>'}</div></div>`);
  document.querySelectorAll('.tabs .tab').forEach(b=>b.onclick=()=>{store('mdk_tab',b.dataset.k);showMenu(b.dataset.k);const t=document.querySelector(`.tabs .tab[data-k="${b.dataset.k}"]`);t&&t.focus({preventScroll:true});});
  document.querySelectorAll('tr.row').forEach(tr=>{const go=()=>showIntro(+tr.dataset.i);tr.onclick=go;tr.onkeydown=(e)=>{if(e.key==='Enter')go();};});
  if(cat==='sign'&&typeof bindSignMenu==='function')bindSignMenu();
  $('bHelp').onclick=()=>showHelp(()=>showMenu(cat));$('bSet').onclick=()=>showSettings(()=>showMenu(cat));$('bAbout').onclick=showAbout;}
function showIntro(i){const s=STAGES[i];if(s.cat)store('mdk_tab',s.cat);ov(`<div class="card"><header><div><div class="eyebrow">${esc((MENU_CATS.find(c=>c.k===s.cat)||{t:'教習'}).t)}</div><h2>${esc(s.name)}</h2></div><div class="plate">${esc(s.envLabel||'昼・晴れ')}</div></header>
  <div class="body"><p class="lede">${esc(s.intro)}</p>${s.envChoice?envChips(s):''}<ul class="vlist">${s.points.map(t=>`<li class="good">${esc(tx(t))}</li>`).join('')}</ul>
  ${isTouch()?`<p class="small">スマホ・タブレット：左下のハンドルを指で回し、右下のペダルを押して運転します。次に押すボタンは黄色く光ります。${store('mdk_guide_seen')?'画面の操作ガイドは、右上の一時停止ボタンからいつでも見られます。':'運転を始めると、最初に画面の操作ガイドが出ます。'}</p>`:''}
  ${matchMedia('(pointer:coarse) and (orientation:portrait)').matches?'<p class="small">スマホは横向きにすると、ハンドルとペダルが操作しやすくなります。</p>':''}
  <div class="btnRow"><button class="go" id="bGo">運転をはじめる</button><button class="ghost" id="bBack">原簿にもどる</button><button class="ghost" id="bHelp2">操作方法</button></div></div></div>`);
  if(s.envChoice)bindEnvChips(s);
  $('bGo').onclick=()=>{SFX.init();try{SFX.ctx&&SFX.ctx.resume&&SFX.ctx.resume();}catch(e){}SFX.setOn(SETTINGS.sound);closeOv();startStage(i);};$('bBack').onclick=showMenu;$('bHelp2').onclick=()=>showHelp(()=>showIntro(i));}
// 自由走行：時間帯・天気を選ぶ
const ENVOPTS=[['day','昼・晴れ'],['evening','夕方'],['night','夜'],['rain','雨'],['fog','霧']];
function envChips(s){let cur=store('mdk_env_'+s.id);if(!ENVOPTS.some(e=>e[0]===cur))cur=s.env||'day';s.env=cur;s.envLabel=(ENVOPTS.find(e=>e[0]===cur)||ENVOPTS[0])[1];
  return`<div class="envPick" role="radiogroup" aria-label="時間帯と天気">${ENVOPTS.map(([k,t])=>`<button class="tab envc" role="radio" data-env="${k}" aria-checked="${k===cur}" aria-selected="${k===cur}"><b>${t}</b></button>`).join('')}</div>`;}
function bindEnvChips(s){document.querySelectorAll('.envc').forEach(b=>b.onclick=()=>{s.env=b.dataset.env;s.envLabel=(ENVOPTS.find(e=>e[0]===s.env)||ENVOPTS[0])[1];store('mdk_env_'+s.id,s.env);
  document.querySelectorAll('.envc').forEach(x=>{const on=x===b;x.setAttribute('aria-checked',on);x.setAttribute('aria-selected',on);});const pl=document.querySelector('.card header .plate');if(pl)pl.textContent=s.envLabel;});}
function showHelp(back){const touch=isTouch();
  const T=`<ul class="tlist">
    <li><b>ハンドル</b>左下の丸。指でつかんで回します。指を離すと、まっすぐに戻ります。</li>
    <li><b>［アクセル］［ブレーキ］</b>右下のペダル。押している間だけ効きます。ブレーキは長く押すほど強く効きます。</li>
    <li><b>光っているボタン</b>次に押すボタンです。発進前は、光ったボタンを順番にタップします。長押しは要りません。</li>
    <li><b>［左確認］［右確認］</b>タップすると少しの間そちらを見ます。押し続けると、その間ずっと見ます。シフトがRのときは、体をひねって後ろを見ます。</li>
    <li><b>［◀ 合図］［合図 ▶］</b>ウインカー。もう一度押すと消えます。曲がり終えてハンドルを戻すと自動で消えます。</li>
    <li><b>［ベルト］［シフト］［Pブレーキ］</b>発進前の準備です。シフトは止まっているときに押すと D と R が切り替わります（最初は P）。</li>
    <li><b>［ハザード］［ライト］［ホーン］</b>ハザードランプ・前照灯・クラクション。ホーンは押している間だけ鳴ります。</li>
    <li><b>右上のボタン</b>視点の切り替え・サウンド・一時停止。一時停止から操作ガイドを見直せます。</li>
    <li><b>［怒鳴る］</b>特殊モードのときだけ、速度計の横に出ます。押すと「危ねえだろ〇ズ人間！」と怒鳴ります（採点には影響しません）。</li></ul>`;
  const K=`<div class="keys"><div><kbd>W</kbd>/<kbd>↑</kbd> アクセル</div><div><kbd>S</kbd>/<kbd>↓</kbd> ブレーキ（長押しで強く）</div><div><kbd>Space</kbd> 急ブレーキ</div><div><kbd>A</kbd><kbd>D</kbd>/<kbd>←</kbd><kbd>→</kbd> ハンドル</div>
  <div><kbd>Q</kbd>/<kbd>E</kbd> 左右の合図（ウインカー）</div><div><kbd>F</kbd> ハザード</div><div><kbd>H</kbd> クラクション</div><div><kbd>L</kbd> ライト</div><div><kbd>B</kbd> シートベルト</div><div><kbd>R</kbd> シフト（D⇔R）</div><div><kbd>P</kbd> パーキングブレーキ</div>
  <div><kbd>Z</kbd>/<kbd>C</kbd> 左／右を見る（押すと少しの間・長押しで見続ける。シフトRのときは後ろを見る）</div><div><kbd>V</kbd> 視点切替</div><div><kbd>Esc</kbd> 一時停止</div><div>マウスのドラッグで見回し</div><div><kbd>G</kbd> 怒鳴る（特殊モードだけ。採点には影響しません）</div></div>`;
  const live=touch&&STAGE.running&&!STAGE.over;
  ov(`<div class="card"><header><h2>操作方法</h2></header><div class="body">${touch?`<h3 class="hh">スマホ・タブレット（タッチ操作）</h3>${T}<details class="more"><summary>キーボードで遊ぶとき（パソコン用）</summary>${K}</details>`:`<h3 class="hh">キーボード</h3>${K}<details class="more"><summary>スマホ・タブレットで遊ぶとき</summary>${T}</details>`}
  <p class="small" style="margin-top:12px">オートマ車なので、ブレーキを離すとゆっくり進みます（クリープ現象）。次に押すボタンは黄色く光ります。</p>
  <div class="btnRow"><button class="go" id="bOk">もどる</button>${live?'<button class="ghost" id="bGuide">画面で操作ガイドを見る</button>':''}</div></div></div>`);
  $('bOk').onclick=back;if($('bGuide'))$('bGuide').onclick=()=>showGuide(false,()=>{STAGE.paused=false;togglePause();});}
function showSettings(back){const row=(id,label,val)=>`<label class="opt" for="${id}"><span>${label}</span><input type="checkbox" id="${id}" ${val?'checked':''}></label>`;
  ov(`<div class="card"><header><h2>設定</h2></header><div class="body">${row('sSound','効果音',SETTINGS.sound)}${row('sVoice','教官の音声案内（ブラウザの読み上げ）',SETTINGS.voice)}${row('sMir','ミラーを表示',SETTINGS.mirrors)}${row('sSide','狭い画面でもサイドミラーを表示',SETTINGS.sideOnPhone)}${row('sCam','バックモニター（シフトがRのとき）',SETTINGS.rearCam!==false)}${row('sShadow','影（再読み込み後に反映）',SETTINGS.shadow)}
    <label class="opt" for="sTouch"><span>タッチ操作パネル</span><select id="sTouch"><option value="auto">自動</option><option value="on">表示</option><option value="off">非表示</option></select></label>
    <label class="opt" for="sQual"><span>画質（再読み込み後に反映）<br><small style="font-weight:400;color:#4d5d55">動きが重いときは「低」に。「高」は路面の凹凸・塗装のつや・雲・影つき</small></span><select id="sQual"><option value="auto">自動</option><option value="high">高</option><option value="mid">中</option><option value="low">低</option></select></label>
    <div class="btnRow"><button class="go" id="bOk">保存してもどる</button></div></div></div>`);$('sTouch').value=SETTINGS.touch;$('sQual').value=SETTINGS.quality||'auto';
  $('bOk').onclick=()=>{SETTINGS.sound=$('sSound').checked;SETTINGS.voice=$('sVoice').checked;SETTINGS.mirrors=$('sMir').checked;SETTINGS.sideOnPhone=$('sSide').checked;SETTINGS.rearCam=$('sCam').checked;SETTINGS.shadow=$('sShadow').checked;SETTINGS.touch=$('sTouch').value;SETTINGS.quality=$('sQual').value;
    store('mdk_settings',SETTINGS);SFX.setOn(SETTINGS.sound);VOICE.on=SETTINGS.voice;applyTouch();applyMirrors();back();};}
function showAbout(){ov(`<div class="card"><header><h2>このゲームについて</h2></header><div class="body">
  <p class="lede">交通ルールの説明は、2026年10月時点で確認できた法令・公的機関の情報をもとにしています。法令は改正されることがあるため、実際の運転では道路標識・標示、警察官の指示、最新の公式情報に従ってください。</p>
  <ul class="vlist"><li class="good"><b>確認できている内容</b><span class="law">生活道路の法定速度30km/h（2026年9月1日施行）、自転車の右側を通過するときの安全な速度（第18条第3項・2026年4月1日施行。目安は1m程度の間隔、取れないときは20〜30km/h程度＝警察庁資料）、信号・一時停止・踏切・横断歩道・緊急自動車・合図の時期・灯火・座席ベルト・携帯電話、地震のときの運転者の措置（交通の方法に関する教則）。高速道路の最高・最低速度、通行帯、合流、停止表示器材。駐車・停車の禁止場所（第44条・第45条・第47条）。道路標識の種類・意味（標識令 別表第一）。妨害運転（あおり運転）の対象となる11の行為・罰則（第117条の2の2第1項第8号・第117条の2第1項第4号）と、追いつかれた車両の義務（第27条）、初心者マークの車の保護（第71条第5号の4）。特殊モードの、高齢の歩行者などの通行を妨げない義務（第71条第2号の2）、歩行者の横断の方法（第12条・第13条）、警音器を鳴らしてよい場合（第54条第2項）。</span></li>
  <li class="info"><b>ゲーム上の単純化</b><span class="law">減点の点数、速度超過の判定（+2km/hまで許容）、歩行者との間隔「1m未満かつ15km/h超」、車間距離「1秒未満が3秒続く」、駐車場の中の速度「15km/h」、切り返しの数え方、駐車の枠に入ったかの判定などはゲーム独自の目安です。教習所のコースの寸法は実際の教習所・試験場とは異なります。標識・若葉マークの絵は見分けやすさを優先した簡略化で、実際の様式とは形・比率などが異なります。あおり運転の場面の流れ（相手の車の動き）はゲーム独自のものです。特殊モードの場面（逆走車や、急に渡ってくる歩行者の動き）と、その対応の判定（すれ違うときの速度など）もゲーム独自のものです。町・店・学校・駅・道路の名前はすべて架空です。</span></li>
  <li class="info"><b>確認が必要な点</b><span class="law">高速道路で路肩を走ったときに適用される条文（ゲームでは「確認中」と表示）。法令・運用は改正されることがあります。</span></li></ul>
  <p class="small" style="margin-top:12px">出典</p><ul class="small">${SOURCES.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul>
  <div class="btnRow"><button class="go" id="bOk">もどる</button></div></div></div>`);$('bOk').onclick=showMenu;}
function togglePause(){if(!STAGE.running||STAGE.over)return;if(GUIDE){closeGuide();return;}if(STAGE.paused){STAGE.paused=false;closeOv();return;}STAGE.paused=true;SFX.horn2&&SFX.horn2(false);
  ov(`<div class="card"><header><h2>一時停止中</h2></header><div class="body"><div class="btnRow"><button class="go" id="bRes">再開</button><button class="ghost" id="bRe">最初からやり直す</button>${isTouch()?'<button class="ghost" id="bGuide2">操作ガイド（画面で説明）</button>':''}<button class="ghost" id="bHelp3">操作方法</button><button class="ghost" id="bSet2">設定</button><button class="ghost" id="bMenu">原簿にもどる</button></div></div></div>`);
  $('bRes').onclick=togglePause;$('bRe').onclick=()=>{STAGE.paused=false;closeOv();startStage(STAGE.idx);};$('bMenu').onclick=()=>{STAGE.paused=false;endStage(true);};
  $('bHelp3').onclick=()=>showHelp(()=>{STAGE.paused=false;togglePause();});if($('bGuide2'))$('bGuide2').onclick=()=>showGuide(false,()=>{STAGE.paused=false;togglePause();});$('bSet2').onclick=()=>showSettings(()=>{STAGE.paused=false;togglePause();});}
function vItem(l){const R0=RULES[l.id];return`<li><b>${esc(R0.t)}</b>（−${R0.p}点${R0.major?'・重大':''}）${l.note?'<br>'+esc(tx(l.note)):''}<br>${esc(tx(R0.x))}<span class="law">${esc(R0.law)}</span></li>`;}
function showResult(extra){const s=STAGES[STAGE.idx];const pass=J.score>=70&&!J.major;const sc=s.scoring!==false;
  if(sc){const b=BEST[s.id];if(!b||J.score>b.score||(pass&&!b.pass))BEST[s.id]={score:J.score,pass:pass||(b&&b.pass)};store('mdk_best',BEST);}
  const prec=extra&&extra.prec!==undefined?`<div class="small">停止位置との差 ${extra.prec.toFixed(2)}m ${extra.prec<0.5?'（ぴったり！）':''}</div>`:'';
  const checks=extra&&extra.checks?`<p class="small" style="margin-top:14px">${esc(extra.checksTitle||'確認した項目')}</p><ul class="vlist">${extra.checks.map(c=>`<li class="${c.bad?'':'good'}"><b>${c.bad?'×':'○'} ${esc(c.t)}</b>${c.law?`<span class="law">${esc(c.law)}</span>`:''}</li>`).join('')}</ul>`:'';
  const note=extra&&extra.note?`<p class="lede" style="margin-top:12px">${esc(tx(extra.note))}</p>`:'';
  const t=Math.floor(STAGE.time);const nx=STAGES[STAGE.idx+1];const hasNext=!!nx&&!(nx.special&&!s.special)&&!s.special;// 特殊モードへは「次の教習へ」でつなげない（特殊モードからも次へは出さない）
  const catT=(MENU_CATS.find(c=>c.k===s.cat)||{t:'教習'}).t;const no=STAGES.filter(x=>x.cat===s.cat).indexOf(s)+1;
  ov(`<div class="card"><header><div><div class="eyebrow">${esc(catT)} ・ 教習${no} の結果</div><h2>${esc(s.name)}</h2></div></header><div class="body">
    <div class="resTop">${sc?`<span class="stamp big ${pass?'':'ng'}">${pass?'合格':'不合格'}</span><div><div class="resScore">${J.score}<small>点</small></div><div class="small">走行時間 ${Math.floor(t/60)}分${t%60}秒${J.major?'・重大な違反あり':''}</div>${prec}</div>`:'<div class="small">フリー走行（採点なし）</div>'}</div>
    ${note}${checks}${J.log.length?`<p class="small" style="margin-top:14px">減点された運転</p><ul class="vlist">${J.log.map(vItem).join('')}</ul>`:(sc?(extra&&extra.checks&&extra.checks.some(c=>c.bad)?'<p class="lede" style="margin-top:12px">減点はありませんでしたが、上の×の項目を見直しておきましょう。</p>':'<p class="lede" style="margin-top:12px">減点なし。見事な運転でした。</p>'):'')}
    ${J.good.length?`<p class="small" style="margin-top:14px">よかった運転</p><ul class="vlist">${J.good.map(g=>`<li class="good"><b>${esc(GOOD[g])}</b></li>`).join('')}</ul>`:''}
    <div class="btnRow"><button class="go" id="bAgain">もう一度</button>${hasNext?'<button class="ghost" id="bNext">次の教習へ</button>':''}<button class="ghost" id="bMenu2">原簿にもどる</button></div></div></div>`);
  $('bAgain').onclick=()=>{closeOv();startStage(STAGE.idx);};$('bMenu2').onclick=showMenu;if($('bNext'))$('bNext').onclick=()=>showIntro(STAGE.idx+1);}
function showCrash(reason){const lesson=STAGE.lessonHint;ov(`<div class="card"><header><div><div class="eyebrow">運転を中止しました</div><h2>事故が起きました</h2></div><span class="stamp ng">中止</span></header><div class="body">
  <p class="lede"><b>${esc(tx(reason))}</b></p>${lesson?`<p class="lede">${esc(tx(lesson))}</p>`:''}<ul class="vlist"><li><b>事故のときの義務</b><br>${esc(RULES.crash.x)}<span class="law">${esc(RULES.crash.law)}</span></li>${J.log.filter(l=>l.id!=='crash').slice(-3).map(vItem).join('')}</ul>
  <div class="btnRow"><button class="go" id="bAgain">やり直す</button><button class="ghost" id="bMenu2">原簿にもどる</button></div></div></div>`);$('bAgain').onclick=()=>{closeOv();startStage(STAGE.idx);};$('bMenu2').onclick=showMenu;}
function quakeQuiz(done){STAGE.paused=true;const opts=[[0,'キーを抜いてドアをロックし、すぐに車を離れる'],[1,'できるだけ道路外に移動する。やむを得ず道路上に置くときは左に寄せてエンジンを止め、キーは付けたまま（または車内の分かりやすい場所）、窓を閉め、ドアはロックしない'],[0,'道路の中央に止めてハザードランプをつけたまま離れる']];
  ov(`<div class="card"><header><div><div class="eyebrow">地震のあとの行動</div><h2>車を置いて避難するときは？</h2></div></header><div class="body"><p class="lede">揺れがおさまったらカーラジオなどで地震情報・交通情報を確認し、周りの状況に応じて行動します。</p>
    <div class="choice">${opts.map((o,i)=>`<button data-ok="${o[0]}" id="q${i}">${esc(o[1])}</button>`).join('')}</div><p class="small" id="qExp" hidden>出典：交通の方法に関する教則（警察庁・香川県警察の掲載内容）。緊急車両の通行や避難のじゃまにならない場所を選びます。</p>
    <div class="btnRow"><button class="go" id="qNext" hidden>結果を見る</button></div></div></div>`);
  document.querySelectorAll('.choice button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.choice button').forEach(x=>{x.disabled=true;x.classList.add(x.dataset.ok==='1'?'right':'wrong');});$('qExp').hidden=false;$('qNext').hidden=false;
    if(b.dataset.ok==='1')J.good.push('quakeQuizOK');$('qNext').focus();});
  $('qNext').onclick=()=>{STAGE.paused=false;closeOv();done&&done();};}
GOOD.quakeQuizOK='地震のあと車を置いて避難する方法を正しく選んだ';
function applyTouch(){const touch=SETTINGS.touch==='on'||(SETTINGS.touch==='auto'&&matchMedia('(pointer:coarse)').matches);document.body.classList.toggle('touch',touch);
  // スマホ（画面の短い辺が600px未満のタッチ端末）：コメントを小さくして上にまとめる（CSSの body.phone）
  const sw=Math.min(screen.width||window.innerWidth,screen.height||window.innerHeight);document.body.classList.toggle('phone',matchMedia('(pointer:coarse)').matches&&sw<600);$('touchL').hidden=!touch;$('touchR').hidden=!touch;if(wheelSpin)wheelSpin.visible=!touch;}
// ===== 画面の操作ガイド（タッチ操作のとき、はじめての運転で表示） =====
let GUIDE=null;
const GUIDE_STEPS=[
  {el:['wheel'],t:'ハンドル',x:'左下の丸を指でつかんで回します。指を離すと、まっすぐに戻ります。'},
  {el:['pedBrake','pedAcc'],t:'ブレーキとアクセル',x:'右が［アクセル］、左が［ブレーキ］。押している間だけ効きます。ブレーキは長く押すほど強く効きます。'},
  {el:['ctrlBar'],t:'光っているボタンを押す',x:'次に押すボタンが黄色く光ります。発進前は、光ったボタンを順番にタップしていけば大丈夫です。'},
  {el:['cb_lkL','cb_lkR'],t:'左確認・右確認',x:'タップすると少しの間そちらを向きます。押し続けると、その間ずっと見ます。発進前の右後方や、踏切の左右の確認に使います。'},
  {el:['nav'],t:'ナビ',x:'次に曲がる方向と、そこまでの距離です。'},
  {el:['btnPause'],t:'一時停止',x:'このガイドや操作方法は、ここからいつでも見直せます。'}];
function showGuide(first,onDone){if(!STAGE.running||STAGE.over)return;closeOv();STAGE.paused=true;try{speechSynthesis.cancel();VOICE.last='';}catch(e){}
  GUIDE={i:0,first:!!first,onDone};$('guide').hidden=false;renderGuide();}
function renderGuide(){if(!GUIDE)return;const g=$('guide');const n=GUIDE_STEPS.length;const st=GUIDE_STEPS[GUIDE.i];const last=GUIDE.i===n-1;
  g.innerHTML=`<div class="spot"></div><div class="tip" role="dialog" aria-label="操作ガイド"><div class="st">操作ガイド ${GUIDE.i+1} / ${n}</div><h3>${esc(st.t)}</h3><p>${esc(st.x)}</p>
    <div class="btnRow">${GUIDE.i>0?'<button class="ghost" id="gPrev">もどる</button>':''}${last?'':'<button class="ghost" id="gSkip">とばす</button>'}<button class="go" id="gNext">${last?(GUIDE.first?'運転をはじめる':'閉じる'):'次へ'}</button></div></div>`;
  const W=window.innerWidth,H=window.innerHeight,pad=6,m=10;
  const rs=st.el.map(id=>$(id)).filter(e=>e&&e.getClientRects().length).map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
  const r=rs.length?{l:Math.min(...rs.map(a=>a.left))-pad,t:Math.min(...rs.map(a=>a.top))-pad,r:Math.max(...rs.map(a=>a.right))+pad,b:Math.max(...rs.map(a=>a.bottom))+pad}:null;
  const spot=g.querySelector('.spot'),tip=g.querySelector('.tip');g.classList.toggle('dim',!r);
  if(r)Object.assign(spot.style,{left:r.l+'px',top:r.t+'px',width:(r.r-r.l)+'px',height:(r.b-r.t)+'px'});else spot.hidden=true;
  const tw=tip.offsetWidth,th=tip.offsetHeight;let x=(W-tw)/2,y=(H-th)/2;
  if(r){const cx=(r.l+r.r)/2-tw/2,cy=(r.t+r.b)/2-th/2;
    if(r.t-th-m>=8){y=r.t-th-m;x=cx;}else if(H-r.b-th-m>=8){y=r.b+m;x=cx;}else if(W-r.r-tw-m>=8){x=r.r+m;y=cy;}else if(r.l-tw-m>=8){x=r.l-tw-m;y=cy;}}
  tip.style.left=clamp(x,8,W-tw-8)+'px';tip.style.top=clamp(y,8,H-th-8)+'px';
  const nx=$('gNext');nx.onclick=()=>{if(last)closeGuide();else{GUIDE.i++;renderGuide();}};setTimeout(()=>nx.focus({preventScroll:true}),30);
  if($('gSkip'))$('gSkip').onclick=closeGuide;if($('gPrev'))$('gPrev').onclick=()=>{GUIDE.i--;renderGuide();};}
function closeGuide(){if(!GUIDE)return;const G=GUIDE;GUIDE=null;const g=$('guide');g.hidden=true;g.innerHTML='';store('mdk_guide_seen',1);STAGE.paused=false;
  if(G.onDone)G.onDone();else if(!J.started)coachStep(true);}
window.addEventListener('resize',()=>{if(GUIDE)setTimeout(renderGuide,80);});

