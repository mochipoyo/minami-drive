// ===== 03d_exp.js : 高速道路の沿道（ガードレール・のり面・トンネル・橋・料金所・案内標識・景色） =====
// ---- 案内標識（文字入りの板）：TEXTSIGNS に spec を入れる ----
// spec:{bg,fg,border,lines:[{t,size,color,y,font,align}],w:px,h:px}
function guideTex(spec){const k=JSON.stringify(spec);let tx=TEXTCACHE.get(k);if(tx)return tx;const W=spec.pw||512,H=spec.ph||256;const c=cvs(W,H),x=c.getContext('2d');
  x.fillStyle=spec.bg||'#1d7a4f';x.fillRect(0,0,W,H);if(spec.bg2){x.fillStyle=spec.bg2;x.fillRect(W/2,0,W/2,H);}
  const bw=spec.bw===undefined?Math.round(H*0.035):spec.bw;if(bw){x.strokeStyle=spec.border||'#ffffff';x.lineWidth=bw;const m=bw*1.4;x.beginPath();x.roundRect?x.roundRect(m,m,W-2*m,H-2*m,bw*2):x.rect(m,m,W-2*m,H-2*m);x.stroke();}
  for(const L of spec.lines||[]){const sz=L.size*H;txtFit(x,L.t,(L.x!==undefined?L.x:0.5)*W,L.y*H,sz,W*(L.maxW||0.86),L.color||spec.fg||'#ffffff',L.font||FONT_JP,L.align||'center',L.weight||'bold');}
  if(spec.dir3)drawDir3(x,W,H,spec.dir3,spec.fg||'#ffffff');
  if(spec.lanes)drawLaneArrows(x,W,H,spec.lanes,spec.fg||'#ffffff');
  if(spec.arrow){// 下向き・右上などの矢印
    const a=spec.arrow;x.fillStyle=spec.fg||'#fff';x.save();x.translate(a.x*W,a.y*H);x.rotate(a.rot||0);const s=a.s*H;x.beginPath();x.moveTo(0,s*0.6);x.lineTo(-s*0.45,0);x.lineTo(-s*0.16,0);x.lineTo(-s*0.16,-s*0.6);x.lineTo(s*0.16,-s*0.6);x.lineTo(s*0.16,0);x.lineTo(s*0.45,0);x.closePath();x.fill();x.restore();}
  tx=texFrom(c);TEXTCACHE.set(k,tx);return tx;}
// 方面及び方向の予告（青い案内標識）：直進・左・右の行き先
function drawDir3(x,W,H,d,fg){x.strokeStyle=fg;x.fillStyle=fg;const cx=W/2,by=H*0.94,my=H*0.62;const lw=H*0.075,hd=H*0.09;
  arrowPath(x,d.S?[[cx,by],[cx,H*0.36]]:[[cx,by],[cx,my+lw/2]],lw,d.S?hd:0.01);
  if(d.L)arrowPath(x,[[cx,my],[W*0.15,my]],lw,hd);if(d.R)arrowPath(x,[[cx,my],[W*0.85,my]],lw,hd);
  const put=(t,px,py,al)=>{if(!t)return;txtFit(x,t[1],px,py,H*0.13,W*0.36,fg,FONT_JP,al||'center','bold');txtFit(x,t[0],px,py+H*0.12,H*0.075,W*0.36,fg,FONT_JP,al||'center','bold');};
  put(d.S,cx,H*0.12);put(d.L,W*0.2,H*0.3);put(d.R,W*0.8,H*0.3);}
// 進行方向別通行区分（車線ごとの矢印）
function drawLaneArrows(x,W,H,lanes,fg){const n=lanes.length;const cw=W/n;x.strokeStyle=fg;x.fillStyle=fg;
  for(let i=1;i<n;i++){x.fillRect(i*cw-2,H*0.12,4,H*0.76);}
  lanes.forEach((a,i)=>{const cx=cw*(i+0.5),b=H*0.86,lw=Math.min(cw*0.11,H*0.07),hd=Math.min(cw*0.15,H*0.1);
    if(a.includes('S'))arrowPath(x,[[cx,b],[cx,H*0.16]],lw,hd);
    if(a.includes('L'))arrowPath(x,[[cx,b],[cx,H*0.5],[cx-cw*0.34,H*0.5]],lw,hd);
    if(a.includes('R'))arrowPath(x,[[cx,b],[cx,H*0.5],[cx+cw*0.34,H*0.5]],lw,hd);});}
const GSIGN={green:'#1f7a52',blue:'#1d4f9c',purple:'#6a2c91',white:'#f6f6f2',orange:'#e2701c'};
// 道路の横に案内板（柱1本または2本）
// 文字の板（TEXTSIGNS）は h＝その板を見る車の向き。裏板（B.quad）は h＝その逆向きの人から見える
function guideBoard(B,r,s,t,dir,w,hh,spec,opt={}){const P=r.pt(s,t);const hv=dir>0?P.h:P.h+Math.PI;const y0=P.y+(opt.lift||0);const top=opt.top||(hh/2+2.2);
  TEXTSIGNS.push({x:P.x,y:y0+top,z:P.z,h:hv,w,hh,spec});const f=fwd(hv);B.quad('def',P.x+f.x*0.04,y0+top,P.z+f.z*0.04,w*0.99,hh*0.99,hv,0,0,0,0,0x8d9298);
  const rt=rightV(hv);const legs=opt.legs||(w>2.2?2:1);for(let i=0;i<legs;i++){const off=legs===1?0:(i?1:-1)*w*0.32;B.cyl('def',P.x+rt.x*off+f.x*0.12,y0+(top-hh/2+0.3)/2,P.z+rt.z*off+f.z*0.12,0.07,top-hh/2+0.3,0x9aa0a6,6);}}
