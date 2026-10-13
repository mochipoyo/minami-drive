// ===== 01c_signart2.js : 標識令 別表第一のすべての標識の絵（簡略化したイメージ） =====
// 名称・番号・意味は標識令（2026年9月1日施行の版）に合わせていますが、絵は見分けやすさを優先した簡略表現です。
// 実際の様式（別表第二）とは、記号の形・文字の配置・比率などが異なります。地名・路線番号などは架空です。
const SA=(code)=>signArtId(code);
function sgA(code,draw,aspect=1){sgDef(SA(code),draw,aspect);}
function sgAlias(code,base,aspect){const b=SIGNART[base];if(b)SIGNART[SA(code)]={draw:b.draw,aspect:aspect||b.aspect};}
const FJ=()=>FONT_JP,FN=()=>FONT_NUM;
// ---- 部品 ----
// 長方形の板（セルの中央）。asp=幅/高さ。内側の範囲を返す
function sgBoard(x,S,asp,bg,rim=SC.white,rimW=0.018){const w=asp>=1?S*0.96:S*0.96*asp,h=asp>=1?S*0.96/asp:S*0.96;const x0=(S-w)/2,y0=(S-h)/2;x.fillStyle=bg;roundRect(x,x0,y0,w,h,S*0.025);x.fill();
  if(rim){x.strokeStyle=rim;x.lineWidth=S*rimW;roundRect(x,x0+S*0.018,y0+S*0.018,w-S*0.036,h-S*0.036,S*0.018);x.stroke();}return{x0,y0,w,h,cx:x0+w/2,cy:y0+h/2};}
function tJ(x,t,cx,cy,sz,maxW,col){txtFit(x,t,cx,cy,sz,maxW,col,FONT_JP,'center','bold');}
function tN(x,t,cx,cy,sz,col){txt(x,t,cx,cy,sz,col,FONT_NUM,'center','bold');}
function arw(x,pts,w,hd,col){x.strokeStyle=col;x.fillStyle=col;arrowPath(x,pts,w,hd);}
function sgBlueSq(x,S){sgSquare(x,S,SC.blue);}
// 記号
function symCart(x,cx,cy,w,col){x.fillStyle=col;x.strokeStyle=col;x.fillRect(cx-w*0.35,cy-w*0.22,w*0.5,w*0.28);x.lineWidth=w*0.06;x.beginPath();x.moveTo(cx+w*0.15,cy-w*0.12);x.lineTo(cx+w*0.48,cy-w*0.3);x.stroke();
  x.beginPath();x.arc(cx-w*0.1,cy+w*0.16,w*0.13,0,7);x.stroke();}
function symHorn(x,cx,cy,w,col){x.fillStyle=col;x.beginPath();x.moveTo(cx-w*0.45,cy-w*0.06);x.lineTo(cx+w*0.05,cy-w*0.06);x.lineTo(cx+w*0.42,cy-w*0.28);x.lineTo(cx+w*0.42,cy+w*0.28);x.lineTo(cx+w*0.05,cy+w*0.06);x.lineTo(cx-w*0.45,cy+w*0.06);x.closePath();x.fill();
  x.fillRect(cx-w*0.32,cy+w*0.06,w*0.06,w*0.12);x.fillRect(cx-w*0.16,cy+w*0.06,w*0.06,w*0.12);}
function symTire(x,cx,cy,r,col){x.strokeStyle=col;x.lineWidth=r*0.32;x.beginPath();x.arc(cx,cy,r*0.78,0,7);x.stroke();x.lineWidth=r*0.12;for(let i=0;i<8;i++){const a=i*Math.PI/4;x.beginPath();x.moveTo(cx+Math.cos(a)*r*0.55,cy+Math.sin(a)*r*0.55);x.lineTo(cx+Math.cos(a+0.3)*r*1.05,cy+Math.sin(a+0.3)*r*1.05);x.stroke();}
  x.fillStyle=col;x.beginPath();x.arc(cx,cy,r*0.22,0,7);x.fill();}
function symTram(x,cx,cy,w,col){x.fillStyle=col;roundRect(x,cx-w*0.42,cy-w*0.3,w*0.84,w*0.44,w*0.06);x.fill();x.fillStyle=SC.white===col?SC.blue:SC.white;for(let i=0;i<3;i++)x.fillRect(cx-w*0.34+i*w*0.24,cy-w*0.22,w*0.18,w*0.14);
  x.fillStyle=col;x.fillRect(cx-w*0.02,cy-w*0.42,w*0.04,w*0.12);x.fillRect(cx-w*0.12,cy-w*0.44,w*0.24,w*0.03);}
function symDeer(x,cx,cy,w,col){x.fillStyle=col;x.strokeStyle=col;x.beginPath();x.ellipse(cx,cy,w*0.28,w*0.12,0,0,7);x.fill();x.lineWidth=w*0.06;
  for(const k of[-0.2,-0.08,0.12,0.24]){x.beginPath();x.moveTo(cx+w*k,cy+w*0.05);x.lineTo(cx+w*k-w*0.04,cy+w*0.34);x.stroke();}
  x.beginPath();x.moveTo(cx+w*0.22,cy-w*0.05);x.lineTo(cx+w*0.34,cy-w*0.28);x.stroke();x.beginPath();x.ellipse(cx+w*0.38,cy-w*0.3,w*0.08,w*0.05,-0.4,0,7);x.fill();
  x.lineWidth=w*0.03;x.beginPath();x.moveTo(cx+w*0.34,cy-w*0.34);x.lineTo(cx+w*0.3,cy-w*0.5);x.lineTo(cx+w*0.22,cy-w*0.56);x.moveTo(cx+w*0.31,cy-w*0.46);x.lineTo(cx+w*0.4,cy-w*0.54);x.stroke();}
function symPhone(x,cx,cy,w,col){x.strokeStyle=col;x.fillStyle=col;x.lineWidth=w*0.1;x.lineCap='round';x.beginPath();x.arc(cx,cy+w*0.15,w*0.42,Math.PI*1.15,Math.PI*1.85);x.stroke();x.lineCap='butt';
  for(const s of[-1,1]){roundRect(x,cx+s*w*0.36-w*0.11,cy-w*0.12,w*0.22,w*0.16,w*0.04);x.fill();}roundRect(x,cx-w*0.3,cy+w*0.02,w*0.6,w*0.32,w*0.06);x.fill();}
function symToilet(x,cx,cy,h,col){x.fillStyle=col;const s=h/10;for(const[dx,skirt]of[[-2.6,0],[2.6,1]]){x.beginPath();x.arc(cx+dx*s,cy-s*3.6,s*1.0,0,7);x.fill();
    if(skirt){x.beginPath();x.moveTo(cx+dx*s,cy-s*2.4);x.lineTo(cx+dx*s+s*2,cy+s*1.4);x.lineTo(cx+dx*s-s*2,cy+s*1.4);x.closePath();x.fill();x.fillRect(cx+dx*s-s*0.9,cy+s*1.4,s*0.6,s*2.8);x.fillRect(cx+dx*s+s*0.3,cy+s*1.4,s*0.6,s*2.8);}
    else{x.fillRect(cx+dx*s-s*1.2,cy-s*2.4,s*2.4,s*3.6);x.fillRect(cx+dx*s-s*1.1,cy+s*1.2,s*0.9,s*3);x.fillRect(cx+dx*s+s*0.2,cy+s*1.2,s*0.9,s*3);}}
  x.fillRect(cx-s*0.15,cy-s*4.6,s*0.3,s*9);}
function symWheel(x,cx,cy,h,col){x.strokeStyle=col;x.fillStyle=col;const s=h/10;x.lineWidth=s*0.9;x.beginPath();x.arc(cx,cy+s*1.5,s*2.6,0,7);x.stroke();x.beginPath();x.arc(cx-s*0.6,cy-s*4,s*0.9,0,7);x.fill();
  x.beginPath();x.moveTo(cx-s*0.6,cy-s*2.8);x.lineTo(cx-s*0.4,cy+s*0.6);x.lineTo(cx+s*2.2,cy+s*0.6);x.lineTo(cx+s*3,cy+s*3.4);x.stroke();}
function symCliff(x,S,col){x.fillStyle=col;x.beginPath();x.moveTo(S*0.24,S*0.76);x.lineTo(S*0.24,S*0.3);x.lineTo(S*0.36,S*0.36);x.lineTo(S*0.42,S*0.76);x.closePath();x.fill();
  for(const[a,b,r]of[[0.5,0.4,0.05],[0.58,0.52,0.04],[0.52,0.62,0.045],[0.62,0.68,0.035]]){x.beginPath();x.arc(S*a,S*b,S*r,0,7);x.fill();}x.fillRect(S*0.24,S*0.74,S*0.52,S*0.03);}
