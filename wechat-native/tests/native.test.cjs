const test=require('node:test'),assert=require('node:assert/strict');
const {LakeExperience}=require('../miniprogram/lib/pond/experience.js');
const {makeStone}=require('../miniprogram/lib/pond/physics.js');
const {RippleAudio}=require('../miniprogram/lib/pond/music.js');
const {ImpactHaptics,DeviceTilt}=require('../miniprogram/lib/platform/hardware.js');
const {defaultRuntime,createStereoPanner,createReverb}=require('../miniprogram/lib/platform/runtime.js');
const {mockAudioContext,clockAudio,runtime}=require('./helpers.cjs');
function setup(seed=55){
  const clock={ms:0},audio=clockAudio(clock),patches=[],renderer={resize(){},project(x,y,z){return {x:195+x*10,y:600-z*5};},unproject(){return {x:0,y:.8,z:1};},draw(s){this.last=s;}};
  const e=new LakeExperience(renderer,runtime(clock),p=>patches.push(p),{audio,seed:()=>seed});e.resize(390,844);e.enterMuted();e.entryDeparting=false;
  const advance=seconds=>{for(let i=0;i<seconds*40;i++){clock.ms+=25;e.tick();}};
  return {e,clock,advance,patches,audio,renderer};
}
test('touching elsewhere does not throw; correct touch drags and releases',()=>{
  const {e,clock}=setup();try{
    e.touchStart({identifier:1,x:5,y:10});assert.equal(e.flights.length,0);assert.equal(e.drag,null);
    const p=e.dock();e.touchStart({identifier:1,...p});clock.ms+=50;e.touchMove({identifier:1,x:p.x+50,y:p.y-10});clock.ms+=50;e.touchEnd({identifier:1,x:p.x+90,y:p.y-20});assert.equal(e.flights.length,1);assert.equal(e.drag,null);
  }finally{e.destroy();}
});
test('cancel and unrelated fingers never launch a stone',()=>{
  const {e}=setup();try{e.touchStart({identifier:1,...e.dock()});e.touchEnd({identifier:2,...e.dock()});assert.ok(e.drag);e.touchCancel({identifier:1});assert.equal(e.drag,null);assert.equal(e.flights.length,0);}finally{e.destroy();}
});
test('four throws form one movement after all flights settle; each skip counts one stone',()=>{
  const {e,advance}=setup();try{
    for(let i=0;i<4;i++){e.launch({vx:0,vy:.4,vz:16,loft:.1,power:.8},e.dock());advance(5);assert.equal(e.parts.filter(d=>d.sourceId===d.id).length,i+1);}
    assert.notEqual(e.listeningStart,null);assert.equal(e.flights.length,0);assert.equal(e.hand,null);assert.ok(e.parts.every(d=>d.loop));assert.ok(e.parts[0].impacts>=2);
  }finally{e.destroy();}
});
test('native delayed next stone and only explicit seek restart at silent ending',()=>{
  const {e,advance}=setup();try{e.launch({vx:0,vy:.4,vz:16,loft:.1,power:.8},e.dock());assert.equal(e.handVisibility(),0);advance(2);assert.ok(e.handVisibility()<.02);advance(2);assert.ok(e.handVisibility()>.99);
    for(let i=1;i<4;i++){e.launch({vx:0,vy:2.4,vz:12,loft:.8,power:.8},e.dock());advance(5);}advance(30);assert.equal(e.hand,null);assert.notEqual(e.listeningStart,null);e.again();assert.equal(e.listeningStart,null);assert.ok(e.hand);assert.equal(e.parts.length,0);
  }finally{e.destroy();}
});
test('rare crystal adds five roles without adding a fifth real stone wave source',()=>{
  const {e,advance}=setup(2000);try{assert.equal(makeStone(2000).rare,true);for(let i=0;i<4;i++){e.launch({vx:0,vy:2.4,vz:12,loft:.8,power:.8},e.dock());advance(5);}assert.equal(new Set(e.parts.map(d=>d.part)).size,5);assert.equal(new Set(e.parts.map(d=>d.sourceId)).size,4);}finally{e.destroy();}
});
test('multifinger listening hold does not fade until the last finger leaves',()=>{
  const {e,advance}=setup();try{for(let i=0;i<4;i++){e.launch({vx:0,vy:2.4,vz:12,loft:.8,power:.8},e.dock());advance(5);}e.touchStart({identifier:1,x:190,y:500});e.touchStart({identifier:2,x:200,y:550});assert.equal(e.listeningFingers.size,2);assert.ok(e.touchEnergy>0);e.touchEnd({identifier:1,x:190,y:500});assert.equal(e.parts[0].fadeStart,undefined);e.touchEnd({identifier:2,x:200,y:550});assert.notEqual(e.parts[0].fadeStart,undefined);}finally{e.destroy();}
});
test('background and settings freeze gameplay; unload closes native resources',async()=>{
  const {e,advance,audio}=setup();e.launch({vx:0,vy:2.4,vz:12,loft:.8,power:.8},e.dock());const age=e.flights[0].age;e.hide();advance(10);assert.equal(e.flights[0].age,age);e.show();await Promise.resolve();advance(.2);assert.ok(e.flights[0].age>age);e.openSettings();const age2=e.flights[0].age;advance(.2);assert.equal(e.flights[0].age,age2);e.closeSettings();e.destroy();assert.equal(audio.destroyed,true);assert.equal(e.motion.enabled,false);
});
test('native haptics maps decaying impacts into levels, throttles and reports failure',()=>{
  const calls=[],clock={ms:0},h=new ImpactHaptics({vibrateShort:o=>calls.push(o)},()=>{},()=>clock.ms);
  assert.equal(h.impact(1,0),true);assert.equal(h.impact(1,0),false);clock.ms=100;h.impact(.6,1);clock.ms=200;h.impact(.3,2);assert.deepEqual(calls.map(o=>o.type),['heavy','medium','light']);calls[2].fail({errMsg:'not allowed'});assert.equal(h.available,false);assert.equal(h.enabled,false);clock.ms=300;assert.equal(h.impact(1),false);
});
test('DeviceMotion radians reproduce browser degree sensitivity and calibration',()=>{
  let listener,starts=0,stops=0;const api={onDeviceMotionChange:f=>listener=f,offDeviceMotionChange(){listener=null;},startDeviceMotionListening(o){starts++;o.success();},stopDeviceMotionListening(){stops++;}};
  const m=new DeviceTilt(api);try{m.start();listener({beta:0,gamma:0});listener({beta:10*Math.PI/180,gamma:7.5*Math.PI/180});assert.ok(Math.abs(m.tilt.x-.5)<1e-9);assert.ok(Math.abs(m.tilt.y-.5)<1e-9);m.calibrate(90);listener({beta:0,gamma:0});listener({beta:15*Math.PI/180,gamma:0});assert.ok(Math.abs(m.tilt.x-1)<1e-9);m.stop();assert.equal(m.tilt.x,0);assert.equal(listener,null);m.start();assert.equal(starts,2);}finally{m.destroy();assert.ok(stops>=2);}
});
test('denied sensor start remains optional and never prevents gameplay',()=>{
  const m=new DeviceTilt({onDeviceMotionChange(){},offDeviceMotionChange(){},startDeviceMotionListening(o){o.fail();},stopDeviceMotionListening(){}});m.start();assert.equal(m.enabled,false);assert.equal(m.status,'设备或系统未允许');m.destroy();
});
test('native stereo wrapper connects only native nodes and uses equal-power pan',()=>{
  const c=mockAudioContext(),pan=createStereoPanner(c);pan.pan.value=-1;pan.connect(c.destination);assert.ok(c.nodes.every(n=>n.connections.every(([dest])=>dest.kind)));const gains=c.nodes.filter(n=>n.kind==='gain');assert.equal(gains[1].gain.value,1);assert.ok(gains[2].gain.value<1e-9);pan.disconnect();assert.ok(gains.every(n=>n.disconnected));
});
test('native reverb fallback uses stable feedback and disconnects the whole graph',()=>{
  const c=mockAudioContext(),r=createReverb(c);assert.equal(r.convolution,false);r.connect(c.destination);const feedback=c.nodes.filter(n=>n.kind==='gain'&&n.gain.value>.5);assert.equal(feedback.length,4);assert.ok(feedback.every(n=>n.gain.value<1));r.disconnect();assert.ok(c.nodes.filter(n=>n.kind!=='destination').every(n=>n.disconnected));
});
test('native synthesis and callback-only decode work without browser-only audio nodes',async()=>{
  const c=mockAudioContext(),clock={ms:0};const api={createWebAudioContext:()=>c,getPerformance:()=>({now:()=>clock.ms}),getFileSystemManager:()=>({readFile:o=>o.success({data:new ArrayBuffer(8)})})};const r=defaultRuntime(api),a=new RippleAudio(()=>[],()=>{},r);
  try{await a.unlock();await a.loadWaterSamples();assert.equal(c.state,'running');assert.equal(a.waterBuffers.size,5);a.voice({kind:'pluck',midi:62,gain:.08,duration:1,pan:.3},0,1);a.waterImpact({skips:true,index:0,x:0,z:5,stone:makeStone(55)},{id:1},.08);assert.ok(a.voices.size>=2);assert.ok(a.events.some(e=>e.midi===62));await a.setPaused(true);const t=a.now();clock.ms+=1000;assert.equal(a.now(),t);await a.setPaused(false);a.clear();assert.equal(a.voices.size,0);}finally{a.destroy();assert.equal(c.state,'closed');}
});
