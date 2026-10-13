// ===== 12d_park.js : 駐車の練習（みなみ自動車学校のコース・さくらマートの駐車場・まちの通り） =====
// コースの寸法、止める位置の目安、切り返しの数え方などはゲーム独自のものです（実際の教習所・試験場とは異なります）。
MAPS.park={id:'park',name:'みなみ自動車学校・さくらマート',bounds:[-420,-280,420,260],keepOut:[],tile:120,pedCap:90,miniScale:3.0,
  def(){return parkDef();},
  after(){for(const r of NET.roads)townFeatS(r);},
  traffic:{n:9,bikes:2,peds:30,filter:l=>!!l.road.def.street&&!l.road.def.lotRoad,mix:{kei:3,compact:3,sedan:2,van:1.5,suv:1,truck:0.4}},
  signIds:['s30','s40','stop','xwalk','noparking','p_here','tomare','m30','m40','blank'],
  signs(){autoSigns();},
  build(B,wires){buildPark(B,wires);}};
const rectPoly=(b)=>[[b.x0,b.z0],[b.x1,b.z0],[b.x1,b.z1],[b.x0,b.z1]];
// 駐車の課題を始める（STAGE の判定フック）
function parkBegin(task,opt){parkTaskReset(task,opt);STAGE.onContact=parkContact;STAGE.judgeExtra=(dt)=>{parkTaskTick(dt);if(PK.tick&&!STAGE.over)PK.tick(dt);};}
function pkOnce(k,fn){if(PK['_'+k])return;PK['_'+k]=1;fn();}
const PARKPTS={
  slow:'駐車の教習では、ゆっくり走っている間（約9km/h以下）はハンドルが自動では戻りません（指やキーを離しても切った角度のまま）。上からの視点（{view}）にもできます',
  back:'シフトをRにしたら、動き出す前に{lkL}か{lkR}で後ろを直接見る。バックモニター（画面の映像）は補助です'};
