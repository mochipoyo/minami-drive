// ===== 07_player.js : 自車の物理と操作 =====
const KEY={};const INPUT={acc:0,brk:0,hard:0,steer:0,touchSteer:null,touchAcc:false,touchBrk:false,lookL:false,lookR:false,dragLook:0};
function makePlayer(){const m=makeCar('compact',0xf4f4f2);scene.add(m.grp);
  PLAYER={x:0,z:0,y:0,h:0,v:0,a:0,steer:0,steerIn:0,L:m.L,W:m.W,wb:2.5,gear:'P',pbrake:true,belt:false,blink:null,hazard:false,lights:false,horn:false,engine:true,
    model:m,lookYaw:0,blinkT:0,odo:0,mu:1,ghost:false,frozen:false,t:0,ambBlockT:0,lastLook:{L:-99,R:-99},rpm:800,contacts:0,wheelOff:false};
  PLAYER.headL=new THREE.SpotLight(0xfff4dd,0,120,0.6,0.55,1.2);PLAYER.headL.position.set(0,1.0,-2);scene.add(PLAYER.headL);scene.add(PLAYER.headL.target);
  return PLAYER;}
function resetPlayer(x,z,h,y=0){const p=PLAYER;Object.assign(p,{x,z,y,h,v:0,a:0,steer:0,steerIn:0,gear:'P',pbrake:true,belt:false,blink:null,hazard:false,horn:false,lookYaw:0,odo:0,frozen:false,ambBlockT:0,contacts:0,wheelOff:false,revDist:0,lastGearChange:-99,gearChanges:0});
  p.lastLook={L:-99,R:-99,B:-99};p.loc=null;INPUT.lookUntilL=INPUT.lookUntilR=0;INPUT.acc=INPUT.brk=INPUT.hard=0;}
