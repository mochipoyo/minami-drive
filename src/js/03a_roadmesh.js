// ===== 03a_roadmesh.js : 路面・路肩・中央分離帯・歩道・区画線・交差点 =====
let scene;const MAT={},TEX={};
const COL={asph:0x6c7076,asphRES:0x7c8085,asphEXP:0x5f6368,side:0xd9d4ca,curb:0xd5d2c8,white:0xf2f2ee,yellow:0xf0b416,blue:0x2a6fd6,grass:0x7f9a5a,dirt:0x9c8b6c,
  ballast:0x8a8378,rail:0x5b5650,sleeper:0x9a958c,panel:0xa9a59c,planter:0x6f8f4c,barrier:0xc9c7c0,concrete:0xb9b6ae,green:0x6f9f8a};
function makeMaterials(){
  TEX.asph=asphaltTex();TEX.walk=sidewalkTex();TEX.grass=grassTex();TEX.conc=concreteTex();TEX.house=houseTex();
  TEX.fac=[0,1,2,3,4].map(i=>facadeTex(i,false));TEX.facLit=[0,1,2,3,4].map(i=>facadeTex(i,true));
  const L=(o)=>new THREE.MeshLambertMaterial(Object.assign({vertexColors:true},o));
  MAT.def=L({});MAT.road=L({map:TEX.asph});MAT.walk=L({map:TEX.walk});MAT.grass=L({map:TEX.grass});MAT.conc=L({map:TEX.conc});
  MAT.mark=L({polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
  MAT.house=L({map:TEX.house});MAT.wall=L({map:TEX.fac[3]});
  for(let i=0;i<5;i++){MAT['fac'+i]=L({map:TEX.fac[i],emissiveMap:TEX.facLit[i],emissive:new THREE.Color(0,0,0)});}
  MAT.leaf=L({});MAT.glow=new THREE.MeshBasicMaterial({vertexColors:true});MAT.lamp=new THREE.MeshBasicMaterial({vertexColors:true,color:C(0x8a8a8a)});MAT.glowd=new THREE.MeshBasicMaterial({vertexColors:true});
  MAT.glass=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:0.55});
  MAT.signTex=L({transparent:true,alphaTest:0.3});// 標識（アトラス差し替え）
}
// ---- 帯の点列（道路のs区間、横位置t関数） ----
function roadEdgePts(r,s0,s1,tFn,dy=0,step=2.5){const pts=[];const n=Math.max(1,Math.ceil((s1-s0)/step));for(let i=0;i<=n;i++){const s=s0+(s1-s0)*i/n;const P=r.at(s);const t=tFn(s);pts.push({x:P.x+P.rx*t,y:P.y+dy,z:P.z+P.rz*t,s});}return pts;}
function roadStripST(B,key,r,s0,s1,tLo,tHi,color,dy=0,uv=0,step=2.5){if(s1-s0<0.05)return;const L=roadEdgePts(r,s0,s1,tLo,dy,step),Rr=roadEdgePts(r,s0,s1,tHi,dy,step);B.strip(key,L,Rr,color,uv);}
// 破線・実線（tFn: 線の中心）
function lineST(B,r,s0,s1,tFn,w,color,dash,dy=0.025){if(s1<=s0)return;const col=C(color);
  const seg=(a,b)=>roadStripST(B,'mark',r,a,b,(s)=>tFn(s)-w/2,(s)=>tFn(s)+w/2,col,dy,0,2);
  if(!dash){seg(s0,s1);return;}const[on,off]=dash;const per=on+off;let a=s0+((dash[2]||0)%per);if(a>s0+on)a-=per;for(;a<s1;a+=per){const x0=Math.max(s0,a),x1=Math.min(s1,a+on);if(x1-x0>0.3)seg(x0,x1);}}
