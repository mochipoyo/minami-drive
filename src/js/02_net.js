// ===== 02_net.js : 道路ネットワーク（曲線・多車線・合流・交差点に対応） =====
// 座標：x=東, z=南, y=上。向きh：0=北(-z), +π/2=東。道路の横位置t：+sの進行方向に対して右が正。
// 日本は左側通行：+s方向(F)の車線はt<0側、-s方向(B)の車線はt>0側。車線番号0＝進行方向の一番左（第1通行帯）。
const NET={roads:[],nodes:[],lanes:[],conns:[],lots:[],byId:{},nodeById:{},grid:new Map(),GS:24,map:null,obst:[]};
const ROADTYPE={
  EXP:{w:3.6,label:'高速道路の本線',color:0x6a6e74},RAMP:{w:3.6,label:'ランプ（連絡路）',color:0x6c7076},
  ART:{w:3.25,label:'幹線道路',color:0x6b7077},COL:{w:3.0,label:'中央線のある道路',color:0x6f7379},
  RES:{w:2.6,label:'中央線のない道路',color:0x7d8186},LOT:{w:3.0,label:'駐車場・構内',color:0x74787d},CRS:{w:3.5,label:'教習所のコース',color:0x6d7177}};
const LEGDIR={N:{dx:0,dz:-1,h:0},S:{dx:0,dz:1,h:Math.PI},E:{dx:1,dz:0,h:Math.PI/2},W:{dx:-1,dz:0,h:-Math.PI/2}};
const OPP={N:'S',S:'N',E:'W',W:'E'};
const legHeading={N:Math.PI,S:0,W:Math.PI/2,E:-Math.PI/2};// その脚から交差点へ向かう車の向き
const outHeading={N:0,S:Math.PI,W:-Math.PI/2,E:Math.PI/2};// その脚へ出ていく車の向き
function turnOf(h0,h1){const d=wrapA(h1-h0);return Math.abs(d)<0.35?'S':Math.abs(d)>2.6?'U':d>0?'R':'L';}
function legOfDir(dx,dz){if(Math.abs(dx)>Math.abs(dz))return dx>0?'E':'W';return dz>0?'S':'N';}
function netReset(){for(const k of['roads','nodes','lanes','conns','lots','obst'])NET[k].length=0;NET.byId={};NET.nodeById={};NET.grid=new Map();}

