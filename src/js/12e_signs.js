// ===== 12e_signs.js : 標識の練習コース（3つのコース・標識カード・コース特有の判定） =====
// 標識の配置はゲーム独自。道路の状況に合う標識は「この道路の標識」、そうでないものは道ばたの「見本（展示）」として置く。
const SGE=(q)=>SIGNDATA.find(e=>e.no===q)||SIGNDATA.find(e=>e.no.startsWith(q+'-')||e.v.includes(q))||null;
// 停留所：x（東向きに走るときの位置）、ids：標識（別表第一の番号）、art：絵（省略時は標識の最初の様式）、t：教官の説明
// ex：見本の展示板（3〜4種類ずつ）、side：脇道の入口に立てる、auto：ほかの処理で立つ標識（説明だけ）、zone：判定する区間
const SGST={
 A:[
  {x:-955,ids:['323'],art:['s40'],t:'この道路の最高速度は40km/h（標識による指定）。'},
  {x:-915,ex:['301','302','305','305の2']},
  {x:-878,side:'A1n',ids:['303'],t:'左の脇道は「車両進入禁止」。こちらから入ってはいけません（出口だけの一方通行）。'},
  {x:-815,ex:['306','307','308','309']},
  {x:-760,auto:1,ids:['330'],art:['stop'],t:'「一時停止」：停止線の直前で止まり、左右を確かめてから進みます。'},
  {x:-700,ids:['323'],art:['s30'],t:'ここから最高速度30km/h。'},
  {x:-655,ex:['310','310の2','310の3']},
  {x:-598,side:'A3s',ids:['302'],t:'右の脇道は「車両通行止め」。車は入れません。'},
  {x:-540,ex:['312','314','314の2']},
  {x:-500,ex:['319','320','321','322']},
  {x:-468,side:'A4n',ids:['325の4'],t:'左の道は「歩行者等専用」。車は入れません。'},
  {x:-405,ex:['315','316','317','318']},
  {x:-350,ids:['311'],art:['dirSL'],t:'この先の交差点は「直進・左折のみ」。右折はできません。'},
  {x:-300,ids:['323'],art:['s40'],t:'最高速度40km/h。'},
  {x:-282,auto:1,ids:['207'],art:['rail'],t:'この先に踏切。停止線の手前で一時停止し、左右を確かめます。'},
  {x:-158,side:'A6n',ids:['325の2'],t:'左の道は「特定小型原動機付自転車・自転車専用」。車は入れません。'},
  {x:-118,ids:['327の7'],art:['S327n7D'],t:'左の車線は直進・左折、右の車線は右折。この先を直進するので、左の車線のままで。'},
  {x:-78,ex:['323の2','325','325の3']},
  {x:-38,ex:['325の5-A','325の5-B','325の5-C','325の6']},
  {x:40,ex:['325の7','326の2','327','327の2']},
  {x:95,ex:['327の3','327の4','327の4の2','327の5']},
  {x:182,ids:['323','328'],art:['s30','S328'],t:'見通しの悪いカーブ。「警笛鳴らせ」の標識の所では、警音器を鳴らします（{hn}）。最高速度30km/h。',zone:{k:'horn',x0:178,x1:262}},
  {x:322,ex:['327の6','327の8','327の9','327の10']},
  {x:343,side:'A9n',ids:['326'],art:['S326B'],t:'左の脇道は「一方通行」。矢印の向き（こちらから入る向き）だけ通れます。'},
  {x:380,ids:['329'],art:['jokou'],t:'「徐行」：すぐ止まれる速さで進みます（ゲームでは10km/h以下）。この先は狭い橋です。',zone:{k:'slow',x0:388,x1:440}},
  {x:470,ex:['327の11','327の12','327の13','328の2']},
  {x:520,ids:['313'],t:'この先は「転回禁止」。Uターンしてはいけません。',zone:{k:'uturn',x0:520,x1:700}},
  {x:615,ex:['329の2','331','332']},
  {x:700,side:'A11s',ids:['304'],t:'右の脇道は「二輪の自動車以外の自動車通行止め」。この車は入れません。'},
  {x:745,ids:['323','324'],art:['s50','S324'],t:'最高速度50km/h、最低速度30km/h。危険を防止するためやむを得ないときなどを除き、30km/hに達しない速さで走りません。',zone:{k:'minv',x0:752,x1:866}},
 ],
 B:[
  {x:-955,ids:['201-A'],t:'この先に十字路（┼形の交差点）があります。'},
  {x:-905,ex:['201-C','201の2','202','203']},
  {x:-792,ids:['201-B'],t:'この先に、道が横に分かれる交差点があります。'},
  {x:-760,ex:['206','209','209の2','209の3']},
  {x:-652,ids:['201-D'],t:'この先にY字形の交差点があります。'},
  {x:-622,ex:['210','211','212の2','214']},
  {x:-562,ids:['204'],t:'この先、右・左に続けて曲がる道です。カーブの手前で速度を落とします。'},
  {x:-345,ex:['214の2','215','401','402']},
  {x:-306,ids:['405'],t:'この道路は「優先道路」。交差する道路の車は、こちらの進行を妨げてはいけません（それでも周りには注意）。'},
  {x:-282,auto:1,ids:['207'],art:['rail'],t:'この先に踏切。停止線の手前で一時停止し、左右を確かめます。'},
  {x:-172,ex:['402の2','403','403の2','404']},
  {x:-128,ids:['208の2'],t:'この先に信号機があります。'},
  {x:-95,ex:['406','406の2','407の2','407の3']},
  {x:-22,ids:['208','508'],art:['school','S508'],t:'この先に学校（通学路）。子どもの飛び出しに注意して、速度を落とします。'},
  {x:4,auto:1,ids:['407'],art:['xwalk'],t:'横断歩道。渡ろうとしている人がいれば、手前で止まって道を譲ります（第38条第1項）。'},
  {x:75,ex:['408','409']},
  {x:268,ids:['212'],t:'この先、道幅が狭くなります。対向車に注意。'},
  {x:540,ids:['212の3'],t:'この先、上りの急な坂です。'},
  {x:640,ids:['212の4'],t:'この先、下りの急な坂。速度を落とします。'},
  {x:736,ids:['205'],t:'この先、右・左に続けて急に曲がる道です。'},
  {x:893,ids:['213'],t:'この先で道路工事中。作業する人や工事の車に注意。'},
 ],
 C:null,// 下で組み立てる
};
// C：案内標識・補助標識を順に展示（交差点・踏切の近くはあける）
(function(){const guide=SIGNDATA.filter(e=>e.c==='guide').map(e=>e.no),aux=SIGNDATA.filter(e=>e.c==='aux').map(e=>e.no);const all=[];
  for(let i=0;i<guide.length;i+=3)all.push({big:1,ex:guide.slice(i,i+3)});for(let i=0;i<aux.length;i+=4)all.push({ex:aux.slice(i,i+4)});
  const nodesX=SGN.C.map(q=>q.x);const st=[{x:-955,ids:['101'],t:'市町村：ここから「みなみ町」（地名は架空）。案内標識は青や緑の地に白の文字です（高速道路などに設置するものは緑）。'}];let x=-905;
  for(const g of all){while(nodesX.some(nx=>Math.abs(nx-x)<26)||Math.abs(x-SGN.RAILX)<40||Math.abs(x-SGN.RAILX+80)<14)x+=8;st.push(Object.assign({x},g));x+=g.big?62:52;}
  st[0].first=1;SGST.C=st;})();
