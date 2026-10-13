// ===== 03e_city.js : さくら区の景色（ビル・駅と高架・都市高速・商店街・看板） =====
// 道路ごとの建物の並べ方（kinds:[種類,重み]、w:間口、d:奥行き、set:歩道からの後退、gap:すき間、fl:階数）
const CITYB={
  AV:{kinds:[['office',3],['tower',2],['mansion',1.2],['hotel',0.5]],w:[16,32],d:[18,28],set:[0.3,1.0],gap:[0,1.2],fl:{office:[8,16],tower:[16,34],mansion:[10,15],hotel:[12,18]}},
  AR:{kinds:[['office',2],['mansion',2],['zakkyo',1.2],['tower',0.4]],w:[12,24],d:[14,22],set:[0.3,0.9],gap:[0,1],fl:{office:[5,12],mansion:[7,13],zakkyo:[5,9],tower:[14,24]}},
  ST:{kinds:[['zakkyo',3],['office',1]],w:[9,18],d:[12,20],set:[0.2,0.6],gap:[0,0.6],fl:{zakkyo:[4,9],office:[6,10]}},
  C2:{kinds:[['mansion',2],['office',1],['shop',1],['zakkyo',1]],w:[10,20],d:[12,18],set:[0.4,1.2],gap:[0,1.5],fl:{mansion:[5,10],office:[4,8],zakkyo:[4,7]}},
  C1:{kinds:[['mansion',2],['apt',1],['shop',1],['zakkyo',1]],w:[9,16],d:[10,16],set:[0.4,1.2],gap:[0.2,1.6],fl:{mansion:[4,8],apt:[3,4],zakkyo:[3,6]}},
  OW:{kinds:[['zakkyo',3],['shop',1]],w:[6,11],d:[10,15],set:[0.15,0.4],gap:[0,0.4],fl:{zakkyo:[3,8]}},
  AL:{kinds:[['zakkyo',2],['shop',2],['house',1]],w:[6,10],d:[8,12],set:[0.2,0.5],gap:[0,0.6],fl:{zakkyo:[2,5]}},
  PED:{kinds:[['arcade',1]],w:[6,10],d:[10,14],set:[0.1,0.3],gap:[0,0.2]},
  RS:{kinds:[['house',4],['apt',1.5],['mansion',0.6]],w:[8,12],d:[8,12],set:[1.5,3],gap:[1,2.5],fl:{mansion:[4,6]}},
};
const SHOPNAMES2=['焼き鳥','とんかつ','回転寿司','定食','ドラッグストア','100円ショップ','カフェ','うどん','牛丼','スーパー','クリーニング','パン工房','花屋','眼鏡','靴','本屋','携帯ショップ','中華そば','和菓子','居酒屋'];
const SIGNBG=['#c8241e','#1d4f9c','#2f7d3a','#e26a00','#7b2b8f','#0b6e7a','#222222','#b8860b','#d6336c'];
function pickW(list){let tot=0;for(const[,w]of list)tot+=w;let x=R()*tot;for(const[k,w]of list){x-=w;if(x<=0)return k;}return list[0][0];}
// 都会の建物（addBuilding の種類に加えて hotel / arcade）
function cityBuilding(B,kind,cx,cz,w,d,ry,opt={}){
  if(kind==='hotel'){const ok=addBuilding(B,'tower',cx,cz,w,d,ry,Object.assign({},opt,{fl:opt.fl}));if(ok){const f=fwd(ry);const fl=opt.fl||14;const top=fl*3.6+2;shopSignQuad(B,'HOTEL SAKURA','#1b2a4a',cx+f.x*(d/2+0.1),top-3.2,cz+f.z*(d/2+0.1),Math.min(w*0.8,10),2.2,ry,false,{fg:'#ffe7a8',back:false,box:false});}return ok;}
  if(kind==='arcade'){// 商店街の店：2〜3階・ひさし・横看板・のれん
    const ax=Math.abs(Math.sin(ry))>0.5;const ex=ax?d:w,ez=ax?w:d;const bb={x0:cx-ex/2,x1:cx+ex/2,z0:cz-ez/2,z1:cz+ez/2};
    if(!clearOfRoads(bb.x0,bb.z0,bb.x1,bb.z1,0.05)||overlapsBuilt(bb.x0,bb.z0,bb.x1,bb.z1,0.1))return false;BUILT.push(bb);const fl=2+(R()<0.4?1:0),h=fl*3.2;const y0=opt.y||0;
    B.wallBox(R()<0.5?'fac3':'fac4',cx,cz,y0,w,h,d,pick([0xe8e0d0,0xd8d0c0,0xcfc5b5,0xe6e2da,0xd9cdb8]),ry,6,6.4);B.box('def',cx,y0+h+0.2,cz,ex+0.2,0.4,ez+0.2,0x8f8b85);
    const f=fwd(ry);B.box('def',cx+f.x*(d/2+0.9),y0+2.75,cz+f.z*(d/2+0.9),ax?1.8:w*0.96,0.12,ax?w*0.96:1.8,pick(PAL.awning));shopFront(B,cx,cz,y0,w,d,ry);
    shopSignQuad(B,pick(SHOPNAMES2.concat(SHOPNAMES)),pick(SIGNBG),cx+f.x*(d/2+0.08),y0+3.5,cz+f.z*(d/2+0.08),w*0.8,0.9,ry,false,{back:false,box:false});
    if(R()<0.6){const r=rightV(ry);const px=cx+f.x*(d/2+0.5)+r.x*(w/2-0.5),pz=cz+f.z*(d/2+0.5)+r.z*(w/2-0.5);B.box('def',px,y0+0.55,pz,0.6,1.1,0.25,0xf2f2f2,ry);}// 立て看板
    return true;}
  const ok=addBuilding(B,kind,cx,cz,w,d,ry,opt);
  if(ok&&(kind==='shop'||kind==='zakkyo'||(kind==='mansion'&&R()<0.3)||(kind==='office'&&R()<0.35))){// 1階の店の横看板
    const f=fwd(ry);shopSignQuad(B,pick(SHOPNAMES2.concat(SHOPNAMES)),pick(SIGNBG),cx+f.x*(d/2+0.06),(opt.y||0)+3.3,cz+f.z*(d/2+0.06),Math.min(w*0.75,7),0.8,ry,false,{back:false,box:false});}
  if(ok&&(kind==='office'||kind==='zakkyo')&&R()<0.22){// 屋上の看板
    const f=fwd(ry);const fl=opt.fl||6;const top=fl*(kind==='office'?3.4:3.3)+(opt.y||0);const ww=Math.min(w*0.7,12);
    shopSignQuad(B,pick(['さくら不動産','すし さくら','英会話','カラオケ','学習塾','歯科','保険の相談','中古車','ホテル','カメラ']),pick(SIGNBG),cx+f.x*(d/2-1.5),top+2.4,cz+f.z*(d/2-1.5),ww,2.2,ry,false,{back:true,box:true});
    for(const k of[-0.35,0.35]){const r=rightV(ry);B.box('def',cx+f.x*(d/2-1.6)+r.x*ww*k,top+0.7,cz+f.z*(d/2-1.6)+r.z*ww*k,0.12,1.4,0.12,0x555555);}}
  return ok;}
