// ===== 11a_hud.js : 計器・案内・地図・操作ボタン =====
const $=(id)=>document.getElementById(id);
let coachT=0,coachPri=0;
// 操作の呼び方（キーボードとタッチで切り替える）
const CTL={kb:{belt:'Bキー',gear:'Rキー',pb:'Pキー',br:'Eキー',bl:'Qキー',lkR:'Cキー',lkL:'Zキー',hz:'Fキー',lt:'Lキー',hn:'Hキー',acc:'W（↑）キー',brk:'S（↓）キー',back:'シフトをR（Rキー）にしてバック',pause:'Escキーか右上の一時停止ボタン',view:'Vキー'},
  touch:{belt:'［ベルト］ボタン',gear:'［シフト］ボタン',pb:'［Pブレーキ］ボタン',br:'［合図▶］ボタン',bl:'［◀合図］ボタン',lkR:'［右確認］ボタン',lkL:'［左確認］ボタン',hz:'［ハザード］ボタン',lt:'［ライト］ボタン',hn:'［ホーン］ボタン',acc:'右下の［アクセル］',brk:'［ブレーキ］',back:'シフトをR（［シフト］ボタン）にしてバック',pause:'右上の一時停止ボタン',view:'右上の視点ボタン'}};
const isTouch=()=>document.body.classList.contains('touch');
function tx(s){const m=isTouch()?CTL.touch:CTL.kb;return String(s==null?'':s).replace(/\{(\w+)\}/g,(a,k)=>m[k]||a);}
function coach(text,dur=5,pri=0){if(pri<coachPri&&coachT>0)return;text=tx(text);$('coachText').textContent=text;$('coach').classList.remove('hide');coachT=dur;coachPri=pri;VOICE.speak(text);}
function toast(kind,title,pts,text){const box=$('toasts');const d=document.createElement('div');d.className='toast panel '+(kind==='good'?'good':kind==='info'?'info':'');
  d.innerHTML=(pts?`<span class="pt">${pts>0?'+':''}${pts}</span>`:'')+`<b></b><span></span>`;d.querySelector('b').textContent=tx(title);d.querySelector('span:last-child').textContent=tx(text);box.prepend(d);
  while(box.children.length>3)box.lastChild.remove();setTimeout(()=>d.remove(),kind==='bad'?7500:3800);}
function flash(){const f=$('flash');f.style.opacity=1;setTimeout(()=>f.style.opacity=0,260);}
// 上の段：走行中に使う／下の段：発進・停止と確認
const BTNS=[['bl','◀ 合図','Q','左ウインカー'],['br','合図 ▶','E','右ウインカー'],['hz','ハザード','F','点滅'],['lt','ライト','L','前照灯'],['hn','ホーン','H','押す間'],
  ['belt','ベルト','B','未装着'],['gear','シフト','R','P→D→R'],['pb','Pブレーキ','P','解除/かける'],['lkL','左確認','Z','左を見る'],['lkR','右確認','C','右を見る']];
