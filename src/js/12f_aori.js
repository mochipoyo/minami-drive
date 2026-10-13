// ===== 12f_aori.js : あおり運転（一般道で受けたら／自分がしない） =====
// 場面の流れや相手の車の動きはゲーム独自のものです。対処のしかたは警察庁・広島県警察・福島県警察の呼びかけ、
// 条文は e-Gov法令検索の道路交通法（2026年10月時点の版）で確かめた内容によります。

// ---- 若葉マーク（初心運転者標識）：左が黄色・右が緑の、簡略化したイメージ ----
let WAKABA=null;
function wakabaMat(){if(WAKABA)return WAKABA;const c=cvs(128,128),x=c.getContext('2d');
  const P=(pts)=>{x.beginPath();x.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)x.lineTo(pts[i][0],pts[i][1]);x.closePath();};
  P([[12,8],[64,36],[64,122],[12,80]]);x.fillStyle='#f2cf00';x.fill();P([[116,8],[64,36],[64,122],[116,80]]);x.fillStyle='#16934a';x.fill();
  x.lineJoin='round';x.lineWidth=6;x.strokeStyle='#ffffff';P([[12,8],[64,36],[116,8],[116,80],[64,122],[12,80]]);x.stroke();
  WAKABA=new THREE.MeshBasicMaterial({map:texFrom(c),transparent:true,alphaTest:0.4,side:THREE.DoubleSide});return WAKABA;}
// 車の前と後ろ（地上0.4〜1.2mの見やすい位置）に付ける
function addWakaba(m){for(const[z,ry,x,y]of[[m.L/2+0.11,0,-m.W/2+0.36,0.66],[-m.L/2-0.04,Math.PI,m.W/2-0.36,0.8]]){const q=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.3),wakabaMat());q.position.set(x,y,z);q.rotation.y=ry;m.grp.add(q);}}

// ---- 台本で動く車：車線→交差点（直進）→次の車線 ----
function scrAdvance(v,ds){if(v.conn){v.cu+=ds;if(v.cu>=v.conn.len){const over=v.cu-v.conn.len;const nl=v.conn.next;v.place(nl,Math.min(over,nl.len));}return;}
  v.u+=ds;if(v.u<v.lane.len)return;const over=v.u-v.lane.len;
  if(v.lane.next.length&&!v.lane.conns.length){const d=v.d;v.place(v.lane.next[0].lane,over);v.d=d;return;}
  const c=v.lane.conns.find(c=>c.turn==='S');if(c){v.conn=c;v.cu=over;v.d=0;}else{v.u=v.lane.len;v.v=0;v.atEnd=true;}}

// ================= a2：あおり運転を受けたら（一般道・さくら通り） =================
// さくら通り（東向きの車線）の、x の位置
function r1East(x){for(const id of['R1a','R1b','R1c']){const r=NET.byId[id];const a=r.at(0).x,b=r.at(r.len).x;if(x>=a-0.01&&x<=b+0.01){const l=r.lanes(1)[0];return{r,l,u:clamp(l.uOf(x-a),0,l.len)};}}return null;}
// 追越しをしない所：南の道との交差点・横断歩道とその手前30m・駐車場の出入口
const AORI_NOPASS=[[-54,-26],[6,46],[121,149]];
function aoriSpanOK(x0,x1){return!AORI_NOPASS.some(([a,b])=>x1>a&&x0<b);}
// 対向車線（西向き）が、追越しに使う区間とその先であいているか
function r1OncomingClear(x0,x1){for(const o of VEH){if(o.hidden||o.aori)continue;if(Math.abs(o.z-PARK.R1Z)>9)continue;if(o.x<x0-15||o.x>x1+25+o.v*4)continue;
    if(o.conn||Math.cos(wrapA(o.h+Math.PI/2))>0.3)return false;}return true;}
// プレイヤーが今どこにいるか
function aoriWhere(){const p=PLAYER;const q=p.loc;if(!q)return'off';if(q.kind==='lot')return q.lot.id==='MART'?'lot':'off';
  if(q.kind==='road'){if(q.road.id==='LIN')return'lin';if(q.road.def.group==='R1')return Math.cos(wrapA(p.h-Math.PI/2))>0?'r1':'r1w';if(q.road.id==='R2')return'r2';}
  if(q.kind==='node')return'node';return'off';}
