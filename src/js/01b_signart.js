// ===== 01b_signart.js : 道路標識の絵（キャンバスで描く）とアトラス =====
// 図は見分けやすさを優先した簡略表現。色の名前は標識令の別表第二（配色の区分）に合わせる。
const SC={red:'#d7192a',blue:'#1f56a8',white:'#ffffff',yellow:'#ffcd00',black:'#111111',green:'#0b7a43',purple:'#6b3fa0',brown:'#7a4a2a'};
const SIGNART={};// id -> {draw(x,S), aspect(幅/高さ)}
function sgDef(id,draw,aspect=1){SIGNART[id]={draw,aspect};}
// ---- 部品 ----
function sgCircle(x,S,ground,ring,rim=SC.white,ringW=0.105){const c=S/2;x.fillStyle=rim;x.beginPath();x.arc(c,c,S*0.5,0,7);x.fill();
  x.fillStyle=ring||ground;x.beginPath();x.arc(c,c,S*0.475,0,7);x.fill();if(ring){x.fillStyle=ground;x.beginPath();x.arc(c,c,S*(0.475-ringW),0,7);x.fill();}}
function sgSlash(x,S,col=SC.red,w=0.1,both=false){const c=S/2,r=S*0.38;x.save();x.beginPath();x.arc(c,c,S*0.4,0,7);x.clip();x.strokeStyle=col;x.lineWidth=S*w;x.lineCap='butt';
  x.beginPath();x.moveTo(c-r*0.75,c-r*0.75);x.lineTo(c+r*0.75,c+r*0.75);x.stroke();if(both){x.beginPath();x.moveTo(c+r*0.75,c-r*0.75);x.lineTo(c-r*0.75,c+r*0.75);x.stroke();}x.restore();}
function sgProhib(x,S){sgCircle(x,S,SC.white,SC.red);}
function sgBlue(x,S){sgCircle(x,S,SC.blue,null);x.strokeStyle=SC.white;x.lineWidth=S*0.03;x.beginPath();x.arc(S/2,S/2,S*0.455,0,7);x.stroke();}
function sgDiamond(x,S){const c=S/2;x.save();x.translate(c,c);x.rotate(Math.PI/4);const a=S*0.69;x.fillStyle=SC.yellow;roundRect(x,-a/2,-a/2,a,a,S*0.035);x.fill();
  x.strokeStyle=SC.black;x.lineWidth=S*0.022;roundRect(x,-a/2+S*0.03,-a/2+S*0.03,a-S*0.06,a-S*0.06,S*0.025);x.stroke();x.restore();}
function sgSquare(x,S,col=SC.blue){x.fillStyle=col;roundRect(x,S*0.04,S*0.04,S*0.92,S*0.92,S*0.05);x.fill();x.strokeStyle=SC.white;x.lineWidth=S*0.025;roundRect(x,S*0.075,S*0.075,S*0.85,S*0.85,S*0.03);x.stroke();}
function roundRect(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.lineTo(a+w-r,b);x.quadraticCurveTo(a+w,b,a+w,b+r);x.lineTo(a+w,b+h-r);x.quadraticCurveTo(a+w,b+h,a+w-r,b+h);x.lineTo(a+r,b+h);x.quadraticCurveTo(a,b+h,a,b+h-r);x.lineTo(a,b+r);x.quadraticCurveTo(a,b,a+r,b);x.closePath();}
function sgInvTri(x,S,fill,rim){const m=S*0.04;const h=S*0.86;x.fillStyle=fill;x.beginPath();x.moveTo(m,S*0.07);x.lineTo(S-m,S*0.07);x.lineTo(S/2,S*0.07+h);x.closePath();x.fill();
  if(rim){x.strokeStyle=rim;x.lineWidth=S*0.025;const k=S*0.07;x.beginPath();x.moveTo(m+k*1.7,S*0.07+k*0.6);x.lineTo(S-m-k*1.7,S*0.07+k*0.6);x.lineTo(S/2,S*0.07+h-k*1.8);x.closePath();x.stroke();}}