// ---------- 道路 ----------
class Road{
  constructor(d){this.def=d;this.id=d.id;this.name=d.name||'';this.type=d.type||'COL';this.T=ROADTYPE[this.type];
    this.nF=d.nF!==undefined?d.nF:1;this.nB=d.nB!==undefined?d.nB:(d.oneway?0:1);this.w=d.w||this.T.w;
    this.med=Object.assign({w:0,kind:this.nB&&this.nF?(this.type==='RES'?'none':'line'):'none'},d.med||{});
    this.sh=d.sh||(this.type==='EXP'?[2.5,0.75]:this.type==='RAMP'?[2.5,1.0]:this.type==='RES'?[0.25,0]:this.type==='ART'?[0.5,0.25]:[0.5,0]);
    this.walk=d.walk!==undefined?d.walk:(this.type==='ART'?[4,4]:this.type==='COL'?[2.5,2.5]:[0,0]);if(typeof this.walk==='number')this.walk=[this.walk,this.walk];
    this.limit=d.limit||0;this.center=d.center||(this.nB&&this.nF?(this.type==='RES'?'none':'white'):'none');this.sep=d.sep||'dash';
    this.patches=[];this.lanesF=[];this.lanesB=[];this.agents=[];this.feats=d.feats||[];this.signs=[];this.tunnels=d.tunnels||[];this.bridges=d.bridges||[];
    this.startNode=null;this.endNode=null;this.startLeg=null;this.endLeg=null;NET.roads.push(this);NET.byId[this.id]=this;}
  get oneway(){return this.nB===0?1:this.nF===0?-1:0;}
  // 横断面：中央からの距離
  halfIn(){return this.med.w/2;}
  bandF(){const m=this.nB?this.med.w/2:0;return this.nB?[-(m+this.nF*this.w),-m]:[-this.nF*this.w/2,this.nF*this.w/2];}
  bandB(){const m=this.med.w/2;return[m,m+this.nB*this.w];}
  // サンプリング（参照線）
  sample(path){const X=[],Z=[],H=[],S=[];let s=0;
    for(let i=0;i<path.length;i++){const p=path[i];if(i>0){const q=path[i-1];s+=Math.hypot(p.x-q.x,p.z-q.z);if(Math.hypot(p.x-q.x,p.z-q.z)<1e-6)continue;}X.push(p.x);Z.push(p.z);S.push(s);}
    for(let i=0;i<X.length;i++){const a=Math.max(0,i-1),b=Math.min(X.length-1,i+1);H.push(headingOf(X[b]-X[a],Z[b]-Z[a]));}
    this.X=X;this.Z=Z;this.H=H;this.S=S;this.len=S[S.length-1];}
  idx(s){const S=this.S;if(s<=0)return 0;if(s>=this.len)return S.length-2;let lo=0,hi=S.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(S[m]<=s)lo=m;else hi=m;}return lo;}
  at(s){const i=this.idx(s),S=this.S;const ds=S[i+1]-S[i]||1;const k=clamp((s-S[i])/ds,0,1);const x=this.X[i]+(this.X[i+1]-this.X[i])*k,z=this.Z[i]+(this.Z[i+1]-this.Z[i])*k;
    const h=this.H[i]+wrapA(this.H[i+1]-this.H[i])*k;return{x,z,h,y:this.yAt(s),rx:Math.cos(h),rz:Math.sin(h)};}
  pt(s,t){const P=this.at(s);return{x:P.x+P.rx*t,z:P.z+P.rz*t,y:P.y,h:P.h};}
  yAt(s){const Y=this.Y;if(!Y)return 0;const i=this.idx(s),S=this.S;const k=clamp((s-S[i])/((S[i+1]-S[i])||1),0,1);return Y[i]+(Y[i+1]-Y[i])*k;}
  gradeAt(s){const d=2;return(this.yAt(Math.min(this.len,s+d))-this.yAt(Math.max(0,s-d)))/(2*d);}
  lanes(dir){return dir>0?this.lanesF:this.lanesB;}
  allLanes(dir){return this.lanes(dir).concat(this.patches.filter(p=>p.dir===dir));}
  // 走れる範囲（両方向＋中央が塗装なら中央も）
  drivableBands(s){const out=[];const inF=this._edges(1,s),inB=this.nB?this._edges(-1,s):null;
    if(inF)out.push([inF.outer-this.sh[0],inF.inner+(this.nB?this.sh[1]:this.sh[0])]);
    if(inB)out.push([inB.inner-this.sh[1],inB.outer+this.sh[0]]);
    if(inF&&inB&&this.medDrivable(s))out.push([inF.inner,inB.inner]);
    return out;}
  medDrivable(s){const k=this.med.kind;if(k==='none'||k==='line'||k==='yellow'||k==='zebra')return true;return this.patches.some(p=>p.kind==='turnR'&&s>=p.s0-0.5&&s<=p.s1+0.5);}
  // 車線群の端（outer:路肩側, inner:中央側）。dir=+1ならt<0側
  _edges(dir,s){const ls=this.allLanes(dir);let lo=Infinity,hi=-Infinity;for(const l of ls){if(s<l.s0-0.01||s>l.s1+0.01)continue;const w=l.wAt(s);if(w<0.05)continue;const t=l.tAt(s);lo=Math.min(lo,t-w/2);hi=Math.max(hi,t+w/2);}
    if(lo===Infinity){if(dir>0){const b=this.bandF();lo=b[0];hi=b[1];}else{const b=this.bandB();lo=b[0];hi=b[1];}}
    return dir>0?{outer:lo,inner:hi}:{outer:hi,inner:lo};}
  tRange(s){const b=this.drivableBands(s);let lo=Infinity,hi=-Infinity;for(const[a,c]of b){lo=Math.min(lo,a);hi=Math.max(hi,c);}return[lo,hi];}
  speedLimit(){if(this.limit)return{v:this.limit,legal:false};if(this.type==='EXP')return{v:100,legal:true};
    // 中央線・車両通行帯・分離のいずれかがある一般道路は60、それ以外は30（2026年9月1日から）
    const hasCenter=this.nF&&this.nB&&(this.center!=='none'||this.med.w>0.3);const hasLanes=this.nF>=2||this.nB>=2;return{v:(hasCenter||hasLanes)?60:30,legal:true};}
}
// パス（[x,z]の折れ線＋角の丸め、または start+pieces）から細かい点列を作る
function pathSamples(d,step=2.5){const out=[];
  if(d.pieces){let x=d.start[0],z=d.start[1],h=d.start[2]||0;out.push({x,z});
    for(const p of d.pieces){if(p.l){const n=Math.max(1,Math.ceil(p.l/step));const f=fwd(h);for(let i=1;i<=n;i++)out.push({x:x+f.x*p.l*i/n,z:z+f.z*p.l*i/n});x+=f.x*p.l;z+=f.z*p.l;}
      else{const ang=p.a*Math.PI/180,len=Math.abs(ang)*p.r;const n=Math.max(2,Math.ceil(len/1.5));const dh=ang/n,ds=len/n;for(let i=0;i<n;i++){h+=dh/2;const f=fwd(h);x+=f.x*ds;z+=f.z*ds;h+=dh/2;out.push({x,z});}}}
    return out;}
  const P=d.path.map(p=>({x:p[0],z:p[1]}));const rad=(i)=>Array.isArray(d.r)?d.r[i]||0:(d.r||0);
  const push=(a,b)=>{const L=Math.hypot(b.x-a.x,b.z-a.z);const n=Math.max(1,Math.ceil(L/step));for(let i=1;i<=n;i++)out.push({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n});};
  out.push(P[0]);let cur=P[0];
  for(let i=1;i<P.length-1;i++){const A=P[i-1],B=P[i],Cc=P[i+1];const h1=headingOf(B.x-A.x,B.z-A.z),h2=headingOf(Cc.x-B.x,Cc.z-B.z);const th=wrapA(h2-h1);let r=rad(i);
    if(Math.abs(th)<1e-3||r<=0){push(cur,B);cur=B;continue;}
    const l1=Math.hypot(B.x-A.x,B.z-A.z),l2=Math.hypot(Cc.x-B.x,Cc.z-B.z);let T=r*Math.tan(Math.abs(th)/2);const maxT=Math.min(i===1?l1:l1/2,i===P.length-2?l2:l2/2)*0.98;if(T>maxT){T=maxT;r=T/Math.tan(Math.abs(th)/2);}
    const f1=fwd(h1),f2=fwd(h2);const As={x:B.x-f1.x*T,z:B.z-f1.z*T};push(cur,As);
    const rv=rightV(h1);const sg=th>0?1:-1;const cx=As.x+rv.x*r*sg,cz=As.z+rv.z*r*sg;const n=Math.max(3,Math.ceil(Math.abs(th)*r/1.2));
    for(let k=1;k<=n;k++){const h=h1+th*k/n;const rr=rightV(h);out.push({x:cx-rr.x*r*sg,z:cz-rr.z*r*sg});}
    cur={x:B.x+f2.x*T,z:B.z+f2.z*T};}
  push(cur,P[P.length-1]);return out;}