STAGES.push(
 {id:'p1',cat:'park',map:'park',name:'方向変換（車庫入れ）',desc:'狭い道の横の車庫にバックで入れ、向きを変えて戻る。後退前の目視・切り返し・脱輪・接触',env:'day',envLabel:'昼・晴れ',startCheck:true,fine:true,traffic:{n:0,bikes:0,peds:0},
  intro:'みなみ自動車学校のコースです。外周を東へ走って、右側の「方向変換」のコース（行き止まりの細い道）に入ります。左側の車庫にバックで入れたら、前進で出て右へ。コースの入口で左折して、来た道を戻り、停止位置に止めます。',
  points:['発進前：ベルト（{belt}）→ シフトD（{gear}）→ 右の合図（{br}）→ 右後方の確認（{lkR}）→ Pブレーキ解除（{pb}）',
    '方向変換のコースに入ったら、道の真ん中あたりを進み、車の後ろの端が車庫の奥側のポール（2本目）と並んだあたりで止まる（ゲームの目安）',
    PARKPTS.back+'。ハンドルを左に切って後退すると、車の後ろが左（車庫の方）へ回り込む',
    '車がまっすぐ車庫に向いたらハンドルを戻し、まっすぐ下がる。車体が全部車庫に入ったら止める（ゲームの判定）',
    'このゲームでは、切り返しは1回目まで減点なし、2回目から1回ごとに減点、4回で中止。縁石に触れると脱輪、ポールに触れると接触',PARKPTS.slow],
  start:['KN1',-292,1],goal:['KN1',-262,-1],way:[],
  setup(){const B=parkBayRect();const poly=rectPoly(B);const n=NET.nodeById.HKJ;const bc={x:(B.x0+B.x1)/2,z:(B.z0+B.z1)/2};
    parkBegin('bay',{good:'bayOK',inside:p=>carInPoly(p,poly)&&Math.abs(wrapA(p.h+Math.PI/2))<0.2,
      zone:p=>Math.abs(p.x-PARK.HK.x)<14&&p.z>PARK.K.z0+2&&p.z<PARK.HK.zEnd+2,
      msgRev:'ゆっくり後退します。ハンドルを左に切ると、車の後ろが左（車庫の方）へ回ります。ミラーと目で、ポール・縁石との間隔を確かめながら。',
      msgDone:'車庫に入りました。前進で出ます。車の前が入口のポールの線まで出たらハンドルを右に切ります。コースの入口では左の合図を出して左折し、停止位置へ戻ります。',
      tick(dt){const p=PLAYER;
        if(!PK.phase&&J.road&&J.road.id==='HK'&&J.dir===1&&p.z-p.L/2>B.z1-2.5)pkOnce('stop',()=>coach('車の後ろの端が、車庫の奥側のポール（2本目）と並んだら止まります。シフトをR（{gear}）にして、後ろを目で確かめて（{lkL}）から、ハンドルを左に切ってゆっくり後退。',10,1));
        if(PK.phase===1&&!PK.done&&p.v<-0.2&&Math.abs(wrapA(p.h+Math.PI/2))<0.3&&p.x>B.x0-1)pkOnce('straight',()=>coach('車がまっすぐになってきました。ハンドルを戻して、まっすぐ下がります。',6,1));
        if(!PK.done&&carInPoly(p,poly)&&Math.abs(p.v)<0.2&&Math.abs(wrapA(p.h-Math.PI/2))<0.6)pkOnce('nose',()=>coach('方向変換は、車庫にバックで入れて向きを変えます。いったん前に出て、やり直しましょう。',7,1));}});
    STAGE.navFn=()=>{const p=PLAYER;const here={x:p.x,z:p.z};
      if(PK.phase<2){if(J.road&&J.road.id==='KN1'&&J.dir===1&&J.A){setNav('R',J.A.dEdge,'方向変換のコースへ右折');NAV.turn='R';NAV.turnDist=J.A.dEdge;NAV.pts=[here,{x:n.x,z:n.z},{x:PARK.HK.x,z:B.z1+3},bc];return true;}
        if(J.road&&J.road.id==='HK'&&J.dir===1&&!PK.phase){const d=(B.z1+0.3)-(p.z-p.L/2);setNav('S',Math.max(0,d),d>0.3?'左の車庫を通り過ぎて止まる':'止まって、シフトをRに');NAV.pts=[here,{x:PARK.HK.x,z:B.z1+2},bc];return true;}
        setNav('L',null,'バックで車庫へ');NAV.pts=[here,bc];return true;}
      if(J.road&&J.road.id==='HK'&&J.dir===-1&&J.A){setNav('L',J.A.dEdge,'コースの入口で左折して、停止位置へ');NAV.turn='L';NAV.turnDist=J.A.dEdge;NAV.pts=[here,{x:n.x,z:n.z},{x:STAGE.goal.x,z:STAGE.goal.z}];return true;}
      if(!J.road){setNav('R',null,'前進で車庫から出て右へ');NAV.pts=[here,{x:n.x,z:n.z}];return true;}
      return false;};}},
 {id:'p2',cat:'park',map:'park',name:'縦列駐車',desc:'道路の左側の枠に、前後のポールの間へバックで入れる。出るときの合図と右後方の確認',env:'day',envLabel:'昼・晴れ',autoReady:true,fine:true,traffic:{n:0,bikes:0,peds:0},
  intro:'コースの南側の道を東へ走り、左側の「縦列駐車」の枠にバックで入れて止めます。止め終えたら、右の合図を出して右後方を確かめ、枠から出て東へ進みます。',
  points:['枠と約1mあけて平行に進み、車の後ろの端が枠の前側（進む方向側）のポールと並ぶくらいで止まる（ゲームの目安）',
    PARKPTS.back+'。ハンドルを左にいっぱい切って後退し、車が45度くらいになったらハンドルをまっすぐに',
    '車の左後ろが枠の奥の線に近づいたら、ハンドルを右にいっぱい。車がまっすぐになったら止める。車体が全部枠に入れば完了（ゲームの判定）',
    '出るときは右の合図（{br}）を出し、右後方を目で確かめて（{lkR}）から発進',
    'このゲームでは、切り返しは1回目まで減点なし、2回目から1回ごとに減点、4回で中止',PARKPTS.slow],
  start:['KS',-300,1],goal:null,way:[],
  setup(){const S=parkSlotRect();const poly=[[S.x0,S.z0],[S.x1,S.z0],[S.x1,S.z1+0.25],[S.x0,S.z1+0.25]];const sc={x:(S.x0+S.x1)/2,z:(S.z0+S.z1)/2};
    parkBegin('slot',{good:'slotOK',inside:p=>carInPoly(p,poly)&&Math.abs(wrapA(p.h-Math.PI/2))<0.14,
      zone:p=>p.x>S.x0-6&&p.x<S.x1+10&&p.z>S.z0-1&&p.z<PARK.K.z1+4,
      msgRev:'ゆっくり後退します。左のミラーで枠の線と後ろのポール、目で後ろを確かめながら。',
      msgDone:'枠の中に止められました。右の合図（{br}）を出し、右後方を目で確かめて（{lkR}）から発進して、枠から出ます。',
      finish:p=>J.road&&J.road.id==='KS'&&J.dir===1&&p.x>S.x1+16,
      tick(dt){const p=PLAYER;
        if(!PK.phase&&J.road&&J.road.id==='KS'&&J.dir===1&&p.x-p.L/2>S.x0-6)pkOnce('stop',()=>coach('枠と約1mあけて進み、車の後ろの端が枠の前側のポールと並ぶくらいで止まります。シフトR（{gear}）、後ろを目で確かめて（{lkL}）から、ハンドルを左にいっぱい切って後退します。',10,1));
        if(PK.phase===1&&!PK.done&&p.v<-0.2&&wrapA(p.h-Math.PI/2)>0.6)pkOnce('half',()=>coach('45度くらいになったら、ハンドルをまっすぐに戻して下がります。左後ろが枠の奥の線に近づいたら、ハンドルを右にいっぱい。',8,1));
        if(PK.phase===2&&!PK.outChecked&&p.v>0.3){PK.outChecked=1;if(p.blink!=='R')violate('startBlink','枠から出るときは、右の合図を出してから発進します。',0);if(!(p.t-p.lastLook.R<8))violate('startLook','枠から出る前に、右後方を目で確かめます（{lkR}）。',0);}}});
    STAGE.navFn=()=>{const p=PLAYER;const here={x:p.x,z:p.z};
      if(PK.phase<2){const d=(S.x1+0.25)-(p.x-p.L/2);const on=J.road&&J.road.id==='KS'&&J.dir===1&&!PK.phase;setNav(on?'S':'L',on?Math.max(0,d):null,on?(d>0.3?'左の縦列駐車の枠（前側のポールまで）':'止まって、シフトをRに'):'バックで枠の中へ');NAV.pts=[here,sc];return true;}
      setNav('S',Math.max(0,S.x1+16-p.x),'右の合図を出して枠から出て、東へ');NAV.pts=[here,{x:S.x1+16,z:PARK.K.z1-1.75}];return true;};}},
 {id:'p3',cat:'park',map:'park',name:'スーパーの駐車場（バック駐車）',desc:'歩道の手前で一時停止。駐車場の中は人と車に注意してゆっくり。両隣に車がある駐車ますにバックで止める',env:'day',envLabel:'昼・晴れ',autoReady:true,fine:true,
  intro:'まちの通りを東へ走って「さくらマート」の駐車場に左折で入り、緑の枠の駐車ますにバックで止めます。駐車場の中では、車の間から人が出てきたり、止まっていた車がバックで出てきたりします。',
  points:['道路の外の駐車場に入るため歩道を横切るときは、歩道に入る直前で一時停止し、歩行者の通行を妨げない（第17条第2項）',
    '駐車場の中は、すぐ止まれる速さで（ゲームでは15km/hを超えると減点）。後退灯（白いランプ）がついた車はバックで出てくる',
    '緑の枠を通り過ぎ、車の後ろの端が枠の先の白線を少し過ぎたあたりで止まる（ゲームの目安）。'+PARKPTS.back,
    'ハンドルを左に切ってゆっくり後退。左右のミラーで両隣の車と白線の間隔を確かめ、車がまっすぐ枠に向いたらハンドルを戻す',
    '枠の中にまっすぐ止まったら、パーキングブレーキ（{pb}）で終了。この教習では切り返しの回数で減点しません',PARKPTS.slow],
  start:['R1',60,1],goal:null,way:[],
  setup(){const T=PARK.target;const poly=[[T.x-1.25,T.za-0.3],[T.x+1.25,T.za-0.3],[T.x+1.25,T.zb+0.05],[T.x-1.25,T.zb+0.05]];STAGE.goal={x:T.x,z:T.z};
    parkBegin('stall',{good:'stallOK',noKiri:true,inside:p=>carInPoly(p,poly)&&Math.abs(wrapA(p.h))<0.12,
      zone:p=>Math.abs(p.x-T.x)<14&&p.z>T.za-9&&p.z<T.zb+2,
      msgRev:'ゆっくり後退します。左右のミラーで両隣の車と白線、目で後ろの人や物を確かめながら。',
      msgDone:'枠の中に止められました。パーキングブレーキ（{pb}）をかけて終わりです。',
      finish:p=>p.pbrake||p.gear==='P',
      tick(dt){p3Tick(dt,poly);}});
    STAGE.navFn=p3Nav;evLotPeople();evWalkPed();evLotPed();evBackingCar();}},
 {id:'p4',cat:'park',map:'park',name:'路上で止めてよい場所',desc:'交差点・横断歩道・バス停・出入口・消火栓・駐車禁止の標識をよけて、道路の左端に沿って止める',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'さくら通り商店会の通りを東へ走ります。パン屋「さくらベーカリー」に寄るため、近くの「止めてよい場所」に車を止めます。左端に寄せて止まり、パーキングブレーキをかけたところで判定します。',
  points:['交差点の側端・横断歩道の前後の側端から5m以内は、駐車も停車もできない（第44条第1項）',
    'バス停の標示板（標示柱）から10m以内は、運行時間中は駐車も停車もできない（第44条第1項）',
    '駐車場などの自動車用の出入口から3m以内、消火栓から5m以内は駐車できない（第45条第1項）。「駐車禁止」の標識がある区間も同じ',
    '駐車するときは道路の左端に沿って止め、右側に3.5m以上の余地を残す（第47条第2項・第45条第2項）',
    '左に寄せるときは左の合図（{bl}）。止まったらパーキングブレーキ（{pb}）'],
  start:['R1',-150,1],goal:null,way:[],
  setup(){STAGE.goal={x:250,z:PARK.R1Z-4};const q=TA('R1',205);if(q)parkCar(q.road,q.s,q.sign,'van',{inset:0.3});const X=XWm('R1',PARK.CROSS);if(X)evPedWaiting(X,'old');
    STAGE.judgeExtra=(dt)=>{const p=PLAYER;if(PK.judged||STAGE.over||!J.started)return;
      if(J.road&&J.road.def.group==='R1'&&J.dir===1&&250-(p.x+p.L/2)<75)pkOnce('near',()=>coach('パン屋さんの近くです。バス停・消火栓・出入口・駐車禁止の標識を見て、止めてよい場所を選びます。左の合図を出して左端に寄せ、止まったらパーキングブレーキ。',10,1));
      if(Math.abs(p.v)<0.05&&(p.pbrake||p.gear==='P')&&J.road&&J.road.def.group==='R1'){PK.stillT=(PK.stillT||0)+dt;if(PK.stillT>0.6){PK.judged=1;p4Judge();}}else PK.stillT=0;};
    STAGE.navFn=()=>{const p=PLAYER;const d=250-(p.x+p.L/2);
      if(J.road&&J.road.def.group==='R1'&&J.dir===1)setNav(d>45?'S':'G',Math.max(0,d),d>45?'さくらベーカリーへ（この先の左側）':'止めてよい場所を選んで、左端に寄せて駐車');
      else setNav('S',null,'さくら通り商店会の通りを東へ');NAV.pts=[{x:p.x,z:p.z},{x:250,z:PARK.R1Z-2}];return true;};}},
);
// ---- スーパーの駐車場 ----
function p3Tick(dt,poly){const p=PLAYER;const q=p.loc;const T=PARK.target;
  const inLot=q&&((q.kind==='lot'&&q.lot.id==='MART')||(q.kind==='road'&&q.road.id==='LIN'));
  lotSpeedTick(dt,inLot);walkStopTick();
  if(!PK.done&&carInPoly(p,poly)&&Math.abs(p.v)<0.2&&Math.abs(wrapA(p.h-Math.PI))<0.6)pkOnce('nose',()=>coach('今回はバックで止める練習です。いったん前に出て、バックで入れ直しましょう。',7,1));
  if(!PK.phase&&q&&q.kind==='lot'&&Math.abs(p.z-(T.za-3.5))<3.5&&Math.cos(p.h+Math.PI/2)>0.8&&p.x<T.x+10)pkOnce('aisle',()=>coach('緑の枠を通り過ぎ、車の後ろの端が枠の先の白線を少し過ぎたら止まります。シフトR、後ろを目で確かめてから、ハンドルを左に切ってゆっくり後退。',10,1));}
