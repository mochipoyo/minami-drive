// ===== 08a_judge.js : 採点（位置・速度・信号・一時停止・交差点） =====
const J={score:100,log:[],good:[],major:false,cool:{},A:null,N:null,started:false,t:0,limit:{v:30,legal:true},dangerT:-99,quake:false};
function judgeReset(){Object.assign(J,{score:100,log:[],good:[],major:false,cool:{},A:null,N:null,started:false,t:0,dangerT:-99,emergT:-99,quake:false,speedT:0,tailT:0,lightsT:0,
  lanePass:{anchor:null,t:0,moveT:0},curbT:-99,lastHitT:-99,xwIn:new Set(),passBikes:new Map(),passPeds:new Map(),nearPeds:new Set(),noEntryDone:false,beltWarned:false,keepT:0,overYellow:false,
  road:null,dir:0,lane:null,laneIdx:-1,lastLaneIdx:-1,laneSince:0,lastLaneChange:{t:-99},rightT:0,minT:0,stopT:0,shT:0,tunT:0,etcT:0,mergeWatch:null,leftPass:null,
  lastBlink:{side:null,t:-99},expo:{},revDir:0,startBlinkOK:false,ambYield:false,ambT:0,ambNodeT:0,nodeStopT:0,hazardJam:false});}
function violate(id,note,cool=10){if(!STAGE.scoring)return;const now=J.t;if(J.cool[id]!==undefined&&now-J.cool[id]<cool)return;J.cool[id]=now;const R0=RULES[id];if(!R0){console.warn('rule?',id);return;}
  J.score=Math.max(0,J.score-R0.p);if(R0.major)J.major=true;J.log.push({id,note,t:now});toast('bad',R0.t,-R0.p,(note?note+'　':'')+R0.x);SFX.buzz&&SFX.buzz();flash();VOICE.speak(R0.t);}
function praise(key,once=true){if(!STAGE.scoring)return;if(once&&J.good.includes(key))return;J.good.push(key);toast('good',GOOD[key],0,'');SFX.chime&&SFX.chime();}
function advise(key,text,cool=25){if(J.cool['adv_'+key]!==undefined&&J.t-J.cool['adv_'+key]<cool)return;J.cool['adv_'+key]=J.t;coach(text,6,1);}
function danger(){J.dangerT=J.t;}
// 道路上のプレイヤーの状態
function judgeLocate(p){const q=p.loc;J.q=q;J.road=null;J.dir=0;J.lane=null;J.s=0;J.t2=0;
  if(q&&q.kind==='road'){const r=q.road;const al=Math.cos(wrapA(p.h-r.at(q.s).h));J.road=r;J.s=q.s;J.t2=q.t;J.dir=al>0.45?1:al<-0.45?-1:0;
    if(J.dir){if(q.lane&&q.lane.dir===J.dir)J.lane=q.lane;else{// 路肩などにいる：同じ向きの一番近い車線
        let best=null,bd=1e9;for(const l of r.allLanes(J.dir)){if(q.s<l.s0||q.s>l.s1)continue;const d=Math.abs(q.t-l.tAt(q.s));if(d<bd){bd=d;best=l;}}J.laneNear=best;}
      J.limit=r.speedLimit();if(J.lane&&J.lane.limitV)J.limit={v:Math.round(J.lane.limitV*KMH),legal:false};}}
  return q;}