// 道路に沿って建物を並べる
function cityFrontage(B,tiers){for(const tier of tiers){const spec=CITYB[tier];
    for(const r of NET.roads){if(r.def.tier!==tier)continue;
      for(const side of[-1,1]){let s=3;
        while(s<r.len-3){const w=rrange(spec.w[0],spec.w[1]),d=rrange(spec.d[0],spec.d[1]);
          const[lo,hi]=r.tRange(clamp(s+w/2,0,r.len));const walk=r.walk[side<0?0:1]||0;const edge=side<0?lo-walk:hi+walk;const set=rrange(spec.set[0],spec.set[1]);
          const t=edge+side*(set+d/2);const P=r.pt(clamp(s+w/2,0,r.len),t);const hRoad=r.at(clamp(s+w/2,0,r.len)).h;const ry=snapAng(side<0?hRoad+Math.PI/2:hRoad-Math.PI/2);
          const kind=pickW(spec.kinds);const fr=spec.fl&&spec.fl[kind];const fl=fr?rint(fr[0],fr[1]):undefined;
          const ok=cityBuilding(B,kind,P.x,P.z,w,d,ry,{y:P.y,fl,m:0.05,gapM:0.1});s+=ok?w+rrange(spec.gap[0],spec.gap[1]):1.5;}}}}}
// 街区の内側を埋める（すき間から空き地が見えないように）
function cityInfill(B){const M=NET.map.bounds;for(let x=M[0]+8;x<M[2]-8;x+=15)for(let z=M[1]+8;z<M[3]-8;z+=15){if(R()<0.15)continue;
    const w=12+R()*10,d=12+R()*10;const cx=x+R()*4,cz=z+R()*4;const near=Math.abs(cz)<80?2:cz<-150&&Math.abs(cx)<300?1.4:cz>150?0.5:1;
    const fl=Math.max(2,Math.round((3+R()*7)*near));const kind=fl>12?'office':fl<4?'apt':pick(['office','mansion','mansion']);
    addBuilding(B,kind,cx,cz,w,d,pick([0,Math.PI/2,Math.PI,-Math.PI/2]),{fl});}}
// 外周（地図の外）の街並み：道路の延長を残してビルを並べる
function cityOuter(B){const M=NET.map.bounds;const R2=rng(808);const ext=260;
  const roadsOut=[];for(const n of NET.nodes){if(n.kind!=='portal')continue;roadsOut.push(n);}
  const nearRoad=(x,z)=>roadsOut.some(n=>Math.abs(n.x)>Math.abs(n.z)/0.8?Math.abs(z-n.z)<26&&Math.sign(x)===Math.sign(n.x):Math.abs(x-n.x)<26&&Math.sign(z)===Math.sign(n.z));
  for(let x=M[0]-ext;x<M[2]+ext;x+=26)for(let z=M[1]-ext;z<M[3]+ext;z+=26){if(x>M[0]-6&&x<M[2]+6&&z>M[1]-6&&z<M[3]+6)continue;if(nearRoad(x,z))continue;
    const w=16+R2()*8,d=16+R2()*8,fl=4+Math.floor(R2()*(Math.abs(z)<120?22:12));const h=fl*3.4;const col=pick(PAL.office.concat(PAL.apt),R2);
    B.wallBox(R2()<0.4?'fac2':R2()<0.5?'fac0':'fac1',x,z,0,w,h,d,col,0,7,6.8);B.box('def',x,h+0.3,z,w+0.2,0.6,d+0.2,0x7d8288);}
  // 道路の延長（地図の外へ続いて見えるように）
  for(const n of roadsOut){const e=Object.values(n.legs)[0];if(!e)continue;const r=e.road;const P=e.end==='start'?r.at(0):r.at(r.len);const f=fwd(e.end==='start'?P.h+Math.PI:P.h);
    const[lo,hi]=r.tRange(e.end==='start'?0:r.len);const rt=rightV(P.h);const L=ext+40;
    const q=(a,b,t0,t1,y,col,key)=>{const A=(u,t)=>({x:P.x+f.x*u+rt.x*t,y,z:P.z+f.z*u+rt.z*t});B.quad4(key,A(a,t0),A(b,t0),A(b,t1),A(a,t1),C(col));B.quad4(key,A(a,t1),A(b,t1),A(b,t0),A(a,t0),C(col));};
    q(0,L,lo,hi,0.0,COL.asph,'road');const wl=r.walk[0]||0,wr=r.walk[1]||0;if(wl)q(0,L,lo-wl,lo,0.15,0xd9d4ca,'def');if(wr)q(0,L,hi,hi+wr,0.15,0xd9d4ca,'def');}}
