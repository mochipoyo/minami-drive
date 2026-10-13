// ===== 04_models.js : 車・歩行者・自転車・電車のモデル =====
// 部品をまとめて1つのジオメトリにする（頂点カラー）
function mergeParts(parts){const p=[],n=[],c=[],ex=[];const v=new V3(),m=new THREE.Matrix4(),nm=new THREE.Matrix3();let hasEx=false;
  for(const q of parts){let g;if(q.geo){g=q.geo;}else{const geo=(q.g==='cyl'?GEO.cyl:q.g==='cyl6'?GEO.cyl6:q.g==='sph'?GEO.sph:q.g==='cone'?GEO.cone:GEO.box);g=geo;}
    g=g.index?g.toNonIndexed():g;
    if(q.m)m.copy(q.m);else m.compose(new V3(q.x||0,q.y||0,q.z||0),new THREE.Quaternion().setFromEuler(new THREE.Euler(q.rx||0,q.ry||0,q.rz||0)),new V3(q.sx||1,q.sy||1,q.sz||1));nm.getNormalMatrix(m);const col=C(q.c);
    const P=g.attributes.position,N=g.attributes.normal;for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(m);p.push(v.x,v.y,v.z);v.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();n.push(v.x,v.y,v.z);c.push(col.r,col.g,col.b);ex.push(q.lt!==undefined?q.lt:-1);if(q.lt!==undefined)hasEx=true;}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
  if(hasEx)g.setAttribute('ltype',new THREE.Float32BufferAttribute(ex,1));g.computeBoundingSphere();return g;}
const GEOCACHE=new Map();
function modelMats(env){
  MAT.model=new THREE.MeshLambertMaterial({vertexColors:true});
  MAT.paint=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.38,metalness:0.35,envMap:env||null,envMapIntensity:0.9});
  MAT.lampR=basic(0xff2a1f);MAT.lampOffR=lambert(0x4a1a1a);}
// ---- 車の形（横から見た輪郭を押し出す） ----
const CARTYPES={
  kei:{L:3.39,W:1.47,H:1.75,c:0.16,belt:0.92,hood:0.86,nose:0.55,ws:0.95,roofF:0.62,roofR:-1.55,rg:-1.66,tail:0.95,plate:'kei'},
  compact:{L:3.99,W:1.69,H:1.50,c:0.15,belt:0.93,hood:0.80,nose:0.85,ws:0.92,roofF:0.22,roofR:-1.62,rg:-1.92,tail:0.9},
  sedan:{L:4.69,W:1.78,H:1.45,c:0.15,belt:0.92,hood:0.82,nose:1.15,ws:1.05,roofF:0.42,roofR:-0.9,rg:-1.65,tail:0.92,trunk:1},
  van:{L:4.69,W:1.70,H:1.90,c:0.17,belt:1.0,hood:0.92,nose:0.75,ws:1.45,roofF:1.05,roofR:-2.25,rg:-2.3,tail:1.0},
  suv:{L:4.60,W:1.85,H:1.70,c:0.21,belt:1.05,hood:1.0,nose:1.0,ws:1.05,roofF:0.4,roofR:-1.95,rg:-2.15,tail:1.05},
  taxi:{L:4.40,W:1.70,H:1.75,c:0.16,belt:0.98,hood:0.88,nose:0.9,ws:1.0,roofF:0.55,roofR:-1.75,rg:-2.0,tail:0.98,taxi:1,plate:'green'},
  police:{L:4.9,W:1.80,H:1.47,c:0.15,belt:0.92,hood:0.84,nose:1.2,ws:1.1,roofF:0.45,roofR:-0.95,rg:-1.75,tail:0.94,trunk:1,police:1},
  truck:{L:4.8,W:1.72,H:2.35,truck:1,plate:'green'},big:{L:9.5,W:2.49,H:3.4,truck:2,plate:'green'},bus:{L:10.5,W:2.49,H:3.05,bus:1,plate:'green'},amb:{L:5.65,W:1.89,H:2.5,amb:1},
};
const CARCOL=[0xf4f4f2,0xf4f4f2,0xf4f4f2,0x1c1d20,0x9aa1a8,0xb7bcc0,0x7a1f25,0x24406e,0x3d5f45,0xd9c9a3,0x5d6064,0xa7b8c9,0x8e2f3a];
function shapeOf(pts){const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);s.closePath();return s;}
function extrudeSide(pts,W,bevel=0.05){const g=new THREE.ExtrudeGeometry(shapeOf(pts),{depth:Math.max(0.01,W-2*bevel),bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel*0.8,bevelSegments:2,curveSegments:1});
  // 形のx→車の前後(前が-z)、押し出し→車の幅(x)
  const m=new THREE.Matrix4().set(0,0,1,-(W-2*bevel)/2,0,1,0,0,-1,0,0,0,0,0,0,1);g.applyMatrix4(m);return g;}
