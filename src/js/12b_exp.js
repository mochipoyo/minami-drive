// ===== 12b_exp.js : 高速道路の地図と教習 =====
MAPS.exp={id:'exp',name:'みなみ自動車道',bounds:[-2700,-800,2700,700],keepOut:[],miniScale:0.42,fogMul:2.2,
  def(){const d=expDef();this._after=d.after;return d;},
  after(){if(this._after)this._after();buildGrid();},
  rail:null,
  traffic:{n:44,bikes:0,peds:0,mix:{kei:2,compact:3,sedan:3,van:1,suv:2,truck:2,big:2,bus:0.6},exitP:0.25},
  signIds:['s40','s50','s60','s80','s100'],
  signs(){expSigns();},
  build(B,wires){TOLL.bars.length=0;NET.map.etc=[];
    for(const r of NET.roads)if(r.def.tollAt!==undefined)buildTollPlaza(B,r);
    buildSignMeshes(B);buildExpRoadside(B);buildExpBoards(B);buildExpLights(B);buildPA(B);
    buildExpScenery(B,{keepOut:this.keepOut});
    B.ground('grass',-3200,-1500,3200,1500,-0.06,0x8aa064,10);},
  post(){initTollBars();placePACars();},
  tick(dt){updateTollBars(dt);expEdgeTick();}};
// 地図の端：出口ランプの先（一般道）や本線の端まで来たとき
function expEdgeTick(){if(!STAGE.running||STAGE.over||!J.road)return;const r=J.road,p=PLAYER;const A=J.A;
  const offEnd=r.id==='OFF_B'&&J.s>r.len-45&&!NAV.goal;const mainEnd=r.type==='EXP'&&A&&A.n&&A.n.kind==='portal'&&A.dEdge<40;
  if(!offEnd&&!mainEnd)return;
  if(!STAGE.scoring){if(offEnd){const P=expPose('ON_A',8,0);resetPlayer(P.x,P.z,P.h,P.y||0);p.belt=true;p.gear='D';p.pbrake=false;J.started=true;STAGE.edgeHint=0;toast('info','一般道に出ました。入口からもう一度入ります',0,'');}return;}
  const st=STAGES[STAGE.idx];finishStage({note:offEnd?(st.exitNote||'出口から高速道路を出ました'):(st.endNote||'地図の端に着きました')});}
// 照明：ICの近くとトンネルの前後だけ（本線の全区間には付けない）
function buildExpLights(B){const r=NET.byId.E1;const C0=EXPC;const zones=[[C0.accel.s0-300,C0.accel.s1+80],[C0.decel.s0-80,C0.decel.s1+250]];
  for(const[a,b]of zones)for(let s=Math.max(10,a);s<Math.min(r.len-5,b);s+=45){const m=(r._edges(1,s).inner+r._edges(-1,s).inner)/2;const P=r.pt(s,m);const hgt=10;B.cyl('def',P.x,P.y+hgt/2,P.z,0.12,hgt,0x8e959b,6);
    for(const d of[-1,1]){const Q=r.pt(s,m+d*2.6);B.bar('def',P.x,P.y+hgt-0.1,P.z,Q.x,Q.y+hgt-0.1,Q.z,0.1,0.1,0x8e959b);B.box('lamp',Q.x,Q.y+hgt-0.25,Q.z,0.6,0.14,0.34,0xffffff,r.at(s).h);}}
  for(const n of['ON_A','OFF_B']){const q=NET.byId[n];for(let s=20;s<q.len-10;s+=40){const t=q._edges(1,s).outer-q.sh[0]-0.8;const P=q.pt(s,t);const Q=q.pt(s,t+2.0);B.cyl('def',P.x,P.y+5,P.z,0.1,10,0x8e959b,6);B.bar('def',P.x,P.y+9.9,P.z,Q.x,Q.y+9.9,Q.z,0.09,0.09,0x8e959b);B.box('lamp',Q.x,Q.y+9.75,Q.z,0.55,0.14,0.32,0xffffff,q.at(s).h);}}}
// 位置：road上のs・車線（idx）または路肩
function expPose(id,s,lane,dir=1){const r=NET.byId[id];if(lane==='edge'){const P=edgePos(r,s,dir,PLAYER.W/2+0.45);return{x:P.x,z:P.z,y:P.y,h:P.h};}
  const l=lane==='accel'||lane==='decel'?r.patches.find(p=>p.kind===lane&&p.dir===dir):r.lanes(dir)[lane||0];const P=l.pos(l.uOf(s),0);return{x:P.x,z:P.z,y:P.y,h:P.h};}
