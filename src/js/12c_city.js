// ===== 12c_city.js : さくら区（都会）の地図と教習 =====
MAPS.city={id:'city',name:'さくら区',bounds:[-620,-470,620,470],keepOut:[],tile:200,pedCap:320,nodeMargin:1.5,miniScale:1.15,fogMul:1.25,crossRate:0.7,crowd:true,recycle:true,skylineMap:true,
  def(){return cityDef();},
  after(){for(const r of NET.roads)townFeatS(r);for(const r of NET.roads)if(['C1','C2','ST'].includes(r.def.tier))r.def.bikeNav=true;const S=CITY.SITES;this.keepOut=[S.station,S.viaduct,S.park].map(k=>({x0:k.x0,x1:k.x1,z0:k.z0,z1:k.z1}));},
  rail:{ax:'x',c:CITY.RAIL_Z,a:-780,b:780,y:CITY.RAIL_Y,cars:6,v:15,wait:10,stripe:0xe0882a},
  traffic:{n:66,bikes:10,peds:170,mix:{kei:2,compact:3,sedan:3,van:1.5,suv:1.5,truck:1.2,taxi:3,bus:1,big:0.4,moto:0.8}},
  signIds:['s30','s40','s50','stop','xwalk','oneway','noentry','dirSL','nostopping','noparking','ped_only','sBusPrio','tomare','diamond','m30','m40','m50','busprioMark','busonly','bikenav','blank'],
  signs(){autoSigns();citySigns();},
  build(B,wires){buildCity(B,wires);},
  skyline(B){citySkyline(B);},
  post(){const B=new Batch();cityPlates(B);shopAtlasCommit();B.build(scene,MAT,{shadow:{def:{cast:true,recv:true}}});cityScreens();cityPedsExtra();},
  tick(dt){cityScreenTick(dt);scrambleTick(dt);}};
