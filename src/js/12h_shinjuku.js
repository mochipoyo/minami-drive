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
// 座標にいちばん近い交差点（経由地・できごとの指定に。交差点の id は変換のたびに変わりうるので座標で）
function sjNodeAt(x,z,maxD=30){let best=null,bd=maxD;for(const n of NET.nodes){if(n.kind!=='x')continue;const d=Math.hypot(n.x-x,n.z-z);if(d<bd){bd=d;best=n;}}return best;}
function sjWay(...pts){NAV.wps=pts.map(([x,z])=>sjNodeAt(x,z)).filter(Boolean);}
// 交差点 n の脚 L の横断歩道
function sjXwalk(n,L){return n?XWALKS.find(X=>X.node===n&&X.L===L):null;}
// 道路 name の (x,z) にいちばん近い所を通ったら fn を呼ぶ（STAGE.queue 用）。toward：進む方角
function sjAt(name,x,z,toward,fn){const q=sjPose(name,x,z,toward);if(!q)return null;return{road:q.road.id,s:q.s,dir:q.dir,fn};}
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
 {id:'t3',cat:'tokyo',map:'shinjuku',name:'靖国通り：歌舞伎町の前を東へ',desc:'片側4車線の大通り。信号が続く中での車線の選び方、急に止まるタクシー、黄信号の判断',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'靖国通りを新宿大ガードの東側から東へ走り、明治通りとの交差点（新宿五丁目）を過ぎた先の停止位置に止めます。左手は歌舞伎町。人・タクシー・バスの出入りが多い区間です。',
  points:['片側4車線でも、基本は左寄りの車線を走る（第20条第1項）。一番右の車線は追い越しや右折のために空けておく','客を乗せ降ろしするタクシーやバスは、合図とともに急に左に寄って止まる。車間距離を十分に（第26条）','黄信号は「止まれ」。停止位置で安全に止まれないときだけ進める（施行令第2条第1項）','青信号でも、横断歩道を渡っている人・渡ろうとしている人がいれば止まる（第38条第1項）','交差点の先が詰まっているときは、青でも交差点に入らない（第50条第1項）'],
  startPose(){return sjStart('靖国通り',125,-328,'E');},goalPose(){return sjGoal('靖国通り',838,-124,'E');},way:[],
  setup(){STAGE.queue=[{x:502,fn:()=>!!evTaxiStop({min:40,ahead:16,wait:2.2})}];}},// 明治通りを過ぎた先：前のタクシーが急に止まる（信号は近い交差点どうしで周期をそろえてあるので、黄色に変える演出はしない）
 {id:'t4',cat:'tokyo',map:'shinjuku',name:'歌舞伎町の裏道：一方通行と細い道',desc:'一方通行の細い道が入り組んだ繁華街。前を走る自転車、突然の横断、見通しの悪い角、細い道の歩行者',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'区役所通りを北へ進み、花道通りから歌舞伎町さくら通りへ。一方通行の細い道を通って、仲見世通りの停止位置に止めます。ナビの案内どおりに曲がりましょう。',
  points:['一方通行の道は、標識「一方通行」と「車両進入禁止」で確かめる。出口側から入ると通行禁止違反（第8条第1項）','細い道で歩行者のそばを通るときは、安全な間隔をあけるか徐行（第18条第2項）','前を走る自転車を追い越すときは1m程度の間隔。あけられないなら無理に抜かずに後ろで待つ','一方通行でも、歩行者や自転車は向こうから来る。角や店の出入口から人が出てくると考えて、いつでも止まれる速度で','見通しの悪い交差点は徐行し、左右を目で確認（第42条第1号）。角から人や自転車が出てくる'],
  startPose(){return sjStart('区役所通り',288,-343,'N');},goalPose(){return sjGoal('仲見世通り',133,-389,'W');},way:[],
  setup(){sjWay([344,-494],[238,-526],[182,-375]);// 花道通りへ左折 → さくら通りへ左折 → 仲見世通りへ右折
    STAGE.queue=[sjAt('区役所通り',330,-455,'N',()=>{const b=sjRoadAt('花道通り',325,-498);if(b)evBike(b.road,b.s,1,true);return true;})].filter(Boolean);// 花道通りに入ると前に自転車
    const j=sjRoadAt('歌舞伎町さくら通り',226,-490);if(j)evJaywalker(j.road,j.s,1,{kind:'old',spd:1.1,praise:'alleyPedOK',lesson:'繁華街の裏道では、横断歩道のない所でも人が急に渡ってきます。いつでも止まれる速度で、道の両側に目を配りましょう。'});}},
 {id:'t5',cat:'tokyo',map:'shinjuku',name:'西新宿の右折レーン：高層ビル街を右折',desc:'片側3車線の幹線と右折専用の車線。右折レーンのある交差点とない交差点、対向車、曲がった先の横断歩道',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'北通りを東へ走り、東通りとの交差点を右折レーンから右折。東通りを南へ下って、ふれあい通りとの交差点を右折し、議事堂通りとの交差点で再び右折レーンから右折して、議事堂通りの停止位置に止めます。',
  points:['右折レーン（右折専用の車線）のある交差点では、右折レーンに入ってから右折する。車線を変える3秒前に右の合図（施行令第21条）','右折は、対向の直進車・左折車を先に通してから（第37条）。右向きの矢印信号が出ている間は右折できる','右折レーンのない交差点では、あらかじめ一番右の車線に寄って右折する（第34条第2項）','曲がった先の横断歩道：渡っている人・渡ろうとしている人がいれば止まる（第38条第1項）','片側3車線でも、基本は左寄りの車線を走る（第20条第1項）'],
  startPose(){return sjStart('北通り',-850,-175,'E');},goalPose(){return sjGoal('議事堂通り',-625,40,'N');},way:[],
  setup(){sjWay([-551,-228],[-478,140],[-600,163]);// 東通りへ右折 → ふれあい通りへ右折 → 議事堂通りへ右折
    const n1=sjNodeAt(-551,-228);if(n1)evOncoming(n1,'W');const n3=sjNodeAt(-600,163);if(n3){evOncoming(n3,'E');evPedWaiting(sjXwalk(n3,'N'),'adult',true);}}},
 {id:'f3',cat:'free',map:'shinjuku',name:'東京・新宿 フリー走行',desc:'採点なしで新宿駅周辺を自由に走る。甲州街道・明治通り・靖国通り・歌舞伎町・西新宿の高層ビル街',env:'day',envLabel:'選べる',autoReady:true,scoring:false,envChoice:true,
  intro:'採点なしで、実在の地図データから作った新宿駅周辺を自由に走れます。時間帯と天気を選んでから始めましょう。',points:['違反の解説は表示されますが、点数はつきません','地図の端まで行くと、向きを変えて戻ります','{pause}でいつでもメニューに戻れます'],
  startPose(){return sjStart('甲州街道',-640,380,'E');},goalPose(){return null;},way:[]},
);