// 小さい板（補助）を本標識の下に付ける形で描く
function plateUnder(x,S,t){const h=S*0.2;x.fillStyle=SC.white;x.fillRect(S*0.12,S*0.79,S*0.76,h);x.strokeStyle='#333';x.lineWidth=S*0.012;x.strokeRect(S*0.12,S*0.79,S*0.76,h);tJ(x,t,S/2,S*0.79+h/2,S*0.12,S*0.7,SC.black);}
// 縮めた本標識（上に置き、下に補助の板）
function topSign(x,S,id){x.save();x.translate(S*0.17,0);x.scale(0.66,0.66);SIGNART[id].draw(x,S);x.restore();}

// ======================= 規制標識 =======================
sgA('301',(x,S)=>{sgProhib(x,S);sgSlash(x,S);txt(x,'通行止',S/2,S*0.5,S*0.2,SC.blue,FONT_JP,'center','bold');});
sgA('302',(x,S)=>{sgProhib(x,S);});
sgAlias('303','noentry');
sgA('304',(x,S)=>{sgProhib(x,S);symCar(x,S/2,S*0.52,S*0.56,SC.blue);sgSlash(x,S);});
sgAlias('305','notruck');
sgA('305の2',(x,S)=>{sgProhib(x,S);symTruck(x,S/2,S*0.55,S*0.56,SC.blue);tN(x,'5t',S*0.42,S*0.4,S*0.14,SC.white);sgSlash(x,S);});
sgA('306',(x,S)=>{sgProhib(x,S);symBus(x,S/2,S*0.54,S*0.56,SC.blue);sgSlash(x,S);});
sgAlias('307','nomoto');
sgA('308',(x,S)=>{sgProhib(x,S);symCart(x,S/2,S*0.52,S*0.56,SC.blue);sgSlash(x,S);});
sgAlias('309','nobike');
sgA('310',(x,S)=>{sgProhib(x,S);symCar(x,S*0.5,S*0.4,S*0.4,SC.blue);symMoto(x,S*0.5,S*0.64,S*0.36,SC.blue);sgSlash(x,S);});
sgA('310の2',(x,S)=>{sgProhib(x,S);symMoto(x,S/2,S*0.56,S*0.52,SC.blue);x.fillStyle=SC.blue;for(const k of[-0.07,0.07]){x.beginPath();x.arc(S*(0.47+k),S*0.33,S*0.045,0,7);x.fill();}sgSlash(x,S);});
sgA('310の3',(x,S)=>{sgBlueSq(x,S);symTire(x,S/2,S*0.42,S*0.22,SC.white);tJ(x,'チェーン規制',S/2,S*0.8,S*0.12,S*0.8,SC.white);});
sgAlias('311-A','dirS');sgAlias('311-B','dirL');sgAlias('311-C','dirR');sgAlias('311-D','dirSL');sgAlias('311-E','dirSR');sgAlias('311-F','dirLR');
sgA('312',(x,S)=>{sgProhib(x,S);arw(x,[[S*0.36,S*0.74],[S*0.36,S*0.42],[S*0.68,S*0.42]],S*0.07,S*0.1,SC.blue);x.fillStyle=SC.blue;x.fillRect(S*0.7,S*0.3,S*0.04,S*0.26);sgSlash(x,S);});
sgAlias('313','noUturn');
sgA('314',(x,S)=>{sgProhib(x,S);for(const[dx,c]of[[-0.13,SC.blue],[0.13,SC.red]]){const cx=S*(0.5+dx),cy=S*0.5;x.fillStyle=c;roundRect(x,cx-S*0.1,cy-S*0.12,S*0.2,S*0.22,S*0.03);x.fill();x.fillRect(cx-S*0.12,cy+S*0.02,S*0.24,S*0.1);
    x.fillStyle=SC.white;x.fillRect(cx-S*0.07,cy-S*0.09,S*0.14,S*0.07);}sgSlash(x,S);});
sgA('314の2',(x,S)=>{topSign(x,S,SA('314'));plateUnder(x,S,'追越し禁止');});
sgAlias('315','nostopping');sgAlias('316','noparking');
sgA('317',(x,S)=>{sgCircle(x,S,SC.blue,SC.red,SC.white,0.09);sgSlash(x,S,SC.red,0.09);tN(x,'6m',S/2,S*0.34,S*0.16,SC.white);});
sgA('318',(x,S)=>{sgBlue(x,S);tN(x,'P',S/2,S*0.33,S*0.3,SC.white);tJ(x,'60分',S/2,S*0.6,S*0.14,S*0.5,SC.white);tN(x,'8-20',S/2,S*0.76,S*0.12,SC.white);});
sgA('319',(x,S)=>{sgProhib(x,S);x.fillStyle=SC.blue;roundRect(x,S*0.33,S*0.33,S*0.34,S*0.34,S*0.03);x.fill();tJ(x,'危',S/2,S*0.5,S*0.24,S*0.3,SC.white);sgSlash(x,S);});
sgA('320',(x,S)=>{sgProhib(x,S);tN(x,'5.5t',S/2,S*0.52,S*0.3,SC.blue);});
sgA('321',(x,S)=>{sgProhib(x,S);tN(x,'3.3m',S/2,S*0.52,S*0.26,SC.blue);x.fillStyle=SC.blue;for(const[y,d]of[[0.22,1],[0.82,-1]]){x.beginPath();x.moveTo(S*0.5,S*(y+0.08*d));x.lineTo(S*0.42,S*y);x.lineTo(S*0.58,S*y);x.closePath();x.fill();}});
sgA('322',(x,S)=>{sgProhib(x,S);tN(x,'2.2m',S/2,S*0.52,S*0.21,SC.blue);x.fillStyle=SC.blue;for(const[xx,d]of[[0.2,1],[0.8,-1]]){x.beginPath();x.moveTo(S*(xx+0.08*d),S*0.52);x.lineTo(S*xx,S*0.44);x.lineTo(S*xx,S*0.6);x.closePath();x.fill();}});
sgAlias('323','s40');
sgA('323の2',(x,S)=>{sgProhib(x,S);tN(x,'40',S/2,S*0.45,S*0.4,SC.blue);tJ(x,'大貨等',S/2,S*0.74,S*0.11,S*0.4,SC.blue);});
sgA('324',(x,S)=>{sgBlue(x,S);tN(x,'30',S/2,S*0.46,S*0.46,SC.white);x.fillStyle=SC.white;x.fillRect(S*0.28,S*0.7,S*0.44,S*0.06);});
sgAlias('325','car_only');sgAlias('325の2','bike_only');
sgA('325の3',(x,S)=>{sgBlue(x,S);symPed(x,S*0.36,S*0.47,S*0.4,SC.white);symPed(x,S*0.5,S*0.52,S*0.28,SC.white);symBike(x,S*0.66,S*0.6,S*0.3,SC.white);});
sgAlias('325の4','ped_only');
for(const[k,t]of[['325の5-A','A'],['325の5-B','B'],['325の5-C','C']])sgA(k,(x,S)=>{sgBlue(x,S);symTruck(x,S/2,S*0.42,S*0.44,SC.white);tJ(x,'許可車両',S/2,S*0.7,S*0.12,S*0.5,SC.white);});
sgA('325の6',(x,S)=>{sgBlue(x,S);symTruck(x,S*0.38,S*0.42,S*0.3,SC.white);symBus(x,S*0.64,S*0.42,S*0.3,SC.white);tJ(x,'許可車両',S/2,S*0.7,S*0.12,S*0.5,SC.white);});
sgA('325の7',(x,S)=>{sgBlue(x,S);tJ(x,'災害',S/2,S*0.4,S*0.16,S*0.5,SC.white);tJ(x,'応急対策',S/2,S*0.6,S*0.12,S*0.56,SC.white);});
sgAlias('326-A','oneway');
sgA('326-B',(x,S)=>{const w=S*0.58,x0=(S-w)/2;x.fillStyle=SC.blue;roundRect(x,x0,0,w,S,S*0.04);x.fill();x.strokeStyle=SC.white;x.lineWidth=S*0.02;roundRect(x,x0+S*0.03,S*0.03,w-S*0.06,S*0.94,S*0.02);x.stroke();
  x.fillStyle=SC.white;x.beginPath();x.moveTo(S*0.42,S*0.92);x.lineTo(S*0.42,S*0.3);x.lineTo(S*0.33,S*0.3);x.lineTo(S*0.5,S*0.08);x.lineTo(S*0.67,S*0.3);x.lineTo(S*0.58,S*0.3);x.lineTo(S*0.58,S*0.92);x.closePath();x.fill();
  x.save();x.translate(S*0.5,S*0.62);x.rotate(-Math.PI/2);txt(x,'一方通行',0,0,S*0.1,SC.blue,FONT_JP,'center','bold');x.restore();});
