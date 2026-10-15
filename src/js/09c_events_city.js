// ===== 09c_events_city.js : 都会のできごと（路線バス・タクシー・荷さばきの車・夜の横断者・スクランブルの人波） =====
// 後ろから路線バス（バス優先通行帯）
function evBusBehind(dist=75){const p=PLAYER;const l=(p.lanesNow&&p.lanesNow.find(x=>x.kind==='main'))||null;if(!l)return null;const l0=l.road.lanes(l.dir)[0];if(!l0||!l0.bus)return null;
  const uP=l0.uOf(p.loc.s);let L0=l0,u0=uP-dist;if(u0<4){const pr=l0.prev.find(e=>e.conn);if(pr){L0=pr.conn.from;u0=Math.max(3,L0.len-(dist-uP));}else u0=3;}
  const b=new Veh('car','bus');b.place(L0,u0);b.v=Math.max(9,p.v+2);b.vpref=1.08;b.evt=true;b.forceTurn='S';VEH.push(b);
  return evAdd({b,update(){if(b.hidden||Math.hypot(b.x-p.x,b.z-p.z)>260)this.done=true;},cleanup(){b.remove();}});}
// 荷さばきの車（ハザードをつけて左に止まっているトラック）
function evDeliveryTruck(r,s,dir){const o=parkCar(r,s,dir,'truck',{hazard:true,inset:0.3,label:'止まっているトラックに衝突しました。'});
  const e={update(){const d=distOnRoad(r,s,dir);if(d!==null&&d<90&&d>20&&!this.w){this.w=1;coach('前方の左の車線に、荷物の積み下ろしで止まっているトラック。早めに右の合図を出し、右後方を確認して隣の車線へ（3秒前の合図）。',7,1);}
      if(d!==null&&d<-15&&!this.passed){this.passed=1;if(!J.log.some(x=>x.id==='laneBlink'&&J.t-x.t<20))praise('truckOK');}if(this.passed&&(d===null||d<-200))this.done=true;},cleanup(){removeObstacle(o);},
    lesson:'止まっている車を避けるときは、3秒前に合図を出し、ミラーと目で後ろを確かめてから進路を変えます。'};STAGE.lessonHint=e.lesson;return evAdd(e);}
// 客を見つけたタクシーが、前で急に左に寄って止まる
// opt.min：この先の道路が最低これだけ残っているときだけ（既定 72m）。opt.ahead：タクシーを置く前方の距離（既定 30m）
function evTaxiStop(opt={}){const p=PLAYER;const l=(p.lanesNow&&p.lanesNow.find(x=>x.kind==='main'))||null;if(!l)return null;const uP=l.uOf(p.loc.s);if(l.len-uP<(opt.min||72))return null;
  const tx=new Veh('car','taxi');tx.place(l,uP+(opt.ahead||30));tx.v=Math.max(p.v,9);tx.evt=true;VEH.push(tx);let t=0,mode=0;const l0=l.road.lanes(l.dir)[0];
  tx.script=(v,dt)=>{t+=dt;const gap=Math.hypot(v.x-PLAYER.x,v.z-PLAYER.z);
    if(mode===0){v.v+=clamp(Math.max(PLAYER.v,8)-v.v,-1,1)*dt;if((t>3&&gap<28)||t>(opt.wait||6)){mode=1;t=0;danger();if(v.lane!==l0){const s=v.lane.sOf(v.u);const tOld=v.lane.tAt(s)+v.d*v.lane.dir;v.lane=l0;v.u=l0.uOf(s);v.d=(tOld-l0.tAt(s))*l0.dir;}}}
    else if(mode===1){v.v=Math.max(0,v.v-5.2*dt);v.d+=clamp(-(l0.w/2-v.W/2-0.15)-v.d,-1.4*dt,1.4*dt);danger();if(v.v===0){mode=2;t=0;}}
    else if(mode===2&&t>9){mode=3;t=0;}
    else if(mode===3){v.v=Math.min(8,v.v+1.2*dt);v.d+=clamp(0-v.d,-0.6*dt,0.6*dt);if(t>6){v.script=null;}}
    v.brake=mode===1||mode===2;v.u+=v.v*dt;if(v.u>=v.lane.len){v.script=null;v.u=v.lane.len-0.1;}v.pose();
    const bl=(performance.now()%800)<400;setCarLights(v.m,{brake:v.brake,turnL:mode===1||mode===2,turnR:mode===2||mode===3,blink:bl});};
  coach('前を走るタクシーは、客を見つけると急に左に寄って止まることがあります。車間距離を十分に。',5);
  return evAdd({update(){const P=PLAYER;if(!tx.script&&Math.hypot(tx.x-P.x,tx.z-P.z)>150)this.done=true;
      if(mode>=2&&!this.pr&&!STAGE.over){const f=fwd(tx.h);const ahead=(P.x-tx.x)*f.x+(P.z-tx.z)*f.z;if(ahead>tx.L/2+P.L/2+1||mode===3){this.pr=1;praise('taxiOK');}}
      if(tx.hidden)this.done=true;},cleanup(){tx.remove();}});}
