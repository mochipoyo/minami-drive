// ===== 02b_map_town.js : みなみ町（v1の町を新しい道路網で再現） =====
const TOWN={
  ROADS:[
    {id:'R1',name:'県道みなみ線',ax:'x',c:-150,a:-380,b:380,kind:'R',limit:40},
    {id:'R2',name:'えき通り',ax:'z',c:0,a:-380,b:170,kind:'R',limit:40},
    {id:'C1',name:'市道 中央通り',ax:'x',c:60,a:-380,b:380,kind:'C',limit:0},
    {id:'C2',name:'市道 西通り',ax:'z',c:-150,a:-380,b:330,kind:'C',limit:40},
    {id:'S1',name:'通学路',ax:'x',c:-260,a:-150,b:150,kind:'S'},
    {id:'S2',name:'東通り（生活道路）',ax:'z',c:150,a:-260,b:330,kind:'S'},
    {id:'S3',name:'駅前通り（生活道路）',ax:'x',c:170,a:-150,b:150,kind:'S'},
    {id:'S4',name:'西町（生活道路）',ax:'z',c:-270,a:-150,b:60,kind:'S'},
    {id:'S5',name:'公園通り（生活道路）',ax:'x',c:-60,a:0,b:150,kind:'S'},
    {id:'S6',name:'一方通行（生活道路）',ax:'z',c:270,a:-150,b:60,kind:'S',oneway:1},
    {id:'S7',name:'線路向こうの道（生活道路）',ax:'x',c:330,a:-150,b:150,kind:'S'},
  ],
  RAIL_Z:250,MAP:400,
  SIGNALS:{'0,-150':{arrow:true},'-150,-150':{},'0,60':{},'-150,60':{}},
  STOPS:{'150,-150':['N','S'],'-270,-150':['S'],'-270,60':['N'],'270,60':['N'],'150,60':['N','S'],
    '-150,-260':['E'],'0,-260':['E','W'],'-150,170':['E'],'0,170':['S'],'150,170':['W'],'0,-60':['E'],'150,-60':['W']},
  MIDXWALK:[{road:'R1',pos:-220},{road:'C1',pos:-80},{road:'S1',pos:-60}],
  SITES:{school:{x0:-142,x1:-8,z0:-255,z1:-160},park:{x0:8,x1:142,z0:-55,z1:53},station:{x0:-95,x1:95,z0:176,z1:262},mart:{x0:58,x1:120,z0:-205,z1:-158}},
};
// v1の格子道路を、交差点ごとに区切った道路に変換する
function townDef(){const T=TOWN;const nodes=[],roads=[];const nmap=new Map();
  const key=(x,z)=>x+','+z;
  const getNode=(x,z,kind)=>{const k=key(x,z);let n=nmap.get(k);if(!n){n={id:k,x,z,kind};nmap.set(k,n);nodes.push(n);}return n;};
  // 交差点
  for(const a of T.ROADS)if(a.ax==='x')for(const b of T.ROADS)if(b.ax==='z'){if(b.c>=a.a&&b.c<=a.b&&a.c>=b.a&&a.c<=b.b)getNode(b.c,a.c,'x');}
  // 地図の外へ続く端
  for(const r of T.ROADS)for(const e of[r.a,r.b]){const x=r.ax==='x'?e:r.c,z=r.ax==='x'?r.c:e;if(!nmap.get(key(x,z))&&Math.abs(e)>=380)getNode(x,z,'portal');}
  for(const n of nodes){if(n.kind!=='x')continue;const sg=T.SIGNALS[n.id];if(sg){n.signal={arrow:!!sg.arrow,g:{NS:16,EW:18}};n.xwalk=true;}if(T.STOPS[n.id])n.stop=T.STOPS[n.id];}
  const prof=(k)=>k==='R'?{type:'COL',w:3.25,sh:[0.5,0],center:'yellow',walk:[3,3],tier:'R'}:k==='C'?{type:'COL',w:3.0,sh:[0.3,0],center:'white',walk:[2.5,2.5],tier:'C'}:{type:'RES',w:2.0,sh:[0.6,0],center:'none',walk:[0,0],tier:'S'};
  for(const r of T.ROADS){const ns=nodes.filter(n=>r.ax==='x'?(n.z===r.c&&n.x>=r.a&&n.x<=r.b):(n.x===r.c&&n.z>=r.a&&n.z<=r.b)).sort((p,q)=>r.ax==='x'?p.x-q.x:p.z-q.z);
    for(let i=0;i<ns.length-1;i++){const A=ns[i],B=ns[i+1];const P=prof(r.kind);
      const d=Object.assign({id:r.id+'_'+i,name:r.name,group:r.id,from:A.id,to:B.id,path:[[A.x,A.z],[B.x,B.z]],nF:1,nB:r.oneway?0:1,limit:r.limit||0,feats:[]},P);
      if(r.oneway){d.nB=0;d.nF=1;d.w=2.4;d.sh=[0.6,0.6];}
      // 横断歩道・踏切（v1の絶対座標→この道路のs）
      const c0=r.ax==='x'?A.x:A.z,c1=r.ax==='x'?B.x:B.z;
      for(const m of T.MIDXWALK)if(m.road===r.id&&m.pos>c0&&m.pos<c1)d.feats.push({type:'xwalk',abs:m.pos,w:4});
      if(r.ax==='z'&&T.RAIL_Z>c0&&T.RAIL_Z<c1)d.feats.push({type:'rail',abs:T.RAIL_Z,w:10});
      roads.push(d);}}
  for(const n of nodes){if(n.kind!=='x')continue;const tiers=[];for(const d of roads){if(d.from===n.id||d.to===n.id)tiers.push(d.tier);}
    const allS=tiers.every(t=>t==='S');const corner=tiers.length===2;n.filR=allS?(corner?6:4.5):5;}
  return{nodes,roads,links:[]};}
// 道路の絶対座標(v1のalong)→v2のs（区切った道路ごと）
function townFeatS(r){for(const f of r.feats){if(f.abs===undefined)continue;const a=r.at(0),b=r.at(r.len);const ax=Math.abs(b.x-a.x)>Math.abs(b.z-a.z);const p0=ax?a.x:a.z,p1=ax?b.x:b.z;f.s=(f.abs-p0)/(p1-p0)*r.len;}}
// v1互換：グループ名(R1など)と絶対座標から道路とsを得る
function townRoadAt(group,along){for(const r of NET.roads){if(r.def.group!==group)continue;const a=r.at(0),b=r.at(r.len);const ax=Math.abs(b.x-a.x)>Math.abs(b.z-a.z);const p0=ax?a.x:a.z,p1=ax?b.x:b.z;
    const lo=Math.min(p0,p1),hi=Math.max(p0,p1);if(along>=lo-0.01&&along<=hi+0.01)return{road:r,s:(along-p0)/(p1-p0)*r.len,sign:Math.sign(p1-p0)};}return null;}

