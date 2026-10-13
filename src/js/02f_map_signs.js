// ===== 02f_map_signs.js : 標識の練習コース（みなみ郊外の道。コースごとに1本の道と脇道） =====
// A：規制標識の道／B：警戒・指示標識の道／C：案内・補助標識の道。どれも西から東へ走る（z=0）。
// 交差点の配置・道路の形はゲーム独自のものです。
const SGN={X0:-1000,X1:1000,SIDE:100,RAILX:-200,
  // 本線の交差点（x）と脇道：k 'X'=十字、'N'/'S'=北/南だけの丁字。n/s：脇道の性質
  A:[{x:-860,k:'N',n:{oneway:-1}},{x:-720,k:'X',stopMain:1},{x:-580,k:'S',s:{closed:'302'}},{x:-450,k:'N',n:{pedOnly:1}},{x:-320,k:'X',noTurn:['R']},{x:-140,k:'N',n:{closed:'325の2'}},
     {x:0,k:'X'},{x:150,k:'S'},{x:360,k:'N',n:{oneway:1}},{x:560,k:'X'},{x:720,k:'S',s:{closed:'304'}},{x:880,k:'X'}],
  B:[{x:-860,k:'X'},{x:-720,k:'N'},{x:-580,k:'N',n:{y:1}},{x:-320,k:'X'},{x:-40,k:'X',signal:1},{x:140,k:'S'},{x:300,k:'N'},{x:520,k:'X'},{x:720,k:'S'},{x:880,k:'X'}],
  C:[{x:-820,k:'X'},{x:-640,k:'S'},{x:-460,k:'X'},{x:-280,k:'N'},{x:-100,k:'X'},{x:80,k:'S'},{x:260,k:'X'},{x:440,k:'N'},{x:620,k:'X'},{x:800,k:'S'}],
};
// 本線の区間ごとの性質（区間 i は i 番目と i+1 番目の点の間。0 は西の端から最初の交差点まで）
const SGN_SEG={
  A:[{limit:40},{limit:40},{limit:30},{limit:30},{limit:30},{limit:40,rail:1},{limit:40,nF:2,arrowsF:[['L','S'],['R']]},{limit:40},
     {limit:30,curve:1},{limit:30,narrow:1},{limit:40},{limit:50,minV:30},{limit:40}],
  B:[{limit:40},{limit:40},{limit:40},{limit:40,scurve:1},{limit:40,rail:1},{limit:30,xw:60},{limit:40},{limit:40,narrow:1},{limit:40,hill:1},{limit:40,zcurve:1},{limit:40,work:1}],
  C:[{limit:30},{limit:30},{limit:30},{limit:30},{limit:30,rail:1},{limit:30},{limit:30},{limit:30},{limit:30},{limit:30},{limit:30}],
};
function signsDef(C){const nodes=[],roads=[];const z=0;const N=(id,x,zz,o={})=>{const n=Object.assign({id,x,z:zz,kind:'x'},o);nodes.push(n);return n;};
  const main=(id,name,from,to,path,o={})=>roads.push(Object.assign({id,name,group:C,type:'COL',from,to,path,nF:1,nB:1,w:3.0,sh:[0.75,0],center:'white',walk:[2,2],limit:40,feats:[],course:C,noAutoLimit:true},o));
  const side=(id,from,to,path,o={})=>roads.push(Object.assign({id,name:'脇道',group:id,type:'RES',from,to,path,nF:1,nB:1,w:2.75,sh:[0.5,0],center:'none',walk:[0,0],limit:0,feats:[],sideRoad:true},o));
  const pts=SGN[C];const segs=SGN_SEG[C];const name={A:'規制標識の道',B:'警戒・指示標識の道',C:'案内・補助標識の道'}[C];
  const ids=[N(C+'W',SGN.X0,z,{kind:'portal'}).id];
  pts.forEach((q,i)=>{const id=C+(i+1);const o={};if(q.stopMain)o.stop=['W','E'];if(q.signal){o.signal={arrow:false,g:{NS:14,EW:20}};o.xwalk=true;}
    if(q.noTurn)o.noTurn={W:q.noTurn};const nd=N(id,q.x,z,o);ids.push(id);
    for(const sd of['n','s']){if(!(q.k==='X'||(q.k==='N'&&sd==='n')||(q.k==='S'&&sd==='s')))continue;const so=q[sd]||{};const zz=z+(sd==='n'?-SGN.SIDE:SGN.SIDE);
      const pn=N(id+sd+'P',q.x+(so.y?40:0),zz,{kind:'portal'});let path=[[q.x,z],[q.x,zz]];const d={nF:1,nB:1};
      if(so.y){path=[[q.x,z],[q.x,z-16],[q.x+40,z-60],[q.x+40,zz]];d.r=[0,10,40,0];}
      if(so.oneway)Object.assign(d,so.oneway>0?{nF:1,nB:0,w:3.0,sh:[0.6,0.6]}:{nF:0,nB:1,w:3.0,sh:[0.6,0.6]});
      if(so.pedOnly)Object.assign(d,{pedOnly:true,w:2.6});if(so.closed)d.closedBy=so.closed;
      side(id+sd,id,pn.id,path,d);}
    // 交差点の一時停止：脇道の側（本線が優先）。入るだけの一方通行・歩行者用道路は除く
    if(!q.stopMain&&!q.signal){const st=[];if(q.k!=='S'&&!(q.n&&(q.n.pedOnly||q.n.oneway>0)))st.push('N');if(q.k!=='N'&&!(q.s&&q.s.oneway>0))st.push('S');nd.stop=st;}});
  ids.push(N(C+'E',SGN.X1,z,{kind:'portal'}).id);
  for(let i=0;i<ids.length-1;i++){const a=nodes.find(n=>n.id===ids[i]),b=nodes.find(n=>n.id===ids[i+1]);const sg=segs[i]||{};const o={limit:sg.limit||40,seg:i};
    let path=[[a.x,z],[b.x,z]];const m=(a.x+b.x)/2;
    if(sg.curve){path=[[a.x,z],[a.x+50,z],[m-40,z-36],[m+40,z-36],[b.x-50,z],[b.x,z]];o.r=[0,24,24,24,24,0];o.blindCurve=true;}
    if(sg.scurve){path=[[a.x,z],[a.x+50,z],[m-50,z+42],[m+50,z+42],[b.x-50,z],[b.x,z]];o.r=[0,45,45,45,45,0];}
    if(sg.zcurve){path=[[a.x,z],[m-30,z],[m-30,z+22],[m+30,z+22],[m+30,z],[b.x,z]];o.r=[0,11,11,11,11,0];}
    if(sg.narrow){o.w=2.6;o.sh=[0.3,0];o.center='none';o.walk=[0,0];o.narrowSeg=true;}
    if(sg.nF){o.nF=sg.nF;o.arrows={F:sg.arrowsF};}
    if(sg.hill){o.prof=[[55,5],[100,7.5],[140,5],[192,0]];o.ySmooth=30;o.hill=true;}
    if(sg.rail)o.feats=[{type:'rail',abs:SGN.RAILX,w:10}];
    if(sg.xw)o.feats=[{type:'xwalk',abs:a.x+sg.xw,w:4}];
    if(sg.minV)o.minV=sg.minV;if(sg.work)o.work=true;
    main(C+'_'+i,name,ids[i],ids[i+1],path,o);}
  return{nodes,roads,links:[]};}
