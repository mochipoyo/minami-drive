// ===== 12_stages.js : 地図の登録と教習の内容 =====
const STAGE={running:false,over:false,paused:false,menu:true,scoring:true,time:0,idx:0};
const MAPS={};
const TEXTSIGNS=[];// 看板（店名など）{x,y,z,h,w,hh,text,bg,fg,bar}
// ---- みなみ町 ----
MAPS.town={id:'town',name:'みなみ町',bounds:[-400,-400,400,400],keepOut:[],
  def(){return townDef();},
  after(){for(const r of NET.roads)townFeatS(r);const S=TOWN.SITES;this.keepOut=Object.values(S).map(s=>({x0:s.x0,x1:s.x1,z0:s.z0,z1:s.z1}));this.keepOut.push({x0:-500,x1:500,z0:TOWN.RAIL_Z-9,z1:TOWN.RAIL_Z+9});},
  rail:{ax:'x',c:250,a:-500,b:500,y:0,cars:4,v:16.7},
  traffic:{n:26,bikes:6,peds:22,mix:{kei:3,compact:3,sedan:2,van:2,suv:1,truck:1,taxi:1,bus:0.5}},
  signIds:['s30','s40','s50','s60','stop','xwalk','rail','school','p_school','oneway','noentry','crossbuck','tomare','diamond','m40','m30','m50','m60','blank','busonly'],
  signs(){townSigns();autoSigns();},
  build(B,wires){buildSignMeshes(B);curveMirrors(B);buildPoles(B,wires);buildStreetLights(B);buildGuardPipes(B,{filter:r=>r.def.tier==='R'});buildStreetTrees(B,{filter:r=>r.def.tier!=='S'});buildResWalls(B);
    townSites(B);
    lineBuildings(B,{seed:42,kinds:(r)=>r.type==='RES'?['house','house','house','apt']:r.def.tier==='R'?['shop','shop','apt','office']:['shop','apt','apt','house']});
    R=rng(43);for(let i=0;i<900;i++){const x=-380+R()*760,z=-380+R()*760;const w=8+R()*6,d=8+R()*6;addBuilding(B,R()<0.75?'house':'apt',x,z,w,d,pick([0,Math.PI/2,Math.PI,-Math.PI/2]));}
    buildTownRail(B);
    for(const[x,z,h]of[[-146.2,-120,Math.PI/2],[153.1,-100,-Math.PI/2],[-266.4,10,Math.PI/2],[153.1,120,-Math.PI/2]])vending(B,x,z,0,h);
    B.ground('grass',-700,-700,700,700,-0.06,COL.grass,10);}};
function TA(group,along){return townRoadAt(group,along);}
function townSigns(){const at=(g,a)=>TA(g,a);
  for(const[g,a,d]of[['S1',-138,1],['S1',-10,1],['S1',10,-1]]){const q=at(g,a);if(q)placeSign(q.road,q.s,d*q.sign,['school','p_school'],{size:0.85});}
  {const q=at('S6',-142);if(q)placeSign(q.road,q.s,1,['oneway'],{size:0.9,top:2.6});}
  {const q=at('S6',53);if(q){placeSign(q.road,q.s,-1,['noentry'],{size:0.8,side:'L'});placeSign(q.road,q.s,-1,['noentry'],{size:0.8,side:'R'});}}}