// ---- 道路1本 ----
function buildRoadMesh(B,r){const base=r.type==='RES'?COL.asphRES:r.type==='EXP'||r.type==='RAMP'?COL.asphEXP:COL.asph;
  const step=r.len>600?4:2.5;
  const shIn=r.nB&&r.nF?r.sh[1]:r.sh[1];
  const fLo=(s)=>r._edges(1,s).outer-r.sh[0],fHi=(s)=>r._edges(1,s).inner+(r.nB?r.sh[1]:r.sh[1]);
  const bLo=(s)=>r._edges(-1,s).inner-r.sh[1],bHi=(s)=>r._edges(-1,s).outer+r.sh[0];
  const medPaint=['none','line','yellow','zebra'].includes(r.med.kind);
  // 舗装
  if(r.nF&&r.nB&&medPaint)roadStripST(B,'road',r,0,r.len,fLo,bHi,base,0,8,step);
  else{if(r.nF)roadStripST(B,'road',r,0,r.len,fLo,r.nB?fHi:(s)=>r._edges(1,s).inner+r.sh[1],base,0,8,step);if(r.nB)roadStripST(B,'road',r,0,r.len,bLo,bHi,base,0,8,step);
    // 右折レーン部分の中央（分離帯の切れ目）
    for(const p of r.patches)if(p.kind==='turnR'){const a=p.s0,b=p.s1;roadStripST(B,'road',r,a,b,(s)=>Math.min(fHi(s),bLo(s)),(s)=>Math.max(fHi(s),bLo(s)),base,0,8,step);}}
  // 中央分離帯（盛り上がり）
  if(r.nF&&r.nB&&!medPaint)buildMedian(B,r,fHi,bLo,step);
  // 歩道
  for(const side of[-1,1]){const w=r.walk[side<0?0:1];if(!w)continue;const edge=side<0?fLo:(r.nB?bHi:(s)=>r._edges(1,s).inner+r.sh[1]);
    const a=0,b=r.len;const tIn=(s)=>edge(s),tOut=(s)=>edge(s)+side*w;
    roadStripST(B,'walk',r,a,b,side<0?tOut:tIn,side<0?tIn:tOut,0xffffff,0.15,4,step);
    const curb=roadEdgePts(r,a,b,tIn,0,step);B.wall('def',curb,0.15,COL.curb,side<0?1:-1);
    const back=roadEdgePts(r,a,b,tOut,0,step);B.wall('def',back,0.15,COL.curb,side<0?-1:1);}
  buildRoadMarks(B,r,step);}
function buildMedian(B,r,fHi,bLo,step){const k=r.med.kind;const open=r.patches.filter(p=>p.kind==='turnR').map(p=>[p.s0-(p.kA?0:0),p.s1]);
  const runs=[];let cur=0;for(const[a,b]of open.sort((x,y)=>x[0]-y[0])){if(a>cur+1)runs.push([cur,a]);cur=Math.max(cur,b);}if(cur<r.len-1)runs.push([cur,r.len]);
  for(const[a,b]of runs){const lo=(s)=>fHi(s),hi=(s)=>bLo(s);
    if(k==='barrier'){// 高速道路：中央の路肩＋コンクリート壁
      roadStripST(B,'road',r,a,b,lo,hi,COL.asphEXP,0,8,step);const mid=(s)=>(lo(s)+hi(s))/2;const bw=0.6;
      roadStripST(B,'conc',r,a,b,(s)=>mid(s)-bw/2,(s)=>mid(s)+bw/2,COL.barrier,0.82,0,step);
      B.wall('conc',roadEdgePts(r,a,b,(s)=>mid(s)-bw/2,0,step),0.82,COL.barrier,-1);B.wall('conc',roadEdgePts(r,a,b,(s)=>mid(s)+bw/2,0,step),0.82,COL.barrier,1);
      // 防眩板
      for(let s=a+2;s<b-1;s+=4){const P=r.pt(s,mid(s));B.box('def',P.x,P.y+1.2,P.z,0.06,0.6,0.25,0x3f6a4e,P.h);}}
    else{const top=k==='planter'?COL.planter:COL.concrete;const hgt=k==='planter'?0.2:0.18;
      roadStripST(B,k==='planter'?'grass':'conc',r,a+0.3,b-0.3,(s)=>lo(s)+0.05,(s)=>hi(s)-0.05,top,hgt,4,step);
      B.wall('def',roadEdgePts(r,a+0.3,b-0.3,(s)=>lo(s)+0.05,0,step),hgt,COL.curb,-1);B.wall('def',roadEdgePts(r,a+0.3,b-0.3,(s)=>hi(s)-0.05,0,step),hgt,COL.curb,1);
      if(k==='planter'&&hi(a)-lo(a)>1.6){for(let s=a+6;s<b-4;s+=9){const P=r.pt(s,(lo(s)+hi(s))/2);shrub(B,P.x,P.y+hgt,P.z,0.8);if(r.med.trees&&((s/9)|0)%2===0)tree(B,P.x,P.z,0.9,P.y+hgt);}}}}}
