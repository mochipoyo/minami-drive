// ===== 02h_netpoly.js : 多角形の交差点（斜めに道路が入る地図：新宿など） =====
// 今までの交差点は、N/E/S/W の脚が直角に入る長方形（02_net.js の hx/hz と隅切り）。
// 実在の町では道路が斜めに入るので、交差点の形を「切ったあとの道路の端」をつないだ多角形として作る。
// 脚の方角（N/E/S/W）は地図データ（tools/shinjuku/build_map.py）が決め、曲がる向きは道路の実際の向きから出す（02_net.js nodeSetup）。
// 既存の地図（みなみ町・さくら区など）はこのファイルを使わない（def の node に polyAuto がない）。
function nodePolyBuild(n){const legs=[];
  for(const L in n.legs){const e=n.legs[L];const r=e.road;const atStart=e.end==='start';const s=atStart?0:r.len;const P=r.at(s);
    const hOut=atStart?P.h:wrapA(P.h+Math.PI);// 交差点から外へ向かう向き
    const[lo,hi]=r.tRange(s);const wLo=r.walk[0]||0,wHi=r.walk[1]||0;
    const at=(t)=>({x:P.x+P.rx*t,z:P.z+P.rz*t});
    const c1=at(lo),c2=at(hi),o1=at(lo-wLo),o2=at(hi+wHi);
    const ang=Math.atan2(P.z-n.z,P.x-n.x);const rel=(q)=>wrapA(Math.atan2(q.z-n.z,q.x-n.x)-ang);
    // 交差点のまわりを角度順に回ったとき、先に来る角を first に
    const sw=rel(c1)>rel(c2);
    legs.push({L,r,hOut,P,first:sw?c2:c1,second:sw?c1:c2,firstO:sw?o2:o1,secondO:sw?o1:o2,wFirst:sw?wHi:wLo,wSecond:sw?wLo:wHi,ang});}
  legs.sort((a,b)=>a.ang-b.ang);
  const poly=[],corners=[];const f=(g)=>fwd(g.hOut);
  // 2直線の交点：p+f1*t = q+f2*u
  const meet=(p,f1,q,f2)=>{const den=f1.x*f2.z-f1.z*f2.x;if(Math.abs(den)<0.08)return null;const dx=q.x-p.x,dz=q.z-p.z;const t=(dx*f2.z-dz*f2.x)/den,u=(dx*f1.z-dz*f1.x)/den;return{x:p.x+f1.x*t,z:p.z+f1.z*t,t,u};};
  for(let i=0;i<legs.length;i++){const g=legs[i],h=legs[(i+1)%legs.length];
    poly.push([g.first.x,g.first.z],[g.second.x,g.second.z]);
    if(legs.length===1)continue;
    // g の second の角 → h の first の角：縁石の線の交点を制御点にして丸める（隅切り）
    let X=meet(g.second,f(g),h.first,f(h));const arc=[];
    if(X&&X.t<=0.3&&X.u<=0.3&&Math.hypot(X.x-g.second.x,X.z-g.second.z)<60&&Math.hypot(X.x-h.first.x,X.z-h.first.z)<60){
      // 丸みの深さ（弦からのふくらみ）は 3.5m まで：鈍角の角では縁石の線の交点が交差点の奥になるため
      const mx=(g.second.x+h.first.x)/2,mz=(g.second.z+h.first.z)/2;const vx=X.x-mx,vz=X.z-mz;const L=Math.hypot(vx,vz);if(L/2>3.5)X={x:mx+vx*7/L,z:mz+vz*7/L};
      for(let k=1;k<6;k++){const t=k/6,u=1-t;arc.push({x:u*u*g.second.x+2*u*t*X.x+t*t*h.first.x,z:u*u*g.second.z+2*u*t*X.z+t*t*h.first.z});}}
    for(const q of arc)poly.push([q.x,q.z]);
    // 歩道の角：縁石の線（second→arc→first）と、外側の線をつなぐ
    const walk=Math.max(g.wSecond,h.wFirst);if(walk>0.05){const Xo=meet(g.secondO,f(g),h.firstO,f(h));const outer=(Xo&&Xo.t<=0.3&&Xo.u<=0.3&&Math.hypot(Xo.x-g.secondO.x,Xo.z-g.secondO.z)<80)?[[Xo.x,Xo.z]]:[];
      const pts=[[g.second.x,g.second.z],...arc.map(q=>[q.x,q.z]),[h.first.x,h.first.z],[h.firstO.x,h.firstO.z],...outer,[g.secondO.x,g.secondO.z]];
      corners.push({pts,curb:[g.second,...arc,h.first]});}}
  n.poly=poly;n.corners=corners;
  let hx=3,hz=3;for(const[x,z]of poly){hx=Math.max(hx,Math.abs(x-n.x));hz=Math.max(hz,Math.abs(z-n.z));}n.hx=hx;n.hz=hz;n.fil=[];}