for(const k of['326の2-A','326の2-B'])sgA(k,(x,S)=>{sgBlueSq(x,S);symBike(x,S*0.42,S*0.52,S*0.4,SC.white);arw(x,k.endsWith('A')?[[S*0.72,S*0.78],[S*0.72,S*0.22]]:[[S*0.2,S*0.22],[S*0.8,S*0.22]],S*0.06,S*0.09,SC.white);});
sgA('327',(x,S)=>{const b=sgBoard(x,S,1,SC.white,SC.blue,0.02);x.fillStyle=SC.blue;x.fillRect(S*0.5,S*0.12,S*0.012,S*0.76);tJ(x,'二輪',S*0.3,S*0.42,S*0.13,S*0.32,SC.blue);tJ(x,'軽車両',S*0.3,S*0.6,S*0.11,S*0.34,SC.blue);arw(x,[[S*0.3,S*0.86],[S*0.3,S*0.74]],S*0.04,S*0.06,SC.blue);arw(x,[[S*0.72,S*0.8],[S*0.72,S*0.26]],S*0.05,S*0.08,SC.blue);});
sgA('327の2',(x,S)=>{sgBlueSq(x,S);tJ(x,'大貨等',S*0.32,S*0.32,S*0.13,S*0.36,SC.white);arw(x,[[S*0.32,S*0.84],[S*0.32,S*0.48]],S*0.06,S*0.09,SC.white);x.fillStyle=SC.white;x.fillRect(S*0.55,S*0.18,S*0.015,S*0.66);});
sgA('327の3',(x,S)=>{sgBlueSq(x,S);symTruck(x,S*0.38,S*0.34,S*0.32,SC.white);x.fillStyle=SC.white;x.fillRect(S*0.55,S*0.33,S*0.08,S*0.025);roundRect(x,S*0.62,S*0.26,S*0.18,S*0.12,S*0.02);x.fill();arw(x,[[S*0.32,S*0.84],[S*0.32,S*0.5]],S*0.06,S*0.09,SC.white);});
sgAlias('327の4','sBusOnly');
sgA('327の4の2',(x,S)=>{sgBlueSq(x,S);symBike(x,S*0.56,S*0.36,S*0.48,SC.white);arw(x,[[S*0.2,S*0.22],[S*0.2,S*0.62]],S*0.06,S*0.09,SC.white);tJ(x,'専用',S*0.56,S*0.72,S*0.2,S*0.5,SC.white);});
sgAlias('327の5','sBusPrio');
sgA('327の6',(x,S)=>{sgBlueSq(x,S);symTruck(x,S*0.4,S*0.34,S*0.34,SC.white);x.fillStyle=SC.white;roundRect(x,S*0.62,S*0.27,S*0.18,S*0.12,S*0.02);x.fill();tN(x,'1',S*0.3,S*0.68,S*0.26,SC.white);arw(x,[[S*0.6,S*0.86],[S*0.6,S*0.52]],S*0.06,S*0.09,SC.white);});
const LANESETS={'327の7-A':['L','S','SR'],'327の7-B':['LS','S','R'],'327の7-C':['L','S','R'],'327の7-D':['LS','R']};
for(const[k,set]of Object.entries(LANESETS))sgA(k,(x,S)=>{sgBlueSq(x,S);const n=set.length;const w=S*0.84/n;for(let i=0;i<n;i++){const cx=S*0.08+w*(i+0.5);if(i>0){x.fillStyle=SC.white;for(let y=0.2;y<0.86;y+=0.13)x.fillRect(S*0.08+w*i-S*0.006,S*y,S*0.012,S*0.07);}
    for(const a of set[i]){if(a==='S')arw(x,[[cx,S*0.84],[cx,S*0.2]],S*0.045,S*0.075,SC.white);if(a==='L')arw(x,[[cx,S*0.84],[cx,S*0.48],[cx-w*0.38,S*0.48]],S*0.045,S*0.075,SC.white);if(a==='R')arw(x,[[cx,S*0.84],[cx,S*0.48],[cx+w*0.38,S*0.48]],S*0.045,S*0.075,SC.white);}}});
sgA('327の8',(x,S)=>{sgBlue(x,S);arw(x,[[S*0.36,S*0.78],[S*0.36,S*0.3],[S*0.7,S*0.3]],S*0.065,S*0.09,SC.white);tJ(x,'原付',S*0.58,S*0.6,S*0.15,S*0.3,SC.white);});
sgA('327の9',(x,S)=>{sgProhib(x,S);arw(x,[[S*0.36,S*0.78],[S*0.36,S*0.3],[S*0.7,S*0.3]],S*0.065,S*0.09,SC.blue);tJ(x,'原付',S*0.58,S*0.6,S*0.15,S*0.3,SC.blue);sgSlash(x,S);});
sgAlias('327の10','roundabout');
for(const[k,ang]of[['327の11',0],['327の12',90],['327の13',45]])sgA(k,(x,S)=>{sgBlueSq(x,S);tN(x,'P',S*0.5,S*0.3,S*0.3,SC.white);x.strokeStyle=SC.white;x.lineWidth=S*0.025;
  for(let i=0;i<4;i++){const cx=S*(0.2+i*0.2),cy=S*0.7;const a=ang*Math.PI/180;const l=S*0.16;x.beginPath();x.moveTo(cx-Math.cos(a)*l*0.5,cy+Math.sin(a)*l*0.5);x.lineTo(cx+Math.cos(a)*l*0.5,cy-Math.sin(a)*l*0.5);x.stroke();}x.fillRect(S*0.12,S*0.82,S*0.76,S*0.02);});
sgA('328',(x,S)=>{sgBlue(x,S);symHorn(x,S/2,S*0.5,S*0.56,SC.white);});
sgA('328の2',(x,S)=>{sgBlue(x,S);symHorn(x,S/2,S*0.42,S*0.48,SC.white);tJ(x,'区間',S/2,S*0.72,S*0.13,S*0.36,SC.white);});
sgA('329-A',(x,S)=>{sgInvTri(x,S,SC.red,null);const m=S*0.04,k=S*0.1;x.fillStyle=SC.white;x.beginPath();x.moveTo(m+k*1.6,S*0.07+k*0.75);x.lineTo(S-m-k*1.6,S*0.07+k*0.75);x.lineTo(S/2,S*0.93-k*1.6);x.closePath();x.fill();
  tJ(x,'徐行',S/2,S*0.36,S*0.2,S*0.5,SC.blue);});
sgAlias('329-B','jokou');
for(const k of['329の2-A','329の2-B'])sgA(k,(x,S)=>{sgInvTri(x,S,SC.red,null);const m=S*0.04,kk=S*0.1;x.fillStyle=SC.white;x.beginPath();x.moveTo(m+kk*1.6,S*0.07+kk*0.75);x.lineTo(S-m-kk*1.6,S*0.07+kk*0.75);x.lineTo(S/2,S*0.93-kk*1.6);x.closePath();x.fill();
  tJ(x,'前方優先',S/2,S*0.27,S*0.13,S*0.56,SC.blue);tJ(x,'道路',S/2,S*0.42,S*0.13,S*0.3,SC.blue);if(k.endsWith('B')){x.fillStyle=SC.blue;x.fillRect(S*0.38,S*0.52,S*0.24,S*0.02);x.fillRect(S*0.42,S*0.56,S*0.16,S*0.02);}});
sgA('330-A',(x,S)=>{sgInvTri(x,S,SC.red,SC.white);tJ(x,'止まれ',S/2,S*0.36,S*0.2,S*0.6,SC.white);});
sgAlias('330-B','stop');
sgA('331',(x,S)=>{sgProhib(x,S);symPed(x,S*0.5,S*0.52,S*0.5,SC.blue);sgSlash(x,S);});
sgA('332',(x,S)=>{sgProhib(x,S);x.fillStyle=SC.blue;for(let i=0;i<5;i++)x.fillRect(S*(0.22+i*0.12),S*0.7,S*0.07,S*0.08);symPed(x,S*0.5,S*0.46,S*0.42,SC.blue);sgSlash(x,S);});