// 門形の標識柱（道路の上に渡す）
function gantry(B,r,s,dir,boards){const[lo,hi]=dir>0?[r._edges(1,s).outer-r.sh[0]-0.8,r.nB?(r._edges(1,s).inner+r._edges(-1,s).inner)/2:r._edges(1,s).inner+r.sh[1]+0.8]:[r._edges(-1,s).outer+r.sh[0]+0.8,(r._edges(1,s).inner+r._edges(-1,s).inner)/2];
  const A=r.pt(s,lo),Bp=r.pt(s,hi);const y=Math.max(A.y,Bp.y);const H=7.2;B.cyl('def',A.x,A.y+H/2,A.z,0.22,H,0x9aa0a6,8);B.cyl('def',Bp.x,Bp.y+H/2,Bp.z,0.22,H,0x9aa0a6,8);
  B.bar('def',A.x,y+H-0.2,A.z,Bp.x,y+H-0.2,Bp.z,0.3,0.3,0x9aa0a6);B.bar('def',A.x,y+H-1.0,A.z,Bp.x,y+H-1.0,Bp.z,0.18,0.18,0x9aa0a6);
  const hv=dir>0?r.at(s).h:r.at(s).h+Math.PI;for(const b of boards){const P=r.pt(s,b.t);TEXTSIGNS.push({x:P.x,y:y+H-0.6,z:P.z,h:hv,w:b.w,hh:b.hh,spec:b.spec});const f=fwd(hv);B.quad('def',P.x+f.x*0.05,y+H-0.6,P.z+f.z*0.05,b.w,b.hh,hv,0,0,0,0,0x8d9298);}}
// ---- 区間の判定 ----
function inRanges(list,s,m=0){return list.some(q=>s>=q.s0-m&&s<=q.s1+m);}
// ---- 高速道路・ランプの沿道 ----
function buildExpRoadside(B){for(const r of NET.roads){if(r.type!=='EXP'&&r.type!=='RAMP')continue;
    const T=r.tunnels,Bg=r.bridges;const sides=[];if(r.nF)sides.push(1);if(r.nB)sides.push(-1);
    // 外側の縁（路肩の外）
    const outer=(dir,s)=>dir>0?r._edges(1,s).outer-r.sh[0]:r._edges(-1,s).outer+r.sh[0];
    const sideList=r.nB?[[1,-1],[-1,1]]:[[1,-1],[1,1]];// [dir, 外向きの符号(t)]
    for(const[dir,sg]of sideList){
      const tEdge=(s)=>{if(!r.nB&&sg>0)return r._edges(1,s).inner+r.sh[1];return outer(dir,s);};
      // ガードレール（橋・トンネル以外）
      const step=4;let run=[];const flush=()=>{if(run.length>1){for(let i=0;i<run.length-1;i++){const a=run[i],b=run[i+1];B.bar('def',a.x,a.y+0.72,a.z,b.x,b.y+0.72,b.z,0.05,0.3,0xd9dddd);}}run=[];};
      for(let s=2;s<r.len-1;s+=step){if(inRanges(T,s,-1)||inRanges(Bg,s,2)){flush();continue;}const P=r.pt(s,tEdge(s)+sg*0.45);B.box('def',P.x,P.y+0.45,P.z,0.12,0.9,0.12,0xb8bdbd);run.push(P);
        if(((s/step)|0)%10===0)B.box('glowd',P.x,P.y+0.98,P.z,0.1,0.12,0.06,0xf0f0f0,-P.h);}// 視線誘導標
      flush();
      // のり面（盛土・切土）：道路の高さから地面へ
      const segs=[];let a0=null;for(let s=0;s<=r.len;s+=8){const ok=!inRanges(T,s,-2)&&!inRanges(Bg,s,-4);if(ok&&a0===null)a0=s;if((!ok||s+8>r.len)&&a0!==null){segs.push([a0,Math.min(r.len,s)]);a0=null;}}
      for(const[a,b]of segs){if(b-a<2)continue;const n=Math.max(1,Math.ceil((b-a)/8));const L=[],Rr=[];
        for(let i=0;i<=n;i++){const s=a+(b-a)*i/n;const y=r.yAt(s);const t0=tEdge(s)+sg*0.9;const P0=r.pt(s,t0);const w=Math.max(1.5,Math.abs(y)*1.8+1);const P1=r.pt(s,t0+sg*w);
          const yb=y>0?-0.05:y<0?0:-0.05;L.push({x:P0.x,y:y-0.02,z:P0.z});Rr.push({x:P1.x,y:Math.min(yb,y),z:P1.z});if(y<-0.3){Rr[Rr.length-1].y=0.2;}}
        if(sg<0)B.strip('grass',Rr,L,0x86a060,6);else B.strip('grass',L,Rr,0x86a060,6);
        // 路肩の外の小段（草）
        const L2=[],R2=[];for(let i=0;i<=n;i++){const s=a+(b-a)*i/n;const P0=r.pt(s,tEdge(s)),P1=r.pt(s,tEdge(s)+sg*0.9);L2.push({x:P0.x,y:P0.y,z:P0.z});R2.push({x:P1.x,y:P1.y-0.02,z:P1.z});}
        if(sg<0)B.strip('grass',R2,L2,0x8aa266,4);else B.strip('grass',L2,R2,0x8aa266,4);}}
    // 中央分離帯の下（盛土の上の道路の隙間をふさぐ）は分離帯で隠れている
    // 橋
    for(const q of Bg)buildBridge(B,r,q);
    // トンネル
    for(const q of T)buildTunnel(B,r,q);}}