// ---------- 車線 ----------
class Lane{
  constructor(road,dir,idx,kind,o){this.road=road;this.dir=dir;this.idx=idx;this.kind=kind||'main';this.id=NET.lanes.length;NET.lanes.push(this);
    this.s0=0;this.s1=road.len;this.w=road.w;this.next=[];this.prev=[];this.conns=[];this.agents=[];this.arrows=null;this.bus=false;this.line=null;
    if(o)Object.assign(this,o);
    if(this.kind==='main'){const n=dir>0?road.nF:road.nB;const m=road.nB&&road.nF?road.med.w/2:0;
      if(road.nB&&road.nF)this.tC=dir>0?-(m+(n-1-idx)*this.w+this.w/2):(m+(n-1-idx)*this.w+this.w/2);
      else this.tC=dir>0?(-n*this.w/2+idx*this.w+this.w/2):(n*this.w/2-idx*this.w-this.w/2);}
    this.limitV=null;}
  get len(){return this.s1-this.s0;}
  tAt(s){if(this.kind==='main')return this.tC;const p=this;if(p.kA>0&&s<p.s0+p.kA)return lerp(p.tA,p.tC,smooth((s-p.s0)/p.kA));if(p.kB>0&&s>p.s1-p.kB)return lerp(p.tC,p.tB,smooth((s-(p.s1-p.kB))/p.kB));return p.tC;}
  wAt(s){if(this.kind==='main')return this.w;const p=this;if(p.kA>0&&p.wA0&&s<p.s0+p.kA)return this.w*smooth((s-p.s0)/p.kA);if(p.kB>0&&p.wB0&&s>p.s1-p.kB)return this.w*(1-smooth((s-(p.s1-p.kB))/p.kB));return this.w;}
  sOf(u){return this.dir>0?this.s0+u:this.s1-u;}
  uOf(s){return this.dir>0?s-this.s0:this.s1-s;}
  pos(u,d=0){const s=this.sOf(u);const P=this.road.at(s);const t=this.tAt(s)+d*this.dir;let h=this.dir>0?P.h:wrapA(P.h+Math.PI);
    if(this.kind!=='main'){const e=0.5;const dt=(this.tAt(Math.min(this.s1,s+e))-this.tAt(Math.max(this.s0,s-e)))/(2*e);h+=Math.atan(dt);}
    return{x:P.x+P.rx*t,z:P.z+P.rz*t,y:P.y,h};}
  get limit(){if(this.limitV)return this.limitV;return this.road.speedLimit().v/KMH;}
  startNode(){return this.dir>0?this.road.startNode:this.road.endNode;}
  endNode(){return this.dir>0?this.road.endNode:this.road.startNode;}
  entryLeg(){return this.dir>0?this.road.endLeg:this.road.startLeg;}// 終点側の交差点にどの脚から入るか
  // 隣の車線（side=-1:進行方向左、+1:右）とその境界線の種類
  neighbor(side,s){const ls=this.road.allLanes(this.dir);let best=null,bd=1e9;const t0=this.tAt(s),w0=this.wAt(s);const want=t0+side*this.dir*w0/2;
    for(const l of ls){if(l===this||s<l.s0+0.5||s>l.s1-0.5)continue;const w=l.wAt(s);if(w<1.4)continue;const t=l.tAt(s);const edge=t-side*this.dir*w/2;const dd=Math.abs(edge-want);
      if((t-t0)*side*this.dir>0.5&&dd<bd){bd=dd;best=l;}}
    return bd<0.9?best:null;}
  lineTo(side,s){// 境界線（'dash','solid','yellow','thick'）
    const nb=this.neighbor(side,s);if(!nb)return null;const p=this.kind!=='main'?this:nb.kind!=='main'?nb:null;
    if(p){if(p.lineType)return p.lineType(s,this.dir);return'dash';}
    const r=this.road;const ys=r.def.yellowSep;if(ys&&ys.some(([a,b])=>s>=a&&s<=b))return'yellow';// 区間の黄色の線（トンネルなど：進路変更禁止）
    const sEnd=this.dir>0?r.len-s:s;// 交差点までの距離
    if(r.sepYellow&&sEnd<r.sepYellow)return'yellow';
    if(r.sepSolid&&sEnd<r.sepSolid&&this.endNode()&&this.endNode().kind==='x')return'solid';return r.sep;}
}
// 付加車線（右折レーン・加速車線・減速車線）
function addPatch(road,o){// o:{dir,kind,s0,s1,side:'L'|'R',kA,kB,wA0,wB0}
  const dir=o.dir;const base=o.side==='R'?(dir>0?road.lanesF[road.nF-1]:road.lanesB[road.nB-1]):(dir>0?road.lanesF[0]:road.lanesB[0]);const w=o.w||road.w;
  const sgn=(o.side==='R'?1:-1)*dir;// t方向の符号
  const tC=base.tC+sgn*(base.w/2+w/2+(o.gap||0));const edge=base.tC+sgn*base.w/2;
  const s0=o.s0<0?road.len+o.s0:o.s0,s1=o.s1<=0?road.len+o.s1:o.s1;
  const p=new Lane(road,dir,o.side==='R'?(dir>0?road.nF:road.nB):-1,o.kind,{s0,s1,w,tC,tA:o.tA!==undefined?o.tA:edge,tB:o.tB!==undefined?o.tB:edge,kA:o.kA||0,kB:o.kB||0,wA0:!!o.wA0,wB0:!!o.wB0,base,side:o.side,lineKind:o.line||'dash',pid:o.pid||null,dest:o.dest||null,exitP:o.exitP});
  p.lineType=(s,d)=>{if(p.kind==='turnR'){const sEnd=d>0?road.len-s:s;return sEnd<30?'solid':'dash';}return p.lineKind;};
  road.patches.push(p);return p;}

// ---------- 交差点・接続点 ----------
class Node{
  constructor(d){Object.assign(this,{kind:'x',x:0,z:0,y:0,legs:{},signal:null,stopLegs:[],xwalk:{},fil:[],hx:0,hz:0},d);this.k=d.id;NET.nodes.push(this);NET.nodeById[this.id]=this;}
}
function legRoadEnd(n,L){const e=n.legs[L];return e;}// {road, end:'start'|'end'}

