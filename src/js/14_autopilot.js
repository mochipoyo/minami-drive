// ===== 14_autopilot.js : 自動運転（お手本・テスト用）。AI車の判断をプレイヤーの車に使う =====
const AUTO={on:false,agent:null,lcT:0,lastLc:null,exit:false,maxKmh:0,pbSet:false,turn:null,shift:null,goalT:0,seqT:0};
function autoInit(){const p=PLAYER;AUTO.agent={kind:'car',type:'compact',L:p.L,W:p.W,v:0,d:0,dGoal:0,lane:null,u:0,conn:null,cu:0,next:null,decideOnly:true,vpref:0.97,aggr:0.2,lcCool:2,lcT:0,
  x:p.x,z:p.z,h:p.h,y:0,id:-1,m:{grp:new THREE.Group()},planner:autoPlanner,hidden:false,exitPlan:AUTO.exit};AUTO.lastLc=null;AUTO.pbSet=false;AUTO.turn=null;AUTO.shift=null;AUTO.goalT=0;AUTO.seqT=0;AUTO.startDone=false;AUTO.dAnc=undefined;AUTO.dWant=null;AUTO.rec=null;AUTO.stallT=0;AUTO.goalBlink=false;AUTO.jamHz=false;AUTO.jamHzUsed=false;AUTO.jamStopT=0;}
// ナビの経路から、この車線の先の交差点で曲がる方向
function autoPlanner(l){if(STAGE.autoPlan){const t=STAGE.autoPlan(l);if(t)return t;}if(AUTO.replan&&AUTO.replan.road===l.road&&AUTO.replan.dir===l.dir)return AUTO.replan.turn;
  const n=l.endNode();if(!n||n.kind!=='x')return null;const G=NAV.goal;
  if(!NAV.wps.length&&!(G&&G.road)){// 行き先なし（自由走行）：地図の外に出る道は選ばない
    const moves=movesFrom(l);const ok=[...moves.keys()].filter(t=>{const c=moves.get(t)[0];const r2=c.next.road;const far=c.next.dir>0?r2.endNode:r2.startNode;return t!=='U'&&far&&far.kind!=='portal';});return ok.length?pick(ok):null;}
  const path=navPath(n,l.inLeg);if(!path)return null;let ex=path.length>=2?legTo(n,path[1]):path.exitLeg;if(!ex)return null;return turnOf(legHeading[l.inLeg],outHeading[ex]);}
function autoCancelLc(a){const c=a.lc;if(!c)return;const s=a.lane.sOf(a.u);const f=c.from;if(f&&f.road===a.lane.road){a.lane=f;a.u=clamp(f.uOf(s),0,f.len);a.d=0;}a.lc=null;AUTO.lastLc=null;}
function autoSetLane(a,l,keepD){if(!a.lane||a.lane.road!==l.road)a.planTurn=null;a.lane=l;a.next=null;a.lc=null;if(!keepD)a.d=0;else a.d=clamp(a.d,-l.w/2,l.w/2);a.stopDone=false;a.xingDone=false;a.wait=0;}
function autoSync(){const p=PLAYER,a=AUTO.agent;a.v=Math.max(0,p.v);a.x=p.x;a.z=p.z;a.h=p.h;a.y=p.y;const q=p.loc;
  if(q&&q.kind==='road'){const al=Math.cos(wrapA(p.h-q.road.at(q.s).h));const dir=al>0?1:-1;
    if(a.conn){AUTO.lastConn=a.conn;a.conn=null;}
    if(!a.lane||a.lane.road!==q.road||a.lane.dir!==dir){let l=q.lane&&q.lane.dir===dir?q.lane:null;if(!l){let bd=1e9;for(const c of q.road.allLanes(dir)){if(q.s<c.s0||q.s>c.s1)continue;const dd=Math.abs(q.t-c.tAt(q.s));if(dd<bd){bd=dd;l=c;}}}
      if(l){const straight=AUTO.lastConn&&AUTO.lastConn.turn==='S'&&AUTO.lastConn.next===l;autoSetLane(a,l,straight);}}
    if(a.lane){if(q.s<a.lane.s0-1||q.s>a.lane.s1+1){const nl=a.lane.next[0]&&a.lane.next[0].lane;if(nl&&q.s>=nl.s0-1&&q.s<=nl.s1+1){const kd=a.d;autoSetLane(a,nl);a.d=kd;}}a.u=clamp(a.lane.uOf(q.s),0,a.lane.len);}}
  else if(q&&q.kind==='node'){if(!a.conn&&a.lane&&a.next&&a.next.conn)a.conn=a.next.conn;if(!a.conn&&a.lane){const nx=chooseNext(a);if(nx&&nx.conn)a.conn=nx.conn;}
    if(a.conn)a.cu=connProject(a.conn,p.x,p.z).s;}}
