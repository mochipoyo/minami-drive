// ===== 03b_buildings.js : 建物（住宅・アパート・商店・事務所・ビル） =====
const BUILT=[];// 建物のAABB
function roofGable(B,cx,cz,y,w,d,hr,ry,color){const o=B._grp('def',cx,cz);const c=C(color);const cs=Math.cos(ry),sn=Math.sin(ry);
  const T=(lx,ly,lz)=>({x:cx+lx*cs+lz*sn,y:y+ly,z:cz-lx*sn+lz*cs});const ov=0.45,W=w/2+ov,D=d/2+ov;
  const A=T(-W,0,-D),Bp=T(W,0,-D),Cc=T(W,0,D),Dp=T(-W,0,D),E=T(-W,hr,0),F=T(W,hr,0);
  B.tri('def',Dp,Cc,F,c);B.tri('def',Dp,F,E,c);B.tri('def',Bp,A,E,c);B.tri('def',Bp,E,F,c);B.tri('def',A,Dp,E,c);B.tri('def',Cc,Bp,F,c);}
function roofHip(B,cx,cz,y,w,d,hr,ry,color){const c=C(color);const cs=Math.cos(ry),sn=Math.sin(ry);const T=(lx,ly,lz)=>({x:cx+lx*cs+lz*sn,y:y+ly,z:cz-lx*sn+lz*cs});const ov=0.5,W=w/2+ov,D=d/2+ov;const k=Math.min(W,D)*0.9;
  const A=T(-W,0,-D),Bp=T(W,0,-D),Cc=T(W,0,D),Dp=T(-W,0,D);const E=T(-(W-k)*(W>D?1:0),hr,0),F=T((W-k)*(W>D?1:0),hr,0);
  B.tri('def',Dp,Cc,F,c);B.tri('def',Dp,F,E,c);B.tri('def',Bp,A,E,c);B.tri('def',Bp,E,F,c);B.tri('def',A,Dp,E,c);B.tri('def',Cc,Bp,F,c);}
function overlapsBuilt(x0,z0,x1,z1,m=0.5){for(const b of BUILT)if(x0<b.x1+m&&x1>b.x0-m&&z0<b.z1+m&&z1>b.z0-m)return true;return false;}
// 道路・交差点・歩道にかからないか（9点＋縁をチェック）
function clearOfRoads(x0,z0,x1,z1,m){if(m===undefined)m=0.8;for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){const x=lerp(x0-m,x1+m,i/4),z=lerp(z0-m,z1+m,j/4);const q=locate(x,z);if(!q)continue;
    if(q.kind==='node'||q.kind==='lot')return false;if(q.band!=='off')return false;}
  for(const n of NET.nodes){if(n.kind!=='x')continue;const mm=(NET.map&&NET.map.nodeMargin!==undefined)?NET.map.nodeMargin:6;if(x0<n.x+n.hx+mm&&x1>n.x-n.hx-mm&&z0<n.z+n.hz+mm&&z1>n.z-n.hz-mm)return false;}
  for(const k of(NET.map&&NET.map.keepOut)||[]){if(x0<k.x1&&x1>k.x0&&z0<k.z1&&z1>k.z0)return false;}
  const M=NET.map&&NET.map.bounds;if(M&&(x0<M[0]||x1>M[2]||z0<M[1]||z1>M[3]))return false;return true;}
const PAL={house:[0xe9e2d4,0xd8d2c6,0xf1efe9,0xcfc6b5,0xbfc9cf,0xe6d9c3,0xd9cfc2,0xc9cdd2],roof:[0x4b4f57,0x5a3f33,0x31475e,0x6b6f73,0x7a4a3a,0x3c4a3a],
  apt:[0xe8e4dc,0xd2cdc3,0xbfb9ae,0xc9b8a6,0xdde3e6],shop:[0xe7e3d8,0xd1c8b8,0xbfc4c6],awning:[0xb33a32,0x2f6b9a,0x3f7d4f,0xd49a2a,0x6c4f8f],
  office:[0xc4ccd2,0xd5d8da,0xb4bfc7,0xe2e2de,0xa9b2b8],tower:[0x9fb3c2,0x8aa0b0,0xb9c4cc,0x7f93a2]};