function carGeo(type,color){const T=CARTYPES[type];const L=T.L,W=T.W,H=T.H;const P=[];const win=0x1d2a33,blk=0x1b1d20,tire=0x151617,chrome=0xb8bcc0;
  const box=(x,y,z,sx,sy,sz,c,o)=>P.push(Object.assign({g:'box',x,y,z,sx,sy,sz,c},o||{}));
  if(T.bus){box(0,1.72,0,W,2.55,L,color);box(0,1.95,0.3,W+0.02,0.95,L-1.6,win);box(0,1.85,-L/2+0.02,W-0.25,1.45,0.05,win);box(0,0.42,0,W-0.1,0.4,L-0.4,0x3a3d40);box(0,3.08,0,W-0.5,0.16,L*0.5,0xd8d8d8);
    box(0,1.12,0,W+0.03,0.2,L-0.2,0x2f7d5b);box(0,2.82,-L/2+0.03,W-0.4,0.32,0.04,0x111111);box(-W/2-0.01,1.6,-L/2+2.2,0.03,1.9,1.1,win);}
  else if(T.truck===1){box(0,1.2,-L/2+0.85,W,1.75,1.7,color);box(0,1.6,-L/2+0.02,W-0.18,0.72,0.05,win);box(0,1.6,-L/2+0.9,W+0.02,0.6,1.25,win);box(0,1.55,0.8,W+0.12,2.25,3.2,0xe2e2e0);box(0,0.48,0,W-0.1,0.3,L-0.3,0x2a2a2a);}
  else if(T.truck===2){box(0,1.45,-L/2+1.1,W,2.3,2.2,color);box(0,1.95,-L/2+0.02,W-0.2,0.85,0.05,win);box(0,1.95,-L/2+1.15,W+0.02,0.7,1.6,win);box(0,2.0,1.25,W+0.06,3.0,L-2.6,0xd9dbdc);box(0,0.6,0,W-0.15,0.4,L-0.3,0x2a2a2a);}
  else if(T.amb){box(0,1.28,0,W,1.98,L,0xf7f7f5);box(0,1.55,-L/2+0.95,W+0.02,0.62,1.45,win);box(0,1.55,-L/2+0.03,W-0.22,0.62,0.05,win);box(0,1.0,0,W+0.03,0.2,L-0.3,0xd42a2a);box(0,0.42,0,W-0.1,0.3,L-0.2,0x2d2d2d);}
  else{const c0=T.c,b=T.belt,zf=L/2,zr=-L/2;// 前が+x（形の座標）
    const body=[[zr,c0+0.1],[zr-0.02,T.tail-0.15],[zr+0.05,T.tail],[zr+0.18,b+0.02],[T.ws*1.0+(T.trunk?0:0),b+0.04],[zf-0.12,T.hood],[zf+0.01,T.hood-0.2],[zf+0.02,c0+0.22],[zf-0.08,c0+0.08]];
    if(T.trunk){body.splice(3,1,[zr+0.15,b+0.06],[T.roofR-0.55,b+0.1]);}
    const g1=extrudeSide(body,W,0.06);P.push({geo:g1,c:color});
    // 窓まわり（ガラス）と屋根
    const gl=[[T.rg,b+0.02],[T.roofR,H-0.06],[T.roofF,H-0.06],[T.ws,b+0.04]];const g2=extrudeSide(gl,W-0.1,0.03);P.push({geo:g2,c:win});
    const rf=[[T.roofR+0.04,H-0.09],[T.roofR+0.08,H],[T.roofF-0.06,H],[T.roofF-0.02,H-0.09]];P.push({geo:extrudeSide(rf,W-0.12,0.03),c:color});
    // 柱（Bピラー）と下回り・バンパー
    const pz=-(T.roofF+T.roofR)/2;box(-W/2+0.06,(b+H)/2,pz,0.04,H-b-0.05,0.12,color);box(W/2-0.06,(b+H)/2,pz,0.04,H-b-0.05,0.12,color);
    box(0,c0+0.18,-L/2+0.06,W+0.02,0.22,0.14,blk);box(0,c0+0.18,L/2-0.06,W+0.02,0.22,0.14,blk);box(0,c0+0.05,0,W-0.25,0.1,L-0.7,0x222222);
    // ドアミラー
    for(const s of[-1,1])box(s*(W/2+0.08),b+0.08,-T.ws+0.1-(-0),0.12,0.1,0.16,color);
    if(T.taxi){box(0,H+0.13,-0.15,0.5,0.24,0.22,0xf2c200);box(0,H+0.02,-0.15,0.6,0.04,0.3,0x333333);}
    if(T.police){box(0,H+0.08,-0.2,1.0,0.12,0.28,0x333333);box(0,0.7,0,W+0.01,0.5,L*0.5,0x111111);}}
  // タイヤ
  const wb=T.bus?1.9:T.truck===2?1.8:0.74;const tr=T.bus||T.truck===2?0.5:T.truck?0.36:0.31;
  for(const sx of[-1,1])for(const sz of[-1,1]){const zz=sz*(L/2-wb);P.push({g:'cyl',x:sx*(W/2-0.13),y:tr,z:zz,sx:tr,sy:0.22,sz:tr,c:tire,rz:Math.PI/2});P.push({g:'cyl',x:sx*(W/2-0.02),y:tr,z:zz,sx:tr*0.55,sy:0.02,sz:tr*0.55,c:chrome,rz:Math.PI/2});}
  // ナンバープレート
  const pc=T.plate==='kei'?0xf2d24a:T.plate==='green'?0x1f6b3a:0xf4f4f0;const py=T.bus?0.7:T.truck?0.62:0.52;box(0,py,-L/2-0.02,0.33,0.17,0.02,pc);box(0,py+(T.bus?0.3:0.1),L/2+0.02,0.33,0.17,0.02,pc);
  return mergeParts(P);}