// これから通る線上の点（現在地から Ld m 先）
function autoTarget(Ld){const a=AUTO.agent;const T=AUTO.turn;if(T)return drvAt(T.D,T.s+Ld);
  if(a.conn){const s=a.cu+Ld;if(s<=a.conn.len)return connAt(a.conn,s);const nl=a.conn.next;return nl.pos(Math.min(nl.len,s-a.conn.len),0);}
  const l=a.lane;const u=a.u+Ld;const nx=a.next;const D=nx&&nx.conn&&nx.conn.drv;
  if(D){const s0=l.len-D.sIn;if(u>=s0)return drvAt(D,u-s0);}
  if(u<=l.len){let d=a.d;if(AUTO.dWant!==null&&AUTO.dWant!==undefined){const vv=Math.max(PLAYER.v,1.5);d+=clamp(AUTO.dWant-a.d,-(AUTO.latR||0.8)*Ld/vv,(AUTO.latR||0.8)*Ld/vv);}return l.pos(u,d);}
  if(nx&&nx.conn){const c=nx.conn;const s=u-l.len;if(s<=c.len)return connAt(c,s);return c.next.pos(Math.min(c.next.len,s-c.len),0);}
  if(nx&&nx.link)return nx.link.pos(Math.min(nx.link.len,u-l.len),0);if(l.next[0])return l.next[0].lane.pos(Math.min(l.next[0].lane.len,u-l.len),0);return l.pos(l.len,a.d);}
// 右左折中は「実際に曲がれる円弧」をたどる
function autoTurnState(){const a=AUTO.agent,p=PLAYER;
  if(AUTO.turn){const D=AUTO.turn.D;const s=drvProject(D,p.x,p.z);if(s<D.len+1.0&&s>-3){AUTO.turn={D,s};return;}AUTO.turn=null;}// 曲がっている途中はその円弧を最後までたどる
  const D=(a.conn&&a.conn.drv)||(!a.conn&&a.next&&a.next.conn&&a.next.conn.drv);
  if(!D){AUTO.turn=null;return;}const s=drvProject(D,p.x,p.z);if(s>-0.4&&s<D.len+1.0)AUTO.turn={D,s};else AUTO.turn=null;}
// ハンドル：経路の曲がり具合（先読み）＋向きのずれ＋横のずれ
function autoSteer(p){const st=1+Math.max(0,p.v)*0.05;const P0=autoTarget(0),P1=autoTarget(st),P2=autoTarget(2*st);
  const hp=headingOf(P1.x-P0.x,P1.z-P0.z);const h2=headingOf(P2.x-P1.x,P2.z-P1.z);
  const kap=wrapA(h2-hp)/st;const rv=rightV(hp);const e=(p.x-P0.x)*rv.x+(p.z-P0.z)*rv.z;const he=wrapA(hp-p.h);const v=Math.max(0.3,Math.abs(p.v));
  const delta=Math.atan(kap*p.wb)+he+Math.atan(-1.5*e/(v+1.0));const dmax=Math.min(0.58,Math.atan(6.5*p.wb/Math.max(p.v*p.v,0.01)));return clamp(delta/dmax,-1,1);}