// ======================= 指示標識 =======================
sgA('401',(x,S)=>{sgBlueSq(x,S);symBike(x,S*0.5,S*0.36,S*0.42,SC.white);symBike(x,S*0.5,S*0.68,S*0.42,SC.white);});
sgA('402',(x,S)=>{sgBlueSq(x,S);x.fillStyle=SC.white;for(const xx of[0.3,0.7])x.fillRect(S*xx-S*0.012,S*0.12,S*0.024,S*0.76);for(let y=0.16;y<0.86;y+=0.09)x.fillRect(S*0.26,S*y,S*0.48,S*0.018);
  x.fillStyle=SC.white;roundRect(x,S*0.38,S*0.32,S*0.24,S*0.4,S*0.05);x.fill();x.fillStyle=SC.blue;x.fillRect(S*0.41,S*0.38,S*0.18,S*0.08);x.fillRect(S*0.41,S*0.58,S*0.18,S*0.06);});
sgA('402の2',(x,S)=>{sgBlueSq(x,S);tN(x,'P',S*0.5,S*0.36,S*0.36,SC.white);x.fillStyle=SC.white;roundRect(x,S*0.15,S*0.62,S*0.7,S*0.2,S*0.03);x.fill();tJ(x,'標章車専用',S/2,S*0.72,S*0.11,S*0.64,SC.blue);});
sgA('403',(x,S)=>{sgBlueSq(x,S);tN(x,'P',S/2,S*0.53,S*0.62,SC.white);});
sgA('403の2',(x,S)=>{sgBlueSq(x,S);tJ(x,'停',S*0.5,S*0.36,S*0.3,S*0.4,SC.white);x.fillStyle=SC.white;roundRect(x,S*0.15,S*0.62,S*0.7,S*0.2,S*0.03);x.fill();tJ(x,'標章車専用',S/2,S*0.72,S*0.11,S*0.64,SC.blue);});
sgA('404',(x,S)=>{sgBlueSq(x,S);tJ(x,'停',S/2,S*0.52,S*0.5,S*0.6,SC.white);});
sgA('405',(x,S)=>{sgBlueSq(x,S);x.fillStyle=SC.white;x.fillRect(S*0.4,S*0.12,S*0.2,S*0.76);x.fillRect(S*0.14,S*0.47,S*0.72,S*0.06);x.fillStyle=SC.blue;x.fillRect(S*0.49,S*0.16,S*0.02,S*0.68);});
sgA('406',(x,S)=>{sgBlueSq(x,S);x.fillStyle=SC.white;x.beginPath();x.moveTo(S*0.38,S*0.14);x.lineTo(S*0.62,S*0.14);x.lineTo(S*0.84,S*0.86);x.lineTo(S*0.16,S*0.86);x.closePath();x.fill();x.fillStyle=SC.blue;for(let i=0;i<4;i++)x.fillRect(S*0.49,S*(0.2+i*0.17),S*0.02,S*0.1);});
sgA('406の2',(x,S)=>{sgBlueSq(x,S);x.fillStyle=SC.white;x.fillRect(S*0.16,S*0.6,S*0.68,S*0.08);tJ(x,'停止線',S/2,S*0.38,S*0.17,S*0.66,SC.white);});
sgAlias('407-A','xwalk');
sgA('407-B',(x,S)=>{SIGNART.xwalk.draw(x,S);x.fillStyle=SC.blue;x.fillRect(S*0.3,S*0.3,S*0.42,S*0.44);symPed(x,S*0.42,S*0.52,S*0.4,SC.white,1,1);symPed(x,S*0.6,S*0.57,S*0.28,SC.white,1,1);});
sgA('407の2',(x,S)=>{sgBlueSq(x,S);x.fillStyle=SC.white;for(let i=0;i<5;i++)x.fillRect(S*(0.16+i*0.14),S*0.72,S*0.08,S*0.1);symBike(x,S/2,S*0.46,S*0.5,SC.white);});
sgA('407の3',(x,S)=>{SIGNART.xwalk.draw(x,S);x.fillStyle=SC.blue;x.fillRect(S*0.28,S*0.3,S*0.46,S*0.44);symPed(x,S*0.38,S*0.52,S*0.36,SC.white,1,1);symBike(x,S*0.62,S*0.56,S*0.26,SC.white);});
sgA('408',(x,S)=>{sgBlueSq(x,S);x.fillStyle=SC.white;x.beginPath();x.moveTo(S*0.5,S*0.16);x.lineTo(S*0.74,S*0.5);x.lineTo(S*0.62,S*0.84);x.lineTo(S*0.38,S*0.84);x.lineTo(S*0.26,S*0.5);x.closePath();x.fill();x.fillStyle=SC.blue;x.fillRect(S*0.47,S*0.3,S*0.06,S*0.44);});
sgA('409-A',(x,S)=>{const b=sgBoard(x,S,1.4,SC.white,SC.blue,0.02);tJ(x,'この先100m',b.cx,b.y0+b.h*0.3,S*0.12,b.w*0.86,SC.blue);tJ(x,'通行止',b.cx,b.y0+b.h*0.68,S*0.16,b.w*0.86,SC.blue);},1.4);
sgA('409-B',(x,S)=>{const b=sgBoard(x,S,1.4,SC.blue,SC.white,0.02);x.fillStyle=SC.white;x.fillRect(b.x0+b.w*0.18,b.y0+b.h*0.12,b.w*0.1,b.h*0.76);x.fillRect(b.x0+b.w*0.06,b.y0+b.h*0.45,b.w*0.5,b.h*0.1);
  x.save();x.translate(b.x0+b.w*0.62,b.y0+b.h*0.08);x.scale(0.34,0.34);SIGNART.noentry.draw(x,S);x.restore();arw(x,[[b.x0+b.w*0.23,b.y0+b.h*0.86],[b.x0+b.w*0.23,b.y0+b.h*0.6]],S*0.03,S*0.05,'#111');},1.4);

// ======================= 警戒標識（黄色のひし形） =======================
const blk=SC.black;
function warnSym(code,fn){sgA(code,(x,S)=>{sgDiamond(x,S);x.fillStyle=blk;x.strokeStyle=blk;fn(x,S);});}
sgAlias('201-A','crossroad');
warnSym('201-B',(x,S)=>{x.fillRect(S*0.465,S*0.24,S*0.07,S*0.52);x.fillRect(S*0.5,S*0.465,S*0.26,S*0.07);});
warnSym('201-C',(x,S)=>{x.fillRect(S*0.465,S*0.4,S*0.07,S*0.36);x.fillRect(S*0.24,S*0.36,S*0.52,S*0.07);});
warnSym('201-D',(x,S)=>{x.lineWidth=S*0.07;x.beginPath();x.moveTo(S*0.5,S*0.76);x.lineTo(S*0.5,S*0.5);x.lineTo(S*0.32,S*0.26);x.moveTo(S*0.5,S*0.5);x.lineTo(S*0.68,S*0.26);x.stroke();});
warnSym('201の2',(x,S)=>{const c=S/2,r=S*0.16;for(let i=0;i<3;i++){const a0=i*2.094+0.3,a1=a0+1.5;x.lineWidth=S*0.05;x.beginPath();x.arc(c,c,r,a0,a1);x.stroke();const ax=c+Math.cos(a1)*r,ay=c+Math.sin(a1)*r;const tx=-Math.sin(a1),ty=Math.cos(a1);
  x.beginPath();x.moveTo(ax+tx*S*0.07,ay+ty*S*0.07);x.lineTo(ax-ty*S*0.05,ay+tx*S*0.05);x.lineTo(ax+ty*S*0.05,ay-tx*S*0.05);x.closePath();x.fill();}});
sgAlias('202','curveR');
warnSym('203',(x,S)=>{arw(x,[[S*0.42,S*0.76],[S*0.42,S*0.36],[S*0.7,S*0.36]],S*0.06,S*0.08,blk);});
warnSym('204',(x,S)=>{x.lineWidth=S*0.055;x.beginPath();x.moveTo(S*0.42,S*0.78);x.bezierCurveTo(S*0.42,S*0.6,S*0.62,S*0.62,S*0.6,S*0.48);x.bezierCurveTo(S*0.58,S*0.36,S*0.42,S*0.4,S*0.44,S*0.3);x.stroke();
  x.beginPath();x.moveTo(S*0.45,S*0.2);x.lineTo(S*0.37,S*0.31);x.lineTo(S*0.51,S*0.32);x.closePath();x.fill();});
warnSym('205',(x,S)=>{arw(x,[[S*0.4,S*0.78],[S*0.4,S*0.56],[S*0.6,S*0.56],[S*0.6,S*0.4],[S*0.42,S*0.4],[S*0.42,S*0.22]],S*0.05,S*0.07,blk);});
warnSym('206',(x,S)=>{x.lineWidth=S*0.045;x.beginPath();x.moveTo(S*0.36,S*0.78);x.bezierCurveTo(S*0.66,S*0.72,S*0.66,S*0.62,S*0.36,S*0.58);x.bezierCurveTo(S*0.66,S*0.52,S*0.66,S*0.42,S*0.4,S*0.36);x.stroke();
  x.beginPath();x.moveTo(S*0.36,S*0.3);x.lineTo(S*0.46,S*0.31);x.lineTo(S*0.38,S*0.41);x.closePath();x.fill();});