// 本線の指定位置を過ぎたら終わり（教習の区切り）
function expFinishAt(s,msg){return()=>{if(STAGE.over)return;const p=PLAYER;if(J.road&&J.road.id==='E1'&&J.dir>0&&J.s>s&&J.lane&&J.lane.kind==='main'){finishStage({note:msg});}};}
// 本線に、決まった位置・速さの車を置く
function expCar(lane,s,type,v,opt={}){const r=NET.byId.E1;const l=lane==='accel'?r.patches.find(p=>p.kind==='accel'):r.lanesF[lane];const c=new Veh('car',type);c.place(l,l.uOf(s));c.v=v/KMH;if(opt.vpref)c.vpref=opt.vpref;if(opt.keep)c.keep=true;if(opt.noLC)c.noLC=true;c.exitPlan=false;VEH.push(c);return c;}
STAGES.push(
 {id:'e1',cat:'exp',map:'exp',name:'高速道路：料金所から本線へ合流',desc:'ETCレーンは20km/h以下（NEXCOの案内）。加速車線で十分に加速し、本線の車の流れを見て合流',env:'day',envLabel:'昼・晴れ',rolling:30,
  intro:'みなみIC から みなみ自動車道 に入ります。料金所の ETC レーンを通り、ランプから加速車線へ。本線の車の流れに合わせて合流し、第1通行帯（左の車線）を走ります。',
  points:['料金所のETCレーンは、20km/h以下に減速して通過（NEXCOの案内）。前の車との間隔をあけて1台ずつ','加速車線では十分に加速して、本線の流れに近い速さに','右の合図（{br}）を出し、右後方を目で確認（{lkR}）。本線の車の進行を妨げない（第75条の6）','合流したら第1通行帯（左の車線）を走る（第20条）','高速自動車国道の法定最高速度は普通車100km/h、最低速度は50km/h'],
  startPose(){return expPose('ON_A',8,0);},goalPose(){return null;},way:[],
  setup(){const r=NET.byId.E1;STAGE.tick=expFinishAt(EXPC.accel.s1+520,'本線に合流できました');
    // 合流のときに本線を走ってくる車
    expCar(0,EXPC.accel.s0-260,'sedan',88);expCar(0,EXPC.accel.s0-420,'truck',80);expCar(1,EXPC.accel.s0-200,'compact',100);
    STAGE.queue=[{s:20,road:'ON_A',dir:1,fn:()=>{coach('料金所が近づいてきました。ETCレーン（紫の表示）を選び、20km/h以下に減速します。',6,1);return true;}},
      {s:EXPC.tollIn+40,road:'ON_A',dir:1,fn:()=>{coach('ランプは最高速度40km/h（標識）。カーブの先で加速車線に入ります。',5,1);return true;}}];
    STAGE.navFn=()=>{const p=PLAYER;if(J.road&&J.road.id==='ON_A')setNav('S',J.road.len-J.s,'本線へ（加速車線）');else if(J.lane&&J.lane.kind==='accel'){const rem=J.lane.len-J.lane.uOf(J.s);setNav('R',rem,'右の車線へ合流');
        if(!STAGE.mergeCoach){STAGE.mergeCoach=1;coach('加速車線です。アクセルをしっかり踏んで加速し、右の合図（{br}）。右後方を目で確認（{lkR}）して、本線の車の間に入ります。',8,1);}}
      else setNav('S',null,'第1通行帯を走りましょう');};}},
 {id:'e2',cat:'exp',map:'exp',name:'高速道路：追越しとトンネル',desc:'追越しは右の車線から。終わったら左に戻る（通行帯違反）。トンネルはライト、黄色の線では車線変更しない',env:'day',envLabel:'昼・晴れ',rolling:80,
  intro:'本線の第1通行帯を80km/hで走っています。前の遅いトラックを右側から追い越し、終わったら左の車線に戻ります。その先のトンネルではライトをつけます。',
  points:['追越しは前の車の右側から。右の合図を3秒前に出し、右後方を確認してから（第28条・施行令第21条）','追越しが終わったら左の車線に戻る。追越車線を走り続けると通行帯違反（第20条）','車間距離は「止まれる距離」を（第26条）。目安はNEXCOの案内で 100km/h なら約100m','トンネルの中では昼でもライト（施行令第19条：視界200m以下の暗い所）','黄色の線（進路変更禁止の道路標示）をこえて車線変更しない（第26条の2第3項）'],
  startPose(){return expPose('E1',EXPC.accel.s1+380,0);},goalPose(){return null;},way:[],
  setup(){STAGE.tick=expFinishAt(EXPC.tunnel.s1+300,'トンネルを抜けました');
    const t=expCar(0,EXPC.accel.s1+520,'big',62,{keep:true,noLC:true,vpref:0.62});t.limitCap=62/KMH;
    STAGE.queue=[{s:EXPC.accel.s1+430,road:'E1',dir:1,fn:()=>{coach('前に遅い大型トラックがいます。右の合図（{br}）を3秒前に出し、右後方を確認してから追越車線へ。',7,1);return true;}},
      {s:EXPC.tunnel.s0-300,road:'E1',dir:1,fn:()=>{coach('この先はトンネルです。黄色の線の区間は車線変更禁止。トンネルに入る前にライトをつけます（{lt}）。',7,1);return true;}}];}},
 {id:'e3',cat:'exp',map:'exp',name:'高速道路：出口と料金所',desc:'出口の手前から左の車線へ。減速車線に入ってから減速。ETCは20km/h以下で通過して停止位置へ',env:'day',envLabel:'昼・晴れ',rolling:90,
  intro:'追越車線を90km/hで走っています。みなみ東IC で高速道路を出ます。早めに第1通行帯へ移り、減速車線に入ってから減速、料金所を通って停止位置に止めます。',
  points:['出口の予告標識（2km・1km・500m）を見て、あらかじめ出口に続く左の車線へ（第75条の7第2項）','本線上で急に減速しない。減速車線に入ってから減速する','ランプは最高速度40km/h（標識）。カーブの手前で十分に減速','料金所のETCレーンは20km/h以下（NEXCOの案内）','止まったらパーキングブレーキ（{pb}）'],
  startPose(){return expPose('E1',EXPC.tunnel.s1+90,1);},goalRS:null,way:[],
  goalPose(){const r=NET.byId.OFF_B;return goalFrom({road:r,s:r.len-40,dir:1});},
  setup(){STAGE.queue=[{s:EXPC.decel.s0-980,road:'E1',dir:1,fn:()=>{coach('出口まで約1km。左の合図（{bl}）を出して、早めに第1通行帯へ移りましょう。',7,1);return true;}},
      {s:EXPC.decel.s0-30,road:'E1',dir:1,fn:()=>{coach('減速車線に入ってから、ブレーキで減速します。',5,1);return true;}}];}},
);
STAGES.push(
 {id:'e4',cat:'exp',map:'exp',name:'高速道路：落下物・渋滞・故障のとき',desc:'落下物は合図をして車線を変えてよける。渋滞の最後尾はハザード（推奨）。故障したら路肩に止めて安全措置',env:'day',envLabel:'昼・晴れ',rolling:80,
  intro:'本線を80km/hで走っています。落下物、渋滞の最後尾、そして車の故障が順に起こります。慌てずに、後ろの車に気をつけて対応しましょう。',
  points:['落下物を見つけたら、急ハンドル・急ブレーキを避け、合図と後方確認をしてから車線を変えてよける','落下物は、運転中に電話せず、同乗者に頼むか安全な所に止めてから #9910 に通報（国土交通省・NEXCO）','渋滞の最後尾では、早めに減速し、ハザードで後続車に知らせる（法律上の義務ではない・NEXCOの呼びかけ）','故障したら十分な幅のある路肩に止め、停止表示器材を置く（第75条の11）。車外のガードレールの外側へ避難し、110番・非常電話・#9910で通報'],
  exitNote:'出口から高速道路を出たため、故障の場面までは行いませんでした。本線をそのまま進むと続きを練習できます。',
  startPose(){return expPose('E1',EXPC.accel.s1+80,0);},goalPose(){return null;},way:[],
  setup(){const r=NET.byId.E1;STAGE.navFn=()=>{if(J.road&&J.road.id==='E1'&&J.dir>0){const d=EXPC.decel.s0-J.s;if(d>-260&&d<1300){setNav('S',null,'本線をそのまま直進（出口には入らない）');return true;}}return false;};
    STAGE.queue=[{s:EXPC.accel.s1+150,road:'E1',dir:1,fn:()=>{evFallenObject(r,EXPC.bridge.s1+260,0,'box');return true;}},
      {s:EXPC.tunnel.s1+40,road:'E1',dir:1,fn:()=>{evJam(r,EXPC.pa.a1+120,10);return true;}},
      {s:EXPC.decel.s1+60,road:'E1',dir:1,fn:()=>{evBreakdown();return true;}}];}},
 {id:'a1',cat:'aori',map:'exp',name:'あおり運転を受けたら（高速道路）',desc:'仕返しや急ブレーキはしない。SA・PAなど安全な場所に避難し、車外に出ずにドアロック・110番通報',env:'day',envLabel:'昼・晴れ',rolling:85,
  intro:'第1通行帯を85km/hで走っていると、後ろの車が車間距離を詰め、パッシングやクラクションをしてきます。挑発に乗らず、安全な場所（みなみPA）に避難して対処します。',
  points:['あおり運転（妨害運転）は犯罪。3年以下の拘禁刑または50万円以下の罰金・違反点数25点で免許取消し（第117条の2の2第1項第8号）。高速道路で相手を止めさせるなど著しい交通の危険を生じさせると、5年以下の拘禁刑または100万円以下の罰金・35点で免許取消し（第117条の2第1項第4号）','あおられても急ブレーキはかけない（第24条）。速度を上げて逃げようとしない','SA・PAなど交通事故に遭わない場所に避難し、車の外に出ずに110番通報（警察庁）','ドアをロックし、窓を開けずに警察官を待つ。ドライブレコーダーの映像は加工・消去せず保存（広島県警）'],
  exitNote:'みなみPAに入らずに高速道路を出ました。危険を感じたら、SA・PAなど交通事故に遭わない場所に避難して、車の外に出ずに110番通報します（警察庁）。',
  startPose(){return expPose('E1',EXPC.accel.s1+80,0);},goalPose(){return null;},way:[],
  setup(){const r=NET.byId.E1;STAGE.emergency=false;STAGE.queue=[{t:2,fn:()=>{STAGE.aori=evAoriExp(r,EXPC.accel.s1+80);return true;}}];
    STAGE.autoExit=(k)=>k==='pa'?!!(STAGE.aori&&STAGE.aori.ph>=4):false;
    STAGE.onAction=(kind)=>{if(kind==='horn'&&STAGE.aori&&STAGE.aori.ph<5)coach('クラクションやパッシングで仕返しをすると、トラブルが大きくなるおそれがあります。挑発に乗らず、安全な場所に避難しましょう。',7,1);};
    STAGE.autoStop=()=>J.road&&J.road.id==='PA_AISLE'?Math.max(0,45-J.s):null;
    STAGE.tick=(dt)=>{const p=PLAYER;const q=p.loc;STAGE.inPA=!!(q&&(q.kind==='lot'||(q.kind==='road'&&q.road.def.paRoad)));
      if(STAGE.aori&&J.road&&J.road.id==='E1'&&J.dir>0&&J.s>EXPC.pa.d1+15&&J.lane&&J.lane.kind==='main'&&!STAGE.missPA&&!STAGE.inPA){STAGE.missPA=1;coach('みなみPAを通り過ぎました。後ろの車がついてきます。急ブレーキや仕返しの運転はせず、この先の みなみ東IC で高速道路を出ましょう。',9,1);}
      if(J.road&&J.road.type==='EXP'&&p.v<0.5&&STAGE.aori&&STAGE.aori.ph<5){STAGE.stopT=(STAGE.stopT||0)+dt;if(STAGE.stopT>6&&!STAGE.stopCoach){STAGE.stopCoach=1;coach('本線や路肩に止まると、後ろから追突されるおそれがあり危険です。SA・PAなど安全な場所まで走って避難しましょう。',8,1);}}else STAGE.stopT=0;
      if(STAGE.inPA&&!STAGE.paCoach){STAGE.paCoach=1;coach('PAに入りました。空いている駐車ますか、相手から離れた場所に止めて、パーキングブレーキ（{pb}）をかけましょう。',7,1);}};
    STAGE.judgeExtra=()=>{const a=STAGE.aori&&STAGE.aori.a;if(!a||a.hidden)return;const p=PLAYER;const f=fwd(p.h);const behind=(p.x-a.x)*f.x+(p.z-a.z)*f.z;
      if(behind>0&&behind<28&&p.a<-4.6&&p.v>5){const lg=playerLeader(p,40);if(!(lg.obj&&lg.gap<25))violate('aoriBrake','',20);}};
    STAGE.navFn=()=>{if(STAGE.aori&&J.road&&J.road.id==='E1'){const d=EXPC.pa.d0-J.s;if(STAGE.aori.ph<4&&d>0){setNav('S',null,'第1通行帯を一定の速さで');return true;}if(d>0){setNav('L',d,'みなみPAへ（減速車線）');return true;}const d2=EXPC.decel.s0-J.s;if(STAGE.missPA&&d2>0){setNav('L',d2,'みなみ東IC（出口）へ');return true;}}return false;};}},
 {id:'e5',cat:'free',map:'exp',name:'みなみ自動車道 フリー走行',desc:'採点なしで高速道路を走る。合流・追越し・PA・出口を自由に練習',env:'day',envLabel:'昼・晴れ',rolling:30,scoring:false,
  intro:'採点なしで みなみ自動車道 を自由に走れます。料金所→合流→追越し→トンネル→PA→出口まで、好きなように練習しましょう。',points:['違反の解説は表示されますが、点数はつきません','{pause}でいつでもメニューに戻れます'],
  startPose(){return expPose('ON_A',8,0);},goalPose(){return null;},way:[]},
);

