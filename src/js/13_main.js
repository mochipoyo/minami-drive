// ===== 13_main.js : 地図の読み込み・進行・ナビ・メインループ =====
const NAV={wps:[],goal:null,pts:[],inWp:false,turn:null,turnDist:99};
let CURMAP=null;const PERSIST=[];
// ---- シーン（地図ごとに作り直す） ----
function newScene(){const old=scene;scene=new THREE.Scene();scene.fog=old?old.fog:new THREE.Fog(0xdbe6ec,160,900);
  for(const o of PERSIST)if(o)scene.add(o);
  if(old){old.traverse(o=>{if(o.isMesh||o.isLineSegments||o.isInstancedMesh){if(o.userData.batchKey||o.userData.mapOwned||o.isInstancedMesh||o.isLineSegments)if(o!==rainMesh&&o.geometry)o.geometry.dispose();
      if(o.userData.ownMat&&o.material){if(o.material.map)o.material.map.dispose();o.material.dispose();}}});}}
function disposeSignPages(){for(const t of SIGNPAGES)t.dispose();}
function loadMap(id){const M=MAPS[id];if(!M)throw new Error('map '+id);
  if(CURMAP===id){resetDynamic();return;}
  resetDynamic();newScene();disposeSignPages();CURMAP=id;NET.map=M;R=rng(1234);TILE=M.tile||120;PEDCAP=M.pedCap||160;shopAtlasReset();MAT.hill=MAT.hill||lambert(0xffffff,{vertexColors:true});
  BUILT.length=0;DECALS.length=0;TEXTSIGNS.length=0;LITSIGNS.length=0;SHOPSIGN.length=0;XINGS.length=0;SIGS.clear();TRAIN=null;NET.signs.length=0;NET.obst.length=0;
  netBuild(M.def());M.after&&M.after();
  // 標識の配置（データ）→ アトラス → メッシュ
  M.signs&&M.signs();
  const B=new Batch();buildAllRoads(B);
  const ids=new Set(M.signIds||[]);for(const e of NET.signs)for(const i of e.ids)ids.add(i);for(const d of DECALS)ids.add(d.cell);ids.add('blank');ids.add('crossbuck');buildSignAtlas([...ids]);
  buildDecals(B);const wires=[];M.build(B,wires);shopAtlasCommit();
  B.build(scene,MAT,{shadow:{def:{cast:true,recv:true},wall:{cast:true,recv:true},house:{cast:true,recv:true},fac0:{cast:true,recv:true},fac1:{cast:true,recv:true},fac2:{cast:true,recv:true},fac3:{cast:true,recv:true},fac4:{cast:true,recv:true},
    leaf:{cast:true},road:{recv:true},walk:{recv:true},grass:{recv:true},mark:{recv:true},conc:{cast:true,recv:true},paint:{cast:true,recv:true}}});
  const HB=new Batch();if(M.skyline)M.skyline(HB);else buildHills(HB,(M.bounds[0]+M.bounds[2])/2,(M.bounds[1]+M.bounds[3])/2,Math.max(M.bounds[2]-M.bounds[0],M.bounds[3]-M.bounds[1])*0.7+500,48,M.hillCols);MAT.hill=MAT.hill||lambert(0xffffff,{vertexColors:true});HB.build(scene,Object.assign({},MAT,{hill:MAT.hill,def:MAT.hill}));
  if(wires.length){const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));const ls=new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:C(0x222222)}));ls.userData.mapOwned=true;scene.add(ls);}
  buildTextSigns();buildSignals();buildCrossings(M.rail||null);buildXwalks();buildWalkPaths();initPedVariants();M.post&&M.post();
  MINI.scale=M.miniScale||1.35;cullBuild();}
