// ===== 04b_carassets.js : 車の3Dモデル（assets/cars/*.glb）を読み込み、生成した形（04_models.js）と差し替える =====
// - 起動後に裏で読み込む。読み込めない（オフライン・file:// で開いた・古いブラウザ）ときは、今までの生成した形のまま動く
// - 当たり判定・物理の寸法（CARTYPES の L/W/H）は変えない。モデルは同じ寸法で作ってある（tools/cars/gen_cars.py）
// - ライトは GLB の light_<種類>_<LOD>_<番号> という名前のメッシュをひとつにまとめ、ltype 属性で種類を伝える（04_models.js の lightMat と同じ仕組み）
// - 近く用（_0）と遠く用（_1）の2段階。品質「低」ではいつも遠く用
const CARASSET={base:'assets/',kinds:['kei','compact','sedan','van','suv','taxi','police','amb','truck','big','bus'],loader:null,geo:{},models:new Set(),state:'idle',paint:new Map(),loaded:0,errors:0};
const CARLT={head:0,tail:1,turnL:2,turnR:3,beacon:4,marker:5,rev:6};
function carAssetsStart(){if(CARASSET.state!=='idle')return;
  // 確認版（1ファイル）では、読み込みの部品とモデルをページに埋め込んでおける：window.__CARASSET_INLINE={urls:{kind:dataURL}}
  const inl=window.__CARASSET_INLINE;if(inl&&inl.urls&&THREE.GLTFLoader&&typeof MeshoptDecoder!=='undefined'){CARASSET.urls=inl.urls;CARASSET.state='loading';const L=new THREE.GLTFLoader();L.setMeshoptDecoder(MeshoptDecoder);CARASSET.loader=L;for(const k of CARASSET.kinds)carAssetLoad(k);return;}
  if(location.protocol==='file:'){CARASSET.state='off';return;}CARASSET.state='loading';
  const load=(src)=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=res;s.onerror=()=>rej(new Error('script '+src));document.head.appendChild(s);});
  load(CARASSET.base+'lib/GLTFLoader.js').then(()=>load(CARASSET.base+'lib/meshopt_decoder.js')).then(()=>{const L=new THREE.GLTFLoader();L.setMeshoptDecoder(MeshoptDecoder);CARASSET.loader=L;for(const k of CARASSET.kinds)carAssetLoad(k);})
    .catch((e)=>{CARASSET.state='off';console.warn('car assets: off',e&&e.message);});}
function carAssetLoad(kind){const url=CARASSET.urls?CARASSET.urls[kind]:CARASSET.base+'cars/'+kind+'.glb';if(!url){CARASSET.errors++;carAssetDone();return;}CARASSET.loader.load(url,(g)=>{try{CARASSET.geo[kind]=carAssetParse(g.scene);CARASSET.loaded++;carAssetUpgradeAll(kind);}catch(e){CARASSET.errors++;console.warn('car asset',kind,e&&e.message);}carAssetDone();},undefined,()=>{CARASSET.errors++;carAssetDone();});}
function carAssetDone(){if(CARASSET.loaded+CARASSET.errors>=CARASSET.kinds.length)CARASSET.state=CARASSET.loaded?'ready':'off';}
function carAssetsReady(){return CARASSET.state==='ready'||CARASSET.state==='off';}
// 属性を float に（量子化された法線・色をそのまま行列で変換しないため）
function attrToFloat(a){if(!a||a.array instanceof Float32Array)return a;const n=a.count*a.itemSize;const f=new Float32Array(n);const arr=a.array;const norm=a.normalized;
  const mx=arr instanceof Int8Array?127:arr instanceof Uint8Array?255:arr instanceof Int16Array?32767:arr instanceof Uint16Array?65535:1;for(let i=0;i<n;i++)f[i]=norm?Math.max(-1,arr[i]/mx):arr[i];return new THREE.BufferAttribute(f,a.itemSize);}
