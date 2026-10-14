// ===== 06a_traffic.js : AI車両（車線グラフ上：追従・車線変更・合流・交差点） =====
const VEH=[];let PLAYER=null;let AMB=null;
const TRAFFIC={mix:null,spawnT:0,target:0,despawnFar:420};
let VEHID=1;
class Veh{
  constructor(kind,type,color){this.id=VEHID++;this.kind=kind;this.type=type||kind;
    const m=kind==='bike'?makeBike():kind==='moto'?makeMoto():makeCar(type,color!==undefined?color:type==='amb'?0xffffff:type==='bus'?0xf2f2f0:type==='police'?0xf4f4f2:type==='taxi'?pick([0xf2c200,0x2b4a8a,0x5d8a3a,0x222326]):pick(CARCOL));
    this.m=m;this.L=m.L;this.W=m.W;scene.add(m.grp);this.v=0;this.d=0;this.dGoal=0;this.lc=null;this.blink=null;this.blinkT=Math.random();this.brake=false;this.wait=0;this.hidden=false;
    this.vpref=kind==='bike'?3.4+R()*1.4:kind==='moto'?1.0+R()*0.12:(0.86+R()*0.18);this.aggr=R();this.lane=null;this.u=0;this.conn=null;this.cu=0;this.next=null;this.want=null;this.lcT=R();this.y=0;}
  place(l,u){if(!this.lane||this.lane.road!==l.road)this.planTurn=null;this.lane=l;this.u=u;this.conn=null;this.cu=0;this.next=null;this.want=null;this.stopDone=false;this.xingDone=false;this.d=this.kind==='bike'?-(l.wAt(l.sOf(u))/2-0.55):0;this.dc=0;this.lc=null;this.pose();}
  pose(){let p;const z=null;if(z){p=drvAt(z.D,z.s);const q=drvAt(z.D,z.s+0.4);p.h=headingOf(q.x-p.x,q.z-p.z);p.y=z.D.y;}
    else if(this.conn){p=connAt(this.conn,this.cu);if(this.dc){const rv=rightV(p.h);p={x:p.x+rv.x*this.dc,z:p.z+rv.z*this.dc,y:p.y,h:p.h};}}else{const l=this.lane;p=l.pos(clamp(this.u,0,l.len),this.d);if(this.lc){p.h+=this.lc.dh||0;}}
    this.x=p.x;this.z=p.z;this.y=p.y||0;this.h=p.h;this.m.grp.position.set(p.x,this.y,p.z);this.m.grp.rotation.y=-this.h;}
  remove(){const i=VEH.indexOf(this);if(i>=0)VEH.splice(i,1);scene.remove(this.m.grp);this.hidden=true;}
}
// ---- 車線ごとの並び（毎フレーム作り直す） ----
function rebuildLaneLists(){for(const l of NET.lanes)l.agents.length=0;for(const c of NET.conns)c.agents.length=0;
  for(const v of VEH){if(v.hidden||v.offLane)continue;if(v.conn)v.conn.agents.push({o:v,u:v.cu});else if(v.lane){v.lane.agents.push({o:v,u:v.u});if(v.lc&&v.lc.from&&Math.abs(v.d)>0.9){const f=v.lc.from;f.agents.push({o:v,u:f.uOf(v.lane.sOf(v.u))});}
      // 逆走車（特殊モード 12g）：車体がかかっている反対向きの車線にも、向かってくる車（速さがマイナス）として入れる
      if(v.wrongLane){const w=v.wrongLane;w.agents.push({o:v,u:w.uOf(v.lane.sOf(v.u)),vv:-v.v});}}}
  // プレイヤー：今いる車線（またぐ場合は両方）
  const p=PLAYER;if(p&&!p.ghost&&STAGE.running){p.lanesNow=[];const q=p.loc;
    if(q&&q.kind==='road'){const r=q.road;for(const dir of[1,-1]){for(const l of r.allLanes(dir)){if(q.s<l.s0-1||q.s>l.s1+1)continue;const w=l.wAt(q.s);if(w<0.5)continue;
          if(Math.abs(q.t-l.tAt(q.s))<w/2+p.W/2-0.25){const al=Math.cos(wrapA(p.h-(dir>0?r.at(q.s).h:r.at(q.s).h+Math.PI)));const vv=p.v*al;l.agents.push({o:p,u:l.uOf(q.s),vv,d:(q.t-l.tAt(q.s))*l.dir});p.lanesNow.push(l);}}}}
    else if(q&&q.kind==='node'){// 交差点の中：近い接続路に入れる（後ろの車が追突しないように）
      for(const L in q.node.legs){const e=q.node.legs[L];const r=e.road;for(const l of r.allLanes(e.end==='end'?1:-1)){for(const c of l.conns){const pr=connProject(c,p.x,p.z);if(pr.d2<2.6&&Math.cos(wrapA(p.h-pr.h))>0.75)c.agents.push({o:p,u:pr.s,vv:p.v*Math.cos(wrapA(p.h-pr.h))});}}}}}
  for(const l of NET.lanes)if(l.agents.length>1)l.agents.sort((a,b)=>a.u-b.u);for(const c of NET.conns)if(c.agents.length>1)c.agents.sort((a,b)=>a.u-b.u);}
// ---- 前方の車（同じ車線→その先） ----
function leaderOnPath(v,maxD=120,skip=null,lat=false){const res={gap:Infinity,vl:0,obj:null};const myL=v.L/2;
  const scan=(list,uFrom,offset)=>{for(const e of list){if(e.o===v||e.o===skip||(v.decideOnly&&e.o===PLAYER))continue;if(lat){const od=e.d!==undefined?e.d:(e.o.d||0);if(Math.abs(od-v.d)>(v.W+(e.o.W||1.8))/2+0.3)continue;}if(e.u<=uFrom)continue;const o=e.o;const g=offset+(e.u-uFrom)-myL-(o.L||4)/2;if(g<res.gap){res.gap=g;res.vl=e.vv!==undefined?e.vv:(o.v||0);res.obj=o;}return true;}return false;};
  if(v.conn){if(scan(v.conn.agents,v.cu,0))return res;let off=v.conn.len-v.cu;const nl=v.conn.next;if(off<maxD)scan(nl.agents,-0.01,off);return res;}
  const l=v.lane;if(scan(l.agents,v.u,0))return res;let off=l.len-v.u;
  if(off<maxD){if(v.next&&v.next.conn){const c=v.next.conn;if(scan(c.agents,-0.01,off))return res;off+=c.len;if(off<maxD)scan(c.next.agents,-0.01,off);}
    else if(v.next&&v.next.link){scan(v.next.link.agents,-0.01,off);}}
  return res;}
function idm(v,v0,gap,vl,s0=2){const a=v.kind==='bike'?1.0:v.type==='bus'||v.type==='big'?1.1:1.7,b=2.6,T=v.kind==='bike'?1.0:v.lane&&v.lane.road.type==='EXP'?(v.decideOnly?3.0:1.6):(v.decideOnly?1.8:1.35);if(v0<=0.01)v0=0.01;
  let acc=a*(1-Math.pow(Math.max(v.v,0)/v0,4));if(gap<Infinity){const ss=s0+Math.max(0,v.v*T+v.v*(v.v-vl)/(2*Math.sqrt(a*b)));acc-=a*Math.pow(ss/Math.max(gap,0.05),2);}
  return clamp(acc,-8,a);}
// 割り込まれたときなどに、必要以上の急ブレーキをしない（IDM＋CAH：Kesting・Treiber の ACC モデル。前の車の加速度は0とみなす）
function accIDM(v,v0,gap,vl){const ai=idm(v,v0,gap,vl);if(!(gap<Infinity)||gap<0.5)return ai;const vv=Math.max(v.v,0);
  const ac=vl>=vv?0:-(vv-vl)*(vv-vl)/(2*gap);if(ai>=ac)return ai;const b=2.0,c=0.99;return Math.max(-8,(1-c)*ai+c*(ac+b*Math.tanh((ai-ac)/b)));}
// ---- 行き先の選択 ----
function movesFrom(l,v){// 同じ道路・同じ向きのすべての車線から出られる動き（駐車場の出入口へは入らない）
  const r=l.road;const all=r.allLanes(l.dir).filter(x=>x.conns.length);const set=new Map();for(const x of all)for(const c of x.conns){if((c.next.road.def.lotRoad||c.next.road.def.closedBy)&&!(v&&v.lotOK))continue;if(!set.has(c.turn))set.set(c.turn,[]);set.get(c.turn).push(c);}return set;}
