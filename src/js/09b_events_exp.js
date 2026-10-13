// ===== 09b_events_exp.js : 高速道路のできごと（落下物・渋滞・故障）・あおり運転 =====
// 落下物（段ボール箱やタイヤ）：車線の真ん中
function evFallenObject(r,s,laneIdx,kind='box'){const l=r.lanesF[laneIdx];const P=l.pos(l.uOf(s),0);const g=new THREE.Group();
  if(kind==='tire'){const m=new THREE.Mesh(new THREE.TorusGeometry(0.33,0.12,8,16),lambert(0x1c1c1c));m.rotation.x=Math.PI/2;m.position.y=0.12;g.add(m);}
  else{const m=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.55,0.7),lambert(0xb08a58));m.position.y=0.28;m.rotation.y=0.6;g.add(m);const t=new THREE.Mesh(new THREE.BoxGeometry(0.92,0.06,0.2),lambert(0x7d6243));t.position.y=0.56;t.rotation.y=0.6;g.add(t);}
  g.position.set(P.x,P.y,P.z);scene.add(g);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.ownMat=true;}});
  const o={x:P.x,z:P.z,y:P.y,h:P.h,L:0.9,W:0.9,model:{grp:g},label:'落下物に衝突しました。',dLane:0,road:r,s,dir:1,fallen:true};NET.obst.push(o);
  const e={update(){const d=distOnRoad(r,s,1);if(d!==null&&d<260&&d>0&&!this.warned){this.warned=1;coach('前方の'+(laneIdx===0?'左の車線':'右の車線')+'に落下物！ 合図を出し、後ろを確認してから隣の車線へ移ってよけます。急ハンドル・急ブレーキは避けます。',7,1);}
      if(d!==null&&d<-20&&!this.passed){this.passed=1;praise('objOK');coach('落下物を見つけたら、運転しながら電話はしません。同乗者に頼むか、PAなど安全な場所に止めてから道路緊急ダイヤル「#9910」に通報します（国土交通省・NEXCO）。',9,1);}
      if(this.passed&&d!==null&&d<-400)this.done=true;},cleanup(){removeObstacle(o);},lesson:'落下物は、急ハンドルを避けて、合図を出して後ろを確認してから車線を変えてよけます。'};
  STAGE.lessonHint=e.lesson;return evAdd(e);}
// 渋滞：最後尾が止まりかけ。プレイヤーが近くで待つと少しずつ流れ出す
function evJam(r,s,n=10){const cars=[];for(let i=0;i<n;i++){const lane=i%2;const l=r.lanesF[lane];const c=new Veh('car',pick(['compact','sedan','kei','van','suv','truck']));c.place(l,l.uOf(s+Math.floor(i/2)*9+(lane?4:0)));c.v=2.5;c.evt=true;c.exitPlan=false;c.noLC=true;
    c.script=(vv,dt)=>{vv.brake=true;const tgt=e.flow?Math.min(vv.v+dt*0.7,e.flow):2.2;vv.v+=clamp(tgt-vv.v,-2*dt,0.8*dt);vv.u+=vv.v*dt;if(vv.u>=vv.lane.len)vv.script=null;vv.pose();setCarLights(vv.m,{brake:vv.v<e.flow-0.5||!e.flow,turnL:e.haz,turnR:e.haz,blink:(performance.now()%800)<400});};VEH.push(c);cars.push(c);}
  const e={t:0,flow:0,haz:true,update(dt){this.t+=dt;const p=PLAYER;const d=distOnRoad(r,s,1);
      if(d!==null&&d<900&&!this.w1){this.w1=1;coach('この先、渋滞しています。早めに速度を落とします。最後尾に近づいたら、ハザードランプで後ろの車に知らせましょう（法律上の義務ではありませんが、NEXCOが呼びかけています）。',9,1);}
      if(d!==null&&d<350&&d>0&&p.hazard&&p.v<22&&!this.praised){this.praised=1;praise('hazardJam');}
      if(d!==null&&d<60&&p.v<3){this.wait=(this.wait||0)+dt;if(this.wait>7&&!this.flow){this.flow=8;this.haz=false;coach('渋滞が流れ始めました。前の車との車間距離を十分にとって進みます。ハザードは消しましょう。',6,1);}}
      if(this.flow){this.flow=Math.min(24,this.flow+dt*0.6);if(cars.every(c=>c.hidden||!c.script||(c.lane&&c.lane.road!==r)))this.done=true;}
      if(this.t>240)this.done=true;},cleanup(){cars.forEach(c=>c.remove());}};
  return evAdd(e);}