// ライト（ltype: 0=前照灯 1=尾灯/制動灯 2=左ウインカー 3=右ウインカー 4=回転灯 5=車幅灯）
function carLightGeo(type){const k='L:'+type;let g=GEOCACHE.get(k);if(g)return g;const T=CARTYPES[type];const L=T.L,W=T.W;const P=[];
  const ty=T.bus?0.95:T.truck?0.8:T.tail||0.8,hy=T.bus?0.85:T.truck?0.85:(T.hood||0.8)-0.12;const b=(x,y,z,sx,sy,sz,lt)=>P.push({g:'box',x,y,z,sx,sy,sz,c:0xffffff,lt});
  for(const s of[-1,1]){b(s*(W/2-0.22),hy,-L/2-0.015,0.32,0.13,0.04,0);b(s*(W/2-0.2),ty-0.08,L/2+0.015,0.3,0.14,0.04,1);if(!T.bus&&!T.truck)b(s*(W/2-0.45),ty-0.13,L/2+0.017,0.14,0.07,0.04,6);
    b(s*(W/2-0.05),hy,-L/2-0.01,0.1,0.1,0.05,s<0?2:3);b(s*(W/2-0.05),ty-0.08,L/2+0.01,0.1,0.12,0.05,s<0?2:3);b(s*(W/2+0.005),(T.belt||0.9)-0.15,-L/2+0.7,0.03,0.05,0.14,s<0?2:3);}
  if(T.amb||T.police){for(const s of[-1,1])b(s*0.42,(T.H||1.5)+0.1,T.police?-0.2:-L/2+0.95,0.42,0.14,0.26,4);}
  if(T.bus){b(0,2.82,-L/2-0.01,W-0.6,0.24,0.03,5);}
  g=mergeParts(P);GEOCACHE.set(k,g);return g;}
