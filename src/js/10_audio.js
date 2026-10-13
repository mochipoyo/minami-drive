// ===== 10_audio.js : 効果音（WebAudioで合成） =====
const SFX={ctx:null,on:true,sirenOn:false,rainOn:false,
  init(){if(this.ctx)return;try{const C=window.AudioContext||window.webkitAudioContext;this.ctx=new C();}catch(e){return;}const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=this.on?0.8:0;this.master.connect(c.destination);
    const noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noiseBuf=noise;
    const eng=c.createOscillator();eng.type='sawtooth';const ef=c.createBiquadFilter();ef.type='lowpass';ef.frequency.value=520;this.engG=c.createGain();this.engG.gain.value=0;eng.connect(ef);const e2=c.createOscillator();e2.type='square';const g2=c.createGain();g2.gain.value=0.35;e2.connect(g2);g2.connect(ef);e2.start();this.eng2=e2;ef.connect(this.engG);this.engG.connect(this.master);eng.start();this.eng=eng;
    this.wind=this.loopNoise(600,'bandpass');this.rainN=this.loopNoise(2400,'highpass');
    this.sirO=c.createOscillator();this.sirO.type='square';const sf=c.createBiquadFilter();sf.type='lowpass';sf.frequency.value=2200;this.sirG=c.createGain();this.sirG.gain.value=0;this.sirO.connect(sf);sf.connect(this.sirG);this.sirG.connect(this.master);this.sirO.start();
    this.hornG=c.createGain();this.hornG.gain.value=0;for(const f of[415,498]){const o=c.createOscillator();o.type='square';o.frequency.value=f;o.connect(this.hornG);o.start();}const hf=c.createBiquadFilter();hf.type='lowpass';hf.frequency.value=1600;this.hornG.disconnect();this.hornG.connect(hf);hf.connect(this.master);
    this.horn2G=c.createGain();this.horn2G.gain.value=0;const hf2=c.createBiquadFilter();hf2.type='lowpass';hf2.frequency.value=1300;for(const f of[349,440]){const o=c.createOscillator();o.type='square';o.frequency.value=f;o.connect(hf2);o.start();}hf2.connect(this.horn2G);this.horn2G.connect(this.master);
    this.bellT=0;this.clickT=0;},
  loopNoise(freq,type){const c=this.ctx;const s=c.createBufferSource();s.buffer=this.noiseBuf;s.loop=true;const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=c.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(this.master);s.start();return g;},
  setOn(b){this.on=b;if(this.master)this.master.gain.value=b?0.8:0;},
  tone(f,dur,type='sine',vol=0.2,when=0,slide){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+when;const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.linearRampToValueAtTime(slide,t+dur);
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.0008,t+dur);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+0.05);},
  noiseHit(dur,vol,freq){if(!this.ctx)return;const c=this.ctx,t=c.currentTime;const s=c.createBufferSource();s.buffer=this.noiseBuf;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=freq||900;const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+dur);},
  click(){this.tone(1900,0.03,'square',0.05);},buzz(){this.tone(196,0.28,'square',0.12);this.tone(185,0.28,'square',0.08,0.02);},chime(){this.tone(880,0.18,'sine',0.14);this.tone(1320,0.3,'sine',0.12,0.12);},
  bump(){this.noiseHit(0.25,0.5,300);this.tone(70,0.2,'sine',0.4);},crash(){this.noiseHit(0.9,0.9,1800);this.tone(60,0.5,'sawtooth',0.3);},ball(){for(let i=0;i<3;i++)this.tone(240,0.08,'sine',0.25,i*0.22);},
  notify(){this.tone(1046,0.12,'sine',0.15);this.tone(1568,0.2,'sine',0.13,0.13);},
  eew(){for(let k=0;k<3;k++){[0,1,2,3].forEach((i)=>this.tone(i%2?740:988,0.16,'triangle',0.2,k*0.9+i*0.17));}},
  horn(b){if(this.hornG)this.hornG.gain.setTargetAtTime(b?0.09:0,this.ctx.currentTime,0.015);},
  horn2(b){if(this.horn2G&&this.h2!==b){this.h2=b;this.horn2G.gain.setTargetAtTime(b?0.07:0,this.ctx.currentTime,0.02);}},
  siren(b){this.sirenOn=b;},rain(b){this.rainOn=b;},
  update(dt){if(!this.ctx||!PLAYER)return;const c=this.ctx,t=c.currentTime,p=PLAYER;const v=Math.abs(p.v);
    const rpm=(p.rpm||900)/60*2;this.eng.frequency.setTargetAtTime(rpm,t,0.06);this.engG.gain.setTargetAtTime(STAGE.running?0.03+INPUT.acc*0.035:0,t,0.1);if(this.eng2){this.eng2.frequency.setTargetAtTime(rpm*2.01,t,0.06);}
    this.wind.gain.setTargetAtTime(STAGE.running?Math.min(0.12,v*0.006):0,t,0.2);this.rainN.gain.setTargetAtTime(this.rainOn&&STAGE.running?0.08:0,t,0.4);
    // ウインカーの音
    if(p.blink||p.hazard){this.clickT+=dt;if(this.clickT>0.4){this.clickT=0;this.tone(this.tock?1500:1150,0.035,'square',0.045);this.tock=!this.tock;}}
    // 踏切
    let bell=0;for(const X of XINGS){if(!X.alarm)continue;const d=Math.hypot(p.x-X.x,p.z-X.z);bell=Math.max(bell,clamp(1-d/220,0,1));}
    this.bellT+=dt;if(bell>0&&this.bellT>0.42){this.bellT=0;this.tone(760,0.3,'triangle',0.16*bell);this.tone(1140,0.22,'sine',0.07*bell);}
    // 救急車（ピーポー）
    if(this.sirenOn&&AMB){const d=Math.hypot(p.x-AMB.x,p.z-AMB.z);const vol=clamp(1-d/260,0,1)*0.06;const hi=(t%1.3)<0.65;
      const toward=((p.x-AMB.x)*fwd(AMB.h).x+(p.z-AMB.z)*fwd(AMB.h).z)>0?1:-1;const dop=1+toward*0.04*clamp(AMB.v/15,0,1);this.sirO.frequency.setTargetAtTime((hi?960:770)*dop,t,0.01);this.sirG.gain.setTargetAtTime(vol,t,0.05);}
    else this.sirG.gain.setTargetAtTime(0,t,0.1);}
};
const VOICE={on:true,last:'',speak(text){if(!this.on||!('speechSynthesis' in window))return;try{if(text===this.last)return;this.last=text;const u=new SpeechSynthesisUtterance(text.replace(/（[^）]*）/g,''));u.lang='ja-JP';u.rate=1.08;
  const vs=speechSynthesis.getVoices().filter(v=>/ja/i.test(v.lang));if(vs.length)u.voice=vs[0];speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}}};