// 駐車場の中の速度（ゲーム独自の目安：15km/h）
function lotSpeedTick(dt,inLot){const p=PLAYER;if(inLot&&Math.abs(p.v)*KMH>15){PK.spT=(PK.spT||0)+dt;if(PK.spT>2)violate('lotSpeed',`${Math.round(Math.abs(p.v)*KMH)}km/h`,15);}else PK.spT=0;}
// 道路から駐車場へ：歩道に入る直前の一時停止（第17条第2項）
function walkStopTick(){const p=PLAYER;const cs=corners(p.x,p.z,p.h,p.L,p.W);const fz=Math.min(cs[0].z,cs[1].z);const north=Math.cos(p.h)>0.25;const wz=PARK.walkZ;const nearX=Math.abs(p.x-PARK.LINX)<6.5;
  if(nearX&&north&&fz<wz[1]+4&&fz>wz[1]-0.3&&Math.abs(p.v)<0.3)PK.walkStopped=1;
  if(nearX&&north&&!PK.walkJudged&&fz<wz[1]-0.4&&p.v>0.3){PK.walkJudged=1;const ped=PK.walkPed;const block=ped&&ped.vis&&Math.abs(ped.x-PARK.LINX)<5.5;
    if(!PK.walkStopped)violate('walkStop',block?'歩道を歩いている人がいました。':'',0);else if(block)violate('walkStop','歩道の人が通り過ぎるのを待ってから入ります。',0);else praise('walkStopOK');}}