// 相手の車：後ろから近づく→車間を詰めてパッシング・クラクション→追い越して前に入り急ブレーキ→前をゆっくり走る→道をふさぐ／先で止まる→運転者が降りてくる
// ph 0:近づく 1:後ろにぴったり 2:追越し 3:前に入る（急ブレーキ） 4:前を走る 5:止まる 6:止まった（運転者が降りる）
function evAoriStreet(){const p=PLAYER;const LX=PARK.LINX;const S=STAGE.aoriS;
  const st=r1East(Math.max(-372,p.x-44));if(!st)return null;
  const a=new Veh('car','sedan',0x1b1d22);a.place(st.l,st.u);a.v=Math.max(p.v+4,9);a.evt=true;a.keep=true;a.noLC=true;a.aori=true;a.exitPlan=false;VEH.push(a);
  let ph=0,t=0,tt=0,flashT=0,brakeCk=0,v0Pass=null,ped=null,pedT=0,mode=null,stopX=null,pedHome=null;
  const setPh=(n)=>{ph=n;t=0;if(n!==1)SFX.horn2&&SFX.horn2(false);};
  const e={a,get ph(){return ph;},get mode(){return mode;},get v0Pass(){return v0Pass;},pStopT:0,pStill:0,
    update(dt){const P=PLAYER;const w=aoriWhere();e.pStopT=Math.abs(P.v)<0.3?e.pStopT+dt:0;e.pStill=Math.abs(P.v)<0.05?e.pStill+dt:0;
      if(ph<6||e.asked)return;
      pedT+=dt;
      // 運転者が車を降りて、こちらへ歩いてくる
      if(!ped&&pedT>1.3){ped=new Ped('adult');PEDS.push(ped);ped.reserved=true;const f=fwd(a.h),r=rightV(a.h);ped.set(a.x+r.x*(a.W/2+0.45)+f.x*0.3,a.z+r.z*(a.W/2+0.45)+f.z*0.3);ped.y=0;ped.show(true);ped.mode='script';pedHome={x:ped.x,z:ped.z};
        const Z=PARK.R1Z;const wps=mode==='lot'?[{x:a.x-a.L/2-1.2,z:a.z+r.z*1.4},{x:a.x-a.L/2-1.2,z:Z-5.1},{x:LX+2.6,z:Z-5.1},{x:LX+2.6,z:Z-17}]:[];let wi=0;
        ped.script=(k,dt2)=>{const Pl=PLAYER;if(k.goHome){if(k.stepTo(pedHome.x,pedHome.z,1.5,dt2))k.show(false);k.y=0;return;}
          let tg;if(wi<wps.length){tg=wps[wi];if(k.stepTo(tg.x,tg.z,1.7,dt2))wi++;}
          else{const fp=fwd(Pl.h),rp=rightV(Pl.h);tg={x:Pl.x+rp.x*(Pl.W/2+0.62)+fp.x*0.45,z:Pl.z+rp.z*(Pl.W/2+0.62)+fp.z*0.45};
            if(Math.abs(Pl.v)>0.6){k.v=0;}else if(k.stepTo(tg.x,tg.z,1.7,dt2)){e.pedArrived=true;k.h=headingOf(Pl.x-k.x,Pl.z-k.z);}}
          const dz=Math.abs(k.z-PARK.R1Z);k.y=dz>3.55&&dz<6.7&&Math.abs(k.x-LX)>3.4?0.15:0;};
        coach(mode==='lot'?'相手の車が先で止まり、運転者が降りて、こちらへ歩いてきます。車の外に出ず、窓を閉めてドアをロックします。':'相手の運転者が車から降りて、こちらに向かってきます。車の外に出ず、窓を閉めてドアをロックします。',8,1);}
      if(!ped)return;
      const inLot=w==='lin'||w==='lot';
      // 道をふさがれたのに、よけて先へ進んだ（その場を離れた）
      if(mode==='block'&&!e.fled&&w==='r1'&&P.x>a.x+a.L/2+P.L/2+1){e.fled=true;ped.goHome=true;S.fled=true;coach('その場を離れました。危険を感じたら、人の多い駐車場など安全な場所に止まって、車の外に出ずに110番通報します。',9,1);}
      if(mode==='lot'&&!e.fled&&(w==='r1'||w==='r1w')&&pedT>3){e.fled=true;ped.goHome=true;S.fled=true;}
      if(e.fled){if(e.pStill>2){e.asked=true;aoriCardStreet('fled');}return;}
      if(e.pStill>1.2&&((mode==='lot'&&inLot&&pedT>3.5)||(mode==='block'&&(e.pedArrived||pedT>8)))){e.asked=true;aoriCardStreet(inLot?'lot':'block');}},
    cleanup(){SFX.horn2&&SFX.horn2(false);a.remove();if(ped){ped.show(false);ped.reserved=false;}}};
  a.script=(v,dt)=>{t+=dt;tt+=dt;const P=PLAYER;const w=aoriWhere();const pOnR1=w==='r1';
    const f=fwd(v.h),rt=rightV(v.h);const dx=P.x-v.x,dz=P.z-v.z;const fw=dx*f.x+dz*f.z,lt=dx*rt.x+dz*rt.z;// プレイヤーの位置（相手の車から見て。fw>0 なら前）
    const half=P.L/2+v.L/2;const sameLane=Math.abs(lt)<(P.W+v.W)/2+0.5;const ahead=fw>0;const gapP=ahead?fw-half:-fw-half;
    let want=11,dT=0,maxDec=5,flash=false,horn=false,blinkR=false,blinkL=false;
    if(ph===0){want=P.v+5.5;if(ahead&&sameLane&&gapP<7){setPh(1);e.onTail&&e.onTail();}}
    else if(ph===1){want=ahead&&sameLane?P.v+clamp((gapP-3.6)*0.8,-6,3):P.v+3;dT=Math.sin(tt*1.6)*0.25;flashT+=dt;
      const k=flashT%5;flash=k<2.6&&Math.floor(flashT*2.4)%3===0;horn=(k>3.4&&k<3.9)||(k>4.2&&k<4.9);
      // 進路を譲られたら（左に寄った・止まった）すぐ、譲られなくても9秒たったら、対向車がなければ追い越す
      const ready=(S.yielded&&t>1.2)||t>9;const x0=v.x,x1=P.x+32;
      if(ready&&pOnR1&&ahead&&aoriSpanOK(x0,x1)&&r1OncomingClear(x0,x1)){const lg=playerLeader(P,40);if(!(lg.obj&&lg.obj!==v&&lg.gap<28)){setPh(2);v0Pass=P.v;S.overtaken=true;if(!S.yielded)violate('yield27','',999);e.onPass&&e.onPass();}}}
    else if(ph===2){dT=3.1;blinkR=t<2.2;want=t<1.0?P.v+2:Math.max(P.v+7,10);
      // 対向車が来たら、まだ横に並ぶ前ならやめて後ろに戻る
      if(fw>-half&&!r1OncomingClear(v.x,v.x+60)){if(fw>2){dT=0;want=P.v-3;if(Math.abs(v.d)<0.3){setPh(1);}}}
      if(fw<-(half+9))setPh(3);}// 前に出た
    else if(ph===3){dT=0;blinkL=t<1.4;want=P.v+1.5;
      if(t>1.6&&!brakeCk&&pOnR1&&P.v>4&&!ahead&&gapP>7&&P.x<LX+14)brakeCk=1;
      if(brakeCk===1){want=3.3;maxDec=5.5;danger();if(v.v<3.6){brakeCk=2;e.onBrake&&e.onBrake();setPh(4);}}
      else if(t>3)setPh(4);}
    else if(ph===4){// 前を、プレイヤーとの間を10m前後にして走る（ついて来させる）
      if(t<2.5&&!ahead&&gapP<25)danger();
      want=ahead?P.v:gapP<6?9.5:gapP>24?Math.max(2.5,P.v-1.5):8.0;
      if(pOnR1&&!ahead&&gapP<45&&(P.x>LX+14||e.pStopT>3)){mode='block';setPh(5);}}
    if(ph<5&&(w==='lin'||w==='lot')){mode='lot';S.evac=true;setPh(5);}
    if(ph===5){if(mode==='lot'){dT=-1.05;blinkL=true;if(stopX===null)stopX=Math.max(LX+30,v.x+v.v*v.v/(2*2.6)+6);want=Math.sqrt(2*2.6*Math.max(0,stopX-v.x-0.5));}
      else{want=0;maxDec=3.2;if(v.v>0.5&&!ahead&&gapP<30)danger();}
      if(v.v<0.05&&t>0.5){setPh(6);e.onStopped&&e.onStopped();}}
    if(ph>=6)want=0;
    // プレイヤー（同じ車線の前）にぶつからない
    if(ahead&&sameLane&&ph!==2){const lim=Math.sqrt(Math.max(0,2*6*(gapP-(ph===1?2.2:4))))+Math.max(0,P.v*Math.cos(wrapA(P.h-v.h)));want=Math.min(want,lim);if(gapP<6)maxDec=8;}
    // 同じ車線の前の車
    {const ld=leaderOnPath(v,60,P);if(ld.obj&&ld.gap<Infinity)want=Math.min(want,Math.sqrt(Math.max(0,ld.vl*ld.vl+2*4*Math.max(0,ld.gap-3))));}
    v.v+=clamp(want-v.v,-maxDec*dt,2.8*dt);v.v=Math.max(0,v.v);v.brake=want<v.v-0.3||v.v<0.3;
    const dOld=v.d;if(!v.conn)v.d+=clamp(dT-v.d,-1.5*dt,1.5*dt);const latV=(v.d-dOld)/Math.max(dt,1e-4);
    v.offLane=ph===2&&Math.abs(v.d)>1.4;// 対向車線を走っている間は、この車線の並びに入れない（後ろの車が先行車とみなさない）
    scrAdvance(v,v.v*dt);v.pose();if(!v.conn&&v.v>0.3){v.h+=Math.atan2(latV,Math.max(v.v,2))*v.lane.dir;v.m.grp.rotation.y=-v.h;}
    SFX.horn2&&SFX.horn2(horn&&ph===1&&!STAGE.paused&&!STAGE.over);
    setCarLights(v.m,{head:flash,brake:v.brake,turnR:blinkR,turnL:blinkL,blink:(performance.now()%800)<400});};
  e.onTail=()=>coach('後ろの車が車間距離を極端に詰め、パッシングやクラクションをしてきます。やり返さず、急ブレーキもかけません。できる限り左に寄って、先に行かせましょう。',9,1);
  e.onPass=()=>coach('後ろの車が追越しを始めました。追越しが終わるまで、速度を上げません（第27条第1項）。',6,1);
  e.onBrake=()=>coach('前に入ってきた車が急ブレーキ！ 車間距離を十分にとって、落ち着いて減速します。仕返しはしません。',7,1);
  e.onStopped=()=>{if(mode==='block')coach('前の車が道をふさいで止まりました。追突しないように止まり、車の外には出ません。',7,1);};
  return evAdd(e);}
