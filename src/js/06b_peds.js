// ===== 06b_peds.js : 歩行者（インスタンス描画）・横断歩道 =====
const PEDS=[];const XWALKS=[];const WALKS=[];
const PEDVAR=[];// {kind,top,bottom,hair,bodyIM,legIM,list}
let PEDCAP=160;
function initPedVariants(){PEDVAR.length=0;const r=rng(77);
  const add=(kind,n)=>{for(let i=0;i<n;i++){const K=PEDKIND[kind];const top=pick(K.tops,r),bottom=pick(K.bottoms,r),hair=pick([0x1a1410,0x3a2a1c,0x6d6d6d,0x24201c],r);
    const bg=pedGeo(kind,top,bottom,hair),lg=legGeo(kind,bottom);const cap=Math.ceil(PEDCAP/12)+6;
    const bodyIM=new THREE.InstancedMesh(bg,MAT.model,cap),legIM=new THREE.InstancedMesh(lg,MAT.model,cap*2);bodyIM.count=0;legIM.count=0;bodyIM.castShadow=true;legIM.castShadow=true;
    bodyIM.frustumCulled=false;legIM.frustumCulled=false;scene.add(bodyIM);scene.add(legIM);PEDVAR.push({kind,bodyIM,legIM,cap,list:[]});}};
  add('adult',4);add('suit',2);add('kid',2);add('student',2);add('old',2);}
class Ped{
  constructor(kind){const vs=PEDVAR.filter(v=>v.kind===kind);this.var=vs.length?pick(vs):PEDVAR[0];this.kind=this.var.kind;this.x=0;this.z=0;this.y=0;this.h=0;this.v=0;this.mode='off';this.ph=Math.random()*6;
    this.R=kind==='kid'?0.3:0.35;this.spd=kind==='kid'?1.25:kind==='old'?0.8:1.25+R()*0.25;this.vis=false;this.onWalk=false;}
  set(x,z,h){this.x=x;this.z=z;if(h!==undefined)this.h=h;}
  show(b){this.vis=b;if(!b){this.mode='off';this.onWalk=false;}}
  stepTo(tx,tz,spd,dt){const dx=tx-this.x,dz=tz-this.z,d=Math.hypot(dx,dz);if(d<0.05){this.v=0;return true;}const s=Math.min(d,spd*dt);this.x+=dx/d*s;this.z+=dz/d*s;this.h=headingOf(dx,dz);this.v=spd;return d<=spd*dt;}
}
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_p=new V3(),_s1=new V3(1,1,1),_m4b=new THREE.Matrix4();
function renderPeds(dt){for(const V of PEDVAR){V.n=0;V.nl=0;}
  const cam=camera?camera.position:null;
  for(const p of PEDS){if(!p.vis)continue;if(cam&&Math.abs(p.x-cam.x)>260&&Math.abs(p.z-cam.z)>260)continue;const V=p.var;if(V.n>=V.cap)continue;
    p.ph+=dt*p.v*5.2;const a=p.v>0.05?Math.sin(p.ph)*0.5:0;const s=PEDKIND[V.kind].h/1.7;
    _q.setFromAxisAngle(_p.set(0,1,0),-p.h);_m4.compose(_p.set(p.x,p.y,p.z),_q,_s1);V.bodyIM.setMatrixAt(V.n++,_m4);
    for(const sx of[-1,1]){_e.set(sx*a,0,0);const ql=new THREE.Quaternion().setFromEuler(_e);_m4b.compose(_p.set(sx*0.11*s,0.82*s,0),ql,_s1);const mm=_m4.clone().multiply(_m4b);V.legIM.setMatrixAt(V.nl++,mm);}}
  for(const V of PEDVAR){V.bodyIM.count=V.n;V.legIM.count=V.nl;V.bodyIM.instanceMatrix.needsUpdate=true;V.legIM.instanceMatrix.needsUpdate=true;}}