// ライトの状態ごとのマテリアル（1台2描画）
const LIGHTMATS=new Map();
function lightMat(st){const key=(st.head?1:0)|(st.brake?2:0)|(st.tl?4:0)|(st.tr?8:0)|(st.beacon?16:0)|(st.beacon2?32:0)|(st.tail?64:0)|(st.rev?128:0);let m=LIGHTMATS.get(key);if(m)return m;
  m=new THREE.ShaderMaterial({vertexColors:false,fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
    vertexShader:`attribute float ltype;varying float vT;\n#include <fog_pars_vertex>\nvoid main(){vT=ltype;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader:`varying float vT;\n#include <fog_pars_fragment>\nvoid main(){vec3 c;float t=floor(vT+0.5);
      if(t<0.5)c=${(key&1)?'vec3(3.2,3.1,2.8)':'vec3(0.55,0.56,0.55)'};
      else if(t<1.5)c=${(key&2)?'vec3(3.0,0.12,0.06)':(key&64)?'vec3(1.2,0.05,0.03)':'vec3(0.28,0.03,0.03)'};
      else if(t<2.5)c=${(key&4)?'vec3(3.0,1.2,0.05)':'vec3(0.35,0.2,0.05)'};
      else if(t<3.5)c=${(key&8)?'vec3(3.0,1.2,0.05)':'vec3(0.35,0.2,0.05)'};
      else if(t<4.5)c=${(key&16)?'vec3(3.5,0.1,0.08)':(key&32)?'vec3(0.9,0.02,0.02)':'vec3(0.3,0.03,0.03)'};
      else if(t<5.5)c=vec3(1.5,1.2,0.4);
      else c=${(key&128)?'vec3(3.4,3.4,3.2)':'vec3(0.5,0.5,0.48)'};
      gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n#include <fog_fragment>\n}`});
  LIGHTMATS.set(key,m);return m;}
function makeCar(type,color){const T=CARTYPES[type];const key=type+':'+color;let g=GEOCACHE.get(key);if(!g){g=carGeo(type,color);GEOCACHE.set(key,g);}
  const grp=new THREE.Group();const body=new THREE.Mesh(g,MAT.paint||MAT.model);body.castShadow=true;grp.add(body);
  const lights=new THREE.Mesh(carLightGeo(type),lightMat({}));grp.add(lights);
  return{grp,body,lights,L:T.L,W:T.W,H:T.H,type,st:-1};}
function setCarLights(c,st){// st:{brake,turnL,turnR,head,beacon,blink}
  const s={head:st.head,brake:st.brake,tail:st.head,tl:st.turnL&&st.blink,tr:st.turnR&&st.blink,beacon:st.beacon&&st.blink,beacon2:st.beacon&&!st.blink,rev:st.rev};
  const key=(s.head?1:0)|(s.brake?2:0)|(s.tl?4:0)|(s.tr?8:0)|(s.beacon?16:0)|(s.beacon2?32:0)|(s.tail?64:0)|(s.rev?128:0);if(c.st===key)return;c.st=key;c.lights.material=lightMat(s);}
// ---- 歩行者（インスタンス描画用の部品） ----
const PEDKIND={
  adult:{h:1.68,tops:[0x3a4a6a,0x6b4b3b,0x2f2f33,0x7a7f86,0x9b3b3b,0xd9d1c0,0x2b3a55,0xe8e2d6],bottoms:[0x2a2d33,0x404a5a,0x5b4a3a,0x22262b]},
  suit:{h:1.72,tops:[0x22262e,0x2c3340,0x3a3f47],bottoms:[0x22262e,0x2c3340],shirt:1},
  kid:{h:1.25,hat:0xf2d200,bag:0x9b1d22,tops:[0x2f6db5,0xe07a5f,0x3d8b5a,0xf4f1de],bottoms:[0x26344f,0x3b3b3b]},
  student:{h:1.62,tops:[0x1f2a44,0x22262b],bottoms:[0x1f2a44,0x3c4350],bag:0x222222},
  old:{h:1.55,cane:1,tops:[0x6b5d4f,0x55606b,0x8a7f72],bottoms:[0x4a4440,0x5b5550]}};
function pedGeo(kind,top,bottom,hair){const K=PEDKIND[kind];const s=K.h/1.7;const skin=0xe2b996;
  const P=[{g:'box',x:0,y:1.13*s,z:0,sx:0.42*s,sy:0.6*s,sz:0.24*s,c:top},{g:'sph',x:0,y:1.56*s,z:0,sx:0.13*s,sy:0.155*s,sz:0.135*s,c:skin},{g:'sph',x:0,y:1.62*s,z:0.02,sx:0.14*s,sy:0.11*s,sz:0.145*s,c:hair},
    {g:'box',x:-0.27*s,y:1.1*s,z:0,sx:0.1*s,sy:0.56*s,sz:0.12*s,c:top},{g:'box',x:0.27*s,y:1.1*s,z:0,sx:0.1*s,sy:0.56*s,sz:0.12*s,c:top},{g:'box',x:0,y:0.82*s,z:0,sx:0.36*s,sy:0.12*s,sz:0.22*s,c:bottom}];
  if(K.shirt)P.push({g:'box',x:0,y:1.32*s,z:-0.122*s,sx:0.1*s,sy:0.18*s,sz:0.01,c:0xf2f2f2});
  if(K.hat)P.push({g:'cyl',x:0,y:1.71*s,z:0,sx:0.16*s,sy:0.1*s,sz:0.16*s,c:K.hat},{g:'cyl',x:0,y:1.65*s,z:0,sx:0.22*s,sy:0.02,sz:0.22*s,c:K.hat});
  if(K.bag)P.push({g:'box',x:0,y:1.16*s,z:0.2*s,sx:0.34*s,sy:0.4*s,sz:0.17*s,c:K.bag});
  if(K.cane)P.push({g:'box',x:0.32,y:0.45,z:-0.15,sx:0.03,sy:0.9,sz:0.03,c:0x5a3d22});
  return mergeParts(P);}
function legGeo(kind,bottom){const K=PEDKIND[kind];const s=K.h/1.7;return mergeParts([{g:'box',x:0,y:-0.4*s,z:0,sx:0.15*s,sy:0.8*s,sz:0.16*s,c:bottom},{g:'box',x:0,y:-0.8*s,z:-0.04,sx:0.15*s,sy:0.07,sz:0.24*s,c:0x1e1e1e}]);}
// 自転車（人つき）
function makeBike(kind){const P=[];const fr=pick([0x9aa3ab,0xc0392b,0x2e86c1,0xf2f2f2,0x27ae60,0x222222]);const top=pick([0x34495e,0x7f8c8d,0xa04000,0x1e8449,0xf4f1de,0x6a3d7a]);
  for(const z of[-0.55,0.55])P.push({g:'cyl',x:0,y:0.34,z,sx:0.33,sy:0.04,sz:0.33,c:0x202020,rz:Math.PI/2});
  P.push({g:'box',x:0,y:0.55,z:0,sx:0.04,sy:0.05,sz:1.0,c:fr},{g:'box',x:0,y:0.75,z:0.1,sx:0.04,sy:0.5,sz:0.04,c:fr},{g:'box',x:0,y:0.88,z:-0.5,sx:0.52,sy:0.04,sz:0.04,c:0x444444});
  if(kind!=='road')P.push({g:'box',x:0,y:0.76,z:-0.66,sx:0.34,sy:0.22,sz:0.28,c:0x555555});
  P.push({g:'box',x:0,y:1.25,z:0.05,sx:0.4,sy:0.6,sz:0.24,c:top,rx:-0.2},{g:'sph',x:0,y:1.68,z:-0.05,sx:0.13,sy:0.155,sz:0.135,c:0xe2b996},{g:'sph',x:0,y:1.74,z:-0.03,sx:0.14,sy:0.11,sz:0.145,c:pick([0x1a1410,0x3a2a1c])},
    {g:'box',x:-0.12,y:0.75,z:-0.1,sx:0.13,sy:0.6,sz:0.14,c:0x2a2d33},{g:'box',x:0.12,y:0.75,z:-0.1,sx:0.13,sy:0.6,sz:0.14,c:0x2a2d33},{g:'box',x:-0.2,y:1.25,z:-0.3,sx:0.08,sy:0.08,sz:0.5,c:top},{g:'box',x:0.2,y:1.25,z:-0.3,sx:0.08,sy:0.08,sz:0.5,c:top});
  if(kind==='helmet')P.push({g:'sph',x:0,y:1.76,z:-0.04,sx:0.17,sy:0.12,sz:0.19,c:0xf2f2f2});
  const g=mergeParts(P);const grp=new THREE.Group();const m=new THREE.Mesh(g,MAT.model);m.castShadow=true;grp.add(m);return{grp,L:1.8,W:0.6,H:1.8,type:'bike',lights:null};}
// バイク
function makeMoto(){const P=[];const col=pick([0x1c1d20,0xc0392b,0x2e4f8a,0xf2f2f2]);
  for(const z of[-0.68,0.68])P.push({g:'cyl',x:0,y:0.32,z,sx:0.32,sy:0.1,sz:0.32,c:0x1a1a1a,rz:Math.PI/2});
  P.push({g:'box',x:0,y:0.6,z:0,sx:0.3,sy:0.32,sz:1.1,c:col},{g:'box',x:0,y:0.85,z:0.15,sx:0.28,sy:0.12,sz:0.6,c:0x222222},{g:'box',x:0,y:1.0,z:-0.55,sx:0.65,sy:0.05,sz:0.05,c:0x444444},
    {g:'box',x:0,y:1.3,z:0.1,sx:0.42,sy:0.58,sz:0.28,c:0x2b2f36,rx:-0.35},{g:'sph',x:0,y:1.72,z:-0.06,sx:0.17,sy:0.17,sz:0.19,c:pick([0xf2f2f2,0x111111,0xc0392b])},
    {g:'box',x:-0.13,y:0.85,z:-0.05,sx:0.13,sy:0.42,sz:0.14,c:0x2a2d33},{g:'box',x:0.13,y:0.85,z:-0.05,sx:0.13,sy:0.42,sz:0.14,c:0x2a2d33});
  const g=mergeParts(P);const grp=new THREE.Group();const m=new THREE.Mesh(g,MAT.model);m.castShadow=true;grp.add(m);
  const lg=mergeParts([{g:'box',x:0,y:0.95,z:-0.75,sx:0.16,sy:0.12,sz:0.04,c:0xffffff,lt:0},{g:'box',x:0,y:0.8,z:0.75,sx:0.14,sy:0.08,sz:0.04,c:0xffffff,lt:1},{g:'box',x:-0.2,y:0.9,z:-0.72,sx:0.06,sy:0.06,sz:0.04,c:0xffffff,lt:2},{g:'box',x:0.2,y:0.9,z:-0.72,sx:0.06,sy:0.06,sz:0.04,c:0xffffff,lt:3}]);
  const lights=new THREE.Mesh(lg,lightMat({}));grp.add(lights);return{grp,L:2.0,W:0.75,H:1.8,type:'moto',lights,st:-1};}
// 電車
function makeTrainCar(cab,stripe=0x1f8a6d){const L=19.5,W=2.9,H=3.6;const P=[{g:'box',x:0,y:1.0+H/2,z:0,sx:W,sy:H,sz:L,c:0xd5d9dc},{g:'box',x:0,y:2.65,z:0,sx:W+0.02,sy:0.9,sz:L-2,c:0x2b3540},
    {g:'box',x:0,y:1.55,z:0,sx:W+0.03,sy:0.22,sz:L,c:stripe},{g:'box',x:0,y:3.95,z:0,sx:W+0.03,sy:0.12,sz:L,c:stripe},{g:'box',x:0,y:0.75,z:0,sx:W-0.3,sy:0.5,sz:L-1,c:0x333333},{g:'box',x:0,y:4.7,z:-4,sx:1.2,sy:0.4,sz:1.6,c:0x444444}];
  for(let z=-L/2+2;z<L/2-1;z+=4.5)P.push({g:'box',x:0,y:2.0,z,sx:W+0.04,sy:2.0,sz:1.3,c:0x8a939a});
  if(cab)P.push({g:'box',x:0,y:2.7,z:-L/2-0.01,sx:W-0.6,sy:1.1,sz:0.05,c:0x1b2128});
  const g=mergeParts(P);const m=new THREE.Mesh(g,MAT.model);m.castShadow=true;return m;}