// ---- 地図（コースごとに1つ） ----
for(const C of['A','B','C'])MAPS['sign'+C]={id:'sign'+C,name:'標識の練習コース '+C,bounds:[-1080,-420,1080,420],keepOut:[],tile:160,pedCap:80,miniScale:1.6,course:C,
  def(){return signsDef(C);},
  after(){for(const r of NET.roads)townFeatS(r);const ids=new Set(['s30','s40','s50','stop','rail','xwalk','noentry','oneway','school']);
    for(const s of SGST[C]){const es=(s.ex||s.ids||[]).map(SGE).filter(Boolean);s.es=es;s.arts=s.art&&!s.ex?s.art:es.map(e=>e.a[0]);s.arts.forEach(a=>ids.add(a));}this.signIds=[...ids];},
  rail:{ax:'z',c:SGN.RAILX,a:-420,b:420,y:0,cars:4,v:15,wait:12,stripe:0x2f6fb5},
  traffic:{n:10,bikes:3,peds:16,filter:l=>!l.road.def.closedBy&&!l.road.def.pedOnly,mix:{kei:3,compact:3,sedan:2,van:1.5,suv:1,truck:0.6}},
  signs(){autoSigns();signsPlace(C);},
  build(B,wires){buildSignsScene(B,wires,C);}};