warnSym('207-A',(x,S)=>{// 蒸気機関車の図（簡略）
  x.fillRect(S*0.28,S*0.48,S*0.3,S*0.14);x.fillRect(S*0.56,S*0.38,S*0.16,S*0.24);x.fillRect(S*0.32,S*0.38,S*0.06,S*0.1);for(const k of[0.33,0.46,0.6]){x.beginPath();x.arc(S*k,S*0.65,S*0.045,0,7);x.fill();}
  x.beginPath();x.arc(S*0.35,S*0.3,S*0.04,0,7);x.arc(S*0.42,S*0.26,S*0.035,0,7);x.fill();});
sgAlias('207-B','rail');
sgAlias('208','school');sgAlias('208の2','signalAhead');
warnSym('209',(x,S)=>{symCar(x,S*0.5,S*0.42,S*0.34,blk);x.lineWidth=S*0.025;for(const k of[-0.08,0.08]){x.beginPath();x.moveTo(S*(0.5+k),S*0.5);x.bezierCurveTo(S*(0.42+k),S*0.58,S*(0.58+k),S*0.64,S*(0.5+k),S*0.74);x.stroke();}});
warnSym('209の2',(x,S)=>{symCliff(x,S,blk);});
warnSym('209の3',(x,S)=>{x.beginPath();x.moveTo(S*0.24,S*0.62);x.quadraticCurveTo(S*0.31,S*0.46,S*0.38,S*0.62);x.quadraticCurveTo(S*0.45,S*0.46,S*0.52,S*0.62);x.lineTo(S*0.76,S*0.62);x.lineTo(S*0.76,S*0.68);x.lineTo(S*0.24,S*0.68);x.closePath();x.fill();});
sgAlias('210','merge');
warnSym('211',(x,S)=>{x.lineWidth=S*0.045;x.beginPath();x.moveTo(S*0.34,S*0.78);x.lineTo(S*0.34,S*0.52);x.lineTo(S*0.44,S*0.38);x.lineTo(S*0.44,S*0.22);x.moveTo(S*0.62,S*0.78);x.lineTo(S*0.62,S*0.22);x.stroke();x.setLineDash([S*0.04,S*0.04]);x.beginPath();x.moveTo(S*0.48,S*0.78);x.lineTo(S*0.48,S*0.5);x.stroke();x.setLineDash([]);});
sgAlias('212','narrow');
warnSym('212の2',(x,S)=>{arw(x,[[S*0.42,S*0.76],[S*0.42,S*0.26]],S*0.05,S*0.08,blk);arw(x,[[S*0.58,S*0.24],[S*0.58,S*0.74]],S*0.05,S*0.08,blk);});
for(const[k,up]of[['212の3',1],['212の4',0]])warnSym(k,(x,S)=>{x.beginPath();if(up){x.moveTo(S*0.26,S*0.7);x.lineTo(S*0.74,S*0.7);x.lineTo(S*0.74,S*0.38);}else{x.moveTo(S*0.26,S*0.38);x.lineTo(S*0.26,S*0.7);x.lineTo(S*0.74,S*0.7);}x.closePath();x.fill();
  tN(x,'10%',S*(up?0.4:0.6),S*0.32,S*0.14,blk);x.strokeStyle=SC.white;x.fillStyle=SC.white;if(up)arrowPath(x,[[S*0.36,S*0.66],[S*0.66,S*0.5]],S*0.03,S*0.05);else arrowPath(x,[[S*0.34,S*0.5],[S*0.64,S*0.66]],S*0.03,S*0.05);});
sgAlias('213','construction');
warnSym('214',(x,S)=>{x.fillRect(S*0.32,S*0.26,S*0.03,S*0.5);x.beginPath();x.moveTo(S*0.35,S*0.27);x.lineTo(S*0.7,S*0.33);x.lineTo(S*0.7,S*0.4);x.lineTo(S*0.35,S*0.45);x.closePath();x.fill();x.fillStyle=SC.yellow;for(const k of[0.45,0.56])x.fillRect(S*k,S*0.29,S*0.04,S*0.15);});
warnSym('214の2',(x,S)=>{symDeer(x,S*0.47,S*0.52,S*0.46,blk);});
warnSym('215',(x,S)=>{x.fillRect(S*0.465,S*0.26,S*0.07,S*0.32);x.beginPath();x.arc(S*0.5,S*0.68,S*0.045,0,7);x.fill();});

// ======================= 案内標識 =======================
const GB='#1f56a8',GG='#0b7a43';
// 文字の行（[文字, 大きさの比]）を板に並べる
function gLines(x,b,lines,col){const n=lines.length;lines.forEach((l,i)=>{const t=Array.isArray(l)?l[0]:l,sz=Array.isArray(l)?l[1]:0.2;tJ(x,t,b.cx,b.y0+b.h*(i+0.5)/n,b.h*sz*n/2,b.w*0.86,col);});}
function guideSimple(code,asp,bg,fg,rim,lines){sgA(code,(x,S)=>{const b=sgBoard(x,S,asp,bg,rim);gLines(x,b,lines,fg);},asp);}
// 方面・方向（交差点の形の矢印と行き先）
function dirBoard(x,S,bg,asp,dests,opt={}){const b=sgBoard(x,S,asp,bg,SC.white);const cx=b.cx,cy=b.y0+b.h*0.58;const w=b.w,h=b.h;x.strokeStyle=SC.white;x.fillStyle=SC.white;
  const lw=S*0.035,hd=S*0.055;arrowPath(x,[[cx,b.y0+h*0.92],[cx,b.y0+h*0.3]],lw,hd);arrowPath(x,[[cx,cy],[b.x0+w*0.22,cy]],lw,hd);arrowPath(x,[[cx,cy],[b.x0+w*0.78,cy]],lw,hd);
  tJ(x,dests[0],cx,b.y0+h*0.14,h*0.13,w*0.5,SC.white);tJ(x,dests[1],b.x0+w*0.14,cy-h*0.16,h*0.11,w*0.26,SC.white);tJ(x,dests[2],b.x0+w*0.86,cy-h*0.16,h*0.11,w*0.26,SC.white);
  if(opt.route){x.fillStyle=GG;roundRect(x,cx+w*0.05,b.y0+h*0.66,w*0.22,h*0.16,S*0.01);x.fill();tN(x,opt.route,cx+w*0.16,b.y0+h*0.74,h*0.11,SC.white);}
  if(opt.dist)tN(x,opt.dist,b.x0+w*0.86,cy+h*0.12,h*0.1,SC.white);return b;}
function exitBoard(x,S,asp,num,lines,opt={}){const b=sgBoard(x,S,asp,GG,SC.white);x.fillStyle=SC.white;roundRect(x,b.x0+b.w*0.06,b.y0+b.h*0.1,b.w*0.24,b.h*0.24,S*0.01);x.fill();tN(x,num,b.x0+b.w*0.18,b.y0+b.h*0.22,b.h*0.16,GG);
  lines.forEach((t,i)=>tJ(x,t,b.x0+b.w*0.6,b.y0+b.h*(0.25+i*0.25),b.h*0.15,b.w*0.6,SC.white));if(opt.arrow)arw(x,opt.arrow.map(([a,c])=>[b.x0+b.w*a,b.y0+b.h*c]),S*0.03,S*0.05,SC.white);
  if(opt.etc){x.fillStyle=SC.purple;roundRect(x,b.x0+b.w*0.06,b.y0+b.h*0.66,b.w*0.24,b.h*0.2,S*0.01);x.fill();tN(x,'ETC',b.x0+b.w*0.18,b.y0+b.h*0.76,b.h*0.12,SC.white);}return b;}
guideSimple('101',1.8,SC.white,GB,GB,[['みなみ町',0.32]]);
guideSimple('102-A',1.8,SC.white,GB,GB,[['みなみ県',0.32]]);
guideSimple('102-B',1.8,GG,SC.white,SC.white,[['みなみ県',0.32]]);
for(const k of['103-A','103-B'])sgA(k,(x,S)=>{const b=sgBoard(x,S,1.3,GG,SC.white);x.fillStyle=SC.white;x.fillRect(b.x0+S*0.02,b.y0+S*0.02,b.w-S*0.04,b.h*0.3);tJ(x,'入口',b.cx,b.y0+b.h*0.17,b.h*0.18,b.w*0.5,GG);
  tJ(x,'みなみ自動車道',b.cx,b.y0+b.h*0.5,b.h*0.13,b.w*0.86,SC.white);arw(x,k.endsWith('A')?[[b.x0+b.w*0.3,b.y0+b.h*0.82],[b.x0+b.w*0.7,b.y0+b.h*0.82]]:[[b.cx,b.y0+b.h*0.94],[b.cx,b.y0+b.h*0.68]],S*0.035,S*0.055,SC.white);},1.3);