function chooseNext(v){const l=v.lane;if(l.next.length&&!l.conns.length){return{link:l.next[0].lane};}
  const node=l.endNode();if(!node||node.kind!=='x')return null;
  const moves=movesFrom(l,v);if(!moves.size)return null;const keys=[...moves.keys()];
  const w=keys.map(t=>v.kind==='bike'?(t==='S'?6:t==='L'?1:0.15):v.type==='amb'?(t==='S'?10:0.2):(t==='S'?5:t==='L'?2.2:2));
  let tot=w.reduce((a,b)=>a+b,0),x=R()*tot,turn=keys[0];for(let i=0;i<keys.length;i++){x-=w[i];if(x<=0){turn=keys[i];break;}}
  const pt=v.planTurn;if(pt&&pt.road===l.road&&pt.dir===l.dir&&moves.has(pt.turn))turn=pt.turn;
  if(v.planner){const t=v.planner(l);if(t&&moves.has(t))turn=t;}
  if(v.forceTurn&&moves.has(v.forceTurn))turn=v.forceTurn;v.planTurn={road:l.road,dir:l.dir,turn};
  const opts=moves.get(turn);const mine=opts.filter(c=>c.from===l);const c=mine.length?pick(mine):null;
  return{turn,conn:c,need:c?null:opts.map(o=>o.from)};}
// 高速道路の出口：減速車線へ
// 出口・PAに入るか（減速車線ごとに決める）。自動運転は AUTO.exit / AUTO.pa
function wantsExit(v,p){if(!v.exitPlans)v.exitPlans={};const k=(p&&p.pid)||'ic';if(v.decideOnly&&STAGE.autoExit){const r=STAGE.autoExit(k);if(r!==undefined)return r;}if(v.exitPlans[k]===undefined){
    if(v.decideOnly)v.exitPlans[k]=k==='pa'?!!AUTO.pa:!!v.exitPlan;else if(v.exitPlan!==undefined&&k!=='pa')v.exitPlans[k]=v.exitPlan;else v.exitPlans[k]=R()<(p&&p.exitP!==undefined?p.exitP:(TRAFFIC.exitP||0.3));}
  return v.exitPlans[k];}
// これから出る減速車線（近い順に、出るつもりのもの）
function wantedDecel(v,lane,s,range=900){const c=[];for(const p of lane.road.patches){if(p.kind!=='decel'||p.dir!==lane.dir)continue;const d=lane.dir>0?p.s0-s:s-p.s1;const inside=lane.dir>0?(s>=p.s0-1&&s<p.s1-10):(s<=p.s1+1&&s>p.s0+10);if((d>-1||inside)&&d<range)c.push({p,d});}
  c.sort((a,b)=>a.d-b.d);for(const e of c)if(wantsExit(v,e.p))return e.p;return null;}
function upcomingDecel(lane,s,range=900){for(const p of lane.road.patches){if(p.kind!=='decel'||p.dir!==lane.dir)continue;
    if(lane.dir>0){if(s<p.s1-10&&p.s0-s<range)return p;}else{if(s>p.s0+10&&s-p.s1<range)return p;}}return null;}
// ---- 車線変更 ----
function laneGapAt(l,u,self){let lead=null,lu=Infinity,fol=null,fu=-Infinity;for(const e of l.agents){if(e.o===self||(self&&self.decideOnly&&e.o===PLAYER))continue;if(e.u>=u&&e.u<lu){lu=e.u;lead=e;}if(e.u<u&&e.u>fu){fu=e.u;fol=e;}}
  return{lead,lu,fol,fu};}
function tryLaneChange(v,side,mand){const l=v.lane;const s=l.sOf(v.u);const tgt=l.neighbor(side,s);if(!tgt)return false;const line=l.lineTo(side,s);if(line==='yellow')return false;if(line==='solid'&&!mand)return false;
  // 車線変更が終わるまでの間に黄色の線（進路変更禁止）がないか
  {const span=Math.max(10,v.v*((mand?2.6:3.6)+(v.decideOnly?3.3:0)));for(let ds=10;ds<=span;ds+=10){const s2=s+ds*l.dir;if(s2<0||s2>l.road.len)break;if(l.lineTo(side,s2)==='yellow')return false;}}
  if(((tgt.kind==='accel'||tgt.kind==='decel'||tgt.kind==='turnR')&&!mand)||tgt.kind==='toll')return false;
  // 減速車線へは、幅が十分に広がってから（すりつけ部分の手前は路肩）
  if(tgt.kind==='decel'&&tgt.wAt(s)<(v.decideOnly?3.3:2.2))return false;const tu=tgt.uOf(s);if(tu<2||tu>tgt.len-8)return false;
  // 高速道路：移る先の車線に落下物・止まっている車があれば移らない
  if(l.road.type==='EXP'){const ob=obstAhead({lane:tgt,u:tu,L:v.L},300);if(ob&&ob.gap<(mand?70:290))return false;}
  else{for(const o of NET.obst){if(o.road!==l.road||o.s===undefined)continue;const du=(o.s-s)*l.dir;if(du<-(v.L/2+(o.L||4)/2+3)||du>(mand?25:85))continue;// 移る先の車線の止まっている車（横に並んでいるものも）
      const P=l.road.at(o.s);const tO=(o.x-P.x)*P.rx+(o.z-P.z)*P.rz;if(Math.abs(tO-tgt.tAt(o.s))>tgt.wAt(o.s)/2+(o.W||1)/2-0.1)continue;return false;}}
  const g=laneGapAt(tgt,tu,v);const leadGap=g.lead?(g.lu-tu)-v.L/2-(g.lead.o.L||4)/2:Infinity;const folGap=g.fol?(tu-g.fu)-v.L/2-(g.fol.o.L||4)/2:Infinity;
  if(leadGap<(mand?2.5:5)||folGap<(mand?3:6))return false;
  // 後ろの車が強くブレーキしないか
  if(g.fol){const fo=g.fol.o;const fv=g.fol.vv!==undefined?g.fol.vv:fo.v;const fake={v:fv,kind:fo.kind||'car',type:fo.type,lane:tgt};const af=idm(fake,Math.max(fv,v.v,5),folGap,v.v);if(af<(mand?-3.2:-1.8))return false;if(fo===PLAYER&&af<-1.2&&!mand)return false;}
  const a0=idm(v,v.v0||10,v.ldGap,v.ldV),a1=idm(v,v.v0||10,leadGap,g.lead?(g.lead.vv!==undefined?g.lead.vv:g.lead.o.v):v.v0);
  const keepLeft=(l.road.type==='EXP'||l.road.nF>1)&&side<0;const bias=keepLeft?(v.decideOnly&&l.road.type==='EXP'?1.4:0.35):(side>0?-0.15:0);
  if(!mand&&a1-a0+bias<0.3)return false;
  // 実行：今の位置を保ったまま隣の車線へ
  const tOld=l.tAt(s)+v.d*l.dir;const tNew=tgt.tAt(s);const dNew=(tOld-tNew)*tgt.dir;
  v.lc={from:l,t:0,T:mand?2.6:3.6,d0:dNew,side};v.lane=tgt;v.u=tu;v.d=dNew;v.next=null;v.want=null;v.lcCool=4+R()*3;return true;}
// 移る先の車線の後ろの車が、強いブレーキをかけずにすむか（自動運転：合図のあと動き出す前の確認）
function laneSafeNow(v,tgt,s){const tu=tgt.uOf(s);const g=laneGapAt(tgt,tu,v);const leadGap=g.lead?(g.lu-tu)-v.L/2-(g.lead.o.L||4)/2:Infinity;const folGap=g.fol?(tu-g.fu)-v.L/2-(g.fol.o.L||4)/2:Infinity;
  if(leadGap<2.5||folGap<3.5)return false;if(g.fol){const fo=g.fol.o;const fv=g.fol.vv!==undefined?g.fol.vv:fo.v;const af=idm({v:fv,kind:fo.kind||'car',type:fo.type,lane:tgt},Math.max(fv,v.v,5),folGap,v.v);if(af<-2.6)return false;}return true;}
function updateLaneChange(v,dt){const c=v.lc;if(!c)return;c.t+=dt;const k=smooth(c.t/c.T);const prev=v.d;v.d=c.d0*(1-k);const du=Math.max(0.5,v.v)*dt;c.dh=Math.atan2(v.d-prev,du);
  if(c.t>=c.T){v.lc=null;v.d=v.kind==='bike'?v.d:0;}}
// ---- 交差点：接近・優先 ----
function stopLineU(l){const n=l.endNode();if(!n||n.kind!=='x')return l.len;return l.len-stopEdgeDist(n,l.entryLeg());}
function approachingNode(n,legs,dist,exclude){for(const o of VEH){if(o===exclude||o.hidden||o.conn||!o.lane)continue;const l=o.lane;if(l.endNode()!==n)continue;if(!legs.includes(l.entryLeg()))continue;
    const d=l.len-o.u;if(o.v>0.8&&(d<dist||d/o.v<6.5))return true;}
  const p=PLAYER;if(p&&!p.ghost&&STAGE.running&&p.v>0.8&&exclude!==AUTO.agent){for(const L of legs){const dl=LEGDIR[L];const t=(p.x-n.x)*dl.dx+(p.z-n.z)*dl.dz;const off=Math.abs((p.x-n.x)*dl.dz-(p.z-n.z)*dl.dx);
      const half=(L==='N'||L==='S')?n.hz:n.hx;if(t>half-1&&(t<dist||t/p.v<7)&&t<150&&off<((L==='N'||L==='S')?n.hx:n.hz)+1&&Math.cos(wrapA(p.h-legHeading[L]))>0.7)return true;}}
  return false;}