// 停留所の位置（本線の上）
function sgRoadAt(C,x){return townRoadAt(C,x);}
function signsPlace(C){for(const s of SGST[C]){if(s.ex||s.auto)continue;
    if(s.side){const r=NET.byId[s.side];if(!r)continue;placeSign(r,3.2,1,s.arts,{size:0.8});if(s.side==='A3s'||s.side==='A11s'){}continue;}
    const q=sgRoadAt(C,s.x);if(!q)continue;placeSign(q.road,q.s,q.sign,s.arts,{size:s.arts.length>1?0.72:0.8});}}
// ---- 景色 ----
function buildSignsScene(B,wires,C){R=rng(C.charCodeAt(0)*7+3);buildSignMeshes(B);
  B.ground('grass',-1300,-560,1300,560,-0.06,0x86a35e,10);
  // 田畑
  const nodesX=SGN[C].map(q=>q.x);const cols=[0x9db86a,0x7fa65a,0x8fb15e,0xa8b979,0x6f9a4f,0xb3b98a];
  for(let x=-1060;x<1060;x+=48)for(const sd of[-1,1]){if(R()<0.25)continue;if(nodesX.some(nx=>Math.abs(nx-x-23)<34))continue;const z0=sd<0?-150:16,z1=sd<0?-16:150;if(C==='B'&&x>-600&&x<-300&&sd>0)continue;if(C==='A'&&x>180&&x<340&&sd<0)continue;
    B.ground('grass',x+1,z0,x+46,z1,-0.045,pick(cols),6);}
  buildPoles(B,wires,{filter:r=>!!r.def.course});buildStreetLights(B,{filter:r=>!!r.def.course&&!r.def.narrowSeg});
  lineBuildings(B,{seed:31+C.charCodeAt(0),filter:r=>!!r.def.sideRoad&&!r.def.pedOnly,kinds:()=>['house','house','house','apt']});
  for(let i=0;i<140;i++){const x=-1050+R()*2100,z=(R()<0.5?-1:1)*(22+R()*120);const P={x,z};if(nodesX.some(nx=>Math.abs(nx-x)<14))continue;if(Math.abs(x-SGN.RAILX)<12)continue;
    if(clearOfRoads(x-3,z-3,x+3,z+3)&&!overlapsBuilt(x-4,z-4,x+4,z+4))tree(B,x,z,0.9+R()*0.5);}
  // 線路（南北）
  {const X=SGN.RAILX;B.ground('def',X-5,-560,X+5,560,0.0,COL.ballast);for(const tx of[X-2.2,X+2.2]){for(let z=-540;z<540;z+=1.1){if(Math.abs(z)<6)continue;B.box('def',tx,0.05,z,2.0,0.1,0.22,COL.sleeper);}
      for(const off of[-0.535,0.535]){for(const[a,b]of[[-540,-5.5],[5.5,540]])B.box('def',tx+off,0.12,(a+b)/2,0.07,0.12,b-a,COL.rail);B.box('def',tx+off,0.025,0,0.09,0.03,11,0x4a4642);}}
    for(let z=-520;z<520;z+=45){if(Math.abs(z)<12)continue;B.box('def',X-4.6,3.4,z,0.25,6.8,0.25,0x8d939a);B.box('def',X,6.6,z,9.6,0.2,0.2,0x8d939a);}for(const tx of[X-2.2,X+2.2])B.box('def',tx,6.0,0,0.03,0.03,1080,0x2a2a2a);}
  // 見本の展示板
  for(const s of SGST[C])if(s.ex){const q=sgRoadAt(C,s.x);if(q)sgPanel(B,q,s);}
  if(C==='A')signsSceneA(B);if(C==='B')signsSceneB(B);if(C==='C')signsSceneC(B);}