// 遠くの高層ビル群
function citySkyline(B){const R3=rng(919);for(let i=0;i<150;i++){const a=R3()*Math.PI*2;const d=900+R3()*700;const x=Math.cos(a)*d,z=Math.sin(a)*d*0.85;
    const w=30+R3()*50,dd=30+R3()*50,h=50+Math.pow(R3(),1.6)*230;B.wallBox(R3()<0.5?'fac2':'fac0',x,z,0,w,h,dd,pick([0x8fa3b2,0x9aa8b2,0xa7b1b8,0x7f90a0,0xb5bcc2],R3),R3()*Math.PI,8,7.2);}
  // 東京タワー風の電波塔（架空）：遠景のアクセント
  const tx=-1250,tz=-900;for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;B.bar('def',tx+Math.cos(a)*22,0,tz+Math.sin(a)*22,tx+Math.cos(a)*2.5,180,tz+Math.sin(a)*2.5,2.2,2.2,0xd94f2a);}
  B.box('def',tx,60,tz,26,3,26,0xe8e8e8);B.box('def',tx,120,tz,14,3,14,0xe8e8e8);B.cyl('def',tx,200,tz,1.2,45,0xd94f2a,6);}
// ---- 高架の鉄道と駅 ----
function cityRail(B){const z=CITY.RAIL_Z,top=CITY.RAIL_Y;const roadX=[-400,0,400];const isRoad=(x,m)=>roadX.some(c=>Math.abs(x-c)<m);const S=CITY.SITES.station;
  const wideA=S.x0+8,wideB=S.x1-6;
  for(let x=-780;x<780;x+=20){const cx=x+10;const wide=cx>wideA&&cx<wideB;const w=wide?19:11;
    B.box('conc',cx,top-0.75,z,20.02,1.5,w,0xbfbcb4);B.box('conc',cx,top-1.6,z,20.02,0.2,w-1.2,0xa7a49c);// 床版と桁
    for(const sd of[-1,1]){B.box('conc',cx,top+0.6,z+sd*(w/2-0.15),20.02,1.2,0.3,0xcfccc4);}// 壁高欄
    for(const tz of[-2.2,2.2]){B.box('def',cx,top+0.06,z+tz,20,0.12,2.8,COL.ballast);for(const o of[-0.535,0.535])B.box('def',cx,top+0.2,z+tz+o,20,0.12,0.08,COL.rail);}
    if(!isRoad(x,13)){const cols=wide?[-6.5,0,6.5]:[-3.6,3.6];for(const cz of cols)B.box('conc',x,(top-1.5)/2,z+cz,1.3,top-1.5,1.3,0xc6c3bb);B.box('conc',x,top-2.0,z,1.6,1.0,w-0.6,0xb9b6ae);}
    if(((x+780)/20)%2===0){for(const sd of[-1,1]){const pz=z+sd*(w/2-0.6);B.box('def',x,top+3.4,pz,0.22,6.8,0.22,0x8a9096);}B.box('def',x,top+6.6,z,0.16,0.16,w-1.0,0x8a9096);}}
  for(const tz of[-2.2,2.2])B.box('def',0,top+5.8,z+tz,1560,0.03,0.03,0x2a2a2a);// 架線
  // ホーム（2面）と屋根
  for(const sd of[-1,1]){const pz=z+sd*5.6;B.box('conc',(wideA+wideB)/2,top+0.55,pz,wideB-wideA-8,1.1,3.0,0xd7d3ca);B.box('def',(wideA+wideB)/2,top+1.11,pz-sd*1.35,wideB-wideA-8,0.02,0.2,0xf2c200);// 点字ブロックの色
    for(let x=wideA+8;x<wideB-6;x+=10)B.box('def',x,top+2.6,pz+sd*0.6,0.18,3.0,0.18,0x9aa1a7);B.box('def',(wideA+wideB)/2,top+4.15,pz+sd*0.2,wideB-wideA-14,0.18,4.2,0x7f878e);
    TEXTSIGNS.push({x:(wideA+wideB)/2-30,y:top+3.4,z:pz-sd*0.0,h:sd>0?Math.PI:0,w:2.6,hh:0.6,lit:true,spec:{bg:'#ffffff',fg:'#1c2622',bw:0,lines:[{t:'さくら　Sakura',size:0.5,y:0.52,color:'#1c2622'}]}});}
  // 駅舎（高架下）と南口
  B.wallBox('fac2',(S.x0+S.x1)/2+2,z,0,S.x1-S.x0-14,top-1.7,15,0xb7c3cc,0,8,6.8);
  const ex=(S.x0+S.x1)/2+4,ez=-312;B.wallBox('fac3',ex,ez,0,92,7.4,24,0xe7e2d6,0,9,7.4);B.box('def',ex,7.65,ez,93,0.5,25,0x5b6670);
  B.box('def',ex,4.2,S.z0+44.5+0.5,60,0.3,4,0x6d7680);for(const k of[-1,1])B.box('def',ex+k*28,2.1,S.z0+46,0.25,4.2,0.25,0x6d7680);// ひさし
  TEXTSIGNS.push({x:ex,y:6.1,z:-299.9,h:0,w:14,hh:2.2,lit:true,spec:{bg:'#ffffff',fg:'#1c2622',bw:0,lines:[{t:'さくら駅',size:0.5,y:0.38,color:'#1c2622'},{t:'SAKURA STATION',size:0.2,y:0.8,color:'#2b5fa8',font:FONT_DISP}]}});
  BUILT.push({x0:S.x0,x1:S.x1,z0:S.z0,z1:-299});
  // 駅前広場（タクシー乗り場・時計・駐輪場・植え込み）
  const P=CITY.SITES.plaza;B.ground('walk',P.x0-3,P.z0,P.x1,P.z1,0.15,0xffffff,4);B.wall('def',[{x:P.x0-3,y:0,z:P.z1},{x:P.x1,y:0,z:P.z1}],0.15,COL.curb,1);
  for(let x=P.x0+10;x<P.x1-6;x+=22){tree(B,x,P.z0+26,0.9,0.15);B.cyl('def',x,0.35,P.z0+26,1.6,0.4,0xb9b4aa,10);}
  B.cyl('def',P.x0+14,2.4,P.z0+12,0.12,4.8,0x5f666c,8);B.box('def',P.x0+14,4.9,P.z0+12,0.9,0.9,0.25,0xf4f4f0);// 時計
  for(let i=0;i<26;i++){const x=P.x1-10-i*0.75;B.box('def',x,0.55,P.z0+33,0.06,1.0,1.7,pick([0x9aa3ab,0xc0392b,0x2e86c1,0xf2f2f2,0x27ae60,0x222222]));}// 自転車
  B.box('def',P.x1-20,0.05,P.z0+33,22,0.1,2.2,0x9a968e);
  TEXTSIGNS.push({x:P.x0+40,y:2.5,z:P.z1+0.2,h:Math.PI,w:2.2,hh:0.7,lit:false,spec:{bg:'#1d4f9c',lines:[{t:'タクシー乗り場',size:0.42,y:0.5}]}});
  B.box('def',P.x0+40,1.1,P.z1+0.2,0.1,2.2,0.1,0x8a9096);}
