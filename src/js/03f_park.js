// ===== 03f_park.js : 駐車の練習場の景色（教習所のコース・スーパーの駐車場・まちの通り） =====
// 縁石（低い壁）を点列に沿って
function curbLine(B,pts,h=0.18,col=0xe9e7e0,side=1){B.wall('def',pts,h,col,side);B.wall('def',pts,h,col,-side);
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];B.bar('def',a.x,a.y+h,a.z,b.x,b.y+h,b.z,0.2,0.02,col);}}
// ポール（赤白の棒）：ぶつかると接触
function parkPole(B,x,z,label){for(let k=0;k<5;k++)B.cyl('def',x,0.12+k*0.24,z,0.06,0.24,k%2?0xf2f2f2:0xd42a2a,6);NET.obst.push({x,z,h:0,L:0.14,W:0.14,solid:true,static:true,pole:true,label:label||'ポールに接触しました。'});}
// 止まっている車（まとめて1つの形に）
function staticCar(B,x,z,h,type,color){const T=CARTYPES[type];const g=GEOCACHE.get(type+':'+color)||carGeo(type,color);GEOCACHE.set(type+':'+color,g);
  const m=new THREE.Matrix4().compose(new V3(x,0,z),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),-h),new V3(1,1,1));B.addGeoVC('paint',g,m);
  NET.obst.push({x,z,h,L:T.L,W:T.W,solid:true,static:true,parkedCar:true,label:'止まっている車に接触しました。'});}