function arrowPath(x,pts,w,head){// pts: 折れ線、最後が矢先
  x.lineWidth=w;x.lineJoin='miter';x.lineCap='butt';x.beginPath();x.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++)x.lineTo(pts[i][0],pts[i][1]);
  const a=pts[pts.length-2],b=pts[pts.length-1];const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);const ux=dx/L,uy=dy/L;const hb=[b[0]-ux*head*1.05,b[1]-uy*head*1.05];x.lineTo(hb[0],hb[1]);x.stroke();
  x.beginPath();x.moveTo(b[0],b[1]);x.lineTo(hb[0]-uy*head*0.85,hb[1]+ux*head*0.85);x.lineTo(hb[0]+uy*head*0.85,hb[1]-ux*head*0.85);x.closePath();x.fill();}
// 記号：車（横向き）
function symCar(x,cx,cy,w,col){const h=w*0.42;x.fillStyle=col;x.beginPath();x.moveTo(cx-w/2,cy+h*0.25);x.lineTo(cx-w/2,cy-h*0.05);x.lineTo(cx-w*0.36,cy-h*0.1);x.lineTo(cx-w*0.22,cy-h*0.55);x.lineTo(cx+w*0.2,cy-h*0.55);x.lineTo(cx+w*0.34,cy-h*0.1);x.lineTo(cx+w/2,cy-h*0.02);x.lineTo(cx+w/2,cy+h*0.25);x.closePath();x.fill();
  x.fillStyle=SC.white;x.fillRect(cx-w*0.17,cy-h*0.46,w*0.15,h*0.3);x.fillRect(cx+w*0.02,cy-h*0.46,w*0.15,h*0.3);
  x.fillStyle=col;for(const k of[-0.28,0.28]){x.beginPath();x.arc(cx+w*k,cy+h*0.3,h*0.22,0,7);x.fill();}x.fillStyle=SC.white;for(const k of[-0.28,0.28]){x.beginPath();x.arc(cx+w*k,cy+h*0.3,h*0.08,0,7);x.fill();}}
function symTruck(x,cx,cy,w,col){const h=w*0.5;x.fillStyle=col;x.fillRect(cx-w/2,cy-h*0.6,w*0.66,h*0.75);x.beginPath();x.moveTo(cx+w*0.18,cy-h*0.3);x.lineTo(cx+w*0.38,cy-h*0.3);x.lineTo(cx+w/2,cy-h*0.05);x.lineTo(cx+w/2,cy+h*0.15);x.lineTo(cx+w*0.18,cy+h*0.15);x.closePath();x.fill();
  for(const k of[-0.3,-0.12,0.32]){x.beginPath();x.arc(cx+w*k,cy+h*0.22,h*0.15,0,7);x.fill();}}
function symBus(x,cx,cy,w,col){const h=w*0.45;x.fillStyle=col;roundRect(x,cx-w/2,cy-h*0.55,w,h*0.8,h*0.08);x.fill();x.fillStyle=SC.white;for(let i=0;i<4;i++)x.fillRect(cx-w*0.42+i*w*0.21,cy-h*0.42,w*0.16,h*0.26);
  x.fillStyle=col;for(const k of[-0.3,0.3]){x.beginPath();x.arc(cx+w*k,cy+h*0.28,h*0.17,0,7);x.fill();}}
function symBike(x,cx,cy,w,col){const r=w*0.2;x.strokeStyle=col;x.lineWidth=w*0.06;for(const k of[-0.28,0.28]){x.beginPath();x.arc(cx+w*k,cy+r*0.6,r,0,7);x.stroke();}
  x.beginPath();x.moveTo(cx-w*0.28,cy+r*0.6);x.lineTo(cx-w*0.05,cy-r*0.4);x.lineTo(cx+w*0.2,cy-r*0.4);x.lineTo(cx+w*0.28,cy+r*0.6);x.moveTo(cx-w*0.05,cy-r*0.4);x.lineTo(cx,cy+r*0.6);x.lineTo(cx+w*0.2,cy-r*0.4);
  x.moveTo(cx-w*0.1,cy-r*0.75);x.lineTo(cx+w*0.02,cy-r*0.75);x.moveTo(cx+w*0.2,cy-r*0.4);x.lineTo(cx+w*0.17,cy-r*0.95);x.lineTo(cx+w*0.27,cy-r*0.95);x.stroke();}
