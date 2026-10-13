// ===== 12g_special.js : 特殊モード（逆走してくる車・横断歩道のない所を急に渡ってくる歩行者・「怒鳴る」ボタン） =====
// この教習（sp1）を始めたときだけ動く。ほかの教習の動き・採点は変えない。
// 共通部分への追加は次の3つだけ：06a の rebuildLaneLists（逆走車を、車体がかかっている車線にも「向かってくる車」として登録）、
// 11a のキー G（怒鳴る）、13_main の startStage（怒鳴るボタンの表示切り替え）。
RULES.spWrong={t:'逆走車への対応（減速不足）',p:10,law:'ゲーム独自の減点（根拠：道路交通法 第70条 安全運転義務・NEXCO西日本の案内）',
  x:'前から逆走してくる車に気づいたら、早めに速度を落とし、道路の左に寄せて止まってやり過ごします。危険を防ぐためやむを得ないときは、警音器で知らせることもできます（第54条第2項ただし書き）。'};
RULES.spElder={t:'高齢の歩行者の通行妨害（一時停止・徐行をしない）',p:10,law:'道路交通法 第71条第2号の2（減点の点数はゲーム独自）',
  x:'高齢の歩行者など、通行に支障のある歩行者が通行しているときは、一時停止するか徐行して、その通行を妨げないようにします。横断歩道のない所を渡っているときも同じです。'};
GOOD.spWrongOK='逆走してきた車に気づいて、速度を落としてやり過ごした';
GOOD.spJayOK='横断歩道のない所を急に渡ってきた人に気づいて、速度を落として先に渡らせた';
GOOD.spElderOK='お年寄りが渡っている間、止まって（または徐行して）通行を妨げなかった';
CTL.kb.shout='Gキー';CTL.touch.shout='［怒鳴る］ボタン';
SOURCES.push(['NEXCO西日本：逆走車を見かけたら','https://www.w-nexco.co.jp/safety_drive/highway_rule/reverse/one-way/reverse.html']);
MENU_CATS.push({k:'special',t:'特殊モード',sub:'逆走・突然の横断'});
STAGES.push({id:'sp1',cat:'special',map:'town',special:true,shout:true,name:'逆走車と突然の横断',
  desc:'前から逆走してくる車、横断歩道のない所を急に渡ってくる女性やお年寄りに対処する。この教習だけ「怒鳴る」ボタンが使える',
  env:'day',envLabel:'選べる',envChoice:true,autoReady:true,
  intro:'市道 中央通りを東へ走り、停止位置に止めます。途中で、逆走してくる車や、横断歩道のない所を急に渡ってくる人が現れます。どこで何が起きるかは毎回変わります。時間帯と天気を選んでから始めましょう。',
  points:['前から逆走車が来たら、早めに速度を落とし、左に寄せて止まってやり過ごす。危険を防ぐためやむを得ないときは、ホーン（{hn}）で知らせてもよい（第54条第2項ただし書き）',
    '歩道の人の様子（車道を気にしている・急いでいる）に気を配り、すぐ止まれる速さで。渡ってきたら止まって先に渡らせる（第70条 安全運転義務）',
    'お年寄りなど通行に支障のある歩行者が通行しているときは、一時停止か徐行をして、通行を妨げない（第71条第2号の2）',
    '歩行者にも「近くに横断歩道があればそこを渡る」「車の直前・直後を横断しない」という決まりがある（第12条・第13条）。それでも、急に渡ってくる人がいると考えて運転する',
    '「怒鳴る」ボタン（{shout}）は、この教習だけのおまけ。押しても採点には影響しません'],
  start:['C1',-345,1],goal:['C1',335,1],way:[],
  // はじめは中央通りに車・自転車を置かない（逆走車の場面がほかの車に邪魔されにくいように）。あとから交差点や地図の端から入ってくる
  traffic:{n:18,bikes:4,peds:22,mix:MAPS.town.traffic.mix,filter:l=>l.road.def.group!=='C1'},
  setup(){spSetup();}});