// ---------- 地図の組み立て ----------
// def: {nodes:[{id,x,z,y,signal,stop,xwalk,kind}], roads:[{id,from,to,path|pieces,...}], links:[[roadA,'F',idxA, roadB,'F',idxB],...]}
function netBuild(def){netReset();
  for(const nd of def.nodes||[])new Node(Object.assign({},nd,{stopLegs:nd.stop||[],signalDef:nd.signal||null,signal:null,xwalkDef:nd.xwalk,xwalk:{},fil:[],legs:{}}));
  const pend=[];
  const later=[];
  for(const rd of def.roads){const r=new Road(rd);if(typeof rd.path==='function'){later.push(r);continue;}let pts=pathSamples(rd);
    // 交差点の中心から始まる（終わる）道路：脚の向きを決める
    // 脚の方角：地図データで指定があればそれ（斜めに入る道路のある地図）。なければ最初の区間の向きから
    if(rd.from){const n=NET.nodeById[rd.from];const a=pts[0],b=pts[1];const L=rd.leg0||legOfDir(b.x-a.x,b.z-a.z);r.startNode=n;r.startLeg=L;n.legs[L]={road:r,end:'start'};}
    if(rd.to){const n=NET.nodeById[rd.to];const a=pts[pts.length-1],b=pts[pts.length-2];const L=rd.leg1||legOfDir(b.x-a.x,b.z-a.z);r.endNode=n;r.endLeg=L;n.legs[L]={road:r,end:'end'};}
    pend.push([r,pts]);}
  // 交差点の大きさ
  for(const n of NET.nodes){if(n.kind!=='x')continue;let hx=0,hz=0;
    for(const L in n.legs){const r=n.legs[L].road;const half=Math.max(Math.abs(r.nB?r.bandB()[1]+r.sh[0]:r.bandF()[1]+r.sh[0]),Math.abs(r.bandF()[0]-r.sh[0]))+(n.extra||0);
      if(L==='N'||L==='S')hx=Math.max(hx,half);else hz=Math.max(hz,half);}
    n.hx=n.hx||hx||3;n.hz=n.hz||hz||3;}
  // 道路の端を交差点の縁で切る
  for(const[r,pts]of pend){let a=0,b=0;if(r.startNode&&r.startNode.kind==='x')a=(r.startLeg==='N'||r.startLeg==='S')?r.startNode.hz:r.startNode.hx;
    if(r.endNode&&r.endNode.kind==='x')b=(r.endLeg==='N'||r.endLeg==='S')?r.endNode.hz:r.endNode.hx;
    if(r.def.cut0!==undefined)a=r.def.cut0;if(r.def.cut1!==undefined)b=r.def.cut1;// 切る長さの指定（多角形の交差点）
    r.sample(pts);if(a||b){const S=r.S;const s0=a,s1=r.len-b;const keep=[];const A=r.at(s0),B=r.at(s1);keep.push({x:A.x,z:A.z});for(let i=0;i<S.length;i++)if(S[i]>s0+0.05&&S[i]<s1-0.05)keep.push({x:r.X[i],z:r.Z[i]});keep.push({x:B.x,z:B.z});r.sample(keep);}
    // 高さ
    const d=r.def;const y0=r.startNode?r.startNode.y||0:(d.y0||0),y1=r.endNode?r.endNode.y||0:(d.y1!==undefined?d.y1:y0);
    if(d.prof||y0||y1){const prof=(d.prof||[]).map(([s,y])=>[s<0?r.len+s:s<=1&&s>0&&d.profFrac?s*r.len:s,y]);const pts2=[[0,y0],...prof,[r.len,y1]].sort((p,q)=>p[0]-q[0]);
      const raw=r.S.map(s=>{let i=0;while(i<pts2.length-2&&pts2[i+1][0]<s)i++;const[p,q]=[pts2[i],pts2[i+1]];return lerp(p[1],q[1],clamp((s-p[0])/((q[0]-p[0])||1),0,1));});
      // なめらかにする（縦断曲線のかわり）
      const Y=raw.slice();const win=d.ySmooth||24;for(let i=0;i<Y.length;i++){let acc=0,wt=0;for(let j=i;j>=0&&r.S[i]-r.S[j]<=win;j--){acc+=raw[j];wt++;}for(let j=i+1;j<Y.length&&r.S[j]-r.S[i]<=win;j++){acc+=raw[j];wt++;}Y[i]=acc/wt;}
      Y[0]=y0;Y[Y.length-1]=y1;r.Y=Y;}
    // 車線
    for(let i=0;i<r.nF;i++)r.lanesF.push(new Lane(r,1,i));for(let i=0;i<r.nB;i++)r.lanesB.push(new Lane(r,-1,i));
    for(const p of(r.def.patches||[]))addPatch(r,p);
    if(r.def.arrows){if(r.def.arrows.F)r.def.arrows.F.forEach((a,i)=>{const l=r.lanesF[i]||r.patches.find(p=>p.dir>0&&p.kind==='turnR'&&i===r.nF);if(l)l.arrows=a;});
      if(r.def.arrows.B)r.def.arrows.B.forEach((a,i)=>{const l=r.lanesB[i]||r.patches.find(p=>p.dir<0&&p.kind==='turnR'&&i===r.nB);if(l)l.arrows=a;});}
    if(r.def.bus){for(const k of['F','B']){if(r.def.bus[k]){const l=(k==='F'?r.lanesF:r.lanesB)[0];if(l)l.bus=r.def.bus[k];}}}
    for(const L of r.lanesF.concat(r.lanesB))if(r.def.laneLimit)L.limitV=r.def.laneLimit/KMH;}
  // あとから作る道路（ランプなど：本線の形を使って位置を決める）
  for(const r of later){const d=r.def;const pts=pathSamples(Object.assign({},d,{path:d.path(NET)}));r.sample(pts);
    if(d.prof||d.y0||d.y1){const y0=d.y0||0,y1=d.y1!==undefined?d.y1:y0;const pr=[[0,y0],...(d.prof||[]).map(([s2,y])=>[s2<0?r.len+s2:s2,y]),[r.len,y1]].sort((a,b)=>a[0]-b[0]);
      r.Y=r.S.map(s2=>{let i=0;while(i<pr.length-2&&pr[i+1][0]<s2)i++;const a=pr[i],b=pr[i+1];return lerp(a[1],b[1],smooth((s2-a[0])/((b[0]-a[0])||1)));});}
    for(let i=0;i<r.nF;i++)r.lanesF.push(new Lane(r,1,i));for(let i=0;i<r.nB;i++)r.lanesB.push(new Lane(r,-1,i));for(const p of(d.patches||[]))addPatch(r,p);
    for(const L of r.lanesF.concat(r.lanesB))if(d.laneLimit)L.limitV=d.laneLimit/KMH;}
  // 多角形の交差点（斜めに道路が入る地図）：切ったあとの道路の端から形を作る（02h）
  for(const n of NET.nodes)if(n.kind==='x'&&n.polyAuto)nodePolyBuild(n);
  for(const n of NET.nodes)if(n.kind==='x')nodeSetup(n,def);
  // 直結（ランプ→加速車線、減速車線→ランプ、道路→道路）
  for(const lk of def.links||[]){const[ra,ka,ia,rb,kb,ib]=lk;const A=findLane(NET.byId[ra],ka,ia),B=findLane(NET.byId[rb],kb,ib);if(A&&B){A.next.push({lane:B});B.prev.push({lane:A});}}
  for(const L of def.lots||[])addLot(Object.assign({},L));
  buildGrid();
}
function findLane(r,k,i){if(!r)return null;if(k==='F')return r.lanesF[i];if(k==='B')return r.lanesB[i];const[kind,pid]=k.split(':');return r.patches.find(p=>p.kind===kind&&(!pid||p.pid===pid)&&(i===undefined||p.dir===i))||null;}
// 交差点：隅切り・横断歩道・停止線・接続路
function nodeSetup(n,def){const legs=Object.keys(n.legs);
  if(n.signalDef)n.signal=n.signalDef;
  const xw=n.xwalkDef!==undefined?n.xwalkDef:(n.signal?true:false);
  for(const L of legs){if(xw===true||(Array.isArray(xw)&&xw.includes(L)))n.xwalk[L]=true;}
  n.xwW=n.xwW||(legs.some(L=>n.legs[L].road.type==='ART')?5:4);
  // 隅切り（多角形の交差点では形に含めてあるので作らない）
  if(!n.poly)for(const sx of[-1,1])for(const sz of[-1,1]){const hL=sx>0?'E':'W',vL=sz>0?'S':'N';
    if(n.legs[hL]&&n.legs[vL]){const ta=n.legs[hL].road.type,tb=n.legs[vL].road.type;const both=ta==='RES'&&tb==='RES';const corner=legs.length===2;
      const r=n.filR||(both?(corner?6:4.5):(ta==='ART'||tb==='ART')?9:6);n.fil.push({sx,sz,r,px:n.x+sx*n.hx,pz:n.z+sz*n.hz});}}
  // 接続路
  for(const L of legs){const e=n.legs[L];const r=e.road;const dirIn=e.end==='end'?1:-1;// その道路のどちら向きの車線が交差点に入るか
    const inLanes=r.allLanes(dirIn).filter(l=>(dirIn>0?Math.abs(l.s1-r.len)<1:Math.abs(l.s0)<1)&&l.kind!=='accel'&&l.kind!=='decel');
    const nMain=r.lanes(dirIn).length;const hasR=inLanes.some(l=>l.kind==='turnR');
    for(const l of inLanes){l.inLeg=L;l.node=n;
      for(const L2 of legs){if(L2===L)continue;const e2=n.legs[L2];const r2=e2.road;if(r2.def.pedOnly)continue;// 歩行者用道路には入らない
        const dirOut=e2.end==='start'?1:-1;const outs=r2.lanes(dirOut);if(!outs.length)continue;
        // 曲がる向き：方角の脚どうしから。多角形の交差点では道路の実際の向きから（斜めに入る道路）
        const turn=n.poly?polyTurn(n,L,L2,l.pos(l.len).h,outs[0].pos(0).h):turnOf(legHeading[L],outHeading[L2]);let ok;
        if(l.arrows)ok=l.arrows.includes(turn);
        else if(l.kind==='turnR')ok=turn==='R';
        else if(turn==='L')ok=l.idx===0;
        else if(turn==='R')ok=hasR?false:(l.idx===nMain-1);
        else ok=true;
        if(nMain===1&&!hasR&&l.kind==='main')ok=true;
        if(n.noTurn&&n.noTurn[L]&&n.noTurn[L].includes(turn))ok=false;
        if(!ok)continue;
        let tgt;if(turn==='L')tgt=outs[0];else if(turn==='R')tgt=outs[outs.length-1];else tgt=outs[Math.min(l.kind==='turnR'?outs.length-1:l.idx,outs.length-1)];
        const c=makeConn(l,tgt,n,turn);c.drv=makeDrivePath(c);l.conns.push(c);tgt.prev.push({conn:c});NET.conns.push(c);}}}
}
// 右左折で実際の車が通る線（車が曲がれる半径の円弧。交差点の手前から曲がり始め、先で戻る）
// 自動運転（お手本）用。AI車は接続路をそのまま使う
function makeDrivePath(c){if(c.turn!=='L'&&c.turn!=='R')return null;const l0=c.from,l1=c.next;const p0=l0.pos(l0.len),p3=l1.pos(0);const f0=fwd(p0.h),f1=fwd(p3.h);
  const den=f0.x*f1.z-f0.z*f1.x;if(Math.abs(den)<0.3)return null;const dx=p3.x-p0.x,dz=p3.z-p0.z;
  const a=(dx*f1.z-dz*f1.x)/den,b=(dx*f0.z-dz*f0.x)/den;// p0+f0*a = p3+f1*b（aは交点まで、bは交点から出口までの負の距離）
  if(a<-0.5||b>0.5)return null;const X={x:p0.x+f0.x*a,z:p0.z+f0.z*a};const th=Math.abs(wrapA(p3.h-p0.h));if(th<0.5||th>2.6)return null;
  const n=c.node;const fr=n.fil.length?Math.min(...n.fil.map(f=>f.r)):5;const base=Math.min(Math.max(a,0),Math.max(-b,0));
  let R=c.turn==='L'?base+fr:base+1.6;R=clamp(R,4.3,14);let T=R*Math.tan(th/2);
  const maxIn=Math.max(0,l0.len-8)+Math.max(a,0),maxOut=Math.max(0,l1.len-8)+Math.max(-b,0);if(T>maxIn||T>maxOut){T=Math.min(maxIn,maxOut);R=T/Math.tan(th/2);if(R<4.3)return null;}
  // 手前の横断歩道の上では曲がり始めない（交差点の縁から曲がる）
  {const n0=c.node;const maxS=n0&&l0.inLeg&&n0.xwalk[l0.inLeg]?0.6:2.5;if(T-Math.max(a,0)>maxS){T=Math.max(a,0)+maxS;R=T/Math.tan(th/2);if(R<3.6)return null;}}
  const S={x:X.x-f0.x*T,z:X.z-f0.z*T};const side=c.turn==='L'?-1:1;const r0=rightV(p0.h);const C={x:S.x+r0.x*R*side,z:S.z+r0.z*R*side};
  const P=[];let len=0,prev=null;const N=Math.max(8,Math.ceil(R*th/0.6));
  const push=(x,z)=>{if(prev)len+=Math.hypot(x-prev.x,z-prev.z);const q={x,z,s:len};P.push(q);prev=q;};
  if(a>T)push(p0.x,p0.z);// 交差点の中で少しまっすぐ進んでから
  for(let i=0;i<=N;i++){const hh=p0.h+side*th*i/N;const rv=rightV(hh);push(C.x-rv.x*R*side,C.z-rv.z*R*side);}
  if(-b>T)push(p3.x,p3.z);
  // 多角形の交差点（新宿）：細い道の鋭い角では、この円弧だと車体が歩道の角にかかることがある。そのときは接続路（ベジエ）をそのまま使う（02h）
  if(n.poly&&n.corners&&n.corners.length&&drivePathClips(P,n.corners))return null;
  return{pts:P,len,l0,l1,sIn:Math.max(0,T-a),sOut:Math.max(0,T+b),y:c.y,R,h0:p0.h,h1:p3.h,c};}