function buildPark(B,wires){const K=PARK.K;R=rng(515);
  buildSignMeshes(B);
  // ---- 教習所 ----
  B.ground('grass',K.x0-60,K.z0-50,K.x1+40,K.z1+30,-0.04,0x7f9a5a,10);
  for(const r of NET.roads){if(!r.def.course)continue;const[lo,hi]=r.tRange(r.len/2);for(const t of[lo-0.12,hi+0.12]){const pts=roadEdgePts(r,r.startNode&&r.startNode.kind==='x'?(r.startLeg==='N'||r.startLeg==='S'?0.5:0.5):0,r.len-(r.endNode?0.5:0),()=>t,0,5);
      // 方向変換の車庫・縦列の枠の入口は縁石を切る
      let run=[];for(const P of pts){const Q=r.pt(P.s,t+(t<0?-0.45:0.45));if(NET.lots.some(l=>l.id!=='MART'&&lotHas(l,Q.x,Q.z))){if(run.length>1)curbLine(B,run);run=[];continue;}run.push(P);}if(run.length>1)curbLine(B,run);}}
  // 交差点の角の縁石（隅切り）
  for(const n of NET.nodes){if(n.kind!=='x'||!['KNW','KNE','KSE','KSW','HKJ'].includes(n.id))continue;for(const f of n.fil){const arc=[];for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI/2;arc.push({x:f.px+f.sx*(f.r+f.r*Math.cos(a)),y:0,z:f.pz+f.sz*(f.r+f.r*Math.sin(a))});}curbLine(B,arc);}
    for(const L of['N','S','E','W']){if(n.legs[L])continue;const sx=L==='E'?1:L==='W'?-1:0,sz=L==='S'?1:L==='N'?-1:0;// 脚のない辺
      if(sz){const z=n.z+sz*(n.hz+0.12);curbLine(B,[{x:n.x-n.hx,y:0,z},{x:n.x+n.hx,y:0,z}]);}else{const x=n.x+sx*(n.hx+0.12);curbLine(B,[{x,y:0,z:n.z-n.hz},{x,y:0,z:n.z+n.hz}]);}}}
  // 行き止まり（方向変換コースの奥）
  {const r=NET.byId.HK;const[lo,hi]=r.tRange(r.len-0.2);const A=r.pt(r.len,lo-0.12),Bq=r.pt(r.len,hi+0.12);curbLine(B,[{x:A.x,y:0,z:A.z},{x:Bq.x,y:0,z:Bq.z}]);
    TEXTSIGNS.push({x:PARK.HK.x,y:1.2,z:PARK.HK.zEnd+1.2,h:Math.PI,w:2.6,hh:0.8,spec:{bg:'#ffffff',fg:'#202020',border:'#202020',lines:[{t:'方向変換',size:0.48,y:0.52,color:'#202020'}]}});}
  // 車庫（方向変換）・縦列の枠：舗装・縁石・ポール
  for(const id of['BAY','SLOT']){const L=NET.lots.find(l=>l.id===id);B.poly('road',L.poly,0.004,0x6d7177,8);}
  {const L=NET.lots.find(l=>l.id==='BAY');const[x0,x1,z0,z1]=[L.x0+0.6,L.x1,L.z0,L.z1];curbLine(B,[{x:x0,y:0,z:z0-0.12},{x:x1+0.12,y:0,z:z0-0.12},{x:x1+0.12,y:0,z:z1+0.12},{x:x0,y:0,z:z1+0.12}]);
    parkPole(B,x0+0.1,z0-0.3,'車庫の入口のポールに接触しました。');parkPole(B,x0+0.1,z1+0.3,'車庫の入口のポールに接触しました。');
    TEXTSIGNS.push({x:x1+0.3,y:1.5,z:(z0+z1)/2,h:Math.PI/2,w:1.6,hh:0.6,spec:{bg:'#1d4f9c',lines:[{t:'車庫',size:0.56,y:0.52}]}});
    for(const z of[z0+0.08,z1-0.08])B.box('mark',(x0+x1)/2,0.03,z,x1-x0,0.02,0.12,0xf2f2f2);}
  {const L=NET.lots.find(l=>l.id==='SLOT');const[x0,x1,z0]=[L.x0,L.x1,L.z0];const zr=PARK.K.z1-4.0;curbLine(B,[{x:x0-0.12,y:0,z:zr},{x:x0-0.12,y:0,z:z0-0.12},{x:x1+0.12,y:0,z:z0-0.12},{x:x1+0.12,y:0,z:zr}]);
    for(const[x,z]of[[x0-0.25,zr+0.05],[x1+0.25,zr+0.05],[x0-0.25,z0-0.3],[x1+0.25,z0-0.3]])parkPole(B,x,z,'縦列駐車の枠のポールに接触しました。');
    B.box('def',(x0+x1)/2,0.75,z0-0.42,0.08,1.5,0.08,0x9aa0a6);TEXTSIGNS.push({x:(x0+x1)/2,y:1.6,z:z0-0.36,h:0,w:2.4,hh:0.6,spec:{bg:'#1d4f9c',lines:[{t:'縦列駐車',size:0.5,y:0.52}]}});}
  // 校舎・看板・柵
  B.wallBox('fac0',K.x0-34,(K.z0+K.z1)/2,0,22,10.2,70,0xe9e6dc,Math.PI/2,7,5.1);B.box('def',K.x0-34,10.5,(K.z0+K.z1)/2,22.4,0.6,70.4,0x8c8a86);BUILT.push({x0:K.x0-45,x1:K.x0-23,z0:(K.z0+K.z1)/2-35,z1:(K.z0+K.z1)/2+35});
  TEXTSIGNS.push({x:K.x0-22.9,y:8.2,z:(K.z0+K.z1)/2,h:-Math.PI/2,w:16,hh:2.2,spec:{bg:'#ffffff',fg:'#1c2622',bw:0,lines:[{t:'みなみ自動車学校',size:0.55,y:0.55,color:'#1c5f3a'}]}});
  for(let x=K.x0-50;x<K.x1+30;x+=2.5){B.box('def',x,0.9,K.z1+26,0.06,1.8,0.06,0x2f6b4f);}B.box('def',(K.x0+K.x1)/2-10,1.75,K.z1+26,K.x1-K.x0+80,0.06,0.06,0x2f6b4f);
  for(let i=0;i<14;i++){const x=K.x0+20+R()*(K.x1-K.x0-40),z=K.z0+20+R()*(K.z1-K.z0-40);if(Math.abs(x-PARK.HK.x)<14&&z<PARK.HK.zEnd+8)continue;if(z>K.z1-16&&x>PARK.SLOT.x0-10&&x<PARK.SLOT.x1+10)continue;tree(B,x,z,0.9+R()*0.4,0.02);}
  // ---- スーパー「さくらマート」の駐車場 ----
  const L=PARK.LOT;const ML=NET.lots.find(l=>l.id==='MART');B.poly('road',ML.poly,0.003,0x6a6e74,8);
  const ed=[[L.x0,L.z1],[L.x0,L.z0],[L.x1,L.z0],[L.x1,L.z1],[PARK.LINX+3.4,L.z1]];curbLine(B,ed.map(([x,z])=>({x,y:0,z})));curbLine(B,[{x:L.x0,y:0,z:L.z1},{x:PARK.LINX-3.4,y:0,z:L.z1}]);
  // 駐車ます（白線）と止まっている車
  const stalls=NET.map.stalls=[];let id=0;
  PARK.LOT.row.forEach(([za,zb],ri)=>{const face=ri%2===0?-1:1;// 0: 北向き（店側）に頭／1: 南向き
    for(let x=L.sx0;x<L.sx1;x+=2.5){B.box('mark',x,0.025,(za+zb)/2,0.12,0.02,zb-za,0xf2f2f2);const cx=x+1.25,cz=(za+zb)/2;if(x+2.5<=L.sx1)stalls.push({id:id++,x:cx,z:cz,w:2.5,l:zb-za,row:ri,za,zb});}
    B.box('mark',(L.sx0+L.sx1)/2,0.025,ri%2===0?za:zb,L.sx1-L.sx0,0.02,0.12,0xf2f2f2);});
  const R2=rng(77);PARK.target=stalls.find(s=>s.row===3&&Math.abs(s.x-150)<1.3)||stalls[0];
  // バックで出てくる車の駐車ます（目的の枠の東・通路の向かい側）は空けておく
  const ox=PARK.target.x+12.5;PARK.outStall=stalls.filter(s=>s.row===2).reduce((a,b)=>Math.abs(b.x-ox)<Math.abs(a.x-ox)?b:a);
  for(const s of stalls){if(s===PARK.target||s===PARK.outStall)continue;const near=(Math.abs(s.x-PARK.target.x)<3&&s.row===PARK.target.row)||(Math.abs(s.x-PARK.outStall.x)<3&&s.row===2)||(s.x>183&&(s.row===4||s.row===5));if(!near&&R2()<0.5)continue;
    const back=R2()<0.6;const hh=(s.row%2===0?0:Math.PI)+(back?Math.PI:0);staticCar(B,s.x+(R2()-0.5)*0.2,s.z+(R2()-0.5)*0.3,hh+(R2()-0.5)*0.04,pick(['kei','compact','compact','sedan','van','suv','kei'],R2),pick(CARCOL,R2));s.taken=true;}
  // 目標の枠（緑）
  {const s=PARK.target;B.box('glowd',s.x,0.03,s.z,2.2,0.01,s.l-0.3,0x22c55e);TEXTSIGNS.push({x:s.x,y:2.6,z:s.z,h:0,w:1.6,hh:0.6,lit:true,spec:{bg:'#1f7a4d',lines:[{t:'ここに駐車',size:0.42,y:0.52}]}});
    TEXTSIGNS.push({x:s.x,y:2.6,z:s.z+0.01,h:Math.PI,w:1.6,hh:0.6,lit:true,spec:{bg:'#1f7a4d',lines:[{t:'ここに駐車',size:0.42,y:0.52}]}});}
  // 店の建物・歩道・看板
  B.ground('walk',L.x0,L.z0-8,L.x1,L.z0,0.15,0xffffff,4);B.wall('def',[{x:L.x0,y:0,z:L.z0},{x:L.x1,y:0,z:L.z0}],0.15,COL.curb,1);
  B.wallBox('fac3',(L.x0+L.x1)/2,L.z0-22,0,L.x1-L.x0-20,7,28,0xf3f3f0,0,8,7);B.box('def',(L.x0+L.x1)/2,7.3,L.z0-22,L.x1-L.x0-19.6,0.6,28.4,0x8a8f93);BUILT.push({x0:L.x0,x1:L.x1,z0:L.z0-40,z1:L.z0-6});
  B.quad('glow',(L.x0+L.x1)/2,1.5,L.z0-7.95,40,2.8,Math.PI,0,0,1,1,0xdfe9ee);
  TEXTSIGNS.push({x:(L.x0+L.x1)/2,y:5.6,z:L.z0-7.9,h:0,w:18,hh:2.4,lit:true,spec:{bg:'#2f8f4f',fg:'#ffffff',bw:0,lines:[{t:'さくらマート',size:0.6,y:0.55}]}});
  for(let x=L.x0+8;x<L.x1-6;x+=1.2)B.box('def',x,0.5,L.z0-6.5,0.5,0.9,0.8,0xb8bcc0);// カート置き場
  TEXTSIGNS.push({x:PARK.LINX-5.5,y:2.2,z:L.z1-1,h:Math.PI,w:2.0,hh:1.0,spec:{bg:'#ffffff',fg:'#c21f1f',border:'#c21f1f',lines:[{t:'構内 徐行',size:0.34,y:0.36,color:'#c21f1f'},{t:'歩行者に注意',size:0.24,y:0.74,color:'#202020'}]}});B.box('def',PARK.LINX-5.5,1.0,L.z1-1,0.08,2.0,0.08,0x9aa0a6);
  for(let x=L.x0+10;x<L.x1;x+=40){B.cyl('def',x,4,L.z1-3,0.1,8,0x8e959b,6);B.box('lamp',x,8,L.z1-3,0.6,0.15,0.35,0xffffff);}
  // 駐車場の出入口：歩道は段差を下げてそのまま続く（車は歩道を横切って出入りする）
  {const n=NET.nodeById.LINJ;const zE=n.z-n.hz,zW=zE-3;const x0=PARK.LINX-3.4,x1=PARK.LINX+3.4;PARK.walkZ=[zW,zE];
    B.ground('walk',x0,zW,x1,zE,0.035,0xdcd8d0,4);for(const z of[zW,zE])B.box('def',PARK.LINX,0.05,z,6.8,0.06,0.18,0xc9c6bf);
    B.ground('road',x0,L.z1+4.5,x1,zW,0.004,0x6a6e74,8);curbLine(B,[{x:x0,y:0,z:L.z1},{x:x0,y:0,z:zW}]);curbLine(B,[{x:x1,y:0,z:L.z1},{x:x1,y:0,z:zW}]);
    // 店の前の植え込み（道路と駐車場の間）と案内の看板
    BUILT.push({x0:L.x0-4,x1:L.x1+4,z0:L.z1,z1:zW});
    for(const[a,b]of[[L.x0,x0-0.6],[x1+0.6,L.x1]]){B.box('leaf',(a+b)/2,0.45,zW-1.4,b-a,0.9,1.0,0x4f7a3c);B.box('def',(a+b)/2,0.2,zW-1.4,b-a+0.2,0.4,1.2,0xb9b4aa);}
    {const px=x1+3.2,pz=zW-1.6;B.cyl('def',px,2.6,pz,0.12,5.2,0x8e959b,6);B.box('def',px,5.0,pz,0.16,1.5,2.7,0x8e959b);
      for(const s of[-1,1])TEXTSIGNS.push({x:px+s*0.09,y:5.0,z:pz,h:s<0?Math.PI/2:-Math.PI/2,w:2.6,hh:1.4,lit:true,spec:{bg:'#2f8f4f',fg:'#ffffff',bw:0,lines:[{t:'さくらマート',size:0.32,y:0.32},{t:'P 入口',size:0.3,y:0.74}]}});}}
  // ---- まちの通り ----
  buildPoles(B,wires,{filter:r=>r.def.street&&!r.def.lotRoad});buildStreetLights(B,{filter:r=>r.def.street&&!r.def.lotRoad});
  lineBuildings(B,{seed:91,filter:r=>r.def.street&&!r.def.lotRoad,kinds:(r)=>r.id==='R2'?['house','house','apt']:['shop','shop','apt','house','zakkyo']});
  // バス停・消火栓・駐車禁止の区間
  const r1c=NET.byId.R1c,r1b=NET.byId.R1b;const sOn=(r,x)=>{const a=r.at(0),b=r.at(r.len);return(x-a.x)/(b.x-a.x)*r.len;};
  {const s=sOn(r1c,PARK.BUSX);const[lo]=r1c.tRange(s);const P=r1c.pt(s,lo-0.6);B.cyl('def',P.x,1.3,P.z,0.05,2.6,0xb0b6bb,6);B.cyl('def',P.x,2.75,P.z,0.34,0.06,0xf2f2f2,16);
    shopSignQuad(B,'さくらバス\n商店会前','#2f7d3a',P.x,2.75,P.z,0.62,0.31,0,false,{back:true,box:false});PARK.bus={x:P.x,z:P.z};}
  {const s=sOn(r1c,PARK.HYDRANT);const[lo]=r1c.tRange(s);const P=r1c.pt(s,lo-0.7);B.cyl('def',P.x,0.45,P.z,0.16,0.9,0xd42a2a,8);B.cyl('def',P.x,0.95,P.z,0.2,0.1,0xd42a2a,8);
    const Q=r1c.pt(s,lo-1.6);B.box('def',Q.x,1.1,Q.z,0.06,2.2,0.06,0x9aa0a6);TEXTSIGNS.push({x:Q.x,y:2.0,z:Q.z,h:0,w:0.7,hh:0.5,spec:{bg:'#d42a2a',fg:'#ffffff',bw:0,lines:[{t:'消火栓',size:0.5,y:0.52}]}});PARK.hydrant={x:P.x,z:P.z};}
  {const s=sOn(r1c,PARK.NOPARK[0]);placeSign(r1c,s,1,['noparking','p_here'],{size:0.75});}
  // パン屋（行き先）
  {const zf=PARK.R1Z-6.7;B.wallBox('fac3',250,zf-4.6,0,12,6.8,9,0xe8dcc8,0,6,6.8);B.box('def',250,7.0,zf-4.6,12.2,0.4,9.2,0x7a4a2a);B.box('def',250,2.9,zf+0.5,11,0.15,1.2,0x7a4a2a);BUILT.push({x0:244,x1:256,z0:zf-9.2,z1:zf});
    B.quad('glow',250,1.35,zf+0.03,9,2.3,0,0,0,1,1,0xf3e6c8);TEXTSIGNS.push({x:250,y:3.9,z:zf+0.04,h:Math.PI,w:6,hh:1.1,lit:true,spec:{bg:'#7a4a2a',fg:'#fff4dc',bw:0,lines:[{t:'さくらベーカリー',size:0.5,y:0.52,color:'#fff4dc'}]}});}
  B.ground('grass',-700,-500,700,500,-0.06,0x7f9a5a,10);}