function resetDynamic(){evClear();clearTraffic();clearPeds();for(const o of NET.obst.slice())if(o.model&&!o.static)removeObstacle(o);{const keep=NET.obst.filter(o=>o.static);NET.obst.length=0;NET.obst.push(...keep);}if(goalMarker){scene.remove(goalMarker);goalMarker=null;}}
// 路面の文字・記号
function buildDecals(B){for(const d of DECALS){const e=signCell(d.cell);const f=fwd(d.h),r=rightV(d.h);const hw=d.w/2,hl=d.l/2;const[u0,v0,u1,v1]=e.uv;
    const P=(a,b)=>({x:d.x+r.x*a+f.x*b,y:d.y,z:d.z+r.z*a+f.z*b});B.quad4('decal'+e.page,P(-hw,-hl),P(hw,-hl),P(hw,hl),P(-hw,hl),C(0xffffff),[[u0,v0],[u1,v0],[u1,v1],[u0,v1]]);}}
// 店の看板（文字のテクスチャ）
const TEXTCACHE=new Map();const LITSIGNS=[];
function textTex(t){const k=t.text+'|'+t.bg+'|'+t.fg+'|'+(t.vert?1:0);let tx=TEXTCACHE.get(k);if(tx)return tx;const W=t.vert?96:512,H=t.vert?384:128;const c=cvs(W,H),x=c.getContext('2d');x.fillStyle=t.bg;x.fillRect(0,0,W,H);
  if(t.bar){x.fillStyle=t.bar;x.fillRect(0,H-18,W,18);}x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=4;x.strokeRect(2,2,W-4,H-4);
  if(t.vert){const ch=[...t.text];const sz=Math.min(76,(H-24)/ch.length);ch.forEach((cc,i)=>txt(x,cc,W/2,12+sz*(i+0.5),sz*0.9,t.fg,FONT_JP,'center','bold'));}
  else txtFit(x,t.text,W/2,H/2-(t.bar?6:0),76,W-30,t.fg,FONT_JP,'center','bold');tx=texFrom(c);TEXTCACHE.set(k,tx);return tx;}
function buildTextSigns(){for(const t of TEXTSIGNS){const map=t.spec?guideTex(t.spec):textTex(t);const m=new THREE.Mesh(new THREE.PlaneGeometry(t.w,t.hh),t.lit?new THREE.MeshBasicMaterial({map}):new THREE.MeshLambertMaterial({map,emissive:C(0xffffff),emissiveIntensity:0.0,emissiveMap:null}));if(t.lit)LITSIGNS.push(m.material);
    m.position.set(t.x,t.y,t.z);m.rotation.y=-t.h;m.userData.mapOwned=true;m.userData.textSign=true;scene.add(m);}
  for(const t of SHOPSIGN){const tex=textTex({text:t.text,bg:t.col,fg:'#ffffff',vert:true});const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});const m=new THREE.Mesh(new THREE.PlaneGeometry(t.w,t.hh),mat);m.position.set(t.x,t.y,t.z);m.rotation.y=-t.h;m.userData.mapOwned=true;m.userData.textSign=true;scene.add(m);}}