const SP={res:[],hornT:-99};
function spSetup(){SP.res=[];SP.hornT=-99;SHOUT.n=0;shoutHide();spPedVariants();
  STAGE.onAction=(k)=>{if(k==='horn')SP.hornT=J.t;};
  STAGE.finishNote=()=>{const o={};if(SP.res.length){o.checks=SP.res.slice();o.checksTitle='特殊モードで起きたこと';}if(SHOUT.n)o.note=`怒鳴った回数：${SHOUT.n}回（採点には影響しません）`;return o;};
  // 交差点から次の交差点までの4つの区間に、女性の横断・お年寄りの横断・逆走車（第1候補と予備）を割り当てる
  const slots=[[-270,-150],[-150,0],[0,150],[150,270]];const plan=['W','E','X','X'];
  for(let i=plan.length-1;i>0;i--){const j=Math.floor(R()*(i+1));const t=plan[i];plan[i]=plan[j];plan[j]=t;}
  const xs=[];
  slots.forEach(([a,b],i)=>{const mid=TA('C1',(a+b)/2);if(!mid)return;if(plan[i]==='X'){xs.push({r:mid.road,dir:mid.sign,x0:a});return;}
    let x;do{x=a+35+R()*(b-a-70);}while(Math.abs(x+80)<22);// 中央通りの横断歩道（x=-80）のそばは避ける
    const q=TA('C1',x);if(q)spPedCross(q.road,q.s,q.sign,plan[i]==='W'?'woman':'old',R()<0.5?'L':'R',x);});
  spWrongWay(xs);}
// ---- 歩行者（女性）のモデル：この教習を始めたときだけ作る ----
PEDKIND.woman={h:1.6,tops:[0xd9c6b0,0xb84a5a,0x46607e,0xeeeeea,0x7d8f6a],bottoms:[0x2f3142,0x6a5874,0x8a6a54,0x3d4b5c]};
function spWomanGeo(top,skirt,hair,bag){const s=1.6/1.7;const skin=0xe2b996;
  return mergeParts([{g:'box',x:0,y:1.14*s,z:0,sx:0.38*s,sy:0.56*s,sz:0.22*s,c:top},{g:'sph',x:0,y:1.56*s,z:0,sx:0.125*s,sy:0.15*s,sz:0.13*s,c:skin},
    {g:'sph',x:0,y:1.63*s,z:0.02,sx:0.14*s,sy:0.11*s,sz:0.145*s,c:hair},{g:'box',x:0,y:1.45*s,z:0.08*s,sx:0.27*s,sy:0.34*s,sz:0.1*s,c:hair},
    {g:'box',x:-0.24*s,y:1.1*s,z:0,sx:0.09*s,sy:0.52*s,sz:0.11*s,c:top},{g:'box',x:0.24*s,y:1.1*s,z:0,sx:0.09*s,sy:0.52*s,sz:0.11*s,c:top},
    {g:'box',x:0,y:0.8*s,z:0,sx:0.36*s,sy:0.14*s,sz:0.22*s,c:skirt},{g:'box',x:0,y:0.64*s,z:0,sx:0.43*s,sy:0.2*s,sz:0.27*s,c:skirt},
    {g:'box',x:0.3*s,y:0.92*s,z:0.02,sx:0.07*s,sy:0.2*s,sz:0.26*s,c:bag},{g:'box',x:0.27*s,y:1.18*s,z:0.02,sx:0.02,sy:0.36*s,sz:0.02,c:bag}]);}
function spPedVariants(){if(PEDVAR.some(v=>v.kind==='woman'))return;const r=rng(78);const K=PEDKIND.woman;
  for(let i=0;i<3;i++){const bg=spWomanGeo(pick(K.tops,r),pick(K.bottoms,r),pick([0x1a1410,0x3a2a1c,0x5b3a28,0x24201c],r),pick([0x6b4423,0x1f1f22,0xc9a26b,0x8e2f3a],r));
    const lg=legGeo('woman',pick([0xd8b090,0x2b2a30,0xc9a083],r));const cap=4;
    const bodyIM=new THREE.InstancedMesh(bg,MAT.model,cap),legIM=new THREE.InstancedMesh(lg,MAT.model,cap*2);bodyIM.count=0;legIM.count=0;bodyIM.castShadow=true;legIM.castShadow=true;
    bodyIM.frustumCulled=false;legIM.frustumCulled=false;scene.add(bodyIM);scene.add(legIM);PEDVAR.push({kind:'woman',bodyIM,legIM,cap,list:[]});}}
