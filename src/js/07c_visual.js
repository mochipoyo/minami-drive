// ===== 07c_visual.js : 見た目の強化（素材なし・描画だけ）。運転の物理・採点には触れない =====
// - 建物の壁：足もと（地面から約3.5m）を暗くして、角の陰（アンビエントオクルージョン）のように見せる
// - 路面：品質「高」では凹凸（法線マップ）つきの材質。雨では濡れて光る
// - 車の塗装：品質「高」ではクリアコート（つやのある塗装）
// - 空：雲（07b_view.js の空のシェーダーで描く。ここでは量だけ決める）
const VIS={q:'high',roadStd:null,roadLam:null};
// 建物の壁の足もとを暗くする（uv の縦方向 v は「階数」単位：0が地面。v=1.15（約3.5m）までを暗くする）
function facadeAO(mat){mat.onBeforeCompile=(sh)=>{sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n#ifdef USE_UV\n diffuseColor.rgb*=mix(0.6,1.0,smoothstep(0.0,1.15,vUv.y));\n#endif');};mat.customProgramCacheKey=()=>'facAO';}
// アスファルトの凹凸（高さ）から法線マップを作る
function asphaltNormalTex(){const N=512;const c=cvs(N,N),x=c.getContext('2d');x.fillStyle='#808080';x.fillRect(0,0,N,N);const r=rng(23);
  // 高さ：粒（細かい凹凸）＋ゆるいうねり＋ひび
  const hgt=new Float32Array(N*N);for(let i=0;i<N*N;i++)hgt[i]=0.5;
  for(let k=0;k<70000;k++){const px=(r()*N)|0,py=(r()*N)|0;const v=(r()-0.5)*0.9;const s=1+((r()*2)|0);for(let j=0;j<s;j++)for(let i=0;i<s;i++)hgt[((py+j)%N)*N+((px+i)%N)]+=v;}
  for(let k=0;k<18;k++){const cx=r()*N,cy=r()*N,rad=30+r()*90,amp=(r()-0.5)*0.5;for(let y=0;y<N;y++)for(let xx=0;xx<N;xx++){let dx=Math.abs(xx-cx),dy=Math.abs(y-cy);dx=Math.min(dx,N-dx);dy=Math.min(dy,N-dy);const d=Math.hypot(dx,dy);if(d<rad)hgt[y*N+xx]+=amp*(1-d/rad);}}
  for(let k=0;k<12;k++){let px=r()*N,py=r()*N;for(let j=0;j<60;j++){px+=r()*6-3;py+=r()*6-3;const ix=((px|0)%N+N)%N,iy=((py|0)%N+N)%N;hgt[iy*N+ix]-=1.4;hgt[iy*N+((ix+1)%N)]-=0.7;}}
  // 法線（周期境界）
  const img=x.createImageData(N,N);const d=img.data;const str=0.9;
  for(let y=0;y<N;y++)for(let xx=0;xx<N;xx++){const L=hgt[y*N+((xx-1+N)%N)],Rr=hgt[y*N+((xx+1)%N)],U=hgt[((y-1+N)%N)*N+xx],D=hgt[((y+1)%N)*N+xx];
    let nx=-(Rr-L)*str,ny=-(D-U)*str,nz=1;const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;const o=(y*N+xx)*4;d[o]=(nx*0.5+0.5)*255;d[o+1]=(-ny*0.5+0.5)*255;d[o+2]=(nz*0.5+0.5)*255;d[o+3]=255;}
  x.putImageData(img,0,0);return texFrom(c,true,false);}
// 雲の模様（繰り返す画像。r：雲の形（値ノイズを重ねたもの）、g：明るさ）。空のシェーダー（07b）が参照する
let CLOUDTEX=null;
function cloudTex(){if(CLOUDTEX)return CLOUDTEX;const N=512;const c=cvs(N,N),x=c.getContext('2d');const r=rng(31);
  // 値ノイズ（周期境界）：格子の乱数を補間
  const oct=(sz)=>{const g=new Float32Array(sz*sz);for(let i=0;i<g.length;i++)g[i]=r();const f=new Float32Array(N*N);const sm=(t)=>t*t*(3-2*t);
    for(let y=0;y<N;y++){const gy=y/N*sz,iy=Math.floor(gy),fy=sm(gy-iy),iy1=(iy+1)%sz;for(let xx=0;xx<N;xx++){const gx=xx/N*sz,ix=Math.floor(gx),fx=sm(gx-ix),ix1=(ix+1)%sz;
      const a=g[iy*sz+ix],b=g[iy*sz+ix1],cc=g[iy1*sz+ix],d=g[iy1*sz+ix1];f[y*N+xx]=(a+(b-a)*fx)+((cc+(d-cc)*fx)-(a+(b-a)*fx))*fy;}}return f;};
  const o=[oct(4),oct(8),oct(16),oct(32),oct(64)];const img=x.createImageData(N,N);const d=img.data;
  for(let i=0;i<N*N;i++){const n=0.5*o[0][i]+0.25*o[1][i]+0.125*o[2][i]+0.0625*o[3][i]+0.03*o[4][i];const lit=0.5*o[1][i]+0.3*o[2][i]+0.2*o[3][i];
    d[i*4]=Math.min(255,n*255);d[i*4+1]=Math.min(255,lit*255);d[i*4+2]=0;d[i*4+3]=255;}
  x.putImageData(img,0,0);CLOUDTEX=texFrom(c,true,false);CLOUDTEX.minFilter=THREE.LinearMipMapLinearFilter;return CLOUDTEX;}
// 起動時：材質を差し替える（品質ごと）。makeMaterials・modelMats のあとに呼ぶ
function visualEnhance(q){VIS.q=q;
  for(const k of['fac0','fac1','fac2','fac3','fac4','house'])if(MAT[k])facadeAO(MAT[k]);// 'wall' は高速道路の防音壁にも使われる（uvが0）ので対象外
  if(q==='high'){
    // 路面：凹凸つき。雨のときは setEnv で roughness を下げて濡れた見た目にする
    VIS.roadLam=MAT.road;TEX.asphN=asphaltNormalTex();
    MAT.road=new THREE.MeshStandardMaterial({vertexColors:true,map:TEX.asph,normalMap:TEX.asphN,normalScale:new THREE.Vector2(0.55,0.55),roughness:0.9,metalness:0.0,envMapIntensity:0.25});VIS.roadStd=MAT.road;
    // 車の塗装：クリアコート
    if(MAT.paint){const old=MAT.paint;MAT.paint=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:0.42,metalness:0.25,clearcoat:0.7,clearcoatRoughness:0.12,envMap:old.envMap||null,envMapIntensity:0.9});}}}
// 天候が変わったとき（setEnv から）：路面の濡れ具合・路面の映り込み
function visualEnv(mode,W){if(typeof carPaintEnv==='function')carPaintEnv(envRT?envRT.texture:null);const rd=VIS.roadStd;if(rd){const wet=mode==='rain';rd.roughness=wet?0.5:0.9;rd.metalness=0;rd.envMapIntensity=wet?0.7:0.25;rd.color.setScalar(wet?0.62:1);const had=!!rd.envMap;rd.envMap=envRT?envRT.texture:null;if(had!==!!rd.envMap)rd.needsUpdate=true;}
  // 前照灯：路面が1画素ごとに照らされる材質（品質「高」）では、照らす範囲を絞って「光の溜まり」が見えるようにする
  if(VIS.roadStd&&PLAYER&&PLAYER.headL){const L=PLAYER.headL;L.distance=75;L.decay=1.7;L.angle=0.52;L.penumbra=0.6;}}
