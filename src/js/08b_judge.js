// ===== 08b_judge.js : 横断歩道・側方通過・衝突・車線変更・その他 =====
function crosswalkCheck(p,front){for(const X of XWALKS){if(X.diag)continue;const r=X.r;const dd=Math.hypot((X.a.x+X.b.x)/2-front.x,(X.a.z+X.b.z)/2-front.z);if(dd>45){J.xwIn.delete(X);continue;}
    const qq=projectOn(r,front.x,front.z,X.s);if(!qq){J.xwIn.delete(X);continue;}const along=qq.s,lat=qq.t;const w=X.node?X.node.xwW:(X.f.w||4);
    const inside=Math.abs(along-X.s)<w/2+0.3&&lat>X.lo-0.2&&lat<X.hi+0.2;
    if(!inside&&Math.abs(along-X.s)<9&&p.v<0.3&&X.peds.some(q=>q.mode==='xcross'||(q.mode==='xwait'&&(!X.sig||X.sig.pedFor(X.L)==='G'))))X.yielded=J.t;
    if(inside&&!J.xwIn.has(X)){J.xwIn.add(X);if(p.v>0.3){let bad=false;const pedSig=X.sig?X.sig.pedFor(X.L):null;
        for(const q of X.peds){const qq2=projectOn(r,q.x,q.z,X.s);if(!qq2)continue;const qlat=qq2.t;if(q.mode==='xwait'&&q.waitT>0.5&&(!X.sig||pedSig==='G'||pedSig==='OFF'))bad=true;
          if(q.mode==='xcross'){const t=q.from===0?X.b:X.a;const tq=projectOn(r,t.x,t.z,X.s);const tl=tq?tq.t:qlat;const toward=Math.sign(tl-qlat)===Math.sign(lat-qlat);if(Math.abs(qlat-lat)<2.6||toward)bad=true;}}
        if(bad)violate('ped');else if(X.yielded&&J.t-X.yielded<12)praise('pedYield');}}
    if(!inside&&J.xwIn.has(X)&&Math.abs(along-X.s)>3)J.xwIn.delete(X);}}
// ある道路のs付近への投影
function projectOn(r,x,z,sHint){const P=r.at(sHint);const f=fwd(P.h);const dx=x-P.x,dz=z-P.z;const ds=dx*f.x+dz*f.z;if(Math.abs(ds)>60)return null;const s=sHint+ds;const Q=r.at(clamp(s,0,r.len));return{s,t:(x-Q.x)*Q.rx+(z-Q.z)*Q.rz};}
function passCheck(p,dt){const f=fwd(p.h),r=rightV(p.h);
  for(const o of VEH){if(o.kind!=='bike'||o.hidden)continue;const dx=o.x-p.x,dz=o.z-p.z;const fw=dx*f.x+dz*f.z,lt=dx*r.x+dz*r.z;const same=Math.cos(wrapA(o.h-p.h))>0.7;
    let st=J.passBikes.get(o);if(!same||Math.abs(lt)>4.5){if(st)J.passBikes.delete(o);continue;}
    if(Math.abs(fw)<p.L/2+1.6){if(!st){st={minGap:9,maxV:0,yellow:false,done:false};J.passBikes.set(o,st);}const gap=Math.abs(lt)-p.W/2-0.33;st.minGap=Math.min(st.minGap,gap);st.maxV=Math.max(st.maxV,p.v);if(J.overYellow&&lt<0)st.yellow=true;}
    else if(st&&!st.done&&fw<-(p.L/2+1.6)){st.done=true;const kmh=Math.round(st.maxV*KMH);
      if(st.minGap<0.45)violate('near',`自転車との間隔 約${Math.max(0,st.minGap).toFixed(1)}m`);
      else if(st.minGap<1.0&&st.maxV*KMH>30.5)violate('bike',`間隔 約${st.minGap.toFixed(1)}m・${kmh}km/hで通過`);
      else praise('bikeOK');
      if(st.yellow)violate('yellowLine','自転車を追い越すために黄色の中央線をはみ出しました。');}}
  for(const q of PEDS){if(q.mode!=='walk'&&q.mode!=='script')continue;if(q.onWalk)continue;const dx=q.x-p.x,dz=q.z-p.z;const fw=dx*f.x+dz*f.z,lt=dx*r.x+dz*r.z;if(Math.abs(lt)>4||Math.abs(fw)>p.L/2+0.8)continue;
    const gap=Math.abs(lt)-p.W/2-0.3;if(gap<1.0&&p.v*KMH>15.5&&!J.passPeds.get(q)){J.passPeds.set(q,1);violate('pedSide',`歩行者との間隔 約${Math.max(0,gap).toFixed(1)}m・${Math.round(p.v*KMH)}km/h（ゲームでは1m未満かつ15km/h超を減点）`,6);}}}