function symMoto(x,cx,cy,w,col){const r=w*0.18;x.strokeStyle=col;x.fillStyle=col;x.lineWidth=w*0.07;for(const k of[-0.3,0.3]){x.beginPath();x.arc(cx+w*k,cy+r*0.8,r,0,7);x.stroke();}
  x.beginPath();x.moveTo(cx-w*0.25,cy+r*0.2);x.lineTo(cx+w*0.15,cy+r*0.2);x.lineTo(cx+w*0.3,cy+r*0.8);x.stroke();x.beginPath();x.ellipse(cx-w*0.05,cy-r*0.2,w*0.2,r*0.45,0,0,7);x.fill();
  x.beginPath();x.moveTo(cx+w*0.15,cy+r*0.2);x.lineTo(cx+w*0.22,cy-r*0.8);x.stroke();}
function symPed(x,cx,cy,h,col,walk=1,dir=1){x.fillStyle=col;x.strokeStyle=col;const s=h/10;x.beginPath();x.arc(cx+dir*s*0.6,cy-s*3.9,s*0.95,0,7);x.fill();
  x.lineCap='round';x.lineWidth=s*1.25;x.beginPath();x.moveTo(cx+dir*s*0.4,cy-s*2.6);x.lineTo(cx,cy+s*0.6);x.stroke();
  x.lineWidth=s*1.05;x.beginPath();x.moveTo(cx,cy+s*0.6);x.lineTo(cx+dir*s*1.5*walk,cy+s*3.4);x.lineTo(cx+dir*s*2.0*walk,cy+s*3.6);x.moveTo(cx,cy+s*0.6);x.lineTo(cx-dir*s*1.2*walk,cy+s*2.4);x.lineTo(cx-dir*s*1.8*walk,cy+s*4.0);x.stroke();
  x.beginPath();x.moveTo(cx+dir*s*0.3,cy-s*2.2);x.lineTo(cx+dir*s*1.7,cy-s*0.6);x.moveTo(cx+dir*s*0.3,cy-s*2.2);x.lineTo(cx-dir*s*1.3,cy-s*0.9);x.stroke();x.lineCap='butt';}
function symKids(x,cx,cy,h,col){symPed(x,cx-h*0.16,cy,h,col,0.8,1);symPed(x,cx+h*0.22,cy+h*0.12,h*0.75,col,0.8,1);}
// ---- 標識の定義 ----
for(const v of[20,30,40,50,60,70,80,100,110,120])sgDef('s'+v,(x,S)=>{sgProhib(x,S);txt(x,String(v),S/2,S*0.53,S*(v>=100?0.4:0.5),SC.blue,FONT_NUM,'center','bold');});
sgDef('min50',(x,S)=>{sgBlue(x,S);txt(x,'50',S/2,S*0.46,S*0.48,SC.white,FONT_NUM,'center','bold');x.fillStyle=SC.white;x.fillRect(S*0.28,S*0.7,S*0.44,S*0.06);});
sgDef('stop',(x,S)=>{sgInvTri(x,S,SC.red,SC.white);txt(x,'止まれ',S/2,S*0.32,S*0.19,SC.white,FONT_JP,'center','bold');txt(x,'STOP',S/2,S*0.5,S*0.11,SC.white,FONT_NUM,'center','bold');});
sgDef('jokou',(x,S)=>{sgInvTri(x,S,SC.red,null);const m=S*0.04,k=S*0.1;x.fillStyle=SC.white;x.beginPath();x.moveTo(m+k*1.6,S*0.07+k*0.75);x.lineTo(S-m-k*1.6,S*0.07+k*0.75);x.lineTo(S/2,S*0.93-k*1.6);x.closePath();x.fill();
  txt(x,'徐行',S/2,S*0.33,S*0.17,SC.blue,FONT_JP,'center','bold');txt(x,'SLOW',S/2,S*0.48,S*0.09,SC.blue,FONT_NUM,'center','bold');});
