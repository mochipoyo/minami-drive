// ===== 02d_map_city.js : さくら区（都会の町）の道路網 =====
// 架空の町。大通り（片側3車線・中央分離帯・上に都市高速の高架）、幹線（片側2車線・右折車線・矢印信号）、
// 駅前のスクランブル交差点、一方通行の裏通り・路地、歩行者用道路の商店街、住宅街。
// kind: AV=大通り AR=幹線 ST=駅前通り C2/C1=中央線のある2車線 OW=一方通行 RS=住宅街 PED=歩行者用道路 AL=路地（一方通行）
const CITY={
  ROADS:[
    {id:'A0',name:'さくら通り',ax:'x',c:0,a:-600,b:600,kind:'AV'},
    {id:'A1',name:'駅前通り',ax:'x',c:-250,a:-400,b:400,kind:'ST'},
    {id:'A2',name:'中通り（一方通行）',ax:'x',c:-125,a:-400,b:400,kind:'OW',rev:true},// 西向きの一方通行
    {id:'A3',name:'南通り',ax:'x',c:170,a:-600,b:600,kind:'C2'},
    {id:'A4',name:'さくら台の道',ax:'x',c:300,a:-400,b:400,kind:'RS'},
    {id:'B0',name:'西大通り',ax:'z',c:-400,a:-460,b:460,kind:'AR'},
    {id:'B1',name:'一番町通り',ax:'z',c:-200,a:-250,b:300,kind:'C1'},
    {id:'B2',name:'駅前大通り',ax:'z',c:0,a:-460,b:170,kind:'AR'},
    {id:'B3',name:'二番町通り',ax:'z',c:200,a:-250,b:300,kind:'C1'},
    {id:'B4',name:'東大通り',ax:'z',c:400,a:-460,b:460,kind:'AR'},
    {id:'G1',name:'さくら銀座商店街',ax:'z',c:-300,a:-250,b:-125,kind:'PED'},
    {id:'L1',name:'一番町の路地（一方通行）',ax:'z',c:-100,a:-250,b:-125,kind:'AL'},// 南向き
    {id:'L2',name:'二番町の路地（一方通行）',ax:'z',c:100,a:-250,b:-125,kind:'AL',rev:true},// 北向き
  ],
  RAIL_Z:-335,RAIL_Y:8.6,MAPX:600,MAPZ:460,
  // 信号（arrow:右折の矢印信号、scramble:歩行者の斜め横断を含む）
  SIGNALS:{'-400,0':{arrow:true,g:{NS:18,EW:26}},'0,0':{arrow:true,g:{NS:20,EW:26}},'400,0':{arrow:true,g:{NS:18,EW:26}},'-200,0':{g:{NS:13,EW:28}},'200,0':{g:{NS:13,EW:28}},
    '-400,-250':{g:{NS:22,EW:16}},'400,-250':{g:{NS:22,EW:16}},'0,-250':{scramble:true,g:{NS:18,EW:16},pg:20},'0,-125':{g:{NS:24,EW:12}},
    '-400,170':{g:{NS:22,EW:16}},'0,170':{g:{NS:18,EW:20}},'400,170':{g:{NS:22,EW:16}}},
  // 一時停止（その脚から交差点に入る車が止まる）
  STOPS:{'-200,-250':['S'],'200,-250':['S'],'-400,-125':['E'],'-200,-125':['E'],'200,-125':['E'],'-100,-125':['N'],'100,-250':['S'],
    '-300,-250':['S'],'-300,-125':['N'],'-200,170':['N','S'],'200,170':['N','S'],'-400,300':['E'],'400,300':['W'],'-200,300':['E','W'],'200,300':['E','W']},
  // 一時停止も信号もないが、通る道路の側が優先（交差する道路から入ってくる車がない）
  PRIORITY:['-100,-250','100,-125','400,-125'],
  // 大通りから右折できない交差点（指定方向外進行禁止：直進・左折のみ）
  NOTURN:{'-200,0':{W:['R'],E:['R']},'200,0':{W:['R'],E:['R']}},
  // 交差点の名前（信号の上の交差点名標識）
  XNAMES:{'-400,0':['さくら通り西','Sakura-dori Nishi'],'0,0':['さくら通り中央','Sakura-dori Chuo'],'400,0':['さくら通り東','Sakura-dori Higashi'],'-200,0':['一番町','Ichiban-cho'],'200,0':['二番町','Niban-cho'],
    '0,-250':['さくら駅前','Sakura Sta.'],'-400,-250':['西口','Nishiguchi'],'400,-250':['東口','Higashiguchi'],'0,-125':['中通り','Naka-dori'],'-400,170':['南通り西','Minami-dori Nishi'],'0,170':['南通り中央','Minami-dori Chuo'],'400,170':['南通り東','Minami-dori Higashi']},
  MIDXWALK:[{road:'A3',pos:-300,w:4},{road:'A3',pos:300,w:4},{road:'A4',pos:-100,w:3.5}],
  // バス停（道路グループ・位置・向き）
  BUS:[{road:'A0',pos:-300,dir:1,name:'一番町'},{road:'A0',pos:-90,dir:-1,name:'さくら通り中央'},{road:'A0',pos:120,dir:1,name:'二番町'},{road:'A0',pos:300,dir:-1,name:'東大通り入口'},
    {road:'B2',pos:-190,dir:-1,name:'さくら駅前'},{road:'B2',pos:-60,dir:1,name:'中通り'},{road:'A3',pos:-120,dir:1,name:'南一丁目'},{road:'A3',pos:110,dir:-1,name:'南二丁目'}],
  SITES:{station:{x0:16,x1:182,z0:-356,z1:-262},plaza:{x0:16,x1:182,z0:-300,z1:-262},viaduct:{x0:-760,x1:760,z0:-344,z1:-326},park:{x0:-388,x1:-212,z0:188,z1:282}},
};
// 道路の横断面（kind → 道路の設定）
function cityProf(k){switch(k){
  case'AV':return{type:'ART',nF:3,nB:3,w:3.25,med:{w:4.5,kind:'planter'},sh:[0.5,0.25],walk:[5.5,5.5],limit:50,tier:'AV',bus:{F:'prio',B:'prio'}};
  case'AR':return{type:'ART',nF:2,nB:2,w:3.25,med:{w:3.25,kind:'zebra'},sh:[0.5,0.25],walk:[4.5,4.5],limit:50,tier:'AR'};
  case'ST':return{type:'ART',nF:2,nB:2,w:3.1,med:{w:0.5,kind:'yellow'},sh:[0.5,0.15],walk:[5,5],limit:40,tier:'ST'};
  case'C2':return{type:'COL',nF:1,nB:1,w:3.0,sh:[0.75,0],center:'white',walk:[3.5,3.5],limit:40,tier:'C2'};
  case'C1':return{type:'COL',nF:1,nB:1,w:2.9,sh:[0.6,0],center:'white',walk:[3,3],limit:30,tier:'C1'};
  case'OW':return{type:'RES',nF:1,nB:0,w:3.0,sh:[0.9,0.9],walk:[0,0],tier:'OW'};
  case'RS':return{type:'RES',nF:1,nB:1,w:2.3,sh:[0.6,0],center:'none',walk:[0,0],tier:'RS'};
  case'PED':return{type:'RES',nF:1,nB:1,w:2.6,sh:[0.5,0],center:'none',walk:[0,0],tier:'PED',pedOnly:true};
  case'AL':return{type:'RES',nF:1,nB:0,w:2.6,sh:[0.5,0.5],walk:[0,0],tier:'AL'};}}
