// ===== 05_signals.js : 信号機・踏切・電車 =====
const SIGS=new Map(),XINGS=[];let TRAIN=null;
const grpOf=(L)=>(L==='W'||L==='E')?'EW':'NS';
class Signal{
  // def:{g:{NS,EW},arrow,scramble,y,ar,ra}
  constructor(n,offset,SB){this.n=n;this.SB=SB;const d=n.signal||{};this.def=d;this.arrow=!!d.arrow;this.g=d.g||{NS:16,EW:18};this.seq=[];
    for(const G of['NS','EW']){this.seq.push([G,'G',this.g[G]],[G,'Y',d.y||3]);if(this.arrow){this.seq.push([G,'RA',d.ra||5],[G,'Y2',2.5]);}this.seq.push([G,'AR',d.ar||2]);}
    if(d.scramble){this.seq.push(['PED','PG',d.pg||18],['PED','PF',5],['PED','AR',2]);}
    this.i=0;this.t=offset%this.seq[0][2];this.heads=[];this.peds=[];this.dark=false;this.hold=0;this.build();}
  get cur(){return this.seq[this.i];}
  update(dt){if(this.hold>0){this.hold-=dt;}else{this.t+=dt;while(this.t>=this.cur[2]){this.t-=this.cur[2];this.i=(this.i+1)%this.seq.length;}}this.paint();}
  stateFor(L){if(this.dark)return'OFF';const[G,P]=this.cur;if(G==='PED')return'R';if(G!==grpOf(L))return'R';if(P==='G')return'G';if(P==='Y'||P==='Y2')return'Y';if(P==='RA')return'RA';return'R';}
  // 歩行者用：脚Lの横断歩道（その道路を横切る）
  pedFor(L){if(this.dark)return'OFF';const[G,P]=this.cur;if(this.def.scramble){if(G!=='PED')return'R';return P==='PG'?'G':P==='PF'?'F':'R';}
    const other=grpOf(L)==='EW'?'NS':'EW';if(G!==other||P!=='G')return'R';const left=this.cur[2]-this.t;return left>6?'G':'F';}
  scrambleNow(){return this.def.scramble&&this.cur[0]==='PED'&&this.cur[1]!=='AR';}
  remain(){return this.cur[2]-this.t;}
  setPhase(G,P,t=0){const k=this.seq.findIndex(s=>s[0]===G&&s[1]===P);if(k>=0){this.i=k;this.t=t;}}
  build(){const n=this.n,y=n.y||0;const SB=this.SB;this.headPos=[];
    for(const L in n.legs){const e=n.legs[L];const r=e.road;const dirIn=e.end==='end'?1:-1;if(dirIn>0?!r.nF:!r.nB)continue;// 流入がない脚（一方通行の出口）
      if(r.def.pedOnly)continue;// 歩行者用道路から入る車はない
      let h=legHeading[L];let along=(L==='N'||L==='S')?n.hz:n.hx;let cross=(L==='N'||L==='S')?n.hx:n.hz;
      if(n.poly){// 多角形の交差点（斜めに入る道路）：その道路の実際の向きと幅で置く
        const P=r.at(e.end==='end'?r.len:0);h=e.end==='end'?P.h:wrapA(P.h+Math.PI);const[lo,hi]=r.tRange(e.end==='end'?r.len:0);cross=Math.max(Math.abs(lo),Math.abs(hi));
        along=polyRayDist(n.poly,n.x,n.z,h);}
      const f=fwd(h),rt=rightV(h);
      const far=along+(n.xwalk[OPP[L]]?n.xwW+1.6:1.6);const nL=r.lanes(dirIn).length+(r.patches.some(p=>p.kind==='turnR'&&p.dir===dirIn)?1:0);
      const mk=(sideSign,lat)=>{const px=n.x+f.x*far+rt.x*sideSign*(cross+1.1),pz=n.z+f.z*far+rt.z*sideSign*(cross+1.1);const hx=n.x+f.x*far+rt.x*lat,hz=n.z+f.z*far+rt.z*lat;
        SB.cyl('def',px,y+3.1,pz,0.13,6.2,0x8f949a,8);SB.bar('def',px,y+5.75,pz,hx,y+5.75,hz,0.11,0.11,0x8f949a);
        SB.box('def',hx,y+5.3,hz,1.35,0.46,0.3,0x3b3f43,-h);SB.box('def',hx,y+5.58,hz,1.42,0.05,0.42,0x3b3f43,-h);const lamps={};
        const at=(lx,ly,lz,sx=1,sy=1,ry=0)=>new THREE.Matrix4().makeRotationY(-h).setPosition(hx,y+5.3,hz).multiply(new THREE.Matrix4().compose(new V3(lx,ly,lz),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),ry),new V3(sx,sy,1)));
        [['G',-0.42],['Y',0],['R',0.42]].forEach(([k,x])=>{lamps[k]=sigLampAdd('disc',at(x,0,0.16));SB.box('def',hx+rt.x*x-f.x*0.26,y+5.47,hz+rt.z*x-f.z*0.26,0.34,0.03,0.22,0x3b3f43,-h);});
        if(this.arrow){SB.box('def',hx+rt.x*0.42,y+4.86,hz+rt.z*0.42,0.46,0.4,0.26,0x3b3f43,-h);lamps.A=sigLampAdd('arrow',at(0.42,-0.44,0.14));}
        this.heads.push({L,lamps,st:null});this.headPos.push({L,px,pz,hx,hz,h,side:sideSign});};
      // 左奥（車線の上まで腕を伸ばす）
      const m=r.nB&&r.nF?r.med.w/2:0;mk(-1,-(m+Math.max(1,nL)*r.w*0.5));
      if(nL>=3||r.type==='ART')mk(1,Math.min(cross-0.5,m+1.5));
      // 歩行者用信号
      if(n.xwalk[L]){const mid=along+0.8+n.xwW/2;for(const s of[-1,1]){const cx=n.x-f.x*mid+rt.x*s*(cross+1.2),cz=n.z-f.z*mid+rt.z*s*(cross+1.2);
          const gh=h+(s>0?-Math.PI/2:Math.PI/2);SB.box('def',cx,y+2.45,cz,0.42,0.84,0.22,0x3b3f43,-gh);SB.cyl('def',cx,y+1.1,cz,0.06,2.2,0x8f949a,6);
          const pm=(ly)=>new THREE.Matrix4().makeRotationY(-gh).setPosition(cx,y+2.45,cz).multiply(new THREE.Matrix4().compose(new V3(0,ly,-0.115),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),Math.PI),new V3(0.3,0.32,1)));
          this.peds.push({L,red:sigLampAdd('ped',pm(0.19)),grn:sigLampAdd('ped',pm(-0.19)),st:null});}}}}
  paint(){const blink=(performance.now()%1000)<520;
    for(const hd of this.heads){const s=this.stateFor(hd.L);if(s===hd.st)continue;hd.st=s;const l=hd.lamps;
      sigLampSet(l.G,s==='G'?'G':'off');sigLampSet(l.Y,s==='Y'?'Y':'off');sigLampSet(l.R,(s==='R'||s==='RA')?'R':'off');if(l.A!==undefined)sigLampSet(l.A,s==='RA'?'G':'off');}
    for(const p of this.peds){const s=this.pedFor(p.L);const k=s+(s==='F'&&blink?1:0);if(k===p.st)continue;p.st=k;sigLampSet(p.red,s==='R'?'pR':'pRoff');sigLampSet(p.grn,(s==='G'||(s==='F'&&blink))?'pG':'pGoff');}}
}
// ---- 信号の灯火：すべての信号機の灯火をまとめて描く（インスタンス描画） ----
const SIGLAMP={list:{disc:[],arrow:[],ped:[]},im:{},col:null};
function sigLampAdd(kind,m){const a=SIGLAMP.list[kind];a.push({m,c:kind==='ped'?'pRoff':'off'});return kind[0]+(a.length-1);}
function sigLampCols(){if(SIGLAMP.col)return SIGLAMP.col;const k=(h,s=1)=>C(h).clone().multiplyScalar(s);
  SIGLAMP.col={off:k(0x2a3034),G:k(0x2ff0d0,2.2),Y:k(0xffc23a,2.2),R:k(0xff4636,2.2),pR:k(0xff4a3d,2.2),pRoff:k(0x3a1512),pG:k(0x2ff0c8,2.2),pGoff:k(0x0e2a26)};return SIGLAMP.col;}