// ---- 横断歩道 ----
function buildXwalks(){XWALKS.length=0;
  for(const n of NET.nodes){if(n.kind!=='x')continue;for(const L in n.xwalk){const e=n.legs[L];if(!e)continue;const r=e.road;const s=e.end==='start'?0.8+n.xwW/2:r.len-0.8-n.xwW/2;const[lo,hi]=xwalkSpan(n,r,s);
      XWALKS.push({sig:SIGS.get(n.k)||null,node:n,L,r,s,a:r.pt(s,lo-0.8),b:r.pt(s,hi+0.8),lo,hi,peds:[]});}
    const sg=SIGS.get(n.k);if(sg&&sg.def.scramble){// 斜め横断
      const c=n.fil.map(f=>({x:f.px+f.sx*1.5,z:f.pz+f.sz*1.5}));if(c.length===4){XWALKS.push({sig:sg,node:n,diag:true,a:c[0],b:c[3],peds:[]});XWALKS.push({sig:sg,node:n,diag:true,a:c[1],b:c[2],peds:[]});}}}
  for(const r of NET.roads)for(const f of r.feats)if(f.type==='xwalk'&&f.s!==undefined){const[lo,hi]=r.tRange(f.s);XWALKS.push({mid:true,r,f,s:f.s,a:r.pt(f.s,lo-(r.walk[0]?0.7:0.25)),b:r.pt(f.s,hi+(r.walk[1]?0.7:0.25)),lo,hi,peds:[]});}}
function crosswalkBusy(n,L){const X=XWALKS.find(x=>x.node===n&&x.L===L);if(!X)return false;if(X.peds.some(p=>p.mode==='xcross'))return true;
  const D=XWALKS.filter(x=>x.node===n&&x.diag);return D.some(x=>x.peds.some(p=>p.mode==='xcross'));}
function midXwalkBusy(f,v){const X=XWALKS.find(x=>x.mid&&x.f===f);if(!X)return false;return X.peds.some(p=>p.mode==='xcross'||(p.mode==='xwait'&&p.waitT>0.6));}
function vehiclesApproachingMid(X,dist){const r=X.r;for(const o of VEH){if(o.hidden||o.conn||!o.lane||o.lane.road!==r)continue;const d=(X.s-o.lane.sOf(o.u))*o.lane.dir;if(d>0&&d<dist&&o.v>1.2)return true;}
  const p=PLAYER;if(p&&STAGE.running&&p.loc&&p.loc.kind==='road'&&p.loc.road===r){const al=Math.cos(wrapA(p.h-r.at(p.loc.s).h));const dir=al>0?1:-1;const d=(X.s-p.loc.s)*dir;if(d>0&&d<dist&&p.v>1.2)return true;}return false;}
function vehiclesNearNode(n,d){for(const o of VEH)if(!o.hidden&&Math.hypot(o.x-n.x,o.z-n.z)<d&&o.v>1)return true;const p=PLAYER;return!!(p&&STAGE.running&&Math.hypot(p.x-n.x,p.z-n.z)<d&&p.v>1);}
// ---- 歩道を歩く人 ----
function buildWalkPaths(){WALKS.length=0;for(const r of NET.roads){if(r.len<24||r.type==='EXP'||r.type==='RAMP')continue;
    for(const side of[-1,1]){const w=r.walk[side<0?0:1];let off;if(w){off=(s)=>{const[lo,hi]=r.tRange(s);return side<0?lo-w*0.55:hi+w*0.55;};}
      else if(r.type==='RES'){off=(s)=>{const[lo,hi]=r.tRange(s);return side<0?lo+0.35:hi-0.35;};}else continue;
      WALKS.push({r,a:4,b:r.len-4,t:off,res:!w,side,inward:-side});}}}