sgDef('noentry',(x,S)=>{sgCircle(x,S,SC.red,null);x.fillStyle=SC.white;x.fillRect(S*0.17,S*0.42,S*0.66,S*0.16);});
sgDef('noparking',(x,S)=>{sgCircle(x,S,SC.blue,SC.red,SC.white,0.09);sgSlash(x,S,SC.red,0.09);});
sgDef('nostopping',(x,S)=>{sgCircle(x,S,SC.blue,SC.red,SC.white,0.09);sgSlash(x,S,SC.red,0.09,true);});
sgDef('noUturn',(x,S)=>{sgProhib(x,S);x.strokeStyle=SC.blue;x.fillStyle=SC.blue;arrowPath(x,[[S*0.6,S*0.74],[S*0.6,S*0.36],[S*0.6,S*0.33],[S*0.52,S*0.27],[S*0.42,S*0.27],[S*0.36,S*0.33],[S*0.36,S*0.62]],S*0.07,S*0.09);sgSlash(x,S);});
sgDef('closed',(x,S)=>{sgProhib(x,S);txt(x,'通行止',S/2,S*0.5,S*0.19,SC.blue,FONT_JP,'center','bold');sgSlash(x,S);});
sgDef('novehicle',(x,S)=>{sgProhib(x,S);sgSlash(x,S);});
sgDef('nocar',(x,S)=>{sgProhib(x,S);symCar(x,S/2,S*0.52,S*0.56,SC.blue);sgSlash(x,S);});
sgDef('notruck',(x,S)=>{sgProhib(x,S);symTruck(x,S/2,S*0.53,S*0.56,SC.blue);sgSlash(x,S);});
sgDef('nobike',(x,S)=>{sgProhib(x,S);symBike(x,S/2,S*0.53,S*0.56,SC.blue);sgSlash(x,S);});
sgDef('nomoto',(x,S)=>{sgProhib(x,S);symMoto(x,S/2,S*0.52,S*0.56,SC.blue);sgSlash(x,S);});
sgDef('noovertake',(x,S)=>{sgProhib(x,S);// 追越しのための右側部分はみ出し通行禁止（簡略）
  symCar(x,S*0.42,S*0.62,S*0.3,SC.blue);x.save();x.translate(S*0.57,S*0.42);x.rotate(-Math.PI/2);symCar(x,0,0,S*0.3,SC.red);x.restore();sgSlash(x,S);});
sgDef('car_only',(x,S)=>{sgBlue(x,S);symCar(x,S/2,S*0.52,S*0.58,SC.white);});
sgDef('ped_only',(x,S)=>{sgBlue(x,S);symPed(x,S*0.42,S*0.5,S*0.52,SC.white);symPed(x,S*0.62,S*0.56,S*0.38,SC.white);});
sgDef('bike_only',(x,S)=>{sgBlue(x,S);symBike(x,S/2,S*0.53,S*0.58,SC.white);});
for(const[k,arr]of Object.entries({dirS:['S'],dirL:['L'],dirR:['R'],dirSL:['S','L'],dirSR:['S','R'],dirLR:['L','R']}))sgDef(k,(x,S)=>{sgBlue(x,S);x.strokeStyle=SC.white;x.fillStyle=SC.white;const w=S*0.075,hd=S*0.1;
  const c=S/2,b=S*0.74;for(const a of arr){if(a==='S')arrowPath(x,[[c,b],[c,S*0.2]],w,hd);if(a==='L')arrowPath(x,[[c,b],[c,S*0.46],[S*0.24,S*0.46]],w,hd);if(a==='R')arrowPath(x,[[c,b],[c,S*0.46],[S*0.76,S*0.46]],w,hd);}});
sgDef('roundabout',(x,S)=>{sgBlue(x,S);x.strokeStyle=SC.white;x.fillStyle=SC.white;const c=S/2,r=S*0.22;for(let i=0;i<3;i++){const a0=i*2.094-0.4,a1=a0+1.35;x.lineWidth=S*0.07;x.beginPath();x.arc(c,c,r,a0,a1);x.stroke();
    const ax=c+Math.cos(a1)*r,ay=c+Math.sin(a1)*r;const tx=-Math.sin(a1),ty=Math.cos(a1);x.beginPath();x.moveTo(ax+tx*S*0.09,ay+ty*S*0.09);x.lineTo(ax-ty*S*0.07,ay+tx*S*0.07);x.lineTo(ax+ty*S*0.07,ay-tx*S*0.07);x.closePath();x.fill();}});