function buildControls(){const bar=$('ctrlBar');bar.innerHTML='';for(const[id,label,key,sub]of BTNS){const b=document.createElement('button');b.className='cbtn';b.id='cb_'+id;b.innerHTML=`<span class="lb">${label}</span><kbd>${key}</kbd><small>${sub}</small>`;b.dataset.key=key;b.setAttribute('aria-label',label);bar.appendChild(b);
    if(id==='hn'||id==='lkL'||id==='lkR'){const dn=(e)=>{e.preventDefault();act(id,true);},up=(e)=>{e.preventDefault();act(id,false);};b.addEventListener('pointerdown',dn);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);b.addEventListener('contextmenu',(e)=>e.preventDefault());}
    else b.addEventListener('click',(e)=>{e.preventDefault();act(id,true);b.blur();});}
  // ペダル・ハンドル（タッチ）
  const ped=(el,key)=>{const on=(e)=>{e.preventDefault();INPUT[key]=true;el.classList.add('down');try{el.setPointerCapture&&el.setPointerCapture(e.pointerId);}catch(x){}},off=(e)=>{INPUT[key]=false;el.classList.remove('down');};
    el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);};
  ped($('pedAcc'),'touchAcc');ped($('pedBrake'),'touchBrk');
  const wc=$('wheel');let dragging=false,startA=0,base=0;const ang=(e)=>{const r=wc.getBoundingClientRect();return Math.atan2(e.clientX-(r.left+r.width/2),-(e.clientY-(r.top+r.height/2)));};
  wc.addEventListener('pointerdown',(e)=>{e.preventDefault();dragging=true;startA=ang(e);base=WHEEL.a;try{wc.setPointerCapture(e.pointerId);}catch(x){}});
  wc.addEventListener('pointermove',(e)=>{if(!dragging)return;let d=wrapA(ang(e)-startA);WHEEL.a=clamp(base+d,-Math.PI*0.95,Math.PI*0.95);startA=ang(e);base=WHEEL.a;});
  const end=()=>{dragging=false;};wc.addEventListener('pointerup',end);wc.addEventListener('pointercancel',end);WHEEL.drag=()=>dragging;
  // 視線（ドラッグで見回す）
  const gl=$('gl');let lx=null;gl.addEventListener('pointerdown',(e)=>{if(e.pointerType==='mouse'&&e.button===0)lx=e.clientX;});window.addEventListener('pointermove',(e)=>{if(lx!==null)INPUT.dragLook=clamp((e.clientX-lx)/window.innerWidth*3,-1.6,1.6);});
  window.addEventListener('pointerup',()=>{lx=null;INPUT.dragLook=0;});
  WHEEL.release=()=>{dragging=false;lx=null;INPUT.dragLook=0;};}
const WHEEL={a:0,drag:()=>false};
function drawWheel(){const c=$('wheel');if(c.offsetParent===null)return;const x=c.getContext('2d');const W=c.width;x.clearRect(0,0,W,W);x.save();x.translate(W/2,W/2);x.rotate(WHEEL.a);
  x.lineWidth=26;x.strokeStyle='rgba(20,24,28,.85)';x.beginPath();x.arc(0,0,W/2-20,0,7);x.stroke();x.lineWidth=4;x.strokeStyle='rgba(255,255,255,.35)';x.beginPath();x.arc(0,0,W/2-20,0,7);x.stroke();
  x.fillStyle='rgba(20,24,28,.85)';x.fillRect(-W/2+30,-9,W-60,18);x.fillRect(-9,0,18,W/2-28);x.beginPath();x.arc(0,0,30,0,7);x.fill();x.fillStyle='#f0a500';x.fillRect(-4,-W/2+8,8,22);x.restore();}
function act(id,down){const p=PLAYER;if(!p||!STAGE.running||STAGE.over)return;if(down&&STAGE.paused)return;
  switch(id){case'belt':if(down){p.belt=!p.belt;SFX.click();coachStep();}break;case'gear':if(down){cycleGear();coachStep();if(p.gear==='R'&&J.started&&!STAGE.revTip){STAGE.revTip=1;coach('シフトR：後退する前に、{lkL}か{lkR}で体をひねって後ろを直接見て確かめます。'+(SETTINGS.rearCam!==false?'画面のバックモニターは補助です。':''),7,1);}}break;case'pb':if(down){p.pbrake=!p.pbrake;SFX.click();coachStep();onPlayerAction('pbrake',p.pbrake);}break;
    case'bl':if(down)setBlink('L');break;case'br':if(down){setBlink('R');coachStep();}break;case'hz':if(down){p.hazard=!p.hazard;SFX.click();onPlayerAction('hazard',p.hazard);}break;
    case'lt':if(down){p.lights=!p.lights;SFX.click();}break;case'hn':if(down&&!p.horn){p.horn=true;SFX.horn(true);onPlayerAction('horn');}if(!down){p.horn=false;SFX.horn(false);}break;
    case'lkL':case'lkR':{const k=id==='lkL'?'L':'R';// タップで約1.6秒、長押しで押している間だけ見る
      if(down){INPUT['look'+k]=true;INPUT['lookStart'+k]=p.t;}else{INPUT['look'+k]=false;INPUT['lookUntil'+k]=Math.max(INPUT['lookUntil'+k]||0,(INPUT['lookStart'+k]||p.t)+1.6);coachStep();}break;}
    case'shout':if(down&&typeof shout==='function')shout();break;}// 怒鳴る（特殊モードだけ。12g）
  hudT=0;updateHints();}