// ---- 教習の開始 ----
function startStage(i){const s=STAGES[i];STAGE.idx=i;
  Object.assign(STAGE,{running:true,over:false,paused:false,menu:false,scoring:s.scoring!==false,startCheck:!!s.startCheck,startRules:s.startRules,time:0,lessonHint:null,queue:[],onAction:null,onContact:null,judgeExtra:null,finishOnQuake:null,doneT:0,emergency:false,fine:!!s.fine,hornOK:false,laneCheck:s.laneCheck,
    tick:null,navFn:null,autoStop:null,autoPlan:null,autoExit:null,aori:null,finishNote:null,beforeFinish:null,sgCourse:null,sgSeen:null,sgClosed:null,inPA:false,paCoach:0,edgeHint:0,mergeCoach:0,missPA:0,stopT:0,stopCoach:0});if(PLAYER)PLAYER.engineFault=false;
  loadMap(s.map||'town');R=rng(window.__seed!==undefined?window.__seed:Date.now()%100000);AUTO.agent=null;INPUT.auto=null;for(const k in PK)delete PK[k];STAGE.revTip=0;
  for(const g of SIGS.values())g.dark=false;ENV.shake=0;$('eew').hidden=true;$('phone').hidden=true;$('toasts').innerHTML='';
  if(s.random)s.generate();
  const st=s.startPose?s.startPose():(()=>{const q=townPose(s.start);const P=edgePos(q.road,q.s,q.dir,PLAYER.W/2+0.45);return{x:P.x,z:P.z,y:P.y,h:P.h};})();
  resetPlayer(st.x,st.z,st.h,st.y||0);PLAYER.loc=locate(st.x,st.z,st.y||0);judgeReset();setEnv(s.env||'day');SFX.rain&&SFX.rain(s.env==='rain');
  const M=NET.map;const T=s.traffic||M.traffic||{n:20,bikes:4,peds:20};TRAFFIC.mix=T.mix||null;TRAFFIC.exitP=T.exitP||0.3;
  spawnTraffic(T.n||0,{avoid:st,avoidR:50,filter:T.filter});if(T.bikes)spawnTraffic(T.bikes,{avoid:st,type:'bike',filter:l=>l.road.type!=='EXP'&&l.road.type!=='RAMP'&&(l.road.type!=='COL'||R()<0.6)&&(!T.filter||T.filter(l))});spawnPeds(T.peds||0,{avoid:st,avoidR:14});if(M.crowd&&typeof spawnStreetCrowd==='function')spawnStreetCrowd(M.crowdN||18);
  const p=PLAYER;p.lights=false;if(s.autoReady){p.belt=true;p.gear='D';p.pbrake=true;}if(s.rolling){p.belt=true;p.gear='D';p.pbrake=false;p.v=s.rolling/KMH;J.started=true;}
  NAV.goal=s.goalPose?s.goalPose():(s.goalRS?goalFrom(s.goalRS):s.goal?goalFrom(townPose(s.goal)):null);NAV.wps=(s.way||[]).map(k=>NET.nodeById[k]).filter(Boolean);NAV.inWp=false;STAGE.goal=NAV.goal;makeGoalMarker(NAV.goal);
  s.setup&&s.setup();
  $('hud').hidden=false;$('stageName').textContent=s.name;viewMode=s.view||'cockpit';applyTouch();applyMirrors();closeOv();
  NAV.turn=null;NAV.turnDist=99;STAGE.atGoal=false;STAGE.goalHint=0;STAGE.gapHint=0;STAGE.lastStepMsg=null;
  coachStep(true);if(s.coach)setTimeout(()=>{if(STAGE.running&&STAGE.idx===i&&J.started)coach(s.coach,8,1);},400);
  if(isTouch()&&!store('mdk_guide_seen'))setTimeout(()=>{if(STAGE.running&&!STAGE.over)showGuide(true);},400);}
function coachStep(force){const p=PLAYER;if(!STAGE.running||J.started)return;
  const msg=ENV.dark&&!p.lights?(ENV.mode==='fog'?'霧で見えにくいので':'暗いので')+'、まずライトをつけます（{lt}）。そのあとも光っているボタンを順番に押して発進しましょう。':STAGE.startCheck&&!p.belt?'発進の手順です。まずシートベルトを締めます（{belt}）。':p.gear!=='D'?'ブレーキを踏んだまま、シフトをDに入れます（{gear}）。':p.blink!=='R'&&STAGE.startRules!==false?'道路の端から出るので、右の合図を出します（{br}）。':!(p.t-p.lastLook.R<8)&&STAGE.startRules!==false?'右後方を目で見て、車や自転車が来ていないか確認します（{lkR}）。':p.pbrake?'パーキングブレーキを解除します（{pb}）。':'安全を確かめて、ゆっくり発進しましょう（{acc}）。';
  if(force||msg!==STAGE.lastStepMsg){STAGE.lastStepMsg=msg;coach(msg,30,2);}}