sgDef('oneway',(x,S)=>{const w=S,h=S*0.58;const y0=(S-h)/2;x.fillStyle=SC.blue;roundRect(x,0,y0,w,h,S*0.04);x.fill();x.strokeStyle=SC.white;x.lineWidth=S*0.02;roundRect(x,S*0.03,y0+S*0.03,w-S*0.06,h-S*0.06,S*0.02);x.stroke();
  x.fillStyle=SC.white;x.beginPath();x.moveTo(S*0.08,S*0.42);x.lineTo(S*0.7,S*0.42);x.lineTo(S*0.7,S*0.33);x.lineTo(S*0.92,S*0.5);x.lineTo(S*0.7,S*0.67);x.lineTo(S*0.7,S*0.58);x.lineTo(S*0.08,S*0.58);x.closePath();x.fill();
  txt(x,'一方通行',S*0.4,S*0.505,S*0.12,SC.blue,FONT_JP,'center','bold');},1);
sgDef('xwalk',(x,S)=>{// 横断歩道（五角形）
  x.fillStyle=SC.blue;x.beginPath();x.moveTo(S/2,S*0.04);x.lineTo(S*0.95,S*0.36);x.lineTo(S*0.95,S*0.96);x.lineTo(S*0.05,S*0.96);x.lineTo(S*0.05,S*0.36);x.closePath();x.fill();
  x.strokeStyle=SC.white;x.lineWidth=S*0.022;x.beginPath();x.moveTo(S/2,S*0.09);x.lineTo(S*0.91,S*0.38);x.lineTo(S*0.91,S*0.92);x.lineTo(S*0.09,S*0.92);x.lineTo(S*0.09,S*0.38);x.closePath();x.stroke();
  x.fillStyle=SC.white;for(let i=0;i<5;i++){x.beginPath();x.moveTo(S*(0.16+i*0.14),S*0.86);x.lineTo(S*(0.24+i*0.14),S*0.86);x.lineTo(S*(0.26+i*0.14),S*0.78);x.lineTo(S*(0.18+i*0.14),S*0.78);x.closePath();x.fill();}
  symPed(x,S*0.5,S*0.53,S*0.42,SC.white,1,1);});
sgDef('rail',(x,S)=>{sgDiamond(x,S);x.fillStyle=SC.black;// 踏切あり（電車の図）
  x.fillRect(S*0.3,S*0.42,S*0.4,S*0.2);x.fillRect(S*0.34,S*0.62,S*0.32,S*0.03);x.fillStyle=SC.yellow;x.fillRect(S*0.34,S*0.45,S*0.09,S*0.08);x.fillRect(S*0.46,S*0.45,S*0.09,S*0.08);x.fillRect(S*0.58,S*0.45,S*0.08,S*0.08);
  x.strokeStyle=SC.black;x.lineWidth=S*0.015;x.beginPath();x.moveTo(S*0.5,S*0.42);x.lineTo(S*0.45,S*0.34);x.lineTo(S*0.55,S*0.34);x.stroke();});
sgDef('school',(x,S)=>{sgDiamond(x,S);symKids(x,S*0.5,S*0.5,S*0.4,SC.black);});
sgDef('merge',(x,S)=>{sgDiamond(x,S);x.strokeStyle=SC.black;x.fillStyle=SC.black;arrowPath(x,[[S*0.54,S*0.76],[S*0.54,S*0.26]],S*0.06,S*0.08);x.lineWidth=S*0.05;x.beginPath();x.moveTo(S*0.32,S*0.74);x.quadraticCurveTo(S*0.36,S*0.5,S*0.54,S*0.45);x.stroke();});
sgDef('curveR',(x,S)=>{sgDiamond(x,S);x.strokeStyle=SC.black;x.fillStyle=SC.black;x.lineWidth=S*0.06;x.beginPath();x.moveTo(S*0.42,S*0.76);x.lineTo(S*0.42,S*0.5);x.quadraticCurveTo(S*0.42,S*0.33,S*0.6,S*0.31);x.stroke();
  x.beginPath();x.moveTo(S*0.68,S*0.31);x.lineTo(S*0.58,S*0.23);x.lineTo(S*0.58,S*0.39);x.closePath();x.fill();});
