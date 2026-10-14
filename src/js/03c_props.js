// ===== 03c_props.js : 標識・電柱・街灯・ガードパイプ・街路樹・塀 =====
NET.signs=[];
// 標識柱：ids=[上から順]、h=標識の表が向く方向（見る人の方を向く＝進行方向の逆）
function signPost(B,x,z,y,h,ids,size=0.75,top=2.6,opt={}){const hs=ids.map(id=>{const a=SIGNART[id]?SIGNART[id].aspect:1;const isPlate=id.startsWith('p_');return isPlate?size*0.5:size/(a||1)*(id==='oneway'?0.62:1);});
  let yy=y+top;const faces=[];for(let i=0;i<ids.length;i++){const id=ids[i];const isPlate=id.startsWith('p_');const w=isPlate?size*1.0:size*(id==='oneway'?1.5:1);const hh=isPlate?size*0.5:(id==='oneway'?size*0.92:size);
    const e=signCell(id);const f=fwd(h);B.quad('sign'+e.page,x+f.x*0.03,yy,z+f.z*0.03,w*(id==='oneway'?1:1),hh,h,...e.uv);B.quad('def',x-f.x*0.0,yy,z-f.z*0.0,w*0.96,hh*0.96,h+Math.PI,0,0,0,0,0x8d9298);
    faces.push({id,y:yy});yy-=hh/2+(ids[i+1]&&ids[i+1].startsWith('p_')?size*0.25+0.04:size/2+0.08);}
  const bottom=yy;B.cyl('def',x,y+(top+size/2)/2,z,0.038,top+size/2,0x9aa0a6,6);return faces;}
// 道路の指定位置に標識を立てる。dir=その標識が対象とする進行方向（+1:F,-1:B）、side='L'=進行方向の左側
function placeSign(r,s,dir,ids,opt={}){const side=opt.side||'L';const[lo,hi]=r.tRange(s);const walk=r.walk;
  let t;if(side==='L')t=dir>0?lo-(walk[0]?0.6:0.45):hi+(walk[1]?0.6:0.45);else t=dir>0?(r.nB?hi+(walk[1]?0.6:0.45):hi+0.45):lo-0.45;
  if(opt.t!==undefined)t=opt.t;const P=r.pt(s,t);const h=(dir>0?P.h:P.h+Math.PI)+Math.PI;// 対象の車の方を向く
  const e={ids,road:r,s,dir,x:P.x,z:P.z,y:P.y,h,size:opt.size||0.75,top:opt.top||2.6,info:opt.info};NET.signs.push(e);return e;}
function buildSignMeshes(B){for(const e of NET.signs){e.faces=signPost(B,e.x,e.z,e.y,e.h,e.ids,e.size,e.top);}}
// 自動で立てる標識：最高速度・一時停止・横断歩道・踏切
function autoSigns(){for(const r of NET.roads){
    if(r.limit&&r.len>40&&r.type!=='EXP'&&!r.def.noAutoLimit)for(const dir of[1,-1]){if(dir>0?!r.nF:!r.nB)continue;placeSign(r,dir>0?14:r.len-14,dir,['s'+r.limit]);}
    for(const dir of[1,-1]){const n=dir>0?r.endNode:r.startNode,leg=dir>0?r.endLeg:r.startLeg;if(!n||n.kind!=='x'||(dir>0?!r.nF:!r.nB))continue;
      if(n.stopLegs.includes(leg)){const sd=stopEdgeDist(n,leg);placeSign(r,dir>0?r.len-sd+0.6:sd-0.6,dir,['stop'],{size:0.85,top:2.3});}}
    for(const f of r.feats){if(f.s===undefined)continue;
      if(f.type==='xwalk'){for(const dir of[1,-1]){if(dir>0?!r.nF:!r.nB)continue;placeSign(r,f.s-dir*2.6,dir,['xwalk'],{size:0.8,top:2.7});}}
      if(f.type==='rail'){for(const dir of[1,-1]){if(dir>0?!r.nF:!r.nB)continue;const s=f.s-dir*70;if(s>5&&s<r.len-5)placeSign(r,s,dir,['rail'],{size:0.85});}}}}
  // 信号のある交差点の横断歩道標識（歩道橋のない一般的な形）
}
// カーブミラー（生活道路の見通しの悪い交差点）
function curveMirrors(B){for(const n of NET.nodes){if(n.kind!=='x'||n.signal)continue;const legs=Object.keys(n.legs);if(!legs.every(L=>n.legs[L].road.type==='RES'))continue;
    for(const L of n.stopLegs.length?n.stopLegs:legs.slice(0,1)){const h=legHeading[L];const f=fwd(h),rt=rightV(h);const mx=n.x+f.x*(n.hx+2.2)-rt.x*(n.hx+1.6),mz=n.z+f.z*(n.hz+2.2)-rt.z*(n.hz+1.6);
      B.cyl('def',mx,1.6,mz,0.045,3.2,0xe0782a,6);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0)).premultiply(new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),-h));
      B.addGeo('def',GEO.cyl,new THREE.Matrix4().compose(new V3(mx,3.2,mz),q,new V3(0.42,0.06,0.42)),0xe0782a);B.addGeo('glowd',GEO.cyl,new THREE.Matrix4().compose(new V3(mx-f.x*0.04,3.2,mz-f.z*0.04),q,new V3(0.36,0.07,0.36)),0xc9d6dd);}}}