// ---- 橋：高欄・桁・橋脚 ----
function buildBridge(B,r,q){const a=q.s0,b=q.s1;const lo=(s)=>r._edges(1,s).outer-r.sh[0]-0.5,hi=(s)=>r.nB?r._edges(-1,s).outer+r.sh[0]+0.5:r._edges(1,s).inner+r.sh[1]+0.5;
  // 高欄（コンクリートの壁）
  for(const[tf,sd]of[[lo,-1],[hi,1]]){const pts=roadEdgePts(r,a-2,b+2,tf,0,4);B.wall('conc',pts,1.05,0xd6d3cb,sd);const in2=roadEdgePts(r,a-2,b+2,(s)=>tf(s)-sd*0.35,0,4);B.wall('conc',in2,1.05,0xd6d3cb,-sd);
    roadStripST(B,'conc',r,a-2,b+2,(s)=>Math.min(tf(s),tf(s)-sd*0.35),(s)=>Math.max(tf(s),tf(s)-sd*0.35),0xdedbd3,1.05,0,4);}
  // 床版の下面と側面
  const yOff=-1.9;roadStripST(B,'conc',r,a,b,hi,lo,0xa9a69f,yOff,0,6);
  for(const[tf,sd]of[[lo,-1],[hi,1]]){const pts=roadEdgePts(r,a,b,tf,yOff,6);B.wall('conc',pts,1.9,0xbdbab2,sd);}
  // 橋脚（地面まで）
  for(let s=a+30;s<b-15;s+=40){const P=r.pt(s,(lo(s)+hi(s))/2);const top=P.y+yOff;const bot=-2.5;const h=top-bot;const rt=rightV(r.at(s).h);
    for(const off of[-6,6]){B.box('conc',P.x+rt.x*off,bot+h/2,P.z+rt.z*off,2.2,h,2.2,0xc2bfb7,r.at(s).h);}B.box('conc',P.x,top-0.6,P.z,(hi(s)-lo(s))*0.9,1.2,2.6,0xb7b4ac,r.at(s).h+Math.PI/2);}}
// ---- トンネル：上下線別の2本の筒・照明・坑口・山 ----
function buildTunnel(B,r,q){const a=q.s0,b=q.s1;const H=5.0,top=7.4;const midT=(s)=>(r._edges(1,s).inner+r._edges(-1,s).inner)/2;
  const tubes=[[(s)=>r._edges(1,s).outer-r.sh[0]-0.6,(s)=>midT(s)-0.6],[(s)=>midT(s)+0.6,(s)=>r._edges(-1,s).outer+r.sh[0]+0.6]];
  for(const[L,Rt]of tubes){// 壁（下は白いパネル）・天井
    B.wall('conc',roadEdgePts(r,a,b,L,0,6),H,0xdcd9cf,1);B.wall('conc',roadEdgePts(r,a,b,Rt,0,6),H,0xdcd9cf,-1);
    const c1=(s)=>L(s)+1.6,c2=(s)=>Rt(s)-1.6,cm=(s)=>(L(s)+Rt(s))/2;
    const strip=(ta,ya,tb,yb,col)=>{const A=roadEdgePts(r,a,b,ta,ya,6),Bq=roadEdgePts(r,a,b,tb,yb,6);B.strip('conc',Bq,A,col,0);};
    strip(L,H,c1,H+1.6,0x6d6f70);strip(c1,H+1.6,cm,top,0x5f6163);strip(cm,top,c2,H+1.6,0x5f6163);strip(c2,H+1.6,Rt,H,0x6d6f70);
    // 照明（両側の壁の上、6mおき）・非常口（緑）・非常電話（200mおき）
    for(let s=a+3;s<b-2;s+=6){for(const tf of[(s)=>L(s)+0.5,(s)=>Rt(s)-0.5]){const P=r.pt(s,tf(s));B.box('glow',P.x,P.y+H+0.35,P.z,0.35,0.12,1.6,0xffe2b0,-r.at(s).h);}}
    for(let s=a+25;s<b-10;s+=50){const P=r.pt(s,L(s)+0.05);B.box('glow',P.x,P.y+2.4,P.z,0.05,0.3,0.6,0x2fbf6a,-r.at(s).h);}}
  // 坑口（コンクリートの面）
  for(const[s0,d]of[[a,-1],[b,1]]){const P=r.at(s0);const Lw=r._edges(1,s0).outer-r.sh[0]-6,Rw=r._edges(-1,s0).outer+r.sh[0]+6;const faceH=15;
    const pt=(t,y)=>{const Q=r.pt(s0,t);return{x:Q.x,y:Q.y+y,z:Q.z};};
    const q4=(t0,y0,t1,y1)=>{B.quad4('conc',pt(t0,y0),pt(t1,y0),pt(t1,y1),pt(t0,y1),C(0xbdbab0));B.quad4('conc',pt(t1,y0),pt(t0,y0),pt(t0,y1),pt(t1,y1),C(0xbdbab0));};
    // 開口の外側の壁と上部
    q4(Lw,0,tubes[0][0](s0),faceH);q4(tubes[0][1](s0),0,tubes[1][0](s0),faceH);q4(tubes[1][1](s0),0,Rw,faceH);
    for(const[L,Rt]of tubes){const l=L(s0),rr=Rt(s0),m=(l+rr)/2;B.quad4('conc',pt(l,H),pt(l+1.6,H+1.6),pt(l+1.6,faceH),pt(l,faceH),C(0xbdbab0));B.quad4('conc',pt(l+1.6,H+1.6),pt(m,top),pt(m,faceH),pt(l+1.6,faceH),C(0xbdbab0));
      B.quad4('conc',pt(m,top),pt(rr-1.6,H+1.6),pt(rr-1.6,faceH),pt(m,faceH),C(0xbdbab0));B.quad4('conc',pt(rr-1.6,H+1.6),pt(rr,H),pt(rr,faceH),pt(rr-1.6,faceH),C(0xbdbab0));}
    // 坑口の銘板
    const hd=r.at(s0).h;const tN=(tubes[0][0](s0)+tubes[0][1](s0))/2;const Pn=r.pt(s0+(d<0?-0.3:0.3),tN);
    if(d<0)TEXTSIGNS.push({x:Pn.x,y:Pn.y+top+1.6,z:Pn.z,h:hd,w:4.6,hh:0.9,spec:{bg:'#3b3f42',fg:'#ffffff',bw:0,lines:[{t:q.name+'　L='+Math.round(b-a)+'m',size:0.5,y:0.52}]}});}
  buildMountain(B,r,a,b);}