// 展示板（道路の左の外側に、走ってくる車の方を向けて立てる）
function sgPanel(B,q,s){const r=q.road;const P0=r.at(q.s);const dir=q.sign;const[lo,hi]=r.tRange(q.s);const tOut=dir>0?lo-(r.walk[0]||0)-1.6:hi+(r.walk[1]||0)+1.6;
  const face=(dir>0?P0.h:P0.h+Math.PI)+Math.PI;const rt=rightV(face);// 表が向く方向とその右（板の並び）
  const n=s.arts.length;const big=!!s.big;const w=big?2.4:1.0,gap=big?0.22:0.18;const W=n*w+(n+1)*gap;const H=big?(2.4/1.5)+0.4:1.36;const y0=big?1.3:1.25;
  const C0=r.pt(q.s,tOut+(dir>0?-1:1)*W/2);// 板の中心（道路から遠ざかる向きに W/2）
  const f=fwd(face);B.box('def',C0.x-f.x*0.06,y0+H/2,C0.z-f.z*0.06,Math.abs(f.x)>0.5?0.08:W+0.16,H+0.16,Math.abs(f.x)>0.5?W+0.16:0.08,0xd6dbe0);
  for(const k of[-1,1]){const px=C0.x+rt.x*k*(W/2-0.1)-f.x*0.12,pz=C0.z+rt.z*k*(W/2-0.1)-f.z*0.12;B.cyl('def',px,(y0+H)/2,pz,0.06,y0+H,0x8d939a,6);}
  for(let i=0;i<n;i++){const id=s.arts[i];const e=signCell(id);const off=-W/2+gap+w/2+i*(w+gap);// 見る人から見て左から右へ
    const cx=C0.x-rt.x*off,cz=C0.z-rt.z*off;B.quad('sign'+e.page,cx+f.x*0.02,y0+H/2+(big?0.1:0.05),cz+f.z*0.02,w,w,face,...e.uv);}
  TEXTSIGNS.push({x:C0.x+f.x*0.03,y:y0+H+0.3,z:C0.z+f.z*0.03,h:face+Math.PI,w:Math.min(W,3.4),hh:0.34,spec:{bg:'#1c2622',fg:'#ffffff',bw:0,lines:[{t:'見本（展示）：'+SIGNCAT[s.es[0].c],size:0.5,y:0.55}]}});}
function signsSceneA(B){// 通行止めの脇道：バリケード
  const r=NET.byId.A3s;if(r){const[lo,hi]=r.tRange(12);for(let t=lo+0.3;t<hi;t+=1.1){const P=r.pt(12,t);B.box('def',P.x,0.55,P.z,0.9,0.18,0.08,0xf2f2f2);B.box('def',P.x,0.9,P.z,0.9,0.18,0.08,0xd42a2a);B.box('def',P.x-0.4,0.5,P.z,0.06,1.0,0.06,0x666666);}
    NET.obst.push({x:r.pt(12,0).x,z:r.pt(12,0).z,h:0,L:hi-lo,W:0.4,solid:true,static:true,label:'通行止めのバリケードに接触しました。'});const P=r.pt(10.5,0);TEXTSIGNS.push({x:P.x,y:1.5,z:P.z-0.02,h:Math.PI,w:1.6,hh:0.5,spec:{bg:'#ffffff',fg:'#c21f1f',border:'#c21f1f',lines:[{t:'通行止',size:0.6,y:0.52,color:'#c21f1f'}]}});}
  // 見通しの悪いカーブ：内側に木立
  const c=NET.byId.A_8;if(c){for(let s=10;s<c.len-10;s+=3.2){const[lo,hi]=c.tRange(s);for(const k of[1,2,3])tree(B,...((P)=>[P.x,P.z])(c.pt(s,hi+2.5+k*2.6+R())),1.2+R()*0.4);}}
  // 狭い橋：欄干と川
  const b=NET.byId.A_9;if(b){const s0=28,s1=72;for(const sd of[-1,1]){const[lo,hi]=b.tRange(40);const t=sd<0?lo-0.25:hi+0.25;const pts=[];for(let s=s0;s<=s1;s+=4)pts.push(b.pt(s,t));
      for(const P of pts)B.box('def',P.x,0.55,P.z,0.12,1.1,0.12,0xc9c3b6);const a=pts[0],z=pts[pts.length-1];B.box('def',(a.x+z.x)/2,1.05,(a.z+z.z)/2,Math.abs(z.x-a.x)+0.2,0.1,0.14,0xc9c3b6);}
    const m=b.pt((s0+s1)/2,0);B.ground('def',m.x-16,-140,m.x+16,140,-0.04,0x4f86a8);for(const sd of[-1,1])B.ground('def',m.x+sd*17.5-1.5,-140,m.x+sd*17.5+1.5,140,-0.035,0x9b8c6c);
    BUILT.push({x0:m.x-19,x1:m.x+19,z0:-150,z1:150});}}
