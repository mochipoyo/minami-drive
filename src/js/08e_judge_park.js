// ===== 08e_judge_park.js : 駐車の課題（方向変換・縦列駐車・バック駐車・路上の駐車場所）と後退時の確認 =====
// 減点の値は、警察庁「運転免許技能試験に係る採点基準」（令和8年2月4日）の場内の値を参考にしたゲーム独自のものです。
const PK={};
function pointInPoly(P,x,z){let ins=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],zi=P[i][1],xj=P[j][0],zj=P[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-9)+xi))ins=!ins;}return ins;}
function carInPoly(p,poly,inset=0){return corners(p.x,p.z,p.h,p.L,p.W,inset).every(c=>pointInPoly(poly,c.x,c.z));}
function parkTaskReset(task,opt={}){for(const k in PK)delete PK[k];Object.assign(PK,{task,phase:0,kiri:0,lastDir:0,revCount:0,done:false,stillT:0,doneT:0,fail:false},opt);}
// 後退の直前に、後ろを直接目で見たか（採点基準：安全不確認「後退する直前に…直接目視」）
function backCheck(p,dt){if(p.v<-0.3&&J.revDir!==-1){J.revDir=-1;if(!(p.t-(p.lastLook.B||-99)<5))violate('backLook','',8);else praise('backLookOK');}
  else if(p.v>0.3)J.revDir=1;}
// 駐車の課題の進み具合（STAGE.judgeExtra から毎フレーム）
function parkTaskTick(dt){const p=PLAYER;if(!PK.task||STAGE.over)return;const moving=Math.abs(p.v)>0.25;const dir=p.v>0.25?1:p.v<-0.25?-1:0;
  // 切り返しの数え方：後退して入れる課題で、入れ終わる前に前進した回数（1回目は減点なし）
  if(dir&&dir!==PK.lastDir){if(PK.phase===0&&dir<0&&(!PK.zone||PK.zone(p))){PK.phase=1;coach(PK.msgRev||'ゆっくり後退します。ミラーと目で後ろを確かめながら。',6,1);}
    else if(PK.phase===1&&dir>0){PK.kiri++;if(!PK.noKiri){if(PK.kiri>=2)violate('kiri',`切り返し ${PK.kiri}回目`,0);if(PK.kiri>=4){PK.fail=true;crash('切り返しが4回になりました（通過できない扱い）。もう一度、ハンドルを切り始める位置を変えてやってみましょう。');return;}}}
    PK.lastDir=dir;}
  if(PK.phase===1&&!PK.done){const inside=PK.inside(p);if(inside&&!moving){PK.stillT+=dt;if(PK.stillT>0.8){PK.done=true;PK.phase=2;praise(PK.good||'parkOK');coach(PK.msgDone,9,1);PK.onDone&&PK.onDone();}}else PK.stillT=0;}
  if(PK.phase===2&&PK.finish&&PK.finish(p))finishStage({note:PK.finishNote});}
// 駐車の課題での縁石・ポール・車への接触
function parkContact(hit){const p=PLAYER;if(hit.solid&&hit.obj){const o=hit.obj;if(o.parkedCar&&Math.abs(p.v)>1.2){crash('止まっている車に衝突しました。');return true;}violate('touch',o.label||'',3);return true;}
  if(PK.task==='slot'&&PK.done)return true;// 縦列駐車を止め終えたあとの縁石への軽い接触は数えない（ゲームの単純化）
  violate('datsurin','',2.5);return true;}
// 路上の駐車場所の判定（第44条・第45条・第47条）
function streetParkJudge(){const p=PLAYER;const r=J.road;const res=[];if(!r||r.def.group!=='R1'||J.dir!==1){return{ok:false,msg:'道路の左側（進む向きの左）に、左端に沿って止めます（第47条第2項）。',res};}
  const x0=p.x-p.L/2,x1=p.x+p.L/2;const near=(a,b,m)=>x1>a-m&&x0<b+m;
  const add=(bad,ok,ng,law)=>res.push({bad,t:bad?ng:ok,law});
  const n=NET.nodeById.R2J;add(near(n.x-n.hx,n.x+n.hx,5),'交差点の側端から5m以上はなれている','交差点の側端から5m以内（駐車も停車もできない）','第44条第1項第2号');
  const X=XWALKS.find(x=>x.mid&&x.r.def.group==='R1');if(X){const c=X.a.x,w=(X.f.w||4)/2;add(near(c-w,c+w,5),'横断歩道とその前後5m以内に入っていない','横断歩道とその前後5m以内（駐車も停車もできない）','第44条第1項第1号・第3号');}
  add(near(PARK.bus.x,PARK.bus.x,10),'バス停の標示板から10m以上はなれている','バス停の標示板から10m以内（運行時間中は駐車も停車もできない）','第44条第1項第5号');
  const m=NET.nodeById.LINJ;const fr=Math.max(...m.fil.map(f=>f.r),0);add(near(m.x-m.hx-fr,m.x+m.hx+fr,3),'駐車場の出入口から3m以上はなれている','駐車場など道路外の施設の出入口から3m以内（駐車できない）','第45条第1項第1号');
  add(near(PARK.hydrant.x,PARK.hydrant.x,5),'消火栓から5m以上はなれている','消火栓から5m以内（駐車できない）','第45条第1項第4号');
  add(x1>PARK.NOPARK[0],'「駐車禁止」の標識の区間ではない','「駐車禁止」の標識（ここから）の区間（駐車できない）','第45条第1項');
  const gap=leftEdgeGap(p);add(gap>0.6,`道路の左端に沿っている（左端まで約${gap.toFixed(1)}m）`,`道路の左端まで約${gap.toFixed(1)}m（左端に沿って止める。ゲームでは0.6m以内）`,'第47条第2項');
  const[lo,hi]=r.tRange(J.s);const right=hi-(J.t2+p.W/2);add(right<3.5,`右側の余地 約${right.toFixed(1)}m（3.5m以上）`,`右側の余地が約${right.toFixed(1)}m（3.5m以上必要）`,'第45条第2項');
  const ok=res.every(q=>!q.bad);return{ok,res,right,gap};}