// 相手の運転者が近づいてきたときの「どうする？」
function aoriCardStreet(kind){const lot=kind==='lot';
  choiceCard({eyebrow:lot?'さくらマートの駐車場に避難しました':kind==='fled'?'安全な場所に止まりました':'道路の上で止められました',title:kind==='fled'?'あおり運転を受けたあと':'相手の運転者がこちらに来ます',steps:[
    {q:kind==='fled'?'相手がまた追いかけてくるかもしれません。止まったあと、どうしますか？':'相手が車を降りて、こちらに近づいてきます。どうしますか？',opts:[
      {t:'窓を閉めてドアをロックし、車の外に出ないで待つ',ok:true,why:'相手が近づいてくるなど危険を感じたら、車の外に出ず、窓を開けずに、ドアをロックして、警察官が到着するまで車の外に出ないようにします。相手とは話をせずに、警察官の到着を待ちます。',src:'広島県警察・福島県警察'},
      {t:'車を降りて、相手と直接話し合う',ok:false,why:'車の外に出るのは危険です。警察庁は、車の外に出ることなく110番通報するよう呼びかけています。',src:'警察庁「あおり運転」'},
      {t:'窓を少し開けて、相手に謝る',ok:false,why:'窓は開けずに、相手とは話をせずに、警察官の到着を待ちます。',src:'広島県警察・福島県警察'}]},
    {q:'通報は？',opts:[
      {t:'ためらわずに110番通報する',ok:true,why:'交通事故に遭わない場所に避難したら、ためらわずに110番通報します。運転中は携帯電話を手に持って使えないので、止まってから通報します。',src:'警察庁「あおり運転」・広島県警察／道路交通法 第71条第5号の5'},
      {t:'相手が立ち去るまで待ち、通報はしない',ok:false,why:'ためらわずに110番通報するよう呼びかけられています。',src:'警察庁「あおり運転」'},
      {t:'相手の車を追いかけて、ナンバーを確かめてから通報する',ok:false,why:'危険な運転をされても、やり返したり追いかけたりしません。',src:'福島県警察'}]},
    {q:'ドライブレコーダーの映像は？',opts:[
      {t:'加工・消去せずに保存し、警察官に映像があることを伝える',ok:true,why:'映像は加工・消去せずに保存して、対応した警察官に映像があることを伝えます。',src:'広島県警察'},
      {t:'思い出したくないので、すぐに消去する',ok:false,why:'映像は加工・消去せずに保存します。',src:'広島県警察'},
      {t:'自分に都合のよい所だけを切り取って渡す',ok:false,why:'映像は加工せずに、そのまま保存します。',src:'広島県警察'}]}]},
    (res)=>{if(res.miss)violate('aoriNG',`まちがい ${res.miss}回`,999);else praise('aoriOK');
      finishStage({note:lot?'人の多い駐車場に避難して、あおり運転に対処しました。':kind==='fled'?'あおり運転を受けたあとの対処を確認しました。':'道路の上で止められたときの対処を確認しました。実際には、その前に人の多い駐車場などへ避難できると、より安全です。'});});}