function cityDef(){const T=CITY;const nodes=[],roads=[];const nmap=new Map();const key=(x,z)=>x+','+z;
  const getNode=(x,z,kind)=>{const k=key(x,z);let n=nmap.get(k);if(!n){n={id:k,x,z,kind};nmap.set(k,n);nodes.push(n);}return n;};
  for(const a of T.ROADS)if(a.ax==='x')for(const b of T.ROADS)if(b.ax==='z'){if(b.c>=a.a&&b.c<=a.b&&a.c>=b.a&&a.c<=b.b)getNode(b.c,a.c,'x');}
  for(const r of T.ROADS)for(const e of[r.a,r.b]){const x=r.ax==='x'?e:r.c,z=r.ax==='x'?r.c:e;if(!nmap.get(key(x,z)))getNode(x,z,'portal');}
  // 各交差点にどの脚があるか（一方通行・歩行者用道路を考える）
  const legsAt=new Map();const addLeg=(n,L,info)=>{let m=legsAt.get(n.id);if(!m){m={};legsAt.set(n.id,m);}m[L]=info;};
  const segs=[];
  for(const r of T.ROADS){const ns=nodes.filter(n=>r.ax==='x'?(n.z===r.c&&n.x>=r.a&&n.x<=r.b):(n.x===r.c&&n.z>=r.a&&n.z<=r.b)).sort((p,q)=>r.ax==='x'?p.x-q.x:p.z-q.z);
    for(let i=0;i<ns.length-1;i++){let A=ns[i],B=ns[i+1];if(r.rev){const t=A;A=B;B=t;}const P=cityProf(r.kind);
      const d=Object.assign({id:r.id+'_'+i,name:r.name,group:r.id,from:A.id,to:B.id,path:[[A.x,A.z],[B.x,B.z]],feats:[]},P);
      const dx=Math.sign(B.x-A.x),dz=Math.sign(B.z-A.z);const Lstart=legOfDir(dx,dz),Lend=legOfDir(-dx,-dz);// 始点側の交差点では Lstart の脚、終点側では Lend の脚
      addLeg(A,Lstart,{d,end:'start'});addLeg(B,Lend,{d,end:'end'});segs.push(d);
      const c0=r.ax==='x'?Math.min(A.x,B.x):Math.min(A.z,B.z),c1=r.ax==='x'?Math.max(A.x,B.x):Math.max(A.z,B.z);
      for(const m of T.MIDXWALK)if(m.road===r.id&&m.pos>c0&&m.pos<c1)d.feats.push({type:'xwalk',abs:m.pos,w:m.w||4});
      roads.push(d);}}
  for(const n of nodes){if(n.kind!=='x')continue;const sg=T.SIGNALS[n.id];if(sg){n.signal=Object.assign({},sg);n.xwalk=true;}if(T.STOPS[n.id])n.stop=T.STOPS[n.id].slice();if(T.NOTURN[n.id])n.noTurn=T.NOTURN[n.id];
    const L=legsAt.get(n.id)||{};const tiers=Object.values(L).map(e=>e.d.tier);const small=tiers.every(t=>t==='RS'||t==='AL'||t==='OW'||t==='PED');
    n.filR=small?4.5:tiers.includes('AV')||tiers.includes('AR')?9:tiers.includes('ST')?8:6;
    if(T.PRIORITY.includes(n.id))n.priority=true;
    if(!sg){// 信号のない交差点：中央線のある2車線の道路の側だけ横断歩道
      const xw=[];for(const k in L){const t=L[k].d.tier;if(t==='C1'||t==='C2')xw.push(k);}n.xwalk=xw.length&&!small?xw:false;}}
  // 交差点で、ある脚から入った車が進める方向
  const avail=(n,Lin)=>{const L=legsAt.get(n.id)||{};const out=new Set();for(const L2 in L){if(L2===Lin)continue;const e=L[L2];if(e.d.pedOnly)continue;
      const dirOut=e.end==='start'?1:-1;const lanes=dirOut>0?e.d.nF:e.d.nB;if(!lanes)continue;const t=turnOf(legHeading[Lin],outHeading[L2]);if(n.noTurn&&n.noTurn[Lin]&&n.noTurn[Lin].includes(t))continue;out.add(t);}return out;};
  // 車線の矢印・右折車線
  for(const d of segs){const A=nmap.get(d.from),B=nmap.get(d.to);d.patches=[];d.arrows={};
    const len=Math.hypot(B.x-A.x,B.z-A.z);
    for(const dir of[1,-1]){const nLanes=dir>0?d.nF:d.nB;if(!nLanes)continue;const n=dir>0?B:A;if(n.kind!=='x')continue;const Lin=dir>0?legOfDir(A.x-B.x,A.z-B.z):legOfDir(B.x-A.x,B.z-A.z);
      const av=avail(n,Lin);const sig=!!T.SIGNALS[n.id];const wantR=sig&&(d.tier==='AV'||d.tier==='AR')&&av.has('R')&&len>=110;
      if(wantR){const pl=Math.min(60,len*0.42);if(dir>0)d.patches.push({dir:1,kind:'turnR',side:'R',s0:-pl,s1:0,kA:20,wA0:true});else d.patches.push({dir:-1,kind:'turnR',side:'R',s0:0,s1:pl,kB:20,wB0:true});}
      if(nLanes>=2){const set=[];for(let i=0;i<nLanes;i++){let a='';if(i===0){if(av.has('L'))a+='L';if(av.has('S'))a+='S';}else if(av.has('S'))a+='S';
          if(i===nLanes-1&&!wantR&&av.has('R'))a+='R';if(!a)a=i===0?(av.has('L')?'L':'S'):(av.has('R')?'R':'S');set.push(a);}
        if(wantR)set.push('R');d.arrows[dir>0?'F':'B']=set;}}}
  return{nodes,roads,links:[]};}
// v1互換：グループ名と絶対座標から道路とsを得る（さくら区）
function cityRoadAt(group,along){return townRoadAt(group,along);}
function cityPose(g){const q=cityRoadAt(g[0],g[1]);return{road:q.road,s:q.s,dir:g[2]*q.sign};}
