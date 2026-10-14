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
  shinjukuTurnLanes(nodes,roads,byId);
  shinjukuSignalSync(nodes,roads,byId);
  return{nodes,roads,links:[]};}
// 近い信号は同じ周期にそろえる（系統の簡略版）：実在の大通りでは信号が 20〜70m おきに並ぶ所があり、
// 周期がばらばらだと、前の信号を青で通った直後に次が赤になって止まれない（靖国通りの新宿区役所前など）。
// 短い道路（切ったあと 80m 未満）でつながる信号どうしを同じ組にして、組の中は同じ周期・同じ位置（offset 0）にする
function shinjukuSignalSync(nodes,roads,byId){
  const plen=(p)=>{let s=0;for(let i=1;i<p.length;i++)s+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return s;};
  const par={};const find=(k)=>{while(par[k]!==k)k=par[k]=par[par[k]];return k;};
  for(const n of nodes)if(n.kind==='x'&&n.signal)par[n.id]=n.id;
  for(const r of roads){if(!r.from||!r.to||par[r.from]===undefined||par[r.to]===undefined)continue;
    const len=plen(r.path)-(r.cut0||0)-(r.cut1||0);if(len<80)par[find(r.from)]=find(r.to);}
  const groups={};for(const k in par){const g=find(k);(groups[g]=groups[g]||[]).push(k);}
  let n=0;for(const g in groups){const m=groups[g];if(m.length<2)continue;const g0=byId[m[0]].signal.g;
    for(const k of m){const s=byId[k].signal;s.g=Object.assign({},g0);s.offset=0;n++;}}
  // 同じ組の信号を 45m 未満でつなぐ道路：手前の停止線を青・黄で通った車は、次の停止線は「同じ交差点の2本目」として
  // 矢印・黄でも止まらずに抜ける（06a・08a）。止まれない距離で次が赤になるのを防ぐ
  for(const r of roads){if(!r.from||!r.to||par[r.from]===undefined||par[r.to]===undefined||find(r.from)!==find(r.to))continue;
    const len=plen(r.path)-(r.cut0||0)-(r.cut1||0);if(len<45&&groups[find(r.from)].length>=2)r.sigLink=true;}
  return n;}
// 右折レーン（さくら区と同じ仕組み：02_net.js の付加車線 turnR）：
// 分離帯が車線の幅以上ある幹線で、信号のある交差点へ向かう側に右折できる道があれば、分離帯を削って右折レーンを付ける。
// 分離帯の狭い道路（靖国通り・明治通りなど）には付けない（対向車線と重なるため）。路面の矢印は 03a が描く
function shinjukuTurnLanes(nodes,roads,byId){
  const ends={};// node id → [{r,end:'start'|'end'}]
  for(const r of roads){if(r.from)(ends[r.from]=ends[r.from]||[]).push({r,end:'start'});if(r.to)(ends[r.to]=ends[r.to]||[]).push({r,end:'end'});}
  const hOf=(r,end,into)=>{const p=r.path;const a=end==='start'?p[0]:p[p.length-1],b=end==='start'?p[1]:p[p.length-2];// b：道路の内側の隣の点
    const h=headingOf(a[0]-b[0],a[1]-b[1]);/* 内側→端（交差点へ向かう向き） */return into?h:wrapA(h+Math.PI);};
  const plen=(p)=>{let s=0;for(let i=1;i<p.length;i++)s+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);return s;};
  let n=0;
  for(const r of roads){if(r.type!=='ART'||!r.med||r.med.w<r.w-0.05)continue;
    const len=plen(r.path)-(r.cut0||0)-(r.cut1||0);if(len<60)continue;
    for(const dir of[1,-1]){const nl=dir>0?r.nF:r.nB;if(nl<2)continue;const end=dir>0?'end':'start';const nid=dir>0?r.to:r.from;const nd=nid&&byId[nid];if(!nd||nd.kind!=='x'||!nd.signal)continue;
      const legIn=dir>0?r.leg1:r.leg0;const others=(ends[nid]||[]).filter(e=>e.r!==r);if(others.length<2)continue;
      const hIn=hOf(r,end,true);let canR=false;
      for(const e of others){const dirOut=e.end==='start'?1:-1;if(!(dirOut>0?e.r.nF:e.r.nB))continue;const legOut=e.end==='start'?e.r.leg0:e.r.leg1;
        const hOut=hOf(e.r,e.end,false);const d=Math.abs(wrapA(hOut-hIn));if(d<0.35)continue;// polyTurn と同じ判定
        const tl=(legIn&&legOut)?turnOf(legHeading[legIn],outHeading[legOut]):null;if(tl==='S'&&d<0.95)continue;
        const dd=wrapA(hOut-hIn);if(dd>0.5&&dd<2.4){canR=true;break;}}// はっきり右折といえる向きだけ（Uターンや直進に近いものは除く：02_net の判定と食い違わないように）
      if(!canR)continue;
      // 長さ：60m まで。短い区間（交差点の間隔が 90m ほど）では区間の大半を右折レーンにする（手前の交差点から 30m は分離帯）
      const pl=Math.min(60,Math.round(Math.max(len*0.42,len-30)));if(pl<25)continue;
      r.patches=r.patches||[];r.patches.push(dir>0?{dir:1,kind:'turnR',side:'R',s0:-pl,s1:0,kA:20,wA0:true}:{dir:-1,kind:'turnR',side:'R',s0:0,s1:pl,kB:20,wB0:true});n++;}}
  return n;}