// ---- 道路の横方向の位置 ----
// プレイヤーが dir の向きに走るときの、左（L）・右（R）の歩道の位置（縁石から0.8m）
function spWalkT(r,s,dir,side){const[lo,hi]=r.tRange(s);const L=dir>0?lo-0.8:hi+0.8,Rt=dir>0?hi+0.8:lo-0.8;return side==='L'?L:Rt;}
function spOnRoad(r,s,t){const[lo,hi]=r.tRange(clamp(s,0,r.len));return t>lo-0.05&&t<hi+0.05;}
// 位置（x,z）に、止まりきれない距離まで、ほかの車（プレイヤー以外）が来ているか（歩行者はその前に出ない）
function spCarComing(r,sLine,x,z){const pr=projectOn(r,x,z,sLine);if(!pr)return false;
  for(const o of VEH){if(o.hidden||o.conn||!o.lane||o.lane.road!==r)continue;const so=o.lane.sOf(o.u);const ds=(pr.s-so)*o.lane.dir-o.L/2;// 車の先端からその位置まで
    if(ds<-1||ds>Math.max(10,o.v*1.8))continue;const to=o.lane.tAt(so)+(o.d||0)*o.lane.dir;if(Math.abs(to-pr.t)<o.W/2+0.9)return true;}return false;}
// ---- 横断歩道のない所を急に渡ってくる歩行者（kind：'woman' 女性・'old' お年寄り、side：プレイヤーから見てどちらの歩道から渡り始めるか） ----
function spPedCross(r,s,dir,kind,side,x){const elder=kind==='old';const ped=new Ped(kind);PEDS.push(ped);ped.reserved=true;ped.show(false);
  const tA=spWalkT(r,s,dir,side),tB=spWalkT(r,s,dir,side==='L'?'R':'L');const ds=elder?0:dir*(R()*3-1.5);
  const A=r.pt(s,tA),B=r.pt(s+ds,tB),pre=r.pt(s-dir*6,tA),away=r.pt(s+ds+dir*16,tB),F=r.pt(s,tA+Math.sign(tB-tA)*1.3);// F：車道に出て最初の一歩
  const spd=elder?0.7+R()*0.1:1.95+R()*0.3;
  // 渡り始めるタイミング：プレイヤーの車がその線に着くまでの時間（秒）。何もしないと、ちょうど車の前を横切る
  const tta=elder?(side==='L'?3.3:6.8):(side==='L'?2.0:2.6);
  const who=elder?'お年寄り':'女性';
  const e={sp:{kind:elder?'old':'woman',x,side},ph:0,t:0,minGap:9,vMin:99,passed:false,vPass:0,viol:false,judged:false,
    lesson:elder?'お年寄りは渡るのに時間がかかり、車に気づいていないこともあります。早めに止まって、渡り終えるまで待ちましょう（第71条第2号の2）。':'横断歩道のない所でも、急に渡ってくる人がいます。歩道の人の動きに気を配り、すぐ止まれる速さで走りましょう。',
    update(dt){const p=PLAYER;const d0=distOnRoad(r,s,dir);const d=d0===null?null:d0-p.L/2;// 車の先端から、渡る線まで
      if(this.ph===0){if(d!==null&&d<(elder?100:95)&&d>0){this.ph=1;const st=elder?A:pre;ped.set(st.x,st.z,elder?headingOf(B.x-A.x,B.z-A.z):headingOf(A.x-pre.x,A.z-pre.z));ped.y=st.y+0.15;ped.onWalk=true;ped.mode='script';ped.v=0;ped.show(true);
          ped.script=(k,dt2)=>{if(!elder&&!k.atA){if(k.stepTo(A.x,A.z,1.1,dt2)){k.atA=true;k.v=0;}}k.y=r.yAt(s)+0.15;};}return;}
      if(this.ph===1){if(d===null)return;if(d<0){this.ph=9;return;}// 渡らないまま、車が通り過ぎた
        const v=Math.max(0,p.v);const trig=elder?clamp(v*tta,22,80):Math.max(15,v*tta);
        if(d<trig){if(spCarComing(r,s,F.x,F.z)){if(d<(elder?14:9))this.ph=9;return;}// 最初に渡る車線に、ほかの車がすぐそば：少し待つ（間に合わなければ渡らない）
          this.ph=2;this.vTrig=Math.abs(p.v)*KMH;ped.onWalk=false;STAGE.lessonHint=this.lesson;danger();
          coach(elder?'お年寄りが、横断歩道のない所を渡り始めました。止まって、渡り終えるまで待ちましょう。':'横断歩道のない所を、人が急に渡ってきます！',elder?6:4,1);
          ped.script=(k,dt2)=>spPedStep(k,dt2,B,away,spd,r,s);}return;}
      if(this.ph===2||this.ph===3){this.t+=dt;if(this.ph===2&&ped.arrived){this.ph=3;ped.onWalk=true;}
        const pr=projectOn(r,ped.x,ped.z,s);const onRd=this.ph===2&&!!pr&&spOnRoad(r,pr.s,pr.t);
        if(onRd&&d!==null&&d>-3&&d<70)danger();
        if(d!==null&&!STAGE.over){
          if(onRd){this.minGap=Math.min(this.minGap,distToOBB(p,ped.x,ped.z));if(d>-0.5&&d<45)this.vMin=Math.min(this.vMin,Math.abs(p.v)*KMH);}
          if(!this.passed&&d<=0){this.passed=true;this.vPass=Math.abs(p.v)*KMH;const lat=pr&&J.road===r?Math.abs(pr.t-J.t2):9;
            // お年寄りが道路にいる間に、すぐ近く（横に4.5m以内）を15km/hを超えて通った
            if(elder&&onRd&&this.vPass>15.5&&lat<4.5){this.viol=true;violate('spElder',`お年寄りが道路を渡っている途中に、約${Math.round(this.vPass)}km/hで通過しました（ゲームでは、横に4.5m以内を15km/hを超えて通ると減点）。`,0);}}}
        if(!this.judged&&(this.ph===3||(this.passed&&d!==null&&d<-12))){this.judged=true;spPedJudge(this,elder,who);}}
      // 終わり：車が通り過ぎて十分に離れたら（見えない所で）消す
      if((this.ph===3||this.ph===9)&&(d===null||d<0)&&Math.hypot(ped.x-p.x,ped.z-p.z)>75)this.done=true;},
    cleanup(){ped.show(false);ped.reserved=false;}};
  return evAdd(e);}