function nodeBusy(n,exclude){for(const o of VEH){if(o===exclude||o.hidden)continue;if(o.sweptBy&&(o.sweptBy===exclude||(exclude===AUTO.agent&&o.sweptBy===PLAYER)))continue;if(o.conn&&o.conn.node===n)return true;}const p=PLAYER;if(p&&STAGE.running&&exclude!==AUTO.agent&&inNode(n,p.x,p.z,0.5))return true;return false;}
function oncomingInNode(v,n){for(const o of VEH){if(o===v||o.hidden||!o.conn)continue;const c=o.conn;if(c.node===n&&c.turn!=='R'&&c.from.inLeg===OPP[v.conn.from.inLeg]&&o.cu<c.len*0.75)return true;}
  const p=PLAYER;if(p&&STAGE.running&&v!==AUTO.agent&&inNode(n,p.x,p.z,0)&&Math.cos(wrapA(p.h-legHeading[OPP[v.conn.from.inLeg]]))>0.6&&p.v>0.5)return true;return false;}
function rightWaitS(c){let bi=0,bd=1e9;c.pts.forEach((p,i)=>{const d=Math.hypot(p.x-c.node.x,p.z-c.node.z);if(d<bd){bd=d;bi=i;}});return Math.max(0,c.pts[bi].s-2.0);}
function exitXwalkYield(c){const X=exitXwalk(c);return!!X&&X.peds.some(q=>q.mode==='xcross'||(q.mode==='xwait'&&q.waitT>0.5));}
function exitXwalkBusy(c){const n=c.node;const nl=c.next;const L=nl.dir>0?nl.road.startLeg:nl.road.endLeg;return crosswalkBusy(n,L);}
function exitXwalk(c){const n=c.node;const nl=c.next;const L=nl.dir>0?nl.road.startLeg:nl.road.endLeg;return XWALKS.find(x=>x.node===n&&x.L===L)||null;}
// 横断歩道の帯（幅 xwW）の中に点が入っているか
function inXwalk(X,x,z,m){const dx=X.b.x-X.a.x,dz=X.b.z-X.a.z,L=Math.hypot(dx,dz)||1;const u=((x-X.a.x)*dx+(z-X.a.z)*dz)/L,w=((x-X.a.x)*(-dz)+(z-X.a.z)*dx)/L;const hw=(X.node?X.node.xwW:((X.f&&X.f.w)||4))/2;return u>-m&&u<L+m&&Math.abs(w)<hw+m;}
// 進む先で、車体が横断歩道にかかり始めるのは何m先か（はじめからかかっていれば0）
function xwalkHitAhead(sample,L,W,X,maxD){for(let ds=0;ds<=maxD;ds+=0.5){const P=sample(ds);for(const k of corners(P.x,P.z,P.h,L,W,0))if(inXwalk(X,k.x,k.z,0.35))return ds;}return null;}
// ---- 1台ぶんの更新 ----
function SG(cur,d,v,why){if(d<cur){v.stopWhy=why;return d;}return cur;}
function updateVeh(v,dt){if(v.hidden)return;if(v.script){v.script(v,dt);return;}
  const amb=v.type==='amb'&&v.active;v.lcCool=(v.lcCool||0)-dt;
  const l=v.conn?v.conn.next:v.lane;const lim=l.limit;
  let v0=v.kind==='bike'?v.vpref:Math.min(lim*v.vpref,v.type==='bus'?14:v.type==='big'?24:v.type==='truck'?26:40);if(amb)v0=v.ambV||16;
  if(v.slowZone)v0=Math.min(v0,v.slowZone);
  // 曲線では速度を落とす
  if(!v.conn&&v.lane.road.len>50){const s=v.lane.sOf(v.u);const h0=v.lane.road.at(s).h,h1=v.lane.road.at(clamp(s+v.lane.dir*25,0,v.lane.road.len)).h;const k=Math.abs(wrapA(h1-h0))/25;if(k>0.004)v0=Math.min(v0,Math.sqrt(2.2/k));}
  const ld=leaderOnPath(v);let gap=ld.gap,vl=ld.vl;v.ldGap=gap;v.ldV=vl;v.v0=v0;let stopGap=Infinity;v.stopWhy=null;
  // 近くの障害（歩行者・駐車車両・交差点の中の車・プレイヤー）
  const near=nearHazards(v);if(near.gap<gap){gap=near.gap;vl=near.vl;}
  // 車線変更の途中：元の車線の前の車にも気をつける（車体がまだ元の車線にかかっている）
  if(v.lc&&v.lc.from&&!v.conn&&Math.abs(v.d)>0.4&&v.lc.from.road===v.lane.road){const f=v.lc.from;const u=f.uOf(v.lane.sOf(v.u));for(const e of f.agents){if(e.o===v)continue;if(e.u>u){const gg=e.u-u-v.L/2-(e.o.L||4)/2;if(gg<gap){gap=gg;vl=e.vv!==undefined?e.vv:(e.o.v||0);}break;}}}
  if(!v.conn&&v.lane.road.type==='EXP'){const ob=obstAhead(v,220);if(ob&&ob.gap<gap){gap=ob.gap;vl=0;}}
  // 自転車・駐車車両の横を通る（同じ車線の左端にいるもの）
  v.obGap=Infinity;if(!v.conn&&v.kind!=='bike'&&!v.lc){const lane=v.lane;let ob=null,og=Infinity;
    const leftSoon=v.next&&v.next.conn&&v.next.conn.turn==='L'&&lane.len-v.u<45;// 左折の直前は自転車を追い越さない（後ろについて先に行かせる）
    if(ld.obj&&ld.obj.kind==='bike'&&ld.gap<30&&!leftSoon){ob={d:ld.obj.d||-(lane.w/2-0.55),W:ld.obj.W,bike:true};og=ld.gap;}
    if(near.obst&&near.gap<30&&near.gap<og){ob={d:near.obst.dLane!==undefined?near.obst.dLane:-(lane.w/2-near.obst.W/2-0.2),W:near.obst.W,bike:false};og=near.gap;}
    // 歩道のない道路を歩く人：間隔をあけて通る（第18条第2項）
    const wk=walkerAhead(v,45);if(wk&&wk.g<45){v0=Math.min(v0,Math.sqrt((20/3.6)**2+2*1.2*Math.max(0,wk.g-12)));}if(wk&&wk.g<30&&wk.g<og){ob={d:wk.d,W:0.6,bike:true,ped:wk.p};og=wk.g;}
    if(ob&&ob.ped){const s=lane.sOf(v.u);let reach;const dNow=v.dAct!==undefined?v.dAct:v.d;// 実際の横位置（自動運転では指令値と実際がずれる）
      if(ob.d<0){// 左側の人：右へよけて通る
        const twoWay=lane.road.nF&&lane.road.nB;const canOpp=twoWay&&lane.road.center!=='yellow'&&lane.idx===lane.road.lanes(lane.dir).length-1&&!oncomingNear(v,60);
        const want=ob.d+ob.W/2+v.W/2+1.25;const maxD=lane.w/2-v.W/2+(canOpp?2.2:lane.neighbor(1,s)?0:(twoWay&&oncomingNear(v,60)?-0.15:0.2));v.dGoal=clamp(want,0,Math.max(0,maxD));reach=Math.min(dNow,maxD)-ob.d-ob.W/2-v.W/2;}
      else{// 右側の人：左へよけて通る
        const sh=lane.idx===0?(lane.road.sh[0]||0):0;const minD=-(lane.w/2-v.W/2+sh-0.15);const want=ob.d-ob.W/2-v.W/2-1.25;v.dGoal=clamp(want,Math.min(0,minD),0);reach=ob.d-ob.W/2-v.W/2-Math.max(dNow,minD);}
      // 実際に取れている間隔で速度を決める（1m以上なら20km/hまで、狭ければ徐行）
      if(reach>=0.45){v0=Math.min(v0,reach>=1.1?20/3.6:12/3.6);v.pedPass=ob.ped;}else{v.pedPass=null;if(og<10)v0=Math.min(v0,1);}v.obGap=og;ob=null;}
    else v.pedPass=null;
    // 車線が2本以上：止まっている車は車線変更でよける（車線の中で横にずれない）
    if(ob&&!ob.bike&&lane.road.lanes(lane.dir).length>=2){v.obGap=og;if(og<10)v0=Math.min(v0,1.5);ob=null;}
    if(ob){v.obGap=og;const s=lane.sOf(v.u);const twoWay=lane.road.nF&&lane.road.nB;const rightIsOpp=twoWay&&lane.idx===lane.road.lanes(lane.dir).length-1&&lane.kind==='main';
      const canOpp=rightIsOpp&&lane.road.center!=='yellow'&&!oncomingNear(v,70);const nbR=lane.neighbor(1,s);
      const want=ob.d+ob.W/2+v.W/2+(ob.bike?(v.decideOnly?1.5:1.0):0.6);const maxD=lane.w/2-v.W/2+(canOpp?2.4:nbR?0:(twoWay&&oncomingNear(v,60)?-0.15:0.25));
      v.dGoal=clamp(want,0,Math.max(0,maxD));if(v.d>=Math.min(want,maxD)-0.12&&maxD>=ob.d+ob.W/2+v.W/2+0.25){const clear=v.d-ob.d-ob.W/2-v.W/2;if(ob.bike&&clear<(v.decideOnly?1.45:1.0))v0=Math.min(v0,(v.decideOnly?25:22)/3.6);if(!ob.bike)v0=Math.min(v0,20/3.6);
        if(ld.obj&&ld.obj.kind==='bike'&&ob.bike){const l2=leaderOnPath(v,120,ld.obj);if(l2.gap<near.gap){gap=l2.gap;vl=l2.vl;}else{gap=near.gap;vl=near.vl;}}else if(!ob.bike){gap=ld.gap;vl=ld.vl;}}
      else if(og<12)v0=Math.min(v0,ob.bike?ld.vl:2);}}
  // 中央線のない狭い道路のすれ違い：左に寄せて速度を落とす。それでも幅が足りなければ手前で待つ
  if(!v.conn&&v.kind!=='bike'&&!v.lc&&v.lane.kind==='main'){const lane=v.lane,rd=lane.road;
    if(rd.center==='none'&&rd.nF===1&&rd.nB===1){const on=oncomingAhead(v,50);
      if(on){const sh=rd.sh[0]||0;const dl=-Math.max(0,lane.w/2-v.W/2+sh-0.3);if(v.dGoal<=0)v.dGoal=Math.min(v.dGoal,dl);v0=Math.min(v0,on.d<22?15/3.6:25/3.6);
        const[lo,hi]=rd.tRange(lane.sOf(v.u));const need=v.W+on.o.W+1.0;const yieldMe=on.o===PLAYER||(on.o.id<v.id&&!v.decideOnly);
        if(need>hi-lo&&on.d<28&&yieldMe&&!v.decideOnly){v0=0;stopGap=SG(stopGap,Math.max(0.3,on.d-8),v,'L126');}
        if(on.d<14&&on.lat<v.W/2+on.o.W/2+0.25&&!v.decideOnly){v0=0;stopGap=SG(stopGap,0.2,v,'L127');}}}}
  if(!v.conn){const lane=v.lane;const front=v.u+v.L/2;const dEnd=lane.len-front;const n=lane.endNode();
    if(!v.next&&(dEnd<160||(dEnd<420&&lane.road.lanes(lane.dir).length>=2)))v.next=chooseNext(v);
    // 必要な車線に移れないまま止まってしまった：今の車線から行ける方向に変える（あとでナビが道を探し直す）
    if(v.next&&v.next.need&&!v.next.need.includes(lane)&&dEnd<30&&v.v<0.5&&lane.conns.length){v.needStuckT=(v.needStuckT||0)+dt;if(v.needStuckT>(v.decideOnly?10:14)){const c=lane.conns.find(q=>q.turn==='S')||lane.conns[0];v.next={turn:c.turn,conn:c};v.planTurn={road:lane.road,dir:lane.dir,turn:c.turn};v.needStuckT=0;if(v.decideOnly)AUTO.replan={road:lane.road,dir:lane.dir,turn:c.turn};}}else v.needStuckT=0;
    // 次の道路の制限速度が低いときは手前から落とす（ランプなど）
    {const nl=(v.next&&v.next.link)||(v.next&&v.next.conn&&v.next.conn.next)||(lane.next[0]&&lane.next[0].lane);if(nl&&nl.road!==lane.road){const vn=nl.limit*(v.decideOnly?0.95:Math.max(1,v.vpref));if(vn<v0)v0=Math.min(v0,Math.sqrt(vn*vn+2*1.3*Math.max(0,dEnd)));}}
    // 必要な車線へ（右折・左折・出口）
    let need=null;if(v.next&&v.next.need)need=v.next.need;
    if(lane.road.type==='EXP'&&lane.kind==='main'){const dec=wantedDecel(v,lane,lane.sOf(v.u));if(dec){need=[dec];}}
    if(lane.kind==='accel'){need=[lane.base];}
    // 止まっている車（駐車・荷さばき）で車線がふさがっている：隣の車線へ
    if(!need&&near.obst&&near.gap<70&&lane.kind==='main'&&lane.road.lanes(lane.dir).length>=2&&lane.road.type!=='EXP'){const s=lane.sOf(v.u);const nb=lane.neighbor(1,s)||lane.neighbor(-1,s);if(nb&&nb.kind==='main')need=[nb];}
    if(v.forceNeed&&v.forceNeed.road===lane.road&&v.forceNeed!==lane)need=[v.forceNeed];
    // 路線バス：停留所に寄って止まる（左の合図→停車→右の合図で発進）
    if(v.type==='bus'&&!amb&&NET.map&&NET.map.busStops&&lane.kind==='main'){const st=busStopAhead(v,lane);v.busPh=v.busDepT>0?3:0;
      if(st){if(lane.idx!==0){if(st.du<170)need=[lane.road.lanes(lane.dir)[0]];}
        else{const dStop=st.du+1.5-v.L/2;if(dStop<75){v.dGoal=Math.min(v.dGoal,-0.55);v.busPh=1;}stopGap=SG(stopGap,Math.max(0.1,dStop),v,'BUS');
          if(dStop<1.5&&v.v<0.3){v.busPh=2;v.busWait=(v.busWait||0)+dt;if(!v.busDwell)v.busDwell=8+R()*6;if(v.busWait>v.busDwell){v.busDone=st.stop;v.busWait=0;v.busDwell=0;v.busDepT=3.5;}}}}
      if(v.busDepT>0)v.busDepT-=dt;}
    // 高速道路：前方の車線上に落下物・止まっている車があれば、早めに隣の車線へ（遠くから見える）
    if(lane.road.type==='EXP'&&lane.kind==='main'&&!v.lc){const ob=obstAhead(v,220);if(ob&&ob.gap<190){const s=lane.sOf(v.u);const nb=lane.neighbor(1,s)||lane.neighbor(-1,s);if(nb)need=[nb];}}
    if(need&&!need.includes(lane)&&!v.lc){const side=need.some(t=>(t.tAt(lane.sOf(v.u))-lane.tAt(lane.sOf(v.u)))*lane.dir>0)?1:-1;
      const urg=lane.kind==='accel'?clamp(1-dEnd/lane.len,0,1):clamp(1-dEnd/220,0,1);const tg0=lane.neighbor(side,lane.sOf(v.u));const wrongPatch=tg0&&tg0.kind!=='main'&&!need.includes(tg0);// 隣が別の減速車線（PAなど）なら、まだ移らない
      if(!wrongPatch&&(v.lcCool<0||urg>0.5)){if(!tryLaneChange(v,side,true)){if(dEnd<35+urg*10&&lane.kind==='accel')stopGap=SG(stopGap,dEnd-1,v,'L135');else if(dEnd<25)stopGap=SG(stopGap,dEnd-2,v,'L135');v.lcCool=0.4;}}}
    else if(!v.lc&&v.lcCool<0&&(v.v>4||v.obGap<15)&&dEnd>(v.obGap<15?20:40)&&v.kind!=='bike'&&!amb&&!v.noLC&&lane.kind!=='decel'&&lane.kind!=='accel'){/* 止まっている車のすぐ後ろでは、遅くても隣の車線へ移る機会をうかがう */v.lcCool=0.8+R()*0.6;if(!tryLaneChange(v,1,false))tryLaneChange(v,-1,false);}
    const turn=v.next&&v.next.conn?v.next.conn.turn:'S';
    // 曲がる先・通る所に止まっている車がいれば手前で待つ
    // 左折：左後方から来る自転車・バイクを先に通す（巻き込み防止）
    if(turn==='L'&&n&&n.kind==='x'&&v.kind==='car'&&!amb){const D=v.next.conn.drv;const dS=dEnd-(D?D.sIn:0);if(dS<10&&bikeOnLeft(v,18,v.L/2+2.5))stopGap=SG(stopGap,Math.max(0.2,dS-0.5),v,'L140');}
    v.sweptBy=null;if(n&&n.kind==='x'&&dEnd<Math.max(9,v.v*v.v/8+7)&&v.next&&v.next.conn&&v.kind==='car'&&!amb){const sb=sweptBlock(v,Math.min(32,dEnd+Math.max(7,v.next.conn.len)));if(sb){stopGap=SG(stopGap,Math.max(0.1,sb.d-1.0),v,'L141');v.sweptBy=sb.o;}}
    if(turn!=='S'&&n&&n.kind==='x'){const vt=v.decideOnly?(turn==='L'?2.8:3.4):(turn==='L'?4.2:5.4);const dv=v.decideOnly&&v.next.conn.drv?v.next.conn.drv.sIn+1:0;v0=Math.min(v0,Math.sqrt(vt*vt+2*1.4*Math.max(0,dEnd-dv)));}
    // 見通しの悪い交差点は徐行（第42条）
    if(n&&n.kind==='x'&&blindNode(n,lane.entryLeg())){const vb=v.decideOnly?2.6:3.6;v0=Math.min(v0,Math.sqrt(vb*vb+2*1.6*Math.max(0,dEnd-1)));}
    if(n&&n.kind==='x'){const dLine=stopLineU(lane)-front;const leg=lane.entryLeg();
      if(n.signal){const sig=SIGS.get(n.k);const st=sig?sig.stateFor(leg):'G';
        if(dLine>-0.3){let must=st==='R'||(st==='RA'&&turn!=='R');if(st==='Y')must=dLine>v.v*v.v/(2*3.2)+0.5;
          if(st==='OFF'){must=!v.stopDone;if(dLine<1.5&&v.v<0.3){v.wait+=dt;if(v.wait>1.2)v.stopDone=true;}}
          if(amb&&must){must=false;v0=Math.min(v0,4);}if(AMB&&!amb&&AMB.active&&ambNearNode(n,v))must=true;
          // 交差点の先が詰まっている（第50条）
          if(!must&&v.next&&v.next.conn&&dLine<12&&blockedBeyond(v.next.conn,v))must=true;
          // 横断歩道にまだ渡っている人がいれば、青になっても停止線で待つ
          if(!must&&dLine<20&&(crosswalkBusy(n,leg)||(turn==='S'&&crosswalkBusy(n,OPP[leg]))))must=true;
          // スクランブル交差点：まだ渡っている人がいれば、青になっても停止線で待つ
          if(!must&&sig&&sig.def.scramble&&dLine<25&&pedsCrossingNode(n))must=true;
          if(must)stopGap=SG(stopGap,dLine,v,'L152');}}
      else if(n.stopLegs.includes(leg)&&!amb){
        if(!v.stopDone){if(dLine>-0.5){stopGap=SG(stopGap,dLine,v,'L154');if(dLine<2.2&&v.v<0.3){v.wait+=dt;if(v.wait>0.9){v.stopDone=true;v.wait=0;}}}}
        else{const pri=Object.keys(n.legs).filter(L=>L!==leg&&!n.stopLegs.includes(L));if(approachingNode(n,pri,40,v)||nodeBusy(n,v))stopGap=SG(stopGap,Math.max(dEnd,0)+0.2,v,'L155');}}
      else if(!amb&&dEnd<65&&(n.xwalk[leg]||(turn==='S'&&n.xwalk[OPP[leg]]))&&dLine>-0.5){// 信号のない交差点の横断歩道：渡ろうとしている人・渡っている人がいれば手前で止まる（第38条第1項）
        const Xs=XWALKS.filter(X=>X.node===n&&(X.L===leg||(turn==='S'&&X.L===OPP[leg])));if(Xs.some(X=>X.peds.some(q=>q.mode==='xcross'||(q.mode==='xwait'&&q.waitT>0.5))))stopGap=SG(stopGap,Math.max(0.1,dLine),v,'XW');}
      if(!n.signal&&!n.stopLegs.includes(leg)&&!amb&&dEnd<40){const dChk=Math.max(6,v.v*v.v/(2*3)+3);
        {// 信号のない交差点：ほかの道に一時停止があればこちらは優先側（少しだけ控える）。なければ十分に速度を落として近づく
          const vj=(n.stopLegs.length||n.priority)?11:(v.decideOnly?5:6.5);if(Object.keys(n.legs).length>=3)v0=Math.min(v0,Math.sqrt(vj*vj+2*2.2*Math.max(0,dEnd-2)));}
        const priSide=(n.stopLegs.length&&!n.stopLegs.includes(leg))||n.priority;// 優先側：交差点の中の車は、進路にかかるときだけ（nearHazards）
        if(!priSide&&nodeBusy(n,v)&&dEnd<dChk)stopGap=SG(stopGap,dEnd-0.5,v,'L156');
        // 左方優先：左の道から来る車（その道に一時停止があれば、こちらが優先）
        const left={N:'E',E:'S',S:'W',W:'N'}[leg];if(n.legs[left]&&!n.stopLegs.includes(left)&&!n.priority&&dEnd<Math.max(8,v.v*v.v/(2*3)+4)&&approachingNode(n,[left],20,v))stopGap=SG(stopGap,dEnd-0.5,v,'L158');}}
    for(const f of lane.road.feats){if(f.s===undefined)continue;const fu=lane.uOf(f.s);
      if(f.type==='rail'){const line=fu-8;const dl=line-front;const X=XINGS.find(x=>x.f===f);
        if(dl>-0.5&&dl<90){if(!v.xingDone){stopGap=SG(stopGap,dl,v,'L161');if(dl<2&&v.v<0.3){v.wait+=dt;if(v.wait>1.5){v.xingDone=true;v.wait=0;}}}
          else if(X&&(X.blocked()||!spaceBeyond(v,lane,fu+8)))stopGap=SG(stopGap,Math.max(dl,0)+0.2,v,'L162');}}
      if(f.type==='toll'){const dl=fu-front;const vt=v.decideOnly?4.4:5.2;if(dl>-15&&dl<120)v0=Math.min(v0,Math.sqrt(vt*vt+2*1.3*Math.max(0,dl-4)));}
      if(f.type==='xwalk'){const line=fu-(f.w||4)/2-1.5;const dl=line-front;if(dl>-0.5&&dl<65&&midXwalkBusy(f,v))stopGap=SG(stopGap,dl,v,'L163');}}
    if(AMB&&!amb&&AMB.active)ambYield(v,(s)=>{v.dGoal=s.shift;
      if(s.stop){// 交差点やその付近では、交差点を避けて道路の左側に寄って止まる（第40条第1項）
        const nx=n&&n.kind==='x';const dLine=nx?stopLineU(lane)-front:Infinity;const need=v.v*v.v/(2*3.0);let at=Math.max(2.5,v.v*v.v/(2*2.4));
        if(nx&&dLine<at+8)at=dLine>need-0.3?Math.max(0.2,dLine):null;// 停止線の手前で止まれるなら手前、止まれないなら交差点を抜けてから
        const sn=lane.startNode();const back=v.u-v.L/2;if(at!==null&&sn&&sn.kind==='x'&&back<5)at=Math.max(at,5-back+2.5);// 交差点を出た直後は、車体が交差点から十分に離れてから
        if(at!==null){v0=Math.min(v0,3);stopGap=SG(stopGap,at,v,'L164');}else v0=Math.min(v0,6);}
      else if(s.slow)v0=Math.min(v0,3);});
    v.blink=v.lc?(v.lc.side>0?'R':'L'):(turn!=='S'&&dEnd<34)?turn:(need&&!need.includes(lane))?(need.some(t=>(t.tAt(lane.sOf(v.u))-lane.tAt(lane.sOf(v.u)))*lane.dir>0)?'R':'L'):null;
    if(v.parkPlan)v.blink='L';if(v.type==='bus'&&v.busPh){v.blink=v.busPh===3?'R':'L';}}
  else{const c=v.conn;const rem=c.len-v.cu;v0=Math.min(v0,c.turn==='L'?(v.decideOnly?2.8:4.2):c.turn==='R'?(v.decideOnly?3.4:5.4):v0);
    if(c.turn==='L'&&v.kind==='car'&&!amb&&v.cu<c.len*0.6&&bikeOnLeft(v,6,v.L/2+2))stopGap=SG(stopGap,0.2,v,'L168');
    v.sweptBy=null;if(v.kind==='car'&&!amb){const sb=sweptBlock(v,8);if(sb){stopGap=SG(stopGap,Math.max(0.1,sb.d-1.0),v,'L169');v.sweptBy=sb.o;}}
    if(c.turn==='R'&&!amb){const n=c.node;const wS=c.waitS!==undefined?c.waitS:(c.waitS=rightWaitS(c));
      if(v.cu<wS+0.3){const opp=OPP[c.from.inLeg];let clear=!approachingNode(n,[opp],50,v)&&!oncomingInNode(v,n);if(n.signal){const st=SIGS.get(n.k).stateFor(c.from.inLeg);if(st==='RA')clear=true;}
        if(!clear)stopGap=SG(stopGap,wS-v.cu,v,'L172');}}
    // 曲がった先の横断歩道に人がいれば、車体がかかる手前で待つ（第38条）。もうかかっていれば止まらずに抜ける
    if(!amb&&(c.turn!=='S'&&exitXwalkBusy(c)||(!c.node.signal&&exitXwalkYield(c)))){const X=exitXwalk(c);const hit=X?xwalkHitAhead(ds=>poseOfState(stateAhead(v,ds),v.kind,v.decideOnly),v.L,v.W,X,12):null;if(X){if(hit!==null&&hit>0.2)stopGap=SG(stopGap,hit-0.3,v,'L174');}else stopGap=SG(stopGap,rem-v.L/2-0.3,v,'L174');}
    v.blink=c.turn!=='S'&&c.turn!=='U'?c.turn:null;}
  // 救急車：止まって譲った車は右側（対向車線）から追い越す
  if(amb&&!v.conn){const lane=v.lane;if(ld.obj&&ld.gap<40&&ld.vl<5&&!oncomingNear(v,70))v.ambPass=Math.min(lane.w/2+1.5,(lane.road.tRange(lane.sOf(v.u))[1]-lane.tAt(lane.sOf(v.u))*lane.dir)-v.W/2-0.2);else if(!ld.obj||ld.gap>60)v.ambPass=0;
    if(v.ambPass){v.dGoal=Math.max(v.dGoal,v.ambPass);if(v.d>1.0){const l2=leaderOnPath(v,120,null,true);gap=l2.gap;vl=l2.vl;v0=Math.min(v0,10);}}}
  if(amb&&ld.obj&&ld.gap<35&&!(v.d>1.0)){const o=ld.obj;if(o===PLAYER)PLAYER.ambBlockT=(PLAYER.ambBlockT||0)+dt;}
  let acc=v.decideOnly&&gap<Infinity?Math.min(accIDM(v,v0,gap,vl),idm(v,v0,gap,vl,3.0)):accIDM(v,v0,gap,vl);if(stopGap<Infinity)acc=Math.min(acc,idm(v,v0,Math.max(stopGap,0.05),0,0.4));
  if(v.decideOnly){v.lastAcc=acc;v.lastV0=v0;v.lastStop=stopGap;v.dbgGap=gap===Infinity?'inf':+gap.toFixed(1);v.dbgWho=near.gap<=gap+0.01&&near.gap<Infinity?'near':ld.obj?(ld.obj.type||ld.obj.kind):null;updateLaneChange(v,dt);return;}
  // 動けない車は見えない所で入れ替え
  if(v.v<0.1&&!v.evt&&!v.script){v.stuckT=(v.stuckT||0)+dt;if(v.stuckT>45&&PLAYER){const dd=Math.hypot(v.x-PLAYER.x,v.z-PLAYER.z);const f=fwd(PLAYER.h);if(dd>60||((v.x-PLAYER.x)*f.x+(v.z-PLAYER.z)*f.z)<-10){v.stuckT=0;respawn(v);return;}}
    // 交差点の中で動けなくなった（お互いに待ち合っている）ときの最後の手段
    if((v.conn&&v.stuckT>18)||v.stuckT>90){v.stuckT=0;respawn(v);return;}}else v.stuckT=0;
  v.lastAcc=acc;v.v=Math.max(0,v.v+acc*dt);if(stopGap<0.15&&v.v<0.6)v.v=Math.max(0,v.v-4*dt);v.brake=acc<-0.6||v.v<0.05;
  // 横位置（自転車・駐車車両をよける）
  if(!v.lc){const goal=v.kind==='bike'?(v.bikeD!==undefined?v.bikeD:-(v.lane?v.lane.w/2-0.55:0)):v.dGoal;// 止まっている車は横にずれない（前の障害物をよけるときだけ、交差点の手前を除いて少しずつ）
    const lr=v.v>0.3?Math.min(0.8,0.12+0.25*v.v):(v.kind!=='bike'&&!v.conn&&v.lane&&v.obGap<10&&v.lane.len-v.u>12?0.12:v.kind==='bike'?0.12:0);v.d+=clamp(goal-v.d,-lr*dt,lr*dt);}
  updateLaneChange(v,dt);
  const ds=v.v*dt;
  if(!v.conn){v.u+=ds;if(v.u>=v.lane.len){const over=v.u-v.lane.len;const nx=v.next||chooseNext(v);
      if(nx&&nx.conn&&nx.conn.from===v.lane){v.conn=nx.conn;v.cu=over;v.dc=v.type==='amb'?v.d:0;v.d=0;v.lc=null;}
      else if(nx&&nx.link){const keepD=v.d;v.place(nx.link,over);v.d=keepD;}
      else if(v.lane.next.length){v.place(v.lane.next[0].lane,over);}
      else{respawn(v);return;}}}
  else{if(v.dc){v.dc*=Math.max(0,1-dt*0.7);if(Math.abs(v.dc)<0.02)v.dc=0;}v.cu+=ds;if(v.cu>=v.conn.len){const over=v.cu-v.conn.len;const nl=v.conn.next;const pc=v.conn;v.next=null;v.place(nl,over);v.prevConn=pc;v.pose();}}
  v.dGoal=0;v.pose();}