// 故障：エンジンの警告→路肩に止めて、安全措置を選ぶ
function evBreakdown(){const p=PLAYER;STAGE.emergency=true;p.engineFault=true;$('eew').innerHTML='エンジン警告灯が点灯<small>加速できません。ハザードをつけ、左の路肩に止めましょう</small>';$('eew').hidden=false;SFX.eew&&SFX.eew();
  coach('エンジンの調子がおかしく、加速できなくなりました。ハザードランプ（{hz}）をつけ、左の合図を出して、十分な幅のある左の路肩に止めます。',10,1);
  const e={t:0,update(dt){this.t+=dt;if(this.t>5)$('eew').hidden=true;
      const onSh=J.q&&J.q.band==='shoulder'&&J.dir>0;if(p.v===0&&onSh&&!this.asked){this.stopT=(this.stopT||0)+dt;if(this.stopT>1.2){this.asked=1;if(!p.hazard)coach('ハザードランプもつけておくと、後ろの車に気づいてもらいやすくなります（警察庁は特に夜間の点灯を呼びかけています）。',6,1);breakdownCard();}}
      else if(p.v===0&&!onSh&&this.t>8&&!this.asked){this.offT=(this.offT||0)+dt;if(this.offT>4&&!this.hinted){this.hinted=1;coach('車線の上で止まると、後ろから追突されるおそれがあります。動けるうちに左の路肩まで寄せましょう。',6,1);}}},cleanup(){$('eew').hidden=true;p.engineFault=false;}};
  return evAdd(e);}
function breakdownCard(){choiceCard({eyebrow:'故障して路肩に止まりました',title:'安全のためにすること',steps:[
  {q:'ハザードランプをつけて路肩に止まりました。後ろから来る車への合図として、次にすることは？',opts:[
    {t:'停止表示器材（三角表示板など）を、後ろから来る車の運転者から見やすい位置に置く',ok:true,why:'高速道路で故障などで止まったときは、停止表示器材を後方から見やすい位置に置いて、止まっていることを知らせなければなりません。夜間は夜間用、昼間でもトンネルの中など視界200m以下の場所では夜間用を使います。',src:'道路交通法 第75条の11第1項／施行令 第27条の6'},
    {t:'車の中で、救援が来るまでじっと待つ',ok:false,why:'停止した車の中にとどまるのは大変危険です（後ろから追突されるおそれ）。NEXCO中日本も「車内は安全地帯ではありません」としています。',src:'警察庁「高速道路」・NEXCO中日本'},
    {t:'車のすぐ後ろに立って、後ろの車に手で合図する',ok:false,why:'止まった車から降りて車のそばに立っていることは大変危険です。',src:'警察庁「高速道路」'}]},
  {q:'安全措置をとったあと、どこにいますか？',opts:[
    {t:'ガードレールの外側など、道路の外の安全な場所に避難する',ok:true,why:'後続車に対する安全措置をとったら、ガードレールの外側など道路外の安全な場所に避難します。',src:'警察庁リーフレット（高速道路の安全な利用）'},
    {t:'車の前に立って、故障した所を見ている',ok:false,why:'車の近くに立っているのは大変危険です。追突されると巻き込まれます。',src:'警察庁「高速道路」'},
    {t:'路肩を歩いて、近くの出口まで移動する',ok:false,why:'路肩を歩いて移動するのは危険です。安全な場所に避難して通報し、助けを待ちます。'}]},
  {q:'通報はどうしますか？（正しいものを1つ選んでください）',opts:[
    {t:'安全な場所から、110番・非常電話・道路緊急ダイヤル「#9910」のいずれかで通報する',ok:true,why:'携帯電話で110番通報するか、近くの非常電話を使って、故障か事故か、場所、けが人の有無などを伝えます。非常電話は本線上に約1kmおき、トンネル内は約200mおきにあり、受話器を取るだけで道路管制センターにつながります（NEXCO西日本）。#9910も使えます（NEXCO中日本）。',src:'警察庁「高速道路」・NEXCO西日本・NEXCO中日本'},
    {t:'通報せず、自分で修理してみる',ok:false,why:'本線や路肩での作業は大変危険です。速やかに避難して通報します。'},
    {t:'路肩に止まったまま、車内で知り合いに電話して相談する',ok:false,why:'車内にとどまるのは危険です。また、通報先は110番・非常電話・#9910です。'}]}]},
  (res)=>{if(res.miss)violate('breakdownNG',`まちがい ${res.miss}回`,999);else praise('breakdownOK');finishStage({note:'故障時の安全措置を確認しました'});});}