// ---- 都市高速（さくら線）の高架：大通りの中央分離帯の上 ----
function cityExpressway(B){const r0=NET.roads.filter(r=>r.def.group==='A0');const y0=10.6,dy=1.2,W=17;
  for(let x=-820;x<820;x+=40){const cx=x+20;B.box('conc',cx,y0+dy/2,0,40.02,dy,W,0xc4c1b9);B.box('conc',cx,y0-0.5,0,40.02,1.0,W-4,0xaeaba3);
    for(const sd of[-1,1]){B.box('conc',cx,y0+dy+0.55,sd*(W/2-0.2),40.02,1.1,0.4,0xd2cfc7);B.box('glass',cx,y0+dy+1.1+1.0,sd*(W/2-0.15),40.02,2.0,0.08,0xa9c4cf);}
    B.box('def',cx,y0+dy+0.02,0,40,0.02,0.15,COL.white);}
  // 橋脚（交差点・右折車線の区間を避ける）
  const nodesX=NET.nodes.filter(n=>n.kind==='x'&&n.z===0).map(n=>n.x);
  for(let x=-800;x<=800;x+=38){if(nodesX.some(nx=>Math.abs(nx-x)<24))continue;const q=locate(x,0);if(q&&q.kind==='road'){const r=q.road;if(r.patches.some(p=>p.kind==='turnR'&&q.s>p.s0-6&&q.s<p.s1+6))continue;}
    B.box('conc',x,(y0-1.0)/2,0,2.4,y0-1.0,2.0,0xc9c6be);B.box('conc',x,y0-1.6,0,3.0,1.6,W-2,0xbcb9b1);}
  // 照明と案内（さくら線）
  for(let x=-800;x<=800;x+=50){B.box('def',x,y0+dy+3.2,0,0.15,4.4,0.15,0x8e959b);B.box('lamp',x,y0+dy+5.3,1.3,0.5,0.12,0.3,0xffffff);B.box('lamp',x,y0+dy+5.3,-1.3,0.5,0.12,0.3,0xffffff);B.box('def',x,y0+dy+5.42,0,0.1,0.1,2.8,0x8e959b);}
  for(const nx of nodesX)for(const sd of[-1,1]){shopSignQuad(B,'都市高速 さくら線','#1f7a52',nx+sd*30,y0+0.6,sd*(W/2+0.06),7,0.9,sd>0?Math.PI:0,false,{back:false,box:false});}}
// ---- 歩道橋 ----
function cityOverpass(B,x){const r=NET.roads.find(q=>q.def.group==='A0'&&x>Math.min(q.at(0).x,q.at(q.len).x)&&x<Math.max(q.at(0).x,q.at(q.len).x));if(!r)return;const yD=5.7;
  const[lo,hi]=r.tRange(r.len/2);const half=Math.max(-lo,hi);const span=half+2.4;const g=0x5f7f7a;
  B.box('def',x,yD,0,2.6,0.5,span*2,g);B.box('def',x,yD+0.3,0,2.4,0.08,span*2,0x8a8f8f);for(const sd of[-1,1]){B.box('def',x+sd*1.25,yD+0.85,0,0.08,1.1,span*2,g);B.box('def',x+sd*1.25,yD+1.38,0,0.1,0.06,span*2,0xb7c2c0);}
  for(const sz of[-1,1]){const zc=sz*(half+3.6);B.box('def',x,yD/2,sz*(half+1.4),0.5,yD,0.5,g);B.box('def',x+3,yD/2,sz*(half+1.4),0.5,yD,0.5,g);
    // 階段（歩道の外側寄り・道路に平行）
    const L=yD/0.55;const sx=x+1.3+L/2;B.boxR('def',sx,yD/2,zc,L+0.3,0.35,2.0,g,0,0,Math.atan2(-yD,L));B.box('def',x+1.3,yD-0.1,zc,2.8,0.3,2.4,g);
    for(const o of[-1,1])B.boxR('def',sx,yD/2+0.95,zc+o*1.0,L,0.06,0.06,0xb7c2c0,0,0,Math.atan2(-yD,L));
}
  // 桁の側面の名前（大通りを走る車から見える）
  for(const sd of[-1,1]){const zc=sd*-7;TEXTSIGNS.push({x:x+sd*-1.33,y:yD-0.02,z:zc,h:sd>0?Math.PI/2:-Math.PI/2,w:5.2,hh:0.42,spec:{bg:'#1d4f9c',bw:0,lines:[{t:'一番町歩道橋',size:0.62,y:0.52}]}});}}
// ---- 商店街のゲート・街灯・旗 ----
function cityShotengai(B){const rs=NET.roads.filter(r=>r.def.group==='G1');for(const r of rs){const[lo,hi]=r.tRange(r.len/2);
    for(let s=6;s<r.len-6;s+=13){for(const t of[lo+0.25,hi-0.25]){const P=r.pt(s,t);B.cyl('def',P.x,2.6,P.z,0.07,5.2,0x7d858c,6);B.box('lamp',P.x,5.3,P.z,0.45,0.3,0.45,0xffffff);
        const f=rightV(r.at(s).h);const sg=t<0?1:-1;B.box('def',P.x+f.x*sg*0.35,4.1,P.z+f.z*sg*0.35,0.04,1.3,0.55,pick([0xd6336c,0xf2b600,0x2f7d3a,0x1d4f9c]),r.at(s).h);}}}
  // 入口のゲート（両端）
  for(const[zz,face]of[[-250,0],[-125,Math.PI]]){const z0=zz+(face===0?9.2:-9.2);const x=-300;
    for(const sx of[-1,1])B.box('def',x+sx*3.35,3.2,z0,0.4,6.4,0.4,0x7a1f25);B.box('def',x,6.4,z0,8.0,0.5,0.6,0x7a1f25);
    shopSignQuad(B,'さくら銀座商店街','#7a1f25',x,5.5,z0,6.4,1.0,face+Math.PI,false,{fg:'#ffe08a',back:true,box:true});}}