sgDef('curveL',(x,S)=>{x.save();x.translate(S,0);x.scale(-1,1);SIGNART.curveR.draw(x,S);x.restore();});
sgDef('signalAhead',(x,S)=>{sgDiamond(x,S);x.fillStyle=SC.black;roundRect(x,S*0.28,S*0.43,S*0.44,S*0.15,S*0.02);x.fill();const cs=['#3ccf6f',SC.yellow,'#e3352c'];cs.forEach((c,i)=>{x.fillStyle=c;x.beginPath();x.arc(S*(0.36+i*0.14),S*0.505,S*0.045,0,7);x.fill();});});
sgDef('crossroad',(x,S)=>{sgDiamond(x,S);x.fillStyle=SC.black;x.fillRect(S*0.465,S*0.24,S*0.07,S*0.52);x.fillRect(S*0.24,S*0.465,S*0.52,S*0.07);});
sgDef('construction',(x,S)=>{sgDiamond(x,S);x.fillStyle=SC.black;symPed(x,S*0.47,S*0.5,S*0.4,SC.black,0.6,1);x.fillRect(S*0.55,S*0.6,S*0.16,S*0.05);});
sgDef('narrow',(x,S)=>{sgDiamond(x,S);x.fillStyle=SC.black;x.beginPath();x.moveTo(S*0.36,S*0.76);x.lineTo(S*0.36,S*0.56);x.lineTo(S*0.43,S*0.42);x.lineTo(S*0.43,S*0.24);x.lineTo(S*0.48,S*0.24);x.lineTo(S*0.48,S*0.44);x.lineTo(S*0.41,S*0.58);x.lineTo(S*0.41,S*0.76);x.closePath();x.fill();
  x.save();x.translate(S,0);x.scale(-1,1);x.beginPath();x.moveTo(S*0.36,S*0.76);x.lineTo(S*0.36,S*0.56);x.lineTo(S*0.43,S*0.42);x.lineTo(S*0.43,S*0.24);x.lineTo(S*0.48,S*0.24);x.lineTo(S*0.48,S*0.44);x.lineTo(S*0.41,S*0.58);x.lineTo(S*0.41,S*0.76);x.closePath();x.fill();x.restore();});
// 専用通行帯（327の4）・路線バス等優先通行帯（327の5）：見分けやすさを優先した簡略図
for(const[k,w]of[['sBusOnly','専用'],['sBusPrio','優先']])sgDef(k,(x,S)=>{sgSquare(x,S);x.fillStyle=SC.white;x.strokeStyle=SC.white;symBus(x,S*0.56,S*0.36,S*0.56,SC.white);
  arrowPath(x,[[S*0.2,S*0.22],[S*0.2,S*0.62]],S*0.06,S*0.09);txt(x,w,S*0.56,S*0.72,S*0.2,SC.white,FONT_JP,'center','bold');});
// 補助標識（白地に黒字）
function plateDraw(lines,col=SC.black){return(x,S)=>{const h=S*0.5;const y0=(S-h)/2;x.fillStyle=SC.white;x.fillRect(S*0.03,y0,S*0.94,h);x.strokeStyle='#333';x.lineWidth=S*0.015;x.strokeRect(S*0.03,y0,S*0.94,h);
  const n=lines.length;lines.forEach((t,i)=>txtFit(x,t,S/2,y0+h*(i+0.5)/n,S*(n>1?0.16:0.2),S*0.86,col,FONT_JP,'center','bold'));};}
