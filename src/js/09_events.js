// ===== 09_events.js : 突発的なできごと =====
const EVS=[];
function evAdd(e){EVS.push(e);return e;}
function evUpdate(dt){for(const e of EVS)if(!e.done)e.update(dt);for(let i=EVS.length-1;i>=0;i--)if(EVS[i].done&&EVS[i].cleanup!==false){EVS[i].cleanup&&EVS[i].cleanup();EVS.splice(i,1);}}
function evClear(){for(const e of EVS)e.cleanup&&e.cleanup();EVS.length=0;}
// 道路の左端（その向きの）にある位置
function edgePos(r,s,dir,inset){const e=r._edges(dir,s);const tL=dir>0?e.outer-r.sh[0]:e.outer+r.sh[0];const t=tL+dir*inset;const P=r.pt(s,t);return{x:P.x,z:P.z,y:P.y,t,h:dir>0?P.h:wrapA(P.h+Math.PI)};}
// 路上駐車の車
function parkCar(r,s,dir,type,opt={}){const m=makeCar(type||pick(['kei','compact','van']),pick(CARCOL));const P=edgePos(r,s,dir,m.W/2+(opt.inset!==undefined?opt.inset:0.25));
  m.grp.position.set(P.x,P.y,P.z);m.grp.rotation.y=-P.h;scene.add(m.grp);if(opt.hazard)m.hz=true;
  const l0=r.lanes(dir)[0];const o={x:P.x,z:P.z,y:P.y,h:P.h,L:m.L,W:m.W,model:m,parked:true,label:opt.label||'駐車車両に衝突しました。',dLane:l0?(P.t-l0.tC)*dir:0,road:r,s,dir};NET.obst.push(o);return o;}
function removeObstacle(o){scene.remove(o.model.grp);const i=NET.obst.indexOf(o);if(i>=0)NET.obst.splice(i,1);}
// プレイヤーがその道路を dir 方向に走っているときの、地点sまでの距離
function distOnRoad(r,s,dir){const q=PLAYER.loc;if(!q||q.kind!=='road'||q.road!==r)return null;return(s-q.s)*dir;}
function playerOnRoad(r){const q=PLAYER.loc;return!!(q&&q.kind==='road'&&q.road===r);}
// 1) 駐車車両のかげから子どもの飛び出し
function evChildRunOut(r,s,dir){const car=parkCar(r,s,dir);const crossS=s+dir*(car.L/2+0.6);
  const kid=new Ped('kid');PEDS.push(kid);kid.reserved=true;const st=edgePos(r,crossS,dir,-0.35);kid.set(st.x,st.z);kid.y=st.y;kid.show(false);
  const ball=new THREE.Mesh(GEO.sph,lambert(0xe8442e));ball.scale.setScalar(0.11);ball.visible=false;scene.add(ball);let bx=0;
  const far=edgePos(r,crossS,-dir,-0.6);
  const e={phase:0,t:0,update(dt){const d0=distOnRoad(r,crossS,dir);const d=d0===null?null:d0-PLAYER.L/2;
      if(this.phase===0){if(!this.vis&&d!==null&&d<60&&d>0){this.vis=1;kid.show(true);kid.mode='script';kid.v=0;kid.h=headingOf(far.x-st.x,far.z-st.z);}
        const trig=PLAYER.v<2.8?11:17;if(d!==null&&d<trig&&d>0&&PLAYER.v>0.5){this.phase=1;this.t=0;danger();ball.visible=true;bx=0;SFX.ball&&SFX.ball();}}
      else if(this.phase===1||this.phase===2){this.t+=dt;danger();bx+=dt*4.2;const bp=edgePos(r,crossS+dir*0.8,dir,0.2+bx);ball.position.set(bp.x,bp.y+0.11,bp.z);ball.rotation.x+=dt*8;
        if(this.phase===1&&this.t>0.55){kid.script=(k,dt2)=>{if(k.stepTo(far.x,far.z,2.9,dt2)){k.show(false);e.phase=3;}};this.phase=2;}
        const[lo,hi]=r.tRange(crossS);if(bx>hi-lo+1)ball.visible=false;}
      else if(this.phase===3){if(!this.praised){this.praised=1;if(!STAGE.over)praise('dodge');}const dd=distOnRoad(r,s,dir);if(dd===null||dd<-30)this.done=true;}},
    cleanup(){removeObstacle(car);scene.remove(ball);kid.show(false);kid.reserved=false;},lesson:'駐車車両のかげは死角です。「子どもが飛び出すかもしれない」と考え、速度を落として間隔をあけて通りましょう。'};
  STAGE.lessonHint=e.lesson;return evAdd(e);}
