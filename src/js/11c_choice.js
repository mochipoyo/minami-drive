// ===== 11c_choice.js : 運転中に止まってから答える「どうする？」カード（故障・あおり運転など） =====
// spec:{eyebrow,title,steps:[{q,opts:[{t,ok,why,src}]}]}  done({miss})
const CHOICE={cur:null};
function choiceCard(spec,done){STAGE.paused=true;let i=0,miss=0;
  const step=()=>{const st=spec.steps[i];CHOICE.cur=st;const order=st.opts.map((o,k)=>k);if(!st.fixed)for(let a=order.length-1;a>0;a--){const b=Math.floor(Math.random()*(a+1));[order[a],order[b]]=[order[b],order[a]];}
    ov(`<div class="card" role="dialog" aria-label="${esc(spec.title)}"><header><div><div class="eyebrow">${esc(spec.eyebrow||'どうする？')}</div><h2>${esc(spec.title)}</h2></div><div class="plate">${i+1} / ${spec.steps.length}</div></header>
      <div class="body"><p class="lede">${esc(st.q)}</p><div class="choices">${order.map(k=>`<button class="ghost choice" data-k="${k}">${esc(st.opts[k].t)}</button>`).join('')}</div><div class="fb" id="chFb" aria-live="polite"></div></div></div>`);
    document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{const o=st.opts[+b.dataset.k];const fb=$('chFb');
      if(o.ok){b.classList.add('okc');document.querySelectorAll('.choice').forEach(x=>x.disabled=true);SFX.chime&&SFX.chime();
        fb.innerHTML=`<p class="okt">◎ そのとおりです</p><p>${esc(o.why)}</p>${o.src?`<p class="small">${esc(o.src)}</p>`:''}<div class="btnRow"><button class="go" id="chNext">${i<spec.steps.length-1?'次へ':'おわる'}</button></div>`;
        $('chNext').onclick=()=>{i++;if(i<spec.steps.length)step();else{CHOICE.cur=null;closeOv();STAGE.paused=false;done&&done({miss});}};$('chNext').focus({preventScroll:true});}
      else{miss++;b.disabled=true;b.classList.add('ng');SFX.buzz&&SFX.buzz();fb.innerHTML=`<p class="ngt">× ちがいます</p><p>${esc(o.why)}</p>${o.src?`<p class="small">${esc(o.src)}</p>`:''}`;}});};
  step();}
// テスト用：正しい選択肢を押して次へ進む
function choiceAnswerOK(){const st=CHOICE.cur;if(!st)return false;const k=st.opts.findIndex(o=>o.ok);const b=document.querySelector(`.choice[data-k="${k}"]`);if(b)b.click();const n=$('chNext');if(n)n.click();return true;}

