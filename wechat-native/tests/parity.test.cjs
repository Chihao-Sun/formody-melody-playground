const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const physics=require('../miniprogram/lib/pond/physics.js'),music=require('../miniprogram/lib/pond/music.js'),math=require('../miniprogram/lib/math/outer-billiards.js'),zones=require('../miniprogram/lib/pond/instruments.js');
test('pinned source hashes match the verified website snapshot',()=>{
  const manifest=require('../provenance.json');assert.equal(manifest.siteVersion,51);
  for(const [file,hash] of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(require('node:path').join(__dirname,'../baseline',file))).digest('hex'),hash);
});
test('native stones, gesture interpretation and flight paths equal website rules',async()=>{
  const web=await import('../baseline/pond/physics.js');
  for(const seed of [0,55,123,1729,0xffffffff])for(const [w,h] of [[320,640],[390,844],[844,390]]){
    const a=physics.makeStone(seed),b=web.makeStone(seed);assert.deepEqual(a,b);
    for(const samples of [[{x:w*.5,y:h*.7,t:0},{x:w*.8,y:h*.65,t:100}],[{x:w*.5,y:h*.7,t:0},{x:w*.54,y:h*.3,t:100}]]){
      const ga=physics.releaseGesture(samples,w,h,a,100),gb=web.releaseGesture(samples,w,h,b,100);assert.deepEqual(ga,gb);
      const fa=physics.createFlight(a,ga,{x:0,y:.8,z:1}),fb=web.createFlight(b,gb,{x:0,y:.8,z:1});
      for(let i=0;i<500&&fa.alive;i++)assert.deepEqual(physics.stepFlight(fa,1/40),web.stepFlight(fb,1/40));assert.deepEqual(fa,fb);
    }
  }
});
test('native motifs, instruments and all five voice note events equal website',async()=>{
  const web=await import('../baseline/pond/music.js'),webZones=await import('../baseline/pond/instruments.js');
  for(const x of [.1,.5,.9])for(const y of [.4,.6,.9]){
    assert.deepEqual(zones.instrumentAt(x,y),webZones.instrumentAt(x,y));
    const a=music.makeDrop(x,y,.8,0,1),b=web.makeDrop(x,y,.8,0,1);assert.deepEqual(a,b);
    for(const part of ['pluck','bass','pad','bell','bloom'])for(const rare of [true,false])for(let step=0;step<96;step++){
      const extras={part,stone:{rare},touch:'skip',loop:true,impacts:7,excitement:.6,finishAt:22};assert.deepEqual(music.noteEvents({...a,...extras},step),web.noteEvents({...b,...extras},step));
    }
  }
});
test('native original mathematics preserves singularity and computed trajectories',async()=>{
  const web=await import('../baseline/math/outer-billiards.js');
  for(const seed of [{x:1.2,y:1.22},{x:0,y:0},{x:3,y:2},{x:20,y:-3}])assert.deepEqual(math.traceOrbit(seed,math.regularPolygon(),512),web.traceOrbit(seed,web.regularPolygon(),512));
});
test('native listening envelopes equal website, including long holds and silent ending',async()=>{
  const web=await import('../baseline/pond/music.js');
  for(const age of [0,8,12,20,22,30])for(const d of [{finishAt:22},{fadeStart:10,fadeLevel:.4,finishAt:22},{resumeStart:9,resumeFrom:.4}])assert.equal(music.movementLevel(d,age),web.movementLevel(d,age));
  for(const [start,now] of [[0,12],[0,25]])assert.equal(music.releaseFinishAt(start,now),web.releaseFinishAt(start,now));
});