// 2) 前方の自転車
function evBike(r,s,dir,wobble){const l=r.lanes(dir)[0];if(!l)return;const b=new Veh('bike','bike');b.place(l,l.uOf(s));b.vpref=3.9;b.v=3.9;b.evt=true;VEH.push(b);
  const e={update(dt){const d=Math.hypot(b.x-PLAYER.x,b.z-PLAYER.z);if(wobble&&!this.w&&d<16){this.w=1;b.wob=1.4;danger();}
      if(b.wob>0){b.wob-=dt;b.bikeD=-(l.w/2-0.55)+0.6*Math.sin((1.4-b.wob)*Math.PI/1.4);}else b.bikeD=undefined;if(d>160&&this.seen)this.done=true;if(d<80)this.seen=1;if(b.hidden)this.done=true;},cleanup(){b.remove();}};return evAdd(e);}
// 3) 横断歩道で待つ歩行者
function evPedWaiting(X,kind,both){if(!X)return null;const e={sp:0,update(){if(this.sp){if(!X.peds.length){X.lock=false;this.done=true;}return;}
      const dd=Math.hypot(X.a.x-PLAYER.x,X.a.z-PLAYER.z);if(dd<75){this.sp=1;X.lock=true;const p=spawnCrosser(X,R()<0.5?0:1,kind||'old');if(p){p.waitT=1;if(both){const q=spawnCrosser(X,p.from?0:1,'kid');if(q)q.waitT=1;}}}},
    cleanup(){X.lock=false;}};return evAdd(e);}
// 4) 救急車（後ろから）
function evAmbulance(){const p=PLAYER;const l=(p.lanesNow&&p.lanesNow[0])||null;if(!l)return null;const uP=l.uOf(p.loc.s);
  let L0=l,u0=uP-110;if(u0<5){const pr=l.prev.find(e=>e.lane||e.conn);const pl=pr?(pr.lane||pr.conn.from):null;if(pl){L0=pl;u0=Math.max(3,pl.len-(110-uP));}else u0=3;}
  const a=new Veh('car','amb');a.place(L0,u0);a.v=13;a.ambV=16;a.active=true;a.evt=true;a.noLC=true;VEH.push(a);AMB=a;SFX.siren&&SFX.siren(true);
  coach('救急車のサイレンが近づいています。左に寄せて進路を譲りましょう。交差点付近なら交差点を避けて止まります。',7);
  const e={t:0,update(dt){this.t+=dt;setCarLights(a.m,{beacon:true,blink:(performance.now()%500)<250,head:true});const fa=fwd(a.h);const dx=PLAYER.x-a.x,dz=PLAYER.z-a.z;const ahead=dx*fa.x+dz*fa.z;
      if(!this.passed&&ahead<-8){this.passed=1;if(!J.log.some(x=>x.id==='emerg')&&J.ambYield)praise('emergOK');coach('救急車が通過しました。周りを確認してから発進しましょう。',5);}
      if(this.t>70||(this.passed&&ahead<-150)||a.hidden){this.done=true;}},cleanup(){a.active=false;AMB=null;SFX.siren&&SFX.siren(false);a.remove();}};return evAdd(e);}
// 5) 地震（緊急地震速報）
function evQuake(){const el=document.getElementById('eew');el.innerHTML='緊急地震速報<small>強い揺れに警戒してください</small>';el.hidden=false;SFX.eew&&SFX.eew();
  coach('緊急地震速報です。ハザードランプをつけ、急ブレーキを避けて緩やかに減速しましょう。',8);J.quake=true;
  const e={t:0,stage:0,update(dt){this.t+=dt;const p=PLAYER;if(p.hazard&&!this.hz){this.hz=1;}
      if(this.t>6&&this.stage===0){this.stage=1;ENV.shake=0.2;coach('揺れています。できるだけ安全な方法で道路の左側に止めます。交差点や踏切の上は避けます。',8);}
      if(this.stage===1){ENV.shake=Math.min(1,ENV.shake+dt*0.4);if(this.t>12)for(const s of SIGS.values())s.dark=true;
        if(p.v<0.05&&this.t>8&&!this.judged){this.judged=1;const q=p.loc;let ok=q&&q.kind==='road';let why='';
          if(!ok)why='交差点の中で止まっています。';else{const gap=leftEdgeGap(p);if(gap>1.1){ok=false;why=`道路の左端まで約${gap.toFixed(1)}mあります。`;}
            if(q.road.feats.some(f=>f.s!==undefined&&Math.abs(q.s-f.s)<(f.type==='rail'?12:5))){ok=false;why='踏切・横断歩道の上やすぐ近くは避けます。';}}
          if(ok)praise('quakeOK');else violate('quakeStop',why);if(!this.hz)toast('info','ハザードランプ',0,'周りの車に知らせるため、ハザードランプをつけましょう（{hz}）。');
          this.stage=2;this.t2=0;}
        if(this.t>40&&!this.judged){this.judged=1;violate('quakeStop','揺れの間に安全な場所へ止まれませんでした。');this.stage=2;this.t2=0;}}
      if(this.stage===2){this.t2+=dt;ENV.shake=Math.max(0,ENV.shake-dt*0.25);if(this.t2>4&&!this.quiz){this.quiz=1;el.hidden=true;quakeQuiz(()=>{this.done=true;});}}},
    cleanup(){ENV.shake=0;el.hidden=true;J.quake=false;}};return evAdd(e);}