const KEYMAP={KeyB:'belt',KeyR:'gear',KeyP:'pb',KeyQ:'bl',KeyE:'br',KeyF:'hz',KeyL:'lt',KeyH:'hn',KeyZ:'lkL',KeyC:'lkR',KeyG:'shout'};
function bindKeys(){window.addEventListener('keydown',(e)=>{if(e.target&&(e.target.tagName==='INPUT'))return;const k=e.code;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k))e.preventDefault();
    if(KEY[k]&&!['KeyH','KeyZ','KeyC'].includes(k))return;KEY[k]=true;if(KEYMAP[k])act(KEYMAP[k],true);if(k==='KeyV')toggleView();if(k==='Escape')togglePause();});
  window.addEventListener('keyup',(e)=>{KEY[e.code]=false;if(['KeyH','KeyZ','KeyC'].includes(e.code))act(KEYMAP[e.code],false);});
  window.addEventListener('blur',releaseInputs);window.addEventListener('pagehide',releaseInputs);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseInputs();});}
// 押しっぱなしの防止：フォーカスを失う・画面が隠れるとキーやタッチの離した合図が届かないことがあるので、すべて離した状態にする
function releaseInputs(){for(const k in KEY)KEY[k]=false;INPUT.lookL=INPUT.lookR=false;INPUT.touchAcc=INPUT.touchBrk=false;INPUT.dragLook=0;
  for(const id of['pedAcc','pedBrake']){const el=$(id);if(el)el.classList.remove('down');}if(WHEEL.release)WHEEL.release();
  const p=PLAYER;if(p&&p.horn){p.horn=false;SFX.horn&&SFX.horn(false);}}
function toggleView(){const order=['cockpit','chase','top'];viewMode=order[(order.indexOf(viewMode)+1)%order.length];if(viewMode==='chase'&&PLAYER){const f=fwd(PLAYER.h);camera.position.set(PLAYER.x-f.x*7.5,(PLAYER.y||0)+3.1,PLAYER.z-f.z*7.5);}applyMirrors();toast('info',{cockpit:'運転席の視点',chase:'後ろからの視点',top:'上からの視点'}[viewMode],0,'');}
let hudT=0;
function updateHud(dt){const p=PLAYER;if(!p)return;if(!STAGE.paused)coachT-=dt;if(coachT<=0)$('coach').classList.add('hide');
  if(!WHEEL.drag()&&!(STAGE.fine&&Math.abs(p.v)<2.5)){WHEEL.a*=Math.max(0,1-dt*3.2);if(Math.abs(WHEEL.a)<0.01)WHEEL.a=0;}INPUT.touchSteer=document.body.classList.contains('touch')?WHEEL.a/(Math.PI*0.95):null;
  hudT-=dt;if(hudT>0)return;hudT=1/15;drawWheel();
  $('speedVal').textContent=Math.round(Math.abs(p.v)*KMH);const lim=J.limit;$('limitVal').textContent=lim.v;$('limitTag').textContent=lim.legal?'法定':'標識';
  $('limitSign').classList.toggle('over',Math.abs(p.v)*KMH>lim.v+2);
  const blink=(p.blinkT%0.8)<0.4;$('lmpL').classList.toggle('on',(p.blink==='L'||p.hazard)&&blink);$('lmpR').classList.toggle('on',(p.blink==='R'||p.hazard)&&blink);$('lmpH').classList.toggle('on',p.hazard);
  $('lmpBelt').classList.toggle('on',!p.belt);$('lmpBelt').textContent=p.belt?'ベルト':'ベルト未着用';$('lmpLight').classList.toggle('on',p.lights);$('lmpPB').classList.toggle('on',p.pbrake);
  $('gearBox').innerHTML=['P','R','N','D'].map(g=>g===p.gear?`<b>${g}</b>`:g).join(' ');
  $('scoreVal').textContent=STAGE.scoring?J.score:'—';const t=Math.floor(STAGE.time||0);$('timeVal').textContent=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
  const on=(id,b)=>{const e=$('cb_'+id);if(e)e.classList.toggle('on',!!b);};on('belt',p.belt);on('pb',p.pbrake);on('bl',p.blink==='L');on('br',p.blink==='R');on('hz',p.hazard);on('lt',p.lights);on('lkL',p.lookYaw<-0.5);on('lkR',p.lookYaw>0.5);
  const g=$('cb_gear');if(g)g.querySelector('.lb').textContent='シフト '+p.gear;const pbb=$('cb_pb');if(pbb)pbb.querySelector('small').textContent=p.pbrake?'かかっている':'解除中';const bb=$('cb_belt');if(bb)bb.querySelector('small').textContent=p.belt?'装着中':'未装着';
  {const rv=p.gear==='R';if(rv!==hudRev){hudRev=rv;const a=$('cb_lkL'),b=$('cb_lkR');if(a){a.querySelector('.lb').textContent=rv?'◀ 後ろ確認':'左確認';a.querySelector('small').textContent=rv?'左から振り向く':'左を見る';}
    if(b){b.querySelector('.lb').textContent=rv?'後ろ確認 ▶':'右確認';b.querySelector('small').textContent=rv?'右から振り向く':'右を見る';}}}
  updateRearCam();updateHints();drawMini();}