function signsSceneB(B){// 坂（盛り土）
  const h=NET.byId.B_8;if(h){for(let s=1;s<h.len-1;s+=1.6){const y=h.yAt(s)-0.12;if(y<0.2)continue;const P=h.at(s);const[lo,hi]=h.tRange(s);const wd=hi-lo+(h.walk[0]||0)+(h.walk[1]||0)+y*2.6;B.box('grass',P.x,y/2-0.06,P.z,1.7,y,wd,0x86a35e);}}
  // 工事中：コーンと作業の車
  const w=NET.byId.B_10;if(w){for(let s=22;s<70;s+=4){const[lo]=w.tRange(s);const P=w.pt(s,lo-0.2);B.cyl('def',P.x,0.35,P.z,0.16,0.7,0xf06a1f,8);B.cyl('def',P.x,0.42,P.z,0.165,0.1,0xffffff,8);}
    const P=w.pt(46,w.tRange(46)[0]-2.6);staticCar(B,P.x,P.z,Math.PI/2,'truck',0xf2f2f2);
    TEXTSIGNS.push({x:w.pt(16,w.tRange(16)[0]-1.2).x,y:1.3,z:w.pt(16,w.tRange(16)[0]-1.2).z,h:Math.PI/2,w:1.2,hh:1.2,spec:{bg:'#ffd200',fg:'#111',border:'#111',lines:[{t:'工事中',size:0.34,y:0.38,color:'#111'},{t:'ご迷惑をおかけします',size:0.13,y:0.72,color:'#111'}]}});}
  // 学校
  {const q=sgRoadAt('B',60);if(q){const P=q.road.pt(q.s,-30);B.wallBox('fac0',P.x,P.z-14,0,60,11,18,0xe9e6dc,0,6,5.5);BUILT.push({x0:P.x-31,x1:P.x+31,z0:P.z-23,z1:P.z-5});
    TEXTSIGNS.push({x:P.x,y:9,z:P.z-4.9,h:Math.PI,w:7,hh:1.3,spec:{bg:'#ffffff',fg:'#1c2622',bw:0,lines:[{t:'みなみ第二小学校',size:0.5,y:0.55,color:'#1c5f3a'}]}});}}}
function signsSceneC(B){// 停留所と駐車場（景色）
  const q=sgRoadAt('C',150);if(q){const[lo]=q.road.tRange(q.s);const P=q.road.pt(q.s,lo-2.4);B.cyl('def',P.x,1.3,P.z,0.05,2.6,0xb0b6bb,6);B.cyl('def',P.x,2.75,P.z,0.34,0.06,0xf2f2f2,16);
    shopSignQuad(B,'みなみバス\n郊外三丁目','#2f7d3a',P.x,2.75,P.z,0.62,0.31,Math.PI/2,false,{back:true,box:false});}}
// ---- 標識カード ----
const SGCARD={cur:null,t:0};
function sgCardShow(s){const el=$('signCard');if(!el)return;SGCARD.cur=s;SGCARD.t=0;const ctx=!s.ex;
  el.querySelector('.sch').textContent=ctx?(s.auto?'この道路の標識':'この道路の標識'):'見本（展示）';const L=el.querySelector('.scl');L.innerHTML='';
  s.es.forEach((e,i)=>{const row=document.createElement('div');row.className='scr';row.appendChild(signThumb(s.arts[i]||e.a[0],44));const tx=document.createElement('div');
    const car=e.c==='reg'||e.c==='inst'?(e.car?'この車も対象':'この車は対象外'):'';tx.innerHTML=`<b>${esc(e.n)}</b><small>${esc(e.no)}${car?' ・ '+car:''}</small>${s.ex?`<span>${esc(e.m)}</span>`:''}`;row.appendChild(tx);L.appendChild(row);
    (STAGE.sgSeen||(STAGE.sgSeen=new Set())).add(e.no);});
  el.hidden=false;document.body.classList.add('sgcard');if(ctx&&s.t)coach(s.t,7,1);}