function setBlink(side){const p=PLAYER;p.blink=p.blink===side?null:side;p.blinkStart=p.t;p.blinkSteerPeak=0;p.blinkH0=p.h;SFX.click&&SFX.click();onPlayerAction('blink',side);}
function cycleGear(){const p=PLAYER;if(Math.abs(p.v)>0.3){coach('シフト操作は止まってから行います。',2.5);return;}p.gear=p.gear==='P'?'D':p.gear==='D'?'R':'D';p.lastGearChange=p.t;p.gearChanges=(p.gearChanges||0)+1;SFX.click&&SFX.click();onPlayerAction('gear',p.gear);}
function updatePlayer(dt){const p=PLAYER;p.t+=dt;
  const kAcc=KEY.KeyW||KEY.ArrowUp||INPUT.touchAcc,kBrk=KEY.KeyS||KEY.ArrowDown||INPUT.touchBrk,kHard=KEY.Space;
  const fine=STAGE.fine;// 駐車練習：アクセルをやさしく
  INPUT.acc=kAcc?Math.min(fine?0.45:1,INPUT.acc+dt*(fine?0.7:1.6)):Math.max(0,INPUT.acc-dt*4);
  INPUT.brk=kHard?1:kBrk?Math.min(1,INPUT.brk+dt*(INPUT.brk<0.45?1.1:0.45)):Math.max(0,INPUT.brk-dt*5);
  let sIn;if(INPUT.touchSteer!==null){sIn=INPUT.touchSteer;}else{const t=(KEY.KeyA||KEY.ArrowLeft?-1:0)+(KEY.KeyD||KEY.ArrowRight?1:0);
    if(t!==0)p.steerIn=clamp(p.steerIn+t*dt*(Math.sign(t)!==Math.sign(p.steerIn)&&p.steerIn!==0?3.2:(fine?1.0:1.6)),-1,1);else if(!fine||Math.abs(p.v)>2.5){const back=dt*(1.2+Math.abs(p.v)*0.12);p.steerIn=Math.abs(p.steerIn)<back?0:p.steerIn-Math.sign(p.steerIn)*back;}sIn=p.steerIn;}
  if(INPUT.auto){INPUT.acc=INPUT.auto.acc;INPUT.brk=INPUT.auto.brk;sIn=INPUT.auto.steer;}
  p.steerIn=sIn;const v2=p.v*p.v;const dmax=Math.min(0.58,Math.atan(6.5*p.wb/Math.max(v2,0.01)));p.steer=sIn*dmax;
  // ウインカーの自動キャンセル
  // 実際に曲がった（向きが大きく変わった）あと、ハンドルが戻ったら消える。車線変更くらいでは消えない
  if(p.blink){const sd=p.blink==='L'?-1:1;const turned=wrapA(p.h-(p.blinkH0!==undefined?p.blinkH0:p.h))*sd;if(p.steerIn*sd>0.3&&turned>0.9)p.blinkSteerPeak=1;if(p.blinkSteerPeak&&p.steerIn*sd<0.12){p.blink=null;onPlayerAction('blinkAuto');}}
  // 坂（進行方向の勾配）
  let grade=0;const q0=p.loc;if(q0&&q0.kind==='road'){const al=Math.cos(wrapA(p.h-q0.road.at(q0.s).h));grade=q0.road.gradeAt(q0.s)*Math.sign(al||1);}p.grade=grade;
  const mu=p.mu;const v0=p.v;
  if(p.frozen||p.gear==='P'){p.v=0;}
  else{const dirSign=p.gear==='R'?-1:1;let drive=0;
    if(p.engine&&!p.engineFault){const aMax=lerp(2.8,0.75,clamp(Math.abs(p.v)/33,0,1));drive=dirSign*INPUT.acc*aMax;if(p.gear==='R'&&p.v<-4.5)drive=0;
      if(INPUT.acc<0.05&&!p.pbrake&&Math.abs(p.v)<1.9&&INPUT.brk<0.3)drive+=dirSign*0.55;}// クリープ
    const g=-9.8*grade;const brakeA=INPUT.brk*8.2*mu+(p.pbrake?6:0);const fric=(brakeA+0.13+0.00042*p.v*p.v)*dt;let v=p.v+(drive+g)*dt;
    if(Math.abs(v)<=fric){v=(Math.abs(drive+g)>brakeA+0.15)?v-Math.sign(v||drive+g)*fric*0.5:0;}else v-=Math.sign(v)*fric;
    if(p.gear==='D'&&v<0&&INPUT.acc>0&&!p.pbrake)v=Math.max(v,-0.3);if(p.gear==='R'&&v>0&&INPUT.acc>0)v=Math.min(v,0.3);p.v=v;}
  p.a=(p.v-v0)/Math.max(dt,1e-3);
  // 運動学モデル
  const yr=p.v/p.wb*Math.tan(p.steer);const nh=p.h+yr*dt;const f=fwd((p.h+nh)/2);const nx=p.x+f.x*p.v*dt,nz=p.z+f.z*p.v*dt;
  const hit=bodyHit(nx,nz,nh);
  if(!hit){p.x=nx;p.z=nz;p.h=wrapA(nh);}
  else{onCurb(hit,nx,nz);if(hit.solid){p.v=0;}
    else if(!bodyHit(nx,p.z,p.h)){p.x=nx;p.v*=0.6;}else if(!bodyHit(p.x,nz,p.h)){p.z=nz;p.v*=0.6;}else if(!bodyHit(p.x,p.z,nh)){p.h=wrapA(nh);p.v*=0.3;}else p.v*=-0.15;}
  p.odo+=Math.abs(p.v*dt);if(p.v<0)p.revDist=(p.revDist||0)-p.v*dt;
  // 路面の高さ
  const q=locate(p.x,p.z,p.y);p.loc=q;if(q)p.y+=((q.kind==='road'?q.road.yAt(q.s):q.y||0)-p.y)*Math.min(1,dt*12);
  // 見る方向
  const lL=INPUT.lookL||p.t<(INPUT.lookUntilL||0),lR=INPUT.lookR||p.t<(INPUT.lookUntilR||0);
  // シフトがRのときは、左確認・右確認で体をひねって後ろを直接見る
  const rev=p.gear==='R';const lk=rev&&lL?-2.6:rev&&lR?2.45:(lL?-1.25:0)+(lR?1.35:0)+INPUT.dragLook;p.lookYaw+=(lk-p.lookYaw)*Math.min(1,dt*7);
  if(p.lookYaw<-0.9)p.lastLook.L=p.t;if(p.lookYaw>0.9)p.lastLook.R=p.t;if(Math.abs(p.lookYaw)>2.0)p.lastLook.B=p.t;
  // ライト・車体
  p.blinkT+=dt;const blink=(p.blinkT%0.8)<0.4;
  setCarLights(p.model,{brake:INPUT.brk>0.05||(p.v===0&&p.gear!=='P'),turnL:p.blink==='L'||p.hazard,turnR:p.blink==='R'||p.hazard,head:p.lights,blink,rev:p.gear==='R'});
  p.model.grp.position.set(p.x,p.y,p.z);p.model.grp.rotation.set(-Math.atan(p.grade||0)*0,-p.h,0,'YXZ');
  const hf=fwd(p.h);p.headL.intensity=p.lights?(ENV.dark?3.6:1.0):0;p.headL.position.set(p.x+hf.x*1.8,p.y+1.0,p.z+hf.z*1.8);p.headL.target.position.set(p.x+hf.x*26,p.y,p.z+hf.z*26);
  // エンジン回転（音用）：簡易AT
  const kmh=Math.abs(p.v)*KMH;const gears=[0,18,36,58,82,120];let gi=1;while(gi<gears.length-1&&kmh>gears[gi])gi++;const lo=gears[gi-1],hi=gears[gi];
  const target=p.gear==='P'?800+INPUT.acc*900:900+((kmh-lo)/(hi-lo||1))*2600*(0.7+INPUT.acc*0.5)+INPUT.acc*500;p.rpm+=(target-p.rpm)*Math.min(1,dt*5);}