let hudRev=false;
// バックモニター：シフトがRのときだけ表示（設定で消せる）
function updateRearCam(){const el=$('rearCam');if(!el)return;const p=PLAYER;const on=SETTINGS.rearCam!==false&&STAGE.running&&!STAGE.over&&viewMode==='cockpit'&&p.gear==='R';
  if(el.hidden===on){el.hidden=!on;document.body.classList.toggle('revcam',on);applyMirrors();}if(on)drawRearGuide();}
// 次に押すボタンを光らせる
let hintId=null;
function currentHint(){const p=PLAYER;if(!STAGE.running||STAGE.over||(STAGE.paused&&!GUIDE))return null;
  if((ENV.mode==='night'||ENV.mode==='fog')&&!p.lights)return'lt';
  if(!J.started&&p.v<0.3){if(STAGE.startCheck&&!p.belt)return'belt';if(p.gear!=='D')return'gear';if(p.blink!=='R')return'br';if(!(p.t-p.lastLook.R<8))return'lkR';if(p.pbrake)return'pb';return'acc';}
  if(J.quake&&!p.hazard)return'hz';
  if(p.gear==='R'&&Math.abs(p.v)<0.3&&!(p.t-(p.lastLook.B||-99)<5))return'lkL';
  if(ENV.mode==='rain'&&!p.lights)return'lt';
  const A=J.A;if(A&&A.xing&&A.xing.stopped&&!A.xing.entered&&!(A.xing.lookL&&A.xing.lookR)&&p.v<0.3)return A.xing.lookL?'lkR':'lkL';
  if(NAV.turn&&NAV.turnDist<50&&NAV.turnDist>1&&p.blink!==NAV.turn&&p.v>0.5)return NAV.turn==='L'?'bl':'br';
  if(STAGE.atGoal&&!p.pbrake)return'pb';
  return null;}
function updateHints(){const h=currentHint();if(h===hintId)return;if(hintId){const old=hintId==='acc'?$('pedAcc'):$('cb_'+hintId);if(old)old.classList.remove('hint');}
  hintId=h;if(h){const el=h==='acc'?$('pedAcc'):$('cb_'+h);if(el)el.classList.add('hint');}}
function setNav(kind,dist,text){const P={L:'M30 42V24Q30 16 22 16H10M16 10l-6 6 6 6',R:'M18 42V24Q18 16 26 16H38M32 10l6 6-6 6',S:'M24 42V10M14 20l10-10 10 10',G:'M14 42V8M14 9h20l-5 7 5 7H14',U:'M24 4v4'};
  $('navPath').setAttribute('d',P[kind]||P.S);$('navDist').innerHTML=dist===null?'—':`${Math.max(0,Math.round(dist))}<small>m</small>`;$('navText').textContent=text;}