function buildMountain(B,r,a,b){const S0=a-140,S1=b+140,ds=20,tMax=230,dt=12;const NS=Math.ceil((S1-S0)/ds),NT=Math.ceil(2*tMax/dt);const H=(s,t)=>{const y=r.yAt(clamp(s,0,r.len));
    const k=s<a?clamp((s-S0)/(a-S0),0,1):s>b?clamp((S1-s)/(S1-b),0,1):1;const ridge=(s>=a&&s<=b)?(16+30*Math.sin(Math.PI*(s-a)/(b-a))):16*k;const fall=Math.exp(-Math.pow(t/150,2));
    let h=y+ridge*fall+(k<1?0:0);const road=Math.abs(t)<16;if(road&&(s<a-0.5||s>b+0.5))h=Math.min(h,y-0.6+Math.max(0,Math.abs(t)-14)*1.2);if(!road&&(s<a||s>b)){const cut=y+(Math.abs(t)-14)*0.9;h=Math.min(h,Math.max(cut,0));}
    return Math.max(h,0);};
  const grid=[];for(let i=0;i<=NS;i++){const s=S0+i*ds;const row=[];for(let j=0;j<=NT;j++){const t=-tMax+j*dt;const P=r.pt(clamp(s,0,r.len),t);const e=r.at(clamp(s,0,r.len));const ex=s-clamp(s,0,r.len);row.push({x:P.x+fwd(e.h).x*ex,y:H(s,t),z:P.z+fwd(e.h).z*ex});}grid.push(row);}
  for(let i=0;i<NS;i++)for(let j=0;j<NT;j++){const p=grid[i][j],q=grid[i+1][j],u=grid[i+1][j+1],v=grid[i][j+1];const yy=(p.y+q.y+u.y+v.y)/4;if(yy<0.3)continue;
    const sA=S0+i*ds,sB=sA+ds,tA=-tMax+j*dt,tB=tA+dt;if(Math.max(Math.abs(tA),Math.abs(tB))<=18&&(sB<=a+0.1||sA>=b-0.1))continue;// 坑口の前は切り開く
    const col=yy>12?0x4d6b3f:yy>5?0x5d7a45:0x7a9358;B.quad4('grass',p,v,u,q,C(col));}
  // 木（山の上）
  const rr=rng(91);for(let k=0;k<70;k++){const s=a+rr()*(b-a),t=(rr()<0.5?-1:1)*(20+rr()*170);const y=H(s,t);if(y<6)continue;const P=r.pt(s,t);B.cone('leaf',P.x,y+3,P.z,2.2+rr()*1.2,7+rr()*4,pick([0x2f5a35,0x3a6a3c,0x2c4f30],rr));}}