// ---- バス停（標柱・上屋・ベンチ） ----
function cityBusStops(B){const out=[];for(const b of CITY.BUS){const q=cityRoadAt(b.road,b.pos);if(!q)continue;const r=q.road,dir=b.dir*q.sign;const s=q.s;if(dir>0?!r.nF:!r.nB)continue;
    const[lo,hi]=r.tRange(s);const walk=r.walk[dir>0?0:1]||2;const tPole=dir>0?lo-0.6:hi+0.6;const P=r.pt(s,tPole);const hv=dir>0?r.at(s).h:r.at(s).h+Math.PI;
    B.cyl('def',P.x,1.3,P.z,0.05,2.6,0xb0b6bb,6);B.cyl('def',P.x,2.75,P.z,0.34,0.06,0xf2f2f2,16);
    shopSignQuad(B,'さくらバス\n'+b.name,'#2f7d3a',P.x,2.75,P.z,0.62,0.62*0.5,hv+Math.PI/2,false,{back:true,box:false});
    const tS=dir>0?lo-walk+1.1:hi+walk-1.1;const Q=r.pt(s+dir*4,tS);B.box('def',Q.x,2.5,Q.z,Math.abs(Math.sin(hv))>0.5?5:1.6,0.12,Math.abs(Math.sin(hv))>0.5?1.6:5,0x6d7680);
    const rv=rightV(hv);const back=r.pt(s+dir*4,tS+(dir>0?-0.75:0.75));B.box('glass',back.x,1.3,back.z,Math.abs(Math.sin(hv))>0.5?5:0.06,2.3,Math.abs(Math.sin(hv))>0.5?0.06:5,0xa9c4cf);B.box('def',Q.x,0.45,Q.z,Math.abs(Math.sin(hv))>0.5?3:0.4,0.1,Math.abs(Math.sin(hv))>0.5?0.4:3,0x8b5a2b);
    out.push({road:r,dir,s,x:P.x,z:P.z,name:b.name});}
  NET.map.busStops=out;}
// ---- 案内標識（方面と方向・車線の矢印）：F形の柱で道路の上に ----
function fSign(B,r,s,dir,w,hh,spec){const e=r._edges(dir,s);const tOut=dir>0?e.outer-r.sh[0]-0.9:e.outer+r.sh[0]+0.9;const P=r.pt(s,tOut);const hv=dir>0?r.at(s).h:r.at(s).h+Math.PI;const rt=rightV(hv);
  const arm=Math.min(9,Math.abs(e.inner-e.outer)*0.75+1);const H=7.4;B.cyl('def',P.x,H/2,P.z,0.16,H,0x9aa0a6,8);B.bar('def',P.x,H-0.3,P.z,P.x+rt.x*arm,H-0.3,P.z+rt.z*arm,0.16,0.16,0x9aa0a6);
  const c={x:P.x+rt.x*(arm-w/2-0.2),z:P.z+rt.z*(arm-w/2-0.2)};const f=fwd(hv);TEXTSIGNS.push({x:c.x,y:H-0.4-hh/2,z:c.z,h:hv,w,hh,spec});B.quad('def',c.x+f.x*0.04,H-0.4-hh/2,c.z+f.z*0.04,w,hh,hv,0,0,0,0,0x8d9298);}
// 交差点の手前に「方面と方向」の標識を立てる
function cityGuides(B){const name=(n,L)=>{const e=n.legs[L];if(!e)return null;const r=e.road;return(CITY.ROADS.find(q=>q.id===r.def.group)||{}).name||r.name;};
  for(const r of NET.roads){if(!['AV','AR'].includes(r.def.tier))continue;for(const dir of[1,-1]){const n=dir>0?r.endNode:r.startNode;if(!n||n.kind!=='x'||!n.signal||r.len<120)continue;const L=dir>0?r.endLeg:r.startLeg;
      const turnLeg=(t)=>{for(const L2 in n.legs){if(L2===L)continue;if(turnOf(legHeading[L],outHeading[L2])===t)return L2;}return null;};
      const lt=turnLeg('L'),st=turnLeg('S'),rtL=turnLeg('R');const dest=(L2)=>{if(!L2)return null;const nm=name(n,L2);const far=L2==='N'?'さくら駅':L2==='S'?'みなみ町':L2==='E'?'東大通り':'西大通り';return[nm.replace(/（.*）/,''),far];};
      const s=dir>0?r.len-95:95;if(s<20||s>r.len-20)continue;
      fSign(B,r,s,dir,5.6,3.0,{dir3:{L:dest(lt),S:dest(st),R:n.noTurn&&n.noTurn[L]&&n.noTurn[L].includes('R')?null:dest(rtL)},bg:'#1d4f9c',pw:512,ph:276});
      // 車線ごとの矢印（進行方向別通行区分）
      const ls=r.allLanes(dir).filter(l=>(l.kind==='main'||l.kind==='turnR')&&(l.arrows||l.kind==='turnR'));if(ls.length>=2){const arrows=ls.sort((a,b)=>(a.tC-b.tC)*dir).map(l=>l.arrows||'R');const s2=dir>0?r.len-48:48;
        fSign(B,r,s2,dir,Math.min(8.5,1.5*arrows.length+0.8),1.7,{lanes:arrows,bg:'#1d4f9c',pw:512,ph:160});}}}}
// 交差点名・道路名の板（アトラスの横看板）
function cityPlates(B){for(const S of SIGS.values()){const n=S.n;const nm=CITY.XNAMES[n.id];if(!nm)continue;const done=new Set();
    for(const hp of S.headPos||[]){if(hp.side!==-1||done.has(hp.L))continue;done.add(hp.L);const mx=(hp.px*0.45+hp.hx*0.55),mz=(hp.pz*0.45+hp.hz*0.55);
      shopSignQuad(B,nm[0]+'\n'+nm[1],'#1d4f9c',mx,(n.y||0)+6.25,mz,2.3,0.58,hp.h+Math.PI,false,{back:false,box:true});}}}
