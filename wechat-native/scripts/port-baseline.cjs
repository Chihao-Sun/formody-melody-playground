// One-time reproducible native snapshot. Not automatic website synchronization.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/port-baseline.cjs /path/to/site/dist');
const files=['pond/physics.js','pond/instruments.js','pond/music.js','pond/renderer.js','math/outer-billiards.js','config.js','music/mapping.js','music/clock.js','music/audio.js','render/scene.js'];
const manifest={siteVersion:51,siteCommit:'38ee25d3f9cb41dac9307d93bd7c91f1e6571ca6',files:{}};
function replace(s,a,b){if(!s.includes(a))throw new Error('Baseline changed: '+a.slice(0,90));return s.replace(a,b);}
function commonjs(s){
  const names=new Set();
  s=s.replace(/^import \{([^}]+)\} from '([^']+)';/gm,(_,n,p)=>`const {${n}} = require('${p}');`);
  s=s.replace(/export (function|class|const) (\w+)/g,(_,kind,name)=>{names.add(name);return kind+' '+name;});
  s=s.replace(/export \{([^}]+)\};/g,(_,list)=>{list.split(',').map(n=>n.trim()).forEach(n=>names.add(n));return '';});
  return s+'\nmodule.exports={'+[...names].join(',')+'};\n';
}
for(const file of files){
  const original=fs.readFileSync(path.join(input,'src',file),'utf8');
  const baseline=path.join(root,'baseline',file);fs.mkdirSync(path.dirname(baseline),{recursive:true});fs.writeFileSync(baseline,original);
  manifest.files[file]=crypto.createHash('sha256').update(original).digest('hex');
  let s=original;
  if(file==='pond/physics.js')s=s.replace('samples.at(-1)','samples[samples.length-1]');
  if(file==='pond/music.js'){
    s=replace(s,'constructor(getDrops, onState = () => {}) {','constructor(getDrops, onState = () => {}, runtime = defaultRuntime()) {\n    this.runtime=runtime;');
    const start=s.indexOf("    this.waterDownloads=typeof window");const end=s.indexOf('    this.timer =',start);
    s=s.slice(0,start)+"    this.waterDownloads=this.runtime.waterDownloads();\n"+s.slice(end);
    s=replace(s,'const current=this.now(),AudioContext=window.AudioContext||window.webkitAudioContext;', 'const current=this.now();');
    s=replace(s,"      if(!AudioContext)throw new Error('此浏览器不支持音频');",'');
    s=replace(s,"      try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}",'');
    s=replace(s,"this.context=new AudioContext({latencyHint:'interactive'});",'this.context=this.runtime.createAudioContext();');
    s=replace(s,"this.context.addEventListener('statechange',()=>this.onState());","this.context.onstatechange=()=>this.onState();");
    s=replace(s,'      this.buildGraph();','      try{this.buildGraph();}catch(error){const failed=this.context;this.context=null;Promise.resolve(failed.close()).catch(()=>{});throw error;}');
    s=s.replaceAll('performance.now()','this.runtime.nowMs()');
    s=replace(s,'this.reverb = c.createConvolver();','this.reverb = createReverb(c);');
    s=replace(s,'    const buffer = c.createBuffer(2,', '    if(this.destroyed||this.context!==c||!reverb.convolution)return;\n    const buffer = c.createBuffer(2,');
    s=replace(s,'this.input.connect(this.reverb);','this.input.connect(this.reverb.input);');
    s=s.replaceAll('c.createStereoPanner()','createStereoPanner(c)');
    s=s.replaceAll('filter.connect(pan)','filter.connect(pan.input)');
    const loadStart=s.indexOf('  async loadWaterSamples(){'),loadEnd=s.indexOf('  waterImpact(',loadStart);
    if(loadStart<0||loadEnd<0)throw new Error('Sample loader baseline missing');
    s=s.slice(0,loadStart)+`  loadWaterSamples(){
    if(this.destroyed||!this.context)return Promise.resolve();
    if(this.waterLoadPromise)return this.waterLoadPromise;
    const context=this.context;
    this.waterLoadPromise=(async()=>{
      for(const entry of await this.waterDownloads){
        if(!entry||this.destroyed||this.context!==context)continue;
        try{const [key,bytes]=entry,buffer=await this.runtime.decodeAudio(context,bytes.slice(0));if(!this.destroyed&&this.context===context)this.waterBuffers.set(key,buffer);}catch{}
      }
    })();return this.waterLoadPromise;
  }
`+s.slice(loadEnd);
    s=replace(s,'    clearInterval(this.timer); this.clear();\n    if (this.context) this.context.close().catch(() => {});',`    clearInterval(this.timer);this.destroyed=true;
    for(const voice of [...this.voices])this.disposeVoice(voice);
    if(this.context){
      for(const node of [this.input,this.waterInput,this.delay,this.reverb,this.master,this.analyser])if(node)node.disconnect();
      this.context.onstatechange=()=>{};
      Promise.resolve(this.context.close()).catch(()=>{});this.context=null;
    }`);
    s="const {defaultRuntime,createStereoPanner,createReverb}=require('../platform/runtime.js');\n"+s;
  }
  if(file==='pond/renderer.js'){
    s=replace(s,'constructor(canvas){','constructor(canvas, runtime = defaultRuntime()){\n    this.runtime=runtime;');
    s=replace(s,"this.rippleLayer=canvas.ownerDocument?.createElement('canvas')??(typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1,1):null);",'this.rippleLayer=runtime.offscreen();');
    s=replace(s,"this.lake=new Image();this.lake.src='./assets/lake.png';","this.lake=canvas.createImage();this.lakeLoaded=false;this.lake.onload=()=>{this.lakeLoaded=true;};this.lake.onerror=()=>runtime.assetError('湖面图片加载失败');this.lake.src='/assets/lake.png';");
    s=replace(s,'devicePixelRatio||1','this.runtime.pixelRatio()||1');
    s=s.replaceAll('performance.now()','this.runtime.nowMs()');
    s=replace(s,'this.lake.complete&&this.lake.naturalWidth','this.lakeLoaded');
    s=replace(s,'hsl(${stone.hue+(stone.rare?light*42:0)} ${sat}% ${lum}%)','hsl(${stone.hue+(stone.rare?light*42:0)}, ${sat}%, ${lum}%)');
    s="const {defaultRuntime}=require('../platform/runtime.js');\n"+s;
  }
  if(file==='render/scene.js'){
    s=replace(s,'constructor(canvas, options) {','constructor(canvas, options, runtime = defaultRuntime()) {\n    this.runtime=runtime;');
    s=replace(s,'    this.resize();\n    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);','');
    s=replace(s,'  resize() {\n    const rect = this.canvas.getBoundingClientRect();','  resize(width,height) {\n    const rect = {width,height};');
    s=replace(s,'devicePixelRatio || 1','this.runtime.pixelRatio() || 1');
    s="const {defaultRuntime}=require('../platform/runtime.js');\n"+s;
  }
  if(file==='music/audio.js'){
    s=replace(s,'constructor(options, getPhrase, onEvent, onState) {','constructor(options, getPhrase, onEvent, onState, runtime = defaultRuntime()) {\n    this.runtime=runtime;');
    s=replace(s,'      const AudioContextClass = window.AudioContext || window.webkitAudioContext;\n      if (!AudioContextClass) throw new Error(\'当前浏览器不支持 Web Audio，请用较新的 Safari、Chrome 或 Firefox。\');\n      this.context = new AudioContextClass();','      this.context = this.runtime.createAudioContext();');
    s=replace(s,"voice.oscillator.addEventListener('ended', () => this.voices.delete(voice), { once: true });","const cleanup=voice.oscillator.onended;voice.oscillator.onended=()=>{cleanup();this.voices.delete(voice);};");
    s=replace(s,'oscillator.connect(filter).connect(envelope).connect(output);','oscillator.connect(filter);filter.connect(envelope);envelope.connect(output);');
    s=replace(s,'this.delay.connect(this.feedback).connect(this.delay);','this.delay.connect(this.feedback);this.feedback.connect(this.delay);');
    s=replace(s,'this.delay.connect(this.wet).connect(this.master);','this.delay.connect(this.wet);this.wet.connect(this.master);');
    s=replace(s,'this.master.connect(compressor).connect(ctx.destination);','this.master.connect(compressor);compressor.connect(ctx.destination);');
    s=replace(s,'  get time()', '  destroy(){this.pause();if(this.context){this.context.onstatechange=()=>{};Promise.resolve(this.context.close()).catch(()=>{});this.context=null;}}\n  get time()');
    s="const {defaultRuntime}=require('../platform/runtime.js');\n"+s;
  }
  const out=path.join(root,'miniprogram/lib',file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,'// Native snapshot of verified Sites v51. See provenance.json.\n'+commonjs(s));
}
fs.writeFileSync(path.join(root,'baseline/package.json'),'{"type":"module"}\n');
fs.writeFileSync(path.join(root,'provenance.json'),JSON.stringify(manifest,null,2)+'\n');
fs.mkdirSync(path.join(root,'miniprogram/assets/water'),{recursive:true});
for(const asset of ['lake.png','water/skip-1.wav','water/skip-2.wav','water/skip-3.wav','water/small.wav','water/large.wav'])fs.copyFileSync(path.join(input,'assets',asset),path.join(root,'miniprogram/assets',asset));
console.log('Native modules and original assets prepared; website untouched.');