// 左側の縁（路肩を含む）までの距離：車の左側面から
function leftEdgeGap(p){const r=J.road;if(!r||!J.dir)return 9;const e=r._edges(J.dir,J.s);const tL=J.dir>0?e.outer-r.sh[0]:e.outer+r.sh[0];const t=J.t2;return J.dir>0?(t-p.W/2)-tL:tL-(t+p.W/2);}
// 道路の中央からの「右へのはみ出し」量（左側通行の確認）
function rightness(p){const r=J.road;if(!r||!J.dir||!(r.nF&&r.nB))return-9;return J.t2*J.dir+(r.med.w/2);}// 正なら中央線より右
function judgeUpdate(dt){const p=PLAYER;if(!p||STAGE.over)return;J.t+=dt;const f=fwd(p.h);const front={x:p.x+f.x*p.L/2,z:p.z+f.z*p.L/2};
  const q=judgeLocate(p);const moving=Math.abs(p.v)>0.4;if(p.a<-3.6&&p.v>1)J.lastHardDec=J.t;
  // 発進
  if(!J.started&&p.odo>0.6&&p.v>0.2){J.started=true;coachT=0;coachPri=0;if(STAGE.startCheck&&!p.belt)violate('belt','',999);if(STAGE.startRules!==false){if(!J.startBlinkOK)violate('startBlink','',999);if(!(p.t-p.lastLook.R<8))violate('startLook','',999);}}
  if(J.started&&!p.belt&&moving&&!J.beltWarned){J.beltWarned=true;if(STAGE.startCheck===false)violate('belt','');}
  if(!J.started&&p.blink==='R')J.startBlinkOK=true;
  // 速度
  const kmh=Math.abs(p.v)*KMH;const over=kmh-J.limit.v;
  if(over>2&&J.road){J.speedT+=dt;if(J.speedT>1.4){if(over>=20)violate('speedBig',`${Math.round(kmh)}km/h（上限${J.limit.v}）`,12);else violate('speed',`${Math.round(kmh)}km/h（上限${J.limit.v}）`,12);}}else J.speedT=0;
  const r=J.road;
  // 一方通行の逆走
  if(r&&r.oneway&&J.dir&&J.dir!==r.oneway&&p.v>0.5&&!J.noEntryDone){J.noEntryDone=true;violate('noEntry','一方通行の出口側から進入しました。');}
  // 左側通行（中央線のある・ない二方向の道路）
  if(r&&J.dir&&r.nF&&r.nB&&p.v>1&&r.type!=='EXP'&&!r.def.noKeep){const rt=rightness(p);const obst=obstacleAheadLeft(p,25);
    const returning=p.blink==='L'&&J.t-J.lastBlink.t<6;// 追い越し・よけたあと、左の合図を出して戻っている途中
    if(rt>0.25&&!obst&&!returning&&!J.lane){J.keepT+=dt;if(J.keepT>2.2)violate('keepLeft','',15);}else J.keepT=0;J.overYellow=r.center==='yellow'&&(rt+p.W/2>0.15);}else{J.keepT=0;J.overYellow=false;}
  // 交差点へのアプローチ
  if(r&&J.dir){const n=J.dir>0?r.endNode:r.startNode;const L=J.dir>0?r.endLeg:r.startLeg;const key=r.id+':'+J.dir;
    const sF=J.dir>0?J.s+p.L/2:J.s-p.L/2;const dEdge=J.dir>0?r.len-sF:sF;const sd=n&&n.kind==='x'?stopEdgeDist(n,L):0;const dLine=dEdge-sd;
    if(!J.A||J.A.key!==key){J.A={key,road:r,dir:J.dir,n,L,blinkSide:p.blink,blinkDist:p.blink?99:0,stopped:false,crossed:false,yel:null,xing:null,laneAtLine:null,d0:dEdge};}
    const A=J.A;A.dLine=dLine;A.dEdge=dEdge;A.lane=J.lane||J.laneNear;
    if(p.blink!==A.blinkSide){A.blinkSide=p.blink;A.blinkDist=p.blink?dEdge:0;}
    if(p.v<0.25&&dLine>-0.3&&dLine<5.5)A.stopped=true;
    if(n&&n.kind==='x'){
      if(n.signal&&!A.crossed){const sig=SIGS.get(n.k);const st=sig?sig.stateFor(L):'G';if(st==='Y'&&A.prevSt!=='Y'&&dLine>0)A.yel={d:dLine,v:p.v};if(st==='G')A.yel=null;A.prevSt=st;
        if(dLine<=0&&p.v>0.3){A.crossed=true;A.lineSt=st;A.laneAtLine=A.lane;
          if(st==='R')violate('red');else if(st==='Y'){const y=A.yel;if(y&&(y.v<1||y.d>y.v*y.v/(2*3.5)+y.v*0.6+1.5))violate('yellow',y.v<1?'止まっていた（またはほぼ止まっていた）ときに黄に変わったのに、停止線をこえました。':`黄に変わったとき停止線まで約${Math.round(y.d)}m・${Math.round(y.v*KMH)}km/hでした。`);}}
        if(dLine>0&&dLine<3&&p.v<0.2&&(st==='Y'||st==='R')&&A.yel)praise('yellowOK');}
      if(!n.signal&&n.stopLegs.includes(L)&&!A.crossed&&dLine<=-0.4&&p.v>0.2){A.crossed=true;A.laneAtLine=A.lane;if(!A.stopped)violate('stopSign');else praise('stopOK');}
      if(!A.crossed&&dLine<=0&&p.v>0.2){A.crossed=true;A.laneAtLine=A.lane;}}
    for(const ft of r.feats)if(ft.type==='rail'&&ft.s!==undefined)railCheck(p,r,ft,sF,dt);}
  // 交差点の中
  if(q&&q.kind==='node'){const n=q.node;
    if(!J.N||J.N.n!==n){const A=J.A;const fromLeg=A&&A.n===n?A.L:null;const el=A&&A.n===n?(A.laneAtLine||A.lane):null;
      let h0=fromLeg?legHeading[fromLeg]:p.h;if(n.poly&&A&&A.n===n&&A.road){const rr=A.road;const P0=rr.at(A.dir>0?rr.len:0);h0=A.dir>0?P0.h:wrapA(P0.h+Math.PI);}// 多角形の交差点：道路の実際の向き（斜めに入る）
      J.N={n,L:fromLeg,h0,blink:A&&A.n===n?{side:A.blinkSide,dist:A.blinkDist,d0:A.d0}:{side:p.blink,dist:0},entryGap:J.lastLeftGap!==undefined?J.lastLeftGap:0,entryRoad:A?A.road:null,entryDir:A?A.dir:0,
        entryLane:el,maxV:0,prog45:null,lineSt:A?A.lineSt:null,v0:p.v,stopT:0};blindCheck(n,J.N,p);}
    const N=J.N;N.maxV=Math.max(N.maxV,Math.abs(p.v));const dh=wrapA(p.h-N.h0);
    if(N.prog45===null&&dh>Math.PI/4){const ef=fwd(N.h0);N.prog45=(p.x-n.x)*ef.x+(p.z-n.z)*ef.z;}
    // 交差点の中で止まる（第50条：前が詰まっているのに入った）
    // 前の車が詰まっていて交差点の中で止まった（右左折で歩行者や対向車を待つのは除く）
    if(p.v<0.2&&n.signal){const lg=playerLeader(p,14);const jam=lg.obj&&lg.gap<9&&lg.vl<1;if(jam)N.stopT+=dt;const sig=SIGS.get(n.k);if(N.stopT>4&&N.L&&sig&&sig.stateFor(N.L)==='R'&&!AMB&&!J.quake)violate('box50','',30);}else N.stopT=0;}
  else if(J.N){nodeExit(J.N,p);J.N=null;}
  if(r&&J.dir)J.lastLeftGap=leftEdgeGap(p);
  crosswalkCheck(p,front);passCheck(p,dt);collisionCheck(p);miscCheck(p,dt);laneCheck(p,dt);expCheck(p,dt);cityCheck(p,dt);backCheck(p,dt);
  STAGE.judgeExtra&&STAGE.judgeExtra(dt);}
