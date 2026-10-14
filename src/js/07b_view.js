// ===== 07b_view.js : 描画・カメラ（運転席/後方/上から/バックモニター）・ミラー・空と天候 =====
let renderer,camera,cockpit,wheelSpin,orthoCam,mirScene,sun,hemi,skyMesh,rainMesh,envRT=null,pmrem=null;const MIR={};let viewMode='cockpit';let frameNo=0;
const ENV={mode:'day',shake:0,dark:false,tunnel:0,q:'high'};
const VIEW={pr:1,prMax:1.5,ft:[],lastAdj:0,rearCam:null};
function initRenderer(quality){const canvas=document.getElementById('gl');const low=quality==='low';ENV.q=quality;const shadows=!low&&!(typeof SETTINGS!=='undefined'&&SETTINGS.shadow===false);// 設定「影」をオフにすると影なし
  renderer=new THREE.WebGLRenderer({canvas,antialias:!low,powerPreference:'high-performance'});VIEW.prMax=Math.min(window.devicePixelRatio||1,quality==='high'?1.75:quality==='mid'?1.25:1);VIEW.pr=VIEW.prMax;renderer.setPixelRatio(VIEW.pr);
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  MAXANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  renderer.shadowMap.enabled=shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  camera=new THREE.PerspectiveCamera(62,1,0.08,2200);camera.layers.enable(1);camera.rotation.order='YXZ';
  hemi=new THREE.HemisphereLight(0xdfeeff,0x6d6555,0.75);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xfff1dc,2.4);sun.castShadow=shadows;const ms=quality==='high'?2048:1024;sun.shadow.mapSize.set(ms,ms);const sc=sun.shadow.camera;sc.left=-75;sc.right=75;sc.top=75;sc.bottom=-75;sc.near=10;sc.far=400;sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.03;
  scene.add(sun);scene.add(sun.target);scene.fog=new THREE.Fog(0xdbe6ec,160,900);
  orthoCam=new THREE.OrthographicCamera(-1,1,1,-1,0,2);mirScene=new THREE.Scene();
  for(const[k,w,h,fov]of[['rear',512,150,22],['L',256,160,32],['R',256,160,32],['cam',384,256,110]]){const rt=new THREE.WebGLRenderTarget(w,h,{stencilBuffer:true});rt.texture.encoding=THREE.sRGBEncoding;
    const cam=new THREE.PerspectiveCamera(fov,w/h,k==='rear'?1.0:0.3,k==='rear'||k==='cam'?260:200);cam.rotation.order='YXZ';cam.layers.enable(0);
    const tex=rt.texture;tex.repeat.set(-1,1);tex.offset.set(1,0);const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:tex,depthTest:false,toneMapped:false}));mirScene.add(q);
    MIR[k]={rt,cam,q,el:document.getElementById(k==='rear'?'mirRear':k==='L'?'mirL':k==='R'?'mirR':'rearCam')};}
  pmrem=new THREE.PMREMGenerator(renderer);buildCockpit();}