// 線に沿って車体（幅1.8m・長さ4.7m）を置いたとき、歩道の角の多角形にかかるか
function drivePathClips(P,corners){const W2=0.9,L2=2.35;
  for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const dx=b.x-a.x,dz=b.z-a.z;const L=Math.hypot(dx,dz);if(L<1e-6)continue;const f={x:dx/L,z:dz/L},r={x:-f.z,z:f.x};
    for(const[u,v]of[[1,1],[1,-1],[-1,-1],[-1,1],[0,-1],[0,1]]){const x=b.x+f.x*L2*u+r.x*W2*v,z=b.z+f.z*L2*u+r.z*W2*v;for(const c of corners)if(polyHas(c.pts,x,z,0))return true;}}
  return false;}
function drvAt(D,s){if(s<0){const u=D.l0.len-D.sIn+s;if(u>=0)return D.l0.pos(u,0);const f=fwd(D.h0);const P=D.pts[0];return{x:P.x+f.x*s,z:P.z+f.z*s,y:D.y};}
  if(s>D.len){const u=D.sOut+(s-D.len);if(u<=D.l1.len)return D.l1.pos(u,0);const f=fwd(D.h1);const P=D.pts[D.pts.length-1];return{x:P.x+f.x*(s-D.len),z:P.z+f.z*(s-D.len),y:D.y};}
  const P=D.pts;let i=1;while(i<P.length-1&&P[i].s<s)i++;const a=P[i-1],b=P[i];const t=(s-a.s)/((b.s-a.s)||1);return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:D.y};}
