// ===== 01_util.js : 数学・乱数・色・ジオメトリ結合・テクスチャ =====
const V3 = THREE.Vector3;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(t)=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const wrapA=(a)=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
const KMH=3.6;
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let R=rng(20261011);
const pick=(arr,r=R)=>arr[Math.floor(r()*arr.length)];
const rint=(a,b,r=R)=>a+Math.floor(r()*(b-a+1));
const rrange=(a,b,r=R)=>a+r()*(b-a);
const fwd=(h)=>({x:Math.sin(h),z:-Math.cos(h)});
const rightV=(h)=>({x:Math.cos(h),z:Math.sin(h)});
const headingOf=(dx,dz)=>Math.atan2(dx,-dz);
const dist2=(ax,az,bx,bz)=>{const dx=ax-bx,dz=az-bz;return dx*dx+dz*dz;};
function store(k,v){try{if(v===undefined){const s=localStorage.getItem(k);return s?JSON.parse(s):null;}localStorage.setItem(k,JSON.stringify(v));}catch(e){return null;}}
// 色：コード中の16進はsRGB。描画はリニアで行うので変換して使う
const _colCache=new Map();
function C(hex){let c=_colCache.get(hex);if(!c){c=new THREE.Color(hex);c.convertSRGBToLinear();_colCache.set(hex,c);}return c;}
function lambert(hex,o){return new THREE.MeshLambertMaterial(Object.assign({color:C(hex)},o||{}));}
function basic(hex,o){return new THREE.MeshBasicMaterial(Object.assign({color:C(hex)},o||{}));}