// ---- 料金所 ----
const TOLL={bars:[]};
function buildTollPlaza(B,r){const s=r.def.tollAt;if(s===undefined)return;const io=(r.feats.find(f=>f.type==='toll')||{}).io||'in';const main=r.lanesF[0];const pL=r.patches.find(p=>p.kind==='toll'&&p.side==='L'),pR=r.patches.find(p=>p.kind==='toll'&&p.side==='R');
  const lanes=[{l:pL,type:io==='in'?'一般':'ETC/一般'},{l:main,type:'ETC'},{l:pR,type:io==='in'?'ETC/一般':'一般'}];
  const hd=r.at(s).h;const isl=[];// 島（車線の間）
  const edgeL=main.tC-main.w/2,edgeR=main.tC+main.w/2;const tIslL=(edgeL+(pL.tC+pL.w/2))/2,tIslR=(edgeR+(pR.tC-pR.w/2))/2;
  const outL=pL.tC-pL.w/2-0.9,outR=pR.tC+pR.w/2+0.9;
  for(const t of[outL,tIslL,tIslR,outR]){const P=r.pt(s-2,t);const len=26;B.box('conc',P.x,P.y+0.13,P.z,1.3,0.26,len,0xcfccc4,-hd);
    // 先端の黄黒（衝突緩衝）
    const N=r.pt(s-2-len/2-0.6,t);B.box('def',N.x,N.y+0.5,N.z,1.0,1.0,1.2,0xf2c21b,-hd);B.box('def',N.x,N.y+0.5,N.z,1.02,0.25,1.22,0x222222,-hd);
    // 料金所のブース
    const Q=r.pt(s-3,t);if(t!==outL&&t!==outR)B.box('wall',Q.x,Q.y+1.55,Q.z,1.15,2.6,2.4,0xe9e7e0,-hd);
    isl.push({t,P});NET.obst.push({x:P.x,z:P.z,h:hd,L:len+1.2,W:1.3,solid:true,toll:true,static:true});}
  // 屋根
  const A=r.pt(s-3,outL-1.2),Bq=r.pt(s-3,outR+1.2);const mid={x:(A.x+Bq.x)/2,z:(A.z+Bq.z)/2};const wdt=Math.hypot(Bq.x-A.x,Bq.z-A.z);const yR=r.yAt(s)+5.6;
  B.box('def',mid.x,yR,mid.z,wdt,0.5,15,0xf2f2ee,-hd);// 屋根板（向き：道路方向に15m）
  for(const q of isl){B.cyl('def',q.P.x,r.yAt(s)+2.8,q.P.z,0.22,5.6,0xb0b4b6,8);}
  // 車線ごとの表示板（屋根の前面）とバー
  const front=s-3-7.6;for(const L of lanes){const t=L.l.tC;const P=r.pt(front,t);const etc=L.type!=='一般';
    const spec=L.type==='ETC'?{bg:GSIGN.purple,lines:[{t:'ETC',size:0.42,y:0.36,font:FONT_DISP},{t:'専用',size:0.3,y:0.76}]}:L.type==='ETC/一般'?{bg:GSIGN.purple,bg2:GSIGN.green,lines:[{t:'ETC',size:0.36,y:0.5,x:0.26,maxW:0.42,font:FONT_DISP},{t:'一般',size:0.36,y:0.5,x:0.74,maxW:0.42}]}:{bg:GSIGN.green,lines:[{t:'一般',size:0.46,y:0.52}]};
    TEXTSIGNS.push({x:P.x,y:yR-0.9,z:P.z,h:hd,w:2.6,hh:1.3,spec});
    // 開閉バー（左の島から）
    const tb=t-L.l.w/2-0.15;const Pb=r.pt(s+3,tb);TOLL.bars.push({x:Pb.x,y:Pb.y+0.95,z:Pb.z,h:hd,len:L.l.w-0.3,type:L.type,road:r,s:s+3,t,open:0,want:0,stopT:0,hitDone:false,lane:L.l});
    if(etc)(NET.map.etc||(NET.map.etc=[])).push({id:r.id+':'+L.type+':'+t.toFixed(1),x:Pb.x+rightV(hd).x*(L.l.w/2),z:Pb.z+rightV(hd).z*(L.l.w/2),r:9});}
  // 手前の案内（NEXCOの案内：ETCレーンは20km/h以下）
  const sA=s-150;guideBoard(B,r,sA,r._edges(1,sA).outer-r.sh[0]-0.8,1,3.0,1.5,{bg:GSIGN.purple,lines:[{t:'ETC',size:0.34,y:0.3,font:FONT_DISP},{t:'20km/h以下に減速',size:0.22,y:0.72}]});
  const sB=s-240;if(sB>10)guideBoard(B,r,sB,r._edges(1,sB).outer-r.sh[0]-0.8,1,3.4,1.6,{bg:GSIGN.green,lines:[{t:'料金所',size:0.36,y:0.36},{t:'この先 '+Math.round(s-sB)+'m',size:0.24,y:0.74}]});}
function initTollBars(){for(const b of TOLL.bars){const g=new THREE.Group();g.position.set(b.x,b.y,b.z);g.rotation.y=-b.h;
    const arm=new THREE.Group();g.add(arm);const c=cvs(256,16),x=c.getContext('2d');for(let i=0;i<8;i++){x.fillStyle=i%2?'#1c1c1c':'#f2c21b';x.fillRect(i*32,0,32,16);}
    const m=new THREE.Mesh(new THREE.BoxGeometry(b.len,0.09,0.06),new THREE.MeshLambertMaterial({map:texFrom(c)}));m.position.x=b.len/2;arm.add(m);
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.3,1.0,0.3),lambert(0x8e9498));post.position.y=-0.45;g.add(post);
    g.userData.mapOwned=true;m.userData.ownMat=true;scene.add(g);b.g=g;b.arm=arm;}}