// 建物：kind=house/apt/shop/office/tower/mansion/zakkyo
function addBuilding(B,kind,cx,cz,w,d,ry,opt={}){
  const ax=Math.abs(Math.sin(ry))>0.5;const ex=ax?d:w,ez=ax?w:d;const bb={x0:cx-ex/2,x1:cx+ex/2,z0:cz-ez/2,z1:cz+ez/2};
  if(!opt.force&&(!clearOfRoads(bb.x0,bb.z0,bb.x1,bb.z1,opt.m)||overlapsBuilt(bb.x0,bb.z0,bb.x1,bb.z1,opt.gapM)))return false;BUILT.push(bb);const y0=opt.y||0;
  const f=fwd(ry);
  if(kind==='house'){const h=5.8;B.wallBox('house',cx,cz,y0,w,h,d,pick(PAL.house),ry,3.4,2.9);(R()<0.6?roofGable:roofHip)(B,cx,cz,y0+h,w,d,2.1,ry,pick(PAL.roof));
    if(R()<0.5){const px=cx+f.x*(d/2+1.8),pz=cz+f.z*(d/2+1.8);B.box('def',px,y0+0.05,pz,ax?2.4:w*0.5,0.1,ax?w*0.5:2.4,0x9a968e,0);}}
  else if(kind==='apt'){const fl=opt.fl||2+Math.floor(R()*3),h=fl*3;B.wallBox('fac1',cx,cz,y0,w,h,d,pick(PAL.apt),ry,6.4,3*2);B.box('def',cx,y0+h+0.3,cz,ex+0.3,0.6,ez+0.3,0x9a9690);
    // 外階段
    if(R()<0.6){const sx=cx+rightV(ry).x*(w/2+0.8),sz=cz+rightV(ry).z*(w/2+0.8);B.box('def',sx,y0+h/2,sz,ax?1.4:1.6,h,ax?1.6:1.4,0xbdb8ae);}}
  else if(kind==='shop'){const fl=1+Math.floor(R()*2),h=fl*3.4;B.wallBox('fac3',cx,cz,y0,w,h,d,pick(PAL.shop),ry,8,6.8);B.box('def',cx,y0+h+0.25,cz,ex+0.2,0.5,ez+0.2,0x8f8b85);
    B.box('def',cx+f.x*(d/2+0.6),y0+2.9,cz+f.z*(d/2+0.6),ax?1.2:w*0.9,0.18,ax?w*0.9:1.2,pick(PAL.awning));shopFront(B,cx,cz,y0,w,d,ry);}
  else if(kind==='office'){const fl=opt.fl||4+Math.floor(R()*5),h=fl*3.4;B.wallBox('fac0',cx,cz,y0,w,h,d,pick(PAL.office),ry,Math.max(6,w/Math.round(w/7)),6.8);B.box('def',cx,y0+h+0.4,cz,ex+0.2,0.8,ez+0.2,0x7d8288);roofStuff(B,cx,cz,y0+h+0.8,ex,ez);}
  else if(kind==='tower'){const fl=opt.fl||12+Math.floor(R()*20),h=fl*3.6;B.wallBox('fac2',cx,cz,y0,w,h,d,pick(PAL.tower),ry,8,7.2);B.box('def',cx,y0+h+0.6,cz,ex+0.3,1.2,ez+0.3,0x6f7880);
    B.box('def',cx,y0+h+2.4,cz,ex*0.5,2.4,ez*0.5,0x8a929a);B.wallBox('fac0',cx,cz,y0,w+0.6,4.5,d+0.6,0x5c646b,ry,8,4.5);roofStuff(B,cx,cz,y0+h+1.2,ex,ez);}
  else if(kind==='mansion'){const fl=opt.fl||6+Math.floor(R()*8),h=fl*3.1;B.wallBox('fac1',cx,cz,y0,w,h,d,pick(PAL.apt),ry,6.4,6.2);B.box('def',cx,y0+h+0.3,cz,ex+0.4,0.6,ez+0.4,0x9a9690);roofStuff(B,cx,cz,y0+h+0.6,ex,ez);}
  else if(kind==='zakkyo'){const fl=opt.fl||4+Math.floor(R()*6),h=fl*3.3;B.wallBox('fac3',cx,cz,y0,w,h,d,pick([0xd9d2c6,0xc9c2b4,0xe2ddd2,0xbcb5aa]),ry,8.5,6.6);B.box('def',cx,y0+h+0.3,cz,ex+0.2,0.6,ez+0.2,0x8f8b85);
    shopFront(B,cx,cz,y0,w,d,ry);if(opt.signs!==false)vertSigns(B,cx,cz,y0,w,d,ry,h);roofStuff(B,cx,cz,y0+h+0.6,ex,ez);}
  return true;}