function sgCardHide(){const el=$('signCard');if(el)el.hidden=true;document.body.classList.remove('sgcard');SGCARD.cur=null;}
function sgTick(dt){const p=PLAYER;const C=STAGE.sgCourse;if(!C)return;SGCARD.t+=dt;
  if(SGCARD.cur&&(p.x>SGCARD.cur.x+22||SGCARD.t>(SGCARD.cur.ex?11:8)))sgCardHide();
  const east=Math.cos(p.h-Math.PI/2)>0.3;if(!east)return;
  for(const s of SGST[C]){if(s.shown)continue;const d=s.x-p.x;if(d<34&&d>2&&Math.abs(p.z)<60){s.shown=1;if(!s.es||!s.es.length)continue;sgCardShow(s);break;}}}
// ---- コースの判定 ----
function sgCheck(dt){const p=PLAYER;const r=J.road;const C=STAGE.sgCourse;
  // 通行が禁止されている脇道に入った
  if(r&&r.def.closedBy&&J.dir===1&&Math.abs(p.v)>0.5&&STAGE.sgClosed!==r.id){STAGE.sgClosed=r.id;const e=SGE(r.def.closedBy);violate('closedRoad',`「${e?e.n:'通行止め'}」の標識がある道路でした。`,0);}
  const onMain=r&&r.def.course===C;
  for(const s of SGST[C]){const Z=s.zone;if(!Z)continue;const inside=p.x>=Z.x0&&p.x<=Z.x1&&Math.abs(p.z)<60;
    if(Z.k==='horn'){if(inside&&(J.dir===1||!r)){STAGE.hornOK=true;if(p.horn)s.horned=1;s.in=1;}else if(s.in&&!s.done&&p.x>Z.x1){s.done=1;STAGE.hornOK=false;if(s.horned)praise('hornOK');else violate('hornReq','',0);}else if(!inside)STAGE.hornOK=false;}
    if(Z.k==='slow'){if(inside&&J.dir===1){s.in=1;if(Math.abs(p.v)*KMH>10.5){s.fastT=(s.fastT||0)+dt;if(s.fastT>0.4&&!s.bad){s.bad=1;violate('slowZone',`${Math.round(Math.abs(p.v)*KMH)}km/hで通過`,0);}}else s.fastT=0;}
      else if(s.in&&!s.done&&p.x>Z.x1){s.done=1;if(!s.bad)praise('slowOK');}}
    if(Z.k==='uturn'&&inside&&onMain&&J.dir===-1&&p.v>0.5&&!s.bad){s.bad=1;violate('uturn','',0);}
    if(Z.k==='minv'){if(inside&&onMain&&J.dir===1&&r.def.minV){s.inT=(s.inT||0)+dt;const lg=playerLeader(p,45);const slow=Math.abs(p.v)*KMH<r.def.minV-1;const excuse=!!lg.obj||J.N||(J.A&&J.A.dEdge<45)||J.t-J.dangerT<4||s.inT<7;
        if(slow&&!excuse){s.slowT=(s.slowT||0)+dt;if(s.slowT>4)violate('minSpeedSign',`${Math.round(Math.abs(p.v)*KMH)}km/h（最低速度${r.def.minV}km/h）`,30);}else s.slowT=0;}}}}
GOOD.hornOK='「警笛鳴らせ」の場所で警音器を鳴らした';GOOD.slowOK='「徐行」の場所を、すぐ止まれる速さで通った';
// ---- 教習 ----
function sgSetup(C){STAGE.sgCourse=C;STAGE.sgSeen=new Set();for(const s of SGST[C]){delete s.shown;delete s.in;delete s.done;delete s.horned;delete s.bad;delete s.fastT;delete s.inT;delete s.slowT;}sgCardHide();
  STAGE.tick=(dt)=>sgTick(dt);STAGE.judgeExtra=(dt)=>sgCheck(dt);STAGE.onAction=(k)=>{if(k==='horn'){for(const s of SGST[C])if(s.zone&&s.zone.k==='horn'&&PLAYER.x>=s.zone.x0&&PLAYER.x<=s.zone.x1)s.horned=1;}};
  STAGE.finishNote=()=>{const cat={A:'reg',B:['warn','inst'],C:['guide','aux']}[C];const cats=Array.isArray(cat)?cat:[cat];const all=SIGNDATA.filter(e=>cats.includes(e.c));const seen=all.filter(e=>STAGE.sgSeen.has(e.no)).length;
    return{checksTitle:'このコースで見た標識',checks:cats.map(c=>{const a=SIGNDATA.filter(e=>e.c===c);const n=a.filter(e=>STAGE.sgSeen.has(e.no)).length;return{bad:n<a.length,t:`${SIGNCAT[c]}：${a.length}種類のうち ${n}種類`};}),note:seen<all.length?'見のがした標識は、メニューの「標識」タブの図鑑で確かめられます。':'このコースの標識をすべて見ました。図鑑とクイズでも確かめましょう。'};};}