function finishStage(extra){if(STAGE.over)return;if(typeof STAGE.finishNote==='function'){try{extra=Object.assign({},STAGE.finishNote(),extra||{});}catch(e){}}STAGE.over=true;PLAYER.frozen=true;SFX.chime();setTimeout(()=>{STAGE.running=false;$('hud').hidden=true;applyMirrors();showResult(extra);},900);}
function crash(reason,o){if(STAGE.over)return;STAGE.over=true;J.log.push({id:'crash',note:reason,t:J.t});if(STAGE.scoring){J.score=0;J.major=true;}SFX.crash();flash();PLAYER.v=0;PLAYER.frozen=true;ENV.shake=0;
  window.__lastCrash={reason,o:o?{x:o.x,z:o.z,h:o.h,v:o.v,type:o.type,lane:o.lane&&o.lane.road.id+':'+o.lane.dir+':'+o.lane.kind,conn:o.conn&&(o.conn.node.id+':'+o.conn.turn+':'+o.conn.from.road.id+'>'+o.conn.next.road.id),why:o.stopWhy,swept:o.sweptBy===PLAYER?'P':o.sweptBy?'V':null,acc:o.lastAcc}:null,p:{x:PLAYER.x,z:PLAYER.z,h:PLAYER.h,v:PLAYER.v,loc:PLAYER.loc&&PLAYER.loc.kind,turn:AUTO.turn?AUTO.turn.D.c.turn:null}};
  setTimeout(()=>{STAGE.running=false;$('hud').hidden=true;applyMirrors();showCrash(reason);},1100);}
function endStage(toMenu){STAGE.running=false;STAGE.over=true;evClear();$('hud').hidden=true;applyMirrors();if(toMenu)showMenu();}
// ---- ナビ ----
function navTick(){const p=PLAYER;const A=J.A;NAV.turn=null;NAV.turnDist=99;STAGE.atGoal=false;
  if(STAGE.navFn&&STAGE.navFn()!==false)return;
  if(!A){return;}
  if(J.N&&NAV.wps[0]===J.N.n)NAV.inWp=true;else if(NAV.inWp&&!J.N){NAV.wps.shift();NAV.inWp=false;}
  if(!NAV.goal&&!NAV.wps.length){setNav('S',null,'道なりに進みましょう');NAV.pts=[];return;}
  const G=NAV.goal;
  if(G&&J.road===G.road&&J.dir===G.dir&&!NAV.wps.length){const d=(G.s-J.s)*G.dir-p.L/2+0;setNav('G',Math.max(0,d),d>-3?'停止位置まで。左に寄せて止めます':'停止位置を通り過ぎました');NAV.pts=[{x:p.x,z:p.z},{x:G.x,z:G.z}];
    if(d<45&&d>5&&!STAGE.goalHint){STAGE.goalHint=1;coach('停止位置が近づいてきました。左に寄せて、白い線にぴったり止めましょう。止まったらパーキングブレーキ（{pb}）。',7,1);}
    const dd=(G.s-J.s)*G.dir-p.L/2;STAGE.atGoal=Math.abs(dd)<3.5&&p.v===0;// 車の先端と停止位置の線の差
    if(Math.abs(dd)<3.5&&p.v===0&&(p.pbrake||p.gear==='P')&&!STAGE.over&&!STAGE.paused){const gap=leftEdgeGap(p);if(gap<1.35){const prec=Math.abs(dd);if(STAGE.beforeFinish){const f=STAGE.beforeFinish;STAGE.beforeFinish=null;f(()=>finishStage({prec}));}else finishStage({prec});}else if(!STAGE.gapHint){STAGE.gapHint=1;coach('もう少し左に寄せて止めましょう。',4,1);}}
    return;}
  const n0=A.n;if(!n0||n0.kind!=='x'){setNav('S',A.dEdge,'道なりに');return;}
  const path=navPath(n0,A.L)||[n0];
  NAV.pts=[{x:p.x,z:p.z},...path.map(n=>({x:n.x,z:n.z}))];if(G)NAV.pts.push({x:G.x,z:G.z});
  const nxt=path[1];let ex=nxt?legTo(n0,nxt):null;
  if(!ex&&G&&path.length===1&&path.exitLeg)ex=path.exitLeg;
  if(!ex){setNav('S',A.dEdge,'道なりに');return;}
  const turn=turnOf(legHeading[A.L],outHeading[ex]);const what=n0.signal?'信号':n0.stopLegs.includes(A.L)?'一時停止':Object.keys(n0.legs).length===2?'角':'交差点';
  setNav(turn==='U'?'S':turn,A.dEdge,`${what}を${turn==='L'?'左折':turn==='R'?'右折':'直進'}`);if(turn==='L'||turn==='R'){NAV.turn=turn;NAV.turnDist=A.dEdge;}
  if((turn==='L'||turn==='R')&&A.dEdge<70&&A.dEdge>35&&STAGE.lastTurnCoach!==n0.id+A.L){STAGE.lastTurnCoach=n0.id+A.L;const multi=A.road.lanes(A.dir).length>1;
    coach(`この先の${what}を${turn==='L'?'左折':'右折'}します。30m手前で${turn==='L'?'左の合図（{bl}）':'右の合図（{br}）'}。${turn==='L'?(multi?'一番左の車線から曲がります。':'左に寄せて徐行。'):(multi?'右折車線・一番右の車線から。対向車を先に。':'中央に寄せて、対向車を先に。')}`,6);}}