// 屋上の設備（室外機・給水塔）
function roofStuff(B,cx,cz,y,ex,ez){const n=1+Math.floor(R()*3);for(let i=0;i<n;i++){const x=cx+(R()-0.5)*ex*0.6,z=cz+(R()-0.5)*ez*0.6;if(R()<0.5)B.box('def',x,y+0.5,z,1.2,1.0,0.8,0xcfd1d0);else{B.cyl('def',x,y+1.6,z,0.9,1.8,0xb9b9b4,6);B.box('def',x,y+0.35,z,1.6,0.7,1.6,0x8f9396);}}}
// 1階の店先（ガラス）
function shopFront(B,cx,cz,y0,w,d,ry){const f=fwd(ry);const px=cx+f.x*(d/2+0.03),pz=cz+f.z*(d/2+0.03);const r=rightV(ry);
  for(let k=-1;k<=1;k+=2){}B.quad('glow',px,y0+1.4,pz,w*0.86,2.2,ry,0,0,1,1,R()<0.5?0x9fb6c4:0xc7d3d9);}
// 縦の袖看板（雑居ビル）
const SHOPNAMES=['居酒屋','歯科','ラーメン','カラオケ','不動産','整骨院','学習塾','焼肉','薬局','美容室','中華','そば','喫茶','英会話','麻雀','パン','眼科','書店','花','珈琲'];
const SIGNCOL=['#c8241e','#1d4f9c','#f2b600','#2f7d3a','#7b2b8f','#e26a00','#0b6e7a','#222'];
const SHOPSIGN=[];// {x,y,z,h,w,hh,text,col}（旧方式：1枚ずつ描く。今はアトラスに描いてまとめる）
function vertSigns(B,cx,cz,y0,w,d,ry,h){const f=fwd(ry),r=rightV(ry);const n=Math.min(4,Math.floor(h/3.3)-1);const side=R()<0.5?-1:1;
  for(let i=0;i<n;i++){const px=cx+f.x*(d/2+0.35)+r.x*side*(w/2-0.6),pz=cz+f.z*(d/2+0.35)+r.z*side*(w/2-0.6);
    shopSignQuad(B,pick(SHOPNAMES),pick(SIGNCOL),px,y0+4.2+i*3.3,pz,0.7,2.8,ry+Math.PI/2,true);B.box('def',px-f.x*0.3,y0+4.2+i*3.3+1.25,pz-f.z*0.3,0.06,0.06,0.6,0x666666,ry);}}