// ---- 描画用の位置：右左折は「実際に曲がれる円弧」に沿わせる（論理上の位置は車線・接続路のまま） ----
// 自動運転（お手本）の車だけが、実際に曲がれる円弧を通る。AI車は接続路（ベジェ曲線）をそのまま通る（前後の車との間隔が見た目と一致するように）
function zoneOf(st,kind,useDrv){if(kind!=='car'||!useDrv)return null;
  if(st.conn){const D=st.conn.drv;if(!D)return null;const Lz=D.sIn+st.conn.len+D.sOut;return{D,s:clamp((D.sIn+st.cu)/Lz,0,1)*D.len};}
  const nx=st.next&&st.next.conn;if(nx&&nx.drv&&nx.from===st.lane){const D=nx.drv;const u0=st.lane.len-D.sIn;if(st.u>=u0){const Lz=D.sIn+nx.len+D.sOut;return{D,s:clamp((st.u-u0)/Lz,0,1)*D.len};}}
  const pc=st.prevConn;if(pc&&pc.drv&&pc.next===st.lane&&st.u<=pc.drv.sOut){const D=pc.drv;const Lz=D.sIn+pc.len+D.sOut;return{D,s:clamp((D.sIn+pc.len+st.u)/Lz,0,1)*D.len};}
  return null;}