function townSites(B){const S=TOWN.SITES.school;B.ground('def',S.x0,S.z0+4,S.x1,S.z0+60,0.01,0xb59f7a);
  B.wallBox('fac0',-75,-182,0,108,12,18,0xe9e6dc,0,6,6);B.box('def',-75,12.3,-182,108.4,0.6,18.4,0x8c8a86);
  B.wallBox('wall',-30,-224,0,24,9,20,0xd9d6cc,0,6,4.5);roofGable(B,-30,-224,9,24,20,1.6,Math.PI/2,0x5f6b74);
  for(let x=S.x0+1;x<S.x1;x+=2.5){B.box('def',x,1,S.z0+0.5,0.06,2,0.06,0x2f6b4f);}B.box('def',(S.x0+S.x1)/2,1.95,S.z0+0.5,S.x1-S.x0,0.06,0.06,0x2f6b4f);B.box('def',(S.x0+S.x1)/2,1.0,S.z0+0.5,S.x1-S.x0,1.9,0.02,0x3c7a5c);
  BUILT.push({x0:-130,x1:-20,z0:-191,z1:-173},{x0:-42,x1:-18,z0:-234,z1:-214});
  const P=TOWN.SITES.park;B.ground('grass',P.x0,P.z0,P.x1,P.z1,0.015,0x6f9a52,8);B.ground('def',P.x0+20,P.z0+30,P.x1-20,P.z1-30,0.02,0xc2ab84);
  for(let i=0;i<40;i++){const x=P.x0+4+R()*(P.x1-P.x0-8),z=P.z0+4+R()*(P.z1-P.z0-8);if(x>P.x0+18&&x<P.x1-18&&z>P.z0+28&&z<P.z1-28)continue;tree(B,x,z,1+R()*0.6);}
  B.box('def',60,1.2,0,6,0.1,1.2,0xd04a3a);B.box('def',57,1.4,0,0.2,2.8,1.2,0xd04a3a);B.box('def',66,1.0,0,0.2,2.0,0.2,0x777777);
  for(const[x,z]of[[40,-20],[90,15],[110,-25]])B.box('def',x,0.45,z,1.8,0.1,0.5,0x8b5a2b);
  B.ground('walk',-35,176,35,205,0.05,0xffffff,4);B.wallBox('fac3',0,221,0,70,8,32,0xe7e2d6,0,8,4);B.box('def',0,8.3,221,71,0.6,33,0x5b6670);
  for(const pz of[243.7,256.3]){B.box('def',0,0.5,pz,180,1.0,3.4,0xa6a29a);B.box('def',0,3.6,pz,120,0.2,3.6,0x6d7680);for(let x=-55;x<=55;x+=10)B.box('def',x,1.8,pz,0.18,2.6,0.18,0x6d7680);}
  BUILT.push({x0:-35,x1:35,z0:205,z1:237});
  B.wallBox('fac3',89,-192,0,58,4.2,22,0xf3f3f0,Math.PI,8,4.2);B.box('def',89,4.4,-192,58.4,0.4,22.4,0x8a8f93);B.box('def',89,3.6,-180.6,58,1.0,0.3,0x2f7d5b);
  BUILT.push({x0:60,x1:118,z0:-203,z1:-181});for(let i=0;i<5;i++)B.box('def',66+i*1.2,0.5,-179.5,0.08,1.0,1.6,0x333333);
  TEXTSIGNS.push({x:89,y:3.6,z:-180.42,h:Math.PI,w:5.5,hh:1.0,text:'まいにちマート',bg:'#2f7d5b',fg:'#ffffff'},{x:0,y:6.2,z:204.8,h:0,w:9,hh:2.0,text:'みなみ駅',bg:'#ffffff',fg:'#1c2622',bar:'#2b5fa8'},
    {x:-60,y:1.6,z:-254.6,h:0,w:2.4,hh:1.1,text:'みなみ第一小学校',bg:'#ffffff',fg:'#1c2622'});}
function buildTownRail(B){const z=TOWN.RAIL_Z;const xs=XROADS();const isRoad=(x)=>xs.some(c=>Math.abs(x-c)<5);
  B.ground('def',-700,z-5,700,z+5,0.0,COL.ballast);
  for(const tz of[z-2.2,z+2.2]){for(let x=-650;x<650;x+=1.1){if(isRoad(x))continue;B.box('def',x,0.05,tz,0.22,0.1,2.0,COL.sleeper);}
    const cuts=[-650,...xs.flatMap(c=>[c-4.6,c+4.6]),650].sort((a,b)=>a-b);
    for(const off of[-0.535,0.535]){for(let i=0;i<cuts.length;i+=2){const a=cuts[i],b=cuts[i+1];B.box('def',(a+b)/2,0.12,tz+off,b-a,0.12,0.07,COL.rail);}for(const c of xs)B.box('def',c,0.025,tz+off,9.2,0.03,0.09,0x4a4642);}}
  for(let x=-650;x<650;x+=45){if(isRoad(x)||isRoad(x+3)||isRoad(x-3))continue;B.box('def',x,3.4,z-4.6,0.25,6.8,0.25,0x8d939a);B.box('def',x,6.6,z,0.2,0.2,9.6,0x8d939a);}
  for(const tz of[z-2.2,z+2.2])B.box('def',0,6.0,tz,1300,0.03,0.03,0x2a2a2a);}
