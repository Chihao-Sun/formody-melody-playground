const {defaultRuntime}=require('../../lib/platform/runtime.js');
const {PondRenderer}=require('../../lib/pond/renderer.js');
const {LakeExperience}=require('../../lib/pond/experience.js');
Page({
  data:{dots:[0,1,2,3],entered:false,entryDeparting:false,entryNote:'',starting:false,settings:false,playing:false,listening:false,scoreParts:0,scoreLabel:'湖面正在等你的第一颗石头',stoneName:'一块河石',stoneOpacity:1,hint:'按住石头，向湖面甩出',againVisible:false,againDisabled:true,progress:0,toast:'',top:50,safeBottom:0,error:'',guideOpen:false,mathOpen:false,creditsOpen:false},
  onLoad(){this.visible=true;this.alive=true;this.lastFrame=-Infinity;},
  onReady(){this.initialize();},
  initialize(){
    this.setData({error:''});this.measure();
    wx.createSelectorQuery().in(this).select('#pond').fields({node:true,size:true}).exec(result=>{
      if(!this.alive)return;
      try{
        const box=result&&result[0];if(!box||!box.node)throw new Error('湖面画布尚未准备好，请更新微信后重试。');
        this.canvas=box.node;const runtime=defaultRuntime(wx,message=>{if(this.alive)this.setData({error:message});});
        this.runtime=runtime;const renderer=new PondRenderer(this.canvas,runtime);
        this.experience=new LakeExperience(renderer,runtime,patch=>{if(this.alive)this.setData(patch);});
        this.experience.resize(box.width,box.height,this.orientationAngle());
        if(!this.visible)this.experience.hide();this.schedule();
      }catch(error){this.setData({error:error.message||'湖面未能加载，请重试。'});}
    });
  },
  measure(){const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();let capsule=null;try{capsule=wx.getMenuButtonBoundingClientRect();}catch{}
    this.info=info;const top=Math.max((capsule&&capsule.bottom)||0,(info.statusBarHeight||0)+32)+8;
    this.setData({top,safeBottom:Math.max(0,info.screenHeight-(info.safeArea?info.safeArea.bottom:info.screenHeight))});
  },
  orientationAngle(){return this.info&&this.info.windowWidth>this.info.windowHeight?'landscape':0;},
  onResize(){this.measure();if(!this.experience)return;wx.createSelectorQuery().in(this).select('#pond').fields({size:true}).exec(r=>{if(!this.alive||!this.experience||!r[0])return;this.experience.resize(r[0].width,r[0].height,this.orientationAngle());});},
  schedule(){if(!this.alive||!this.visible||!this.canvas||this.frameId!=null)return;this.frameId=this.canvas.requestAnimationFrame(()=>{
    this.frameId=null;if(!this.alive||!this.visible)return;const now=this.runtime.nowMs();
    if(now-this.lastFrame>=(this.experience.reduced?50:1000/40)){this.lastFrame=now;this.experience.tick();}this.schedule();
  });},
  onHide(){this.visible=false;if(this.frameId!=null&&this.canvas)this.canvas.cancelAnimationFrame(this.frameId);this.frameId=null;if(this.experience)this.experience.hide();},
  onShow(){this.visible=true;if(this.experience)this.experience.show();this.lastFrame=-Infinity;this.schedule();},
  onUnload(){this.alive=false;this.visible=false;if(this.frameId!=null&&this.canvas)this.canvas.cancelAnimationFrame(this.frameId);if(this.experience)this.experience.destroy();this.experience=null;},
  retry(){if(this.experience)this.experience.destroy();this.experience=null;if(this.frameId!=null&&this.canvas)this.canvas.cancelAnimationFrame(this.frameId);this.frameId=null;this.initialize();},
  touches(event,method){if(!this.experience)return;for(const touch of event.changedTouches||[])this.experience[method](touch);},
  touchStart(e){this.touches(e,'touchStart');},touchMove(e){this.touches(e,'touchMove');},touchEnd(e){this.touches(e,'touchEnd');},touchCancel(e){this.touches(e,'touchCancel');},
  enterSound(){if(this.experience)this.experience.enterSound();},enterMuted(){if(this.experience)this.experience.enterMuted();},
  sound(){if(this.experience)this.experience.toggleSound();},again(){if(this.experience)this.experience.again();},
  openSettings(){if(this.experience)this.experience.openSettings();},closeSettings(){if(this.experience)this.experience.closeSettings();},
  haptics(){if(this.experience)this.experience.haptics.setEnabled(!this.experience.haptics.enabled);},
  motion(){if(this.experience)this.experience.motion.setWanted(!this.experience.motion.wanted);},
  reduced(){if(!this.experience)return;this.experience.reduced=!this.experience.reduced;this.experience.motion.reduced=this.experience.reduced;this.experience.motion.calibrate(this.orientationAngle());this.experience.emit();},
  section(e){const key=e.currentTarget.dataset.section;this.setData({[key]:!this.data[key]});},
  classic(){wx.navigateTo({url:'/pages/classic/index'});},
  copySource(e){wx.setClipboardData({data:e.currentTarget.dataset.url});},
  noop(){},
  onShareAppMessage(){return {title:'Formody · 拨形见声｜几次轻掷，湖面成章',path:'/pages/pond/index'};},
  onShareTimeline(){return {title:'Formody · 拨形见声'};}
});