function stageTick(dt){if(!STAGE.running||STAGE.over)return;STAGE.time+=dt;const p=PLAYER;
  if(!J.started)coachStep();
  for(const q of STAGE.queue){if(q.done)continue;if(q.x!==undefined&&p.x>q.x&&Math.cos(p.h-Math.PI/2)>0.5){q.done=q.fn();continue;}if(q.s!==undefined&&J.road&&J.road.id===q.road&&(J.s-q.s)*q.dir>0){q.done=q.fn();continue;}
    if(q.t!==undefined&&STAGE.time>q.t){q.done=q.fn();continue;}if(q.odo!==undefined&&p.odo>q.odo){const ok=q.fn?q.fn():randomEvent(q.k);if(ok)q.done=true;else q.odo+=40;}}
  if(STAGE.finishOnQuake&&STAGE.finishOnQuake.done)finishStage({});
  navTick();STAGE.tick&&STAGE.tick(dt);
  // 地図の端：その先は地図の外。自由走行では向きを変えて戻す
  {const A=J.A;if(A&&A.n&&A.n.kind==='portal'&&!(STAGE.scoring&&NET.map&&NET.map.id==='exp')){if(A.dEdge<35&&!STAGE.edgeHint){STAGE.edgeHint=1;coach('この先は地図の外です。'+(STAGE.scoring?'ナビの案内に従って戻りましょう。':'端まで行くと、向きを変えて戻ります。'),5,1);}
      if(!STAGE.scoring&&A.dEdge<6&&Math.abs(p.v)<3){const r=A.road,dir=-A.dir;const l=r.lanes(dir)[0];if(l){const P=l.pos(clamp(l.uOf(J.s),2,l.len-2),0);resetPlayer(P.x,P.z,P.h,P.y||0);p.belt=true;p.gear='D';p.pbrake=false;J.started=true;STAGE.edgeHint=0;toast('info','向きを変えました',0,'');}}}}
  if(J.road&&STAGE.lastRoad!==J.road.def.group+(J.road.type)){const r=J.road;STAGE.lastRoad=r.def.group+r.type;const prevType=STAGE.lastType;STAGE.lastType=r.type;
    if(STAGE.time>2&&prevType!==r.type){if(r.type==='RES'&&!r.limit)coach('中央線のない生活道路に入りました。標識がなければ法定速度は30km/hです。',5);
      else if(!r.limit&&(r.type==='COL'||r.type==='ART')&&r.speedLimit().v===60)coach('中央線や車線のある、速度標識のない道路です。法定速度は60km/hですが、周りの状況に合わせた速度で。',5);}}}