// 電柱と電線（一般道）
function buildPoles(B,wires,opt={}){for(const r of NET.roads){if(r.type==='EXP'||r.type==='RAMP'||r.type==='LOT')continue;if(opt.filter&&!opt.filter(r))continue;const res=r.type==='RES';const step=res?28:34;
    const side=r.def.poleSide||1;const run=[];
    for(let s=8;s<r.len-6;s+=step){const[lo,hi]=r.tRange(s);const walk=r.walk[side>0?1:0];const t=side>0?hi+(walk?walk-0.45:0.3):lo-(walk?walk-0.45:0.3);const P=r.pt(s,t);
      if(nearKeepOut(P.x,P.z))continue;B.cyl('def',P.x,P.y+5,P.z,0.15,10,0x9c9a94,6);const rt=rightV(r.at(s).h);B.bar('def',P.x-rt.x*0.8,P.y+9.2,P.z-rt.z*0.8,P.x+rt.x*0.8,P.y+9.2,P.z+rt.z*0.8,0.12,0.12,0x6d6b66);
      if(R()<0.25)B.cyl('def',P.x+rt.x*0.35,P.y+7.6,P.z+rt.z*0.35,0.32,0.9,0x8c8c88,6);run.push({P,rt});}
    for(let i=0;i<run.length-1;i++){const a=run[i],b=run[i+1];for(const[hh,off]of[[9.1,-0.6],[9.1,0.6],[8.3,0]]){let prev=null;for(let k=0;k<=4;k++){const t=k/4;const sag=Math.sin(t*Math.PI)*0.45;
        const p=[a.P.x+(b.P.x-a.P.x)*t+a.rt.x*off,a.P.y+hh-sag,a.P.z+(b.P.z-a.P.z)*t+a.rt.z*off];if(prev)wires.push(...prev,...p);prev=p;}}}}}
function nearKeepOut(x,z,m=1){for(const k of(NET.map&&NET.map.keepOut)||[]){if(x>k.x0-m&&x<k.x1+m&&z>k.z0-m&&z<k.z1+m)return true;}return false;}
// 街灯
function buildStreetLights(B,opt={}){for(const r of NET.roads){if(r.type==='RES'||r.type==='LOT')continue;if(opt.filter&&!opt.filter(r))continue;const sp=r.type==='EXP'?50:40;
    for(const side of(r.type==='EXP'?[0]:[-1,1])){for(let s=10+(side>0?sp/2:0);s<r.len-8;s+=sp){const[lo,hi]=r.tRange(s);let tp,ta;
        if(side===0){if(r.med.kind!=='barrier')continue;const m=(r._edges(1,s).inner+r._edges(-1,s).inner)/2;tp=m;ta=null;}
        else{const walk=r.walk[side>0?1:0];tp=side>0?hi+(walk?0.5:0.4):lo-(walk?0.5:0.4);ta=side>0?hi-1.6:lo+1.6;}
        const P=r.pt(s,tp);if(nearKeepOut(P.x,P.z))continue;const hgt=r.type==='EXP'?10:8;B.cyl('def',P.x,P.y+hgt/2,P.z,0.09,hgt,0x8e959b,6);
        if(ta!==null){const Q=r.pt(s,ta);B.bar('def',P.x,P.y+hgt-0.1,P.z,Q.x,Q.y+hgt-0.1,Q.z,0.1,0.1,0x8e959b);B.box('lamp',Q.x,Q.y+hgt-0.25,Q.z,0.55,0.14,0.32,0xffffff,r.at(s).h);}
        else{for(const d of[-1,1]){const Q=r.pt(s,tp+d*2.2);B.bar('def',P.x,P.y+hgt-0.1,P.z,Q.x,Q.y+hgt-0.1,Q.z,0.1,0.1,0x8e959b);B.box('lamp',Q.x,Q.y+hgt-0.25,Q.z,0.55,0.14,0.32,0xffffff,r.at(s).h);}}}}}}