for(const[k,lines]of Object.entries({p_school:['通学路'],p_7_9:['7-9'],p_here:['ここから'],p_till:['ここまで'],p_tunnel:['トンネル'],p_noovertake:['追越し禁止'],p_jam:['渋滞注意'],p_kids:['学校'],p_120:['120km/h区間']}))sgDef(k,plateDraw(lines));
// 路面表示（デカール：上が進行方向の先）
sgDef('tomare',(x,S)=>{x.clearRect(0,0,S,S);txt(x,'れ',S/2,S*0.18,S*0.3,'#fff',FONT_JP,'center','bold');txt(x,'ま',S/2,S*0.5,S*0.3,'#fff',FONT_JP,'center','bold');txt(x,'止',S/2,S*0.82,S*0.36,'#fff',FONT_JP,'center','bold');});
sgDef('diamond',(x,S)=>{x.clearRect(0,0,S,S);x.strokeStyle='#fff';x.lineWidth=S*0.08;x.beginPath();x.moveTo(S/2,S*0.05);x.lineTo(S*0.86,S/2);x.lineTo(S/2,S*0.95);x.lineTo(S*0.14,S/2);x.closePath();x.stroke();});
for(const v of[20,30,40,50,60,80])sgDef('m'+v,(x,S)=>{x.clearRect(0,0,S,S);txt(x,String(v),S/2,S/2,S*0.9,'#fff',FONT_NUM,'center','bold');});
// 路面の文字は手前から奥へ読む（下が手前）
sgDef('busonly',(x,S)=>{x.clearRect(0,0,S,S);txt(x,'専用',S/2,S*0.28,S*0.3,'#fff',FONT_JP,'center','bold');txt(x,'バス',S/2,S*0.72,S*0.3,'#fff',FONT_JP,'center','bold');});
sgDef('busprioMark',(x,S)=>{x.clearRect(0,0,S,S);txt(x,'優先',S/2,S*0.28,S*0.3,'#fff',FONT_JP,'center','bold');txt(x,'バス',S/2,S*0.72,S*0.3,'#fff',FONT_JP,'center','bold');});
// 自転車ナビマーク（青い自転車の絵と矢羽根）
sgDef('bikenav',(x,S)=>{x.clearRect(0,0,S,S);const b='#2b6fd6';x.fillStyle=b;x.beginPath();x.moveTo(S*0.5,S*0.02);x.lineTo(S*0.82,S*0.3);x.lineTo(S*0.66,S*0.3);x.lineTo(S*0.5,S*0.17);x.lineTo(S*0.34,S*0.3);x.lineTo(S*0.18,S*0.3);x.closePath();x.fill();
  x.save();x.translate(S/2,S*0.66);x.rotate(-Math.PI/2);symBike(x,0,0,S*0.62,'#fff');x.restore();x.save();x.translate(S/2,S*0.66);x.rotate(-Math.PI/2);x.globalCompositeOperation='source-atop';x.restore();
  x.save();x.translate(S/2,S*0.66);x.rotate(-Math.PI/2);symBike(x,0,0,S*0.56,b);x.restore();});
// 踏切警標（鉄道側の設備）
sgDef('crossbuck',(x,S)=>{x.clearRect(0,0,S,S);x.save();x.translate(S/2,S/2);for(const a of[0.72,-0.72]){x.save();x.rotate(a);for(let i=-6;i<6;i++){x.fillStyle=i%2?'#111':'#f2c200';x.fillRect(i*S*0.075,-S*0.07,S*0.075,S*0.14);}x.restore();}x.restore();});
sgDef('blank',(x,S)=>{x.fillStyle='#8d9298';x.fillRect(0,0,S,S);});
// ---- アトラス ----
const SIGNUV={};const SIGNPAGES=[];
function buildSignAtlas(ids,cell=192){const per=Math.floor(2048/cell);const pages=[];let k=0,page=null,ctx=null;
  const uniq=[...new Set(ids)].filter(id=>SIGNART[id]);
  for(const id of uniq){if(k%(per*per)===0){page=cvs(2048,2048);ctx=page.getContext('2d');pages.push(page);}const i=k%(per*per);const cx=(i%per)*cell,cy=Math.floor(i/per)*cell;
    ctx.save();ctx.translate(cx+6,cy+6);try{SIGNART[id].draw(ctx,cell-12);}catch(e){console.warn('sign',id,e);}ctx.restore();
    const pg=pages.length-1;SIGNUV[id]={page:pg,uv:[(cx+6)/2048,1-(cy+cell-6)/2048,(cx+cell-6)/2048,1-(cy+6)/2048]};k++;}
  SIGNPAGES.length=0;pages.forEach((p,i)=>{const t=texFrom(p,false);t.anisotropy=MAXANISO;t.generateMipmaps=true;SIGNPAGES.push(t);MAT['sign'+i]=new THREE.MeshLambertMaterial({map:t,transparent:true,alphaTest:0.35,vertexColors:true});
    MAT['decal'+i]=new THREE.MeshLambertMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6,vertexColors:true});});}
function signCell(id){const e=SIGNUV[id]||SIGNUV.blank;return e;}
// 標識画像（図鑑・HUD用）をcanvasで返す
function signCanvas(id,px=96){const c=cvs(px,px);const x=c.getContext('2d');if(SIGNART[id])SIGNART[id].draw(x,px);return c;}