// 論理位置を ds 先に進めた状態
function stateAhead(v,ds){let lane=v.lane,u=v.u,conn=v.conn,cu=v.cu,next=v.next,prevConn=v.prevConn;
  if(conn){cu+=ds;if(cu>conn.len){prevConn=conn;lane=conn.next;u=cu-conn.len;conn=null;next=null;}}
  else{u+=ds;if(u>lane.len){if(next&&next.conn){conn=next.conn;cu=u-lane.len;if(cu>conn.len){prevConn=conn;lane=conn.next;u=cu-conn.len;conn=null;next=null;}}else u=lane.len;}}
  return{lane,u:Math.min(u,lane.len),conn,cu,next,prevConn,d:conn?0:v.d};}
function poseOfState(st,kind,useDrv){const z=zoneOf(st,kind,useDrv);if(z){const p=drvAt(z.D,z.s),q=drvAt(z.D,z.s+0.4);p.h=headingOf(q.x-p.x,q.z-p.z);return p;}
  if(st.conn)return connAt(st.conn,st.cu);return st.lane.pos(clamp(st.u,0,st.lane.len),st.d||0);}
// これから通る所（車体の幅で）に、止まっている車（プレイヤーを含む）がいないか。いれば何m先か
function sweptBlock(v,dist){const p=PLAYER;const others=[];const nl=v.conn?v.conn.next:(v.next&&v.next.conn?v.next.conn.next:null);
  if(p&&STAGE.running&&!p.ghost&&v!==AUTO.agent&&Math.abs(p.v)<1.5&&Math.hypot(p.x-v.x,p.z-v.z)<dist+8)others.push({o:p,x:p.x,z:p.z,h:p.h,L:p.L,W:p.W});
  for(const o of VEH){if(o===v||o.hidden||o.v>1.5||Math.abs(o.x-v.x)>dist+8||Math.abs(o.z-v.z)>dist+8)continue;if(o.conn&&o.conn===v.conn)continue;if(!o.conn&&(o.lane===v.lane||o.lane===nl))continue;
    // 相手がこちらを待っているなら先に行く（同時に待ち合ったら番号の小さい方が先）
    if(o.sweptBy&&((o.sweptBy===v&&(v.id<o.id||v===AUTO.agent))||(v===AUTO.agent&&o.sweptBy===PLAYER)))continue;
    others.push({o,x:o.x,z:o.z,h:o.h,L:o.L,W:o.W});}
  if(!others.length)return null;
  for(let ds=0.5;ds<=dist;ds+=1){const st=stateAhead(v,ds);const P=poseOfState(st,v.kind,v.decideOnly);const box={x:P.x,z:P.z,h:P.h,L:v.L+0.3,W:v.W+0.35};for(const e of others)if(obbOverlap(box,e))return{d:ds,o:e.o};}
  return null;}