// 歩行者の一歩：止まっている車が前をふさいでいたら、その前をよけて通る（動いている車なら待つ）
function spPedStep(k,dt,B,away,spd,r,s){
  if(k.arrived){if(k.stepTo(away.x,away.z,1.1,dt))k.v=0;k.y=r.yAt(s)+0.15;return;}
  const dx=B.x-k.x,dz=B.z-k.z,dd=Math.hypot(dx,dz)||1;const nx=k.x+dx/dd*0.35,nz=k.z+dz/dd*0.35;
  // 次の車線に、止まりきれない距離まで車が来ていたら、その手前（中央線のあたり）で待つ（いま車の前にいるなら、立ち止まらずに渡りきる）
  if(spCarComing(r,s,nx,nz)&&!spCarComing(r,s,k.x,k.z)){k.v=0;return;}
  const bk=pedBlocked(nx,nz,k.R+0.12,k.x,k.z);
  if(bk){k.blockT=(k.blockT||0)+dt;k.v=0;
    if(k.blockT>1.2&&Math.abs(bk.v||0)<0.3){const nx=-dz/dd,nz=dx/dd;const sd=((bk.x-k.x)*nx+(bk.z-k.z)*nz)>0?-1:1;const qx=k.x+nx*sd*0.9*dt,qz=k.z+nz*sd*0.9*dt;
      if(!pedBlocked(qx,qz,k.R+0.08,k.x,k.z)||k.blockT>5){k.x=qx;k.z=qz;k.h=headingOf(nx*sd,nz*sd);k.v=0.9;}}}
  else{k.blockT=0;if(k.stepTo(B.x,B.z,spd,dt)){k.arrived=true;}}
  const pr=projectOn(r,k.x,k.z,s);k.y=r.yAt(s)+(pr&&spOnRoad(r,pr.s,pr.t)?0:0.15);}