// ---- ジオメトリの結合（頂点カラー・タイルごと） ----
let TILE=120;// 地図ごとに変えられる（大きいほど描画の呼び出しが減る）
class Batch{
  constructor(){this.g=new Map();this.nv=0;}
  _grp(key,x,z){const k=key+'|'+Math.floor(x/TILE)+','+Math.floor(z/TILE);let o=this.g.get(k);if(!o){o={key,p:[],n:[],c:[],u:[]};this.g.set(k,o);}return o;}
  _v(o,x,y,z,nx,ny,nz,c,u,v){o.p.push(x,y,z);o.n.push(nx,ny,nz);o.c.push(c.r,c.g,c.b);o.u.push(u,v);}
  addGeo(key,geo,m,color,tileX,tileZ){
    const g=geo.index?geo.toNonIndexed():geo;const P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;
    const e=new V3(),nm=new THREE.Matrix3().getNormalMatrix(m);const col=typeof color==='object'?color:C(color);
    const t=new V3().setFromMatrixPosition(m);
    const o=this._grp(key,tileX!==undefined?tileX:t.x,tileZ!==undefined?tileZ:t.z);
    for(let i=0;i<P.count;i++){e.fromBufferAttribute(P,i).applyMatrix4(m);o.p.push(e.x,e.y,e.z);
      e.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();o.n.push(e.x,e.y,e.z);o.c.push(col.r,col.g,col.b);
      if(U)o.u.push(U.getX(i),U.getY(i));else o.u.push(0,0);}}
  // 頂点カラーをそのまま使う（車の形など、mergeParts で作ったもの）
  addGeoVC(key,geo,m){const g=geo.index?geo.toNonIndexed():geo;const P=g.attributes.position,N=g.attributes.normal,Cl=g.attributes.color;const e=new V3(),nm=new THREE.Matrix3().getNormalMatrix(m);const t=new V3().setFromMatrixPosition(m);const o=this._grp(key,t.x,t.z);
    for(let i=0;i<P.count;i++){e.fromBufferAttribute(P,i).applyMatrix4(m);o.p.push(e.x,e.y,e.z);e.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();o.n.push(e.x,e.y,e.z);if(Cl)o.c.push(Cl.getX(i),Cl.getY(i),Cl.getZ(i));else o.c.push(1,1,1);o.u.push(0,0);}}
  box(key,x,y,z,sx,sy,sz,color,ry=0){const m=new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),ry),new V3(sx,sy,sz));this.addGeo(key,GEO.box,m,color);}
  boxR(key,x,y,z,sx,sy,sz,color,rx,ry,rz){const m=new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0,'YXZ')),new V3(sx,sy,sz));this.addGeo(key,GEO.box,m,color);}
  cyl(key,x,y,z,r,h,color,seg){const m=new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion(),new V3(r,h,r));this.addGeo(key,seg===6?GEO.cyl6:GEO.cyl,m,color);}
  sph(key,x,y,z,sx,sy,sz,color){const m=new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion(),new V3(sx,sy,sz));this.addGeo(key,GEO.sph,m,color);}
  sphL(key,x,y,z,sx,sy,sz,color){const m=new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion(),new V3(sx,sy,sz));this.addGeo(key,GEO.sphLo,m,color);}
  cone(key,x,y,z,r,h,color){const m=new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion(),new V3(r,h,r));this.addGeo(key,GEO.cone,m,color);}
  // 2点間の棒（パイプ・電線柱の腕など）
  bar(key,ax,ay,az,bx,by,bz,w,d,color){const A=new V3(ax,ay,az),Bv=new V3(bx,by,bz);const dir=Bv.clone().sub(A);const len=dir.length();if(len<1e-4)return;
    const q=new THREE.Quaternion().setFromUnitVectors(new V3(0,1,0),dir.normalize());const m=new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5),q,new V3(w,len,d));this.addGeo(key,GEO.box,m,color);}
  // 地面の長方形（軸平行）
  ground(key,x0,z0,x1,z1,y,color,uvScale=0){const o=this._grp(key,(x0+x1)/2,(z0+z1)/2);const s=uvScale;const c=C(color);
    for(const[a,b]of[[x0,z0],[x0,z1],[x1,z1],[x0,z0],[x1,z1],[x1,z0]])this._v(o,a,y,b,0,1,0,c,s?a/s:0,s?-b/s:0);}
  // 三角形（法線は自動）
  tri(key,a,b,c,color,ua,ub,uc){const o=this._grp(key,(a.x+b.x+c.x)/3,(a.z+b.z+c.z)/3);const cl=typeof color==='object'?color:C(color);
    const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    this._v(o,a.x,a.y,a.z,nx,ny,nz,cl,ua?ua[0]:0,ua?ua[1]:0);this._v(o,b.x,b.y,b.z,nx,ny,nz,cl,ub?ub[0]:0,ub?ub[1]:0);this._v(o,c.x,c.y,c.z,nx,ny,nz,cl,uc?uc[0]:0,uc?uc[1]:0);}
  // 四角形 a-b-c-d（反時計回りで表）
  quad4(key,a,b,c,d,color,uv){if(uv){this.tri(key,a,b,c,color,uv[0],uv[1],uv[2]);this.tri(key,a,c,d,color,uv[0],uv[2],uv[3]);}else{this.tri(key,a,b,c,color);this.tri(key,a,c,d,color);}}
  // 道路面などの帯：L[i]とRr[i]（進行方向の左右）の間を埋める。上向き。uvは長さ方向にuvScale(m)
  strip(key,L,Rr,color,uvScale=0,v0=0){const cl=typeof color==='object'?color:C(color);let acc=v0;
    for(let i=0;i<L.length-1;i++){const a=L[i],b=Rr[i],c=Rr[i+1],d=L[i+1];const seg=Math.hypot(d.x-a.x,d.z-a.z);
      const u0=uvScale?acc/uvScale:0,u1=uvScale?(acc+seg)/uvScale:0;const wA=uvScale?Math.hypot(b.x-a.x,b.z-a.z)/uvScale:0,wB=uvScale?Math.hypot(c.x-d.x,c.z-d.z)/uvScale:0;
      // 上向きになる順番：a(左)→b(右)→c(右先)／a→c→d(左先)
      this.tri(key,a,b,c,cl,[0,u0],[wA,u0],[wB,u1]);this.tri(key,a,c,d,cl,[0,u0],[wB,u1],[0,u1]);acc+=seg;}}
  // ポリライン沿いの縦の壁（縁石・壁・防音壁）。pts:{x,y,z}、高さh、外向き法線は進行方向の右側(side=+1)か左側(-1)
  wall(key,pts,h,color,side=1,uvScale=0){const cl=typeof color==='object'?color:C(color);let acc=0;
    for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const seg=Math.hypot(b.x-a.x,b.z-a.z);if(seg<1e-4)continue;const A2={x:a.x,y:a.y+h,z:a.z},B2={x:b.x,y:b.y+h,z:b.z};
      const u0=uvScale?acc/uvScale:0,u1=uvScale?(acc+seg)/uvScale:0,vv=uvScale?h/uvScale:0;
      if(side>0){this.tri(key,a,b,B2,cl,[u0,0],[u1,0],[u1,vv]);this.tri(key,a,B2,A2,cl,[u0,0],[u1,vv],[u0,vv]);}
      else{this.tri(key,b,a,A2,cl,[u1,0],[u0,0],[u0,vv]);this.tri(key,b,A2,B2,cl,[u1,0],[u0,vv],[u1,vv]);}acc+=seg;}}
  // 平面多角形（y一定）。凹多角形も可
  poly(key,pts,y,color,uvScale=0){if(pts.length<3)return;const cl=typeof color==='object'?color:C(color);const v2=pts.map(p=>new THREE.Vector2(p[0],p[1]));
    let tris;try{tris=THREE.ShapeUtils.triangulateShape(v2,[]);}catch(e){return;}const s=uvScale;
    for(const t of tris){const P=t.map(i=>({x:pts[i][0],y,z:pts[i][1]}));// 上向きに揃える
      const cr=(P[1].x-P[0].x)*(P[2].z-P[0].z)-(P[1].z-P[0].z)*(P[2].x-P[0].x);const Q=cr>0?[P[0],P[2],P[1]]:P;
      this.tri(key,Q[0],Q[1],Q[2],cl,s?[Q[0].x/s,-Q[0].z/s]:null,s?[Q[1].x/s,-Q[1].z/s]:null,s?[Q[2].x/s,-Q[2].z/s]:null);}}
  // 縦の看板面（標識など）：中心x,y,z、幅w高さhgt、向きh（表は前方fwd(h)向き＝見る人はその前に立つ）
  quad(key,x,y,z,w,hgt,h,u0=0,v0=0,u1=1,v1=1,color=0xffffff){const o=this._grp(key,x,z);const f=fwd(h),r=rightV(h);const c=C(color);
    const L={x:x+r.x*w/2,z:z+r.z*w/2},Rt={x:x-r.x*w/2,z:z-r.z*w/2};const y0=y-hgt/2,y1=y+hgt/2;
    for(const[p,yy,uu,vv]of[[L,y0,u0,v0],[Rt,y0,u1,v0],[Rt,y1,u1,v1],[L,y0,u0,v0],[Rt,y1,u1,v1],[L,y1,u0,v1]])this._v(o,p.x,yy,p.z,f.x,0,f.z,c,uu,vv);}
  build(scene,mats,opts={}){const out=[];for(const o of this.g.values()){if(!o.p.length)continue;const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(o.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(o.n,3));
      g.setAttribute('color',new THREE.Float32BufferAttribute(o.c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(o.u,2));g.computeBoundingSphere();
      const mat=mats[o.key]||mats.def;const mesh=new THREE.Mesh(g,mat);mesh.matrixAutoUpdate=false;mesh.userData.batchKey=o.key;
      const sh=opts.shadow&&opts.shadow[o.key];mesh.castShadow=!!(sh&&sh.cast);mesh.receiveShadow=!!(sh&&sh.recv);
      if(opts.layer)mesh.layers.set(opts.layer);if(opts.order!==undefined)mesh.renderOrder=opts.order;scene.add(mesh);out.push(mesh);this.nv+=o.p.length/3;}
    this.g.clear();return out;}
}
const GEO={};
function initGeo(){if(GEO.box)return;GEO.box=new THREE.BoxGeometry(1,1,1);GEO.cyl=new THREE.CylinderGeometry(1,1,1,12);GEO.cyl6=new THREE.CylinderGeometry(1,1,1,6);
  GEO.sph=new THREE.SphereGeometry(1,10,8);GEO.sphLo=new THREE.IcosahedronGeometry(1,1);GEO.cone=new THREE.ConeGeometry(1,1,8);
  GEO.disc=new THREE.CircleGeometry(0.15,20);GEO.plane=new THREE.PlaneGeometry(1,1);}