function pedsCrossingNode(n){for(const X of XWALKS){if(X.node!==n)continue;for(const p of X.peds)if(p.mode==='xcross')return true;}return false;}
function blindNode(n,leg){if(n.signal||!n.fil.length||n.priority)return false;const legs=Object.keys(n.legs);if(legs.length<3||n.stopLegs.includes(leg))return false;return legs.every(L=>n.legs[L].road.type==='RES');}
// 交差点の出口側が詰まっているか（第50条）
function blockedBeyond(c,v){const nl=c.next;const n=c.node;const L=nl.dir>0?nl.road.startLeg:nl.road.endLeg;const xw=n&&n.xwalk[L]?n.xwW+1.0:0;const room=Math.max(10,xw+(v?v.L:4.5)+2);// 出口の横断歩道の先に車1台分の余地
  for(const e of nl.agents){if(e.o===v)continue;if(e.u-(e.o.L||4)/2<room&&(e.vv!==undefined?e.vv:e.o.v)<2)return true;}return false;}
function spaceBeyond(v,l,uFar){for(const e of l.agents){if(e.o===v)continue;if(e.u>uFar&&e.u-(e.o.L||4)/2<uFar+v.L+2.5&&(e.vv!==undefined?e.vv:e.o.v)<2)return false;}return true;}
function ambNearNode(n,v){const a=AMB;const d=Math.hypot(a.x-n.x,a.z-n.z);if(d>60)return false;if(a.conn&&a.conn.node===n)return true;if(!a.conn&&a.lane&&a.lane.endNode()===n&&a.lane!==v.lane)return true;return false;}
function ambYield(v,cb){const a=AMB;const dx=v.x-a.x,dz=v.z-a.z;const d=Math.hypot(dx,dz);if(d>80)return;const fa=fwd(a.h);const ahead=dx*fa.x+dz*fa.z;
  const same=Math.cos(wrapA(v.h-a.h))>0.7,opp=Math.cos(wrapA(v.h-a.h))<-0.7;if(same&&ahead>0&&ahead<70)cb({shift:-0.6,stop:ahead<45});else if(opp&&ahead>0&&ahead<70)cb({shift:-0.4,slow:true});}