function spawnPeds(n,opt={}){if(!WALKS.length)return;for(let i=0;i<n;i++){let w,s,P,tries=0;do{w=pick(WALKS);s=w.a+R()*(w.b-w.a);P=w.r.pt(s,w.t(s));tries++;}while(opt.avoid&&w.res&&Math.hypot(P.x-opt.avoid.x,P.z-opt.avoid.z)<(opt.avoidR||14)&&tries<20);
    const p=new Ped(pick(['adult','adult','adult','suit','kid','student','old']));p.set(P.x,P.z);p.y=P.y+(w.res?0:0.15);
    p.mode='walk';p.w=w;p.ws=s;p.dirW=R()<0.5?1:-1;p.onWalk=!w.res;p.show(true);PEDS.push(p);}}
let pedSpawnT=0,pedRecT=0;
function updatePeds(dt){
  for(const p of PEDS){if(p.mode==='off')continue;
    if(p.mode==='walk'){const w=p.w;let ws=p.ws+p.dirW*p.spd*0.85*dt;if(ws>w.b){ws=w.b;p.dirW=-1;}if(ws<w.a){ws=w.a;p.dirW=1;}const off=(p.wOff||0)*(w.inward||0);const P=w.r.pt(ws,w.t(ws)+off);
      // 道路を歩く人は、車にぶつからないように待つ。止まっている車なら、少し道路の内側に出てよけて通る
      const bk=w.res?pedBlocked(P.x,P.z,p.R+0.25,p.x,p.z):null;
      if(bk){p.v=0;p.blockT=Math.abs(bk.v)<0.3?(p.blockT||0)+dt:0;// 動いている車なら待つ。止まっている車なら内側に出てよける
        if(p.blockT>1.2&&w.inward&&(p.wOff||0)<2.8){const o2=((p.wOff||0)+dt*0.9)*w.inward;const Q=w.r.pt(p.ws,w.t(p.ws)+o2);if(!pedBlocked(Q.x,Q.z,p.R+0.2,p.x,p.z)){p.wOff=(p.wOff||0)+dt*0.9;p.h=headingOf(Q.x-p.x,Q.z-p.z);p.x=Q.x;p.z=Q.z;p.v=0.9;}}
        if(p.blockT>3.5){p.dirW=-p.dirW;p.blockT=0;}// よけられないときは引き返す
        continue;}
      p.blockT=0;if(p.wOff>0){const back=Math.max(0,p.wOff-dt*0.45);const Q=w.r.pt(ws,w.t(ws)+back*(w.inward||0));if(!pedBlocked(Q.x,Q.z,p.R+0.6))p.wOff=back;}
      p.ws=ws;const dx=P.x-p.x,dz=P.z-p.z;if(Math.hypot(dx,dz)>0.01)p.h=headingOf(dx,dz);p.x=P.x;p.z=P.z;p.y=P.y+(w.res?0:0.15);p.v=p.spd*0.85;}
    else if(p.mode==='xwait'){p.v=0;p.waitT+=dt;const X=p.X;let go=false;
      if(X.mid)go=!vehiclesApproachingMid(X,40)&&p.waitT>1.2;else if(X.diag)go=X.sig.pedFor('N')==='G'&&X.sig.scrambleNow();else{const s=X.sig?X.sig.pedFor(X.L):'OFF';go=s==='G'||(s==='OFF'&&p.waitT>3&&!vehiclesNearNode(X.node,25));}
      if(go)p.mode='xcross';const t=p.from===0?X.b:X.a;p.h=headingOf(t.x-p.x,t.z-p.z);}
    else if(p.mode==='xcross'){const X=p.X;const t=p.from===0?X.b:X.a;const hurry=!X.mid&&X.sig&&X.sig.pedFor(X.diag?'N':X.L)!=='G'?1.45:1;
      {const dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz)||1;const bk=pedBlocked(p.x+dx/d*0.35,p.z+dz/d*0.35,p.R+0.15,p.x,p.z);
        if(bk){p.blockT=(p.blockT||0)+dt;// 止まっている車があれば、横によけて渡る（いつまでも待ち合わない）
          if(p.blockT>1.2&&Math.abs(bk.v||0)<0.3){const nx=-dz/d,nz=dx/d;const side=((bk.x-p.x)*nx+(bk.z-p.z)*nz)>0?-1:1;const q={x:p.x+nx*side*0.9*dt,z:p.z+nz*side*0.9*dt};
            if(!pedBlocked(q.x,q.z,p.R+0.1,p.x,p.z)||p.blockT>4){p.x=q.x;p.z=q.z;p.h=headingOf(nx*side,nz*side);p.v=0.9;if(p.blockT>4){p.stepTo(t.x,t.z,p.spd,dt);}}}
          else p.v=0;continue;}p.blockT=0;}
      if(p.stepTo(t.x,t.z,p.spd*hurry,dt)){p.show(false);X.peds=X.peds.filter(q=>q!==p);}}
    else if(p.mode==='script'&&p.script)p.script(p,dt);}
  // 大きな地図：遠くの歩行者を近くの歩道に入れ替える
  if(NET.map&&NET.map.recycle&&PLAYER&&STAGE.running){pedRecT-=dt;if(pedRecT<=0){pedRecT=0.5;let n=0;for(const p of PEDS){if(n>=3)break;if(p.mode!=='walk'||p.reserved||(p.w&&p.w.ped))continue;if(Math.hypot(p.x-PLAYER.x,p.z-PLAYER.z)<300)continue;
        for(let k=0;k<8;k++){const w=pick(WALKS);if(w.ped)continue;const s=w.a+R()*(w.b-w.a);const P=w.r.pt(s,w.t(s));const d=Math.hypot(P.x-PLAYER.x,P.z-PLAYER.z);if(d<60||d>230)continue;p.set(P.x,P.z);p.y=P.y+(w.res?0:0.15);p.w=w;p.ws=s;p.wOff=0;p.onWalk=!w.res;n++;break;}}}}
  const crowd=NET.map&&NET.map.crowd?2:1;
  pedSpawnT-=dt;if(pedSpawnT<=0&&PLAYER){pedSpawnT=(NET.map&&NET.map.crossRate)||2.5;const cands=XWALKS.filter(X=>Math.hypot(X.a.x-PLAYER.x,X.a.z-PLAYER.z)<170&&X.peds.length<(X.mid?1:X.diag?4*crowd:X.sig?3*crowd:1)&&!X.lock&&(X.sig||X.diag||R()<0.3));
    if(cands.length&&R()<0.8){const X=pick(cands);spawnCrosser(X,R()<0.5?0:1,pick(['adult','adult','suit','kid','student','old']));}}}