// ---- キャンバス・テクスチャ ----
function cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
let MAXANISO=4;
function texFrom(c,rep,srgb=true){const t=new THREE.CanvasTexture(c);if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=MAXANISO;if(srgb)t.encoding=THREE.sRGBEncoding;return t;}
const FONT_JP='"BIZ UDPGothic","Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
const FONT_DISP='"Dela Gothic One","Hiragino Sans","Noto Sans CJK JP",sans-serif';
const FONT_NUM='"Saira Condensed","Arial Narrow","Helvetica Neue",sans-serif';
function txt(c,s,x,y,size,color,font,align='center',weight=''){c.font=`${weight?weight+' ':''}${size}px ${font||FONT_DISP}`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);}
// 文字を幅に合わせて縮める
function txtFit(c,s,x,y,size,maxW,color,font,align='center',weight='bold'){let sz=size;c.font=`${weight} ${sz}px ${font||FONT_JP}`;const w=c.measureText(s).width;
  if(w>maxW){c.save();c.translate(x,y);c.scale(maxW/w,1);c.font=`${weight} ${sz}px ${font||FONT_JP}`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(s,0,0);c.restore();return;}
  c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);}
function noiseFill(x,w,h,base,amp,n,r,sz=2){for(let i=0;i<n;i++){const v=base+(r()-0.5)*amp|0;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(r()*w,r()*h,1+r()*sz,1+r()*sz);}}
function asphaltTex(){const c=cvs(512,512),x=c.getContext('2d');x.fillStyle='#d6d6d6';x.fillRect(0,0,512,512);const r=rng(7);
  noiseFill(x,512,512,214,70,26000,r,2.2);
  for(let i=0;i<30;i++){x.fillStyle=`rgba(${r()<0.5?150:235},${r()<0.5?150:235},${r()<0.5?150:235},.08)`;x.beginPath();x.ellipse(r()*512,r()*512,20+r()*70,10+r()*40,r()*3,0,7);x.fill();}
  for(let i=0;i<10;i++){x.strokeStyle='rgba(90,90,90,.22)';x.lineWidth=1+r();x.beginPath();let px=r()*512,py=r()*512;x.moveTo(px,py);for(let k=0;k<7;k++){px+=r()*40-20;py+=r()*40-20;x.lineTo(px,py);}x.stroke();}
  return texFrom(c,true);}