function a2Tick(dt){const p=PLAYER;const A=STAGE.aori;const S=STAGE.aoriS;const w=aoriWhere();
  if(A&&A.ph>=1&&!STAGE.aoriEvac&&(A.ph>=3||p.x>-10)&&p.x<PARK.LINX-25&&w==='r1'){STAGE.aoriEvac=1;coach('危険を感じたら、人の多い駐車場などに避難します。この先 左側の「さくらマート」の駐車場に入りましょう。駐車場に入る前に、歩道の手前で一時停止します。',10,1);}
  if((w==='lin'||w==='lot')&&!STAGE.lotCoach){STAGE.lotCoach=1;coach('駐車場に避難しました。空いている所に止めて、パーキングブレーキ（{pb}）。車の外には出ません。',7,1);}
  if(w==='r2'&&J.road&&J.road.id==='R2'&&J.s>30)finishStage({note:'さくら通りから南の道へ曲がりました。あおり運転を受けたら、人の多い駐車場など交通事故に遭わない場所に避難し、車の外に出ずに110番通報します。'});
  if(w==='r1'&&p.x>330)finishStage({note:'地図の端に着きました。あおり運転を受けたら、人の多い駐車場など交通事故に遭わない場所に避難し、車の外に出ずに110番通報します。'});
  if(STAGE.time>300)finishStage({note:'時間切れです。'});}