function collisionCheck(p){if(STAGE.over)return;
  const pb={x:p.x,z:p.z,h:p.h,L:p.L-0.16,W:p.W-0.12};// 車の角は丸いので、箱を少し小さくして判定
  for(const o of VEH){if(o.hidden||Math.abs(o.x-p.x)>12||Math.abs(o.z-p.z)>12||Math.abs((o.y||0)-(p.y||0))>3)continue;if(obbOverlap(pb,{x:o.x,z:o.z,h:o.h,L:o.L-0.16,W:o.W-0.12})){crash(o.kind==='bike'?'自転車と衝突しました。':o.type==='amb'?'緊急自動車と衝突しました。':'車と衝突しました。',o);return;}
    // 相手に急ブレーキを踏ませた：こちらが割り込んだ・急に減速した・右折で直進車を妨げたときだけ（相手の車間不足のせいなら数えない）
    if(o.lastAcc<-4.2&&o.v>2&&!o.script){const lg=leaderOnPath(o,30);if(lg.obj===PLAYER){danger();
        // 同じ脚から交差点に入ってきた車（後ろについて来ている車）が横断歩道などで急ブレーキをかけても、右折の妨げ（第37条）ではない
        const sameLeg=!!(J.N&&((o.conn&&o.conn.node===J.N.n&&o.conn.from.inLeg===J.N.L)||(!o.conn&&o.lane&&o.lane.endNode()===J.N.n&&o.lane.entryLeg()===J.N.L)));
        if(J.N&&turnOf(J.N.h0,p.h)==='R'&&!sameLeg)violate('yield37','',8);else if(J.mergeWatch&&J.t-J.mergeWatch.t<4)violate('mergeYield','',10);else if(J.t-J.lastLaneChange.t<4)violate('cutIn','',10);else if(J.t-(J.lastHardDec||-99)<2.5)violate('near','急な減速で、後ろの車に急ブレーキを踏ませました。',8);}}}
  for(const q of PEDS){if(q.mode==='off'||Math.abs(q.x-p.x)>7||Math.abs(q.z-p.z)>7)continue;const d=distToOBB(p,q.x,q.z);
    if(d<q.R){if(Math.abs(p.v)<0.3){if(!J.nearPeds.has(q)){J.nearPeds.add(q);}continue;}// 止まっている車に人が触れた：運転による事故ではない
      crash(q.kind==='kid'?'子どもと接触しました。':'歩行者と接触しました。');return;}
    if(((d<0.6&&Math.abs(p.v)>2.8)||(d<0.3&&Math.abs(p.v)>1))&&!J.nearPeds.has(q)){J.nearPeds.add(q);danger();violate('near','歩行者のすぐそばを通過しました。',4);}}
  for(const o of NET.obst){if(o.solid)continue;if(obbOverlap(p,o)){crash(o.label||'障害物に衝突しました。');return;}}
  if(TRAIN&&TRAIN.active){for(const c of TRAIN.cars){const tb={x:c.position.x,z:c.position.z,h:-c.rotation.y,L:20,W:3};if(Math.abs(c.position.y-(p.y||0))<3&&Math.abs(tb.x-p.x)<15&&Math.abs(tb.z-p.z)<15&&obbOverlap(p,tb)){crash('踏切内で列車と衝突しました。');return;}}}}
function onCurb(hit){const cont=J.t-(J.lastHitT===undefined?-99:J.lastHitT)<0.5;J.lastHitT=J.t;if(cont||J.t-J.curbT<2.5){return;}J.curbT=J.t;SFX.bump&&SFX.bump();if(STAGE.onContact&&STAGE.onContact(hit))return;// 触れ続けている間は1回と数える
  const q=PLAYER.loc;violate('curb',q&&q.road&&q.road.type==='RES'?'塀・路肩に接触しました。止まってハンドルを切り直すか、{back}で戻りましょう。':'縁石に乗り上げました。止まってハンドルを切り直すか、{back}で戻りましょう。',9);}