function XROADS(){const out=[];for(const r of NET.roads)for(const f of r.feats)if(f.type==='rail'&&f.s!==undefined){const P=r.at(f.s);out.push(P.x);}return out;}
// ---- 教習 ----
const XWm=(group,pos)=>{const q=TA(group,pos);if(!q)return null;return XWALKS.find(X=>X.mid&&X.r===q.road&&Math.abs(X.s-q.s)<1);};
const XWn=(k,L)=>XWALKS.find(X=>X.node&&X.node.id===k&&X.L===L);
function townPose(g){const q=TA(g[0],g[1]);return{road:q.road,s:q.s,dir:g[2]*q.sign};}
const STAGES=[
 {id:'s1',cat:'town',map:'town',name:'はじめての路上（発進・停止）',desc:'発進の手順、標識の最高速度、横断歩道、停止位置にぴったり止める',env:'day',envLabel:'昼・晴れ',startCheck:true,
  intro:'県道みなみ線を東へ走り、まいにちマートの手前にある停止位置（緑の枠）にぴったり止めます。',
  points:['発進前：シートベルト（{belt}）→ シフトをD（{gear}）→ 右の合図（{br}）→ 右後方を目で確認（{lkR}）→ パーキングブレーキ解除（{pb}）→ 発進（{acc}）。次に押すボタンは黄色く光ります','この道路は標識で最高速度40km/h。中央の黄色い線は「はみ出し禁止」','横断歩道で待っている人がいたら、手前で止まって道を譲る（第38条）','止まったらパーキングブレーキ（{pb}）。停止位置との差が小さいほど「ぴったり」'],
  start:['R1',-335,1],goal:['R1',-58,1],way:['-150,-150'],setup(){evPedWaiting(XWm('R1',-220),'old');}},
 {id:'s2',cat:'town',map:'town',name:'交差点の右左折',desc:'合図は30m手前、左折は左に寄せて、右折は対向車と歩行者を待つ',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'信号のある交差点で左折・右折・左折をして、市道 中央通りの停止位置まで走ります。',
  points:['右左折の合図は交差点の30m手前で（施行令第21条）','左折はあらかじめ左に寄せ、後ろから来る自転車に注意（第34条第1項）','右折は中央に寄せ、直進・左折する対向車を先に通す（第34条第2項・第37条）','赤信号でも青い右矢印が出ていれば右折できる','曲がった先の横断歩道の歩行者にも道を譲る'],
  start:['C2',-330,1],goal:['C1',72,1],way:['-150,-150','0,-150','0,60'],
  setup(){evLeftHook(NET.nodeById['-150,-150'],'N');evOncoming(NET.nodeById['0,-150'],'W');evPedWaiting(XWn('0,60','E'),'adult',true);}},
 {id:'s3',cat:'town',map:'town',name:'生活道路と一時停止',desc:'中央線のない道路は法定30km/h。止まれ・飛び出し・自転車・見通しの悪い交差点',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'通学路から生活道路を走ります。この道路には速度の標識がありませんが、2026年9月1日から法定速度は30km/hです。',
  points:['中央線のない生活道路の法定速度は30km/h（2026年9月1日から）','「止まれ」では停止線の直前で完全に止まる（第43条）','道路の端を歩く人のそばは間隔をあけるか徐行（第18条第2項）','自転車の右側を通るときは1m程度あける。あけられないなら20〜30km/h程度に（警察庁の目安）','見通しの悪い交差点は徐行（第42条）。駐車車両のかげにも注意'],
  start:['S1',-112,1],goal:['S2',-24,1],way:['0,-260','150,-260','150,-150','150,-60'],
  setup(){const k=TA('S1',-92),k2=TA('S1',-12);if(k&&k2&&k.road===k2.road)evKids(k.road,k.s,k2.s,k.sign);else if(k)evKids(k.road,k.s,k.s+k.sign*60,k.sign);
    const c=TA('S2',-212);evChildRunOut(c.road,c.s,c.sign);const b=TA('S2',-128);evBike(b.road,b.s,b.sign,true);}},
 {id:'s4',cat:'town',map:'town',name:'踏切',desc:'踏切の手前で停止して左右確認。警報中は入らない。先が詰まっていたら待つ',env:'evening',envLabel:'夕方',autoReady:true,
  intro:'2か所の踏切を通って、線路向こうの道から駅前に戻ります。',
  points:['踏切の手前（停止線の直前）で必ず止まり、左右を確認（第33条第1項）。{lkL}・{lkR}で左右を見る','警報機が鳴っている・遮断機が下りている間は入らない（第33条第2項）','踏切の先が詰まっていて、入ると踏切内で止まりそうなら入らない（第50条第2項）'],
  start:['C2',98,1],goal:['S2',204,-1],way:['-150,170','-150,330','150,330'],
  setup(){const X=XINGS.find(x=>x.r.def.group==='C2');if(X)evTrain(X,20);const Y=XINGS.find(x=>x.r.def.group==='S2');if(Y){const sg=TA('S2',260);evRailJam(Y.r,Y.f,-sg.sign);}}},
 {id:'s5',cat:'town',map:'town',name:'緊急時の対応',desc:'スマホ通知・救急車・急な雨・緊急地震速報',env:'day',envLabel:'昼→雨',autoReady:true,
  intro:'市道 中央通りを東へ走ります。中央線があり速度標識がないので、法定速度は60km/hです。途中でいろいろなことが起こります。',
  points:['走行中はスマホの画面を見ない（第71条第5号の5）','救急車が近づいたら左に寄って進路を譲る。交差点付近では交差点を避けて止まる（第40条）','視界が悪いときはライトをつけ、速度を落とす','緊急地震速報：ハザード（{hz}）をつけ、急ブレーキを避けて緩やかに減速。道路の左側に止める（交通の方法に関する教則）'],
  start:['C1',-345,1],goal:['C1',335,1],way:[],noGoalFinish:true,
  setup(){STAGE.queue=[{x:-322,fn:()=>{evPhone();return true;}},{x:-232,fn:()=>!!evAmbulance()},{x:-55,fn:()=>{evWeather('rain');return true;}},{x:45,fn:()=>{const e=evQuake();STAGE.finishOnQuake=e;return true;}}];}},
 {id:'s6',cat:'town',map:'town',name:'総合路上（ランダム）',desc:'出発地・目的地・天候・できごとが毎回変わる仕上げの教習',env:'day',envLabel:'毎回ちがう',autoReady:true,random:true,
  intro:'これまでの総まとめです。ナビの案内に従って目的地の停止位置まで走ります。何が起きるかは走ってみないと分かりません。',
  points:['ナビの矢印と距離を見て、早めに合図・車線の位置取り','標識がなければ、中央線の有無で法定速度が30km/hか60km/hか変わる','夜や雨・霧ではライト（{lt}）をつける'],
  generate(){const starts=[['R1',-335,1],['C2',-330,1],['C1',-345,1],['R2',-330,1],['S1',-112,1],['C2',98,1],['C1',345,-1],['R1',335,-1]];this.start=pick(starts);
    const cand=NET.roads.filter(r=>r.len>70&&r.startNode&&r.endNode&&r.startNode.kind==='x'&&r.endNode.kind==='x');this.goalRS=null;
    for(let tries=0;tries<60;tries++){const r=pick(cand);const dir=r.oneway||(R()<0.5?1:-1);const s=r.len/2+(R()-0.5)*r.len*0.3;const st=townPose(this.start);const n0=st.dir>0?st.road.endNode:st.road.startNode;const n1=dir>0?r.startNode:r.endNode;
      const inL=st.dir>0?st.road.endLeg:st.road.startLeg;const path=routeNodes(n0,n1,inL,dir>0?r.startLeg:r.endLeg);if(!path||path.length<3||path.length>8)continue;this.goalRS={road:r,s,dir};break;}
    this.way=[];this.env=pick(['day','day','evening','night','rain']);this.envLabel={day:'昼・晴れ',evening:'夕方',night:'夜',rain:'雨'}[this.env];
    STAGE.queue=[];const pool=['phone','brake','amb','kid','bike','bike','fog'];let odo=140;for(let i=0;i<3;i++){const k=pool.splice(Math.floor(R()*pool.length),1)[0];STAGE.queue.push({odo,k});odo+=170+R()*80;}}},
 {id:'s7',cat:'free',map:'town',name:'みなみ町 フリー走行',desc:'採点なしで町を自由に走る。交通の流れや標識を観察しよう',env:'day',envLabel:'昼・晴れ',autoReady:true,scoring:false,
  intro:'採点なしで自由に走れます。気になる交差点や踏切で、信号や標識の意味を確かめてみましょう。',points:['違反の解説は表示されますが、点数はつきません','{pause}でいつでもメニューに戻れます'],start:['R1',-335,1],goal:null,way:[]},
];
function goalFrom(rs){const r=rs.road,dir=rs.dir;const P=edgePos(r,rs.s,dir,PLAYER.W/2+0.45);const l=r.lanes(dir)[0];return{x:P.x,z:P.z,y:P.y,h:P.h,t:P.t,road:r,s:rs.s,dir,lane:l};}
let goalMarker=null;
function makeGoalMarker(g){if(goalMarker){scene.remove(goalMarker);goalMarker=null;}if(!g)return;const grp=new THREE.Group();const f=fwd(g.h);const y=g.y||0;
  const box=new THREE.Mesh(new THREE.PlaneGeometry(2.2,4.6),new THREE.MeshBasicMaterial({color:C(0x22c55e),transparent:true,opacity:0.32,depthWrite:false}));box.rotation.x=-Math.PI/2;box.rotation.z=-g.h;box.position.set(g.x-f.x*2.3,y+0.05,g.z-f.z*2.3);grp.add(box);
  const line=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.3),basic(0xffffff));line.rotation.x=-Math.PI/2;line.rotation.z=-g.h;line.position.set(g.x,y+0.06,g.z);grp.add(line);
  const c=cvs(256,128),x=c.getContext('2d');x.fillStyle='#1f7a4d';x.fillRect(0,0,256,128);x.strokeStyle='#fff';x.lineWidth=8;x.strokeRect(6,6,244,116);txt(x,'停止位置',128,66,48,'#fff',FONT_JP,'center','bold');
  const r=rightV(g.h);const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.7),new THREE.MeshBasicMaterial({map:texFrom(c),side:THREE.DoubleSide}));const sx=g.x-r.x*1.6+f.x*0.3,sz=g.z-r.z*1.6+f.z*0.3;sign.position.set(sx,y+2.2,sz);sign.rotation.y=-g.h;grp.add(sign);
  const pole=new THREE.Mesh(GEO.cyl,lambert(0x9aa0a6));pole.scale.set(0.04,1.9,0.04);pole.position.set(sx,y+0.95,sz);grp.add(pole);scene.add(grp);goalMarker=grp;}