// ---- 看板の文字（アトラス）：店名などを1枚の大きなキャンバスにまとめて描き、描画の呼び出しを減らす ----
// 上半分：縦看板（64×256）を32列×4段、下半分：横看板（256×64）を8列×16段
const SHOPATLAS={c:null,x:null,map:new Map(),nV:0,nH:0,tex:null};
function shopAtlasReset(){if(!SHOPATLAS.c){SHOPATLAS.c=cvs(2048,2048);SHOPATLAS.x=SHOPATLAS.c.getContext('2d');}SHOPATLAS.x.clearRect(0,0,2048,2048);SHOPATLAS.map.clear();SHOPATLAS.nV=0;SHOPATLAS.nH=0;SHOPATLAS.dirty=true;}
function shopCell(text,bg,fg,vert,style){const k=(vert?'V':'H')+'|'+text+'|'+bg+'|'+(fg||'')+'|'+(style||'');let e=SHOPATLAS.map.get(k);if(e)return e;const A=SHOPATLAS;const x=A.x;
  let cx,cy,W,H;if(vert){if(A.nV>=128){return[...A.map.values()].find(q=>q.vert)||null;}const i=A.nV++;W=64;H=256;cx=(i%32)*64;cy=Math.floor(i/32)*256;}
  else{if(A.nH>=128){return[...A.map.values()].find(q=>!q.vert)||null;}const i=A.nH++;W=256;H=64;cx=(i%8)*256;cy=1024+Math.floor(i/8)*64;}
  x.save();x.translate(cx,cy);x.fillStyle=bg;x.fillRect(1,1,W-2,H-2);const ink=fg||'#ffffff';
  if(style==='neon'){x.strokeStyle=ink;x.lineWidth=3;x.strokeRect(5,5,W-10,H-10);}else{x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=2;x.strokeRect(3,3,W-6,H-6);}
  if(vert){const ch=[...text];const sz=Math.min(46,(H-16)/ch.length);ch.forEach((c,i)=>txt(x,c,W/2,8+sz*(i+0.5),sz*0.92,ink,FONT_JP,'center','bold'));}
  else if(text.includes('\n')){const[a,b]=text.split('\n');txtFit(x,a,W/2,H*0.38,30,W-16,ink,FONT_JP,'center','bold');txtFit(x,b,W/2,H*0.78,15,W-16,ink,/[^\x00-\x7f]/.test(b)?FONT_JP:FONT_NUM,'center','bold');}
  else txtFit(x,text,W/2,H/2+1,40,W-20,ink,FONT_JP,'center','bold');
  x.restore();A.dirty=true;e={vert,uv:[(cx+2)/2048,1-(cy+H-2)/2048,(cx+W-2)/2048,1-(cy+2)/2048]};A.map.set(k,e);return e;}
// 看板1枚（表と裏に同じ文字）
function shopSignQuad(B,text,bg,x,y,z,w,hh,h,vert,opt={}){const e=shopCell(text,bg,opt.fg,vert,opt.style);if(!e)return;const[u0,v0,u1,v1]=e.uv;const f=fwd(h);
  B.quad('shopsign',x+f.x*0.02,y,z+f.z*0.02,w,hh,h,u0,v0,u1,v1);if(opt.back!==false)B.quad('shopsign',x-f.x*0.02,y,z-f.z*0.02,w,hh,h+Math.PI,u0,v0,u1,v1);
  if(opt.box!==false)B.box('def',x,y,z,Math.abs(f.x)>0.5?0.03:w,hh,Math.abs(f.x)>0.5?w:0.03,0x333333,0);}
function shopAtlasCommit(){const A=SHOPATLAS;if(!A.c)return;if(!A.tex){A.tex=texFrom(A.c,false);A.tex.anisotropy=MAXANISO;MAT.shopsign=new THREE.MeshBasicMaterial({map:A.tex,vertexColors:true});MAT.shopsign.userData={};}
  if(A.dirty){A.tex.needsUpdate=true;A.dirty=false;}}
