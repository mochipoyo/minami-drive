// ===== 08c_judge.js : 高速道路のルール =====
function expCheck(p,dt){const r=J.road;
  // トンネル（暗いトンネルの中はライト：施行令第19条）
  if(r&&r.tunnels.some(t=>J.s>t.s0+25&&J.s<t.s1)&&!p.lights&&p.v>1){J.tunT+=dt;if(J.tunT>3)violate('tunnelLight','',30);}else J.tunT=0;
  // ETCレーン（NEXCOの案内：20km/h以下）
  for(const g of(NET.map&&NET.map.etc)||[]){if(Math.hypot(p.x-g.x,p.z-g.z)<g.r){if(Math.abs(p.v)*KMH>21.5&&!J.expo['etc'+g.id]){J.expo['etc'+g.id]=1;violate('etcSpeed',`約${Math.round(Math.abs(p.v)*KMH)}km/h`,60);}
      if(!J.expo['etcok'+g.id]&&Math.hypot(p.x-g.x,p.z-g.z)<3&&Math.abs(p.v)*KMH<=21.5){J.expo['etcok'+g.id]=1;praise('etcOK');}}}
  if(!r||r.type!=='EXP'||!J.dir)return;const l=J.lane;const kmh=Math.abs(p.v)*KMH;const emer=STAGE.emergency||J.quake;
  if(l&&l.kind==='main'&&l.idx===0){if(J.expo.lane0S===undefined)J.expo.lane0S=J.s;}else if(l&&l.kind==='main')J.expo.lane0S=undefined;
  // 路肩の走行
  if(J.q&&J.q.band==='shoulder'&&kmh>10&&!emer){J.shT+=dt;if(J.shT>2)violate('shoulder','',20);}else J.shT=0;
  // 最低速度
  if(l&&l.kind==='main'&&kmh<50&&J.started){const lg=playerLeader(p,90);const ob=obstAhead({lane:l,u:l.uOf(J.s),L:p.L},120);const jam=(lg.obj&&lg.vl*KMH<55&&lg.gap<90)||(ob&&ob.gap<110);if(!jam&&!emer&&!p.hazard){J.minT+=dt;if(J.minT>6)violate('minSpeed',`${Math.round(kmh)}km/h`,25);}else J.minT=0;}else J.minT=0;
  // 本線・路肩での停車
  if(kmh<1&&J.started&&!emer){const lg=playerLeader(p,25);const ob=l&&l.kind==='main'?obstAhead({lane:l,u:l.uOf(J.s),L:p.L},30):null;const jam=(lg.obj&&lg.gap<20)||(ob&&ob.gap<25);if(!jam){J.stopT+=dt;if(J.stopT>5)violate('expStop','',30);}}else J.stopT=0;
  // 後退
  if(p.v<-0.5){J.revD=(J.revD||0)+(-p.v)*dt;if(J.revD>2)violate('expBack','',20);}else J.revD=0;
  // 追越車線を走り続ける
  const mains=r.lanes(J.dir);const yLeft=l&&l.lineTo(-1,J.s)==='yellow';// 黄色の線の区間は左へ移れないので数えない
  if(l&&l.kind==='main'&&mains.length>=2&&l.idx===mains.length-1&&!yLeft){J.rightT+=dt;const left=mains[l.idx-1];const u=left.uOf(J.s);let busy=false;
      for(const e of left.agents){if(e.o===p)continue;const du=e.u-u;if(du>-25&&du<100){busy=true;break;}}
      J.rightClearT=busy?0:(J.rightClearT||0)+dt;if(J.rightT>12&&J.rightClearT>6)advise('laneHog','追越しが終わったら、左の車線に戻りましょう。追越車線を走り続けると通行帯違反になります。');
      if(J.rightT>26&&J.rightClearT>14)violate('laneHog','',45);}else{J.rightT=0;J.rightClearT=0;}
  // 左側からの追越し
  const LP=J.leftPass;if(LP){if(J.t-LP.t>15||!l||l!==LP.lane)J.leftPass=null;else{for(const o of LP.cands){if(o.hidden||!o.lane||o.lane!==LP.from)continue;const du=LP.from.uOf(J.s)-o.u;if(du>o.L/2+p.L/2){violate('passLeft','',30);J.leftPass=null;break;}}}}
  // 車間距離（NEXCOの目安：時速の数字くらいのメートル）
  if(kmh>55){const lg=playerLeader(p,160);if(lg.obj&&lg.obj.kind!=='bike'){J.expGap={gap:lg.gap,need:kmh};
      // 割り込まれた直後は、アクセルを戻して車間をあけている間は数えない
      if(lg.obj!==J.tailLd){J.tailLd=lg.obj;J.tailLdT=J.t;J.tailLdGap=lg.gap;}const cutIn=J.t-J.tailLdT<8&&J.tailLdGap<kmh*0.5&&p.a<0.3;
      if(lg.gap<kmh*0.4&&!cutIn){J.tailT+=dt;if(J.tailT>3)violate('tailExp',`約${Math.round(lg.gap)}m（目安 約${Math.round(kmh)}m）`,25);}else J.tailT=0;}else{J.expGap=null;J.tailT=0;}}else J.expGap=null;
  // 出口の準備（あらかじめ出口に続く車線へ）
  if(l&&l.kind==='decel'&&!J.expo.decelJudged){J.expo.decelJudged=true;const s0=J.expo.lane0S;const d=s0===undefined?0:Math.abs(J.s-s0);
    if(d<150)violate('exitPrep',`左の車線に移ってから約${Math.round(d)}mで減速車線に入りました（ゲームでは150m以上前に移っておく）。`);else praise('exitOK');}
  // 加速車線の先で止まる
  if(l&&l.kind==='accel'){const rem=l.len-l.uOf(J.s);if(rem<25&&kmh<15)advise('accelStop','加速車線の終わりで止まると、後ろから追突されるおそれがあります。本線の車の流れを見て、すき間に合わせて加速しましょう。',20);}
  if(J.mergeWatch&&J.t-J.mergeWatch.t>5){if(!J.cool.mergeYield||J.cool.mergeYield<J.mergeWatch.t)praise('mergeOK');J.mergeWatch=null;}}

