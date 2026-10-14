// ===== 03g_shinjuku.js : 新宿駅周辺の町並み（PLATEAU の建物の押し出し・地面・線路・緑地・遠景） =====
// 建物は PLATEAU の底面の形（多角形）を高さぶん押し出す。壁の見た目（窓の並び）は用途と高さで決める。実在の名前・ロゴは使わない。
const SJ={palette:null};
// 多角形の建物：壁（窓テクスチャ）と屋根
function polyBuilding(B,key,poly,y0,h,color,uvW,uvH){
  // 向き：wallBox と同じ（面積が負の向き）にそろえる
  let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];area+=a[0]*b[1]-b[0]*a[1];}
  const P=area>0?poly.slice().reverse():poly;const n=P.length;let cx=0,cz=0;for(const p of P){cx+=p[0];cz+=p[1];}cx/=n;cz/=n;
  const o=B._grp(key,cx,cz);const c=C(color);
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];const dx=b[0]-a[0],dz=b[1]-a[1];const len=Math.hypot(dx,dz);if(len<0.05)continue;const nx=-dz/len,nz=dx/len;
    const uu=Math.max(1,Math.round(len/uvW)),vv=Math.max(1,Math.round(h/uvH));
    const q=[[a,y0,0,0],[b,y0,uu,0],[b,y0+h,uu,vv],[a,y0,0,0],[b,y0+h,uu,vv],[a,y0+h,0,vv]];
    for(const[p,yy,u,v]of q)B._v(o,p[0],yy,p[1],nx,0,nz,c,u,v);}
  // 屋根（v=9：壁の足もとを暗くする処理（07c）の対象外）
  const v2=P.map(p=>new THREE.Vector2(p[0],p[1]));let tris;try{tris=THREE.ShapeUtils.triangulateShape(v2,[]);}catch(e){tris=[];}
  const rc=C(0x8d8a85);for(const t of tris){const T=t.map(i=>P[i]);const cr=(T[1][0]-T[0][0])*(T[2][1]-T[0][1])-(T[1][1]-T[0][1])*(T[2][0]-T[0][0]);const Q=cr>0?[T[0],T[2],T[1]]:T;
    for(const p of Q)B._v(o,p[0],y0+h,p[1],0,1,0,rc,0,9);}
  return{cx,cz};}
// 用途コード（PLATEAU）と高さから、壁の種類と色を決める
function sjStyle(b,R2){const u=b.u||'';const h=b.h;const P=PAL;
  if(h>=60)return{key:'fac2',col:pick(P.tower,R2),uvW:8,uvH:3.6,kind:'tower'};
  if(u==='401'||u==='403'||u==='421')return h>=16?{key:'fac0',col:pick(P.office,R2),uvW:7,uvH:3.4,kind:'office'}:{key:'fac3',col:pick(P.shop,R2),uvW:8,uvH:3.4,kind:'shop'};
  if(u==='402'||u==='413'||u==='414'||u==='404')return h>=30?{key:'fac0',col:pick(P.office,R2),uvW:7,uvH:3.4,kind:'office'}:{key:'fac3',col:pick([0xd9d2c6,0xc9c2b4,0xe2ddd2,0xbcb5aa,0xe7e3d8],R2),uvW:8.5,uvH:3.3,kind:'zakkyo'};
  if(u==='412')return{key:'fac1',col:pick(P.apt,R2),uvW:6.4,uvH:3.0,kind:'apt'};
  if(u==='411'||u==='415')return h<10?{key:'house',col:pick(P.house,R2),uvW:3.4,uvH:2.9,kind:'house'}:{key:'fac1',col:pick(P.apt,R2),uvW:6.4,uvH:3.0,kind:'apt'};
  if(u==='422')return{key:'fac1',col:pick([0xe8e4dc,0xdde3e6,0xe2e2de],R2),uvW:6.4,uvH:3.4,kind:'school'};
  if(u==='431'||u==='441'||u==='452'||u==='454')return{key:'def',col:pick([0xb9b6ae,0xc9c6bf,0xa9a69e],R2),uvW:6,uvH:3,kind:'plain'};
  // 不明・その他：高さで
  if(h<9)return{key:'house',col:pick(P.house,R2),uvW:3.4,uvH:2.9,kind:'house'};
  if(h<20)return{key:'fac3',col:pick(P.shop,R2),uvW:8,uvH:3.3,kind:'shop'};
  return{key:'fac0',col:pick(P.office,R2),uvW:7,uvH:3.4,kind:'office'};}
function sjBuildings(B){const D=SHINJUKU.data;const R2=rng(7);let n=0;
  for(const b of D.buildings){const poly=b.p;if(poly.length<3)continue;const h=Math.max(2.6,b.h);const st=sjStyle(b,R2);
    const{cx,cz}=polyBuilding(B,st.key,poly,0,h,st.col,st.uvW,st.uvH);n++;
    // 大きさ（外接する四角）
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of poly){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);}const ex=x1-x0,ez=z1-z0;
    if(st.kind==='house'){// 小さい家：屋根
      if(poly.length===4&&ex<16&&ez<16){const a=poly[0],bq=poly[1];const ry=Math.atan2(bq[1]-a[1],bq[0]-a[0]);const w=Math.hypot(bq[0]-a[0],bq[1]-a[1]),d=Math.hypot(poly[2][0]-bq[0],poly[2][1]-bq[1]);
        if(w>3&&d>3)(R2()<0.6?roofGable:roofHip)(B,cx,cz,h,w,d,1.6,-ry,pick(PAL.roof,R2));}}
    else if(st.kind!=='plain'){B.box('def',cx,h+0.25,cz,Math.max(1,ex*0.35),0.5,Math.max(1,ez*0.35),0x8f8b85);
      if(h>=18&&ex>12&&ez>12&&R2()<0.5&&ENV.q!=='low')roofStuff(B,cx,cz,h+0.5,ex*0.5,ez*0.5);
      if(st.kind==='tower'&&ex>14&&ez>14){B.box('def',cx,h+2.5,cz,ex*0.35,5,ez*0.35,0x8a929a);B.cyl('def',cx,h+9,cz,0.25,8,0xcfcfcf,6);}}}
  return n;}