function miscCheck(p,dt){
  // 前に横から入ってきた車（交差点から出てきた・割り込んできた）は「危険を避けるための急ブレーキ」
  {const f=fwd(p.h),rt=rightV(p.h);for(const o of VEH){if(o.hidden)continue;const dx=o.x-p.x,dz=o.z-p.z;const fw=dx*f.x+dz*f.z;if(fw<1||fw>16)continue;const lt=dx*rt.x+dz*rt.z;if(Math.abs(lt)>2.6)continue;if(Math.abs(Math.cos(wrapA(o.h-p.h)))<0.88||(o.lc&&fw<12)){danger();break;}}}
  if(p.a<-6.3&&p.v>1.5){J.hbT=(J.hbT||0)+dt;if(J.hbT>0.25){const emerg=J.t-J.dangerT<3.5;if(J.quake)violate('quakeBrake','',8);else if(!emerg)violate('hardBrake','',10);}}else J.hbT=0;
  // 車間距離（一般道：1秒未満が3秒続く／高速道路は expCheck）
  if(p.v>5.5&&!(J.road&&J.road.type==='EXP')){const lg=playerLeader(p,60);if(lg.obj&&lg.obj.kind!=='bike'&&lg.vl>2){const th=lg.gap/p.v;if(th<1.0){J.tailT+=dt;if(J.tailT>3)violate('tail',`車間 約${th.toFixed(1)}秒`,20);}else J.tailT=0;}else J.tailT=0;}
  const dark=ENV.dark;if(dark&&!p.lights&&p.v>1){J.lightsT+=dt;if(J.lightsT>4)violate('lights',ENV.mode==='fog'?'霧で視界が50m以下です。':'夜間です。',30);}else J.lightsT=0;
  if((ENV.mode==='rain'||ENV.mode==='fog')&&p.lights)praise('rainOK');
  if(AMB&&AMB.active){const dx=p.x-AMB.x,dz=p.z-AMB.z;const fa=fwd(AMB.h);const ahead=dx*fa.x+dz*fa.z;
    const lg2=leftEdgeGap(p);const yielding=(lg2<0.8&&p.v<5)||p.v<1.2;
    if((p.ambBlockT||0)>5){p.ambBlockT=0;if(!(yielding&&lg2<0.9))violate('emerg','救急車の進路をふさぎました。',20);}
    if(ahead>0&&ahead<45&&Math.cos(wrapA(p.h-AMB.h))>0.7&&yielding)J.ambYield=true;
    if(ahead>0&&ahead<28&&Math.cos(wrapA(p.h-AMB.h))>0.7&&!yielding){J.ambT+=dt;if(J.ambT>4)violate('emerg','左に寄せて減速し、進路を譲りましょう。',20);}else J.ambT=0;
    if(J.N&&p.v<0.3&&ahead>0&&ahead<60){J.ambNodeT+=dt;if(J.ambNodeT>2)violate('emerg','交差点の中で止まっています。交差点を避けて左に寄せます。',25);}else J.ambNodeT=0;}}
// プレイヤーの前の車（自分の車線・その先）
function playerLeader(p,maxD){const res={gap:Infinity,vl:0,obj:null};const ls=p.lanesNow||[];
  for(const l of ls){const u=l.uOf(J.s);for(const e of l.agents){if(e.o===p||e.u<=u)continue;const g=e.u-u-p.L/2-(e.o.L||4)/2;if(g<res.gap&&g<maxD){res.gap=g;res.vl=e.o.v||0;res.obj=e.o;}break;}}
  if(res.obj)return res;// 道路の外（交差点など）では幾何学的に
  const f=fwd(p.h),r=rightV(p.h);for(const o of VEH){if(o.hidden)continue;const dx=o.x-p.x,dz=o.z-p.z;const fw=dx*f.x+dz*f.z;if(fw<=0||fw>maxD)continue;const lt=dx*r.x+dz*r.z;if(Math.abs(lt)>p.W/2+o.W/2+0.2)continue;const g=fw-p.L/2-o.L/2;if(g<res.gap){res.gap=g;res.vl=o.v*Math.cos(wrapA(o.h-p.h));res.obj=o;}}
  return res;}
