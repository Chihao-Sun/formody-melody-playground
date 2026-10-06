const test=require('node:test'),assert=require('node:assert/strict');
const {mockAudioContext}=require('./helpers.cjs');
function environment(pageFile){
  const clock={ms:0},frames=new Map();let id=0,definition,listener;
  function canvas(){
    const context=new Proxy({setTransform(){},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});
    const node={getContext:()=>context,requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),createImage:()=>{const img={};Object.defineProperty(img,'src',{set(){if(img.onload)img.onload();}});return img;}};return node;
  }
  const surface=canvas(),api={getWindowInfo:()=>({windowWidth:390,windowHeight:844,screenHeight:844,statusBarHeight:24,pixelRatio:2,safeArea:{bottom:810}}),getMenuButtonBoundingClientRect:()=>({bottom:56}),getPerformance:()=>({now:()=>clock.ms}),createOffscreenCanvas:canvas,createWebAudioContext:mockAudioContext,getFileSystemManager:()=>({readFile:o=>o.success({data:new ArrayBuffer(8)})}),onDeviceMotionChange:f=>listener=f,offDeviceMotionChange:()=>listener=null,startDeviceMotionListening:o=>o.success(),stopDeviceMotionListening(){},vibrateShort:o=>o.success(),navigateTo(){},navigateBack(){},setClipboardData(){},createSelectorQuery(){return {in(){return this;},select(){return this;},fields(){return this;},exec(callback){callback([{node:surface,width:390,height:844}]);}};}};
  global.wx=api;global.Page=p=>definition=p;delete require.cache[require.resolve(pageFile)];require(pageFile);
  const page={...definition,data:{...definition.data},setData(p){Object.assign(this.data,p);}};
  return {page,clock,frames,get listener(){return listener;},cleanup(){page.onUnload();delete global.wx;delete global.Page;}};
}
test('native pond Page initializes canvas, settings bindings, and lifecycle without DOM',async()=>{
  const env=environment('../miniprogram/pages/pond/index.js'),p=env.page;
  try{p.onLoad();p.onShow();p.onReady();assert.ok(p.experience);assert.equal(p.data.top,64);assert.equal(p.data.safeBottom,34);p.enterMuted();p.openSettings();assert.equal(p.data.settings,true);p.closeSettings();p.onHide();assert.equal(env.frames.size,0);assert.equal(p.experience.hidden,true);p.onShow();assert.equal(env.frames.size,1);await Promise.resolve();p.onResize();assert.equal(p.experience.w,390);assert.ok(p.onShareAppMessage().path.includes('/pond/'));}finally{env.cleanup();assert.equal(env.frames.size,0);assert.equal(env.listener,null);}
});
test('native Page dispatches every changed finger with canvas-relative coordinates',()=>{
  const env=environment('../miniprogram/pages/pond/index.js'),p=env.page;
  try{p.onLoad();p.onReady();const calls=[];p.experience.touchStart=t=>calls.push(t);p.touchStart({changedTouches:[{identifier:1,x:190,y:602},{identifier:2,x:200,y:550}]});assert.equal(calls.length,2);assert.deepEqual(calls[0],{identifier:1,x:190,y:602});}finally{env.cleanup();}
});
test('native original math Page starts, updates Seed, resets and closes audio',async()=>{
  const env=environment('../miniprogram/pages/classic/index.js'),p=env.page;
  try{p.onLoad();p.onReady();assert.equal(p.data.bars.length,16);await p.play();assert.equal(p.data.running,true);assert.equal(p.data.intro,false);p.move({changedTouches:[{x:330,y:330}]});assert.equal(p.state.revision,2);p.reset();assert.equal(p.state.seed.x,1.2);p.onHide();assert.equal(p.data.running,false);assert.equal(env.frames.size,0);p.onShow();assert.equal(env.frames.size,1);}finally{env.cleanup();assert.equal(env.frames.size,0);}
});