function p3Path(){const T=PARK.target;return[{x:PARK.LINX,z:PARK.LOT.z1-6},{x:200,z:-84},{x:200,z:T.za-3.5},{x:T.x-3.8,z:T.za-3.5}];}
function p3Nav(){const p=PLAYER;const T=PARK.target;const here={x:p.x,z:p.z};const tg={x:T.x,z:T.z};
  if(J.road&&J.road.def.group==='R1'&&J.dir===1){if(p.x<PARK.LINX&&J.A){setNav('L',J.A.dEdge,'さくらマートの駐車場へ左折（歩道の手前で一時停止）');NAV.turn='L';NAV.turnDist=J.A.dEdge;NAV.pts=[here,{x:PARK.LINX,z:PARK.R1Z},...p3Path(),tg];return true;}
    setNav('S',null,'行き過ぎました（一時停止メニューから「最初からやり直す」）');NAV.pts=[];return true;}
  const W=p3Path();if(PK.wi===undefined)PK.wi=0;while(PK.wi<W.length&&Math.hypot(W[PK.wi].x-p.x,W[PK.wi].z-p.z)<7)PK.wi++;
  const d=Math.hypot(T.x-p.x,T.z-p.z);STAGE.atGoal=!!PK.done;
  if(PK.done)setNav('G',0,'パーキングブレーキをかけて終了');else setNav(PK.phase?'G':'S',d,PK.phase?'バックで緑の枠へ':'駐車場の中は徐行。通路を回って緑の枠へ');
  NAV.pts=[here,...W.slice(PK.wi),tg];return true;}