function drvProject(D,x,z){const P=D.pts;const f0=fwd(D.h0),f1=fwd(D.h1);const A=P[0],Z=P[P.length-1];
  const before=(x-A.x)*f0.x+(z-A.z)*f0.z;if(before<0)return before;const after=(x-Z.x)*f1.x+(z-Z.z)*f1.z;
  let best=Infinity,bs=0;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const dx=b.x-a.x,dz=b.z-a.z;const L2=dx*dx+dz*dz||1e-6;const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/L2,0,1);const px=a.x+dx*t,pz=a.z+dz*t;const d2=(x-px)*(x-px)+(z-pz)*(z-pz);if(d2<best){best=d2;bs=a.s+(b.s-a.s)*t;}}
  if(after>0&&bs>=D.len-0.01)return D.len+after;return bs;}
function makeConn(l0,l1,node,turn){const p0=l0.pos(l0.len),p3=l1.pos(0);const f0=fwd(p0.h),f1=fwd(p3.h);const d=Math.hypot(p3.x-p0.x,p3.z-p0.z);const k=d*(turn==='S'?0.33:0.42);
  const P=[];let len=0,prev=null;const N=20;for(let i=0;i<=N;i++){const t=i/N,u=1-t;const b0=u*u*u,b1=3*u*u*t,b2=3*u*t*t,b3=t*t*t;
    const x=b0*p0.x+b1*(p0.x+f0.x*k)+b2*(p3.x-f1.x*k)+b3*p3.x,z=b0*p0.z+b1*(p0.z+f0.z*k)+b2*(p3.z-f1.z*k)+b3*p3.z;if(prev)len+=Math.hypot(x-prev.x,z-prev.z);const q={x,z,s:len};P.push(q);prev=q;}
  return{pts:P,len:len||0.01,turn:turn||turnOf(p0.h,p3.h),node,from:l0,next:l1,y:node?node.y||0:p0.y,agents:[],id:NET.conns.length};}
function connAt(c,s){const P=c.pts;s=clamp(s,0,c.len);let i=1;while(i<P.length-1&&P[i].s<s)i++;const a=P[i-1],b=P[i];const t=(s-a.s)/((b.s-a.s)||1);
  return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:c.y,h:headingOf(b.x-a.x,b.z-a.z)};}