// 路面と歩道の角（03a の buildNodeMesh から）
function buildNodePolyMesh(B,n){const y=n.y||0;const legs=Object.keys(n.legs);const anyRes=legs.every(L=>n.legs[L].road.type==='RES');const col=anyRes?COL.asphRES:COL.asph;
  B.poly('road',n.poly,y,col,8);
  for(const c of n.corners){B.poly('walk',c.pts,y+0.15,0xffffff,4);
    // 縁石：交差点側に面を向ける
    const pts=c.curb.map(q=>({x:q.x,y,z:q.z}));const a=pts[0],b=pts[pts.length-1];const cr=(b.x-a.x)*(n.z-a.z)-(b.z-a.z)*(n.x-a.x);B.wall('def',pts,0.15,COL.curb,cr>0?1:-1);}}
// 多角形の交差点での曲がる向き：脚の方角どうし（地図データが決めた交差点の構造）を基本に、道路の実際の向きで補う
// ・脚が2本（道路の折れ点）は直進　・向きの差が20度未満は直進　・脚の上では直進で、向きの差が55度未満なら直進（道路が交差点で曲がっている）
function polyTurn(n,L,L2,hIn,hOut){const d=Math.abs(wrapA(hOut-hIn));if(Object.keys(n.legs).length<=2)return d>2.6?'U':'S';if(d<0.35)return'S';
  const tl=(L&&L2)?turnOf(legHeading[L],outHeading[L2]):null;if(tl==='S'&&d<0.95)return'S';return turnOf(hIn,hOut);}
// 交差点の接続路（右左折の線）のそば：多角形からはみ出す接続路（鋭角・ずれた道路）も走れる所とみなす
function nodeConnNear(n,x,z,m){if(!n._cp){const cp=[];for(const L in n.legs){const e=n.legs[L];const r=e.road;for(const l of r.allLanes(e.end==='end'?1:-1))for(const c of l.conns)if(c.node===n)cp.push(c.pts);}n._cp=cp;}
  const mm=m*m;for(const P of n._cp){for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const dx=b.x-a.x,dz=b.z-a.z;const L2=dx*dx+dz*dz||1e-9;const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/L2,0,1);const px=a.x+dx*t,pz=a.z+dz*t;if((x-px)*(x-px)+(z-pz)*(z-pz)<=mm)return true;}}return false;}
// 脚 Lin から入って脚 Lout へ出るときの曲がる向き（ナビ・自動運転用）。多角形の交差点では道路の実際の向きで（polyTurn）
function legTurn(n,Lin,Lout){if(!n.poly)return turnOf(legHeading[Lin],outHeading[Lout]);const a=n.legs[Lin],b=n.legs[Lout];if(!a||!b)return turnOf(legHeading[Lin],outHeading[Lout]);
  const ra=a.road,rb=b.road;const Pa=ra.at(a.end==='end'?ra.len:0);const hIn=a.end==='end'?Pa.h:wrapA(Pa.h+Math.PI);const Pb=rb.at(b.end==='start'?0:rb.len);const hOut=b.end==='start'?Pb.h:wrapA(Pb.h+Math.PI);
  return polyTurn(n,Lin,Lout,hIn,hOut);}
// 多角形の縁まで、点 (x,z) から向き h に進んだ距離（信号の位置などに）
function polyRayDist(P,x,z,h){const f=fwd(h);let best=0;for(let i=0,j=P.length-1;i<P.length;j=i++){const ax=P[j][0],az=P[j][1],bx=P[i][0],bz=P[i][1];const dx=bx-ax,dz=bz-az;const den=f.x*dz-f.z*dx;if(Math.abs(den)<1e-9)continue;
    const t=((ax-x)*dz-(az-z)*dx)/den,u=((ax-x)*f.z-(az-z)*f.x)/den;if(t>0&&u>=0&&u<=1&&t>best)best=t;}return best||3;}