// 標識（指定方向外進行禁止・駐停車禁止・一方通行・歩行者専用・バス優先通行帯）
function citySigns(){const T=CITY;
  for(const r of NET.roads){const g=r.def.group,tier=r.def.tier;
    for(const dir of[1,-1]){if(dir>0?!r.nF:!r.nB)continue;const n=dir>0?r.endNode:r.startNode;const L=dir>0?r.endLeg:r.startLeg;
      if(n&&n.noTurn&&n.noTurn[L]){const sd=stopEdgeDist(n,L);const s=dir>0?r.len-sd-6:sd+6;placeSign(r,s,dir,['dirSL'],{size:0.8,top:2.9});
        const mid=(r._edges(1,s).inner+r._edges(-1,s).inner)/2;placeSign(r,s,dir,['dirSL'],{size:0.8,top:2.9,t:mid});}
      if(tier==='AV'&&r.len>120){placeSign(r,dir>0?40:r.len-40,dir,['sBusPrio'],{size:0.95,top:2.8});placeSign(r,dir>0?r.len*0.55:r.len*0.45,dir,['nostopping'],{size:0.7});}
      if(tier==='AR'&&r.len>100)placeSign(r,dir>0?r.len*0.5:r.len*0.5,dir,['nostopping'],{size:0.7});
      if((tier==='C1'||tier==='C2'||tier==='ST')&&r.len>80)placeSign(r,dir>0?r.len*0.45:r.len*0.55,dir,['noparking'],{size:0.65});}
    if(r.oneway&&(tier==='OW'||tier==='AL')){placeSign(r,8,1,['oneway'],{size:0.9,top:2.6});placeSign(r,r.len-4,-1,['noentry'],{size:0.8,side:'L'});placeSign(r,r.len-4,-1,['noentry'],{size:0.8,side:'R'});}
    if(r.def.pedOnly){for(const dir of[1,-1]){const s=dir>0?4:r.len-4;placeSign(r,s,dir,['ped_only'],{size:0.8,top:2.4});}}}
  // 商店街の入口（交差する道路から見える位置にも）
}
// 公園・神社・ガソリンスタンド・コンビニ・コインパーキング
function cityPlaces(B){const Pk=CITY.SITES.park;B.ground('grass',Pk.x0,Pk.z0,Pk.x1,Pk.z1,0.03,0x6f9a52,8);
  for(const[a,b,c,d]of[[Pk.x0+4,(Pk.z0+Pk.z1)/2-2,Pk.x1-4,(Pk.z0+Pk.z1)/2+2],[(Pk.x0+Pk.x1)/2-2,Pk.z0+4,(Pk.x0+Pk.x1)/2+2,Pk.z1-4]])B.ground('def',a,b,c,d,0.05,0xc2ab84);
  for(let i=0;i<70;i++){const x=Pk.x0+5+R()*(Pk.x1-Pk.x0-10),z=Pk.z0+5+R()*(Pk.z1-Pk.z0-10);if(Math.abs(x-(Pk.x0+Pk.x1)/2)<8||Math.abs(z-(Pk.z0+Pk.z1)/2)<8)continue;tree(B,x,z,1.0+R()*0.7);}
  const pcx=(Pk.x0+Pk.x1)/2+40,pcz=(Pk.z0+Pk.z1)/2+30;B.cyl('def',pcx,0.05,pcz,9,0.1,0x4f7d91,20);// 池
  B.box('def',Pk.x0+30,1.2,Pk.z0+20,0.15,2.4,0.15,0xd04a3a);B.box('def',Pk.x0+36,1.2,Pk.z0+20,0.15,2.4,0.15,0xd04a3a);B.box('def',Pk.x0+33,2.4,Pk.z0+20,6.2,0.12,0.12,0xd04a3a);// ブランコ
  for(const[x,z]of[[Pk.x0+20,Pk.z1-12],[Pk.x1-30,Pk.z0+14],[Pk.x1-60,Pk.z1-10]])B.box('def',x,0.45,z,1.8,0.1,0.5,0x8b5a2b);
  for(const[a,b]of[[Pk.x0,Pk.z0],[Pk.x1,Pk.z0],[Pk.x1,Pk.z1],[Pk.x0,Pk.z1]]){}
  BUILT.push({x0:Pk.x0,x1:Pk.x1,z0:Pk.z0,z1:Pk.z1});
  TEXTSIGNS.push({x:Pk.x0+70,y:1.4,z:Pk.z0-0.1,h:Math.PI,w:3.2,hh:0.7,spec:{bg:'#5b4630',bw:0,lines:[{t:'さくら公園',size:0.55,y:0.52}]}});
  // 神社（鳥居と社）
  const sx=232,sz=258;B.box('def',sx-3,2.6,sz-14,0.45,5.2,0.45,0xc0392b);B.box('def',sx+3,2.6,sz-14,0.45,5.2,0.45,0xc0392b);B.box('def',sx,5.3,sz-14,8.2,0.4,0.6,0x1f1f1f);B.box('def',sx,4.6,sz-14,7.0,0.3,0.4,0xc0392b);
  B.ground('def',sx-1.5,sz-14,sx+1.5,sz+4,0.04,0xb9b2a2);B.wallBox('house',sx,sz+9,0.4,7,3.6,6,0x8b5a2b,0,3,3);roofGable(B,sx,sz+9,4.0,7,6,2.0,0,0x3d4a3f);BUILT.push({x0:sx-12,x1:sx+12,z0:sz-16,z1:sz+18});
  for(let i=0;i<10;i++)tree(B,sx-11+R()*22,sz-6+R()*22,1.2+R()*0.5);
  // ガソリンスタンド（架空の「SAKURA」）
  const gx=455,gz=196;B.ground('def',gx-24,gz-14,gx+24,gz+12,0.03,0x9a9a96);B.box('def',gx,5.6,gz-2,26,0.6,14,0xf2f2f2);B.box('def',gx,5.25,gz-2,26.2,0.25,14.2,0xd6336c);
  for(const k of[-7,0,7]){B.box('def',gx+k,0.8,gz-2,1.2,1.6,0.6,0xe8e8e8);B.box('def',gx+k,3.0,gz-2,0.3,4.6,0.3,0xcccccc);}
  B.wallBox('fac3',gx+14,gz+8,0,10,3.6,6,0xf2f2f2,0,6,3.6);BUILT.push({x0:gx-24,x1:gx+24,z0:gz-14,z1:gz+12});
  shopSignQuad(B,'SAKURA','#d6336c',gx-22,6.5,gz-12.5,3.2,1.2,Math.PI,false,{back:true});B.box('def',gx-22,3.0,gz-12.5,0.25,6,0.25,0x9aa0a6);
  // コンビニ（架空の「さくらマート」）
  for(const[cx,cz,ry]of[[-184,155,Math.PI],[270,-231,0],[-330,155,Math.PI]]){const w=18,d=13;const ax=Math.abs(Math.sin(ry))>0.5;const bb={x0:cx-(ax?d:w)/2,x1:cx+(ax?d:w)/2,z0:cz-(ax?w:d)/2,z1:cz+(ax?w:d)/2};
    if(!clearOfRoads(bb.x0,bb.z0,bb.x1,bb.z1)||overlapsBuilt(bb.x0,bb.z0,bb.x1,bb.z1))continue;BUILT.push(bb);
    B.wallBox('fac3',cx,cz,0,w,4.2,d,0xf6f6f2,ry,8,4.2);B.box('def',cx,4.4,cz,w+0.2,0.4,d+0.2,0x888c90);const f=fwd(ry);
    B.box('def',cx+f.x*(d/2+0.05),3.55,cz+f.z*(d/2+0.05),w,0.5,0.06,0x2f8f4f,ry);B.box('def',cx+f.x*(d/2+0.06),3.1,cz+f.z*(d/2+0.06),w,0.3,0.06,0xf2b600,ry);
    shopSignQuad(B,'さくらマート','#2f8f4f',cx+f.x*(d/2+0.1),3.55,cz+f.z*(d/2+0.1),6,0.5,ry,false,{back:false,box:false});B.quad('glow',cx+f.x*(d/2+0.04),1.35,cz+f.z*(d/2+0.04),w*0.9,2.4,ry,0,0,1,1,0xdfe9ee);}
  // コインパーキング
  const cp={x0:208,x1:236,z0:-121,z1:-101};B.ground('def',cp.x0,cp.z0,cp.x1,cp.z1,0.03,0x6f7378);BUILT.push(cp);
  for(let i=0;i<=5;i++){const x=cp.x0+1+i*4.6;B.box('mark',x,0.05,(cp.z0+cp.z1)/2+3,0.12,0.02,12,0xf2f2f2);}
  TEXTSIGNS.push({x:cp.x0+2,y:3.2,z:cp.z1+0.6,h:Math.PI,w:1.4,hh:1.4,lit:true,spec:{bg:'#f2b600',fg:'#1d4f9c',bw:0,lines:[{t:'P',size:0.8,y:0.5,color:'#1d4f9c',font:FONT_DISP}]}});B.box('def',cp.x0+2,1.3,cp.z1+0.6,0.12,2.6,0.12,0x9aa0a6);
  NET.map.coinP=cp;}