function spPedJudge(e,elder,who){if(STAGE.over)return;const law=elder?'道路交通法 第71条第2号の2':'道路交通法 第70条（安全運転義務）';const head=elder?'お年寄りの横断':'急に渡ってきた人（女性）';
  const close=e.minGap<0.5,slow=e.vMin<=(elder?10.5:15.5)||e.vMin===99;// お年寄りは徐行（約10km/h以下）、女性は15km/h以下まで。99：渡っている間、45mより近づかなかった
  if(!e.viol&&!close&&slow){praise(elder?'spElderOK':'spJayOK');SP.res.push({t:`${head}：${elder?'止まって（徐行して）、渡り終えるまで待った':'速度を落として、先に渡らせた'}`,law});return;}
  const why=e.viol?`渡っている途中に、約${Math.round(e.vPass)}km/hで通過した`:close?'すぐそばを通ってしまった':`減速が足りなかった（いちばん遅いときで約${Math.round(e.vMin)}km/h）`;
  SP.res.push({t:`${head}：${why}`,bad:true,law});}
// ---- 逆走してくる車 ----
// roads：候補の区間（ルートの順）。区間に入ったとき、プレイヤーの車線の先が空いていれば、向こうの交差点のそばに出す。
// 出せなかった・近くで出会わなかったときは、次の候補の区間で出す
function spWrongWay(roads){const e={sp:{kind:'wrong',x:roads.map(c=>c.x0)},ph:0,ri:0,W:null,
  lesson:'逆走車に気づいたら、早めに速度を落として左に寄せ、止まってやり過ごしましょう。危険を防ぐためやむを得ないときは、ホーンで知らせることもできます。',
  update(dt){const p=PLAYER;
    if(this.ph===0){const c=roads[this.ri];if(!c){this.done=true;return;}if(J.road!==c.r||J.dir!==c.dir)return;
      const r=c.r,dir=c.dir,P=r.lanes(dir)[0],O=r.lanes(-dir)[0];if(!P||!O){this.ri++;return;}const uP=P.uOf(J.s);if(uP<4)return;
      const sSp=O.sOf(6);const lenTo=(sSp-J.s)*dir-p.L/2;
      const ok=lenTo>75&&spLaneClear(r,P,sSp,dir,lenTo-3,null)&&!O.agents.some(a=>a.u<26);
      if(!ok){if(uP>40||lenTo<=75)this.ri++;return;}
      const W=new Veh('car',pick(['compact','sedan','kei','van','suv']));W.place(O,6);W.v=8.6+R()*1.2;W.vN=W.v;W.evt=true;W.noLC=true;W.wrong=true;VEH.push(W);
      Object.assign(this,{ph:1,W,r,dir,P,O,st:'enter',t:0,latV:0,dP:(P.tC-O.tC)*O.dir,enc:false,passed:false,judged:false,handed:false,minClear:9,vPass:0,driftT:0,gap:Infinity});
      W.script=(v,dt2)=>spWrongDrive(this,v,dt2);return;}
    const W=this.W;if(!W)return;
    // この車との衝突は、専用の説明で知らせる（いつもの衝突判定より先に調べる）
    if(!STAGE.over&&!W.hidden&&Math.abs(W.x-p.x)<8&&Math.abs(W.z-p.z)<8&&obbOverlap({x:p.x,z:p.z,h:p.h,L:p.L-0.16,W:p.W-0.12},{x:W.x,z:W.z,h:W.h,L:W.L-0.16,W:W.W-0.12})){crash('逆走してきた車と衝突しました。',W);return;}
    const gap=spWrongGap(this);this.gap=gap;
    // 車体が中央線をこえてこちらの車線に入ってきたら「出会った」。その間は危険が迫っている（急ブレーキ・ホーンを使ってよい）
    if(!this.enc&&!this.handed&&W.d>0.9&&gap>0&&gap<110){this.enc=true;STAGE.lessonHint=this.lesson;coach('前から逆走車が来ます！ 速度を落とし、左に寄せて止まりましょう。',6,1);}
    if(!this.passed&&!this.handed&&gap>-2&&gap<130&&W.d>0.9)danger();
    if(this.enc&&!this.judged){const q=p.loc;
      if(gap<3&&gap>-(W.L+p.L)-1&&q&&q.kind==='road'&&q.road===this.r&&W.lane===this.O){const sW=this.O.sOf(W.u);const wT=this.O.tAt(sW)+W.d*this.O.dir;this.minClear=Math.min(this.minClear,Math.abs(wT-q.t)-(W.W+p.W)/2);}
      if(!this.passed&&gap<=0){this.passed=true;this.vPass=Math.abs(p.v)*KMH;}
      if(this.passed&&gap<-(W.L+p.L)-1){this.judged=true;spWrongJudge(this);}}
    if(this.handed){// 近くで出会わなかったときは、次の候補の区間でもう一度
      if(!this.enc){this.ph=0;this.ri++;this.W=null;return;}
      if(this.judged&&(W.hidden||Math.hypot(W.x-p.x,W.z-p.z)>170))this.done=true;}},
  cleanup(){if(this.W&&!this.handed)this.W.remove();}};
  return evAdd(e);}