function obstacleAheadLeft(p,dist){const f=fwd(p.h),r=rightV(p.h);for(const o of VEH){if(o.hidden)continue;const dx=o.x-p.x,dz=o.z-p.z;const fw=dx*f.x+dz*f.z;if(fw<-8||fw>dist)continue;const lt=dx*r.x+dz*r.z;if(lt<0.6&&lt>-4.5&&(o.v<3||o.kind==='bike'))return true;}
  for(const q of PEDS){if(q.mode==='off')continue;const dx=q.x-p.x,dz=q.z-p.z;const fw=dx*f.x+dz*f.z;if(fw<-6||fw>dist)continue;const lt=dx*r.x+dz*r.z;if(lt<0.5&&lt>-4)return true;}
  for(const o of NET.obst){const dx=o.x-p.x,dz=o.z-p.z;const fw=dx*f.x+dz*f.z;if(fw<-8||fw>dist)continue;const lt=dx*r.x+dz*r.z;if(lt<0.6&&lt>-4.5)return true;}
  return!!(AMB&&AMB.active&&Math.hypot(AMB.x-p.x,AMB.z-p.z)<60);}
function blindCheck(n,N,p){if(n.signal||n.fil.length===0)return;const legs=Object.keys(n.legs);if(legs.length<3)return;
  const res=legs.every(L=>n.legs[L].road.type==='RES');if(!res||!N.L)return;if(n.stopLegs.includes(N.L))return;if(n.priority)return;if(Math.abs(p.v)*KMH>15)violate('blind',`進入速度 ${Math.round(Math.abs(p.v)*KMH)}km/h`);}