sgA('104',(x,S)=>{const b=sgBoard(x,S,1.3,GG,SC.white);x.fillStyle=SC.white;x.fillRect(b.x0+S*0.02,b.y0+S*0.02,b.w-S*0.04,b.h*0.3);tJ(x,'入口',b.cx,b.y0+b.h*0.17,b.h*0.18,b.w*0.5,GG);
  tJ(x,'みなみ自動車道',b.cx,b.y0+b.h*0.5,b.h*0.13,b.w*0.86,SC.white);tN(x,'300m',b.cx,b.y0+b.h*0.8,b.h*0.16,SC.white);},1.3);
for(const[k,i]of[['105-A',0],['105-B',1],['105-C',2]])sgA(k,(x,S)=>{const b=sgBoard(x,S,1.5,GB,SC.white);const rows=[['みなみ駅','2km'],['さくら区','8km'],['南港','15km']].slice(0,2+(i>0?1:0));
  rows.forEach((r,j)=>{const y=b.y0+b.h*(j+0.5)/rows.length;arw(x,j===0?[[b.x0+b.w*0.06,y],[b.x0+b.w*0.18,y]]:j===1?[[b.x0+b.w*0.12,y+b.h*0.08],[b.x0+b.w*0.12,y-b.h*0.08]]:[[b.x0+b.w*0.18,y],[b.x0+b.w*0.06,y]],S*0.025,S*0.045,SC.white);
    tJ(x,r[0],b.x0+b.w*0.48,y,b.h*0.14,b.w*0.46,SC.white);tN(x,r[1],b.x0+b.w*0.84,y,b.h*0.13,SC.white);});},1.5);
guideSimple('106-A',1.5,GB,SC.white,SC.white,[['みなみ駅　3km',0.22],['さくら区　12km',0.22]]);
sgA('106-B',(x,S)=>{const b=sgBoard(x,S,1.5,GG,SC.white);x.fillStyle=SC.white;roundRect(x,b.x0+b.w*0.06,b.y0+b.h*0.1,b.w*0.2,b.h*0.22,S*0.01);x.fill();tN(x,'3',b.x0+b.w*0.16,b.y0+b.h*0.21,b.h*0.15,GG);
  tJ(x,'みなみ東　5km',b.cx+b.w*0.08,b.y0+b.h*0.25,b.h*0.13,b.w*0.6,SC.white);tJ(x,'さくら　18km',b.cx,b.y0+b.h*0.55,b.h*0.13,b.w*0.8,SC.white);tJ(x,'南港　32km',b.cx,b.y0+b.h*0.8,b.h*0.13,b.w*0.8,SC.white);},1.5);
guideSimple('106-C',1.5,GG,SC.white,SC.white,[['さくら　18km',0.22],['南港　32km',0.22]]);
for(const k of['107-A','107-B'])sgA(k,(x,S)=>{const b=sgBoard(x,S,1.6,GG,SC.white);const n=k.endsWith('A')?2:3;const w=b.w/n;for(let i=0;i<n;i++){const cx=b.x0+w*(i+0.5);tJ(x,['みなみ東','さくら','南港'][i],cx,b.y0+b.h*0.28,b.h*0.13,w*0.86,SC.white);arw(x,[[cx,b.y0+b.h*0.9],[cx,b.y0+b.h*0.5]],S*0.03,S*0.05,SC.white);
    if(i>0){x.fillStyle=SC.white;x.fillRect(b.x0+w*i-S*0.004,b.y0+b.h*0.1,S*0.008,b.h*0.8);}}},1.6);
for(const k of['108-A','108-B'])sgA(k,(x,S)=>{dirBoard(x,S,GB,1.5,['みなみ駅','さくら区','南港'],{route:k.endsWith('B')?'E99':null});},1.5);
for(const k of['108の2-A','108の2-B'])sgA(k,(x,S)=>{dirBoard(x,S,GB,1.5,['みなみ駅','さくら区','南港'],{dist:k.endsWith('B')?'1km':null});},1.5);
for(const k of['108の2-C','108の2-D','108の2-E'])sgA(k,(x,S)=>{dirBoard(x,S,GG,1.5,['みなみ東','さくら','南港']);},1.5);
for(const k of['108の3','108の4'])sgA(k,(x,S)=>{const b=sgBoard(x,S,1.5,GB,SC.white);x.fillStyle=SC.white;const cx=b.cx,y=b.y0+b.h*0.62;x.beginPath();x.moveTo(b.x0+b.w*0.08,y-b.h*0.1);x.lineTo(b.x0+b.w*0.8,y-b.h*0.1);x.lineTo(b.x0+b.w*0.92,y);x.lineTo(b.x0+b.w*0.8,y+b.h*0.1);x.lineTo(b.x0+b.w*0.08,y+b.h*0.1);x.closePath();x.fill();
  tJ(x,'さくら通り',b.x0+b.w*0.45,y,b.h*0.12,b.w*0.6,GB);tJ(x,'みなみ駅',cx,b.y0+b.h*0.22,b.h*0.14,b.w*0.6,SC.white);if(k==='108の3')tN(x,'300m',b.x0+b.w*0.82,b.y0+b.h*0.22,b.h*0.1,SC.white);},1.5);
sgA('109',(x,S)=>{exitBoard(x,S,1.5,'3',['出口','2km']);},1.5);
sgA('110-A',(x,S)=>{const b=exitBoard(x,S,1.5,'3',['みなみ東','1km']);x.fillStyle=GB;roundRect(x,b.x0+b.w*0.06,b.y0+b.h*0.62,b.w*0.24,b.h*0.24,S*0.01);x.fill();tN(x,'123',b.x0+b.w*0.18,b.y0+b.h*0.74,b.h*0.14,SC.white);},1.5);
sgA('110-B',(x,S)=>{exitBoard(x,S,1.5,'3',['みなみ東','1km']);},1.5);
for(const k of['111-A','111-B'])sgA(k,(x,S)=>{exitBoard(x,S,1.5,'3',['みなみ東','500m'],{arrow:[[0.86,0.9],[0.86,0.6]]});},1.5);
sgA('112-A',(x,S)=>{const b=exitBoard(x,S,1.5,'3',['みなみ東','出口'],{arrow:[[0.6,0.92],[0.8,0.7]]});x.fillStyle=GB;roundRect(x,b.x0+b.w*0.06,b.y0+b.h*0.62,b.w*0.24,b.h*0.24,S*0.01);x.fill();tN(x,'123',b.x0+b.w*0.18,b.y0+b.h*0.74,b.h*0.14,SC.white);},1.5);
sgA('112-B',(x,S)=>{exitBoard(x,S,1.5,'3',['みなみ東','出口'],{arrow:[[0.6,0.92],[0.8,0.7]]});},1.5);
for(const k of['113-A','113-B'])sgA(k,(x,S)=>{const b=sgBoard(x,S,1.4,GG,SC.white);x.fillStyle=SC.white;roundRect(x,b.x0+b.w*0.1,b.y0+b.h*0.14,b.w*0.3,b.h*0.3,S*0.01);x.fill();tN(x,'3',b.x0+b.w*0.25,b.y0+b.h*0.29,b.h*0.22,GG);
  tJ(x,'出口',b.x0+b.w*0.68,b.y0+b.h*0.29,b.h*0.2,b.w*0.4,SC.white);arw(x,k.endsWith('A')?[[b.cx,b.y0+b.h*0.92],[b.cx+b.w*0.25,b.y0+b.h*0.6]]:[[b.cx,b.y0+b.h*0.92],[b.cx,b.y0+b.h*0.58]],S*0.035,S*0.055,SC.white);},1.4);