function onPlayerAction(kind,arg){const p=PLAYER;if(!p)return;
  if(kind==='horn'){const dg=J.t-J.dangerT<3||nearHazard(p);if(!dg&&STAGE.scoring&&!STAGE.hornOK)violate('horn','',8);}
  if(kind==='blink')J.lastBlink={side:arg,t:J.t};
  STAGE.onAction&&STAGE.onAction(kind,arg);}
function nearHazard(p){const f=fwd(p.h);for(const q of PEDS){if(q.mode==='off')continue;const dx=q.x-p.x,dz=q.z-p.z;const fw=dx*f.x+dz*f.z;if(fw>0&&fw<18&&Math.abs(dx*f.z-dz*f.x)<3)return true;}
  for(const o of VEH){if(o.hidden)continue;const dx=o.x-p.x,dz=o.z-p.z;const fw=dx*f.x+dz*f.z;if(fw>0&&fw<12&&Math.abs(dx*f.z-dz*f.x)<2.5&&Math.cos(wrapA(o.h-p.h))<0)return true;}return false;}
// ---- 車線変更 ----
function laneCheck(p,dt){const r=J.road;if(!r||!J.dir||p.v<2.5||J.t<5){J.lanePass.anchor=null;return;}
  const multi=r.allLanes(J.dir).length>1;
  if(multi){const l=J.lane;const idx=l?(l.kind==='main'?l.idx:l.kind):null;
    if(idx!==null&&J.laneIdx!==-1&&idx!==J.laneIdx&&J.laneObj&&J.laneObj.road===l.road){const from=J.laneObj;const side=sideOfChange(from,l);
      const ok=p.blink===side&&J.lastBlink.side===side&&(J.t-J.lastBlink.t)>=2.0;
      const nearEnd=J.A&&J.A.dEdge<8;
      if(!ok&&!nearEnd&&STAGE.laneCheck!==false)violate('laneBlink',side==='R'?'右へ車線を変えるときは3秒前に右の合図。':'左へ車線を変えるときも3秒前に左の合図。',6);
      // 黄色の線をこえた
      const ln=from.lineTo(side==='R'?1:-1,J.s);if(ln==='yellow')violate('laneYellow','',10);
      J.lastLaneChange={t:J.t,from,to:l,side};onLaneChange(from,l,side);}
    if(idx!==null){J.laneIdx=idx;J.laneObj=l;}return;}
  // 1車線の道路：横への移動（駐車車両をよけるなど）
  if(!J.A||J.A.dEdge<22||J.A.dEdge>r.len-15)return;const LP=J.lanePass;const lat=J.t2*J.dir;
  if(LP.anchor===null||J.t-LP.t>6){LP.anchor=lat;LP.t=J.t;LP.moveT=0;return;}const d=lat-LP.anchor;
  if(Math.abs(d)>0.3&&!LP.moveT)LP.moveT=J.t;if(Math.abs(d)<0.15){LP.t=J.t;LP.moveT=0;}
  if(Math.abs(d)>=1.0){const side=d>0?'R':'L';const ok=p.blink===side&&J.lastBlink.side===side&&(J.t-J.lastBlink.t)>=2.0;
    if(!ok&&STAGE.laneCheck!==false)violate('laneBlink',side==='R'?'右へ進路を変えるときは3秒前に右の合図。':'左へ戻るときも3秒前に左の合図。',6);LP.anchor=lat;LP.t=J.t;LP.moveT=0;}}
function sideOfChange(a,b){const s=J.s;return((b.tAt(s)-a.tAt(s))*a.dir>0)?'R':'L';}
function onLaneChange(from,to,side){// 合流・左側からの追越しの監視
  if(from.kind==='accel'&&to.kind==='main'){J.mergeWatch={t:J.t,v:PLAYER.v};if(PLAYER.v*KMH<55)advise('slowMerge','本線に入るときは、加速車線で本線の流れに近い速さまで加速しておくと安全です。');}
  if(side==='L'&&to.kind==='main'&&from.kind==='main'){const cands=[];for(const e of from.agents){if(e.o===PLAYER)continue;const du=e.u-from.uOf(J.s);if(du>0&&du<45)cands.push(e.o);}J.leftPass={t:J.t,lane:to,from,cands};}
  if(to.kind==='decel'){J.expo.decel={t:J.t,fromIdx:from.idx,s:J.s};}}