function sidewalkTex(){const c=cvs(256,256),x=c.getContext('2d');x.fillStyle='#e8e4dc';x.fillRect(0,0,256,256);const r=rng(11);
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){const v=222+r()*22|0;x.fillStyle=`rgb(${v},${v-3},${v-8})`;x.fillRect(i*32+1,j*32+1,30,30);}
  noiseFill(x,256,256,200,60,3000,r,1.5);x.strokeStyle='rgba(120,115,105,.35)';x.lineWidth=1.2;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32,256);x.stroke();x.beginPath();x.moveTo(0,i*32);x.lineTo(256,i*32);x.stroke();}
  return texFrom(c,true);}
function grassTex(){const c=cvs(256,256),x=c.getContext('2d');x.fillStyle='#c9c9c9';x.fillRect(0,0,256,256);const r=rng(3);
  for(let i=0;i<9000;i++){const v=150+r()*105|0;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(r()*256,r()*256,1,2+r()*3);}return texFrom(c,true);}
function concreteTex(){const c=cvs(256,256),x=c.getContext('2d');x.fillStyle='#d8d8d8';x.fillRect(0,0,256,256);const r=rng(19);noiseFill(x,256,256,210,40,9000,r,2);
  x.strokeStyle='rgba(100,100,100,.25)';for(let i=0;i<=2;i++){x.beginPath();x.moveTo(0,i*128);x.lineTo(256,i*128);x.stroke();}return texFrom(c,true);}