STAGES.push(
 {id:'c1',cat:'city',map:'city',name:'大通り：車線とバス優先・右折車線',desc:'片側3車線。バス優先の車線、早めの車線変更、右折禁止の交差点、右折専用車線と矢印信号',env:'day',envLabel:'昼・晴れ',startCheck:true,
  intro:'さくら区の大通り「さくら通り」を東へ走り、さくら通り中央の交差点を右折して、駅前大通りの停止位置に止めます。上を都市高速の高架が通っています。',
  points:['発進前：ベルト（{belt}）→ シフトD（{gear}）→ 右の合図（{br}）→ 右後方の確認（{lkR}）→ Pブレーキ解除（{pb}）','いちばん左の車線は「バス優先」（路線バス等優先通行帯）。後ろから路線バスが来たら、速やかにその車線から出る（第20条の2第1項）','車線を変えるときは3秒前に合図し、ミラーと目で後ろを確認。後ろの車に急ブレーキをかけさせない（第26条の2第2項）','交差点の手前の路面の矢印と青い標識は、車線ごとに進める方向（第35条第1項）。右折は右端の右折専用の車線から','一番町の交差点は標識「指定方向外進行禁止」で直進・左折のみ。右折はできない（第8条第1項）','右向きの青い矢印信号が出ている間は、赤信号でも右折できる'],
  start:['A0',-530,1],goal:['B2',118,1],way:['-400,0','-200,0','0,0'],
  setup(){STAGE.queue=[{odo:45,fn:()=>!!evBusBehind(70)},{x:-300,fn:()=>{coach('この先の一番町の交差点は、標識で「直進・左折のみ」。右折はできません。さくら通り中央の交差点で右折します。',7,1);return true;}},
    {x:-150,fn:()=>{coach('右折する交差点が近づいてきました。右の合図を出して3秒たってから、右の車線へ。その先で右折専用の車線に入ります。',7,1);return true;}}];}},
 {id:'c2',cat:'city',map:'city',name:'駅前：スクランブル交差点と路上の危険',desc:'歩行者用の青の間は全方向が赤。荷さばきのトラック、急に止まるタクシー、商店街（歩行者用道路）',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'駅前通りを東へ走り、さくら駅前のスクランブル交差点を直進して、その先の停止位置に止めます。人も車も多い場所です。',
  points:['スクランブル交差点：歩行者用の信号が青の間（歩行者が斜めにも渡る）は、車の信号はすべての方向が赤。停止線の手前で待つ','横断歩道を渡ろうとしている人がいれば、手前で止まって譲る（第38条第1項）','荷物の積み下ろしで止まっている車は、早めに合図をして隣の車線へ。後ろの車の進路を妨げない','前を走るタクシーは急に左に寄って止まることがある。車間距離を十分に（第26条）','「歩行者等専用」の標識がある商店街（歩行者用道路）には入らない（第8条第1項）'],
  start:['A1',-375,1],goal:['A1',165,1],way:['0,-250'],
  setup(){const q=cityRoadAt('A1',-150);if(q)evDeliveryTruck(q.road,q.s,q.sign);STAGE.queue=[{x:-330,fn:()=>{coach('左に見える商店街の入口には「歩行者等専用」の標識。車は入れません。',6,1);return true;}},
    {x:-60,fn:()=>{coach('さくら駅前のスクランブル交差点です。歩行者用の信号が青の間は、車の信号はすべて赤。斜めに渡る人もいます。',7,1);return true;}},{x:12,fn:()=>!!evTaxiStop()}];}},
 {id:'c3',cat:'city',map:'city',name:'夜の都会：バス停と横断者',desc:'夜はライト。停留所から発進する路線バスを妨げない。信号のない横断歩道・夜の横断者に注意',env:'night',envLabel:'夜',autoReady:true,
  intro:'夜の南通りを東へ走り、南通り中央の交差点を左折して、駅前大通りの停止位置に止めます。',
  points:['夜はライト（{lt}）。対向車と行き違うときなどは、ライトを下向きにするなど相手の交通を妨げない（第52条第2項）','停留所に止まっていた路線バスが、発進のため右の合図を出したら、急ブレーキや急ハンドルが必要な場合を除き、その進路の変更を妨げない（第31条の2）','信号のない横断歩道でも、渡ろうとしている人がいれば止まって譲る（第38条第1項）','夜は暗い服の歩行者の発見が遅れがち。横断歩道のない所を渡る人もいると考えて、止まれる速度で'],
  start:['A3',-565,1],goal:['B2',100,-1],way:['-400,170','-200,170','0,170'],
  setup(){const X=XWm('A3',-300);if(X)evPedWaiting(X,'adult');evBusAtStop('南一丁目');const q=cityRoadAt('A3',-55);if(q)evJaywalker(q.road,q.s,q.sign);}},
 {id:'f2',cat:'free',map:'city',name:'さくら区 フリー走行（都会）',desc:'採点なしで都会の町を自由に走る。時間帯・天気を選べる。大通り・高架・駅前・商店街・住宅街',env:'day',envLabel:'選べる',autoReady:true,scoring:false,envChoice:true,
  intro:'採点なしで さくら区 を自由に走れます。大通り（上は都市高速）、スクランブル交差点のある駅前、一方通行の裏通り、住宅街まで。時間帯と天気を選んでから始めましょう。',points:['違反の解説は表示されますが、点数はつきません','地図の端まで行くと、向きを変えて戻ります','{pause}でいつでもメニューに戻れます'],start:['A0',-530,1],goal:null,way:[]},
);
// 停留所で止まっている路線バス：プレイヤーが近づくと、右の合図を出して発進する
function evBusAtStop(name){const st=(NET.map.busStops||[]).find(b=>b.name===name);if(!st)return null;const l=st.road.lanes(st.dir)[0];
  const b=new Veh('car','bus');const u=l.uOf(st.s)-1.5+b.L/2;b.place(l,u-0.5);b.v=0;b.evt=true;b.forceTurn='S';b.busWait=0;b.busDwell=999;b.d=-0.55;VEH.push(b);
  return evAdd({b,update(){const p=PLAYER;const dd=distOnRoad(st.road,st.s,st.dir);if(!this.go&&dd!==null&&dd<38&&dd>5){this.go=1;b.busDwell=(b.busWait||0)+0.6;coach('停留所のバスが右の合図を出しました。発進しようとしているバスの進路を妨げないようにします。',6,1);}
      if(b.hidden||Math.hypot(b.x-p.x,b.z-p.z)>260&&this.go)this.done=true;},cleanup(){b.remove();}});}