// 歩道のガードパイプ（白）
function buildGuardPipes(B,opt={}){for(const r of NET.roads){if(!(r.walk[0]||r.walk[1]))continue;if(opt.filter&&!opt.filter(r))continue;
    for(const side of[-1,1]){const w=r.walk[side<0?0:1];if(!w)continue;const brk=r.feats.filter(f=>f.type==='xwalk'&&f.s!==undefined).map(f=>f.s);
      const s0=r.startNode&&r.startNode.kind==='x'?(r.startNode.xwalk[r.startLeg]?7:3):3,s1=r.len-(r.endNode&&r.endNode.kind==='x'?(r.endNode.xwalk[r.endLeg]?7:3):3);
      const tAt=(s)=>{const[lo,hi]=r.tRange(s);return side<0?lo-0.3:hi+0.3;};
      for(let s=s0;s<s1;s+=(opt.step||3)){if(brk.some(b=>Math.abs(s-b)<4))continue;if(opt.skip&&opt.skip(r,s,side))continue;const P=r.pt(s,tAt(s));B.box('def',P.x,P.y+0.55+0.15,P.z,0.07,0.8,0.07,0xf2f2f2);}
      let a=s0;const ends=[...brk.map(b=>[b-4,b+4]),[s1,1e9]];for(const[b0,b1]of ends){if(b0>a+1){for(const yy of[0.77,1.05]){const pts=simplifyPts(roadEdgePts(r,a,Math.min(b0,s1),tAt,yy,4),opt.tol);for(let i=0;i<pts.length-1;i++)B.bar('def',pts[i].x,pts[i].y,pts[i].z,pts[i+1].x,pts[i+1].y,pts[i+1].z,0.05,0.05,0xf2f2f2);}}a=b1;}}}}
// 一直線に並んだ点をまとめる（棒の数を減らす）
function simplifyPts(pts,tol=0.004){if(pts.length<3)return pts;const out=[pts[0]];for(let i=1;i<pts.length-1;i++){const a=out[out.length-1],b=pts[i],c=pts[i+1];const h1=Math.atan2(b.x-a.x,b.z-a.z),h2=Math.atan2(c.x-b.x,c.z-b.z);if(Math.abs(wrapA(h2-h1))>tol||Math.abs(c.y-b.y-(b.y-a.y))>0.02)out.push(b);}out.push(pts[pts.length-1]);return out;}
// 街路樹
function buildStreetTrees(B,opt={}){for(const r of NET.roads){if(opt.filter&&!opt.filter(r))continue;for(const side of[-1,1]){const w=r.walk[side<0?0:1];if(!w||w<2.4)continue;
      for(let s=14;s<r.len-10;s+=opt.step||13){const[lo,hi]=r.tRange(s);const t=side<0?lo-w+0.9:hi+w-0.9;const P=r.pt(s,t);if(nearKeepOut(P.x,P.z)||r.feats.some(f=>f.s!==undefined&&Math.abs(f.s-s)<6))continue;
        B.ground('def',P.x-0.6,P.z-0.6,P.x+0.6,P.z+0.6,P.y+0.16,0x6b5a46);tree(B,P.x,P.z,0.8,P.y);}}}}
// 生活道路のブロック塀
function buildResWalls(B,opt={}){for(const r of NET.roads){if(r.type!=='RES')continue;if(opt.filter&&!opt.filter(r))continue;for(const side of[-1,1]){let s=6;while(s<r.len-6){const len=7+R()*6,e=Math.min(s+len,r.len-6);const[lo,hi]=r.tRange((s+e)/2);
      const t=side<0?lo-0.36:hi+0.36;const A=r.pt(s,t),Bp=r.pt(e,t);if(!nearKeepOut((A.x+Bp.x)/2,(A.z+Bp.z)/2,4))fence(B,A.x,A.z,Bp.x,Bp.z,1.1);s=e+2.8+R()*1.5;}}}}
// 自動販売機
function vending(B,x,z,y,h){B.box('def',x,y+0.9,z,0.8,1.8,1.0,pick([0xd0312d,0x2a62b8,0xf2f2f2,0x2f8f4f]),h);const f=fwd(h);B.box('lamp',x+f.x*0.41,y+1.1,z+f.z*0.41,Math.abs(f.x)>0.5?0.02:0.75,1.0,Math.abs(f.x)>0.5?0.75:0.02,0xffffff);}

