// ===== 11d_signbook.js : 標識図鑑・標識クイズ（メニューの「標識」タブ） =====
const SIGN_SRC='名称・番号・意味は「道路標識、区画線及び道路標示に関する命令」（標識令）別表第一（2026年9月1日施行の版、e-Gov法令検索）によります。絵は見分けやすさを優先して簡略化したイメージで、実際の様式（別表第二）とは形・文字・比率などが異なります。地名・番号は架空です。';
const SIGN_ORDER=['reg','warn','inst','guide','aux'];
function signThumb(id,px){const c=signCanvas(id,px*2);c.style.width=px+'px';c.style.height=px+'px';c.className='sgimg';return c;}
function signMenuExtra(){const best=store('mdk_sign_quiz')||null;
  return`<div class="signBox"><p class="lede">道路標識は5種類（規制・警戒・指示・案内・補助）。標識令の別表第一にある <b>${SIGNDATA.length}種類</b>（様式の違いを含めると${SIGNDATA.reduce((a,e)=>a+e.v.length,0)}）をすべて収録しています。上の教習では「標識の練習コース」を走って、実際の場面で確かめられます。</p>
    <div class="btnRow"><button class="go" id="bBook">標識図鑑をひらく</button><button class="ghost" id="bQuiz">標識クイズ（10問）</button>${best?`<span class="small" style="align-self:center">クイズの最高 ${best.best}/10</span>`:''}</div>
    <p class="small">${esc(SIGN_SRC)}</p></div>`;}
function bindSignMenu(){if($('bBook'))$('bBook').onclick=()=>showSignBook('reg');if($('bQuiz'))$('bQuiz').onclick=()=>signQuiz();}
// ---- 図鑑 ----
function showSignBook(cat,q){cat=cat||'reg';q=q||'';const list=SIGNDATA.filter(e=>e.c===cat&&(!q||(e.n+e.no+e.m).includes(q)));
  ov(`<div class="card wide" role="dialog" aria-label="標識図鑑"><header><div><div class="eyebrow">標識図鑑 ・ 標識令 別表第一</div><h2>${esc(SIGNCAT[cat])}（${SIGNDATA.filter(e=>e.c===cat).length}種類）</h2></div><button class="ghost" id="sbBack">もどる</button></header>
    <div class="body"><div class="tabs" role="tablist">${SIGN_ORDER.map(k=>`<button class="tab" role="tab" data-k="${k}" aria-selected="${k===cat}"><b>${esc(SIGNCAT[k])}</b><small>${SIGNDATA.filter(e=>e.c===k).length}種類</small></button>`).join('')}</div>
    <input id="sbQ" class="sbq" type="search" placeholder="名前や番号でさがす（例：駐車、323）" value="${esc(q)}" aria-label="標識をさがす">
    <div class="sgrid" id="sgrid"></div><p class="small" style="margin-top:12px">${esc(SIGN_SRC)}</p></div></div>`);
  const g=$('sgrid');for(const e of list){const b=document.createElement('button');b.className='scell';b.setAttribute('aria-label',e.no+' '+e.n);b.appendChild(signThumb(e.a[0],64));const t=document.createElement('span');t.innerHTML=`<em>${esc(e.no)}</em>${esc(e.n)}`;b.appendChild(t);b.onclick=()=>showSignDetail(e,cat,q);g.appendChild(b);}
  if(!list.length)g.innerHTML='<p class="small">見つかりませんでした。</p>';
  document.querySelectorAll('.card .tabs .tab').forEach(b=>b.onclick=()=>showSignBook(b.dataset.k,''));
  const qi=$('sbQ');qi.oninput=()=>{clearTimeout(qi._t);qi._t=setTimeout(()=>{const v=qi.value.trim();const any=SIGNDATA.find(e=>(e.n+e.no+e.m).includes(v));showSignBook(v&&any&&!list.some(x=>x===any)&&any.c!==cat?any.c:cat,v);const n=$('sbQ');if(n){n.focus();n.setSelectionRange(v.length,v.length);}},250);};
  $('sbBack').onclick=()=>showMenu('sign');}