function sigLampBuild(){const cols=sigLampCols();const geo={disc:GEO.disc,arrow:GEO.arrow,ped:GEO.plane};
  for(const kind of['disc','arrow','ped']){const a=SIGLAMP.list[kind];if(!a.length)continue;if(!MAT.sigLamp)MAT.sigLamp=new THREE.MeshBasicMaterial({color:0xffffff});
    const im=new THREE.InstancedMesh(geo[kind],MAT.sigLamp,a.length);a.forEach((e,i)=>{im.setMatrixAt(i,e.m);im.setColorAt(i,cols[e.c]);});
    im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;im.frustumCulled=false;im.userData.mapOwned=true;scene.add(im);SIGLAMP.im[kind]=im;}}
function sigLampSet(id,c){const kind=id[0]==='d'?'disc':id[0]==='a'?'arrow':'ped';const i=+id.slice(1);const im=SIGLAMP.im[kind];if(!im)return;const e=SIGLAMP.list[kind][i];if(e.c===c)return;e.c=c;im.setColorAt(i,SIGLAMP.col[c]);im.instanceColor.needsUpdate=true;}
function sigLampReset(){SIGLAMP.list={disc:[],arrow:[],ped:[]};SIGLAMP.im={};}
function signalMats(){const B=(c)=>new THREE.MeshBasicMaterial({color:C(c)});
  Object.assign(MAT,{lampOff:lambert(0x1e2326),sigG:B(0x2ff0d0),sigY:B(0xffc23a),sigR:B(0xff4636),pedROn:B(0xff4a3d),pedROff:B(0x3a1512),pedGOn:B(0x2ff0c8),pedGOff:B(0x0e2a26)});
  for(const k of['sigG','sigY','sigR','pedROn','pedGOn'])MAT[k].color.multiplyScalar(2.2);
  const s=new THREE.Shape();s.moveTo(-0.12,0.05);s.lineTo(0.04,0.05);s.lineTo(0.04,0.12);s.lineTo(0.15,0);s.lineTo(0.04,-0.12);s.lineTo(0.04,-0.05);s.lineTo(-0.12,-0.05);GEO.arrow=new THREE.ShapeGeometry(s);
  const parts=[];for(let i=0;i<10;i++)parts.push({g:'box',x:-0.5+0.05+i*0.1,y:0,z:0,sx:0.1,sy:0.07,sz:0.07,c:i%2?0x111111:0xf2c200});GEO.armGeo=mergeParts(parts);}