function buildCockpit(){cockpit=new THREE.Group();scene.add(cockpit);const M=(c)=>lambert(c);const dark=M(0x26292d),dash=M(0x1d1f22),body=M(0xf1f1ee),trim=M(0x3a3e43),meter=M(0x111316);
  const add=(geo,mat,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,ry,rz);cockpit.add(m);return m;};
  const bar=(a,b,w,d,mat)=>{const A=new V3(...a),Bv=new V3(...b);const dir=Bv.clone().sub(A);const len=dir.length();const m=new THREE.Mesh(GEO.box,mat);m.scale.set(w,len,d);m.position.copy(A).add(Bv).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new V3(0,1,0),dir.normalize());cockpit.add(m);return m;};
  add(GEO.box,dash,0,0.83,-0.98,1.66,0.26,0.66);add(GEO.box,dark,0.37,0.97,-0.74,0.46,0.09,0.22,-0.2);add(GEO.box,meter,0.37,0.99,-0.72,0.36,0.06,0.12,-0.2);
  add(GEO.box,body,0,0.78,-1.75,1.66,0.1,1.2,0.04);add(GEO.box,trim,0,0.955,-0.66,1.56,0.03,0.08);add(GEO.box,dark,0,0.7,-0.45,0.28,0.3,0.5);
  const pillar=M(0x3b4046);for(const s of[-1,1]){bar([s*0.76,0.96,-1.12],[s*0.7,1.46,-0.36],0.045,0.065,pillar);add(GEO.box,trim,s*0.8,0.92,-0.1,0.07,0.16,1.3);
    add(GEO.box,dark,s*0.98,1.0,-0.62,0.06,0.14,0.22);}// ドアミラーの付け根
  add(GEO.box,dark,0,1.5,-0.3,1.46,0.06,0.24);add(GEO.box,dark,0,1.43,-0.42,0.26,0.07,0.05);// ルームミラーの台
  // 後ろを振り向いたときに見える車内（助手席・後席・ピラー・リアの窓枠）
  const inner=M(0x8d9197),head=M(0x6b7076),roof=M(0xd6d2c8),deck=M(0x55595e);
  add(GEO.box,head,-0.37,1.37,0.5,0.24,0.16,0.1);for(const s of[-1,1])add(GEO.box,head,s*0.42,1.16,1.12,0.24,0.14,0.09);// 助手席・後席の枕
  add(GEO.box,deck,0,0.975,1.55,1.62,0.05,0.62);// 後ろの棚（この下は見えない）
  for(const s of[-1,1])add(GEO.box,inner,s*0.83,0.66,0.7,0.05,0.62,2.4);// ドアの内張り
  for(const s of[-1,1]){bar([s*0.68,0.99,1.74],[s*0.62,1.43,1.16],0.11,0.08,inner);bar([s*0.79,0.95,0.5],[s*0.74,1.45,0.5],0.07,0.08,inner);add(GEO.box,inner,s*0.8,0.93,1.1,0.05,0.08,1.2);}
  add(GEO.box,roof,0,1.5,0.46,1.5,0.03,1.4);add(GEO.box,inner,0,1.44,1.17,1.26,0.05,0.05);add(GEO.box,inner,0,0.995,1.75,1.34,0.05,0.05);
  const tilt=new THREE.Group();tilt.position.set(0.37,0.87,-0.56);tilt.rotation.x=-0.45;cockpit.add(tilt);wheelSpin=new THREE.Group();tilt.add(wheelSpin);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.18,0.02,8,32),M(0x1d2023));wheelSpin.add(rim);
  for(const a of[0,Math.PI*0.75,Math.PI*1.25]){const sp=new THREE.Mesh(GEO.box,M(0x2c2f33));sp.scale.set(0.035,0.17,0.02);sp.position.set(Math.sin(a)*0.09,-Math.cos(a)*0.09,0);sp.rotation.z=a;wheelSpin.add(sp);}
  const hub=new THREE.Mesh(GEO.cyl,M(0x2c2f33));hub.scale.set(0.06,0.04,0.06);hub.rotation.x=Math.PI/2;wheelSpin.add(hub);
  cockpit.traverse(o=>{o.layers.set(1);});}
function resizeView(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h>=1.5?58:w/h>=1.1?64:78;camera.updateProjectionMatrix();
  for(const k in MIR){const r=MIR[k].el?MIR[k].el.getBoundingClientRect():null;if(r&&r.width>0){MIR[k].cam.aspect=r.width/r.height;MIR[k].cam.updateProjectionMatrix();}}}
