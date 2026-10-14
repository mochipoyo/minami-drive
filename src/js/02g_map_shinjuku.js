// ===== 02g_map_shinjuku.js : 東京・新宿駅周辺の道路網（実在の地図データから） =====
// 元データ：OpenStreetMap（道路・線路・緑地。© OpenStreetMap contributors, ODbL）と
// 国土交通省 Project PLATEAU の 3D都市モデル（建物の形と高さ。新宿区 2025）。tools/shinjuku/ で assets/maps/shinjuku.json に変換してある。
// 実在の店名・ロゴは使わない（建物の形と高さ、道路の形と名前だけ）。
// 地図データは大きい（約1MB）ので、起動後に裏で読み込む。確認版（1ファイル）では window.__SHINJUKU_INLINE に埋め込む。
const SHINJUKU={data:null,state:'idle',url:'assets/maps/shinjuku.json',waiters:[],err:null};
function shinjukuStart(){if(SHINJUKU.state!=='idle')return;
  const inl=window.__SHINJUKU_INLINE;if(inl&&inl.roads){SHINJUKU.data=inl;SHINJUKU.state='ready';shinjukuDone();return;}
  if(location.protocol==='file:'){SHINJUKU.state='off';SHINJUKU.err='file';shinjukuDone();return;}
  SHINJUKU.state='loading';
  fetch(SHINJUKU.url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(d=>{if(!d||!d.roads)throw new Error('bad data');SHINJUKU.data=d;SHINJUKU.state='ready';shinjukuDone();})
    .catch(e=>{SHINJUKU.state='off';SHINJUKU.err=e&&e.message;console.warn('shinjuku map: off',SHINJUKU.err);shinjukuDone();});}
function shinjukuDone(){const w=SHINJUKU.waiters.splice(0);for(const f of w)f(SHINJUKU.state==='ready');}
// 教習の開始前に呼ぶ：読み込み済みなら true。まだなら読み込んで、終わったら cb(ok)
function shinjukuEnsure(cb){if(SHINJUKU.state==='ready')return true;if(SHINJUKU.state==='off'){SHINJUKU.state='idle';}SHINJUKU.waiters.push(cb);shinjukuStart();return false;}
// ---- データ → 道路網の定義（02_net.js の netBuild 用） ----
function shinjukuDef(){const D=SHINJUKU.data;const nodes=[],roads=[];
  for(const n of D.nodes){const d={id:n.id,x:n.x,z:n.z,kind:'x',polyAuto:true};if(n.signal)d.signal=Object.assign({g:{NS:20,EW:20}},n.signal);if(n.stop)d.stop=n.stop.slice();nodes.push(d);}
  for(const r of D.roads){const d={id:r.id,name:r.name||'',type:r.type,nF:r.nF,nB:r.nB,w:r.w,path:r.path,r:25,tier:r.cls,feats:[],limit:r.limit||0};// r：折れ点を半径25mで丸める（折れ目の外側に位置の特定できないすき間ができないように）
    if(r.med)d.med=r.med;
    if(r.from){d.from=r.from;d.leg0=r.leg0;d.cut0=r.cut0;}else if(r.portal0){const p=r.path[0];const id='p_'+r.id+'_0';nodes.push({id,x:p[0],z:p[1],kind:'portal'});d.from=id;}
    if(r.to){d.to=r.to;d.leg1=r.leg1;d.cut1=r.cut1;}else if(r.portal1){const p=r.path[r.path.length-1];const id='p_'+r.id+'_1';nodes.push({id,x:p[0],z:p[1],kind:'portal'});d.to=id;}
    if(r.elev){d.prof=[[Math.max(8,r.elev[0]-(r.cut0||0)),r.elev[1]]];d.ySmooth=30;}// 高架（s は切ったあとの道路の始点から）
    if(r.type==='RES')d.center='none';
    roads.push(d);}
  // 大通りの交差点：横断歩道（信号のない所でも大通りの側には横断歩道）
  const byId={};for(const n of nodes)byId[n.id]=n;const legArt={};
  for(const r of roads){for(const[k,leg]of[[r.from,r.leg0],[r.to,r.leg1]]){if(!k||!leg)continue;(legArt[k]=legArt[k]||{})[leg]=r.type;}}
  for(const n of nodes){if(n.kind!=='x')continue;const L=legArt[n.id]||{};const arts=Object.keys(L).filter(k=>L[k]==='ART');if(n.signal)n.xwalk=true;else if(arts.length>=2)n.xwalk=arts;}
  return{nodes,roads,links:[]};}
