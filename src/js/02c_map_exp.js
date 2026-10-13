// ===== 02c_map_exp.js : みなみ自動車道（架空の高速道路。教習用のコース） =====
// 本線 E1：西→東の片側2車線（中央分離帯はコンクリート壁＋防眩板）。
// みなみIC（入口：料金所→ランプ→加速車線）、みなみ川橋、みなみ山トンネル、みなみ東IC（出口：減速車線→ランプ→料金所）。
const EXPC={
  W:-2400,E:2400,Z:60,
  path:[[-2400,60],[-1500,60],[-700,-80],[300,-80],[1100,60],[2400,60]],r:[0,2200,2200,2200,2200,0],
  accel:{s0:520,s1:830,kB:95},decel:{s0:3900,s1:4160,kA:85},
  pa:{d0:2860,d1:3060,a0:3330,a1:3600,s0:3140,s1:3260},// みなみPA（減速車線→PA→加速車線）
  bridge:{s0:1180,s1:1430,name:'みなみ川橋'},tunnel:{s0:2120,s1:2720,name:'みなみ山トンネル'},
  yellow:[[1960,2720]],// トンネルの手前から中：車線変更禁止（黄色の線）
  tollIn:140,tollOut:150,
};
// 折れ線の点列上の距離sの位置と向き
function polyAt(pts,s){let acc=0;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const L=Math.hypot(b.x-a.x,b.z-a.z);if(acc+L>=s||i===pts.length-1){const k=L?clamp((s-acc)/L,0,1):0;return{x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k,h:headingOf(b.x-a.x,b.z-a.z)};}acc+=L;}return{x:pts[0].x,z:pts[0].z,h:0};}
function expDef(){const C0=EXPC;
  const main={id:'E1',name:'みなみ自動車道',group:'E1',type:'EXP',from:'EW',to:'EE',path:C0.path,r:C0.r,nF:2,nB:2,med:{w:3.0,kind:'barrier'},sh:[2.5,0.75],walk:[0,0],
    prof:[[0,3],[950,3],[1150,8.5],[1450,8.5],[1650,5.5],[2120,6.5],[2720,6.5],[2900,2],[3700,2],[3950,3]],ySmooth:160,
    patches:[{dir:1,side:'L',kind:'accel',pid:'ic',s0:C0.accel.s0,s1:C0.accel.s1,kB:C0.accel.kB,wB0:true,line:'thick'},{dir:1,side:'L',kind:'decel',pid:'ic',dest:'ic',exitP:0.25,s0:C0.decel.s0,s1:C0.decel.s1,kA:C0.decel.kA,wA0:true,line:'thick'},
      {dir:1,side:'L',kind:'decel',pid:'pa',dest:'pa',exitP:0.1,s0:C0.pa.d0,s1:C0.pa.d1,kA:70,wA0:true,line:'thick'},{dir:1,side:'L',kind:'accel',pid:'pa',s0:C0.pa.a0,s1:C0.pa.a1,kB:90,wB0:true,line:'thick'}],
    tunnels:[{s0:C0.tunnel.s0,s1:C0.tunnel.s1,name:C0.tunnel.name}],bridges:[{s0:C0.bridge.s0,s1:C0.bridge.s1,name:C0.bridge.name}],yellowSep:C0.yellow,feats:[]};
  // 本線の形から、加速車線の始まり・減速車線の終わりの位置を求める（ランプをぴったりつなぐ）
  const pts=pathSamples(main);const lw=3.6,tAcc=-(1.5+2*lw+lw/2);
  const at=(s,t)=>{const P=polyAt(pts,s);const rv=rightV(P.h);return{x:P.x+rv.x*t,z:P.z+rv.z*t,h:P.h};};
  const Pa=at(C0.accel.s0,tAcc),Qd=at(C0.decel.s1,tAcc);
  const fa=fwd(Pa.h),la={x:-rightV(Pa.h).x,z:-rightV(Pa.h).z};// 進行方向の左（北）
  // 入口ランプ：北の一般道から南へ→料金所→左へカーブして本線に沿う
  const aCorner={x:Pa.x-fa.x*230,z:Pa.z-fa.z*230};const aStart={x:aCorner.x+la.x*440,z:aCorner.z+la.z*440};
  const fd=fwd(Qd.h),ld={x:-rightV(Qd.h).x,z:-rightV(Qd.h).z};
  const bCorner={x:Qd.x+fd.x*210,z:Qd.z+fd.z*210};const bEnd={x:bCorner.x+ld.x*440,z:bCorner.z+ld.z*440};
  const plaza=(s,len)=>[{dir:1,side:'L',kind:'toll',s0:s-len/2,s1:s+len/2,kA:26,kB:26,wA0:true,wB0:true,w:3.5,gap:1.5},{dir:1,side:'R',kind:'toll',s0:s-len/2,s1:s+len/2,kA:26,kB:26,wA0:true,wB0:true,w:3.5,gap:1.5}];
  const onA={id:'ON_A',name:'みなみIC 入口ランプ',group:'ON_A',type:'RAMP',from:'IA',path:[[aStart.x,aStart.z],[aCorner.x,aCorner.z],[Pa.x,Pa.z]],r:[0,150,0],nF:1,nB:0,sh:[2.5,1.0],walk:[0,0],limit:40,
    prof:[[0,0],[250,0],[-70,3]],ySmooth:60,y1:3,patches:plaza(C0.tollIn,100),feats:[{type:'toll',s:C0.tollIn,io:'in'}],tollAt:C0.tollIn};
  const offB={id:'OFF_B',name:'みなみ東IC 出口ランプ',group:'OFF_B',type:'RAMP',to:'OB',path:[[Qd.x,Qd.z],[bCorner.x,bCorner.z],[bEnd.x,bEnd.z]],r:[0,150,0],nF:1,nB:0,sh:[2.5,1.0],walk:[0,0],limit:40,
    y0:3,prof:[[0,3],[90,3],[260,0]],ySmooth:60,patches:[],feats:[],tollFromEnd:C0.tollOut};
  // みなみPA：入口ランプ→構内の通路→出口ランプ（構内の駐車場は lot）
  const Q=C0.pa;const tA=-34;const P_=(s2,t)=>{const p=at(s2,t);return[p.x,p.z];};
  const paIn={id:'PA_IN',name:'みなみPA 入口',group:'PA',type:'RAMP',path:[P_(Q.d1,tAcc),P_(Q.d1+30,tAcc),P_(Q.s0-15,tA),P_(Q.s0+10,tA)],r:[0,22,22,0],nF:1,nB:0,sh:[1.5,0.8],walk:[0,0],limit:40,y0:2,y1:2,feats:[],paRoad:true};
  const paAisle={id:'PA_AISLE',name:'みなみPA 構内',group:'PA',type:'LOT',path:[P_(Q.s0+10,tA),P_(Q.s1-10,tA)],nF:1,nB:0,w:3.2,sh:[0.4,0.4],walk:[0,0],limit:20,y0:2,y1:2,feats:[],paRoad:true};
  const paOut={id:'PA_OUT',name:'みなみPA 出口',group:'PA',type:'RAMP',path:[P_(Q.s1-10,tA),P_(Q.s1+15,tA),P_(Q.a0-30,tAcc),P_(Q.a0,tAcc)],r:[0,22,22,0],nF:1,nB:0,sh:[1.5,0.8],walk:[0,0],limit:40,y0:2,y1:2,feats:[],paRoad:true};
  const lotPoly=[P_(Q.s0-6,-30),P_(Q.s1+6,-30),P_(Q.s1+6,-60),P_(Q.s0-6,-60)];
  const nodes=[{id:'EW',x:C0.path[0][0],z:C0.path[0][1],kind:'portal',y:3},{id:'EE',x:C0.path[C0.path.length-1][0],z:C0.path[C0.path.length-1][1],kind:'portal',y:3},
    {id:'IA',x:aStart.x,z:aStart.z,kind:'portal',y:0},{id:'OB',x:bEnd.x,z:bEnd.z,kind:'portal',y:0}];
  return{nodes,roads:[main,onA,offB,paIn,paAisle,paOut],links:[['ON_A','F',0,'E1','accel:ic',1],['E1','decel:ic',1,'OFF_B','F',0],['E1','decel:pa',1,'PA_IN','F',0],['PA_IN','F',0,'PA_AISLE','F',0],['PA_AISLE','F',0,'PA_OUT','F',0],['PA_OUT','F',0,'E1','accel:pa',1]],
    lots:[{id:'PA',poly:lotPoly,y:2,name:'みなみPA'}],
    after(){const r=NET.byId.OFF_B;const s=r.len-C0.tollOut;
      for(const p of plaza(s,100))addPatch(r,p);r.feats.push({type:'toll',s,io:'out'});r.def.tollAt=s;}};}