// 接続路への投影（いちばん近い点の距離sと向き）
function connProject(c,x,z){const P=c.pts;let best={s:0,d2:Infinity,h:0};for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const dx=b.x-a.x,dz=b.z-a.z;const L2=dx*dx+dz*dz||1e-6;
    const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/L2,0,1);const px=a.x+dx*t,pz=a.z+dz*t;const d2=(x-px)*(x-px)+(z-pz)*(z-pz);if(d2<best.d2)best={s:a.s+(b.s-a.s)*t,d2,h:headingOf(dx,dz)};}return best;}
function inFillet(n,x,z){for(const f of n.fil){const u=(x-f.px)*f.sx,v=(z-f.pz)*f.sz;if(u>=-0.01&&v>=-0.01&&u<=f.r&&v<=f.r&&Math.hypot(u-f.r,v-f.r)>=f.r)return true;}return false;}
function inNode(n,x,z,m=0.05){if(n.poly)return polyHas(n.poly,x,z,m)||nodeConnNear(n,x,z,2.4+m);return(Math.abs(x-n.x)<=n.hx+m&&Math.abs(z-n.z)<=n.hz+m)||inFillet(n,x,z);}
// 多角形（[[x,z],...]）の中か。m>0 なら縁から m 以内も中とみなす
function polyHas(P,x,z,m=0){let inside=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],zi=P[i][1],xj=P[j][0],zj=P[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi))inside=!inside;}
  if(inside||m<=0)return inside;for(let i=0,j=P.length-1;i<P.length;j=i++){const ax=P[j][0],az=P[j][1],bx=P[i][0],bz=P[i][1];const dx=bx-ax,dz=bz-az;const L2=dx*dx+dz*dz||1e-9;const t=clamp(((x-ax)*dx+(z-az)*dz)/L2,0,1);const px=ax+dx*t,pz=az+dz*t;if((x-px)*(x-px)+(z-pz)*(z-pz)<=m*m)return true;}return false;}

// ---------- 空間索引 ----------
function gkey(ix,iz){return ix*100003+iz;}
function gadd(x0,z0,x1,z1,e){const G=NET.GS;for(let ix=Math.floor(x0/G);ix<=Math.floor(x1/G);ix++)for(let iz=Math.floor(z0/G);iz<=Math.floor(z1/G);iz++){const k=gkey(ix,iz);let a=NET.grid.get(k);if(!a){a=[];NET.grid.set(k,a);}a.push(e);}}
function buildGrid(){NET.grid=new Map();
  for(const r of NET.roads){let lo=Infinity,hi=-Infinity;for(let s=0;s<=r.len;s+=Math.max(4,r.len/40)){const[a,b]=r.tRange(s);lo=Math.min(lo,a-(r.walk[0]||0)-2);hi=Math.max(hi,b+(r.walk[1]||0)+2);}
    r.tLoAll=lo;r.tHiAll=hi;const m=Math.max(Math.abs(lo),Math.abs(hi));
    for(let i=0;i<r.X.length-1;i++){const x0=Math.min(r.X[i],r.X[i+1])-m,x1=Math.max(r.X[i],r.X[i+1])+m,z0=Math.min(r.Z[i],r.Z[i+1])-m,z1=Math.max(r.Z[i],r.Z[i+1])+m;gadd(x0,z0,x1,z1,{k:'r',r,i});}}
  for(const n of NET.nodes){if(n.kind!=='x')continue;const m=Math.max(...n.fil.map(f=>f.r),0)+1;gadd(n.x-n.hx-m,n.z-n.hz-m,n.x+n.hx+m,n.z+n.hz+m,{k:'n',n});}
  for(const L of NET.lots){gadd(L.x0-1,L.z0-1,L.x1+1,L.z1+1,{k:'l',L});}}
// 道路の参照線への投影：s,t
function projRoad(r,i,x,z){const ax=r.X[i],az=r.Z[i],bx=r.X[i+1],bz=r.Z[i+1];const dx=bx-ax,dz=bz-az;const L2=dx*dx+dz*dz||1;let k=((x-ax)*dx+(z-az)*dz)/L2;const kc=clamp(k,0,1);
  const px=ax+dx*kc,pz=az+dz*kc;const s=r.S[i]+(r.S[i+1]-r.S[i])*kc;const P=r.at(s);const t=(x-P.x)*P.rx+(z-P.z)*P.rz;const off=Math.hypot(x-px,z-pz);return{s,t,k,dd:Math.abs(t)<off+0.01?0:off-Math.abs(t)};}
// 位置の特定
function locate(x,z,y){const G=NET.GS;const a=NET.grid.get(gkey(Math.floor(x/G),Math.floor(z/G)));if(!a)return null;
  for(const e of a)if(e.k==='n'&&inNode(e.n,x,z)&&(y===undefined||Math.abs((e.n.y||0)-y)<3))return{kind:'node',node:e.n,y:e.n.y||0};
  let best=null,bs=1e9;
  for(const e of a){if(e.k!=='r')continue;const r=e.r;const q=projRoad(r,e.i,x,z);
    // 道路の始まり・終わりより外は除く。途中の折れ目では、曲がりの外側にできるすき間（隣の区間の範囲外）も拾う
    if((q.k<-0.02&&e.i===0)||(q.k>1.02&&e.i>=r.X.length-2))continue;const kOut=Math.max(0,-q.k,q.k-1)*Math.hypot(r.X[e.i+1]-r.X[e.i],r.Z[e.i+1]-r.Z[e.i]);if(kOut>0.5)continue;
    if(q.s<-0.5||q.s>r.len+0.5)continue;const yr=r.yAt(q.s);const dy=y===undefined?0:Math.abs(yr-y);if(dy>3.5)continue;
    if(q.t<r.tLoAll-0.5||q.t>r.tHiAll+0.5)continue;
    // 道路の端（s）をこえた分・車道の外（t）の分を減点して、いちばん「中にいる」道路を選ぶ
    const sOut=Math.max(0,-q.s,q.s-r.len);const[lo,hi]=r.tRange(clamp(q.s,0,r.len));const tOut=Math.max(0,lo-q.t,q.t-hi);
    const cand={kind:'road',road:r,s:clamp(q.s,0,r.len),t:q.t,y:yr};classify(cand);const bandPen=cand.band==='lane'?0:cand.band==='shoulder'||cand.band==='median'?1.5:4;
    const score=dy*4+(Math.abs(q.t)>40?Math.abs(q.t):0)+q.dd*10+kOut*10+sOut*20+tOut*2+bandPen;if(score<bs){bs=score;best=cand;}}
  if(best&&(best.band==='lane'||best.band==='shoulder'||(best.band==='median'&&best.road.medDrivable(best.s))))return best;
  // 駐車場・車庫などの区画（道路の端の外側にあっても、区画の中なら区画を優先）
  for(const e of a)if(e.k==='l'&&lotHas(e.L,x,z)&&(y===undefined||Math.abs((e.L.y||0)-y)<3))return{kind:'lot',lot:e.L,y:e.L.y||0,band:'lot'};
  return best;}