function drawMini(){const c=$('mini');if(c.offsetParent===null)return;const x=c.getContext('2d');const W=c.width;const p=PLAYER;const S=MINI.scale;x.clearRect(0,0,W,W);x.save();x.translate(W/2,W*0.62);x.rotate(-p.h);x.translate(-p.x*S,-p.z*S);
  x.lineCap='butt';x.lineJoin='round';const R0=W/S*0.9;
  for(const r of NET.roads){const mx=(r.X[0]+r.X[r.X.length-1])/2,mz=(r.Z[0]+r.Z[r.Z.length-1])/2;if(Math.abs(mx-p.x)>R0+r.len/2||Math.abs(mz-p.z)>R0+r.len/2)continue;
    const[lo,hi]=r.tRange(r.len/2);x.strokeStyle=r.type==='EXP'?'#cfe3d6':r.type==='RAMP'?'#b7cdbf':r.type==='RES'?'#8f979c':r.nF+r.nB>=4?'#e2e6e8':'#b9c0c4';x.lineWidth=Math.max(2,(hi-lo)*S);
    x.beginPath();const st=Math.max(1,Math.floor(r.X.length/60));x.moveTo(r.X[0]*S,r.Z[0]*S);for(let i=st;i<r.X.length;i+=st)x.lineTo(r.X[i]*S,r.Z[i]*S);x.lineTo(r.X[r.X.length-1]*S,r.Z[r.Z.length-1]*S);x.stroke();}
  for(const n of NET.nodes){if(n.kind!=='x')continue;if(Math.abs(n.x-p.x)>R0||Math.abs(n.z-p.z)>R0)continue;x.fillStyle=n.signal?'#f0a500':'#a9b1b6';x.fillRect((n.x-n.hx)*S,(n.z-n.hz)*S,n.hx*2*S,n.hz*2*S);}
  for(const L of NET.lots){x.fillStyle='#9aa3a8';x.beginPath();L.poly.forEach((q,i)=>i?x.lineTo(q[0]*S,q[1]*S):x.moveTo(q[0]*S,q[1]*S));x.closePath();x.fill();}
  if(TRAIN){const rl=TRAIN.rail;x.strokeStyle='#5a4c3c';x.setLineDash([6,5]);x.lineWidth=3;x.beginPath();if(rl.ax==='x'){x.moveTo(rl.a*S,rl.c*S);x.lineTo(rl.b*S,rl.c*S);}else{x.moveTo(rl.c*S,rl.a*S);x.lineTo(rl.c*S,rl.b*S);}x.stroke();x.setLineDash([]);}
  if(NAV.pts&&NAV.pts.length>1){x.strokeStyle='#2f7cf6';x.lineWidth=5;x.beginPath();x.moveTo(NAV.pts[0].x*S,NAV.pts[0].z*S);for(const q of NAV.pts)x.lineTo(q.x*S,q.z*S);x.stroke();}
  if(STAGE.goal){x.fillStyle='#d42a2a';x.beginPath();x.arc(STAGE.goal.x*S,STAGE.goal.z*S,7,0,7);x.fill();}
  x.fillStyle='#e8eef0';for(const o of VEH){if(o.hidden)continue;if(Math.abs(o.x-p.x)>R0||Math.abs(o.z-p.z)>R0)continue;x.fillRect(o.x*S-2,o.z*S-2,4,4);}if(AMB){x.fillStyle='#ff3b30';x.beginPath();x.arc(AMB.x*S,AMB.z*S,5,0,7);x.fill();}
  x.restore();x.fillStyle='#ffffff';x.strokeStyle='#0d1114';x.lineWidth=2;x.beginPath();x.moveTo(W/2,W*0.62-12);x.lineTo(W/2+8,W*0.62+9);x.lineTo(W/2,W*0.62+4);x.lineTo(W/2-8,W*0.62+9);x.closePath();x.fill();x.stroke();
  x.fillStyle='#9fb0a8';x.font='bold 18px sans-serif';x.textAlign='center';x.save();x.translate(W/2,W*0.62);x.rotate(-p.h);x.fillText('N',0,-W*0.5);x.restore();}
const MINI={scale:1.35};
function applyMirrors(){const show=SETTINGS.mirrors&&viewMode==='cockpit'&&STAGE.running;if(!STAGE.running||viewMode!=='cockpit'){$('rearCam').hidden=true;document.body.classList.remove('revcam');}if(!STAGE.running&&typeof sgCardHide==='function')sgCardHide();
  const camTop=!$('rearCam').hidden&&(window.innerHeight<=520||(window.innerWidth<=620&&window.innerHeight>window.innerWidth));$('mirRear').hidden=!show||camTop;const narrow=window.innerWidth<560||window.innerHeight<360;$('mirL').hidden=!show||narrow&&!SETTINGS.sideOnPhone;$('mirR').hidden=!show||narrow&&!SETTINGS.sideOnPhone;resizeView();}