STAGES.push(
 {id:'sg1',cat:'sign',map:'signA',name:'規制標識の道（61種類）',desc:'禁止・指定の標識。一時停止・進入禁止・指定方向外進行禁止・徐行・警笛鳴らせ・最低速度などを実際の道で守る',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'郊外の「規制標識の道」を東へ走ります。道路の状況に合う標識は実際に立っていて、その標識に従って走ります。それ以外の標識は、道ばたの展示板に見本として並べています。近づくと画面に標識の名前と意味が出ます。',
  points:['赤い丸の標識は主に「禁止」、青い丸は「指定」。「この車も対象」かどうかを確かめます','進入禁止・通行止め・歩行者等専用・自転車専用などの道には入りません（第8条第1項）','「一時停止」は停止線の直前で止まる（第43条）。踏切の手前でも止まって左右を確かめる（第33条）','「指定方向外進行禁止」の交差点では矢印の方向にしか進めない','「徐行」はすぐ止まれる速さ（第42条。ゲームでは10km/h以下）。「警笛鳴らせ」の場所では警音器を鳴らす（第54条第1項。{hn}）','「転回禁止」の区間ではUターンしない。「最低速度」の区間では、危険を防止するためやむを得ないときなどを除き、その速さより遅く走らない（第23条）','絵は簡略化したイメージです。名称・番号・意味は標識令（2026年9月1日施行の版）によります'],
  start:['A',-975,1],goal:['A',955,1],way:[],
  setup(){sgSetup('A');}},
 {id:'sg2',cat:'sign',map:'signB',name:'警戒・指示標識の道（40種類）',desc:'黄色のひし形は「この先に注意」。カーブ・踏切・信号・学校・坂・工事。青い四角の指示標識も',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'「警戒・指示標識の道」を東へ走ります。黄色のひし形の警戒標識は、この先の道路の状況や危険を前もって知らせます。実際にカーブ・踏切・信号・学校・坂・工事があります。',
  points:['警戒標識（黄色のひし形）を見たら、その先の状況を予想して速度を落とす準備をします','踏切の手前では一時停止して左右を確かめます（第33条）','学校の近くでは子どもの飛び出しに注意。横断歩道では渡ろうとしている人に道を譲ります（第38条第1項）','指示標識（主に青い四角）は「してよいこと」や「場所」を示します（駐車可・優先道路・横断歩道など）','絵は簡略化したイメージです'],
  start:['B',-975,1],goal:['B',960,1],way:[],
  setup(){sgSetup('B');const X=XWALKS.find(x=>x.mid);if(X)evPedWaiting(X,'kid',true);}},
 {id:'sg3',cat:'sign',map:'signC',name:'案内・補助標識の道（90種類）',desc:'行き先・距離・施設を知らせる案内標識と、本標識の下に付く補助標識を見ながら走る',env:'day',envLabel:'昼・晴れ',autoReady:true,
  intro:'「案内・補助標識の道」を東へ走ります。案内標識（市町村・方面と距離・国道番号・高速道路の出口・施設など）と、本標識の下に付ける補助標識を、道ばたに見本として並べています。',
  points:['案内標識は、一般道路では主に青地、高速道路などでは主に緑地に白の文字（標識令 別表第二）','行き先の方向は早めに確かめ、車線の位置取りや合図の準備をします','補助標識は本標識の意味を補います（区間・時間・車両の種類など）。本標識とあわせて読みます','地名・路線番号は架空です。絵は簡略化したイメージです'],
  start:['C',-975,1],goal:['C',960,1],way:[],
  setup(){sgSetup('C');}},
);