// 大型ビジョン（駅前）
const CITYSCREEN={c:null,x:null,tex:null,t:0,i:0,meshes:[]};
function cityScreens(){const S=CITYSCREEN;if(!S.c){S.c=cvs(256,144);S.x=S.c.getContext('2d');S.tex=texFrom(S.c,false);}S.meshes=[];
  const mat=new THREE.MeshBasicMaterial({map:S.tex});mat.userData={};
  for(const[x,y,z,h,w,hh]of[[14.6,16,-215,Math.PI/2,12,6.75],[-40,15,-262.6,0,13,7.3]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,hh),mat);m.position.set(x,y,z);m.rotation.y=-h;m.userData.mapOwned=true;scene.add(m);S.meshes.push(m);
    const f=fwd(h);const fr=new THREE.Mesh(GEO.box,lambert(0x1c1c1c));fr.scale.set(Math.abs(f.x)>0.5?0.4:w+0.6,hh+0.6,Math.abs(f.x)>0.5?w+0.6:0.4);fr.position.set(x+f.x*0.25,y,z+f.z*0.25);fr.userData.mapOwned=true;fr.userData.ownMat=true;scene.add(fr);}
  drawScreen(0);}
const SCREENADS=[['交通安全','歩行者優先　横断歩道では止まる','#0b6e7a'],['さくら百貨店','秋の大感謝祭','#c8241e'],['さくら区','自転車はヘルメットを','#2f7d3a'],['NEWS','ながらスマホは違反です','#1d4f9c'],['さくら駅','終電 0:28','#7b2b8f']];
function drawScreen(i){const S=CITYSCREEN;const x=S.x;const ad=SCREENADS[i%SCREENADS.length];const g=x.createLinearGradient(0,0,256,144);g.addColorStop(0,ad[2]);g.addColorStop(1,'#111');x.fillStyle=g;x.fillRect(0,0,256,144);
  txtFit(x,ad[0],128,52,38,230,'#ffffff',FONT_JP,'center','bold');txtFit(x,ad[1],128,100,22,236,'#ffe9a8',FONT_JP,'center','bold');S.tex.needsUpdate=true;}