// 住宅地の塀・生け垣
function fence(B,x0,z0,x1,z1,h=1.1,col){const L=Math.hypot(x1-x0,z1-z0);if(L<0.5)return;B.box('def',(x0+x1)/2,h/2,(z0+z1)/2,Math.abs(x1-x0)>Math.abs(z1-z0)?L:0.15,h,Math.abs(x1-x0)>Math.abs(z1-z0)?0.15:L,col||pick([0xb8b5ad,0xc2bfb7,0xa9a69e]));}
// 道路沿いに建物を並べる
function lineBuildings(B,opt){const kinds=opt.kinds;R=rng(opt.seed||42);
  for(const r of NET.roads){if(opt.filter&&!opt.filter(r))continue;const res=r.type==='RES';
    for(const side of[-1,1]){let s=res?6:10;const kk=typeof kinds==='function'?kinds(r):kinds;
      while(s<r.len-(res?6:10)){const sz=opt.size?opt.size(r,kk):null;const w=sz?sz[0]:(res?8+R()*3:10+R()*8),d=sz?sz[1]:(res?8+R()*3:11+R()*7);
        const[lo,hi]=r.tRange(s+w/2);const walk=r.walk[side<0?0:1]||0;const edge=side<0?lo-walk:hi+walk;const set=(res?2.0+R()*1.5:1.2+R()*1.5)+(opt.setback||0);
        const t=edge+side*(set+d/2);const P=r.pt(s+w/2,t);const hRoad=r.at(s+w/2).h;const ry=side<0?hRoad+Math.PI/2:hRoad-Math.PI/2;// 道路側を向く
        const kind=pick(kk);addBuilding(B,kind,P.x,P.z,w,d,snapAng(ry),{y:P.y});s+=w+(res?1.2+R()*2:1+R()*3);}}}}
const snapAng=(a)=>{const q=Math.round(a/(Math.PI/2))*(Math.PI/2);return Math.abs(wrapA(a-q))<0.2?q:a;};
// Batchに壁（窓テクスチャ）付きの箱を追加
Batch.prototype.wallBox=function(key,cx,cz,y0,sx,sy,sz,color,ry,uvW=3.2,uvH=3){const o=this._grp(key,cx,cz);const c=C(color);
  const cs=Math.cos(ry),sn=Math.sin(ry);const T=(lx,lz)=>({x:cx+lx*cs+lz*sn,z:cz-lx*sn+lz*cs});
  const hx=sx/2,hz=sz/2;const faces=[[[-hx,hz],[hx,hz],[0,0,1],sx],[[hx,hz],[hx,-hz],[1,0,0],sz],[[hx,-hz],[-hx,-hz],[0,0,-1],sx],[[-hx,-hz],[-hx,hz],[-1,0,0],sz]];
  for(const[a,b,nn,len]of faces){const A=T(a[0],a[1]),Bq=T(b[0],b[1]);const nx=nn[0]*cs+nn[2]*sn,nz=-nn[0]*sn+nn[2]*cs;const uu=Math.max(1,Math.round(len/uvW)),vv=Math.max(1,Math.round(sy/uvH));
    const q=[[A,y0,0,0],[Bq,y0,uu,0],[Bq,y0+sy,uu,vv],[A,y0,0,0],[Bq,y0+sy,uu,vv],[A,y0+sy,0,vv]];
    for(const[p,yy,u,v]of q)this._v(o,p.x,yy,p.z,nx,0,nz,c,u,v);}
  // 屋根（天面）
  const tp=[T(-hx,-hz),T(hx,-hz),T(hx,hz),T(-hx,hz)];const tc=C(0x8d8a85);for(const[p,u,v]of[[tp[0],0,0],[tp[2],1,1],[tp[1],1,0],[tp[0],0,0],[tp[3],0,1],[tp[2],1,1]])this._v(o,p.x,y0+sy,p.z,0,1,0,tc,0,0);};