// 区画線
function buildRoadMarks(B,r,step){const exp=r.type==='EXP'||r.type==='RAMP';const W=exp?0.2:0.15;
  const dashSep=exp?[8,12]:[5,5],dashCen=[5,5];
  const endGap=(atEnd)=>{const n=atEnd?r.endNode:r.startNode;if(!n||n.kind!=='x')return 0;return 0.3;};
  const s0=r.startNode&&r.startNode.kind==='x'?0.2:0,s1=r.endNode&&r.endNode.kind==='x'?r.len-0.2:r.len;
  // 横断歩道・踏切の区間では線を切る
  const cuts=[];for(const f of r.feats){if(f.s===undefined)continue;const hw=f.type==='rail'?9:(f.w||4)/2+0.6;cuts.push([f.s-hw,f.s+hw]);}
  for(const L of['start','end']){const n=L==='start'?r.startNode:r.endNode;const leg=L==='start'?r.startLeg:r.endLeg;if(n&&n.kind==='x'&&n.xwalk[leg]){const a=L==='start'?0:r.len-(n.xwW+1.0);cuts.push([a,a+n.xwW+1.0]);}}
  const runs=(a,b)=>{let c=a;const out=[];for(const[x,y]of cuts.sort((p,q)=>p[0]-q[0])){if(y<c||x>b)continue;if(x>c)out.push([c,x]);c=Math.max(c,y);}if(c<b)out.push([c,b]);return out;};
  const sd=(d,atS)=>{// 停止線までの距離（交差点側）
    const n=d>0?r.endNode:r.startNode;const leg=d>0?r.endLeg:r.startLeg;if(!n||n.kind!=='x')return 0;return stopEdgeDist(n,leg);};
  const stopF=r.len-sd(1),stopB=sd(-1);
  // 中央線
  if(r.nF&&r.nB&&['line','yellow','none'].includes(r.med.kind)&&r.med.w<0.3&&r.center!=='none'){
    const a=Math.max(s0,stopB),b=Math.min(s1,stopF);
    for(const[x,y]of runs(a,b)){if(r.center==='yellow')lineST(B,r,x,y,()=>0,0.15,COL.yellow);else if(r.center==='white-solid')lineST(B,r,x,y,()=>0,0.15,COL.white);else lineST(B,r,x,y,()=>0,0.15,COL.white,dashCen);}
    // 交差点の手前は実線
    if(r.center==='white'){if(r.endNode&&r.endNode.kind==='x')lineST(B,r,Math.max(a,b-30),b,()=>0,0.15,COL.white);if(r.startNode&&r.startNode.kind==='x')lineST(B,r,a,Math.min(b,a+30),()=>0,0.15,COL.white);}}
  if(r.nF&&r.nB&&r.med.w>=0.3&&!['none','line'].includes(r.med.kind)){// 分離帯の両側の線
    const fIn=(s)=>r._edges(1,s).inner,bIn=(s)=>r._edges(-1,s).inner;
    for(const[x,y]of runs(s0,s1)){lineST(B,r,x,y,(s)=>fIn(s)+(exp?0.1:0.08)+(exp?0:0),W,r.med.kind==='yellow'?COL.yellow:COL.white);lineST(B,r,x,y,(s)=>bIn(s)-(exp?0.1:0.08),W,r.med.kind==='yellow'?COL.yellow:COL.white);}
    // 導流帯（ゼブラ）：分離帯の白い斜線
    if(r.med.kind==='zebra'){const col=C(COL.white);for(const[x,y]of runs(s0+2,s1-2)){for(let s=x+1;s<y-1;s+=3.2){const lo=fIn(s)+0.3,hi=bIn(s)-0.3;if(hi-lo<0.7)continue;const lo2=fIn(s+1.2)+0.3,hi2=bIn(s+1.2)-0.3;if(hi2-lo2<0.7)continue;
          const a=r.pt(s,lo),b=r.pt(s+0.4,lo),c=r.pt(s+1.2+0.4,hi2),d=r.pt(s+1.2,hi2);const yy=(p)=>({x:p.x,y:p.y+0.026,z:p.z});B.quad4('mark',yy(a),yy(d),yy(c),yy(b),col);}}}}
  // 車線境界線（同じ方向）
  for(const dir of[1,-1]){const ls=r.lanes(dir);if(!ls.length)continue;const stopS=dir>0?stopF:stopB;
    for(let i=0;i<ls.length-1;i++){const a=ls[i],b=ls[i+1];const tm=(a.tC+b.tC)/2;
      const lineEnd=dir>0?Math.min(s1,stopS):s1,lineStart=dir>0?s0:Math.max(s0,stopS);
      const solidLen=r.sepYellow||r.sepSolid||(r.type==='ART'&&ls.length>1?30:0);
      // 区間の黄色の線（進路変更禁止）
      const ys=r.def.yellowSep||[];for(const[ya,yb]of ys){const x=Math.max(lineStart,ya),y=Math.min(lineEnd,yb);if(y>x)lineST(B,r,x,y,()=>tm,W,COL.yellow);}
      const yRuns=(a,b)=>{let c=a;const out=[];for(const[x,y]of ys.slice().sort((p,q)=>p[0]-q[0])){if(y<c||x>b)continue;if(x>c)out.push([c,x]);c=Math.max(c,y);}if(c<b)out.push([c,b]);return out;};
      for(const[x0,y0]of runs(lineStart,lineEnd))for(const[x,y]of yRuns(x0,y0)){
        if(r.sep==='yellow')lineST(B,r,x,y,()=>tm,W,COL.yellow);else if(r.sep==='solid')lineST(B,r,x,y,()=>tm,W,COL.white);
        else{// 交差点の手前は実線（黄色の場合も）
          const near=(dir>0?(r.endNode&&r.endNode.kind==='x'):(r.startNode&&r.startNode.kind==='x'))?solidLen:0;
          const dA=dir>0?x:Math.max(x,lineStart+near),dB=dir>0?Math.min(y,lineEnd-near):y;if(dB>dA)lineST(B,r,dA,dB,()=>tm,W,COL.white,dashSep);
          if(near){const sa=dir>0?Math.max(x,lineEnd-near):x,sb=dir>0?y:Math.min(y,lineStart+near);if(sb>sa)lineST(B,r,sa,sb,()=>tm,W,r.sepYellow?COL.yellow:COL.white);}}}}
    // 外側線（路肩側）
    const outer=(s)=>r._edges(dir,s).outer;const sgn=dir>0?1:-1;// 内側へずらす
    if(r.sh[0]>=0.2){for(const[x,y]of runs(s0,s1))lineST(B,r,x,y,(s)=>outer(s)+(dir>0?-W/2:W/2),W,COL.white);}
    // 一方通行の右側の外側線
    if(!r.nB&&r.sh[1]>=0.2){const inner=(s)=>r._edges(1,s).inner;for(const[x,y]of runs(s0,s1))lineST(B,r,x,y,(s)=>inner(s)+W/2,W,COL.white);}}
  // 付加車線の境界
  for(const p of r.patches){const bd=(s)=>p.base.tC+(p.side==='R'?1:-1)*p.dir*p.base.w/2;
    if(p.kind==='turnR'){const sA=p.s0,sB=p.s1;const nearJ=p.dir>0?[sB-30,sB]:[sA,sA+30];const far=p.dir>0?[sA,sB-30]:[sA+30,sB];
      const st=p.dir>0?Math.min(nearJ[1],stopF):nearJ[1];const st0=p.dir>0?nearJ[0]:Math.max(nearJ[0],stopB);
      lineST(B,r,far[0],far[1],bd,W,COL.white,[3,3]);lineST(B,r,st0,st,bd,W,COL.white);
      // 右折矢印
      if(!p.arrows)for(const d of[8,30]){const s=p.dir>0?Math.min(stopF,p.s1)-d:Math.max(stopB,p.s0)+d;if(s>p.s0+2&&s<p.s1-2)arrowMark(B,r,s,p.tC,p.dir,'R');}}
    else{lineST(B,r,p.s0,p.s1,bd,exp?0.45:0.3,COL.white,[6,6]);
      // ゼブラ（導流帯）：合流・分流の先端
      if(p.kind==='accel')zebraGore(B,r,p,p.s0-60,p.s0,'L');if(p.kind==='decel')zebraGore(B,r,p,p.s1,p.s1+60,'L');}}
  // 進行方向の矢印（進行方向別通行区分）
  for(const dir of[1,-1]){const ls=r.allLanes(dir);const stopS=dir>0?stopF:stopB;const n=dir>0?r.endNode:r.startNode;if(!n||n.kind!=='x')continue;
    for(const l of ls){if(l.kind!=='main'&&l.kind!=='turnR')continue;const set=l.arrows||(ls.length>=2&&r.type!=='RES'?defaultArrows(l,ls):null);if(!set)continue;
      if(l.kind==='turnR'&&!l.arrows)continue;
      for(const d of[9,32]){const s=dir>0?stopS-d:stopS+d;if(s<4||s>r.len-4)continue;arrowMark(B,r,s,l.tC,dir,set);}}}
  // 停止線
  for(const dir of[1,-1]){const n=dir>0?r.endNode:r.startNode;const leg=dir>0?r.endLeg:r.startLeg;if(!n||n.kind!=='x'||(dir>0?!r.nF:!r.nB))continue;
    const controlled=n.signal||n.stopLegs.includes(leg);if(!controlled)continue;const s=dir>0?stopF-0.22:stopB+0.22;
    let lo,hi;if(r.center==='none'&&r.type==='RES'){[lo,hi]=r.tRange(s);lo+=0.15;hi-=0.15;}else{const e=r._edges(dir,s);lo=Math.min(e.outer,e.inner);hi=Math.max(e.outer,e.inner);if(dir>0){lo+=0.1;}else{hi-=0.1;}}
    roadStripST(B,'mark',r,s-0.225,s+0.225,()=>lo,()=>hi,COL.white,0.026,0,1);
    if(n.stopLegs.includes(leg)){// 「止まれ」の文字
      const ln=r.lanes(dir)[0];const s2=dir>0?s-5.2:s+5.2;textMark(B,r,s2,r.type==='RES'?(dir>0?-0.9:0.9):ln.tC,dir,'tomare',r.type==='RES'?1.8:2.2,5.4);}}
  // 横断歩道（単路）・菱形
  for(const f of r.feats){if(f.s===undefined)continue;
    if(f.type==='xwalk'){zebraST(B,r,f.s,f.w||4);for(const dir of[1,-1]){if(dir>0?!r.nF:!r.nB)continue;for(const d of[30,50]){const s=f.s-dir*d;if(s<5||s>r.len-5)continue;const ln=r.lanes(dir)[0];textMark(B,r,s,ln.tC,dir,'diamond',1.3,3.2);}}}
    if(f.type==='rail'){const[lo,hi]=r.tRange(f.s);roadStripST(B,'conc',r,f.s-4.5,f.s+4.5,()=>lo,()=>hi,COL.panel,0.012,3,1);
      for(const dir of[1,-1]){if(dir>0?!r.nF:!r.nB)continue;const s=f.s-dir*8;let a,b;if(r.center==='none'){a=lo+0.2;b=hi-0.2;}else{const e=r._edges(dir,s);a=Math.min(e.outer,e.inner);b=Math.max(e.outer,e.inner);}
        roadStripST(B,'mark',r,s-0.225,s+0.225,()=>a,()=>b,COL.white,0.026,0,1);}}}
  // 交差点側の横断歩道
  for(const L of['start','end']){const n=L==='start'?r.startNode:r.endNode;const leg=L==='start'?r.startLeg:r.endLeg;if(!n||n.kind!=='x'||!n.xwalk[leg])continue;
    const c=L==='start'?0.8+n.xwW/2:r.len-0.8-n.xwW/2;const sp=xwalkSpan(n,r,c);zebraST(B,r,c,n.xwW,sp[0],sp[1]);}
  // 最高速度の路面表示（標識のある道路）
  if(r.limit&&r.len>80&&r.type!=='EXP'&&r.type!=='RAMP'&&SIGNART['m'+r.limit])for(const dir of[1,-1]){if(dir>0?!r.nF:!r.nB)continue;const s=dir>0?24:r.len-24;for(const l of r.lanes(dir))textMark(B,r,s,l.tC,dir,'m'+r.limit,Math.min(2.4,l.w*0.75),4.6);}
  // バス専用・バス優先
  for(const dir of[1,-1]){const l=r.lanes(dir)[0];if(!l||!l.bus)continue;for(let s=40;s<r.len-40;s+=90)textMark(B,r,dir>0?s:r.len-s,l.tC,dir,l.bus==='prio'?'busprioMark':'busonly',2.4,6);}
  // 自転車ナビマーク（法定外の表示：自転車が通る位置と向き）
  if(r.def.bikeNav)for(const dir of[1,-1]){const l=r.lanes(dir)[0];if(!l)continue;const t=l.tC-dir*(l.w/2-0.55);for(let s=18;s<r.len-18;s+=22){const ss=dir>0?s:r.len-s;if(r.feats.some(f=>f.s!==undefined&&Math.abs(f.s-ss)<8))continue;textMark(B,r,ss,t,dir,'bikenav',0.9,1.9);}}}