function a2Judge(dt){const p=PLAYER;const A=STAGE.aori;const S=STAGE.aoriS;if(!A)return;const a=A.a;const w=aoriWhere();
  walkStopTick();lotSpeedTick(dt,w==='lin'||w==='lot');
  if(a.hidden)return;const f=fwd(p.h);const behind=(p.x-a.x)*f.x+(p.z-a.z)*f.z;// 相手が後ろにいれば正
  // 仕返しの急ブレーキ（すぐ後ろに相手がいるとき）
  if(A.ph>=1&&A.ph<=2&&behind>0&&behind<22&&p.a<-5.5&&p.v>2.5){S.hbT=(S.hbT||0)+dt;if(S.hbT>0.35){const lg=playerLeader(p,40);if(!(lg.obj&&lg.obj!==a&&lg.gap<20)&&J.t-J.dangerT>2){S.brake++;violate('aoriBrake','',20);}}}else S.hbT=0;
  // 進路を譲る（左端に寄る・止まる）
  if(A.ph===1&&!S.yielded){const g=leftEdgeGap(p);if((g<0.75)||(p.v<1&&g<1.1))S.yieldT=(S.yieldT||0)+dt;else S.yieldT=Math.max(0,(S.yieldT||0)-dt);
    if(S.yieldT>1.0){S.yielded=true;praise('yieldAori');coach('左に寄って、先に行かせます。追越しが終わるまで、速度は上げません。',6,1);}
    S.tailT=(S.tailT||0)+dt;if(S.tailT>4.5&&!S.yieldHint){S.yieldHint=1;coach('道路の左端に寄せて少し速度を落とすと、後ろの車が追い越しやすくなります（追いつかれたら進路を譲る：第27条第2項）。',8,1);}}
  // 追い越されている間に速度を上げた
  if(A.ph===2&&A.v0Pass!==null&&!S.speedUp&&p.v>A.v0Pass+2.5&&Math.abs(behind)<p.L/2+a.L/2+4){S.speedUp=true;violate('passedSpeedUp',`${Math.round(A.v0Pass*KMH)}→${Math.round(p.v*KMH)}km/h`,999);}}
function a2Nav(){const p=PLAYER;const A=STAGE.aori;const w=aoriWhere();const LX=PARK.LINX;
  if(w==='lin'||w==='lot'){setNav('G',null,'空いている所に止めて、パーキングブレーキ（車の外には出ない）');NAV.pts=[];return true;}
  if(A&&A.mode==='block'&&!STAGE.aoriS.fled){setNav('G',null,'止まって、車の外に出ない');NAV.pts=[];return true;}
  if(w==='r1'&&STAGE.aoriEvac&&p.x<LX-3){const d=Math.max(0,LX-3.4-(p.x+p.L/2));setNav('L',d,'さくらマートの駐車場へ避難（歩道の手前で一時停止）');NAV.turn='L';NAV.turnDist=d;NAV.pts=[{x:p.x,z:p.z},{x:LX,z:PARK.R1Z-1.5},{x:LX,z:PARK.LOT.z1-6}];return true;}
  setNav('S',null,'さくら通りを東へ（一定の速さで）');NAV.pts=[];return true;}

// ================= a3：あおり運転をしない（前の遅い車・初心者マーク） =================
// 道路の左端に止まっていた初心者マークの軽自動車が、プレイヤーが発進すると合図を出して出ていき、約25km/hで走る
function evSlowBeginner(){const q=TA('R1',-288);if(!q)return null;const r=q.road;const l=r.lanes(q.sign)[0];
  const v=new Veh('car','kei',0xeceae4);addWakaba(v.m);v.place(l,l.uOf(q.s));const dPark=-(l.w/2-v.W/2)-0.35;v.d=dPark;v.v=0;
  v.evt=true;v.keep=true;v.noLC=true;v.forceTurn='S';v.slowZone=25/KMH;v.vpref=1;v.beginner=true;v.pose();VEH.push(v);let ph=0,t=0;
  v.script=(vv,dt)=>{t+=dt;let latV=0;
    if(ph===0){vv.v=0;if(PLAYER.blink==='R'||J.started){ph=1;t=0;STAGE.onBeginnerGo&&STAGE.onBeginnerGo();}}
    else if(ph===1&&t>3){// 合図を出して3秒たってから、ゆっくり道路に出る（施行令第21条）
      vv.v=Math.min(vv.v+1.1*dt,5.6);const d0=vv.d;vv.d+=clamp(0-vv.d,-0.55*dt,0.55*dt);latV=(vv.d-d0)/Math.max(dt,1e-4);scrAdvance(vv,vv.v*dt);
      if(Math.abs(vv.d)<0.02){vv.d=0;vv.script=null;}}
    vv.pose();if(latV&&vv.v>0.3){vv.h+=Math.atan2(latV,Math.max(vv.v,1.5))*vv.lane.dir;vv.m.grp.rotation.y=-vv.h;}
    setCarLights(vv.m,{brake:vv.v<0.1,turnR:ph===1,blink:(performance.now()%800)<400});};
  return v;}