// 店の前を歩く買い物客（景色）
function evLotPeople(){const L=PARK.LOT;const ps=[];const rx=()=>L.x0+8+R()*(L.x1-L.x0-16);
  for(let i=0;i<6;i++){const q=new Ped(pick(['adult','adult','old','kid','suit','student']));PEDS.push(q);q.reserved=true;const z=L.z0-3-R()*3.5;q.set(rx(),z);q.y=0.15;q.show(true);q.mode='script';let tx=rx();
    q.script=(k,dt)=>{if(k.stepTo(tx,z,k.spd*0.75,dt))tx=rx();};ps.push(q);}
  return evAdd({update(){},cleanup(){ps.forEach(q=>{q.show(false);q.reserved=false;});}});}
// 出入口の歩道を歩く人（車は歩道の手前で一時停止して待つ）
function evWalkPed(){const wz=PARK.walkZ;const zc=(wz[0]+wz[1])/2;const q=new Ped('adult');PEDS.push(q);q.reserved=true;const x0=PARK.LINX-11,x1=PARK.LINX+34;q.set(x0,zc);q.y=0.1;q.show(false);PK.walkPed=q;
  return evAdd({update(){const p=PLAYER;if(!this.go){if(J.road&&J.road.def.group==='R1'&&J.dir===1&&p.x>PARK.LINX-42&&p.x<PARK.LINX-12){this.go=1;q.show(true);q.mode='script';q.script=(k,dt)=>{if(k.stepTo(x1,zc,1.25,dt))k.show(false);};}return;}
      if(!q.vis)this.done=true;},cleanup(){q.show(false);q.reserved=false;}});}