function autoDbg(){const a=AUTO.agent;if(!a)return null;const ld=leaderOnPath(a);const nh=nearHazards(a);const l=a.lane;const n=l&&l.endNode();
  return{lane:l&&l.id,u:a.u&&+a.u.toFixed(1),len:l&&+l.len.toFixed(1),conn:a.conn&&a.conn.id,cu:a.cu&&+a.cu.toFixed(1),next:a.next&&(a.next.conn?a.next.conn.turn:a.next.link?'link':'?'),need:a.next&&a.next.need&&a.next.need.map(x=>x.id),
    acc:+(a.lastAcc||0).toFixed(2),v0:+(a.lastV0||0).toFixed(1),why:a.stopWhy,stop:a.lastStop===Infinity?'inf':+(a.lastStop||0).toFixed(2),gap:a.dbgGap,who:a.dbgWho,stopDone:a.stopDone,xingDone:a.xingDone,wait:a.wait,
    ld:ld.obj?{gap:+ld.gap.toFixed(1),vl:+ld.vl.toFixed(1),who:ld.obj===PLAYER?'PLAYER':ld.obj.type||ld.obj.kind}:null,nh:nh.gap<Infinity?{gap:+nh.gap.toFixed(1),what:nh.obj?(nh.obj===PLAYER?'PLAYER':nh.obj.kind||nh.obj.type||(nh.obj.R?'ped:'+nh.obj.mode:'obst')):null,x:nh.obj&&+nh.obj.x.toFixed(1),z:nh.obj&&+nh.obj.z.toFixed(1),sw:nh.obj&&nh.obj.sweptBy?'yes':''}:null,
    node:n&&{id:n.id,sig:n.signal?SIGS.get(n.k).stateFor(l.entryLeg()):null,stopLeg:n.stopLegs.includes(l.entryLeg()),busy:nodeBusy(n,a)},d:+a.d.toFixed(2),lc:!!a.lc,turn:AUTO.turn?+AUTO.turn.s.toFixed(1):null};}
// 発進の手順（お手本）：ベルト→D→右の合図→右後方の確認→パーキングブレーキ解除
function autoStartSeq(dt){const p=PLAYER;AUTO.seqT+=dt;if(AUTO.seqT<0.5)return true;AUTO.seqT=0;
  if(ENV.dark&&!p.lights){act('lt',true);return true;}if(!p.belt){act('belt',true);return true;}if(p.gear!=='D'){act('gear',true);return true;}
  if(STAGE.startRules!==false){if(p.blink!=='R'){act('br',true);return true;}if(!(p.t-p.lastLook.R<6)){INPUT.lookUntilR=p.t+0.9;AUTO.seqT=-0.6;return true;}}
  if(p.pbrake){act('pb',true);return true;}return false;}