// 前方の歩行者・駐車車両・交差点内の車・プレイヤー（幾何学的に）
function nearHazards(v){const f=fwd(v.h),r=rightV(v.h);let best=Infinity,bv=0,bo=null;const W2=v.W/2;
  const test=(ox,oz,oL,oW,ov,oh,lat0,ref)=>{const dx=ox-v.x,dz=oz-v.z;const fw=dx*f.x+dz*f.z;if(fw<=0||fw>30)return;const lt=dx*r.x+dz*r.z;
    const dh=wrapA(oh-v.h),c=Math.abs(Math.cos(dh)),sn=Math.abs(Math.sin(dh));const ax=c*oL/2+sn*oW/2,ay=sn*oL/2+c*oW/2;// 斜めの車は向きに合わせた大きさ
    if(Math.abs(lt)>W2+ay+(lat0||0.25))return;const g=fw-v.L/2-ax;if(g<best){best=g;bv=ov*Math.cos(dh);bo=ref;}};
  // 右左折の途中・直前は、まっすぐ前ではなく「これから通る曲線」に沿って調べる
  const turning=v.kind!=='bike'&&((v.conn&&v.conn.turn!=='S')||(!v.conn&&v.next&&v.next.conn&&v.next.conn.turn!=='S'&&v.lane.len-v.u<12));
  if(turning){const ph=pathHazards(v,14);if(ph){best=ph.gap;bv=ph.vl;bo=ph.obj;}}
  else for(const q of PEDS){if(q.mode==='off'||q.mode==='xwait'||q.onWalk||q===v.pedPass)continue;if(Math.abs(q.x-v.x)>32||Math.abs(q.z-v.z)>32)continue;test(q.x,q.z,0.5,0.5,0,0,0.6,q);}
  let obst=null,og=Infinity;let pts=null;
  for(const o of NET.obst){if(Math.abs(o.x-v.x)>32||Math.abs(o.z-v.z)>32)continue;const b0=best;
    if(!v.conn&&v.lane&&v.kind!=='bike'){if(!pts)pts=lanePathPts(v,30,1.5);const g=pathObstGap(v,pts,o,0.15);if(g<best){best=g;bv=0;bo=o;}}else test(o.x,o.z,o.L,o.W,0,o.h,0.15,o);
    if(best<b0&&best<og){og=best;obst=o;}}
  if(!turning&&(v.conn||(v.lane&&v.lane.len-v.u<12))){for(const o of VEH){if(o===v||o.hidden||!o.conn)continue;if(Math.abs(o.x-v.x)>25||Math.abs(o.z-v.z)>25)continue;test(o.x,o.z,o.L,o.W,o.v,o.h,0.1,o);}
    const p=PLAYER;if(p&&!p.ghost&&STAGE.running&&v!==AUTO.agent&&Math.abs(p.x-v.x)<25&&Math.abs(p.z-v.z)<25&&(!p.loc||p.loc.kind!=='road'))test(p.x,p.z,p.L,p.W,p.v,p.h,0.1,p);}
  return{gap:best,vl:bv,obst,obj:bo};}
// これから通る線（車線＋その先）の点列
function lanePathPts(v,len,step){const l=v.lane;const out=[];let last=null;
  const dd=(v.decideOnly&&v.dAct!==undefined?v.dAct:v.d)||0;for(let ds=0;ds<=len;ds+=step){const u=v.u+ds;let P;if(u<=l.len)P=l.pos(u,dd);else{const nx=(v.next&&v.next.link)||(l.next[0]&&l.next[0].lane);if(nx&&!(v.next&&v.next.conn))P=nx.pos(Math.min(nx.len,u-l.len),0);else if(last){const f=fwd(last.h);P={x:last.x+f.x*step,z:last.z+f.z*step,h:last.h};}else P=l.pos(l.len,dd);}
    out.push({x:P.x,z:P.z,h:P.h,ds});last=P;}return out;}
function pathObstGap(v,pts,o,lat0){const W2=v.W/2;let g=Infinity;
  for(const P of pts){const f=fwd(P.h),r=rightV(P.h);const dx=o.x-P.x,dz=o.z-P.z;const lo=dx*f.x+dz*f.z,lt=dx*r.x+dz*r.z;
    const dh=wrapA((o.h||0)-P.h),c=Math.abs(Math.cos(dh)),sn=Math.abs(Math.sin(dh));const ax=c*(o.L||1)/2+sn*(o.W||1)/2,ay=sn*(o.L||1)/2+c*(o.W||1)/2;
    if(Math.abs(lo)<=ax+0.8&&Math.abs(lt)<=W2+ay+lat0){g=Math.max(0,P.ds+lo-v.L/2-ax);break;}}return g;}
// 同じ車線の前方にある障害物（落下物・止まっている車）。道路の座標で調べるので遠くまで見える
function obstAhead(v,range){const l=v.lane;if(!l)return null;const s=l.sOf(v.u);let best=null;
  for(const o of NET.obst){if(o.road!==l.road||o.s===undefined)continue;const du=(o.s-s)*l.dir;if(du<0||du>range)continue;if(o.s<l.s0||o.s>l.s1)continue;
    const P=l.road.at(o.s);const tO=(o.x-P.x)*P.rx+(o.z-P.z)*P.rz;const off=Math.abs(tO-l.tAt(o.s));if(off>l.wAt(o.s)/2+(o.W||1)/2-0.1)continue;
    const g=du-v.L/2-(o.L||1)/2;if(!best||g<best.gap)best={gap:g,o};}return best;}
// これから通る曲線（車体の幅）にかかる歩行者・交差点内の車・プレイヤー
function pathHazards(v,dist){const objs=[];
  for(const q of PEDS){if(q.mode==='off'||q.mode==='xwait'||q.onWalk||q===v.pedPass)continue;if(Math.abs(q.x-v.x)>dist+5||Math.abs(q.z-v.z)>dist+5)continue;objs.push({x:q.x,z:q.z,h:0,L:0.6,W:0.6,v:0,ref:q});}
  for(const o of VEH){if(o===v||o.hidden||!o.conn)continue;if(Math.abs(o.x-v.x)>dist+7||Math.abs(o.z-v.z)>dist+7)continue;objs.push({x:o.x,z:o.z,h:o.h,L:o.L,W:o.W,v:o.v,ref:o});}
  const p=PLAYER;if(p&&!p.ghost&&STAGE.running&&v!==AUTO.agent&&(!p.loc||p.loc.kind!=='road')&&Math.abs(p.x-v.x)<dist+7&&Math.abs(p.z-v.z)<dist+7)objs.push({x:p.x,z:p.z,h:p.h,L:p.L,W:p.W,v:p.v,ref:p});
  if(!objs.length)return null;
  for(let ds=0.5;ds<=dist;ds+=1){const st=stateAhead(v,ds);const P=poseOfState(st,v.kind,v.decideOnly);const box={x:P.x,z:P.z,h:P.h,L:v.L+0.5,W:v.W+0.6};
    for(const o of objs)if(obbOverlap(box,o))return{gap:Math.max(0,ds-0.7),vl:o.v*Math.cos(wrapA(o.h-P.h)),obj:o.ref};}
  return null;}