function corners(x,z,h,L,W,inset=0){const f=fwd(h),r=rightV(h);const l=L/2-inset,w=W/2-inset;return[[1,1],[1,-1],[-1,1],[-1,-1]].map(([a,b])=>({x:x+f.x*l*a+r.x*w*b,z:z+f.z*l*a+r.z*w*b}));}
function bodyHit(x,z,h){const p=PLAYER;for(const c of corners(x,z,h,p.L,p.W,0.05)){if(!isDrivable(c.x,c.z,p.y))return{x:c.x,z:c.z};}
  for(const o of NET.obst){if(!o.solid)continue;if(Math.abs(o.x-x)>8||Math.abs(o.z-z)>8)continue;if(obbOverlap({x,z,h,L:p.L,W:p.W},o))return{x:o.x,z:o.z,solid:true,obj:o};}return null;}
function obbOverlap(a,b){const axes=[fwd(a.h),rightV(a.h),fwd(b.h),rightV(b.h)];for(const ax of axes){const pr=(o)=>{const f=fwd(o.h),r=rightV(o.h);const c=o.x*ax.x+o.z*ax.z;const e=Math.abs(f.x*ax.x+f.z*ax.z)*o.L/2+Math.abs(r.x*ax.x+r.z*ax.z)*o.W/2;return[c-e,c+e];};
    const[a0,a1]=pr(a),[b0,b1]=pr(b);if(a1<b0||b1<a0)return false;}return true;}
function distToOBB(o,x,z){const f=fwd(o.h),r=rightV(o.h);const dx=x-o.x,dz=z-o.z;const u=Math.abs(dx*f.x+dz*f.z)-o.L/2,v=Math.abs(dx*r.x+dz*r.z)-o.W/2;return Math.hypot(Math.max(u,0),Math.max(v,0))+Math.min(Math.max(u,v),0);}