function cityScreenTick(dt){const S=CITYSCREEN;if(!S.meshes.length)return;S.t+=dt;if(S.t>5){S.t=0;S.i++;drawScreen(S.i);}}
// 銀杏の街路樹（10月：まだ緑が多く、少し黄色）
function ginkgo(B,x,z,y=0.15,s=1){B.cyl('def',x,y+1.7*s,z,0.15*s,3.4*s,0x6b5a46,6);const c=pick([0x5f8a3a,0x6a9140,0x739a42,0x7d9f44,0x8aa648]);B.sphL('leaf',x,y+4.4*s,z,1.75*s,2.3*s,1.75*s,c);B.sphL('leaf',x,y+6.4*s,z,1.15*s,1.6*s,1.15*s,c);}
function cityTrees(B){for(const r of NET.roads){const tier=r.def.tier;if(!['AV','AR','ST','C2'].includes(tier))continue;const step=tier==='AV'?11:tier==='AR'?13:tier==='ST'?15:17;
    for(const side of[-1,1]){const w=r.walk[side<0?0:1];if(!w||w<2.6)continue;for(let s=10;s<r.len-8;s+=step){const[lo,hi]=r.tRange(s);const t=side<0?lo-1.0:hi+1.0;const P=r.pt(s,t);
        if(nearKeepOut(P.x,P.z)||r.feats.some(f=>f.s!==undefined&&Math.abs(f.s-s)<6))continue;if((NET.map.busStops||[]).some(b=>b.road===r&&Math.abs(b.s-s)<9))continue;
        B.ground('def',P.x-0.6,P.z-0.6,P.x+0.6,P.z+0.6,P.y+0.16,0x6b5a46);if(tier==='AV')ginkgo(B,P.x,P.z,P.y+0.15,0.95);else tree(B,P.x,P.z,0.75,P.y+0.15);}}}}
// 自動販売機・ゴミ箱など
function cityStreetBits(B){R=rng(4242);for(const r of NET.roads){if(!['ST','C1','C2','AL','OW'].includes(r.def.tier))continue;for(let k=0;k<2;k++){if(R()<0.4)continue;const s=10+R()*(r.len-20);const side=R()<0.5?-1:1;
    const[lo,hi]=r.tRange(s);const walk=r.walk[side<0?0:1]||0;const t=side<0?lo-walk-0.6:hi+walk+0.6;const P=r.pt(s,t);if(nearKeepOut(P.x,P.z))continue;const h=r.at(s).h+(side<0?Math.PI/2:-Math.PI/2);
    if(overlapsBuilt(P.x-0.6,P.z-0.6,P.x+0.6,P.z+0.6,-0.2))continue;vending(B,P.x,P.z,P.y,h);}}}
// まとめ
function buildCity(B,wires){const M=NET.map;
  buildSignMeshes(B);buildPoles(B,wires,{filter:r=>['C1','C2','OW','AL','RS'].includes(r.def.tier)});buildStreetLights(B,{filter:r=>['AV','AR','ST','C2','C1'].includes(r.def.tier)});
  buildGuardPipes(B,{filter:r=>['AV','AR','ST'].includes(r.def.tier)});buildResWalls(B,{filter:r=>r.def.tier==='RS'});curveMirrors(B);
  R=rng(2026);cityBusStops(B);cityTrees(B);cityRail(B);cityExpressway(B);cityOverpass(B,-100);cityShotengai(B);cityPlaces(B);cityLandmarks(B);
  cityFrontage(B,['AV','AR','ST','C2','C1','OW','AL','PED','RS']);R=rng(31337);cityInfill(B);cityOuter(B);cityStreetBits(B);cityGuides(B);
  B.ground('def',-1700,-1500,1700,1500,-0.05,0x8b8a86,0);}
// 駅前の大きな建物（百貨店・ビジョンのあるビル）と大通りの高層ビル
function cityLandmarks(B){const force={force:true};
  // さくら百貨店（スクランブルの南西）
  B.wallBox('fac0',-53,-211,0,76,32,52,0xd8c8a8,0,7,6.4);B.box('def',-53,32.4,-211,76.4,0.8,52.4,0x8f8576);BUILT.push({x0:-91,x1:-15,z0:-237,z1:-185});
  B.quad('glow',-53,2.2,-237.06,70,3.6,Math.PI,0,0,1,1,0xe3d6c0);B.box('def',-53,4.6,-238.2,72,0.3,2.4,0x7a1f25);
  TEXTSIGNS.push({x:-53,y:27,z:-237.1,h:Math.PI,w:22,hh:3.4,lit:true,spec:{bg:'#7a1f25',fg:'#ffe9b0',bw:0,lines:[{t:'さくら百貨店',size:0.62,y:0.54,color:'#ffe9b0'}]}});
  TEXTSIGNS.push({x:-14.9,y:27,z:-211,h:-Math.PI/2,w:14,hh:3.4,lit:true,spec:{bg:'#7a1f25',fg:'#ffe9b0',bw:0,lines:[{t:'さくら百貨店',size:0.62,y:0.54,color:'#ffe9b0'}]}});
  // ビジョンのあるファッションビル（スクランブルの南東）
  B.wallBox('fac2',43,-214,0,56,44,48,0x9fb3c2,0,8,7.2);B.box('def',43,44.5,-214,56.4,1.0,48.4,0x6f7880);BUILT.push({x0:15,x1:71,z0:-238,z1:-190});
  B.quad('glow',43,2.3,-238.05,50,3.6,Math.PI,0,0,1,1,0xcfdfe8);
  // 北西の角のビル（ビジョン付き）
  B.wallBox('fac3',-48,-294,0,66,26,62,0xcfc8bc,0,8,6.6);B.box('def',-48,26.4,-294,66.4,0.8,62.4,0x8f8b85);BUILT.push({x0:-81,x1:-15,z0:-325,z1:-263});
  for(let i=0;i<6;i++)shopSignQuad(B,pick(['カラオケ','居酒屋','ゲーム','焼肉','カフェ','書店','歯科','中華']),pick(SIGNBG),-15.4,4.3+i*3.3,-275+i*0.0,0.8,2.9,Math.PI/2,true);
  // 大通りの高層ビル（さくら通り中央交差点の角）
  for(const[x,z,w,d,fl,col]of[[40,-44,44,42,30,0x8aa0b0],[-42,44,44,40,26,0xa9b8c4],[44,46,40,40,22,0xb4bfc7],[-44,-42,40,40,18,0xc4ccd2]]){
    if(overlapsBuilt(x-w/2,z-d/2,x+w/2,z+d/2))continue;if(!clearOfRoads(x-w/2,z-d/2,x+w/2,z+d/2))continue;B.wallBox('fac2',x,z,0,w,fl*3.6,d,col,0,8,7.2);B.box('def',x,fl*3.6+0.6,z,w+0.3,1.2,d+0.3,0x6f7880);
    B.wallBox('fac0',x,z,0,w+0.6,5,d+0.6,0x5c646b,0,8,5);roofStuff(B,x,z,fl*3.6+1.2,w,d);BUILT.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});}}