// 開発用：locate の候補を全部返す
function locateDbg(x,z){const G=NET.GS;const a=NET.grid.get(gkey(Math.floor(x/G),Math.floor(z/G)))||[];const out=[];for(const e of a){if(e.k!=='r')continue;const r=e.r;const q=projRoad(r,e.i,x,z);
    const cand={kind:'road',road:r,s:clamp(q.s,0,r.len),t:q.t};classify(cand);out.push({id:r.id,i:e.i,k:+q.k.toFixed(3),s:+q.s.toFixed(2),t:+q.t.toFixed(2),dd:+q.dd.toFixed(3),band:cand.band});}return out;}
// 横位置の分類：lane / shoulder / median / walk / off
function classify(q){const r=q.road,s=q.s,t=q.t;q.band='off';
  for(const dir of[1,-1]){if(dir<0&&!r.nB)continue;for(const l of r.allLanes(dir)){if(s<l.s0-0.3||s>l.s1+0.3)continue;const w=l.wAt(s);if(w<0.3)continue;if(Math.abs(t-l.tAt(s))<=w/2+0.001){q.band='lane';q.lane=l;q.dir=dir;return q;}}}
  for(const[lo,hi]of r.drivableBands(s)){if(t>=lo&&t<=hi){q.band='shoulder';q.dir=t<0||!r.nB?1:-1;if(r.nB&&r.nF&&t>r.bandF()[1]&&t<r.bandB()[0])q.band='median';return q;}}
  const[lo,hi]=r.tRange(s);if(t<lo&&t>lo-(r.walk[0]||0)-0.01)q.band='walk';else if(t>hi&&t<hi+(r.walk[1]||0)+0.01)q.band='walk';else if(t>lo&&t<hi)q.band='median';return q;}
function isDrivable(x,z,y){const q=locate(x,z,y);if(!q)return false;if(q.kind==='node'||q.kind==='lot')return true;return q.band==='lane'||q.band==='shoulder'||(q.band==='median'&&q.road.medDrivable(q.s));}
// 駐車場・構内（多角形）
function lotHas(L,x,z){if(x<L.x0||x>L.x1||z<L.z0||z>L.z1)return false;let inside=false;const P=L.poly;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],zi=P[i][1],xj=P[j][0],zj=P[j][1];
    if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi))inside=!inside;}
  if(!inside)return false;for(const h of L.holes||[]){let ins=false;for(let i=0,j=h.length-1;i<h.length;j=i++){const xi=h[i][0],zi=h[i][1],xj=h[j][0],zj=h[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi))ins=!ins;}if(ins)return false;}
  return true;}
function addLot(L){L.x0=Math.min(...L.poly.map(p=>p[0]));L.x1=Math.max(...L.poly.map(p=>p[0]));L.z0=Math.min(...L.poly.map(p=>p[1]));L.z1=Math.max(...L.poly.map(p=>p[1]));NET.lots.push(L);return L;}

// ---------- 経路探索（車線グラフ） ----------
// 車線→(接続路/直結)→車線。車線変更は隣の車線へ（費用を加算）
function laneSucc(l){const out=[];for(const c of l.conns)out.push({lane:c.next,conn:c,cost:c.len});for(const n of l.next)out.push({lane:n.lane,cost:0.1});return out;}
function routeLanes(from,goal,opts={}){// from:Lane, goal: Lane or fn(l)
  const isGoal=typeof goal==='function'?goal:(l)=>l===goal;const dist=new Map([[from,0]]),prev=new Map();const q=[from];const seen=new Set();
  while(q.length){let bi=0;for(let i=1;i<q.length;i++)if(dist.get(q[i])<dist.get(q[bi]))bi=i;const u=q.splice(bi,1)[0];if(seen.has(u))continue;seen.add(u);
    if(isGoal(u)){const steps=[];let p=u;while(prev.has(p)){const e=prev.get(p);steps.unshift({lane:e.lane,conn:e.conn||null,lc:e.lc||0});p=e.from;}steps.unshift({lane:from,conn:null,lc:0});return steps;}
    const du=dist.get(u);const nb=[];for(const e of laneSucc(u))nb.push({to:e.lane,conn:e.conn,cost:e.cost+e.lane.len});
    for(const side of[-1,1]){const n=u.neighbor(side,(u.s0+u.s1)/2)||u.neighbor(side,u.dir>0?u.s1-5:u.s0+5)||u.neighbor(side,u.dir>0?u.s0+5:u.s1-5);if(n)nb.push({to:n,lc:side,cost:25});}
    for(const e of nb){const nd=du+e.cost;if(!dist.has(e.to)||nd<dist.get(e.to)){dist.set(e.to,nd);prev.set(e.to,{from:u,lane:e.to,conn:e.conn,lc:e.lc});q.push(e.to);}}}
  return null;}