function updateTollBars(dt){const p=PLAYER;for(const b of TOLL.bars){if(!b.g)continue;let want=0;const f=fwd(b.h),rt=rightV(b.h);
    const near=(o)=>{const dx=o.x-b.x,dz=o.z-b.z;const along=dx*f.x+dz*f.z,lat=dx*rt.x+dz*rt.z;return along>-14&&along<3&&lat>-0.5&&lat<b.len+0.5;};
    for(const o of VEH){if(!o.hidden&&near(o)){want=1;break;}}
    if(p&&STAGE.running&&near(p)){const kmh=Math.abs(p.v)*KMH;const dx=p.x-b.x,dz=p.z-b.z;const along=dx*f.x+dz*f.z;
      if(b.type==='一般'){if(Math.abs(p.v)<0.2&&along>-9)b.stopT+=dt;if(b.stopT>1.6)want=1;}else{if(kmh<=40||b.open>0.5)want=1;}
      // 開いていないバーに当たった
      if(b.open<0.3&&along>-(p.L/2+0.2)&&along<1&&!b.hitDone){b.hitDone=true;if(STAGE.scoring)violate('etcBar','',30);}}
    else{b.stopT=0;if(b.open<0.05)b.hitDone=false;}
    b.open+=((want?1:0)-b.open)*Math.min(1,dt*(want?3.2:1.4));b.arm.rotation.z=b.open*1.35;}}
// ---- 景色：田んぼ・集落・山並み ----
function buildExpScenery(B,opt){const r=NET.byId.E1;const R1=rng(17);const corridor=36;
  const blocked=(x,z)=>{for(const k of opt.keepOut||[])if(x>k.x0&&x<k.x1&&z>k.z0&&z<k.z1)return true;const q=nearestRoadDist(x,z);return q<corridor;};
  // 田んぼ（10月：刈り取りの前後）
  for(let s=40;s<r.len-40;s+=44){const P=r.at(s);for(const sg of[-1,1]){for(let k=0;k<5;k++){const t=sg*(48+k*34+R1()*6);const Q=r.pt(s,t);if(blocked(Q.x,Q.z)||inRanges(r.tunnels,s,180)||inRanges(r.bridges,s,60))continue;
        const col=pick([0xc8a64a,0xbf9f45,0xa98d58,0x9c8a5e,0x8fa152,0xc4a54e],R1);const w=30,d=40;const f=fwd(P.h),rt=rightV(P.h);
        const c=(u,v)=>({x:Q.x+f.x*u+rt.x*v,y:0.04,z:Q.z+f.z*u+rt.z*v});B.quad4('grass',c(-d/2,-w/2),c(-d/2,w/2),c(d/2,w/2),c(d/2,-w/2),C(col));}}}
  // 集落（屋敷林のある家）
  for(const[s,sg]of[[300,1],[1000,-1],[1650,1],[3000,-1],[3300,1],[4200,-1],[4500,1]]){const P=r.pt(s,sg*150);for(let k=0;k<7;k++){const x=P.x+(R1()-0.5)*110,z=P.z+(R1()-0.5)*80;if(blocked(x,z))continue;
      addBuilding(B,R1()<0.8?'house':'apt',x,z,9+R1()*4,8+R1()*4,pick([0,Math.PI/2,Math.PI,-Math.PI/2],R1));if(R1()<0.7)tree(B,x+8,z+6,1.1+R1()*0.5);}}
  // 防音壁（集落の近く）
  for(const[s0,s1,sg]of[[250,420,1],[3240,3420,1],[4120,4300,-1]]){const tf=(s)=>sg>0?r._edges(-1,s).outer+r.sh[0]+1.4:r._edges(1,s).outer-r.sh[0]-1.4;const pts=roadEdgePts(r,s0,s1,tf,0,5);
    B.wall('wall',pts,3.6,0xc8ccc8,sg);B.wall('wall',pts,3.6,0xc8ccc8,-sg);for(const p of pts)B.box('def',p.x,p.y+1.9,p.z,0.18,3.8,0.18,0x8a9094);}
  // 遠くの山並み（道路の両側）
  for(let s=0;s<r.len;s+=260){for(const sg of[-1,1]){const P=r.pt(s,sg*(900+R1()*500));const h=60+R1()*160,w=320+R1()*260;B.addGeo('hill',GEO.cone,new THREE.Matrix4().compose(new V3(P.x,h/2-6,P.z),new THREE.Quaternion(),new V3(w,h,w*0.8)),pick([0x5f7d5c,0x6a8667,0x58745a],R1));}}
  // 川（橋の下）
  for(const q of r.bridges){const s=(q.s0+q.s1)/2;const P=r.at(s);const f=fwd(P.h),rt=rightV(P.h);const W=55,Lr=2600;
    const c=(u,v,y)=>({x:P.x+f.x*u+rt.x*v,y,z:P.z+f.z*u+rt.z*v});B.quad4('def',c(-W/2,-Lr/2,-1.2),c(-W/2,Lr/2,-1.2),c(W/2,Lr/2,-1.2),c(W/2,-Lr/2,-1.2),C(0x4f7d91));
    for(const sd of[-1,1]){const A=c(sd*W/2,-Lr/2,-1.2),Bb=c(sd*W/2,Lr/2,-1.2),Cc=c(sd*(W/2+14),Lr/2,0.3),D=c(sd*(W/2+14),-Lr/2,0.3);if(sd>0)B.quad4('grass',A,Bb,Cc,D,C(0x8aa064));else B.quad4('grass',A,D,Cc,Bb,C(0x8aa064));}}}