// 逆走車の先端とプレイヤーの先端の間の距離（道路に沿って。すれ違ったあとはマイナス）
function spWrongGap(e){const W=e.W,p=PLAYER;const q=p.loc;if(!q||q.kind!=='road'||q.road!==e.r||W.hidden||!W.lane||W.lane.road!==e.r)return e.passed?-99:Infinity;return(W.lane.sOf(W.u)-q.s)*e.dir-W.L/2-p.L/2;}
// 逆走車の運転：プレイヤーの車線（P）に入って走り、近づいたら（またはホーンを聞いたら）自分の車線（O）に戻る
function spWrongDrive(e,v,dt){const P=e.P,O=e.O,r=e.r,dir=e.dir,p=PLAYER;e.t+=dt;
  const s=O.sOf(v.u);const q=p.loc;const pOn=!!(q&&q.kind==='road'&&q.road===r);const gap=pOn?(s-q.s)*dir-v.L/2-p.L/2:Infinity;
  const clear=(len)=>spLaneClear(r,P,s,dir,len,v);const closing=v.v+Math.max(0,p.v);
  let tgt=0;
  if((e.st==='drift'||e.st==='wrong')&&(!pOn||v.u>O.len-30||e.t>70))e.st='back';
  if(e.st==='enter'){if(e.t>0.8){if(gap>48&&clear(45))e.st='drift';else if(gap<=48)e.st='normal';}}
  else if(e.st==='drift'){tgt=e.dP;if(!e.driftT)e.driftT=J.t;if(spHeard(e,gap))e.st='ret';else if(!clear(30))e.st='back';else if(Math.abs(v.d-e.dP)<0.08)e.st='wrong';}
  else if(e.st==='wrong'){tgt=e.dP;if(gap<=Math.max(22,closing*1.7)||spHeard(e,gap))e.st='ret';else if(!clear(26))e.st='back';}
  else if(e.st==='back'){if(Math.abs(v.d)<0.08){if(gap>48&&clear(45)&&e.t<60&&pOn)e.st='drift';else if(gap<=48||!pOn||e.t>=60)e.st='normal';}}
  if(e.st==='ret'){// プレイヤーが右（対向車線の側）によけているときは、プレイヤーの車線の左端に寄ってすれ違う
    const wT=O.tAt(s)+v.d*O.dir;const sg=Math.sign(O.tC-P.tC);
    if(pOn&&gap>-1&&(q.t-wT)*sg>0.4){const[lo,hi]=r.tRange(s);const tE=sg>0?lo+v.W/2+0.2:hi-v.W/2-0.2;tgt=(tE-O.tC)*O.dir;e.side=true;}
    else if(!e.side||gap<-1)tgt=0;else tgt=v.d;
    if(gap<-(v.L+p.L)-1)e.st='pass';}
  if(e.st==='pass'||e.st==='normal'){tgt=0;if(Math.abs(v.d)<0.06&&Math.abs(e.latV)<0.2){v.d=0;e.latV=0;v.script=null;v.wrongLane=null;e.handed=true;return;}}
  // 速さ：近づいたら落とす。前に車・人がいれば止まる
  let vt=v.vN;if((e.st==='wrong'||e.st==='ret')&&gap<34)vt=Math.min(vt,4.2);if(e.st==='ret'&&e.side)vt=Math.min(vt,2.5);
  const ah=spAhead(v,30,0.15);if(ah<Infinity){const need=v.v*v.v/(2*6)+2.2;vt=ah<need?0:Math.min(vt,Math.sqrt(2*5*Math.max(0,ah-2.2)));}
  const acc=vt<v.v?Math.max(-7,(vt-v.v)*2.5):Math.min(1.6,(vt-v.v)*1.2);v.v=Math.max(0,v.v+acc*dt);v.brake=acc<-0.6||v.v<0.05;
  // 横の動き（速さに見合う範囲で）
  const lmax=Math.max(0.3,Math.min(1.5,v.v*0.45));const want=clamp((tgt-v.d)*2.0,-lmax,lmax);e.latV+=clamp(want-e.latV,-3.2*dt,3.2*dt);v.d+=e.latV*dt;
  v.u+=v.v*dt;if(v.u>O.len-0.5){v.u=O.len-0.5;e.st='normal';}
  const P0=O.pos(clamp(v.u,0,O.len),v.d);v.x=P0.x;v.z=P0.z;v.y=P0.y||0;v.h=wrapA(P0.h+Math.atan2(e.latV,Math.max(v.v,2)));v.m.grp.position.set(v.x,v.y,v.z);v.m.grp.rotation.y=-v.h;
  v.wrongLane=v.d>0.9?P:null;// 車体がプレイヤーの車線にかかっている間は、その車線を走る車からも「向かってくる車」として見える（06a）
  setCarLights(v.m,{head:ENV.dark||ENV.mode==='rain'||ENV.mode==='fog',brake:v.brake});}
