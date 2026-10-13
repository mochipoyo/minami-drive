// ===== 08d_judge_city.js : 都会の道路のルール（歩行者用道路・路線バス等優先通行帯） =====
function cityCheck(p,dt){const r=J.road;
  // 歩行者用道路（標識「歩行者等専用」）に入った
  if(r&&r.def.pedOnly&&Math.abs(p.v)>0.5){if(!J.pedRoadDone){J.pedRoadDone=true;violate('pedRoad','');coach('ここは「歩行者等専用」の標識がある歩行者用道路です。車は通行できません。人に注意して、ゆっくり出られる所まで進みましょう。',7,1);}}
  // 路線バス等優先通行帯：後ろから路線バスが来たら速やかに出る（第20条の2第1項）
  const l=J.lane;let bus=null;
  if(l&&l.bus==='prio'&&p.v>0.3){const u=l.uOf(J.s);for(const e of l.agents){const o=e.o;if(o===p||o.type!=='bus'||o.hidden)continue;const du=u-e.u;if(du>0&&du<42){bus=o;break;}}
    const leftSoon=(NAV.turn==='L'&&NAV.turnDist<70)||(J.A&&J.A.dEdge<45&&p.blink==='L');
    if(bus&&!leftSoon){J.busT=(J.busT||0)+dt;J.busSeen=true;
      if(J.busT>1.5&&!J.busHint){J.busHint=1;coach('後ろから路線バスが来ています。ここは「バス優先」の車線です。合図を出し、右後方を確認して、速やかに隣の車線へ移りましょう。',7,1);}
      if(J.busT>10)violate('busLane','後ろの路線バスに進路を譲りませんでした。',30);}
    else J.busT=0;}
  else{if(J.busSeen&&l&&!l.bus&&J.t-J.lastLaneChange.t<4){J.busSeen=false;praise('busOK');}J.busT=0;}}