function nearestRoadDist(x,z){const q=locate(x,z);if(q&&(q.kind==='node'||(q.kind==='road'&&q.band!=='off')))return 0;let best=1e9;for(const r of NET.roads){if(r.type!=='EXP'&&r.type!=='RAMP')continue;
    for(let i=0;i<r.X.length;i+=6){const d=Math.hypot(r.X[i]-x,r.Z[i]-z);if(d<best)best=d;}}return best;}
// ---- 標識・案内（高速道路） ----
function expSigns(){const r=NET.byId.E1;
  // 入口ランプ：最高速度40（標識）
  const on=NET.byId.ON_A,off=NET.byId.OFF_B;placeSign(on,12,1,['s40']);placeSign(off,20,1,['s40']);}
function buildExpBoards(B){const r=NET.byId.E1;const C0=EXPC;const tOut=(s)=>r._edges(1,s).outer-r.sh[0]-0.9;
  // 出口の予告（2km・1km・500m）と出口の門形
  const ex=C0.decel.s0;for(const[d,lab]of[[2000,'2km'],[1000,'1km'],[500,'500m']]){const s=ex-d;if(s<20)continue;guideBoard(B,r,s,tOut(s),1,4.2,2.3,{bg:GSIGN.green,lines:[{t:'みなみ東',size:0.27,y:0.24},{t:'出口 '+lab,size:0.3,y:0.58},{t:'EXIT',size:0.15,y:0.85,font:FONT_DISP}]},{top:3.6,legs:2});}
  gantry(B,r,ex+30,1,[{t:r.lanesF[0].tC,w:3.4,hh:1.8,spec:{bg:GSIGN.green,lines:[{t:'出口',size:0.32,y:0.34},{t:'みなみ東',size:0.24,y:0.72}],arrow:{x:0.84,y:0.5,s:0.55,rot:0}}},{t:r.lanesF[1].tC,w:3.4,hh:1.8,spec:{bg:GSIGN.green,lines:[{t:'東みなみ',size:0.3,y:0.36},{t:'方面',size:0.22,y:0.74}]}}]);
  // 本線に入ってすぐ：車間距離確認（0m・50m・100m）
  const sC=C0.accel.s1+300;guideBoard(B,r,sC,tOut(sC),1,3.6,1.5,{bg:GSIGN.blue,lines:[{t:'車間距離確認',size:0.36,y:0.5}]},{top:2.6,legs:2});
  for(const d of[0,50,100]){const s=sC+60+d;guideBoard(B,r,s,tOut(s),1,1.2,0.75,{bg:GSIGN.white,fg:'#1d3f8c',border:'#1d3f8c',lines:[{t:d+'m',size:0.5,y:0.52,color:'#1d3f8c',font:FONT_DISP}]},{top:1.6});}
  // トンネルの手前：ライト点灯・車線変更禁止（ゲーム内の案内板）
  const sT=C0.tunnel.s0-260;guideBoard(B,r,sT,tOut(sT),1,3.4,1.7,{bg:GSIGN.white,fg:'#202020',border:'#202020',lines:[{t:'トンネル内',size:0.26,y:0.3,color:'#202020'},{t:'車線変更禁止',size:0.3,y:0.68,color:'#c21f1f'}]},{top:2.8,legs:2});
  const sL=C0.tunnel.s0-120;guideBoard(B,r,sL,tOut(sL),1,3.0,1.4,{bg:GSIGN.white,fg:'#202020',border:'#202020',lines:[{t:'ライト点灯',size:0.36,y:0.52,color:'#202020'}]},{top:2.8,legs:2});
  // 非常電話（1kmおき）とキロポスト（100mおき）
  for(let s=600;s<r.len-50;s+=1000){if(inRanges(r.tunnels,s,5))continue;const P=r.pt(s,tOut(s)+0.3);B.box('def',P.x,P.y+0.7,P.z,0.5,1.4,0.6,0xe2701c,-r.at(s).h);
    TEXTSIGNS.push({x:P.x,y:P.y+1.9,z:P.z,h:r.at(s).h,w:1.0,hh:0.5,spec:{bg:'#ffffff',fg:'#d0502a',border:'#d0502a',lines:[{t:'非常電話',size:0.46,y:0.52,color:'#d0502a'}]}});}
  for(const q of r.tunnels)for(let s=q.s0+100;s<q.s1-20;s+=200){const P=r.pt(s,r._edges(1,s).outer-r.sh[0]-0.55);B.box('def',P.x,P.y+1.0,P.z,0.2,0.9,0.7,0xe2701c,-r.at(s).h);}
  for(let s=100;s<r.len;s+=100){if(inRanges(r.tunnels,s,2))continue;const P=r.pt(s,tOut(s)+0.2);B.box('def',P.x,P.y+0.55,P.z,0.06,1.1,0.06,0x9aa0a6);B.box('def',P.x,P.y+1.15,P.z,0.42,0.32,0.04,0x1f7a52,-r.at(s).h);}}