function defaultArrows(l,ls){const n=ls.filter(x=>x.kind==='main').length;const hasR=ls.some(x=>x.kind==='turnR');if(n<2)return null;
  if(l.idx===0)return'LS';if(l.idx===n-1)return hasR?'S':'SR';return'S';}
function stopEdgeDist(n,leg){return n.xwalk[leg]?(n.xwW+2.2):1.2;}
// 交差点の横断歩道：隅切り（角の丸み）の部分も車道なので、横断歩道は実際の縁石まで延ばす
function xwalkSpan(n,r,c){let[lo,hi]=r.tRange(c);if(!n)return[lo,hi];const P=r.at(c);const on=(t)=>inFillet(n,P.x+P.rx*t,P.z+P.rz*t);
  for(let k=0;k<60&&on(lo-0.25);k++)lo-=0.25;for(let k=0;k<60&&on(hi+0.25);k++)hi+=0.25;return[lo,hi];}
function zebraST(B,r,c,w,lo0,hi0){let[lo,hi]=r.tRange(c);if(lo0!==undefined){lo=lo0;hi=hi0;}const span=hi-lo-0.4;const k=Math.floor(span/0.9);const start=lo+0.2+(span-k*0.9)/2+0.225;
  for(let i=0;i<k;i++){const t=start+i*0.9;roadStripST(B,'mark',r,c-w/2,c+w/2,()=>t-0.225,()=>t+0.225,COL.white,0.027,0,w);}}