function randomEvent(k){const p=PLAYER;const r=J.road;if(!r||!J.dir||!J.A)return false;const rem=J.A.dEdge;
  if(k==='phone'){evPhone();return true;}if(k==='fog'){evWeather(ENV.mode==='night'?'fog':pick(['rain','fog']));return true;}
  if(k==='brake'){if(r.type==='RES'||rem<110)return false;return!!evSuddenBrake();}
  if(k==='amb'){if(r.type==='RES'||rem<120)return false;return!!evAmbulance();}
  if(k==='kid'){if(r.type!=='RES'||rem<80)return false;evChildRunOut(r,J.s+J.dir*50,J.dir);return true;}
  if(k==='bike'){if(rem<110)return false;evBike(r,J.s+J.dir*45,J.dir,R()<0.5);return true;}return true;}
// ===== メインループ =====
let last=0,orbit=0;
function simStep(dt){for(const s of SIGS.values())s.update(dt);if(TRAIN)TRAIN.update(dt);for(const X of XINGS)X.update(dt,TRAIN);if(NET.map&&NET.map.tick)NET.map.tick(dt);parkedHazards();
  if(STAGE.running){autoTick(dt);updatePlayer(dt);}
  rebuildLaneLists();for(const v of VEH)updateVeh(v,dt);trafficTick(dt);updatePeds(dt);
  if(STAGE.running){evUpdate(dt);judgeUpdate(dt);stageTick(dt);}}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,Math.max(0.001,(now-last)/1000||0.016));last=now;
  if(window.__hold)return;
  if(!STAGE.paused){simStep(dt);SFX.update(dt);}
  if(STAGE.running){placeCams(dt);updateHud(dt);tunnelLight(dt);PLAYER.model.grp.visible=true;cockpit.visible=viewMode==='cockpit';}
  else{orbit+=dt*0.04;const M=NET.map;const cx=M?(M.bounds[0]+M.bounds[2])/2:0,cz=M?(M.bounds[1]+M.bounds[3])/2:0;const R0=M?Math.max(150,(M.bounds[2]-M.bounds[0])*0.35):250;camera.position.set(cx+Math.cos(orbit)*R0,95,cz+Math.sin(orbit)*R0);camera.lookAt(cx,0,cz);cockpit.visible=false;if(PLAYER)PLAYER.model.grp.visible=false;sun.position.set(cx+70,110,cz+45);sun.target.position.set(cx,0,cz);}
  renderPeds(dt);adaptRes(dt);cullTick();
  renderAll(STAGE.running&&viewMode==='cockpit'&&SETTINGS.mirrors);}