// 駐車場：車のかげから出てくる人
function evLotPed(){const z=(PARK.LOT.row[4][1]+PARK.LOT.row[5][0])/2;const q=new Ped(pick(['adult','old']));PEDS.push(q);q.reserved=true;q.set(PARK.LOT.sx1-1.5,z);q.show(false);let ph=0;
  return evAdd({minD:99,update(){const p=PLAYER;
      if(!this.go){if(p.loc&&p.loc.kind==='lot'&&p.x>PARK.LOT.sx1&&p.z>z+5&&p.z<z+26&&Math.cos(p.h)>0.6){this.go=1;danger();q.show(true);q.mode='script';
          q.script=(k,dt)=>{if(!ph){if(k.stepTo(PARK.LOT.x1-1.2,z,1.2,dt))ph=1;}else if(k.stepTo(PARK.LOT.x1-1.2,PARK.LOT.z0+1,1.25,dt))k.show(false);};}return;}
      if(q.vis){const d=Math.hypot(q.x-p.x,q.z-p.z);if(Math.abs(p.v)>0.3)this.minD=Math.min(this.minD,d);if(q.x>p.x+2.5&&!this.judged){this.judged=1;if(this.minD>2.2)praise('lotPedOK');}}
      if(!q.vis)this.done=true;},cleanup(){q.show(false);q.reserved=false;}});}
// 駐車場：止まっていた車がバックで出てくる（後退灯）
function evBackingCar(){const S=PARK.outStall;if(!S)return null;const m=makeCar(pick(['compact','kei','van']),pick(CARCOL));scene.add(m.grp);
  const Rr=4.6,C={x:S.x+Rr,z:S.z};const o={x:S.x,z:S.z,h:0,L:m.L,W:m.W,model:m,label:'バックで出てきた車と衝突しました。'};NET.obst.push(o);
  const put=()=>{m.grp.position.set(o.x,0,o.z);m.grp.rotation.y=-o.h;};put();setCarLights(m,{});
  return evAdd({ph:0,t:0,a:Math.PI,v:0,stopped:false,update(dt){const p=PLAYER;this.t+=dt;
      if(this.ph===0){const ahead=p.x-o.x;if(p.z>S.zb-1&&p.z<S.zb+9&&ahead>7&&ahead<24&&Math.cos(p.h+Math.PI/2)>0.6){this.ph=1;this.t=0;danger();setCarLights(m,{rev:true,brake:true});coach('止まっている車の後退灯（白いランプ）がつきました。バックで出てきます。止まって待ちましょう。',7,1);}return;}
      if(this.ph<=2&&Math.abs(p.v)<0.3)this.stopped=true;
      if(this.ph===1){if(this.t>1.4){this.ph=2;}return;}
      if(this.ph===2){const near=distToOBB(o,p.x,p.z)<p.L/2+1.0;const vt=near?0:1.1;this.v+=clamp(vt-this.v,-3*dt,1.2*dt);this.a-=this.v*dt/Rr;setCarLights(m,{rev:true,brake:this.v<0.2});
        if(this.a<=Math.PI/2){this.a=Math.PI/2;this.ph=3;this.t=0;this.v=0;setCarLights(m,{brake:true});if(this.stopped&&!STAGE.over)praise('lotCarOK');}
        o.x=C.x+Math.cos(this.a)*Rr;o.z=C.z+Math.sin(this.a)*Rr;o.h=this.a+Math.PI;put();return;}
      if(this.ph===3){if(this.t<1.2)return;setCarLights(m,{});this.v=Math.min(2.6,this.v+dt*1.0);o.x-=this.v*dt;o.h=-Math.PI/2;put();
        if(o.x<PARK.LOT.sx0-6||(o.x<PARK.target.x-22&&Math.hypot(o.x-p.x,o.z-p.z)>30)){this.done=true;}}},
    cleanup(){removeObstacle(o);}});}
// ---- 路上の駐車 ----
function p4Judge(){const p=PLAYER;const res=streetParkJudge();
  const sig=p.blink==='L'||(J.lastBlink.side==='L'&&J.t-J.lastBlink.t<25);if(!sig)violate('laneBlink','道路の左端に寄せて止めるときも、前もって左の合図を出します。',0);
  if(res.ok)praise('streetOK');else violate('parkNG',res.res.filter(c=>c.bad).map(c=>c.t).join('／')||res.msg||'',0);
  const far=Math.abs(p.x-250)>70;
  finishStage({checksTitle:'止めた場所の確認（車の前後の端から測ります）',checks:res.res.length?res.res:[{bad:true,t:res.msg||'道路の左側に止めます'}],
    note:far?'パン屋さんから少し離れた場所でした。実際には、目的地の近くで止めてよい場所を探し、なければ駐車場を使います。':null});}