// 左後方・左横の自転車・バイク（左折の巻き込み確認）
function bikeOnLeft(v,back,front){const f=fwd(v.h),r=rightV(v.h);for(const o of VEH){if(o===v||o.hidden||(o.kind!=='bike'&&o.kind!=='moto'))continue;if(Math.cos(wrapA(o.h-v.h))<0.6)continue;
    const dx=o.x-v.x,dz=o.z-v.z;const fw=dx*f.x+dz*f.z,lt=dx*r.x+dz*r.z;if(lt<-3.4||lt>0.2)continue;if(fw<-back||fw>front)continue;if(o.v<0.6&&fw<-1)continue;if(o.next&&o.next.conn&&o.next.conn.turn==='L')continue;return o;}return null;}
// 前方で道路の端を歩いている人（歩道のない道路）
function oncomingAhead(v,dist,bikes=true){const f=fwd(v.h),r=rightV(v.h);let best=null;
  const chk=(o)=>{if(Math.cos(wrapA(o.h-v.h))>-0.7)return;const dx=o.x-v.x,dz=o.z-v.z;const fw=dx*f.x+dz*f.z;if(fw<=0||fw>dist)return;const lt=dx*r.x+dz*r.z;if(Math.abs(lt)>5)return;const d=fw-v.L/2-(o.L||4)/2;if(!best||d<best.d)best={o,d,lat:Math.abs(lt)};};
  for(const o of VEH){if(o===v||o.hidden||(o.kind==='bike'&&!bikes))continue;chk(o);}const p=PLAYER;if(p&&STAGE.running&&!p.ghost&&v!==AUTO.agent)chk(p);return best;}
function walkerAhead(v,dist){const f=fwd(v.h),r=rightV(v.h);let best=null;const C=v.lane?v.lane.pos(clamp(v.u,0,v.lane.len),0):null;const rc=C?rightV(C.h):r;
  for(const q of PEDS){if(q.mode!=='walk'||q.onWalk||!q.vis)continue;const dx=q.x-v.x,dz=q.z-v.z;if(Math.abs(dx)>dist+5||Math.abs(dz)>dist+5)continue;const fw=dx*f.x+dz*f.z;if(fw<-v.L/2-1||fw>dist)continue;
    const lt=dx*r.x+dz*r.z;if(Math.abs(lt)>3.2)continue;const g=fw-v.L/2-0.3;// 車線の中心からの横位置（車の今の位置ではなく車線を基準に）
    const dl=C?(q.x-C.x)*rc.x+(q.z-C.z)*rc.z:v.d+lt;if(!best||g<best.g)best={g,d:dl,p:q};}return best;}
// 対向車が近づいているか（止まっている車は近いときだけ数える）
function oncomingNear(v,dist){const f=fwd(v.h);for(const o of VEH){if(o===v||o.hidden)continue;if(Math.cos(wrapA(o.h-v.h))>-0.7)continue;const dx=o.x-v.x,dz=o.z-v.z;const fw=dx*f.x+dz*f.z;if(fw>0&&fw<(o.v<0.5?Math.min(dist,20):dist)&&Math.abs(dx*f.z-dz*f.x)<6)return true;}
  const p=PLAYER;if(p&&STAGE.running&&v!==AUTO.agent&&Math.cos(wrapA(p.h-v.h))<-0.7){const dx=p.x-v.x,dz=p.z-v.z;const fw=dx*f.x+dz*f.z;if(fw>0&&fw<dist&&Math.abs(dx*f.z-dz*f.x)<6)return true;}return false;}
// ---- 出現・入れ替え ----
function spawnLanes(){const out=[];for(const r of NET.roads)for(const dir of[1,-1]){const n=dir>0?r.startNode:r.endNode;if(n&&n.kind==='portal'){for(const l of r.lanes(dir))out.push(l);}}return out;}
function pickType(){const mix=TRAFFIC.mix||{kei:3,compact:3,sedan:2,van:2,suv:1,truck:1,taxi:1};const ks=Object.keys(mix);let tot=0;for(const k of ks)tot+=mix[k];let x=R()*tot;for(const k of ks){x-=mix[k];if(x<=0)return k;}return ks[0];}
function makeVeh(type){if(type==='bike')return new Veh('bike','bike');if(type==='moto')return new Veh('moto','moto');return new Veh('car',type);}
function spawnTraffic(n,opt={}){const lanes=NET.lanes.filter(l=>l.kind==='main'&&l.len>25&&!l.road.def.pedOnly&&(opt.type!=='bike'||l.idx===0)&&(!opt.filter||opt.filter(l)));if(!lanes.length)return;const avoid=opt.avoid;
  for(let i=0;i<n;i++){for(let tries=0;tries<40;tries++){const l=pick(lanes);const u=6+R()*(l.len-12);const p=l.pos(u);if(avoid&&Math.hypot(p.x-avoid.x,p.z-avoid.z)<(opt.avoidR||45))continue;
      if(VEH.some(v=>Math.hypot(v.x-p.x,v.z-p.z)<14))continue;const type=opt.type||pickType();const v=makeVeh(type);v.place(l,u);v.v=type==='bike'?4:l.road.type==='EXP'?l.limit*0.82:Math.min(l.limit*0.75,12);VEH.push(v);break;}}}
function respawn(v){if(v.evt||v.keep){v.remove();return;}const entries=spawnLanes();if(!entries.length){v.remove();return;}const l=pick(entries);
  if(l.agents.some(e=>e.u<22)){v.hidden=true;v.m.grp.visible=false;v.respawnT=2+R()*3;v.lane=l;return;}
  v.hidden=false;v.m.grp.visible=true;v.exitPlan=undefined;v.exitPlans=null;v.place(l,2);v.v=Math.min(l.limit*0.85,v.kind==='bike'?4:l.road.type==='EXP'?24:11);}
function trafficTick(dt){for(const v of VEH){if(v.hidden&&v.respawnT!==undefined){v.respawnT-=dt;if(v.respawnT<=0){v.respawnT=undefined;respawn(v);}}}
  // 大きな地図：遠くへ行った車を、見えない所でプレイヤーの近くに入れ替える（交通量を保つ）
  if(NET.map&&NET.map.recycle&&PLAYER&&STAGE.running){TRAFFIC.recT=(TRAFFIC.recT||0)-dt;if(TRAFFIC.recT<=0){TRAFFIC.recT=0.4;let n=0;
      for(const v of VEH){if(n>=2)break;if(v.hidden||v.evt||v.keep||v.script||v.conn)continue;const d=Math.hypot(v.x-PLAYER.x,v.z-PLAYER.z);if(d<(NET.map.recycleR||360))continue;if(recycleNear(v))n++;}}}}
function busStopAhead(v,lane){let best=null;const s=lane.sOf(v.u);for(const b of NET.map.busStops){if(b.road!==lane.road||b.dir!==lane.dir||b===v.busDone)continue;const du=(b.s-s)*lane.dir;if(du>-3&&du<180&&(!best||du<best.du))best={stop:b,du};}return best;}
function recycleNear(v){const p=PLAYER;const f=fwd(p.h);const lanes=NET.lanes.filter(l=>l.kind==='main'&&l.len>30&&!l.road.def.pedOnly&&l.road.type!=='EXP'&&l.road.type!=='RAMP'&&(v.kind!=='bike'||l.idx===0));
  for(let tries=0;tries<14;tries++){const l=pick(lanes);const u=5+R()*(l.len-10);const P=l.pos(u);const dx=P.x-p.x,dz=P.z-p.z;const d=Math.hypot(dx,dz);if(d<130||d>320)continue;
    if(d<240&&(dx*f.x+dz*f.z)/d>0.35)continue;// 前方の見える範囲には出さない
    if(VEH.some(o=>!o.hidden&&Math.abs(o.x-P.x)<18&&Math.abs(o.z-P.z)<18))continue;v.exitPlan=undefined;v.exitPlans=null;v.planTurn=null;v.busDone=null;v.place(l,u);v.v=Math.min(l.limit*0.7,v.kind==='bike'?4:11);return true;}return false;}
function clearTraffic(){for(const v of VEH.slice())v.remove();VEH.length=0;AMB=null;}