guideSimple('114-A',1.7,SC.white,GB,GB,[['みなみ城跡',0.22],['→ 500m',0.18]]);
guideSimple('114-B',1.7,SC.white,GB,GB,[['みなみ城跡',0.3]]);
guideSimple('114-C',1.7,GG,SC.white,SC.white,[['みなみ城跡',0.22],['3km',0.18]]);
guideSimple('114の2-A',1.7,SC.white,GB,GB,[['みなみ駅前',0.3]]);
guideSimple('114の2-B',1.7,SC.white,GB,GB,[['さくら一丁目',0.22],['Sakura 1-chome',0.14]]);
guideSimple('115',1.6,GG,SC.white,SC.white,[['料金所',0.26],['TOLL GATE',0.14]]);
sgA('116',(x,S)=>{const b=sgBoard(x,S,1.5,GG,SC.white);tJ(x,'みなみSA',b.x0+b.w*0.38,b.y0+b.h*0.26,b.h*0.15,b.w*0.5,SC.white);tN(x,'5km',b.x0+b.w*0.8,b.y0+b.h*0.26,b.h*0.14,SC.white);x.fillStyle=GB;roundRect(x,b.x0+b.w*0.08,b.y0+b.h*0.55,b.w*0.84,b.h*0.32,S*0.01);x.fill();tJ(x,'道の駅 みなみ  12km',b.cx,b.y0+b.h*0.71,b.h*0.13,b.w*0.8,SC.white);},1.5);
for(const k of['116の2-A','116の2-B','116の2-C','116の3-A','116の3-B'])sgA(k,(x,S)=>{const bg=k==='116の2-C'?GB:GG;const b=sgBoard(x,S,1.5,bg,SC.white);x.fillStyle=SC.white;roundRect(x,b.x0+b.w*0.08,b.y0+b.h*0.12,b.w*0.84,b.h*0.3,S*0.01);x.fill();
  tJ(x,k==='116の2-C'?'道の駅 みなみ':'みなみSA',b.cx,b.y0+b.h*0.27,b.h*0.15,b.w*0.8,bg);tN(x,k.startsWith('116の2')?'2km':'',b.cx,b.y0+b.h*0.62,b.h*0.16,SC.white);
  if(k.startsWith('116の3'))arw(x,[[b.cx,b.y0+b.h*0.92],[b.cx+b.w*0.2,b.y0+b.h*0.6]],S*0.035,S*0.055,SC.white);if(k.endsWith('-A')&&k!=='116の2-C'){x.fillStyle=SC.purple;roundRect(x,b.x0+b.w*0.08,b.y0+b.h*0.72,b.w*0.3,b.h*0.18,S*0.01);x.fill();tN(x,'ETC',b.x0+b.w*0.23,b.y0+b.h*0.81,b.h*0.12,SC.white);}},1.5);
sgA('116の4',(x,S)=>{const b=sgBoard(x,S,1,SC.white,GG,0.03);symPhone(x,b.cx,b.y0+b.h*0.4,S*0.4,SC.black);tJ(x,'非常電話',b.cx,b.y0+b.h*0.8,b.h*0.13,b.w*0.8,SC.black);});
guideSimple('116の5',1.2,GB,SC.white,SC.white,[['待避所',0.32]]);
guideSimple('116の6',1.4,GG,SC.white,SC.white,[['非常駐車帯',0.24]]);
sgA('117-A',(x,S)=>{const b=sgBoard(x,S,1,GB,SC.white);tN(x,'P',b.cx,b.cy,b.h*0.62,SC.white);});
sgA('117-B',(x,S)=>{const b=sgBoard(x,S,1,GG,SC.white);tN(x,'P',b.cx,b.cy-b.h*0.06,b.h*0.5,SC.white);tN(x,'2km',b.cx,b.y0+b.h*0.84,b.h*0.14,SC.white);});
sgA('117の2',(x,S)=>{const b=sgBoard(x,S,1.4,GG,SC.white);tJ(x,'本線',b.cx,b.y0+b.h*0.32,b.h*0.24,b.w*0.6,SC.white);arw(x,[[b.cx,b.y0+b.h*0.92],[b.cx,b.y0+b.h*0.56]],S*0.035,S*0.055,SC.white);},1.4);
for(const[k,bg]of[['117の3-A',GB],['117の3-B',GG]])sgA(k,(x,S)=>{const b=sgBoard(x,S,1.4,bg,SC.white);tJ(x,'登坂車線',b.cx,b.y0+b.h*0.3,b.h*0.2,b.w*0.8,SC.white);
  for(const k2 of[0.3,0.6])arw(x,[[b.x0+b.w*k2,b.y0+b.h*0.92],[b.x0+b.w*k2,b.y0+b.h*0.56]],S*0.03,S*0.05,SC.white);},1.4);
// 国道（おにぎり）・都道府県道（六角形）
function onigiri(x,S,num,cx=S/2,cy=S/2,r=S*0.46){x.fillStyle=GB;x.beginPath();x.moveTo(cx-r*0.9,cy-r*0.8);x.lineTo(cx+r*0.9,cy-r*0.8);x.quadraticCurveTo(cx+r*1.0,cy+r*0.2,cx,cy+r*1.0);x.quadraticCurveTo(cx-r*1.0,cy+r*0.2,cx-r*0.9,cy-r*0.8);x.closePath();x.fill();
  x.strokeStyle=SC.white;x.lineWidth=r*0.05;x.stroke();tJ(x,'国道',cx,cy-r*0.52,r*0.22,r,SC.white);tN(x,num,cx,cy+r*0.05,r*0.62,SC.white);}
function hexa(x,S,num,cx=S/2,cy=S/2,r=S*0.44){x.fillStyle=GB;x.beginPath();for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r*0.92);}x.closePath();x.fill();x.strokeStyle=SC.white;x.lineWidth=r*0.05;x.stroke();
  tJ(x,'県道',cx,cy-r*0.48,r*0.22,r,SC.white);tN(x,num,cx,cy+r*0.08,r*0.6,SC.white);}
sgA('118-A',(x,S)=>{onigiri(x,S,'123');});
for(const k of['118-B','118-C'])sgA(k,(x,S)=>{const b=sgBoard(x,S,1.5,GB,SC.white);x.fillStyle='#f3b7b7';x.beginPath();const y=b.cy;x.moveTo(b.x0+b.w*0.06,y-b.h*0.18);x.lineTo(b.x0+b.w*0.78,y-b.h*0.18);x.lineTo(b.x0+b.w*0.94,y);x.lineTo(b.x0+b.w*0.78,y+b.h*0.18);x.lineTo(b.x0+b.w*0.06,y+b.h*0.18);x.closePath();x.fill();
  onigiri(x,S,'123',b.x0+b.w*0.24,y,b.h*0.3);tJ(x,k.endsWith('B')?'みなみ駅':'さくら区',b.x0+b.w*0.6,y,b.h*0.14,b.w*0.36,GB);},1.5);
sgA('118の2-A',(x,S)=>{hexa(x,S,'45');});
for(const k of['118の2-B','118の2-C'])sgA(k,(x,S)=>{const b=sgBoard(x,S,1.5,GB,SC.white);x.fillStyle='#f6e7a2';x.beginPath();const y=b.cy;x.moveTo(b.x0+b.w*0.06,y-b.h*0.18);x.lineTo(b.x0+b.w*0.78,y-b.h*0.18);x.lineTo(b.x0+b.w*0.94,y);x.lineTo(b.x0+b.w*0.78,y+b.h*0.18);x.lineTo(b.x0+b.w*0.06,y+b.h*0.18);x.closePath();x.fill();
  hexa(x,S,'45',b.x0+b.w*0.24,y,b.h*0.28);tJ(x,k.endsWith('B')?'みなみ駅':'さくら区',b.x0+b.w*0.6,y,b.h*0.14,b.w*0.36,GB);},1.5);
sgA('118の3',(x,S)=>{const b=sgBoard(x,S,1.6,GG,SC.white,0.03);tN(x,'E99',b.cx,b.cy,b.h*0.56,SC.white);},1.6);
for(const[k,t,arrow,bg]of[['118の4-A','20t',0,GB],['118の4-B','20t',1,GB],['118の5-A','4.1m',0,GB],['118の5-B','4.1m',1,GB],['118の5-C','4.1m',0,GG],['118の5-D','4.1m',1,GG]])
  sgA(k,(x,S)=>{const b=sgBoard(x,S,1.4,bg,SC.white);x.fillStyle=SC.white;roundRect(x,b.x0+b.w*0.1,b.y0+b.h*0.14,b.w*0.5,b.h*0.5,S*0.02);x.fill();symTruck(x,b.x0+b.w*0.35,b.y0+b.h*0.4,b.w*0.36,bg);
    tN(x,t,b.x0+b.w*0.78,b.y0+b.h*0.4,b.h*0.2,SC.white);if(arrow)arw(x,[[b.x0+b.w*0.2,b.y0+b.h*0.82],[b.x0+b.w*0.8,b.y0+b.h*0.82]],S*0.03,S*0.05,SC.white);},1.4);
