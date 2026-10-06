const {makeStone,releaseGesture,createFlight,stepFlight,gestureSpin,clamp}=require('./physics.js');
const {RippleAudio,makeDrop,DURATION,readyToListen,noteEvents,tapEnergy,addTapEnergy,canExciteWater,movementLevel,releaseFinishAt}=require('./music.js');
const {instrumentAt}=require('./instruments.js');
const {ImpactHaptics,DeviceTilt}=require('../platform/hardware.js');
const PARTS=['pluck','bass','pad','bell','bloom'];

// Native gameplay owns its lifecycle and gestures. Pure rules and draw routines
// are a pinned snapshot of the actual lake website, not the older Ripple demo.
class LakeExperience{
  constructor(renderer,runtime,update,options={}){
    this.renderer=renderer;this.runtime=runtime;this.update=update;this.w=1;this.h=1;
    this.hand=null;this.drag=null;this.flights=[];this.waves=[];this.musicDrops=[];this.parts=[];
    this.entered=false;this.firstTouchHeard=false;this.entryStarted=null;this.entryDeparting=false;
    this.touchEnergy=0;this.smoothedTouchEnergy=0;this.lastWaterTap=-Infinity;
    this.listeningFingers=new Set();this.listeningReleasedAt=null;
    this.roundStart=null;this.handBorn=0;this.handDelay=.5;this.handRevealDuration=2;this.pendingContact=null;
    this.counter=0;this.throwId=0;this.listeningStart=null;this.lastTime=0;
    this.rareNoticePending=false;this.noticeUntil=0;this.toast='';this.toastQuiet=false;this.toastGuidance=false;this.rareToast=false;
    this.playing=false;this.settings=false;this.hidden=false;this.destroyed=false;this.reduced=false;
    this.lastUI=-Infinity;this.previousUI={};this.seed=options.seed||(()=>Math.floor(Math.random()*4294967296));
    this.audio=options.audio||new RippleAudio(()=>this.musicDrops,()=>this.syncSound(),runtime);
    this.haptics=new ImpactHaptics(runtime.api,()=>this.emit(),()=>runtime.nowMs());
    this.motion=new DeviceTilt(runtime.api,()=>this.emit());
    this.pickStone();this.handBorn=-5;this.lastTime=this.audio.now();
  }
  resize(w,h,angle=0){this.w=w;this.h=h;this.renderer.resize(w,h);this.cancelAllTouches();this.motion.calibrate(angle);this.emit(true);}
  dock(){return {x:this.w*.5,y:this.h<550?this.h*.61:this.h-242};}
  handRadius(){return (this.hand?this.hand.radius:.11)/.11*(this.w<600?33:39);}
  handVisibility(){const t=clamp((this.audio.now()-this.handBorn-this.handDelay)/this.handRevealDuration);return t*t*(3-2*t);}
  notice(text,quiet=false,guidance=false){this.toast=text;this.toastQuiet=quiet;this.toastGuidance=guidance;this.rareToast=false;this.noticeUntil=this.runtime.nowMs()+(quiet?2800:4700);this.emit();}
  syncSound(){
    if(this.destroyed)return;
    if(this.entered&&!this.hidden&&!this.settings&&!this.audio.paused&&this.audio.context&&this.audio.context.state==='suspended')this.audio.setPaused(true).catch(()=>{});
    this.emit();
  }
  enterLake(){
    if(this.entered)return;this.entered=true;this.entryStarted=this.audio.now();this.entryDeparting=true;
    if(this.hand&&this.hand.rare){this.handBorn=this.entryStarted;this.handDelay=2;}
    this.entryTimer=setTimeout(()=>{if(this.destroyed)return;this.entryDeparting=false;this.emit();},this.reduced?150:3200);
    this.motion.start();if(!this.haptics.enabled)this.notice('震动反馈未开启',true);this.emit(true);
  }
  async enterSound(){
    if(this.starting||this.entered)return;this.starting=true;this.entryNote='';this.emit();
    this.audio.setMuted(false);await this.activate(true);
    if(this.destroyed)return;
    if(this.audio.context&&this.audio.context.state==='running')this.enterLake();
    else this.entryNote='声音尚未开启，请再点一次，或静音进入。';
    this.starting=false;this.emit();
  }
  enterMuted(){if(this.entered)return;this.audio.setMuted(true);this.enterLake();}
  async activate(onStone=false){
    try{
      const resume=this.audio.paused?this.audio.setPaused(false):Promise.resolve();
      const unlock=this.audio.unlock();await Promise.all([resume,unlock]);if(this.destroyed)return;
      if(onStone&&!this.firstTouchHeard&&!this.audio.muted&&this.audio.context&&this.audio.context.state==='running'){
        this.firstTouchHeard=true;this.audio.voice({kind:'pluck',midi:62,gain:.075,duration:.55,pan:0,touch:'skip',rare:Boolean(this.hand&&this.hand.rare)},this.audio.context.currentTime,'first-touch');
      }
      if(this.pendingContact&&this.audio.context&&this.audio.context.state==='running'){
        const p=this.pendingContact;this.pendingContact=null;if(this.audio.now()-p.now<2)this.soundImpact(p.drop,p.hit,p.now);
      }
    }catch{if(!this.destroyed)this.notice('声音尚未唤醒，再轻触一下石头即可重试。');}
  }
  pickStone(fast=false){
    if(this.listeningStart!==null||this.drag||this.parts.length+this.flights.filter(f=>!f.consumed).length>=4)return;
    this.hand=makeStone(this.seed());this.handBorn=this.audio.now();this.handDelay=fast?1:2;this.handRevealDuration=fast?1:2;this.rareNoticePending=this.hand.rare;
  }
  pushWave(impact,now,extra={}){
    this.waves.push({...impact,time:now,phase:(impact.stone.seed%73)*.1,sides:[5,6,8][impact.stone.seed%3],color:impact.stone.seed%4,rare:impact.stone.rare,...extra});
    const active=this.waves.filter(w=>w.fadeStart==null);if(active.length>24){active[0].fadeStart=now;active[0].fadeEnd=now+.5;}
  }
  startMovement(now){
    this.listeningStart=now;this.listeningReleasedAt=null;this.listeningFingers.clear();this.touchEnergy=0;this.smoothedTouchEnergy=0;this.lastWaterTap=-Infinity;this.hand=null;this.drag=null;
    const rareDrop=this.parts.find(d=>d.stone&&d.stone.rare);
    if(rareDrop)for(const part of PARTS){if(this.parts.some(d=>d.part===part))continue;this.parts.push({...rareDrop,id:++this.counter,part,impacts:Math.max(2,rareDrop.impacts)});}
    for(const d of this.parts){d.finishAt=now+DURATION;d.ensembleStart=now;}
    this.musicDrops=[...this.musicDrops.filter(d=>d.fadeStart!=null&&d.finishAt>now),...this.parts];this.audio.schedule();this.emit(true);
  }
  onImpact(f,hit,now){
    this.pushWave(hit,now,{color:f.rippleColor,...(hit.index>0&&hit.skips?{fadeStart:now+2,fadeEnd:now+5}:{})});this.haptics.impact(hit.strength,hit.index);
    if(!f.consumed&&this.listeningStart===null){
      f.consumed=true;const p=this.renderer.project(hit.x,0,hit.z);
      if(this.roundStart===null)this.roundStart=Math.ceil(now/.75)*.75;
      const drop=makeDrop(clamp(p.x/this.w),clamp(p.y/this.h),hit.strength,this.roundStart,++this.counter);
      const zone=instrumentAt(clamp(p.x/this.w),clamp(p.y/this.h));
      drop.part=zone.part;drop.instrument=zone.name;drop.rippleColor=f.rippleColor;
      drop.touch=hit.skips?'skip':'lob';drop.loop=true;drop.impacts=0;drop.contactPitches=[];drop.brightness=.75+f.power*.5;
      drop.world={x:hit.x,z:hit.z};drop.stone=f.stone;drop.born=now;drop.sourceId=drop.id;f.drop=drop;this.parts.push(drop);this.musicDrops.push(drop);
    }
    const drop=f.drop;if(!drop)return;
    if(!hit.skips&&hit.index>0)drop.finalWorld={x:hit.x,z:hit.z,born:now};
    drop.impacts=Math.min(10,drop.impacts+1);if(drop.motif.length)drop.contactPitches[hit.index]=drop.motif[(hit.index*3)%drop.motif.length];
    this.soundImpact(drop,hit,now);this.audio.schedule();
  }
  soundImpact(drop,hit,now){
    if(!this.audio.context||this.audio.context.state!=='running'||this.audio.paused){this.pendingContact={drop,hit,now};return;}
    if(!drop.motif.length)return;const step=Math.max(0,Math.floor((now-drop.start)/.375));
    const notes=noteEvents(drop,step,hit.index).map(note=>({...note,gain:note.gain*(.65+hit.strength*.35)}));
    this.audio.waterImpact(hit,drop,Math.sqrt(notes.reduce((sum,n)=>sum+n.gain*n.gain,0)));for(const note of notes)this.audio.voice(note,this.audio.context.currentTime,drop.id);
  }
  launch(gesture,from){
    if(!this.hand||this.listeningStart!==null)return;
    const origin=this.renderer.unproject(from.x,from.y),vz=clamp(gesture.vz,.6,16),limit=.26*this.w/(this.h*.82);
    gesture={...gesture,headingLimit:limit,viewHalfSpan:.38*this.w/(this.h*.82),vz,vy:clamp(gesture.vy,0,2.7),vx:clamp(gesture.vx,-vz*limit,vz*limit)};
    this.flights.push(createFlight(this.hand,gesture,{...origin,id:++this.throwId,rippleColor:(this.parts.length+this.flights.filter(f=>!f.consumed).length)%4,consumed:false}));
    this.hand=null;if(this.rareToast)this.toast='';if(this.parts.length+this.flights.filter(f=>!f.consumed).length<4)this.pickStone();this.emit();
  }
  point(t){return {x:clamp(t.x,0,this.w),y:clamp(t.y,0,this.h),t:this.runtime.nowMs()};}
  touchStart(t){
    if(!this.entered||this.entryDeparting||this.settings||this.hidden)return;
    if(this.listeningStart!==null){this.holdListening(t);return;}
    if(this.drag)return;
    if(!this.hand){this.notice('稍等片刻，听这一掷的回应');return;}
    if(this.handVisibility()<.35)return;
    const p=this.point(t),dock=this.dock();
    if(Math.hypot(p.x-dock.x,p.y-dock.y)>Math.max(64,this.handRadius()*1.8)){this.notice('按住下方的石头，再向湖面甩出',false,true);return;}
    if(this.flights.filter(f=>f.alive).length>=3){this.notice('听一听刚才几颗石头的回应');return;}
    this.playing=true;if(this.toastGuidance){this.toast='';this.toastGuidance=false;}this.activate(true);
    this.drag={id:t.identifier,x:p.x,y:p.y,samples:[p]};this.emit();
  }
  touchMove(t){if(!this.drag||this.drag.id!==t.identifier)return;const p=this.point(t);this.drag.x=p.x;this.drag.y=p.y;this.drag.samples.push(p);if(this.drag.samples.length>180)this.drag.samples.splice(1,1);this.drag.spin=gestureSpin(this.drag.samples);}
  touchEnd(t){
    this.releaseListening(t.identifier);if(!this.drag||this.drag.id!==t.identifier)return;
    this.activate();const drag=this.drag,p=this.point(t);drag.samples.push(p);
    const gesture=releaseGesture(drag.samples,this.w,this.h,this.hand,p.t);this.drag=null;this.launch(gesture,p);
  }
  touchCancel(t){this.releaseListening(t.identifier);if(this.drag&&this.drag.id===t.identifier)this.drag=null;this.emit();}
  cancelAllTouches(){for(const id of [...this.listeningFingers])this.releaseListening(id);this.drag=null;}
  holdListening(t){
    if(this.point(t).y<this.h*.37||!canExciteWater(this.parts,this.audio.now()))return;
    this.listeningFingers.add(t.identifier);this.listeningReleasedAt=null;
    for(const d of this.parts){const level=movementLevel(d,this.audio.now());delete d.fadeStart;delete d.fadeLevel;delete d.finishAt;delete d.visualFadeLevel;d.resumeStart=this.audio.now();d.resumeFrom=level;}
    const ids=new Set(this.musicDrops.map(d=>d.id));this.musicDrops.push(...this.parts.filter(d=>!ids.has(d.id)));this.tapWater(t);
  }
  releaseListening(id){
    if(!this.listeningFingers.delete(id)||this.listeningFingers.size||this.listeningStart===null)return;
    const now=this.audio.now();this.listeningReleasedAt=now;
    for(const d of this.parts){const level=movementLevel(d,now);d.fadeStart=now;d.fadeLevel=.8*level;d.visualFadeLevel=level;delete d.resumeStart;d.finishAt=releaseFinishAt(this.listeningStart,now);}
  }
  tapWater(t){
    const p=this.point(t),now=this.audio.now();if(p.y<this.h*.37||!this.parts.length||!canExciteWater(this.parts,now))return;this.activate();
    this.touchEnergy=addTapEnergy(this.touchEnergy,now-this.lastWaterTap);this.lastWaterTap=now;
    const z=clamp(1.9*this.h*.82/Math.max(p.y-this.h*.367,1)-2,1,40),x=(p.x-this.w*.5)*(z+2)/(this.h*.82);
    const part=this.parts.reduce((nearest,d)=>Math.hypot(d.world.x-x,d.world.z-z)<Math.hypot(nearest.world.x-x,nearest.world.z-z)?d:nearest,this.parts[0]);
    this.pushWave({x,z,strength:.20+this.touchEnergy*.30,index:0,stone:part.stone},now,{echo:true,gain:(.25+this.touchEnergy*.35)*.30,excitement:this.touchEnergy});this.audio.schedule();
  }
  reset(fade=true){
    this.cancelAllTouches();this.listeningFingers.clear();this.listeningReleasedAt=null;this.pendingContact=null;this.touchEnergy=0;this.smoothedTouchEnergy=0;this.lastWaterTap=-Infinity;
    const now=this.audio.now();
    if(fade){
      for(const d of this.musicDrops){if(d.fadeStart!=null)continue;const remaining=clamp(((d.finishAt==null?now+38:d.finishAt)-now-2)/8);d.fadeLevel=remaining*remaining*(3-2*remaining);d.visualFadeLevel=.32+.68*(d.finishAt==null?1:clamp((d.finishAt-now)/9));d.fadeStart=now;d.finishAt=now+3.5;}
      for(const wave of this.waves)if(wave.fadeStart==null){wave.fadeStart=now;wave.fadeEnd=now+3.5;}
    }else{this.audio.clear();this.musicDrops=[];this.waves=[];}
    this.haptics.stop();this.roundStart=null;this.parts=[];this.flights=[];this.listeningStart=null;this.toast='';this.lastTime=now;this.pickStone(fade);this.emit(true);
  }
  again(){if(this.listeningStart===null||this.audio.now()-this.listeningStart<9)return;this.reset(true);this.activate();}
  toggleSound(){if(this.audio.context&&this.audio.context.state!=='running'&&!this.audio.muted){this.activate();return;}this.audio.setMuted(!this.audio.muted);if(!this.audio.muted)this.activate();this.emit();}
  openSettings(){this.cancelAllTouches();this.pauseBeforeDialog=this.audio.paused;this.settings=true;this.audio.setPaused(true).catch(()=>{});this.haptics.stop();this.motion.stop();this.emit();}
  closeSettings(){this.settings=false;if(!this.pauseBeforeDialog&&!this.hidden)this.audio.setPaused(false).catch(()=>{});if(!this.hidden&&this.entered)this.motion.start();this.emit();}
  hide(){if(this.hidden)return;this.cancelAllTouches();this.pauseBeforeHide=this.settings?this.pauseBeforeDialog:this.audio.paused;this.hidden=true;this.haptics.stop();this.motion.stop();this.audio.setPaused(true).catch(()=>{});}
  show(){if(!this.hidden)return;this.hidden=false;this.lastTime=this.audio.now();if(!this.pauseBeforeHide&&!this.settings)this.audio.setPaused(false).catch(()=>{});if(this.entered&&!this.settings)this.motion.start();this.emit(true);}
  tick(){
    if(this.destroyed||this.hidden)return;
    const now=this.audio.now(),dt=Math.min(.06,Math.max(0,now-this.lastTime));this.lastTime=now;
    if(!this.audio.paused){
      for(const f of this.flights)for(const hit of stepFlight(f,dt))this.onImpact(f,hit,now);
      this.flights=this.flights.filter(f=>f.alive);this.waves=this.waves.filter(v=>now-v.time<120&&(v.fadeEnd==null||now<v.fadeEnd));
      this.musicDrops=this.musicDrops.filter(d=>d.loop?now<(d.finishAt==null?Infinity:d.finishAt):now-d.start<(d.ensemble?DURATION:8));
      if(this.listeningStart===null&&!this.flights.length){if(readyToListen(this.parts))this.startMovement(now);else if(!this.hand&&!this.drag)this.pickStone();}
      if(this.listeningStart!==null){const energy=this.listeningFingers.size?Math.max(.15,this.touchEnergy):tapEnergy(this.touchEnergy,now-this.lastWaterTap);this.smoothedTouchEnergy+=(energy-this.smoothedTouchEnergy)*(1-Math.exp(-dt/(energy>this.smoothedTouchEnergy?1.25:2.4)));for(const d of this.parts)d.excitement=this.smoothedTouchEnergy;}
    }
    const visible=this.handVisibility();
    if(this.entered&&this.hand&&this.hand.rare&&this.rareNoticePending&&visible>0){this.notice('稀有晶石 · 为这一轮带来更丰富的齐奏');this.rareToast=true;this.rareNoticePending=false;}
    if(this.toast&&this.runtime.nowMs()>this.noticeUntil)this.toast='';
    this.renderer.draw({now,handRevealAge:now-this.handBorn-this.handDelay,entryProgress:this.entryStarted===null?0:clamp((now-this.entryStarted)/3.2),reduced:this.reduced,hand:this.hand,drag:this.drag,flights:this.flights,waves:this.waves,voices:[...this.musicDrops,...this.parts],tilt:this.motion.tilt,listen:this.listeningStart!==null,dock:this.dock(),handRadius:this.handRadius(),handOpacity:this.drag?1:visible});
    if(this.runtime.nowMs()-this.lastUI>=100){this.lastUI=this.runtime.nowMs();this.emit();}
  }
  emit(force=false){
    if(this.destroyed||!this.update)return;
    const age=this.listeningStart===null?0:this.audio.now()-this.listeningStart,visible=this.handVisibility();
    const next={entered:this.entered,entryDeparting:this.entryDeparting,starting:Boolean(this.starting),entryNote:this.entryNote||'',playing:this.playing,holding:Boolean(this.drag),listening:this.listeningStart!==null,settings:this.settings,
      sounding:Boolean(!this.audio.muted&&!this.audio.paused&&this.audio.context&&this.audio.context.state==='running'),
      stoneName:this.hand?this.hand.label:'听石头轻轻触水',rare:Boolean(this.hand&&this.hand.rare),stoneOpacity:Math.round((this.hand?visible:1)*100)/100,
      hint:this.hand?'按住石头，向湖面甩出':'下一块石头即将来到手中',scoreParts:Math.min(4,this.parts.length),
      scoreLabel:this.listeningStart!==null?'几次轻掷，湖面已成乐章':this.parts.length?`${this.parts.length} 个声部 · ${this.parts.length>=3?'再添一块，让声音更丰满':'前面的旋律仍在回响'}`:'湖面正在等你的第一颗石头',
      againVisible:this.listeningStart!==null&&age>=8,againDisabled:age<9,progress:Math.round(clamp(age/DURATION)*100),listeningLabel:age>=DURATION?'湖面静了，低头再寻一块':age>12?'让余韵慢慢散开':'静静听一会',
      toast:this.toast,toastQuiet:this.toastQuiet,toastGuidance:this.toastGuidance,toastOpacity:this.rareToast?(this.hand&&this.hand.rare?Math.round(visible*100)/100:0):1,
      hapticsAvailable:this.haptics?this.haptics.available:false,hapticsEnabled:this.haptics?this.haptics.enabled:false,hapticStatus:this.haptics?this.haptics.status:'检测中',motionAvailable:this.motion?this.motion.available:false,motionEnabled:this.motion?this.motion.wanted:false,motionStatus:this.motion?this.motion.status:'检测中',reduced:this.reduced};
    const patch={};for(const key of Object.keys(next))if(force||next[key]!==this.previousUI[key])patch[key]=next[key];this.previousUI=next;if(Object.keys(patch).length)this.update(patch);
  }
  destroy(){this.destroyed=true;clearTimeout(this.entryTimer);this.cancelAllTouches();this.motion.destroy();this.haptics.stop();this.audio.destroy();this.update=null;}
}
module.exports={LakeExperience};