// 6) 踏切に列車
function evTrain(xing,eta){const e={update(){if(this.go)return;const p=PLAYER;if(Math.hypot(p.x-xing.x,p.z-xing.z)<130&&Math.abs(TRAIN.rail.ax==='x'?p.x-xing.x:p.z-xing.z)<8){this.go=1;TRAIN.active=false;
      TRAIN.dispatch(R()<0.5?1:-1,TRAIN.rail.ax==='x'?xing.x:xing.z,eta||21);this.done=true;}}};return evAdd(e);}
// 7) 踏切の先が詰まっている
function evRailJam(r,f,dir){const l=r.lanes(dir)[0];if(!l)return;const base=l.uOf(f.s+dir*5);const cars=[];
  for(let i=0;i<3;i++){const v=new Veh('car',pick(['kei','compact','van']));v.place(l,base+3.0+i*5.6+2.4);v.v=0;v.evt=true;v.script=(vv,dt)=>{vv.brake=true;setCarLights(vv.m,{brake:true});};VEH.push(v);cars.push(v);}
  // プレイヤー（または前の車）が踏切の手前で待っている間に、先の車が進む
  const e={t:0,update(dt){const p=PLAYER;const d=distOnRoad(r,f.s-dir*8,dir);const near=d!==null&&d>-1.5&&d<45&&p.v<0.3;if(near)this.t+=dt;
      if(this.t>5&&!this.rel){this.rel=1;cars.forEach(c=>c.script=null);coach('前の車が進みました。踏切の先に自分の車が入れる余地を確認してから進みます。',5);}
      if(this.rel&&cars.every(c=>c.hidden||Math.hypot(c.x-p.x,c.z-p.z)>120))this.done=true;},cleanup(){cars.forEach(c=>c.remove());}};return evAdd(e);}
// 8) 前の車の急ブレーキ
function evSuddenBrake(){const p=PLAYER;const l=(p.lanesNow&&p.lanesNow[0])||null;if(!l)return null;const uP=l.uOf(p.loc.s);if(l.len-uP<90)return null;
  const v=new Veh('car','compact');v.place(l,uP+28);v.v=Math.max(p.v,8);v.evt=true;VEH.push(v);let t=0,mode=0;
  v.script=(vv,dt)=>{t+=dt;if(mode===0){vv.v+=clamp((Math.max(PLAYER.v,8.3)-vv.v),-1,1)*dt;const gap=Math.hypot(vv.x-PLAYER.x,vv.z-PLAYER.z);if(t>5&&gap<32){mode=1;danger();}}
    else if(mode===1){vv.v=Math.max(0,vv.v-6.5*dt);danger();if(vv.v===0){mode=2;t=0;}}else if(mode===2&&t>3){vv.script=null;}
    vv.brake=mode>=1;vv.u+=vv.v*dt;if(vv.u>=vv.lane.len){vv.script=null;}vv.pose();setCarLights(vv.m,{brake:vv.brake});};
  coach('前の車との車間距離に注意しましょう。',4);return evAdd({update(){if(!v.script&&Math.hypot(v.x-PLAYER.x,v.z-PLAYER.z)>200)this.done=true;if(v.hidden)this.done=true;},cleanup(){v.remove();}});}
