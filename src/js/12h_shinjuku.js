// ===== 12h_shinjuku.js : 東京・新宿駅周辺の地図と教習 =====
// 道路名と座標で位置を決める（道路の id は変換のたびに変わりうるので使わない）
function sjRoadAt(name,x,z){let best=null,bd=1e9;for(const r of NET.roads){if(name&&r.name!==name)continue;for(let s=0;s<=r.len;s+=4){const P=r.at(s);const d=Math.hypot(P.x-x,P.z-z);if(d<bd){bd=d;best={road:r,s};}}}
  if(!best)return null;// 細かく
  const r=best.road;let s=best.s;for(let k=0;k<3;k++){let bs=s,bdd=1e9;for(let t=s-4;t<=s+4;t+=0.5){const tt=clamp(t,0,r.len);const P=r.at(tt);const d=Math.hypot(P.x-x,P.z-z);if(d<bdd){bdd=d;bs=tt;}}s=bs;}
  return{road:r,s,dist:bd};}
// toward：進みたい方角 'N'|'E'|'S'|'W'
function sjPose(name,x,z,toward){const q=sjRoadAt(name,x,z);if(!q)return null;q.s=clamp(q.s,Math.min(14,q.road.len/2),Math.max(q.road.len/2,q.road.len-14));/* 交差点の中から始めない */const h=q.road.at(q.s).h;const want=outHeading[toward];// その方角へ進む向き
  const dir=Math.cos(wrapA(h-want))>=0?1:-1;if(dir>0?!q.road.nF:!q.road.nB)return{road:q.road,s:q.s,dir:-dir};return{road:q.road,s:q.s,dir};}
function sjStart(name,x,z,toward){const q=sjPose(name,x,z,toward);if(!q)return{x,z,y:0,h:0};const P=edgePos(q.road,q.s,q.dir,PLAYER.W/2+0.45);return{x:P.x,z:P.z,y:P.y,h:P.h};}
function sjGoal(name,x,z,toward){const q=sjPose(name,x,z,toward);return q?goalFrom(q):null;}
MAPS.shinjuku={id:'shinjuku',name:'新宿駅周辺',bounds:[-880,-880,880,880],keepOut:[],tile:220,pedCap:360,nodeMargin:1.5,miniScale:1.0,fogMul:1.35,crossRate:1.4,crowd:false,recycle:true,recycleR:380,skylineMap:true,
  ensure(cb){const ok=shinjukuEnsure((ready)=>{if(ready){cb();return;}
      ov(`<div class="card"><header><div><div class="eyebrow">東京</div><h2>地図を読み込めませんでした</h2></div></header><div class="body"><p class="lede">新宿駅周辺の地図データ（assets/maps/shinjuku.json）を読み込めませんでした。${location.protocol==='file:'?'この地図は、ファイルを直接開いた状態では使えません。公開ページ（https://）で開いてください。':'通信の状態を確かめて、もう一度お試しください。'}</p><div class="btnRow"><button class="ghost" id="bMenuSj">原簿にもどる</button></div></div></div>`);
      $('bMenuSj').onclick=showMenu;});
    if(!ok)ov('<div class="card"><header><div><div class="eyebrow">東京</div><h2>新宿駅周辺の地図を読み込んでいます…</h2></div></header><div class="body"><p class="lede">実在の地図データ（約1MB）を読み込みます。少しお待ちください。</p></div></div>');
    return ok;},
  def(){return shinjukuDef();},
  after(){for(const r of NET.roads)townFeatS(r);},
  traffic:{n:80,bikes:8,peds:230,mix:{kei:2,compact:3,sedan:3,van:1.5,suv:1.5,truck:1.0,taxi:4,bus:1.2,big:0.3,moto:0.8}},
  signIds:['s30','s40','s50','s60','stop','xwalk','oneway','noentry','nostopping','noparking','tomare','diamond','m30','m40','m50','m60','blank'],
  signs(){autoSigns();},
  build(B,wires){buildShinjuku(B,wires);},
  skyline(B){sjSkyline(B);},
  credits:'地図データ：© OpenStreetMap contributors（ODbL）／国土交通省 Project PLATEAU 3D都市モデル（新宿区 2025）'};
STAGES.push(
 {id:'t1',cat:'tokyo',map:'shinjuku',name:'甲州街道：片側3車線の幹線を東へ',desc:'実在の新宿の道路。多車線の幹線道路で車線を選び、駅前の人と車の多さに備える',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'東京・新宿。甲州街道を西新宿から東へ走り、新宿駅南口を過ぎた先の停止位置に止めます。道路の形と建物の高さは実在の地図データから作ってあります（店名・看板は架空）。',
  points:['片側に車線が多い道路では、左の車線を基本に走る（第20条第1項）。右の車線は追い越しや右折のため','交差点の手前では路面の矢印と標識で、進める方向を確かめる','駅前は横断歩道を渡る人が多い。渡ろうとしている人がいれば止まって譲る（第38条第1項）','路線バス・タクシーが急に左に寄って止まることがある。車間距離を十分に'],
  startPose(){return sjStart('甲州街道',-640,380,'E');},goalPose(){return sjGoal('甲州街道',240,100,'E');},way:[]},
 {id:'t2',cat:'tokyo',map:'shinjuku',name:'明治通り：新宿三丁目から北へ',desc:'信号の多い大通り。右折車線と矢印信号、交差点の先が詰まっているときの判断',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'明治通りを南から北へ走り、靖国通りとの交差点（新宿五丁目付近）を過ぎた先の停止位置に止めます。',
  points:['交差点の先が詰まっているときは、青信号でも交差点に入らない（第50条第1項）','右折は右折車線から。対向の直進車・左折車を先に通す（第37条）','右向きの矢印信号が出ている間は右折できる','黄色の線（進路変更禁止）の区間では車線を変えない'],
  startPose(){return sjStart('明治通り',291,459,'N');},goalPose(){return sjGoal('明治通り',640,-700,'N');},way:[]},
 {id:'f3',cat:'free',map:'shinjuku',name:'東京・新宿 フリー走行',desc:'採点なしで新宿駅周辺を自由に走る。甲州街道・明治通り・靖国通り・西新宿の高層ビル街',env:'day',envLabel:'選べる',autoReady:true,scoring:false,envChoice:true,
  intro:'採点なしで、実在の地図データから作った新宿駅周辺を自由に走れます。時間帯と天気を選んでから始めましょう。',points:['違反の解説は表示されますが、点数はつきません','地図の端まで行くと、向きを変えて戻ります','{pause}でいつでもメニューに戻れます'],
  startPose(){return sjStart('甲州街道',-640,380,'E');},goalPose(){return null;},way:[]},
);