function placeCams(dt){const p=PLAYER;const f=fwd(p.h),r=rightV(p.h);const y=p.y||0;cockpit.position.set(p.x,y,p.z);cockpit.rotation.y=-p.h;wheelSpin.rotation.z=-p.steerIn*7.2;
  const sh=ENV.shake;const jx=sh?(Math.random()-0.5)*sh*0.12:0,jy=sh?(Math.random()-0.5)*sh*0.08:0;
  if(viewMode==='cockpit'){const lean=p.lookYaw*0.06;const bk=Math.max(0,Math.abs(p.lookYaw)-1.4)*0.16;camera.position.set(p.x+r.x*(0.37+lean)-f.x*(0.15+bk)+jx,y+1.22+bk*0.25+jy,p.z+r.z*(0.37+lean)-f.z*(0.15+bk)+jx);
    camera.rotation.set(-0.075-bk*0.2+jy*0.3-Math.atan(p.grade||0),-(p.h+p.lookYaw),sh?(Math.random()-0.5)*sh*0.03:0);cockpit.visible=true;}
  else if(viewMode==='top'){cockpit.visible=false;const tx=p.x+f.x*1.0,tz=p.z+f.z*1.0;camera.position.set(tx,y+15,tz);camera.rotation.set(-Math.PI/2,-p.h,0);}
  else{cockpit.visible=false;const back=p.v<-0.2?-6.5:7.5;const tx=p.x-f.x*back,tz=p.z-f.z*back;const k=Math.min(1,dt*4);camera.position.x+=(tx-camera.position.x)*k;camera.position.z+=(tz-camera.position.z)*k;camera.position.y+=(y+3.1-camera.position.y)*k;
    const lx=p.x+f.x*8,lz=p.z+f.z*8;camera.lookAt(lx,y+1.0,lz);}
  const eye={x:p.x+r.x*0.37-f.x*0.15,z:p.z+r.z*0.37-f.z*0.15};
  MIR.rear.cam.position.set(eye.x+f.x*0.4,y+1.36,eye.z+f.z*0.4);MIR.rear.cam.rotation.set(-0.03,-(p.h+Math.PI),0);
  MIR.L.cam.position.set(p.x-r.x*0.98+f.x*0.5,y+1.06,p.z-r.z*0.98+f.z*0.5);MIR.L.cam.rotation.set(-0.06,-(p.h+Math.PI+0.2),0);
  MIR.R.cam.position.set(p.x+r.x*0.98+f.x*0.5,y+1.06,p.z+r.z*0.98+f.z*0.5);MIR.R.cam.rotation.set(-0.06,-(p.h+Math.PI-0.12),0);
  MIR.cam.cam.position.set(p.x-f.x*(p.L/2+0.05),y+1.05,p.z-f.z*(p.L/2+0.05));MIR.cam.cam.rotation.set(-0.62,-(p.h+Math.PI),0);
  sun.position.set(p.x+80,y+120,p.z+50);sun.target.position.set(p.x,y,p.z);if(skyMesh){skyMesh.position.set(camera.position.x,0,camera.position.z);const co=skyMesh.material.uniforms.cloudOff.value;co.x+=dt*0.0004;co.y+=dt*0.00015;}// 雲がゆっくり流れる
  if(rainMesh&&rainMesh.visible){rainMesh.position.set(camera.position.x,y,camera.position.z);const a=rainMesh.geometry.attributes.position;for(let i=0;i<a.count;i+=2){let yy=a.getY(i)-dt*22;if(yy<0)yy+=14;a.setY(i,yy);a.setY(i+1,yy+0.5);}a.needsUpdate=true;}}
// ---- 遠くの細かい物（路面の表示・標識・看板・街灯・遠くの車など）は描かない：描画の負荷を下げる（霧で見えにくい距離） ----
const CULL={list:[],t:0,off:false};
function cullBuild(){CULL.list.length=0;CULL.off=false;const th={mark:300,lamp:300,glowd:300,glow:380,shopsign:380,leaf:520,glass:450,paint:360};
  scene.traverse(o=>{if(!o.isMesh)return;const k=o.userData.batchKey;let d=null;if(k)d=th[k]||(k.startsWith('decal')?280:k.startsWith('sign')?420:null);else if(o.userData.textSign)d=380;if(d===null)return;
    if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();const b=o.geometry.boundingSphere;const c=b.center.clone();if(!k){o.updateMatrixWorld(true);c.applyMatrix4(o.matrixWorld);}CULL.list.push({o,c,r:b.radius,d});});}
function cullTick(){if(!STAGE.running){if(CULL.off)return;CULL.off=true;for(const e of CULL.list)e.o.visible=true;for(const v of VEH)if(!v.hidden)v.m.grp.visible=true;return;}CULL.off=false;
  CULL.t=(CULL.t+1)%4;if(CULL.t!==0)return;const P=camera.position;
  for(const e of CULL.list){const dx=e.c.x-P.x,dz=e.c.z-P.z;e.o.visible=Math.sqrt(dx*dx+dz*dz)-e.r<e.d;}
  for(const v of VEH){if(v.hidden)continue;const dx=v.x-P.x,dz=v.z-P.z;const d2=dx*dx+dz*dz;v.m.grp.visible=d2<420*420;if(v.m.glb)carAssetLod(v.m,d2);}}