for(const k of['119-A','119-B','119-C'])sgA(k,(x,S)=>{const b=sgBoard(x,S,2.2,GB,SC.white);x.fillStyle=SC.white;const y=b.cy;x.beginPath();if(k==='119-C'){x.moveTo(b.x0+b.w*0.06,y-b.h*0.24);x.lineTo(b.x0+b.w*0.94,y-b.h*0.24);x.lineTo(b.x0+b.w*0.94,y+b.h*0.24);x.lineTo(b.x0+b.w*0.06,y+b.h*0.24);}
    else{const d=k==='119-A'?1:-1;const xa=d>0?b.x0+b.w*0.06:b.x0+b.w*0.94,xb=d>0?b.x0+b.w*0.82:b.x0+b.w*0.18,xt=d>0?b.x0+b.w*0.95:b.x0+b.w*0.05;x.moveTo(xa,y-b.h*0.24);x.lineTo(xb,y-b.h*0.24);x.lineTo(xt,y);x.lineTo(xb,y+b.h*0.24);x.lineTo(xa,y+b.h*0.24);}
    x.closePath();x.fill();tJ(x,'さくら通り',b.cx,y,b.h*0.3,b.w*0.6,GB);},2.2);
guideSimple('119-D',2.2,GG,SC.white,SC.white,[['さくら線',0.36]]);
sgA('120-A',(x,S)=>{const b=sgBoard(x,S,1.3,SC.white,GB);tJ(x,'まわり道',b.cx,b.y0+b.h*0.26,b.h*0.18,b.w*0.8,GB);arw(x,[[b.x0+b.w*0.3,b.y0+b.h*0.86],[b.x0+b.w*0.3,b.y0+b.h*0.56],[b.x0+b.w*0.74,b.y0+b.h*0.56]],S*0.035,S*0.055,SC.red);},1.3);
sgA('120-B',(x,S)=>{const b=sgBoard(x,S,1.3,GB,SC.white);tJ(x,'まわり道',b.cx,b.y0+b.h*0.2,b.h*0.15,b.w*0.8,SC.white);x.fillStyle=SC.white;x.fillRect(b.x0+b.w*0.46,b.y0+b.h*0.36,b.w*0.08,b.h*0.56);x.fillRect(b.x0+b.w*0.16,b.y0+b.h*0.56,b.w*0.68,b.h*0.08);
  arw(x,[[b.x0+b.w*0.5,b.y0+b.h*0.88],[b.x0+b.w*0.5,b.y0+b.h*0.6],[b.x0+b.w*0.22,b.y0+b.h*0.6]],S*0.025,S*0.04,'#111');x.save();x.translate(b.x0+b.w*0.6,b.y0+b.h*0.32);x.scale(0.2,0.2);SIGNART[SA('302')].draw(x,S);x.restore();},1.3);
// 施設（A・B：白地に矢印、C：青地）
function facility(code,sym){for(const v of['A','B','C'])sgA(code+'-'+v,(x,S)=>{if(v==='C'){sgBlueSq(x,S);sym(x,S/2,S*0.5,S*0.66,SC.white);return;}
  const b=sgBoard(x,S,1.4,SC.white,GB);x.fillStyle=GB;roundRect(x,b.x0+b.w*(v==='A'?0.08:0.52),b.y0+b.h*0.12,b.w*0.4,b.h*0.76,S*0.02);x.fill();sym(x,b.x0+b.w*(v==='A'?0.28:0.72),b.cy,b.h*0.6,SC.white);
  const xs=v==='A'?[0.56,0.92]:[0.44,0.08];arw(x,[[b.x0+b.w*xs[0],b.cy],[b.x0+b.w*xs[1],b.cy]],S*0.035,S*0.055,GB);},1.4);}
facility('121',(x,cx,cy,h,col)=>{x.strokeStyle=col;x.lineWidth=h*0.06;x.strokeRect(cx-h*0.3,cy-h*0.36,h*0.6,h*0.72);x.fillStyle=col;x.beginPath();x.moveTo(cx-h*0.12,cy-h*0.06);x.lineTo(cx-h*0.2,cy+h*0.06);x.lineTo(cx-h*0.04,cy+h*0.06);x.closePath();x.fill();x.beginPath();x.moveTo(cx+h*0.12,cy+h*0.08);x.lineTo(cx+h*0.04,cy-h*0.04);x.lineTo(cx+h*0.2,cy-h*0.04);x.closePath();x.fill();});
facility('122',(x,cx,cy,h,col)=>{x.strokeStyle=col;x.lineWidth=h*0.08;x.beginPath();x.moveTo(cx-h*0.38,cy+h*0.3);x.lineTo(cx-h*0.18,cy+h*0.3);x.lineTo(cx+h*0.18,cy-h*0.12);x.lineTo(cx+h*0.38,cy-h*0.12);x.stroke();symPed(x,cx,cy-h*0.04,h*0.42,col);});
facility('123',(x,cx,cy,h,col)=>{x.fillStyle=col;x.beginPath();x.moveTo(cx-h*0.4,cy+h*0.36);x.lineTo(cx+h*0.4,cy+h*0.36);x.lineTo(cx+h*0.4,cy+h*0.16);x.closePath();x.fill();symWheel(x,cx-h*0.06,cy-h*0.06,h*0.5,col);});
facility('124',(x,cx,cy,h,col)=>{symBus(x,cx,cy,h*0.8,col);});
facility('125',(x,cx,cy,h,col)=>{symTram(x,cx,cy+h*0.06,h*0.8,col);});
facility('126',(x,cx,cy,h,col)=>{symToilet(x,cx,cy,h*0.75,col);});

// ======================= 補助標識（白地に黒の文字） =======================
function auxPlate(code,lines,opt={}){sgA(code,(x,S)=>{const h=S*(opt.tall?0.62:0.46);const y0=(S-h)/2;x.fillStyle=opt.bg||SC.white;x.fillRect(S*0.03,y0,S*0.94,h);x.strokeStyle='#333';x.lineWidth=S*0.015;x.strokeRect(S*0.03,y0,S*0.94,h);
  const n=lines.length;const off=opt.arrow?(opt.arrow<0?S*0.08:-S*0.08):0;lines.forEach((t,i)=>txtFit(x,t,S/2+off,y0+h*(i+0.5)/n,S*(n>1?0.15:0.2),S*(opt.arrow?0.68:0.86),opt.col||SC.black,FONT_JP,'center','bold'));
  if(opt.arrow){const d=opt.arrow;const ax=d<0?S*0.1:S*0.9;x.fillStyle=SC.red;x.beginPath();x.moveTo(ax,y0+h*0.5);x.lineTo(ax-d*S*0.1,y0+h*0.28);x.lineTo(ax-d*S*0.1,y0+h*0.72);x.closePath();x.fill();}if(opt.draw)opt.draw(x,S,y0,h);},2.0);}
auxPlate('501',['この先100m']);
auxPlate('502',['8 - 20']);
auxPlate('503-A',['大型・二輪']);
auxPlate('503-B',['大貨等']);
auxPlate('503-C',['二輪の自動車・原付を除く'],{tall:1});
auxPlate('503-D',['大型等'],{bg:'#f6e7a2'});
auxPlate('503の2',['遠隔小型']);
auxPlate('504',['余地6m']);
auxPlate('504の2',['60分']);
auxPlate('505-A',['ここから'],{arrow:-1});
auxPlate('505-B',['ここから'],{arrow:1});
auxPlate('505-C',['ここから 50m']);
auxPlate('506',['区間内']);
auxPlate('506の2',['区域内']);
auxPlate('507-A',['ここまで']);
auxPlate('507-B',['ここまで'],{arrow:-1});
sgA('507-C',(x,S)=>{const h=S*0.46,y0=(S-h)/2;x.fillStyle=SC.white;x.fillRect(S*0.03,y0,S*0.94,h);x.strokeStyle=SC.blue;x.lineWidth=S*0.03;x.strokeRect(S*0.05,y0+S*0.02,S*0.9,h-S*0.04);
  x.save();x.beginPath();x.rect(S*0.05,y0,S*0.9,h);x.clip();x.lineWidth=S*0.05;x.beginPath();x.moveTo(S*0.2,y0+h);x.lineTo(S*0.8,y0);x.stroke();x.restore();},2.0);
auxPlate('507-D',['ここまで 50m']);
auxPlate('508',['通学路']);
auxPlate('508の2',['追越し禁止']);
auxPlate('509',['前方優先道路']);
auxPlate('509の2',['踏切注意']);
auxPlate('509の3',['横風注意']);
auxPlate('509の4',['動物注意']);
auxPlate('509の5',['注意']);
auxPlate('510',['対向車多し']);
auxPlate('510の2',['騒音防止区間']);
auxPlate('511',['→'],{draw:()=>{}});
auxPlate('512',['みなみ町']);
auxPlate('513',['始点']);
auxPlate('514',['終点']);
// 図鑑・クイズで、絵がまだない番号がないか（開発用）
function signArtMissing(){return SIGNDATA.flatMap(e=>e.a).filter(id=>!SIGNART[id]);}