// ホーンを聞いた：こちらの車線に入り始めてから鳴らされ、0.4秒たった（90m以内）
function spHeard(e,gap){return!!e.driftT&&SP.hornT>=e.driftT&&J.t-SP.hornT>0.4&&gap<90;}
// 車線 P の、逆走車（位置 sW）の進む先 len m に、ほかの車・道路を渡っている人・障害物がいないか（プレイヤーは数えない）
function spLaneClear(r,P,sW,dir,len,self){const half=P.w/2+0.7;const inP=(s,t)=>{const a=(sW-s)*dir;return a>-6&&a<len&&Math.abs(t-P.tC)<half;};
  for(const o of VEH){if(o===self||o.hidden||o.conn||!o.lane||o.lane.road!==r)continue;const s=o.lane.sOf(o.u);if(inP(s,o.lane.tAt(s)+(o.d||0)*o.lane.dir))return false;}
  for(const k of PEDS){if(k.mode==='off'||!k.vis||k.onWalk)continue;const pr=projectOn(r,k.x,k.z,sW);if(pr&&inP(pr.s,pr.t))return false;}
  for(const o of NET.obst){if(o.road!==r||o.s===undefined)continue;const pr=projectOn(r,o.x,o.z,o.s);if(pr&&inP(pr.s,pr.t))return false;}
  return true;}
// 逆走車の進む向きのすぐ前（車体の幅）にいるもの（プレイヤー・車・人）までの距離
function spAhead(v,dist,pad){const f=fwd(v.h),rt=rightV(v.h);let best=Infinity;
  const test=(x,z,L,W,h)=>{const dx=x-v.x,dz=z-v.z;const fw=dx*f.x+dz*f.z;if(fw<=0||fw>dist+8)return;const lt=dx*rt.x+dz*rt.z;const dh=wrapA((h||0)-v.h),c=Math.abs(Math.cos(dh)),sn=Math.abs(Math.sin(dh));
    const ax=c*L/2+sn*W/2,ay=sn*L/2+c*W/2;if(Math.abs(lt)>v.W/2+ay+pad)return;const g=fw-v.L/2-ax;if(g<best)best=g;};
  const p=PLAYER;if(p&&STAGE.running)test(p.x,p.z,p.L,p.W,p.h);
  for(const o of VEH){if(o===v||o.hidden||Math.abs(o.x-v.x)>dist+10||Math.abs(o.z-v.z)>dist+10)continue;test(o.x,o.z,o.L,o.W,o.h);}
  for(const k of PEDS){if(k.mode==='off'||!k.vis||k.onWalk||Math.abs(k.x-v.x)>dist+10||Math.abs(k.z-v.z)>dist+10)continue;test(k.x,k.z,0.6,0.6,0);}
  return best;}