// その位置に車の車体があるか（歩行者が車にぶつかっていかないように）
// 歩行者の次の一歩が車体に近づきすぎるか（そばを平行に歩くだけなら止まらない）
function pedBlocked(x,z,rad,x0,z0){const near=(o)=>{const d1=distToOBB(o,x,z);if(d1>=rad)return false;if(x0===undefined)return true;return d1<distToOBB(o,x0,z0)-0.002;};
  const p=PLAYER;if(p&&STAGE.running&&Math.abs(p.x-x)<6&&Math.abs(p.z-z)<6&&near(p))return p;
  for(const o of VEH){if(o.hidden||Math.abs(o.x-x)>6||Math.abs(o.z-z)>6)continue;if(near(o))return o;}return null;}
function spawnCrosser(X,from,kind){let p=PEDS.find(q=>q.mode==='off'&&q.kind===kind&&!q.reserved);if(!p){if(PEDS.length>=PEDCAP)return null;p=new Ped(kind);PEDS.push(p);}
  const s=from===0?X.a:X.b;const off=(R()-0.5)*1.4;const dx=X.b.x-X.a.x,dz=X.b.z-X.a.z,L=Math.hypot(dx,dz)||1;p.set(s.x+(-dz/L)*off,s.z+(dx/L)*off);p.y=(X.node?X.node.y:X.r?X.r.yAt(X.s):0)+0.15;
  p.X=X;p.from=from;p.mode='xwait';p.waitT=0;p.onWalk=false;p.show(true);X.peds.push(p);return p;}
function clearPeds(){for(const p of PEDS){p.show(false);p.reserved=false;}PEDS.length=0;for(const X of XWALKS)X.peds=[];}