// あおり運転（高速道路）：後ろから車間を詰め、パッシング・クラクション→追い越して前に割り込み、減速→後ろに回ってPAまでついてくる
// ph 0:近づく 1:後ろにぴったり 2:追い越して割り込む 3:前で減速 4:後ろに回ってついてくる 5:プレイヤーが本線を出た
function evAoriExp(r,s0){const p=PLAYER;const l0=r.lanesF[0];const sP0=J.road===r?J.s:s0;
  const a=new Veh('car','sedan',0x1b1d22);a.place(l0,Math.max(2,l0.uOf(sP0)-125));a.v=p.v+8;a.evt=true;a.keep=true;a.noLC=true;a.exitPlan=false;a.aori=true;VEH.push(a);
  let ph=0,t=0,follow=false,flashT=0;const PA=EXPC.pa;
  const IN=NET.byId.PA_IN,AI=NET.byId.PA_AISLE,OUT=NET.byId.PA_OUT;
  // PAへの道に沿った位置（減速車線の終わり＝PA入口の始まり）
  const paX=(road,s2)=>road===IN?PA.d1+s2:road===AI?PA.d1+IN.len+s2:road===OUT?PA.d1+IN.len+AI.len+s2:null;
  const pPos=()=>{const q=p.loc;if(q&&q.kind==='road')return{road:q.road,s:q.s};if(q&&q.kind==='lot'&&AI){const A0=AI.at(0);const f=fwd(A0.h);return{road:AI,s:clamp((p.x-A0.x)*f.x+(p.z-A0.z)*f.z,0,AI.len),lot:true};}return null;};
  const toLane=(nl)=>{if(!nl||nl===a.lane)return;const s2=a.lane.sOf(a.u);const tOld=a.lane.tAt(s2)+a.d*a.lane.dir;a.lane=nl;a.u=clamp(nl.uOf(s2),0,nl.len);a.d=(tOld-nl.tAt(s2))*nl.dir;};
  const gapL=()=>p.L/2+a.L/2;
  const e={a,get ph(){return ph;},get follow(){return follow;},update(dt){t+=dt;const P=PLAYER;
      if(ph===0&&e.dRel!==null&&e.dRel>-(gapL()+24)){ph=1;t=0;coach('後ろの車が、極端に車間距離を詰めてきました。あわてず、急ブレーキはかけずに、一定の速さで左の車線を走りましょう。',8,1);}
      if(ph===1){flashT+=dt;const on=Math.floor(flashT*2.5)%3===0&&flashT<7;SFX.horn2&&SFX.horn2(on);if(t>9){ph=2;t=0;SFX.horn2&&SFX.horn2(false);}}
      if(ph===2&&t>14){ph=3;t=0;}
      if(ph===3&&t>8){ph=4;t=0;coach('危険を感じたら、SA・PAなど交通事故に遭わない場所に避難し、車の外に出ずに110番通報します（警察庁）。この先の みなみPA に入りましょう。',10,1);}
      // プレイヤーが本線を出た（PAへ）
      if(ph<5&&J.road&&J.road!==r){ph=5;t=0;SFX.horn2&&SFX.horn2(false);}
      if(ph<5&&J.road===r&&J.lane&&J.lane.kind==='decel'&&J.lane.pid==='pa'){ph=5;t=0;SFX.horn2&&SFX.horn2(false);}
      if(ph===5&&STAGE.inPA&&P.v===0&&!this.asked){this.stopT=(this.stopT||0)+dt;if(this.stopT>1.5){this.asked=1;aoriCard(follow&&!a.hidden&&a.lane&&a.lane.road.def.paRoad);}}},
    dRel:null,cleanup(){SFX.horn2&&SFX.horn2(false);a.remove();}};
  a.script=(v,dt)=>{const P=PLAYER;const pp=pPos();const sA=v.lane.sOf(v.u);const onR=v.lane.road===r;const pl=J.road===r&&J.lane&&J.lane.kind==='main'?J.lane:null;
    // 相手から見たプレイヤーとの前後差（正：相手が前）
    let dRel=null;if(pp){if(pp.road===r&&onR)dRel=sA-pp.s;else{const xP=pp.road===r?pp.s:paX(pp.road,pp.s);const xA=onR?((v.lane.kind==='decel'&&v.lane.pid==='pa')||sA<PA.d0?sA:null):paX(v.lane.road,sA);if(xP!==null&&xA!==null)dRel=xA-xP;}}
    e.dRel=dRel;let want=P.v;const gap=dRel!==null?-dRel-gapL():null;// 後ろにいるときの車間
    const other=pl?pl.road.lanesF[pl.idx===0?1:0]:null;
    if(ph===0){want=P.v+9;if(pl&&v.lane!==pl&&v.lane.kind==='main')toLane(pl);}
    else if(ph===1){if(pl&&v.lane!==pl&&v.lane.kind==='main')toLane(pl);if(gap!==null)want=P.v+clamp((gap-6)*0.7,-8,6);v.d=v.d*0.9+Math.sin(t*1.7)*0.035;}
    else if(ph===2){// 隣の車線から追い越して、前に割り込む
      if(other&&v.lane===pl&&dRel!==null&&dRel<0)toLane(other);want=P.v+7;
      if(pl&&v.lane!==pl&&dRel!==null&&dRel>gapL()+11){toLane(pl);ph=3;t=0;coach('前に割り込んできた車が減速しています。車間距離をとって、追突しないように落ち着いて減速します。仕返しの運転はしません。',8,1);}}
    else if(ph===3){want=t<3?Math.max(12,P.v-6):P.v+0.5;}
    else if(ph===4){// 隣の車線に移って後ろに回り、また後ろにつく（黄色の線の区間は移らずに斜め後ろ）
      const s2=v.lane.sOf(v.u);
      if(pl&&v.lane===pl&&dRel!==null&&dRel>-(gapL()+6)){if(other&&pl.lineTo(other.idx>pl.idx?1:-1,s2)!=='yellow')toLane(other);else want=P.v+2;}
      if(pl&&v.lane!==pl){want=dRel!==null&&dRel>-(gapL()+10)?P.v-4:P.v-0.3;if(dRel!==null&&dRel<-(gapL()+9)){const side=pl.idx>v.lane.idx?1:-1;if(v.lane.lineTo(side,s2)!=='yellow'&&v.lane.kind==='main')toLane(pl);}}
      else if(pl&&v.lane===pl&&gap!==null&&gap>0)want=P.v+clamp((gap-12)*0.5,-6,5);}
    else if(ph===5){// プレイヤーがPAへ：近くの後ろにいればついていく
      if(!follow&&dRel!==null&&dRel<0&&dRel>-90&&onR){follow=true;}
      if(follow){if(onR&&v.lane.kind!=='decel'){const dec=r.patches.find(q=>q.kind==='decel'&&q.pid==='pa');if(dec&&sA>dec.s0+15&&sA<dec.s1-25){if(v.lane.idx>0)toLane(r.lanesF[0]);if(v.lane.idx===0)toLane(dec);}else if(dec&&sA>=dec.s1-25){follow=false;}}
        if(follow){const stopX=pp?(pp.road===r?pp.s:paX(pp.road,pp.s)):null;const myX=onR?sA:paX(v.lane.road,sA);
          if(stopX!==null&&myX!==null){const room=stopX-myX-(pp&&pp.lot?2:gapL()+6);want=Math.min(P.v+6,Math.sqrt(2*2.2*Math.max(0,room)));}
          if(v.lane.road.def.paRoad)want=Math.min(want,(v.lane.road.id==='PA_AISLE'?18:30)/KMH);}}
      if(!follow)want=25;}
    if(ph<5&&dRel===null)want=Math.max(want,P.v);
    v.v+=clamp(want-v.v,-7*dt,3.5*dt);v.v=Math.max(0,v.v);v.brake=want<v.v-0.3||v.v<0.5;
    if(ph!==1)v.d*=Math.max(0,1-dt*0.9);
    v.u+=v.v*dt;if(v.u>=v.lane.len){const nx=v.lane.next[0];if(nx){v.place(nx.lane,v.u-v.lane.len);}else{v.hidden=true;v.m.grp.visible=false;v.u=v.lane.len;v.v=0;}}
    v.pose();const fl=ph===1&&(t%0.6)<0.3;setCarLights(v.m,{head:fl||ENV.dark,brake:v.brake,turnR:ph===2&&v.lane===pl&&t<3,turnL:false,blink:(performance.now()%800)<400});};
  return evAdd(e);}