// ---- パーキングエリア（駐車ます・建物・止まっている車） ----
function buildPA(B){const L=NET.lots.find(l=>l.id==='PA');if(!L)return;const r=NET.byId.E1;const Q=EXPC.pa;const y=L.y||0;
  B.poly('road',L.poly,y,COL.asphEXP,8);
  // 構内の縁（縁石）と植え込み
  const P=L.poly;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if(i===0)continue;B.wall('def',[{x:a[0],y,z:a[1]},{x:b[0],y,z:b[1]}],0.15,COL.curb,1);}
  // 駐車ます（白線）：通路の北側に頭から入れる列
  const stalls=NET.map.stalls=[];const at=(s,t)=>r.pt(s,t);const hd=(s)=>r.at(s).h;
  const rows=[{t0:-36.6,t1:-41.6},{t0:-48.4,t1:-53.4}];
  for(const row of rows){for(let s=Q.s0+4;s<Q.s1-6;s+=2.6){const c=at(s+1.3,(row.t0+row.t1)/2);const h=hd(s)+(row.t1<row.t0?-Math.PI/2:Math.PI/2);
      stalls.push({x:c.x,z:c.z,y,h,w:2.5,l:5.0,id:stalls.length});
      for(const ss of[s,s+2.6]){const A=at(ss,row.t0),Bp=at(ss,row.t1);const f=fwd(hd(ss)),rt=rightV(hd(ss));const q=(p,u)=>({x:p.x+f.x*u,y:y+0.03,z:p.z+f.z*u});B.quad4('mark',q(A,-0.06),q(A,0.06),q(Bp,0.06),q(Bp,-0.06),C(COL.white));}}
    const A=at(Q.s0+4,row.t1),Bp=at(Q.s1-6+2.6*0,row.t1);}
  // 奥の歩道と建物（トイレ・売店）
  const w0=at(Q.s0,-60),w1=at(Q.s1,-60),w2=at(Q.s1,-85),w3=at(Q.s0,-85);B.poly('walk',[[w0.x,w0.z],[w1.x,w1.z],[w2.x,w2.z],[w3.x,w3.z]],y+0.15,0xffffff,4);
  B.wall('def',[{x:w0.x,y,z:w0.z},{x:w1.x,y,z:w1.z}],0.15,COL.curb,-1);
  const bc=at((Q.s0+Q.s1)/2,-72);const bh=hd((Q.s0+Q.s1)/2);B.wallBox('fac3',bc.x,bc.z,y+0.15,14,4.6,46,0xf1efe8,-bh,8,4.6);B.box('def',bc.x,y+4.95,bc.z,15,0.5,47,0x5b6670,-bh);
  const fr=fwd(bh),rr=rightV(bh);const sg=at((Q.s0+Q.s1)/2,-64.9);TEXTSIGNS.push({x:sg.x,y:y+4.0,z:sg.z,h:bh-Math.PI/2,w:6,hh:1.1,spec:{bg:'#1f7a52',lines:[{t:'みなみPA',size:0.56,y:0.52}]}});
  for(const k of[-1,1]){const tp=at((Q.s0+Q.s1)/2+k*28,-66);tree(B,tp.x,tp.z,1.0,y+0.15);}
  for(let i=0;i<3;i++){const vp=at(Q.s0+30+i*1.0,-65.4);vending(B,vp.x,vp.z,y+0.15,bh+Math.PI/2);}
  // 案内（PAの予告・入口）
  const tO=(s)=>r._edges(1,s).outer-r.sh[0]-0.9;for(const[d,lab]of[[1000,'1km'],[500,'500m']]){const s=Q.d0-d;guideBoard(B,r,s,tO(s),1,4.0,2.1,{bg:GSIGN.green,lines:[{t:'みなみPA',size:0.3,y:0.3},{t:lab,size:0.32,y:0.7}]},{top:3.4,legs:2});}
  guideBoard(B,r,Q.d0+20,tO(Q.d0+20)-3.6,1,2.4,1.4,{bg:GSIGN.green,lines:[{t:'P',size:0.6,y:0.42,font:FONT_DISP},{t:'みなみPA',size:0.2,y:0.84}]},{top:2.6});}
// PAに止まっている車（毎回同じ位置）
function placePACars(){const st=(NET.map&&NET.map.stalls)||[];const R2=rng(55);for(const s of st){if(R2()<0.55)continue;const type=pick(['kei','compact','sedan','van','suv','compact'],R2);const m=makeCar(type,pick(CARCOL,R2));
    m.grp.position.set(s.x,s.y,s.z);m.grp.rotation.y=-s.h;m.grp.userData.mapOwned=true;scene.add(m.grp);s.taken=true;NET.obst.push({x:s.x,z:s.z,h:s.h,L:m.L,W:m.W,solid:true,static:true,model:m.grp});}}