// 住宅の壁
function houseTex(){const c=cvs(256,256),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,256);
  for(let i=0;i<256;i+=8){x.fillStyle=i%16?'#f3f3f3':'#ebebeb';x.fillRect(0,i,256,8);}
  x.fillStyle='#4f5b63';x.fillRect(70,80,116,100);x.fillStyle='#8ea3b0';x.fillRect(76,86,50,88);x.fillRect(130,86,50,88);
  x.fillStyle='rgba(255,255,255,.35)';x.fillRect(80,90,10,80);x.strokeStyle='#d0d0d0';x.lineWidth=6;x.strokeRect(66,76,124,108);
  x.fillStyle='#c9c9c9';x.fillRect(60,186,136,8);return texFrom(c,true);}
// ビルの窓（style: 0=事務所の連窓,1=マンションのベランダ,2=ガラス張り,3=雑居ビル,4=古い団地）／lit=夜の明かり用
function facadeTex(style,lit){const W=256,H=256,c=cvs(W,H),x=c.getContext('2d');const r=rng(100+style*7+(lit?1:0));
  if(lit){x.fillStyle='#000';x.fillRect(0,0,W,H);}else{x.fillStyle='#fff';x.fillRect(0,0,W,H);}
  const win=(px,py,w,h,base)=>{if(lit){if(r()<0.42){const k=r();x.fillStyle=k<0.6?'#ffe2a8':k<0.85?'#fff4dc':'#cfe6ff';x.fillRect(px,py,w,h);}}else{x.fillStyle=base;x.fillRect(px,py,w,h);}};
  if(style===0){for(let j=0;j<4;j++){const y=j*64;if(!lit){x.fillStyle='#e9e9e6';x.fillRect(0,y,W,64);x.fillStyle='#cfd1d0';x.fillRect(0,y+50,W,4);}
      for(let i=0;i<4;i++){win(i*64+4,y+10,56,38,'#5f7584');if(!lit){x.fillStyle='rgba(255,255,255,.18)';x.fillRect(i*64+8,y+12,14,34);x.fillStyle='#9aa4aa';x.fillRect(i*64+31,y+10,2,38);}}}}
  else if(style===1){for(let j=0;j<4;j++){const y=j*64;if(!lit){x.fillStyle='#efede8';x.fillRect(0,y,W,64);}
      for(let i=0;i<2;i++){win(i*128+16,y+8,96,40,'#6f8592');if(!lit){x.fillStyle='#d9d6cf';x.fillRect(i*128+8,y+42,112,18);x.fillStyle='#bdb9b0';x.fillRect(i*128+8,y+42,112,3);x.fillStyle='#c8c4bb';x.fillRect(i*128+122,y,6,64);}}}}
  else if(style===2){if(!lit){const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#7f98a8');g.addColorStop(0.5,'#a9bfcc');g.addColorStop(1,'#6e8798');x.fillStyle=g;x.fillRect(0,0,W,H);}
    for(let j=0;j<8;j++)for(let i=0;i<8;i++){if(lit){win(i*32+2,j*32+3,28,26);}else{x.fillStyle=`rgba(255,255,255,${0.05+r()*0.08})`;x.fillRect(i*32+2,j*32+3,28,26);}}
    if(!lit){x.fillStyle='#53626c';for(let j=0;j<=8;j++)x.fillRect(0,j*32,W,3);for(let i=0;i<=8;i++)x.fillRect(i*32,0,2,H);}}
  else if(style===3){for(let j=0;j<4;j++){const y=j*64;if(!lit){x.fillStyle=['#e6e0d4','#d9d4cc','#e8e6e1'][j%3];x.fillRect(0,y,W,64);}
      for(let i=0;i<3;i++){win(i*85+8,y+12,70,36,'#62707a');}if(!lit){x.fillStyle='#b8b2a6';x.fillRect(0,y+56,W,4);}}}
  else{for(let j=0;j<4;j++){const y=j*64;if(!lit){x.fillStyle='#d8d3c8';x.fillRect(0,y,W,64);}for(let i=0;i<4;i++){win(i*64+14,y+14,36,30,'#5b6770');}
      if(!lit){x.fillStyle='#c2bcb0';x.fillRect(0,y+50,W,10);x.fillStyle='#9a958c';for(let i=0;i<4;i++)x.fillRect(i*64+12,y+50,40,2);}}}
  if(!lit){noiseFill(x,W,H,200,60,1400,r,1.5);}
  return texFrom(c,true);}