function renderAll(showMirrors){if(renderer.getContext().isContextLost())return;// 中断中は描かない（中断のイベントが届く前の一瞬も含む）
  const W=window.innerWidth,H=window.innerHeight;renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);
  const body=PLAYER&&PLAYER.model.grp;if(body)body.visible=viewMode!=='cockpit';renderer.render(scene,camera);if(body)body.visible=true;
  const camOn=MIR.cam.el&&!MIR.cam.el.hidden;if(!showMirrors&&!camOn)return;frameNo++;const list=[];if(showMirrors)list.push(...(frameNo%2?['rear']:['L','R']));if(camOn)list.push('cam');
  for(const k of list){const m=MIR[k];if(!m.el||m.el.hidden)continue;if(body)body.visible=k!=='rear'&&k!=='cam';renderer.setRenderTarget(m.rt);renderer.render(scene,m.cam);}if(body)body.visible=true;
  renderer.setRenderTarget(null);renderer.autoClear=false;
  for(const k in MIR){const m=MIR[k];if(!m.el||m.el.hidden)continue;if(k!=='cam'&&!showMirrors)continue;const r=m.el.getBoundingClientRect();if(r.width<4)continue;mirScene.children.forEach(c=>c.visible=c===m.q);
    renderer.setViewport(r.left+3,H-r.bottom+3,r.width-6,r.height-6);renderer.setScissor(r.left+3,H-r.bottom+3,r.width-6,r.height-6);renderer.setScissorTest(true);renderer.clearDepth();renderer.render(mirScene,orthoCam);}
  renderer.setScissorTest(false);renderer.autoClear=true;}
// バックモニターの線（鏡像で表示）：車幅の延長線（青）・0.5mの目安（赤）・ハンドルに合わせた予想進路線（黄、1m・2m）
const _gv=new THREE.Vector3();
function drawRearGuide(){const cv=$('rearGuide');if(!cv||!MIR.cam)return;const x=cv.getContext('2d');const W=cv.width,H=cv.height;x.clearRect(0,0,W,H);
  const p=PLAYER;const cam=MIR.cam.cam;cam.updateMatrixWorld();const y=(p.y||0)+0.02;
  const proj=(px,pz)=>{_gv.set(px,y,pz).project(cam);if(_gv.z>1||_gv.z<-1)return null;return{x:(1-(_gv.x+1)/2)*W,y:(1-(_gv.y+1)/2)*H};};
  const f=fwd(p.h),r=rightV(p.h);const back=p.L/2,hw=p.W/2;const pt=(d,w)=>proj(p.x-f.x*(back+d)+r.x*w,p.z-f.z*(back+d)+r.z*w);
  const line=(a,b,col,wd)=>{if(!a||!b)return;x.strokeStyle=col;x.lineWidth=wd;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();};x.lineCap='round';
  for(const s of[-1,1])line(pt(0.05,s*hw),pt(2.6,s*hw),'rgba(70,150,255,.9)',3);line(pt(0.5,-hw),pt(0.5,hw),'rgba(255,60,50,.95)',4);
  const k=Math.tan(p.steer||0)/p.wb;let cx=p.x,cz=p.z,h=p.h;const PL=[],PR=[];const st=0.25;
  for(let s=0;s<=3.0001;s+=st){const ff=fwd(h),rr=rightV(h);PL.push(proj(cx-ff.x*back-rr.x*hw,cz-ff.z*back-rr.z*hw));PR.push(proj(cx-ff.x*back+rr.x*hw,cz-ff.z*back+rr.z*hw));
    const fm=fwd(h-k*st/2);cx-=fm.x*st;cz-=fm.z*st;h-=k*st;}// 後退：向きは -k×距離 だけ変わる
  x.strokeStyle='rgba(255,212,0,.95)';x.lineWidth=3;for(const P of[PL,PR]){x.beginPath();let on=false;for(const q of P){if(!q){on=false;continue;}if(!on){x.moveTo(q.x,q.y);on=true;}else x.lineTo(q.x,q.y);}x.stroke();}
  for(const i of[4,8])line(PL[i],PR[i],'rgba(255,212,0,.95)',2.5);}
// 処理が重いときは解像度を下げる
function adaptRes(dt){if(!renderer)return;VIEW.ft.push(dt);if(VIEW.ft.length<45)return;const avg=VIEW.ft.reduce((a,b)=>a+b,0)/VIEW.ft.length;VIEW.ft.length=0;
  let pr=VIEW.pr;if(avg>1/26&&pr>0.6)pr=Math.max(0.6,pr-0.15);else if(avg<1/52&&pr<VIEW.prMax)pr=Math.min(VIEW.prMax,pr+0.1);if(Math.abs(pr-VIEW.pr)>0.01){VIEW.pr=pr;renderer.setPixelRatio(pr);resizeView();}}