function a3Judge(dt){const p=PLAYER;const S=STAGE.slowS;const v=S&&S.v;if(!v||v.hidden||!J.started)return;
  const f=fwd(p.h),rt=rightV(p.h);const dx=v.x-p.x,dz=v.z-p.z;const fw=dx*f.x+dz*f.z,lt=dx*rt.x+dz*rt.z;const half=p.L/2+v.L/2;const same=Math.cos(wrapA(v.h-p.h))>0.6;
  if(!same||v.script)return;
  // ついて走っている間の車間（秒）
  if(fw>half&&fw<70&&Math.abs(lt)<2.2&&p.v>3&&!v.script){const th=(fw-half)/p.v;S.followT+=dt;if(th<2.0)S.closeT+=dt;S.minTh=Math.min(S.minTh,th);
    if(th<1.4){S.nearT=(S.nearT||0)+dt;if(S.nearT>2.5)advise('aoriGap','車間距離が詰まっています。前の車が急に止まっても追突しない距離を（2秒以上が目安）。',20);}else S.nearT=0;
    if(S.followT>14&&!S.midCoach){S.midCoach=1;coach('急いでいても、前の車をあおらない。車間距離を詰める・クラクションで急かす・黄色の線をはみ出して追い越すのは危険で、相手の通行を妨害する目的なら妨害運転（あおり運転）になります。',10,1);}}
  // 横に並んだとき：黄色の中央線のはみ出し・幅寄せ
  if(Math.abs(fw)<half+1.5&&Math.abs(lt)<4.5){if(J.overYellow&&!S.yellowPass){S.yellowPass=true;violate('yellowLine','黄色の中央線をはみ出して、前の車を追い越そうとしました。',999);}
    const gap=Math.abs(lt)-(p.W+v.W)/2;if(gap<0.5&&!S.beginnerNG&&p.v>1){S.beginnerNG=true;violate('beginnerMark','初心者マークの車に幅寄せをしました。',999);}}
  // 追い越した（前に出た）
  if(!S.passed&&fw<-half&&Math.abs(lt)<6){S.passed=true;S.passT=J.t;const X=S.xw;if(X){const xs=X.r.at(X.s).x;if(p.x>xs-2-30-p.L&&p.x<xs+6){S.xwNG=true;violate('xwPass','',999);}}}
  // 追い越したあと前に割り込み、初心者マークの車にブレーキをかけさせた
  if(S.passed&&J.t-S.passT<6&&!S.beginnerNG&&v.lastAcc!==undefined&&v.lastAcc<-3.2&&fw<0){const ld=leaderOnPath(v,30);if(ld.obj===p){S.beginnerNG=true;violate('beginnerMark','追い越したあと、初心者マークの車の前に割り込んで、ブレーキをかけさせました。',999);}}}
function a3Tick(dt){const p=PLAYER;const S=STAGE.slowS;const v=S&&S.v;if(!v)return;
  // 横断歩道の手前で前の車が止まった
  const X=S.xw;if(X&&!S.xwCoach&&!v.script&&v.v<0.3){const xs=X.r.at(X.s).x;if(v.x<xs&&xs-v.x<14&&p.x<v.x&&v.x-p.x<45){S.xwCoach=1;coach('前の車が、横断歩道を渡る人のために止まりました。横断歩道とその手前30m以内では、前の車の横を通って前に出てはいけません（第38条第3項）。',8,1);}}}