// 夜：横断歩道のない所を渡る歩行者（暗い服）
// opt.kind：歩行者の種類（既定 suit）。opt.lesson：結果画面の解説。opt.praise：うまくかわしたときの key。opt.spd：歩く速さ（m/s）
function evJaywalker(r,s,dir,opt={}){const ped=new Ped(opt.kind||'suit');PEDS.push(ped);ped.reserved=true;const from=edgePos(r,s,-dir,-0.8),to=edgePos(r,s,dir,-1.2);ped.set(from.x,from.z);ped.y=from.y+0.15;ped.show(false);
  const e={ph:0,update(dt){const d0=distOnRoad(r,s,dir);const d=d0===null?null:d0-PLAYER.L/2;
      if(this.ph===0&&d!==null&&d<70&&d>0){this.ph=1;ped.show(true);ped.mode='script';ped.v=0;ped.h=headingOf(to.x-from.x,to.z-from.z);}
      if(this.ph===1&&d!==null&&d<(PLAYER.v>8?42:30)&&d>0){this.ph=2;danger();ped.script=(k,dt2)=>{k.y=r.yAt(s);if(k.stepTo(to.x,to.z,opt.spd||1.35,dt2)){k.show(false);e.ph=3;}};}
      if(this.ph===2)danger();
      if(this.ph===3){if(!this.pr){this.pr=1;if(!STAGE.over)praise(opt.praise||'nightPedOK');}const dd=distOnRoad(r,s,dir);if(dd===null||dd<-30)this.done=true;}},
    cleanup(){ped.show(false);ped.reserved=false;},lesson:opt.lesson||'夜は、暗い服の歩行者を見つけるのが遅れがちです。ライトの届く範囲で止まれる速度で走り、横断歩道のない所を渡る人もいると考えましょう。'};
  STAGE.lessonHint=e.lesson;return evAdd(e);}
// ---- スクランブル交差点の人波：歩行者用の青になる少し前から、角に人が集まる ----
function scrambleTick(dt){const p=PLAYER;if(!p||!STAGE.running)return;for(const sg of SIGS.values()){if(!sg.def.scramble)continue;const n=sg.n;if(Math.hypot(n.x-p.x,n.z-p.z)>230)continue;
    const toPed=sigTimeTo(sg,'PED','PG');sg.crowdT=(sg.crowdT||0)-dt;
    if(toPed<9&&toPed>0&&sg.crowdT<=0){sg.crowdT=0.22;const Xs=XWALKS.filter(X=>X.node===n);const X=pick(Xs);if(X&&X.peds.length<(X.diag?14:9))spawnCrosser(X,R()<0.5?0:1,pick(['adult','adult','suit','student','student','old','kid']));}}}
// 信号が、あるグループ・表示になるまでの時間
function sigTimeTo(sg,G,P){let t=sg.cur[2]-sg.t;let i=sg.i;for(let k=0;k<sg.seq.length;k++){i=(i+1)%sg.seq.length;const q=sg.seq[i];if(q[0]===G&&q[1]===P)return t;t+=q[2];}return 999;}
// 商店街：道の真ん中も歩く人たち
function cityPedsExtra(){for(const r of NET.roads){if(!r.def.pedOnly)continue;for(const off of[-1.6,-0.4,0.8,2.0])WALKS.push({r,a:3,b:r.len-3,t:()=>off,res:true,side:off<0?-1:1,inward:0,ped:true});}}
function spawnStreetCrowd(n){const W=WALKS.filter(w=>w.ped);if(!W.length)return;for(let i=0;i<n;i++){const w=pick(W);const s=w.a+R()*(w.b-w.a);const P=w.r.pt(s,w.t(s));const p=new Ped(pick(['adult','adult','suit','student','old','kid']));
    p.set(P.x,P.z);p.y=P.y;p.mode='walk';p.w=w;p.ws=s;p.dirW=R()<0.5?1:-1;p.onWalk=false;p.spd=0.9+R()*0.4;p.show(true);PEDS.push(p);}}
// 路上に止まっている車のハザード
function parkedHazards(){const bl=(performance.now()%800)<400;for(const o of NET.obst)if(o.model&&o.model.hz&&o.model.lights)setCarLights(o.model,{turnL:true,turnR:true,blink:bl});}