function signLawText(e){if(e.l)return'道路交通法 '+e.l;if(e.c==='reg'||e.c==='inst')return'（道路交通法の条項の引用なし）';return'';}
function showSignDetail(e,cat,q){const multi=e.v.length>1;
  ov(`<div class="card" role="dialog" aria-label="${esc(e.n)}"><header><div><div class="eyebrow">${esc(SIGNCAT[e.c])} ・ ${esc(e.no)}</div><h2>${esc(e.n)}</h2></div><button class="ghost" id="sdBack">一覧へ</button></header>
    <div class="body"><div class="sdimgs" id="sdImgs"></div>
    ${multi?`<p class="small">様式が${e.v.length}種類あります（${esc(e.v.join('、'))}）。${e.no.startsWith('329-')||e.no.startsWith('330-')?'B様式は英字を併記したものです。':'図は例として示したもので、それぞれの様式との対応は確認できていません。'}</p>`:''}
    <ul class="vlist"><li class="good"><b>意味</b><br>${esc(e.m)}${signLawText(e)?`<span class="law">${esc(signLawText(e))}</span>`:''}</li>
    ${e.c==='reg'||e.c==='inst'?`<li class="info"><b>普通乗用車（このゲームの車）</b><br>${e.car?'対象になります（標識の表示内容や車の大きさ・重さによっては対象外のこともあります）。':'規制・指示の対象ではありません（補助標識で対象が示される場合などを除く）。'}</li>`:''}
    <li class="info"><b>色</b><br>${esc(e.vis)}</li>${e.note&&e.note.length<160?`<li class="info"><b>メモ</b><br>${esc(e.note)}</li>`:''}</ul>
    <p class="small" style="margin-top:10px">${esc(SIGN_SRC)}</p></div></div>`);
  const box=$('sdImgs');for(const id of e.a)box.appendChild(signThumb(id,multi?96:150));
  $('sdBack').onclick=()=>showSignBook(cat,q);}
// ---- クイズ ----
function signQuiz(){const pool=SIGNDATA.filter(e=>e.c!=='guide'||Math.random()<0.35);const qs=[];const used=new Set();
  while(qs.length<10){const e=pool[Math.floor(Math.random()*pool.length)];if(used.has(e.no))continue;used.add(e.no);
    const same=SIGNDATA.filter(x=>x.c===e.c&&x.n!==e.n);const wrong=[];while(wrong.length<3&&same.length){const w=same.splice(Math.floor(Math.random()*same.length),1)[0];if(!wrong.some(z=>z.n===w.n))wrong.push(w);}
    const opts=[e,...wrong].sort(()=>Math.random()-0.5);qs.push({e,opts,art:e.a[Math.floor(Math.random()*e.a.length)]});}
  let i=0,ok=0;
  const show=()=>{const Q=qs[i];ov(`<div class="card" role="dialog" aria-label="標識クイズ"><header><div><div class="eyebrow">標識クイズ ・ ${esc(SIGNCAT[Q.e.c])}</div><h2>この標識の名前は？</h2></div><div class="plate">${i+1} / ${qs.length}</div></header>
      <div class="body"><div class="sdimgs" id="sqImg"></div><div class="choice">${Q.opts.map((o,k)=>`<button data-k="${k}">${esc(o.n)}</button>`).join('')}</div><div id="sqFb" class="fb" aria-live="polite"></div>
      <div class="btnRow"><button class="ghost" id="sqQuit">やめる</button></div><p class="small">絵は簡略化したイメージです。</p></div></div>`);
    $('sqImg').appendChild(signThumb(Q.art,150));
    document.querySelectorAll('.choice button').forEach(b=>b.onclick=()=>{const o=Q.opts[+b.dataset.k];const right=o===Q.e;if(right)ok++;
      document.querySelectorAll('.choice button').forEach(x=>{x.disabled=true;if(Q.opts[+x.dataset.k]===Q.e)x.classList.add('right');});if(!right)b.classList.add('wrong');
      (right?SFX.chime:SFX.buzz)&&(right?SFX.chime():SFX.buzz());
      $('sqFb').innerHTML=`<p class="${right?'okt':'ngt'}">${right?'◎ 正解':'× 正解は「'+esc(Q.e.n)+'」'}（${esc(Q.e.no)}）</p><p>${esc(Q.e.m)}</p><div class="btnRow"><button class="go" id="sqNext">${i<qs.length-1?'次へ':'結果を見る'}</button></div>`;
      $('sqNext').onclick=()=>{i++;if(i<qs.length)show();else done();};$('sqNext').focus({preventScroll:true});});
    $('sqQuit').onclick=()=>showMenu('sign');};
  const done=()=>{const b=store('mdk_sign_quiz')||{best:0};if(ok>b.best){b.best=ok;store('mdk_sign_quiz',b);}
    ov(`<div class="card"><header><div><div class="eyebrow">標識クイズ</div><h2>結果</h2></div></header><div class="body"><div class="resTop"><div class="resScore">${ok}<small> / ${qs.length}</small></div></div>
      <p class="lede" style="margin-top:10px">${ok>=9?'すばらしい！ほとんどの標識を見分けられました。':ok>=6?'よくできました。まちがえた標識は図鑑で確かめましょう。':'図鑑で、形と色の決まり（赤い丸は禁止、青は指示、黄色のひし形は注意）から覚えていきましょう。'}</p>
      <div class="btnRow"><button class="go" id="sqAgain">もう一度</button><button class="ghost" id="sqBook">図鑑をひらく</button><button class="ghost" id="sqMenu">原簿にもどる</button></div></div></div>`);
    $('sqAgain').onclick=signQuiz;$('sqBook').onclick=()=>showSignBook('reg');$('sqMenu').onclick=()=>showMenu('sign');};
  show();}