function boot(data){
  if(data&&data.settings)Object.assign(SETTINGS,data.settings);if(data&&data.best)BEST=Object.assign({},data.best,BEST);
  if(window.claude&&window.claude.hot&&window.claude.hot.snapshot){try{window.claude.hot.snapshot(()=>({settings:SETTINGS,best:BEST}));}catch(e){}}
  if(typeof THREE==='undefined'){$('loadMsg').textContent='3D表示の読み込みに失敗しました。ネットワーク接続を確認して再読み込みしてください。';return;}
  const coarse=matchMedia('(pointer:coarse)').matches;const small=Math.min(screen.width,screen.height)<900;const q=SETTINGS.quality!=='auto'?SETTINGS.quality:(coarse&&small?'low':coarse?'mid':'high');
  try{scene=new THREE.Scene();initGeo();makeMaterials();modelMats(null);signalMats();initRenderer(q);
    skyMesh=buildSky();buildRain();PERSIST.push(hemi,sun,sun.target,skyMesh,rainMesh,cockpit);
    makePlayer();PERSIST.push(PLAYER.model.grp,PLAYER.headL,PLAYER.headL.target);PLAYER.model.grp.visible=false;
    loadMap('town');setEnv('day');}
  catch(e){$('loadMsg').textContent='初期化に失敗しました：'+e.message;console.error(e);return;}
  VOICE.on=SETTINGS.voice;buildControls();bindKeys();applyTouch();resizeView();window.addEventListener('resize',()=>{resizeView();applyMirrors();});
  $('btnPause').onclick=togglePause;$('btnCam').onclick=toggleView;$('btnSound').onclick=()=>{SETTINGS.sound=!SETTINGS.sound;SFX.init();SFX.setOn(SETTINGS.sound);store('mdk_settings',SETTINGS);toast('info',SETTINGS.sound?'サウンド オン':'サウンド オフ',0,'');};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&STAGE.running&&!STAGE.paused&&!STAGE.over)togglePause();});
  $('loadMsg').hidden=true;showMenu();requestAnimationFrame(frame);
  window.__sim={STAGE,J,VEH,PEDS,SIGS,XINGS,XWALKS,NET,NAV,EVS,KEY,INPUT,startStage,act,locate,loadMap,
    step(n,dt=1/30){for(let i=0;i<n;i++){if(!STAGE.paused)simStep(dt);}if(STAGE.running){placeCams(dt);hudT=0;updateHud(dt);}},
    render(){if(STAGE.running){placeCams(0.016);cockpit.visible=viewMode==='cockpit';}renderPeds(0);CULL.t=3;cullTick();renderAll(STAGE.running&&viewMode==='cockpit'&&SETTINGS.mirrors);},
    renderAt(P,T){cockpit.visible=false;renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setViewport(0,0,window.innerWidth,window.innerHeight);camera.position.set(P[0],P[1],P[2]);camera.lookAt(T[0],T[1],T[2]);renderPeds(0);if(skyMesh)skyMesh.position.set(camera.position.x,0,camera.position.z);sun.position.set(P[0]+80,(P[1]||0)+120,P[2]+50);sun.target.position.set(T[0],T[1],T[2]);renderer.render(scene,camera);},
    setView(m){viewMode=m;applyMirrors();},setEnv(m){setEnv(m);},get P(){return PLAYER;},get J2(){return J;},renderer:()=>renderer,camera:()=>camera,scene:()=>scene,dbgB:{BUILT,clearOfRoads,overlapsBuilt,CITYB:typeof CITYB!=='undefined'?CITYB:null},
    SIGNS:()=>SIGNDATA,signCanvas:(id,px)=>signCanvas(id,px),signMissing:()=>signArtMissing(),auto(on,opts){AUTO.on=!!on;AUTO.agent=null;Object.assign(AUTO,opts||{});if(!on)INPUT.auto=null;},AUTO,STAGES,MAPS,dbg:()=>autoDbg(),planner:(l)=>autoPlanner(l),answer:()=>choiceAnswerOK(),dev:{locateDbg,isDrivable,drvAt,drvProject,corners,inNode,connAt,locate,makeDrivePath,obstAhead,laneGapAt,nearHazards,leaderOnPath,wantsExit,wantedDecel,tryLaneChange,parkTarget:()=>typeof PARK!=='undefined'&&PARK.target?{x:PARK.target.x,z:PARK.target.z,za:PARK.target.za,zb:PARK.target.zb}:null,streetParkJudge:()=>streetParkJudge(),PK:()=>JSON.parse(JSON.stringify(PK,(k,v)=>typeof v==='function'||(v&&v.var)?undefined:v))}};}
// フォントを待ってから起動（標識の文字のため）
setTimeout(()=>{const go=()=>{(window.claude&&window.claude.hot&&window.claude.hot.ready)?window.claude.hot.ready(boot):boot((window.claude&&window.claude.hot&&window.claude.hot.data)||{});};
  let done=false;const once=()=>{if(!done){done=true;go();}};try{Promise.all([document.fonts.load('700 20px "BIZ UDPGothic"'),document.fonts.load('20px "Dela Gothic One"'),document.fonts.load('700 20px "Saira Condensed"')]).then(once,once);}catch(e){once();}setTimeout(once,2500);},30);