// 9) スマホの通知
function evPhone(){const el=document.getElementById('phone');el.innerHTML='<b>メッセージ ・ たった今</b>いまどこ？ 写真見て！';el.hidden=false;SFX.notify&&SFX.notify();let opened=false;
  const on=()=>{if(opened)return;opened=true;if(Math.abs(PLAYER.v)>0.3)violate('phone','走行中に通知を開きました。');else toast('info','停止中の確認',0,'止まっている間の確認は違反になりませんが、発進前に周りを見直しましょう。');el.hidden=true;};
  el.onclick=on;const e={t:0,mv:0,update(dt){this.t+=dt;if(Math.abs(PLAYER.v)>1)this.mv+=dt;if(this.t>9){el.hidden=true;if(!opened&&this.mv>3)praise('phoneOK');this.done=true;}},cleanup(){el.hidden=true;el.onclick=null;}};return evAdd(e);}
// 10) 天候の急変
function evWeather(mode){setEnv(mode);coach(mode==='rain'?'急に強い雨になりました。視界が悪いのでライトをつけ（{lt}）、速度を落とし車間を長めに。路面が滑りやすくなっています。':'霧で視界が悪くなりました。視界が50m以下の暗い場所ではライトが必要です（{lt}）。',8);SFX.rain&&SFX.rain(mode==='rain');return null;}
// 11) 黄信号のジレンマ
function evYellow(n,leg){const sig=SIGS.get(n.k);const G=grpOf(leg);const e={update(){const A=J.A;const mine=A&&A.n===n&&A.L===leg;
      if(mine&&A.dLine<130&&sig.stateFor(leg)!=='G'&&A.dLine>34)sig.setPhase(G,'G',2);
      if(mine&&A.dLine<34&&A.dLine>22&&PLAYER.v>6){sig.setPhase(G,'Y',0);this.done=true;}if(mine&&A.dLine<15)this.done=true;}};return evAdd(e);}
// 12) 左折時の巻き込み（後ろから自転車）
function evLeftHook(n,leg){const e={update(){const A=J.A;if(this.sp||!A||A.n!==n||A.L!==leg)return;if(A.dEdge<45&&A.dEdge>25){this.sp=1;const l=A.road.lanes(A.dir)[0];const uP=l.uOf(PLAYER.loc.s);
      const b=new Veh('bike','bike');b.place(l,Math.max(1,uP-14));b.vpref=5.2;b.v=5.2;b.evt=true;b.forceTurn='S';VEH.push(b);this.b=b;coach('左折の前は、左後方から来る自転車やバイクに注意。ミラーと目視で確認しましょう。',6);}
      if(this.b&&(this.b.hidden||Math.hypot(this.b.x-PLAYER.x,this.b.z-PLAYER.z)>150))this.done=true;},cleanup(){if(this.b)this.b.remove();}};return evAdd(e);}
// 13) 右折時の対向車
function evOncoming(n,leg){const e={update(){const A=J.A;if(this.sp||!A||A.n!==n||A.L!==leg)return;if(A.dEdge<70){this.sp=1;const opp=OPP[leg];const eo=n.legs[opp];if(!eo)return;
      const r=eo.road;const dir=eo.end==='end'?1:-1;const l=r.lanes(dir)[r.lanes(dir).length-1];this.cars=[];
      for(const off of[22,40,58]){const v=new Veh('car',pick(['compact','sedan','van']));v.place(l,Math.max(2,l.len-off-30));v.v=9;v.forceTurn='S';v.evt=true;VEH.push(v);this.cars.push(v);}}
      if(this.cars&&this.cars.every(c=>c.hidden||Math.hypot(c.x-PLAYER.x,c.z-PLAYER.z)>160))this.done=true;},cleanup(){(this.cars||[]).forEach(c=>c.remove());}};return evAdd(e);}
// 14) 道路の端を歩く子どもたち
function evKids(r,s0,s1,dir){const ps=[];for(let i=0;i<3;i++){const p=new Ped('kid');PEDS.push(p);const inset=0.35+(i%2)*0.35;const w={r,a:Math.min(s0,s1),b:Math.max(s0,s1),t:(s)=>edgePos(r,s,dir,inset).t,res:true,inward:dir};
    // 歩道のない道路では、歩行者は右側端を通行する（第10条第1項）→ 車から見ると左端を、こちらに向かって歩いてくる
    const s=s0+(s1-s0)*(0.3+i*0.12);const P=r.pt(s,w.t(s));p.set(P.x,P.z);p.y=P.y;p.mode='walk';p.w=w;p.ws=s;p.dirW=-dir;p.spd=1.0+i*0.08;p.onWalk=false;p.show(true);ps.push(p);}
  return evAdd({update(){},cleanup(){ps.forEach(p=>p.show(false));}});}

