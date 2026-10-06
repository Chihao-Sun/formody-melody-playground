const {config}=require('../../lib/config.js');
const {regularPolygon,traceOrbit}=require('../../lib/math/outer-billiards.js');
const {makePhrase}=require('../../lib/music/mapping.js');
const {InstrumentAudio}=require('../../lib/music/audio.js');
const {Scene}=require('../../lib/render/scene.js');
const {defaultRuntime}=require('../../lib/platform/runtime.js');
Page({
  data:{top:50,safeBottom:0,intro:true,running:false,coordinates:'',orbitStatus:'正在计算轨迹',bars:[],activeIndex:-1,error:'',about:false},
  onLoad(){this.alive=true;this.visible=true;this.events=[];this.state={seed:{...config.initialSeed},vertices:regularPolygon(config.math.vertices,config.math.radius,config.math.rotation),revision:0,active:null,running:false,phraseSteps:config.music.phraseSteps,stepDuration:60/config.music.bpm/config.music.stepsPerBeat};},
  onReady(){
    this.measure();this.runtime=defaultRuntime(wx);
    this.audio=new InstrumentAudio(config.music,()=>({phrase:this.phrase,revision:this.state.revision}),event=>this.events.push(event),running=>{
      if(!this.alive)return;this.state.running=running;this.setData({running});if(!running){this.events=[];this.state.active=null;this.setData({activeIndex:-1});}
    },this.runtime);
    this.setSeed(this.state.seed);
    wx.createSelectorQuery().in(this).select('#classic').fields({node:true,size:true}).exec(result=>{
      if(!this.alive)return;try{const box=result[0];if(!box||!box.node)throw new Error('画布加载失败，请返回后重试。');this.canvas=box.node;this.scene=new Scene(this.canvas,config.visual,this.runtime);this.scene.resize(box.width,box.height);this.schedule();}catch(error){this.setData({error:error.message});}
    });
  },
  measure(){const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();let capsule;try{capsule=wx.getMenuButtonBoundingClientRect();}catch{}this.setData({top:Math.max(capsule?capsule.bottom:0,(info.statusBarHeight||0)+32)+8,safeBottom:Math.max(0,info.screenHeight-(info.safeArea?info.safeArea.bottom:info.screenHeight))});},
  onResize(){this.measure();if(!this.scene)return;wx.createSelectorQuery().in(this).select('#classic').fields({size:true}).exec(r=>{if(this.alive&&r[0])this.scene.resize(r[0].width,r[0].height);});},
  setSeed(seed){
    if(!Number.isFinite(seed.x)||!Number.isFinite(seed.y))return;const s=this.state;s.seed={...seed};s.revision++;s.active=null;s.orbit=traceOrbit(seed,s.vertices,config.math.maxSteps);this.phrase=makePhrase(s.orbit,config.music);
    const {status,symbols,returnAfter}=s.orbit,messages={'return-detected':`${symbols.length} 步轨迹 · 数值回归 ${returnAfter} 步`,'iteration-limit':`${symbols.length} 步内未检测到回归`,'inside':'请把 Seed 放在五边形外','invalid':'起点坐标无效','singular':`第 ${symbols.length+1} 步切点不唯一 · 轨迹停止`,'numerical-limit':'已达到数值计算上限'};
    this.setData({coordinates:`x ${seed.x>=0?'+':''}${seed.x.toFixed(3)}   y ${seed.y>=0?'+':''}${seed.y.toFixed(3)}`,orbitStatus:messages[status],activeIndex:-1,bars:this.phrase.map((note,i)=>({id:i,height:note?8+(note.midi-Math.min(...config.music.midiByVertex))*1.7:3}))});
  },
  async play(){
    if(this.starting||!this.audio)return;if(this.state.running){this.audio.pause();return;}this.starting=true;this.setData({error:''});
    try{await this.audio.start();if(this.alive){if(!this.visible)this.audio.pause();else this.setData({intro:false});}}catch(error){if(this.alive)this.setData({error:error.message||'声音尚未开启，请再点击一次。'});}finally{this.starting=false;}
  },
  schedule(){if(!this.alive||!this.visible||!this.canvas||this.frameId!=null)return;this.frameId=this.canvas.requestAnimationFrame(()=>{
    this.frameId=null;if(!this.alive||!this.visible)return;const now=this.audio.time;while(this.events.length&&this.events[0].time<=now){const event=this.events.shift();if(event.revision!==this.state.revision)continue;this.state.active=event;this.setData({activeIndex:event.index});}this.scene.draw(this.state,now);this.schedule();
  });},
  move(e){if(!this.scene||this.data.intro||this.data.about)return;const touch=e.changedTouches&&e.changedTouches[0];if(touch)this.setSeed(this.scene.world(touch.x,touch.y));},
  reset(){this.setSeed(config.initialSeed);},back(){wx.navigateBack();},
  showAbout(){this.setData({about:true});},closeAbout(){this.setData({about:false});},noop(){},
  source(){wx.setClipboardData({data:'https://structures.uni-heidelberg.de/blog/posts/2024_01_costa/index.php'});},
  onHide(){this.visible=false;if(this.audio)this.audio.pause();if(this.canvas&&this.frameId!=null)this.canvas.cancelAnimationFrame(this.frameId);this.frameId=null;},
  onShow(){this.visible=true;this.schedule();},
  onUnload(){this.alive=false;this.visible=false;if(this.canvas&&this.frameId!=null)this.canvas.cancelAnimationFrame(this.frameId);if(this.audio)this.audio.destroy();},
  onShareAppMessage(){return {title:'Formody · 拨形见声｜原版数学体验',path:'/pages/classic/index'};}
});