// ゴールで止まったあとの「ふり返り」
function aoriSelfCard(done){choiceCard({eyebrow:'ふり返り ・ あおり運転をしないために',title:'自分の運転を見直す',steps:[
  {q:'前の車（初心者マーク）が、制限速度よりかなりゆっくり走っています。あなたは急いでいます。どうしますか？',opts:[
    {t:'車間距離を十分にとってついて行く。黄色の中央線の所では追い越さない',ok:true,why:'車間距離は、前の車が急に止まっても追突しない距離をとります（第26条）。黄色の中央線は「追越しのための右側部分はみ出し通行禁止」です。初心者マークの車への幅寄せや、必要な車間距離を保てなくなるような割り込みも禁止です（第71条第5号の4）。',src:'道路交通法 第26条・第71条第5号の4／警視庁「初心運転者標識等」'},
    {t:'クラクションを鳴らして、急ぐように伝える',ok:false,why:'クラクションは「警笛鳴らせ」の場所か、危険を防ぐためやむを得ないときしか使えません（第54条第2項）。相手の通行を妨害する目的で、交通の危険を生じさせるおそれのある方法で行えば、妨害運転（あおり運転）になります。',src:'道路交通法 第54条第2項・第117条の2の2第1項第8号'},
    {t:'車間距離を詰めて、後ろから急がせる',ok:false,why:'車間距離を詰めるのは追突のもとです（第26条）。相手の通行を妨害する目的なら、妨害運転（あおり運転）の対象です。',src:'道路交通法 第26条・第117条の2の2第1項第8号'},
    {t:'追い越して前に入り、ブレーキを踏んで注意する',ok:false,why:'危険を防ぐためやむを得ない場合を除き、急ブレーキは禁止です（第24条）。相手の通行を妨害する目的なら、妨害運転（あおり運転）の対象です。',src:'道路交通法 第24条・第117条の2の2第1項第8号'}]},
  {q:'妨害運転（あおり運転）をすると、どうなりますか？',opts:[
    {t:'3年以下の拘禁刑または50万円以下の罰金。違反点数25点で、免許取消し',ok:true,why:'高速道路で相手の車を止めさせるなど、著しい交通の危険を生じさせた場合は、5年以下の拘禁刑または100万円以下の罰金・違反点数35点で、免許取消しです。',src:'道路交通法 第117条の2の2第1項第8号・第117条の2第1項第4号／京都府警察'},
    {t:'反則金を納めれば、それで終わる',ok:false,why:'妨害運転は、拘禁刑または罰金という刑罰の対象で、違反点数25点（著しい交通の危険を生じさせた場合は35点）の免許取消しになります。反則金を納めれば済む違反ではありません。',src:'道路交通法 第117条の2の2・京都府警察'},
    {t:'違反点数が1〜2点つくだけ',ok:false,why:'違反点数は25点（著しい交通の危険を生じさせた場合は35点）で、免許取消しになります。',src:'京都府警察'}]},
  {q:'あおり運転をしない・されないための心がけは？',opts:[
    {t:'時間に余裕をもち、思いやり・ゆずり合いの気持ちで運転する',ok:true,why:'警察庁は「思いやり・ゆずり合い」の気持ちで運転するよう呼びかけています。法律で妨害運転の対象とされているのは、通行区分（道路の右側部分へのはみ出しなど）、自転車の右側を通るときの間隔・速度、急ブレーキ、車間距離、進路変更、追越しの方法、減光など（夜間にハイビームのままにするなど）、警音器、安全運転義務、高速道路の最低速度、高速道路での駐停車の11の規定に違反するような行為を、相手の通行を妨害する目的で、交通の危険を生じさせるおそれのある方法で行うことです。',src:'警察庁「あおり運転」・道路交通法 第117条の2の2第1項第8号'},
    {t:'急いでいるときは、車間距離を少し詰めるのはしかたない',ok:false,why:'車間距離は、前の車が急に止まっても追突しない距離が必要です（第26条）。時間に余裕をもって出発しましょう。',src:'道路交通法 第26条'},
    {t:'遅い車には、後ろからクラクションで知らせてあげるのが親切',ok:false,why:'クラクションは「警笛鳴らせ」の場所か、危険を防ぐためやむを得ないときしか使えません（第54条第2項）。',src:'道路交通法 第54条第2項'}]}]},
  (res)=>{if(res.miss)violate('aoriQuizNG',`まちがい ${res.miss}回`,999);done&&done();});}