function bakeGeo(o){let g=o.geometry;const m=o.matrixWorld;const ident=m.elements.every((v,i)=>Math.abs(v-((i%5)===0?1:0))<1e-6);
  if(!ident){g=g.clone();for(const k of['position','normal','color'])if(g.attributes[k])g.setAttribute(k,attrToFloat(g.attributes[k]));g.applyMatrix4(m);}
  g.computeBoundingSphere();return g;}
function carAssetParse(root){root.updateMatrixWorld(true);const out={body:[null,null],detail:[null,null],lights:null};const lt=[];
  root.traverse((o)=>{if(!o.isMesh)return;const nm=o.name||'';
    if(nm.startsWith('body_'))out.body[+nm[5]]=bakeGeo(o);else if(nm.startsWith('detail_'))out.detail[+nm[7]]=bakeGeo(o);
    else if(nm.startsWith('light_')){const p=nm.split('_');if(p[2]!=='0')return;const t=CARLT[p[1]];if(t===undefined)return;lt.push({g:bakeGeo(o),t});}});
  if(!out.body[0]||!out.detail[0]||!lt.length)throw new Error('incomplete glb');
  // ライトをひとつの形にまとめ、種類を ltype 属性に入れる
  const P=[],N=[],T=[];for(const{g,t}of lt){const ng=g.index?g.toNonIndexed():g;const p=attrToFloat(ng.attributes.position),n=attrToFloat(ng.attributes.normal);
    for(let i=0;i<p.count;i++){P.push(p.getX(i),p.getY(i),p.getZ(i));N.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0);T.push(t);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('ltype',new THREE.Float32BufferAttribute(T,1));g.computeBoundingSphere();out.lights=g;
  return out;}
// 塗装色ごとの材質（MAT.paint と同じ設定。頂点色は使わない）
function carPaint(color){let m=CARASSET.paint.get(color);if(m)return m;m=MAT.paint.clone();m.vertexColors=false;m.color.copy(C(color));CARASSET.paint.set(color,m);return m;}
// 天候が変わって映り込み（envMap）が変わったとき
function carPaintEnv(tex){for(const m of CARASSET.paint.values()){const had=!!m.envMap;m.envMap=tex;if(had!==!!tex)m.needsUpdate=true;}}
// makeCar が作った車（m）を、読み込んだ形に差し替える。まだ読み込めていなければ覚えておく
function carAssetApply(m){if(CARASSET.state==='off')return false;const A=CARASSET.geo[m.type];if(!A){CARASSET.models.add(m);return false;}if(m.glb)return true;
  m.grp.remove(m.body);m.grp.remove(m.lights);const paint=carPaint(m.color);
  const b0=new THREE.Mesh(A.body[0],paint);b0.castShadow=true;const d0=new THREE.Mesh(A.detail[0],MAT.model);d0.castShadow=true;
  const b1=A.body[1]?new THREE.Mesh(A.body[1],paint):null;const d1=A.detail[1]?new THREE.Mesh(A.detail[1],MAT.model):null;
  const lights=new THREE.Mesh(A.lights,lightMat({}));m.grp.add(b0);m.grp.add(d0);m.grp.add(lights);
  if(b1&&d1){b1.castShadow=true;d1.castShadow=true;b1.visible=false;d1.visible=false;m.grp.add(b1);m.grp.add(d1);}
  m.body=b0;m.lights=lights;m.st=-1;m.glb={b0,d0,b1,d1,lod:0};return true;}
function carAssetUpgradeAll(kind){for(const m of CARASSET.models){if(!m.grp.parent){CARASSET.models.delete(m);continue;}if(m.type!==kind)continue;carAssetApply(m);CARASSET.models.delete(m);}}
// 近く用・遠く用の切り替え（07b の cullTick から。d2 は視点からの距離の2乗）
function carAssetLod(m,d2){const G=m.glb;if(!G||!G.b1)return;const far=ENV.q==='low'||d2>(ENV.q==='high'?90*90:55*55);const lod=far?1:0;if(lod===G.lod)return;G.lod=lod;
  G.b0.visible=G.d0.visible=lod===0;G.b1.visible=G.d1.visible=lod===1;m.body=lod===0?G.b0:G.b1;}