function zebraGore(B,r,p,a,b,side){a=clamp(a,0,r.len);b=clamp(b,0,r.len);if(b-a<5)return;const edge=(s)=>p.base.tC-p.dir*p.base.w/2;
  for(let s=a+2;s<b-2;s+=4){const P=r.pt(s,edge(s)-p.dir*1.2);const h=r.at(s).h+(p.dir>0?0.6:-0.6);const f=fwd(h),rt=rightV(h);const L=2.6,Wd=0.35;
    const q=(u,v)=>({x:P.x+f.x*u+rt.x*v,y:P.y+0.026,z:P.z+f.z*u+rt.z*v});B.quad4('mark',q(-L/2,-Wd/2),q(-L/2,Wd/2),q(L/2,Wd/2),q(L/2,-Wd/2),C(COL.white));}}
// 路面の矢印（set: 'L','S','R','LS','SR','LSR'）
function arrowMark(B,r,s,t,dir,set){const P=r.pt(s,t);const h=dir>0?P.h:wrapA(P.h+Math.PI);const f=fwd(h),rt=rightV(h);const col=C(COL.white);
  const at=(u,v)=>({x:P.x+f.x*u+rt.x*v,y:P.y+0.028,z:P.z+f.z*u+rt.z*v});
  const shaft=(u0,u1,v,w)=>B.quad4('mark',at(u0,v-w/2),at(u0,v+w/2),at(u1,v+w/2),at(u1,v-w/2),col);
  const head=(u,v,du,dv)=>{const nx=-dv,nv=du;B.tri('mark',at(u+du*1.2,v+dv*1.2),at(u+nx*0.45,v+nv*0.45),at(u-nx*0.45,v-nv*0.45),col);};
  shaft(-2.4,0.4,0,0.18);
  if(set.includes('S')){shaft(0.4,1.6,0,0.18);B.tri('mark',at(2.6,0),at(1.5,-0.4),at(1.5,0.4),col);}
  if(set.includes('L')){shaft(0.2,0.4,0,0.18);const v1=-0.15,v2=-1.0;B.quad4('mark',at(0.25,v2),at(0.25,v1),at(0.55,v1),at(0.55,v2),col);B.tri('mark',at(0.4,v2-0.8),at(-0.1,v2),at(0.9,v2),col);}
  if(set.includes('R')){const v1=0.15,v2=1.0;B.quad4('mark',at(0.25,v1),at(0.25,v2),at(0.55,v2),at(0.55,v1),col);B.tri('mark',at(0.4,v2+0.8),at(0.9,v2),at(-0.1,v2),col);}}