// 経路探索（Uターンなし）：交差点ごとに「どの脚から入ってきたか」を状態に持つ。exitLeg: 最後の交差点で出ていく脚（入ってきた脚とは別でないといけない）
function routeNodes(from,to,banLeg,exitLeg){if(!from||!to)return null;const key=(n,L)=>n.id+'|'+(L||'');
  const s0={n:from,L:banLeg||null,start:true};const dist=new Map([[key(from,s0.L),0]]),prev=new Map(),q=[s0];let end=null;
  while(q.length){let bi=0;for(let i=1;i<q.length;i++)if(dist.get(key(q[i].n,q[i].L))<dist.get(key(q[bi].n,q[bi].L)))bi=i;const cur=q.splice(bi,1)[0];const du=dist.get(key(cur.n,cur.L));
    if(cur.n===to&&!cur.start&&(!exitLeg||cur.L!==exitLeg)){end=cur;break;}
    if(du>9000)continue;
    for(const L in cur.n.legs){if(L===cur.L)continue;const e=cur.n.legs[L];const r=e.road;const dir=e.end==='start'?1:-1;if(!r.lanes(dir).length||r.def.pedOnly)continue;
      // 指定方向外進行禁止（右折禁止など）
      if(cur.L&&cur.n.noTurn&&cur.n.noTurn[cur.L]&&cur.n.noTurn[cur.L].includes(legTurn(cur.n,cur.L,L)))continue;
      const m=dir>0?r.endNode:r.startNode;if(!m)continue;if(m.kind==='portal'&&m!==to)continue;const Lm=dir>0?r.endLeg:r.startLeg;const k=key(m,Lm);const d=du+r.len+10;
      if(!dist.has(k)||d<dist.get(k)){dist.set(k,d);prev.set(k,cur);q.push({n:m,L:Lm});}}}
  if(!end){if(from===to&&(!exitLeg||banLeg!==exitLeg)){const p=[from];p.arrL=banLeg;return p;}return null;}
  const path=[end.n];let c=end;while(!c.start){c=prev.get(key(c.n,c.L));path.unshift(c.n);}path.arrL=end.L;return path;}
// ナビの経路：経由地を順に通ってゴールの道路へ（Uターンなし）
function navPath(n0,inLeg){const G=NAV.goal;const targets=[...NAV.wps];let gExit=null;if(G&&G.road){targets.push(G.dir>0?G.road.startNode:G.road.endNode);gExit=G.dir>0?G.road.startLeg:G.road.endLeg;}
  let path=[n0],cur=n0,ban=inLeg;
  for(let i=0;i<targets.length;i++){const t=targets[i];const last=i===targets.length-1;const ex=last?gExit:null;
    if(t===cur&&path.length===1&&(!last||!ex||ex!==ban)){if(last){path.exitLeg=ex;return path;}continue;}
    const seg=routeNodes(cur,t,ban,ex);if(!seg)return path.length>1?path:null;path=path.concat(seg.slice(1));cur=t;ban=seg.arrL;}
  path.exitLeg=gExit;return path;}
function legTo(n,m){for(const L in n.legs){const e=n.legs[L];const r=e.road;const o=e.end==='start'?r.endNode:r.startNode;if(o===m)return L;}return null;}