function aoriCard(followed){choiceCard({eyebrow:'あおり運転を受けて PA に避難しました',title:followed?'相手の車も近くに止まりました':'PAに止まりました',steps:[
  {q:followed?'相手の車がすぐ近くに止まり、運転者がこちらに来るかもしれません。どうしますか？':'相手の車がPAに入ってくるかもしれません。どうしますか？',opts:[
    {t:'ドアをロックし、窓を開けずに、車の外に出ないで待つ',ok:true,why:'危険を感じたら車の外に出ず、ドアをロックして、警察官が到着するまで窓を開けずに対応します。',src:'警察庁「あおり運転」・広島県警'},
    {t:'車を降りて、相手に直接注意しに行く',ok:false,why:'車の外に出るのは危険です。警察庁は、車外に出ることなく110番通報するよう呼びかけています。',src:'警察庁「あおり運転」'},
    {t:'窓を少し開けて、相手と話し合う',ok:false,why:'窓は開けずに、警察官の到着を待ちます。',src:'広島県警'}]},
  {q:'通報は？',opts:[
    {t:'ためらわずに110番通報する',ok:true,why:'妨害運転を受けたら、安全な場所に避難して、車の外に出ることなく、ためらわずに110番通報します。運転中は自分で電話をかけず、同乗者がいれば通報を頼みます。',src:'警察庁「あおり運転」・首都高速道路株式会社'},
    {t:'相手がいなくなるまで待って、通報はしない',ok:false,why:'ためらわずに110番通報することが呼びかけられています。'},
    {t:'追いかけていって、相手の車のナンバーを確かめる',ok:false,why:'挑発に乗ったり、仕返しの運転をしたりしてはいけません。',src:'首都高速道路株式会社'}]},
  {q:'ドライブレコーダーの映像は？',opts:[
    {t:'加工や消去をせずに保存し、警察官に伝える',ok:true,why:'映像は加工・消去せずに保存しておきます。妨害運転の捜査に役立ちます。',src:'広島県警・警察庁'},
    {t:'怖かったので、すぐに消去する',ok:false,why:'映像は加工・消去せずに保存します。',src:'広島県警'}]}]},
  (res)=>{if(res.miss)violate('aoriNG',`まちがい ${res.miss}回`,999);else praise('aoriOK');finishStage({note:'あおり運転への対処を確認しました'});});}

