// Optional offscreen draw verification, NOT WeChat/phone screenshots.
// Uses @napi-rs/canvas from a local runtime; it is not a mini-program dependency.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const canvasPackage=process.env.FORMODY_CANVAS_MODULE||'@napi-rs/canvas';
const canvasLib=require(canvasPackage),createCanvas=canvasLib.createCanvas||((w,h)=>new canvasLib.Canvas(w,h));
const root=path.resolve(__dirname,'..');
let decodedLake;
function AssetImage(){const c=createCanvas(decodedLake.width,decodedLake.height);c.getContext('2d').drawImage(decodedLake,0,0);c.complete=true;c.naturalWidth=decodedLake.width;Object.defineProperty(c,'src',{set(){if(c.onload)c.onload();}});return c;}
function surface(){const c=createCanvas(1,1);c.createImage=()=>new AssetImage();return c;}
async function run(){
  decodedLake=await canvasLib.loadImage(path.join(root,'miniprogram/assets/lake.png'));
  const {PondRenderer:Native}=require('../miniprogram/lib/pond/renderer.js');
  global.Image=AssetImage;global.OffscreenCanvas=function(){return createCanvas(1,1);};global.devicePixelRatio=1;
  const {PondRenderer:Web}=await import('../baseline/pond/renderer.js');
  const {makeStone}=require('../miniprogram/lib/pond/physics.js');
  const out=path.join(root,'docs/offscreen-checks');fs.mkdirSync(out,{recursive:true});const results=[];
  for(const [w,h]of [[390,844],[844,390]])for(const mode of ['ready','ripples']){
    const a=surface(),b=surface();const runtime={nowMs:()=>0,pixelRatio:()=>1,offscreen:()=>createCanvas(1,1),assetError:m=>{throw new Error(m);}};
    const native=new Native(a,runtime),web=new Web(b);native.lakeLoaded=true;native.resize(w,h);web.resize(w,h);
    const stone=makeStone(55),state={now:10,entryProgress:1,reduced:false,hand:stone,drag:null,flights:[],waves:mode==='ready'?[]:[{x:0,z:8,time:8,strength:.8,stone,phase:1,sides:5,color:0}],voices:[],tilt:{x:0,y:0},listen:false,dock:{x:w/2,y:h<550?h*.61:h-242},handRadius:33,handOpacity:1};
    native.draw(state);web.draw(state);
    const ap=a.getContext('2d').getImageData(0,0,w,h).data,bp=b.getContext('2d').getImageData(0,0,w,h).data;
    let changed=0,max=0;for(let i=0;i<ap.length;i++)if(ap[i]!==bp[i]){changed++;max=Math.max(max,Math.abs(ap[i]-bp[i]));}
    assert.equal(changed,0,`Draw parity ${w}x${h} ${mode}`);
    fs.writeFileSync(path.join(out,`${w}x${h}-${mode}.png`),await a.toBuffer('png'));results.push({width:w,height:h,mode,changedChannels:changed,maxChannelDelta:max});
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({renderer:'local offscreen Canvas; not WeChat runtime',results},null,2)+'\n');console.log(results);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