function spWrongJudge(e){if(STAGE.over)return;const v=Math.round(e.vPass),c=e.minClear;const law='ゲーム独自の目安（根拠：道路交通法 第70条・NEXCO西日本の案内）';
  if(e.vPass<=20.5){praise('spWrongOK');SP.res.push({t:'逆走車：速度を落としてやり過ごした',law});}
  else if(e.vPass>20.5&&c<1.2){violate('spWrong',`すれ違ったとき約${v}km/h・横の間隔 約${Math.max(0,c).toFixed(1)}m`,0);SP.res.push({t:`逆走車：約${v}km/hのまま、すぐそばですれ違った`,bad:true,law});}
  else SP.res.push({t:`逆走車：すれ違うとき約${v}km/h（もっと手前から速度を落とし、止まってやり過ごす）`,bad:true,law});}
// ---- 「怒鳴る」ボタン（特殊モードだけ。採点には影響しない） ----
const SHOUT={n:0,last:-1e9,timer:null,seq:0,text:'危ねえだろ〇ズ人間！'};
function shoutHide(){const b=$('shoutBubble');if(b){b.hidden=true;b.classList.remove('pop');}clearTimeout(SHOUT.timer);}
function shout(){const s=STAGES[STAGE.idx];if(!s||!s.shout||!STAGE.running||STAGE.over||STAGE.paused)return;const now=performance.now();if(now-SHOUT.last<1100)return;SHOUT.last=now;SHOUT.n++;
  const b=$('shoutBubble'),btn=$('btnShout');
  // ふきだしは計器のすぐ上（背の低い画面では、道路が見えなくならないよう計器の上に重ねる）
  if(b){b.textContent=SHOUT.text;b.hidden=false;const cl=$('cluster');const c=cl&&cl.getClientRects().length?cl.getBoundingClientRect():null;const H=window.innerHeight;
    if(c&&c.width>0){b.style.left=(c.left+c.width/2)+'px';b.style.top='auto';b.style.bottom=(H<600?H-c.bottom+Math.max(0,(c.height-b.offsetHeight)/2):H-c.top+16)+'px';}else{b.style.left='50%';b.style.bottom='auto';b.style.top='28%';}
    b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');clearTimeout(SHOUT.timer);SHOUT.timer=setTimeout(shoutHide,1700);}
  if(btn){btn.classList.add('hit');setTimeout(()=>btn.classList.remove('hit'),160);}
  shoutVoice();}
// 声：「あぶねえだろ」→ 伏せ字の部分は「ピー」→「にんげん！」（教官の音声案内の設定がオフなら「ピー」だけ。効果音がオフなら鳴らさない）
function shoutVoice(){const seq=++SHOUT.seq;const bleep=()=>{if(SFX.ctx&&SFX.on)SFX.tone(1000,0.34,'sine',0.17);};
  if(!VOICE.on||!('speechSynthesis' in window)){bleep();return;}
  try{speechSynthesis.cancel();VOICE.last='';const vs=speechSynthesis.getVoices().filter(x=>/ja/i.test(x.lang));
    const mk=(t,rate)=>{const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=rate;u.pitch=0.7;u.volume=1;if(vs.length)u.voice=vs[0];return u;};
    const u1=mk('あぶねえだろ',1.3),u2=mk('にんげん！',1.2);let step=0;
    const next=()=>{if(seq!==SHOUT.seq||step!==0)return;step=1;bleep();setTimeout(()=>{if(seq!==SHOUT.seq)return;try{speechSynthesis.speak(u2);}catch(x){}},330);};
    u1.onend=next;u1.onerror=()=>{step=2;};speechSynthesis.speak(u1);setTimeout(next,1500);}catch(x){bleep();}}
{const b=$('btnShout');if(b){b.addEventListener('click',(ev)=>{ev.preventDefault();act('shout',true);b.blur();});b.addEventListener('contextmenu',(ev)=>ev.preventDefault());}}