// ---- 空 ----
const SKY={top:new THREE.Color(),hor:new THREE.Color(),sun:new THREE.Vector3(0.45,0.6,0.35)};
// 空：グラデーション＋太陽＋雲（雲は値ノイズ。cloudAmt=0 なら描かない。品質「低」では 0）
function buildSky(){const g=new THREE.SphereGeometry(1800,32,16);const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new THREE.Color(0x4f8fd0)},hor:{value:new THREE.Color(0xd9e6ee)},bot:{value:new THREE.Color(0x9fb0a6)},sunDir:{value:SKY.sun},sunCol:{value:new THREE.Color(0xfff2d8)},sunAmt:{value:1},
      cloudAmt:{value:0},cloudCol:{value:new THREE.Color(0xffffff)},cloudDark:{value:new THREE.Color(0xb8c4cc)},cloudOff:{value:new THREE.Vector2(0,0)},cloudCov:{value:0.55},cloudTex:{value:typeof cloudTex==='function'?cloudTex():null}},
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform vec3 top,hor,bot,sunCol,cloudCol,cloudDark;uniform vec3 sunDir;uniform float sunAmt,cloudAmt,cloudCov;uniform vec2 cloudOff;uniform sampler2D cloudTex;varying vec3 vP;
      void main(){float y=vP.y;vec3 c=y>0.0?mix(hor,top,pow(clamp(y,0.0,1.0),0.55)):mix(hor,bot,clamp(-y*4.0,0.0,1.0));float s=max(dot(normalize(vP),normalize(sunDir)),0.0);
      if(cloudAmt>0.001&&y>0.01){vec2 cp=vP.xz/(y+0.12)*0.11+cloudOff;vec2 nn=texture2D(cloudTex,cp).rg;// 雲の模様はあらかじめ描いた画像（07c）。r:形 g:明るさ
        float cl=smoothstep(cloudCov,cloudCov+0.22,nn.r)*cloudAmt*smoothstep(0.0,0.2,y);
        float lit=0.55+0.45*nn.g;c=mix(c,mix(cloudDark,cloudCol,lit),cl);}
      c+=sunCol*(pow(s,600.0)*4.0+pow(s,12.0)*0.25)*sunAmt;gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}`});
  const sky=new THREE.Mesh(g,m);sky.renderOrder=-10;sky.frustumCulled=false;scene.add(sky);return sky;}
// 遠くの山並み（地図ごとに色を変える）
function buildHills(B,cx,cz,R0,n,cols){const r=rng(5);for(let i=0;i<n;i++){const a=i/n*Math.PI*2+r()*0.1,d=R0+r()*R0*0.2;const h=60+r()*140,w=200+r()*180;
    const m4=new THREE.Matrix4().compose(new V3(cx+Math.cos(a)*d,h/2-8,cz+Math.sin(a)*d),new THREE.Quaternion(),new V3(w,h,w*0.8));B.addGeo('hill',GEO.cone,m4,pick(cols||[0x6e8a6a,0x7b9478,0x667f6a],r));}}
// ---- 天候・時間帯 ----
const ENVDEF={day:{fog:0xdbe6ec,n:160,f:900,h:0.75,s:2.4,top:0x4f8fd0,hor:0xd9e6ee,sunAmt:1,sunCol:0xfff1dc,mu:1,exp:1.0,cloud:{amt:0.9,cov:0.56,col:0xffffff,dark:0xb9c6d0}},
  evening:{fog:0xe7c4a0,n:130,f:700,h:0.55,s:1.6,top:0x6b7fb3,hor:0xf0b98a,sunAmt:1.4,sunCol:0xffb070,mu:1,exp:1.05,sunY:0.12,cloud:{amt:0.85,cov:0.58,col:0xffc9a0,dark:0x8a7a90}},
  night:{fog:0x0b111d,n:30,f:330,h:0.12,s:0.05,top:0x070b16,hor:0x1a2236,sunAmt:0,sunCol:0x223355,mu:1,exp:1.25,dark:true,cloud:{amt:0.7,cov:0.6,col:0x2a3348,dark:0x10151f}},
  rain:{fog:0x8c969c,n:14,f:170,h:0.55,s:0.5,top:0x7d8a93,hor:0xa2abb0,sunAmt:0,sunCol:0xffffff,mu:0.72,exp:1.0,cloud:{amt:1.0,cov:0.3,col:0x9aa5ab,dark:0x6e7980}},
  fog:{fog:0xc2c8cb,n:4,f:62,h:0.6,s:0.5,top:0xc2c8cb,hor:0xc8cdd0,sunAmt:0,sunCol:0xffffff,mu:0.85,exp:1.0,dark:true}};
function setEnv(mode){ENV.mode=mode;const W=ENVDEF[mode]||ENVDEF.day;ENV.dark=!!W.dark;
  const fm=(NET.map&&NET.map.fogMul)||1;scene.fog.color.copy(C(W.fog));scene.fog.near=W.n*(W.dark&&mode==='fog'?1:fm);scene.fog.far=Math.min(2100,W.f*(mode==='fog'?1:fm));hemi.intensity=W.h;sun.intensity=W.s;sun.color.copy(C(W.sunCol));renderer.toneMappingExposure=W.exp;
  if(skyMesh){const u=skyMesh.material.uniforms;u.top.value.copy(C(W.top));u.hor.value.copy(C(W.hor));u.bot.value.copy(C(W.hor)).multiplyScalar(0.8);u.sunAmt.value=W.sunAmt;u.sunCol.value.copy(C(W.sunCol));
    const cl=W.cloud||{amt:0};u.cloudAmt.value=ENV.q==='low'||!u.cloudTex.value?0:(cl.amt||0);u.cloudCov.value=cl.cov!==undefined?cl.cov:0.55;u.cloudCol.value.copy(C(cl.col||0xffffff));u.cloudDark.value.copy(C(cl.dark||0xb8c4cc));}
  SKY.sun.set(0.45,W.sunY||0.6,0.35).normalize();
  if(MAT.lamp)MAT.lamp.color.copy(C(W.dark||mode==='rain'?0xfff1c4:0x8a8a8a)).multiplyScalar(W.dark?2.0:1);
  for(let i=0;i<5;i++)if(MAT['fac'+i])MAT['fac'+i].emissive.copy(C(0xffffff)).multiplyScalar(mode==='night'?0.95:mode==='evening'?0.25:0);
  if(MAT.glow)MAT.glow.color.copy(C(0xffffff)).multiplyScalar(mode==='night'?1.2:0.8);if(MAT.shopsign)MAT.shopsign.color.setScalar(mode==='night'?1.3:mode==='evening'?1.05:mode==='fog'||mode==='rain'?0.98:0.9);
  for(const m of(typeof LITSIGNS!=='undefined'?LITSIGNS:[]))m.color.setScalar(mode==='night'?1.15:mode==='evening'?1.0:0.88);
  if(NET.map&&NET.map.onEnv)NET.map.onEnv(mode);
  renderer.setClearColor(C(W.fog));if(PLAYER)PLAYER.mu=W.mu;if(rainMesh)rainMesh.visible=mode==='rain';
  // 車の塗装に映る景色
  try{if(envRT)envRT.dispose();const es=new THREE.Scene();const sk=buildSkyClone(W);es.add(sk);envRT=pmrem.fromScene(es,0.04);if(MAT.paint){MAT.paint.envMap=envRT.texture;MAT.paint.needsUpdate=true;}}catch(e){}
  if(typeof visualEnv==='function')visualEnv(mode,W);}
function buildSkyClone(W){const g=new THREE.SphereGeometry(100,24,12);const col=[];const P=g.attributes.position;const top=C(W.top),hor=C(W.hor);const bot=C(0x5a5a55);
  for(let i=0;i<P.count;i++){const y=P.getY(i)/100;const c=y>0?hor.clone().lerp(top,Math.pow(y,0.6)):hor.clone().lerp(bot,Math.min(1,-y*3));col.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  return new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide}));}
function buildRain(){const N=2400,P=[];for(let i=0;i<N;i++){const x=(Math.random()-0.5)*60,z=(Math.random()-0.5)*60,y=Math.random()*14;P.push(x,y,z,x,y+0.5,z);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));rainMesh=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:C(0xc9d3da),transparent:true,opacity:0.5}));rainMesh.visible=false;rainMesh.frustumCulled=false;scene.add(rainMesh);}
// トンネルの中は暗くする
function tunnelLight(dt){const p=PLAYER;let inside=0;const q=p&&p.loc;if(q&&q.kind==='road'){for(const t of q.road.tunnels){if(q.s>t.s0&&q.s<t.s1)inside=1;}}
  ENV.tunnel+=(inside-ENV.tunnel)*Math.min(1,dt*2.5);const W=ENVDEF[ENV.mode]||ENVDEF.day;hemi.intensity=W.h*(1-ENV.tunnel*0.75)+ENV.tunnel*0.12;sun.intensity=W.s*(1-ENV.tunnel);}