// 文字・記号の路面表示（デカール：アトラスのセル）
function textMark(B,r,s,t,dir,cell,w,l){const P=r.pt(s,t);const h=dir>0?P.h:wrapA(P.h+Math.PI);DECALS.push({x:P.x,y:P.y+0.03,z:P.z,h,w,l,cell});}
const DECALS=[];
// ---- 交差点の路面と歩道の角 ----
function buildNodeMesh(B,n){const y=n.y||0;const legs=Object.keys(n.legs);const anyRes=legs.every(L=>n.legs[L].road.type==='RES');const col=anyRes?COL.asphRES:COL.asph;
  B.poly('road',[[n.x-n.hx,n.z-n.hz],[n.x+n.hx,n.z-n.hz],[n.x+n.hx,n.z+n.hz],[n.x-n.hx,n.z+n.hz]],y,col,8);
  for(const f of n.fil){const pts=[];for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI/2;pts.push([f.px+f.sx*(f.r+f.r*Math.cos(a)),f.pz+f.sz*(f.r+f.r*Math.sin(a))]);}
    pts.push([f.px,f.pz]);B.poly('road',pts,y,col,8);}
  // 歩道の角
  for(const sx of[-1,1])for(const sz of[-1,1]){const hL=sx>0?'E':'W',vL=sz>0?'S':'N';const H=n.legs[hL],V=n.legs[vL];
    const swH=H?H.road.walk[sideOfWalk(H,sx,sz)]:0,swV=V?V.road.walk[sideOfWalk(V,sx,sz)]:0;const sw=Math.max(swH||0,swV||0);if(!sw)continue;
    const px=n.x+sx*n.hx,pz=n.z+sz*n.hz;const f=n.fil.find(q=>q.sx===sx&&q.sz===sz);
    if(f){const rr=f.r,S=rr+sw;const pts=[[px,pz+sz*S],[px,pz+sz*rr]];for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI/2;pts.push([px+sx*(rr+rr*Math.cos(a)),pz+sz*(rr+rr*Math.sin(a))]);}
      pts.push([px+sx*S,pz]);pts.push([px+sx*S,pz+sz*S]);B.poly('walk',pts,y+0.15,0xffffff,4);
      const arc=[];for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI/2;arc.push({x:px+sx*(rr+rr*Math.cos(a)),y,z:pz+sz*(rr+rr*Math.sin(a))});}
      // 縁石の向き：交差点側へ
      B.wall('def',arc,0.15,COL.curb,(sx*sz)>0?-1:1);}
    else if(!H&&!V){}
    else{// 片側の脚がない：歩道をまっすぐつなぐ
      const x0=Math.min(px,px+sx*sw),x1=Math.max(px,px+sx*sw),z0=Math.min(pz,pz+sz*sw),z1=Math.max(pz,pz+sz*sw);B.poly('walk',[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],y+0.15,0xffffff,4);}}
  // 脚のない辺：歩道を横切らせる
  for(const L of['N','S','E','W']){if(n.legs[L])continue;const other=L==='N'||L==='S'?['E','W']:['N','S'];const sw=Math.max(...other.map(o=>n.legs[o]?n.legs[o].road.walk[0]:0));if(!sw)continue;
    if(L==='N'||L==='S'){const sz=L==='S'?1:-1;const z0=n.z+sz*n.hz,z1=z0+sz*sw;B.poly('walk',[[n.x-n.hx,Math.min(z0,z1)],[n.x+n.hx,Math.min(z0,z1)],[n.x+n.hx,Math.max(z0,z1)],[n.x-n.hx,Math.max(z0,z1)]],y+0.15,0xffffff,4);
      B.wall('def',[{x:n.x-n.hx,y,z:z0},{x:n.x+n.hx,y,z:z0}],0.15,COL.curb,sz>0?-1:1);}
    else{const sx=L==='E'?1:-1;const x0=n.x+sx*n.hx,x1=x0+sx*sw;B.poly('walk',[[Math.min(x0,x1),n.z-n.hz],[Math.max(x0,x1),n.z-n.hz],[Math.max(x0,x1),n.z+n.hz],[Math.min(x0,x1),n.z+n.hz]],y+0.15,0xffffff,4);
      B.wall('def',[{x:x0,y,z:n.z-n.hz},{x:x0,y,z:n.z+n.hz}],0.15,COL.curb,sx>0?1:-1);}}}