// ---- 踏切 ----
class Crossing{
  constructor(r,f,rail){this.r=r;this.f=f;this.rail=rail;this.s=f.s;this.alarm=false;this.bar=0;this.t=0;this.lamps=[];this.arms=[];const P=r.at(f.s);this.x=P.x;this.z=P.z;this.build();}
  build(){const r=this.r;const[lo,hi]=r.tRange(this.s);
    for(const dir of[1,-1]){if(dir>0?!r.nF:!r.nB)continue;const s=this.s-dir*6.2;const t=dir>0?lo-0.45:hi+0.45;const P=r.pt(s,t);const h=(dir>0?P.h:P.h+Math.PI);// 対象車の向き
      const face=h+Math.PI;const ff=fwd(face);
      const pole=new THREE.Mesh(GEO.box,MAT.model);pole.scale.set(0.14,3.6,0.14);pole.position.set(P.x,P.y+1.8,P.z);scene.add(pole);
      const e=signCell('crossbuck');const cb=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),MAT['sign'+e.page]);setPlaneUV(cb.geometry,e.uv);cb.position.set(P.x+ff.x*0.09,P.y+3.55,P.z+ff.z*0.09);cb.rotation.y=-face;scene.add(cb);
      const rt=rightV(face);for(const s2 of[-1,1]){const l=new THREE.Mesh(GEO.disc,MAT.lampOffR);l.scale.set(1.15,1.15,1);l.position.set(P.x+rt.x*s2*0.28+ff.x*0.1,P.y+2.7,P.z+rt.z*s2*0.28+ff.z*0.1);l.rotation.y=-face;scene.add(l);this.lamps.push(l);}
      const piv=new THREE.Group();const hf=fwd(h);piv.position.set(P.x+hf.x*0.3,P.y+1.0,P.z+hf.z*0.3);piv.rotation.y=-h;scene.add(piv);const arm=new THREE.Mesh(GEO.armGeo,MAT.model);
      const len=(hi-lo)*(r.center==='none'?1:0.55)+0.2;arm.scale.set(len,1,1);arm.position.set((dir>0?1:1)*len/2,0,0);piv.add(arm);this.arms.push({piv,sgn:1});}}
  update(dt,train){const d=train?train.distTo(this.x,this.z):Infinity;const need=d<340;
    if(need){if(!this.alarm){this.alarm=true;this.t=0;}this.t+=dt;if(this.t>3)this.bar=clamp(this.bar+dt/5,0,1);}else{this.alarm=false;this.bar=clamp(this.bar-dt/5,0,1);}
    const blink=(performance.now()%900)<450;this.lamps.forEach((l,i)=>l.material=this.alarm?((i%2===0)===blink?MAT.lampR:MAT.lampOffR):MAT.lampOffR);
    for(const a of this.arms)a.piv.rotation.z=(1-smooth(this.bar))*(Math.PI/2)*a.sgn;}
  blocked(){return this.alarm||this.bar>0.02;}
}
function setPlaneUV(g,uv){const[u0,v0,u1,v1]=uv;const a=g.attributes.uv;a.setXY(0,u0,v1);a.setXY(1,u1,v1);a.setXY(2,u0,v0);a.setXY(3,u1,v0);a.needsUpdate=true;}
// ---- 電車（直線の線路を走る） ----
class Train{
  constructor(rail){this.rail=rail;this.cars=[];for(let i=0;i<(rail.cars||4);i++){const m=makeTrainCar(i===0||i===(rail.cars||4)-1,rail.stripe);m.visible=false;scene.add(m);this.cars.push(m);}
    this.active=false;this.wait=rail.wait||25;this.pos=0;this.dir=1;this.v=rail.v||16.7;this.len=(rail.cars||4)*20.5;}
  // 線路：{ax:'x'|'z', c, a, b, y}
  dispatch(dir,arrive,eta){this.dir=dir;this.pos=arrive-dir*this.v*eta;this.active=true;this.cars.forEach(c=>c.visible=true);}
  distTo(x,z){if(!this.active)return Infinity;const R0=this.rail;const c=R0.ax==='x'?x:z;const head=this.pos,tail=this.pos-this.dir*this.len;const lo=Math.min(head,tail)-6,hi=Math.max(head,tail)+6;if(c>=lo&&c<=hi)return 0;const d=(c-head)*this.dir;return d>0?d:Infinity;}
  update(dt){const R0=this.rail;if(!this.active){if(R0.auto===false)return;this.wait-=dt;if(this.wait<=0){this.dispatch(R()<0.5?1:-1,(R0.a+R0.b)/2,26+R()*10);}return;}
    this.pos+=this.dir*this.v*dt;const off=this.dir>0?-2.2:2.2;
    this.cars.forEach((c,i)=>{const p=this.pos-this.dir*(10+i*20.5);if(R0.ax==='x'){c.position.set(p,R0.y||0,R0.c+off);c.rotation.y=this.dir>0?-Math.PI/2:Math.PI/2;}else{c.position.set(R0.c-off,R0.y||0,p);c.rotation.y=this.dir>0?Math.PI:0;}});
    if(this.pos<R0.a-300||this.pos>R0.b+300){this.active=false;this.cars.forEach(c=>c.visible=false);this.wait=40+R()*50;}}
}
function buildSignals(){let k=0;const SB=new Batch();sigLampReset();for(const n of NET.nodes)if(n.kind==='x'&&n.signal){SIGS.set(n.k,new Signal(n,k*11.3,SB));k++;}SB.build(scene,MAT,{shadow:{def:{cast:true,recv:true}}});sigLampBuild();for(const s of SIGS.values())s.paint();}
function buildCrossings(rail){for(const r of NET.roads)for(const f of r.feats)if(f.type==='rail'&&f.s!==undefined)XINGS.push(new Crossing(r,f,rail));if(rail)TRAIN=new Train(rail);}