STAGES.push(
 {id:'a2',cat:'aori',map:'park',name:'あおり運転を受けたら（一般道）',desc:'追いつかれたら左に寄って先に行かせる。仕返しはしない。人の多い駐車場に避難し、車の外に出ずにドアロック・110番',env:'day',envLabel:'昼・晴れ',rolling:30,
  traffic:{n:3,bikes:0,peds:26,filter:l=>!!l.road.def.street&&!l.road.def.lotRoad&&!(l.road.def.group==='R1'&&l.dir===1),mix:{kei:3,compact:3,sedan:2,van:1.5,suv:1}},
  intro:'さくら通り商店会の通りを東へ走っています。後ろから来た車が、車間距離を詰めてパッシングやクラクションをしてきます。挑発に乗らずに進路を譲り、人の多い場所に避難して対処します。',
  points:['あおられても、やり返さない（福島県警察）。急ブレーキはかけない（第24条）。張り合って速度を上げない',
    '追いつかれたら、できる限り道路の左側に寄って進路を譲る（第27条第2項）。追い越されている間は速度を上げない（第27条第1項）',
    '危険を感じたら、スーパーやコンビニの駐車場など、人の多い・交通事故に遭わない場所に避難する（広島県警察・福島県警察）。駐車場に入るときは歩道の手前で一時停止（第17条第2項）',
    '車の外に出ず、窓を閉めてドアをロックし、ためらわずに110番通報。相手とは話をせずに警察官の到着を待つ（警察庁・広島県警察・福島県警察）',
    'ドライブレコーダーの映像は、加工・消去せずに保存して警察官に伝える（広島県警察）'],
  startPose(){const r=NET.byId.R1a;const l=r.lanes(1)[0];const P=l.pos(clamp(l.uOf(-250-r.at(0).x),2,l.len-2),0);return{x:P.x,z:P.z,y:P.y,h:P.h};},goalPose(){return null;},way:[],
  setup(){const X=XWm('R1',PARK.CROSS);if(X){X.lock=true;evAdd({update(){},cleanup(){X.lock=false;}});}
    STAGE.aoriS={horn:0,brake:0,yielded:false,overtaken:false,speedUp:false,evac:false,fled:false};STAGE.aoriEvac=0;STAGE.lotCoach=0;
    STAGE.queue=[{t:1.0,fn:()=>{STAGE.aori=evAoriStreet();return true;}}];
    STAGE.onAction=(k)=>{if(k==='horn'&&STAGE.aori&&STAGE.aori.ph>=1&&STAGE.aori.ph<6){STAGE.aoriS.horn++;coach('クラクションで仕返しをすると、トラブルが大きくなるおそれがあります。挑発に乗らず、落ち着いて対処しましょう。',7,1);}};
    STAGE.judgeExtra=a2Judge;STAGE.tick=a2Tick;STAGE.navFn=a2Nav;
    STAGE.finishNote=()=>{const S=STAGE.aoriS;const ret=S.horn>0||S.brake>0;const checks=[
      {bad:ret,t:ret?'仕返し（クラクション・急ブレーキ）をした':'仕返し（クラクション・急ブレーキ）をしなかった',law:'福島県警察「やり返さない」／道路交通法 第24条・第54条第2項'},
      {bad:!S.yielded,t:S.yielded?'追いつかれたとき、左に寄って進路を譲った':'追いつかれたとき、左に寄って進路を譲れなかった',law:'道路交通法 第27条第2項'}];
      if(S.overtaken)checks.push({bad:S.speedUp,t:S.speedUp?'追い越されている間に速度を上げた':'追い越されている間、速度を上げなかった',law:'道路交通法 第27条第1項'});
      checks.push({bad:!S.evac,t:S.evac?'人の多い駐車場に避難した':'人の多い駐車場など、安全な場所に避難できなかった',law:'広島県警察・福島県警察'});
      if(S.evac)praise('evacOK');
      return{checksTitle:'あおり運転を受けたときの運転',checks};};}},
 {id:'a3',cat:'aori',map:'town',name:'あおり運転をしない（自分の運転を見直す）',desc:'前の遅い車（初心者マーク）に、車間を詰めない・クラクションで急かさない・黄色の線をはみ出して追い越さない',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'県道みなみ線を東へ走り、停止位置に止めます。前を走る初心者マークの車は、制限速度よりかなりゆっくり走ります。イライラせず、安全な車間距離でついて行けるでしょうか。止まったら、自分の運転をふり返ります。',
  points:['車間距離は、前の車が急に止まっても追突しない距離を（第26条）。目安は2秒以上（法律の定めではありません）',
    'クラクションは「警笛鳴らせ」の場所か、危険を防ぐためやむを得ないときだけ（第54条第2項）',
    '黄色の中央線は「追越しのための右側部分はみ出し通行禁止」。はみ出して追い越さない',
    '横断歩道とその手前30m以内では、前の車の横を通って前に出ない（第38条第3項）',
    '初心者マークの車に、幅寄せや、必要な車間距離を保てなくなるような割り込みをしない（第71条第5号の4）',
    '相手の通行を妨害する目的で、車間距離を詰める・急ブレーキ・不必要なクラクションなどをすると妨害運転（あおり運転）。3年以下の拘禁刑または50万円以下の罰金、違反点数25点で免許取消し（第117条の2の2第1項第8号）'],
  start:['R1',-335,1],goal:['R1',-58,1],way:['-150,-150'],
  setup(){const v=evSlowBeginner();STAGE.slowS={v,followT:0,closeT:0,minTh:9,horn:0,yellowPass:false,beginnerNG:false,xwNG:false,passed:false,xw:XWm('R1',-220)};
    evPedWaiting(XWm('R1',-220),'old');
    STAGE.onBeginnerGo=()=>coach('左に止まっていた初心者マーク（若葉マーク）の車が、合図を出して道路に出ます。この車は、ゆっくり走ります。車間距離を十分にとって、あせらずについて行きましょう。',9,1);
    STAGE.onAction=(k)=>{if(k==='horn'&&STAGE.slowS)STAGE.slowS.horn++;};
    STAGE.judgeExtra=a3Judge;STAGE.tick=a3Tick;
    STAGE.beforeFinish=(done)=>aoriSelfCard(done);
    STAGE.finishNote=()=>{const S=STAGE.slowS;const ok=S.followT>=8&&S.closeT<=4;if(ok)praise('keepGapOK');const checks=[
      {bad:S.closeT>4,t:S.closeT>4?`前の車との車間が2秒未満だった時間：約${Math.round(S.closeT)}秒`:'前の車との車間を、おおむね2秒以上とってついて行った',law:'道路交通法 第26条（2秒は目安で、法律の定めではありません）'},
      {bad:S.horn>0,t:S.horn>0?'クラクションを鳴らした':'クラクションで急かさなかった',law:'道路交通法 第54条第2項'},
      {bad:S.yellowPass,t:S.yellowPass?'黄色の中央線をはみ出して追い越そうとした':'黄色の中央線をはみ出して追い越さなかった',law:'道路標示「追越しのための右側部分はみ出し通行禁止」'},
      {bad:S.xwNG,t:S.xwNG?'横断歩道の手前で、前の車を追い越した':'横断歩道の手前で、前の車を追い越さなかった',law:'道路交通法 第38条第3項'},
      {bad:S.beginnerNG,t:S.beginnerNG?'初心者マークの車に幅寄せ・割り込みをした':'初心者マークの車に幅寄せ・割り込みをしなかった',law:'道路交通法 第71条第5号の4'}];
      return{checksTitle:'自分の運転のふり返り（前の遅い車に対して）',checks,note:S.followT<8?'前の車について走った時間が短かったため、車間距離の確認は参考程度です。':null};};}},
);