// 交差点の角で、その脚の道路のどちら側（walk[0]:t<0側 / walk[1]:t>0側）が角に面しているか
function sideOfWalk(e,sx,sz){const r=e.road;const P=e.end==='start'?r.at(0):r.at(r.len);const cx=P.x+P.rx,cz=P.z+P.rz;// t=+1の点
  const toward=(cx-P.x)*sx+(cz-P.z)*sz;return toward>0?1:0;}
function shrub(B,x,y,z,s=1){const col=pick([0x4f7d3c,0x5a8a42,0x3f6d34]);B.sphL('leaf',x,y+0.45*s,z,0.9*s,0.55*s,0.9*s,col);}
function tree(B,x,z,s=1,y0=0){B.cyl('def',x,y0+1.4*s,z,0.15*s,2.8*s,0x6b4f3a,6);
  const col=pick([0x4f7d3c,0x5a8a42,0x3f6d34,0x6b9443,0x527f3d]);B.sphL('leaf',x,y0+3.9*s,z,2.1*s,1.9*s,2.1*s,col);B.sphL('leaf',x+0.6*s,y0+4.7*s,z-0.3*s,1.5*s,1.3*s,1.5*s,col);B.sphL('leaf',x-0.5*s,y0+4.4*s,z+0.5*s,1.3*s,1.2*s,1.3*s,col);}
function buildAllRoads(B){for(const r of NET.roads){if(r.type==='LOT')continue;buildRoadMesh(B,r);}for(const n of NET.nodes)if(n.kind==='x')buildNodeMesh(B,n);}