// 地面・緑地・線路・遠景
function sjGround(B){const H=SHINJUKU.data.half||880;B.ground('conc',-H-40,-H-40,H+40,H+40,-0.05,0xc9c6bf,9);
  for(const g of SHINJUKU.data.green){B.poly('grass',g.p,0.02,0x7f9a5a,8);
    // 木をまばらに
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of g.p){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);}
    const area=Math.abs(polyArea(g.p));const n=Math.min(140,Math.floor(area/900));const r2=rng(Math.floor(x0+z0));
    for(let i=0;i<n;i++){const x=x0+r2()*(x1-x0),z=z0+r2()*(z1-z0);if(polyHas(g.p,x,z,-1)&&!nearRoad(x,z,9))tree(B,x,z,0.9+r2()*0.7,0.02);}}}
function polyArea(P){let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;}
function nearRoad(x,z,m){const q=locate(x,z);return!!(q&&(q.kind==='node'||q.band!=='off'||(q.kind==='road'&&Math.abs(q.t)<m)));}
// 線路：北は高架、駅の南は掘割（甲州街道の橋の下）。y は z で決める
function sjRailY(z){if(z<-320)return 7.0;if(z<-120)return 7.0-(z+320)/200*4.5;if(z<120)return 2.5-(z+120)/240*7.0;if(z<420)return -4.5+(z-120)/300*4.5;return 0;}
function sjRails(B){const D=SHINJUKU.data;const seen=new Set();
  for(const rl of D.rails){const pts=rl.pts;if(pts.length<2)continue;
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.5)continue;const n=Math.max(1,Math.ceil(L/20));
      for(let k=0;k<n;k++){const x0=a[0]+(b[0]-a[0])*k/n,z0=a[1]+(b[1]-a[1])*k/n,x1=a[0]+(b[0]-a[0])*(k+1)/n,z1=a[1]+(b[1]-a[1])*(k+1)/n;const key=Math.round((x0+x1)/4)+','+Math.round((z0+z1)/4);if(seen.has(key))continue;seen.add(key);
        const y0=sjRailY(z0),y1=sjRailY(z1);const cx=(x0+x1)/2,cz=(z0+z1)/2,cy=(y0+y1)/2;const h=Math.atan2(x1-x0,-(z1-z0));const seg=Math.hypot(x1-x0,z1-z0);
        B.boxR('def',cx,cy+0.05,cz,2.8,0.1,seg+0.3,COL.ballast,0,-h,0);for(const o of[-0.535,0.535]){const rt=rightV(h);B.boxR('def',cx+rt.x*o,cy+0.18,cz+rt.z*o,0.08,0.12,seg+0.3,COL.rail,0,-h,0);}
        if(cy>2.5){B.boxR('conc',cx,cy-0.6,cz,4.0,1.2,seg+0.3,0xbfbcb4,0,-h,0);if(k%2===0)B.box('conc',cx,(cy-1.2)/2,cz,1.1,cy-1.2,1.1,0xc6c3bb);}
        else if(cy<-0.5){const rt=rightV(h);for(const sd of[-1,1])B.boxR('conc',cx+rt.x*sd*2.6,cy/2,cz+rt.z*sd*2.6,0.4,-cy+0.3,seg+0.3,0xb9b6ae,0,-h,0);}}}}}
function sjSkyline(B){const R3=rng(2027);for(let i=0;i<170;i++){const a=R3()*Math.PI*2;const d=1000+R3()*800;const x=Math.cos(a)*d,z=Math.sin(a)*d;
    const w=24+R3()*45,dd=24+R3()*45,h=25+Math.pow(R3(),1.8)*170;B.wallBox(R3()<0.4?'fac2':R3()<0.6?'fac0':'fac1',x,z,0,w,h,dd,pick([0x8fa3b2,0x9aa8b2,0xa7b1b8,0x7f90a0,0xb5bcc2,0xc4ccd2],R3),R3()*Math.PI,8,7.2);}}
function buildShinjuku(B,wires){const low=ENV.q==='low';
  buildSignMeshes(B);buildStreetLights(B,{filter:r=>r.type!=='RES'});if(!low)buildGuardPipes(B,{filter:r=>r.type==='ART',step:6,tol:0.03});buildPoles(B,wires,{filter:r=>r.type!=='ART'});
  buildStreetTrees(B,{filter:r=>r.type==='ART',step:low?44:26});// 街路樹は控えめに（描画量。品質「低」ではさらに少なく）
  sjGround(B);sjRails(B);const n=sjBuildings(B);SJ.built=n;}