function nodeExit(N,p){if(!N.L||p.v<0)return;const n=N.n;let turn;
  if(n.poly&&p.loc&&p.loc.kind==='road'&&p.loc.lane){const l=p.loc.lane;const r2=l.road;const L2=r2.startNode===n?r2.startLeg:r2.endNode===n?r2.endLeg:null;turn=polyTurn(n,N.L,L2,N.h0,l.pos(0).h);}// 多角形の交差点：出た道路の向きと脚で判定（02h）
  else turn=turnOf(N.h0,p.h);
  if(n.noTurn&&n.noTurn[N.L]&&n.noTurn[N.L].includes(turn))violate('dirBan',turn==='R'?'この交差点は、さくら通りから右折できません（直進・左折のみ）。':'');
  if(turn==='L'||turn==='R'){const b=N.blink;if(b.side!==turn){if(b.side)violate('blink','曲がる方向と逆の合図でした。');else violate('blink',turn==='L'?'左折の合図が出ていませんでした。':'右折の合図が出ていませんでした。');}
    else if(b.dist<Math.min(24,(b.d0||99)*0.6))violate('blinkLate',`合図を出したのは交差点の約${Math.max(0,Math.round(b.dist))}m手前でした。`);
    if(N.maxV*KMH>20)violate('turnFast',`交差点内で最高${Math.round(N.maxV*KMH)}km/h`);
    const r=N.entryRoad,el=N.entryLane;
    if(r){const nMain=r.lanes(N.entryDir).length;
      if(turn==='L'){if(nMain>=2&&el&&el.kind==='main'&&el.idx>0)violate('leftPos','左折は一番左の車線から曲がります。');else if(N.entryGap>(r.type==='RES'?1.0:1.4))violate('leftPos',`左側端まで約${N.entryGap.toFixed(1)}m空いていました。`);}
      if(turn==='R'&&Object.keys(n.legs).length>2){const hasR=r.patches.some(q=>q.kind==='turnR'&&q.dir===N.entryDir);
        if(nMain>=2&&el&&!(el.kind==='turnR'||(!hasR&&el.idx===nMain-1)))violate('rightPos',hasR?'右折は右折車線に入ってから曲がります。':'右折は一番右の車線から曲がります。');
        else if(nMain<2&&r.type!=='RES'&&r.nF&&r.nB){const rt=-N.entryGap;}
        const half=(N.L==='W'||N.L==='E')?n.hx:n.hz;if(N.prog45!==null&&N.prog45<-half*0.65-1)violate('rightPos','交差点の手前から斜めにショートカットしました。');}
      // 進行方向別通行区分（車線の矢印）
      if(el&&el.arrows&&!el.arrows.includes(turn))violate('laneArrow',`この車線は「${arrowWords(el.arrows)}」の車線でした。`);}
    if(turn==='R'&&N.lineSt==='RA')praise('yieldOK');}
  if(turn==='S'&&N.entryLane&&N.entryLane.arrows&&!N.entryLane.arrows.includes('S'))violate('laneArrow',`この車線は「${arrowWords(N.entryLane.arrows)}」の車線でした。`);
  if(N.lineSt==='RA'&&turn!=='R')violate('red','右折の矢印信号で直進・左折しました。');}
function arrowWords(a){return a.split('').map(c=>c==='L'?'左折':c==='S'?'直進':'右折').join('・');}
function railCheck(p,r,ft,sF,dt){const line=ft.s-J.dir*8;const dl=(line-sF)*J.dir;const X=XINGS.find(x=>x.f===ft);if(!X)return;
  const A=J.A;if(!A.xing)A.xing={stopped:false,lookL:false,lookR:false,stopT:0,entered:false};const S=A.xing;
  if(dl>-0.3&&dl<6&&p.v<0.25){S.stopped=true;S.stopT+=dt;if(p.lookYaw<-0.8)S.lookL=true;if(p.lookYaw>0.8)S.lookR=true;}
  if(!S.entered&&dl<=-0.4&&p.v>0.2){S.entered=true;if(X.blocked())violate('rrAlarm');else if(!S.stopped)violate('rrNoStop');else{if(!(S.lookL&&S.lookR))violate('rrLook');else praise('rrOK');}
    if(!railRoom(r,ft,J.dir,p)&&!X.blocked())violate('rrJam');}
  if(dl>0&&dl<3&&p.v<0.2&&!X.blocked()&&!railRoom(r,ft,J.dir,p))praise('rrJamOK');}
function railRoom(r,ft,dir,p){const sFar=ft.s+dir*5;for(const l of r.lanes(dir)){const uF=l.uOf(sFar);for(const e of l.agents){if(e.o===p)continue;if(e.u>uF&&e.u-(e.o.L||4)/2<uF+p.L+2.5&&(e.o.v||0)<2)return false;}}return true;}