function autoTick(dt){if(!AUTO.on||!STAGE.running||STAGE.over||STAGE.paused)return;const p=PLAYER;if(!AUTO.agent)autoInit();const a=AUTO.agent;
  if(!J.started&&p.v<0.1&&(p.gear!=='D'||p.pbrake||!p.belt)){if(autoStartSeq(dt)){INPUT.auto={acc:0,brk:0.6,steer:0};return;}}
  autoSync();
  if(!a.lane){INPUT.auto={acc:0,brk:1,steer:0};return;}
  a.dAct=(J.road===a.lane.road&&J.dir===a.lane.dir)?(J.t2-a.lane.tAt(clamp(J.s,a.lane.s0,a.lane.s1)))*a.lane.dir:a.d;
  // 故障：ハザード→第1通行帯→左の路肩に寄せて止まる
  const fault=p.engineFault&&a.lane.road.type==='EXP';if(fault){if(!p.hazard)act('hz',true);a.forceNeed=a.lane.road.lanes(1)[0];}else a.forceNeed=null;
  // 停止位置が同じ道路の先にあるとき：早めに一番左の車線へ
  {const G0=NAV.goal;if(!fault&&G0&&G0.road&&!NAV.wps.length&&a.lane.kind==='main'&&a.lane.idx>0&&J.road===a.lane.road){let dd0=null;
      if(a.lane.road===G0.road&&a.lane.dir===G0.dir)dd0=(G0.s-J.s)*G0.dir;
      else if(J.A&&J.A.n&&(G0.dir>0?G0.road.startNode:G0.road.endNode)===J.A.n&&a.next&&a.next.conn&&a.next.conn.turn==='S'&&a.next.conn.next.road===G0.road)dd0=J.A.dEdge+(G0.dir>0?G0.s:G0.road.len-G0.s);
      if(dd0!==null&&dd0>0&&dd0<230)a.forceNeed=a.lane.road.lanes(a.lane.dir)[0];}}
  {const st=STAGE.autoStop&&STAGE.autoStop();if(st!==null&&st!==undefined&&st!==false){const d=st===true?0:st;// 止まるまでの距離（m）
    if(d<=0.3||p.v<0.05){INPUT.auto={acc:0,brk:p.v>0.3?0.45:0.6,steer:autoSteer(p)};if(p.v===0&&!p.pbrake&&!AUTO.pbSet){AUTO.pbSet=true;act('pb',true);}return;}
    AUTO.stopD=d;}else AUTO.stopD=null;}
  if(AUTO.lastLc&&!a.lc)a.lcCool=Math.max(a.lcCool||0,0.8);// 前の車線変更が終わるまで次の車線変更をしない
  updateVeh(a,dt);let acc=a.lastAcc||0;if(AUTO.maxKmh&&p.v*KMH>AUTO.maxKmh)acc=Math.min(acc,-0.5);
  // 車線変更の合図を出している間（まだ元の車線にいる）は、元の車線の前の車にも合わせる
  if(a.lc&&a.lc.from&&a.lc.from!==a.lane){const f=a.lc.from;const s=a.lane.sOf(a.u);const u=f.uOf(s);let g=Infinity,vl=0;
    for(const e of f.agents){if(e.o===p||e.o===a)continue;if(e.u>u){const gg=e.u-u-p.L/2-(e.o.L||4)/2;if(gg<g){g=gg;vl=e.vv!==undefined?e.vv:(e.o.v||0);}}}
    if(g<Infinity)acc=Math.min(acc,idm(a,a.v0||10,Math.max(0.1,g),vl));
    const ob=obstAhead({lane:f,u,L:p.L},60);if(ob)acc=Math.min(acc,idm(a,a.v0||10,Math.max(0.1,ob.gap),0));}
  if(AUTO.stopD!==null&&AUTO.stopD!==undefined){const vd=Math.sqrt(2*1.2*Math.max(0,AUTO.stopD-0.3));acc=Math.min(acc,clamp((vd-p.v)*1.5,-4,1));}
  if(fault&&a.lane.kind==='main'&&a.lane.idx===0&&!a.lc){const sh=a.lane.road.sh[0];a.dGoal=-(a.lane.w/2+sh/2)+0.15;}
  autoTurnState();
  // 停止位置へ：左の合図 → 3秒ほどしてから左に寄せ、車の先端を線に合わせて止める
  const G=NAV.goal;let goal=false;
  if(G&&G.road&&!NAV.wps.length&&!a.conn&&!AUTO.turn&&a.lane.road===G.road&&a.lane.dir===G.dir&&J.road===G.road){const dd=(G.s-J.s)*G.dir-p.L/2;
    if(dd<75&&dd>-4){goal=true;if(dd<55){if(p.blink!=='L'&&dd>4&&!AUTO.goalBlink){AUTO.goalBlink=true;setBlink('L');AUTO.goalT=0;}AUTO.goalT+=dt;
        const inLeft=a.lane.kind!=='main'||a.lane.idx===0;if(AUTO.goalT>2.8&&inLeft&&!a.lc){const dG=(G.t-a.lane.tAt(clamp(J.s,a.lane.s0,a.lane.s1)))*a.lane.dir;a.d+=clamp(dG-a.d,-0.6*dt,0.6*dt);}if(a.lc&&!(a.lc.side<0))autoCancelLc(a);}// 左の車線へ移る途中ならそのまま
      const inL=a.lane.kind!=='main'||a.lane.idx===0;
      if(inL){const vdes=Math.sqrt(2*1.2*Math.max(0,dd-0.15));const ag=clamp((vdes-p.v)*1.4,-6,1.2);acc=Math.min(acc,ag);if(dd<0.25)acc=Math.min(acc,-3);}
      else acc=Math.min(acc,clamp(((dd>30?8.5:4.5)-p.v)*1.0,-3,1));// まだ左の車線に移れていない：流れに合わせて進みながら移る
      if(p.v===0&&dd<1.5&&!p.pbrake&&!AUTO.pbSet){AUTO.pbSet=true;act('pb',true);}}}
  else AUTO.goalBlink=false;
  const turnSoon=!a.conn&&a.next&&a.next.conn&&(a.next.conn.turn==='L'||a.next.conn.turn==='R')&&a.lane.len-a.u<42;
  // よける・戻る横の動き（1m前後動くときは、合図を出して約3秒たってから）
  // 実際の横位置（車線の中心から。右が正）
  const dAct=(J.road===a.lane.road&&J.dir===a.lane.dir)?(J.t2-a.lane.tAt(clamp(J.s,a.lane.s0,a.lane.s1)))*a.lane.dir:a.d;
  if(AUTO.dAnc===undefined||a.lane!==AUTO.ancLane){AUTO.dAnc=a.d;AUTO.ancLane=a.lane;AUTO.shift=null;}
  AUTO.dWant=null;const latR=Math.min(0.8,0.12+0.25*Math.max(0,p.v));AUTO.latR=latR;
  if(!goal&&!a.lc&&!AUTO.lastLc&&!AUTO.turn&&!a.conn){const want=a.dGoal||0;const far=Math.abs(want-AUTO.dAnc)>0.45;
    if(far){const side=want>AUTO.dAnc?'R':'L';if(!AUTO.shift||AUTO.shift.side!==side){AUTO.shift={side,t:0};if(p.blink!==side&&!turnSoon)setBlink(side);}AUTO.shift.t+=dt;
      // 対向車が近いとき：右へは出ない／左へはすぐ戻る
      const onc=oncomingAhead(a,60);const oncNear=onc&&(onc.d<18||(Math.abs(onc.o.v)>0.5&&onc.d<60));const blockR=side==='R'&&oncNear;const urgentL=side==='L'&&oncNear;
      if(urgentL||(!blockR&&(AUTO.shift.t>2.7||turnSoon))){a.d+=clamp(want-a.d,-latR*dt,latR*dt);AUTO.dWant=want;}
      // 合図を出している間に障害物に近づきすぎない
      else if(a.obGap<Infinity){const room=a.obGap-7;acc=Math.min(acc,room>0?clamp((Math.sqrt(2*1.5*room)-p.v)*1.2,-5,1):-4);}
      // 実際に寄り終わったら合図を消す
      if(Math.abs(a.d-want)<0.06&&Math.abs(dAct-want)<0.1){AUTO.shift.done=(AUTO.shift.done||0)+dt;if(AUTO.shift.done>0.6){if(p.blink===side&&!turnSoon)p.blink=null;AUTO.shift=null;AUTO.dAnc=want;}}}
    else{a.d+=clamp(want-a.d,-latR*dt,latR*dt);AUTO.dWant=want;}}
  a.dGoal=0;
  // 発進の合図は、車線に入ったら消す
  if(J.started&&!AUTO.startDone&&p.odo>12){AUTO.startDone=true;if(p.blink==='R'&&!AUTO.shift&&!a.lc&&!turnSoon)setBlink('R');}
  // 車線変更：3秒前から合図（その間は横に動かない）
  if(a.lc&&a.lc!==AUTO.lastLc){AUTO.lastLc=a.lc;AUTO.lcT=0;const side=a.lc.side>0?'R':'L';if(p.blink!==side)setBlink(side);}
  const turnSame=!a.conn&&a.next&&a.next.conn&&a.next.conn.turn===p.blink&&a.lane.len-a.u<130;// 右折車線に移ったあと、そのまま右折する：合図は消さない
  // 車線変更：実際に新しい車線の中央付近に着くまでは合図を出したまま
  if(a.lc){AUTO.lcT+=dt;if(AUTO.lcT<3.1){a.lc.t=0;a.d=a.lc.d0;// 動き出す直前に、もう一度すき間を確かめる
      if(AUTO.lcT>2.6&&a.lc.from&&a.lc.from.road===a.lane.road&&!laneSafeNow(a,a.lane,a.lane.sOf(a.u))){const side=a.lc.side>0?'R':'L';autoCancelLc(a);a.lcCool=2.5;if(p.blink===side)p.blink=null;}}}else if(AUTO.lastLc&&!a.lc&&Math.abs(a.dAct||0)<0.55){AUTO.lastLc=null;if(p.blink&&!goal&&!turnSoon&&!turnSame)p.blink=null;}
  // 右左折の合図（30m以上手前）
  if(!goal&&turnSoon&&p.blink!==a.next.conn.turn)setBlink(a.next.conn.turn);
  // 渋滞の最後尾：ハザードで後ろの車に知らせる（NEXCOの呼びかけ。法律上の義務ではない）
  if(a.lane.road.type==='EXP'&&!fault){const ld=leaderOnPath(a,320);const tail=ld.obj&&ld.vl<5&&ld.gap<300&&p.v>8;
    if(tail&&!AUTO.jamHzUsed&&!p.hazard){act('hz',true);AUTO.jamHz=true;AUTO.jamHzUsed=true;AUTO.jamT=0;}
    if(AUTO.jamHz){AUTO.jamT+=dt;if(p.v<1.5)AUTO.jamStopT=(AUTO.jamStopT||0)+dt;if((AUTO.jamStopT>3&&AUTO.jamT>6)||(!tail&&p.v>12&&AUTO.jamT>3)){if(p.hazard)act('hz',true);AUTO.jamHz=false;}}}
  // ライト（夜・霧・雨・トンネル）
  const tun=J.road&&J.road.tunnels&&J.road.tunnels.some(t=>J.s>t.s0-30&&J.s<t.s1+10);const needL=ENV.dark||ENV.mode==='fog'||ENV.mode==='rain'||tun;
  if(needL&&!p.lights){act('lt',true);AUTO.autoLights=true;}else if(!needL&&p.lights&&AUTO.autoLights){act('lt',true);AUTO.autoLights=false;}
  // 踏切：止まったら左右を目で確認してから
  const X=J.A&&J.A.xing;if(X&&X.stopped&&!X.entered&&p.v<0.25){if(!X.lookL){INPUT.lookUntilL=p.t+0.6;INPUT.lookUntilR=0;}else if(!X.lookR){INPUT.lookUntilL=0;INPUT.lookUntilR=p.t+0.6;}if(!(X.lookL&&X.lookR))acc=Math.min(acc,-1);}
  // 曲がった先の横断歩道：人がいれば車体がかかる手前で待つ（もうかかっていたら抜ける）
  {const cc=(AUTO.turn&&AUTO.turn.D.c)||a.conn||(a.next&&a.next.conn&&a.lane.len-a.u<18?a.next.conn:null);
    if(cc&&cc.turn!=='S'&&exitXwalkBusy(cc)){const X=exitXwalk(cc);if(X){const hit=xwalkHitAhead(ds=>{const P=autoTarget(ds),Q=autoTarget(ds+0.4);return{x:P.x,z:P.z,h:headingOf(Q.x-P.x,Q.z-P.z)};},p.L,p.W,X,14);
        if(hit!==null&&hit>0.2){const room=hit-0.45;acc=Math.min(acc,room>0?clamp((Math.sqrt(2*2.2*room)-p.v)*1.6,-7,1):-7);}}}}
  if(fault){const dA=(J.t2-a.lane.tAt(clamp(J.s,a.lane.s0,a.lane.s1)))*a.lane.dir;const on=a.lane.idx===0&&dA<-(a.lane.w/2+0.4);acc=on?-1.6:Math.min(acc,-0.4);}// 路肩に入ったら、車線を走る車には反応せずに静かに止まる
  const steer=autoSteer(p);
  let pa=0,pb=0;if(acc>0.05)pa=clamp(acc/2.2,0,1);else if(acc<-0.15)pb=clamp(-acc/7.5,0.04,1);if(p.v<0.3&&acc<0.05)pb=Math.max(pb,0.35);
  // 縁石などで進めなくなったら、少し下がってやり直す（保険）
  if(AUTO.rec){const Rc=AUTO.rec;Rc.t+=dt;
    if(Rc.ph===0){if(Math.abs(p.v)<0.05&&p.gear!=='R')cycleGear();if(p.gear==='R'){Rc.ph=1;Rc.d0=p.revDist||0;}INPUT.auto={acc:0,brk:0.5,steer:0};return;}
    if(Rc.ph===1){const back=(p.revDist||0)-Rc.d0;if(back<1.8&&Rc.t<5){INPUT.auto={acc:0.25,brk:0,steer:-Rc.steer};return;}Rc.ph=2;}
    if(Rc.ph===2){if(Math.abs(p.v)>0.05){INPUT.auto={acc:0,brk:0.8,steer:0};return;}if(p.gear!=='D')cycleGear();AUTO.rec=null;AUTO.stallT=0;}}
  if(pa>0.12&&Math.abs(p.v)<0.05&&J.started&&!p.pbrake)AUTO.stallT=(AUTO.stallT||0)+dt;else AUTO.stallT=0;
  if(AUTO.stallT>2.5){AUTO.rec={t:0,ph:0,steer};AUTO.stallT=0;}
  INPUT.auto={acc:pa,brk:pb,steer};}
