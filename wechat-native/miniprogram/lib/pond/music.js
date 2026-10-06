// Native snapshot of verified Sites v51. See provenance.json.
const {defaultRuntime,createStereoPanner,createReverb}=require('../platform/runtime.js');
// Euclidean coordinates, y upwards. Convex CCW polygon; left tangent convention.
const cross = (a, b) => a.x * b.y - a.y * b.x;
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function regularPolygon(n = 5, radius = 1, rotation = Math.PI / 2) {
  if (!Number.isInteger(n) || n < 3 || !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(rotation)) {
    throw new RangeError('Expected n ≥ 3, a positive finite radius and finite rotation.');
  }
  return Array.from({ length: n }, (_, i) => ({
    x: radius * Math.cos(rotation + i * 2 * Math.PI / n),
    y: radius * Math.sin(rotation + i * 2 * Math.PI / n),
  }));
}

function tolerance(vertices) {
  return 1e-9 * Math.max(1, ...vertices.map(v => Math.hypot(v.x, v.y)));
}

function insideOrOnBoundary(point, vertices, eps = tolerance(vertices)) {
  return vertices.every((v, i) => {
    const edge = sub(vertices[(i + 1) % vertices.length], v);
    return cross(edge, sub(point, v)) / Math.hypot(edge.x, edge.y) >= -eps;
  });
}

function outerBilliardsStep(point, vertices) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return { status: 'invalid' };
  const eps = tolerance(vertices);
  if (insideOrOnBoundary(point, vertices, eps)) return { status: 'inside' };
  for (let vertex = 0; vertex < vertices.length; vertex++) {
    const pivot = vertices[vertex];
    const ray = sub(pivot, point);
    const length = Math.hypot(ray.x, ray.y);
    const sides = vertices.map(v => cross(ray, sub(v, point)) / length);
    if (sides.every(s => s >= -eps)) {
      // A support line along an entire side has no unique point of tangency.
      if (sides.some((s, i) => i !== vertex && Math.abs(s) <= eps)) {
        return { status: 'singular' };
      }
      return {
        status: 'ok', vertex, pivot,
        next: { x: 2 * pivot.x - point.x, y: 2 * pivot.y - point.y },
      };
    }
  }
  return { status: 'singular' };
}

function traceOrbit(seed, vertices, maxSteps = 512) {
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 100000) throw new RangeError('Invalid iteration budget.');
  const points = [{ ...seed }];
  const symbols = [];
  let point = { ...seed };
  for (let i = 0; i < maxSteps; i++) {
    const step = outerBilliardsStep(point, vertices);
    if (step.status !== 'ok') return { points, symbols, status: step.status, returnAfter: null };
    point = step.next;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.hypot(point.x, point.y) > 1e6) {
      return { points, symbols, status: 'numerical-limit', returnAfter: null };
    }
    symbols.push(step.vertex);
    points.push(point);
    if (distance(point, seed) < tolerance(vertices) * 10) {
      return { points, symbols, status: 'return-detected', returnAfter: symbols.length };
    }
  }
  return { points, symbols, status: 'iteration-limit', returnAfter: null };
}


// Pure, deterministic composition model. Seconds are on the shared transport.
const DURATION = 22;
const MAX_DROPS = 4;
const BEAT = 60 / 80;
const SCALE = [0, 2, 4, 7, 9]; // D-major pentatonic; all voices share it.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const PHASES = [
  ['RIPPLE', '涟漪', '一个落点，世界开始回应。'],
  ['INTERWEAVE', '交织', '线条相遇，旋律长出新的声部。'],
  ['RESONANCE', '齐奏', '从一处微光，铺开整片声色。'],
  ['AFTERGLOW', '余韵', '纹样慢慢晕开，声音回到安静。'],
];
function phaseAt(age) { return age < 4 ? 0 : age < 13 ? 1 : age < 23 ? 2 : 3; }
function envelope(age) {
  if (age < 0 || age >= DURATION) return 0;
  return smooth(0, .22, age) * (1 - smooth(25, DURATION, age));
}
function makeDrop(x, y, strength, start, id = 0) {
  if (![x, y, strength, start].every(Number.isFinite)) throw new TypeError('Finite gesture values required.');
  x = clamp(x); y = clamp(y); strength = clamp(strength, .15, 1);
  // Explicit gesture-to-seed mapping: always outside the unit pentagon.
  const angle = (x * 1.76 + y * .39) * Math.PI * 2 + .071;
  const radius = 1.3 + y * 1.85 + strength * .3;
  const seed = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  const orbit = traceOrbit(seed, regularPolygon(), 256);
  const symbols = orbit.symbols;
  // Empty/singular orbits never receive an invented substitute melody.
  const motif = symbols.slice(0, 16);
  const diversity = new Set(motif).size;
  const phase = symbols.length ? symbols.slice(0, 8).reduce((s, n, i) => s + (n + 1) * (i + 1), 0) * .037 : 0;
  return { x, y, strength, start, id, seed, orbit, motif, diversity, phase };
}
function noteEvents(drop, step, contactIndex=null) {
  if (!Number.isInteger(step) || step < 0) throw new RangeError('Nonnegative musical step required.');
  const age=step*BEAT/2, full=Boolean(drop.ensemble), env=drop.loop?.8*movementLevel(drop,drop.start+age):full?(age<DURATION-2?Math.min(1,.3+age*1.5)*(1-smooth(DURATION-10,DURATION-2,age)):0):(age<5?1-smooth(2,5,age):0);
  if(!env || !drop.motif.length) return [];
  const part=drop.part||'pluck', role=part, pick=(offset=0)=>drop.motif[(step+offset)%drop.motif.length];
  const events=[], bar=Math.floor(step/8), root=[0,5,7,0][bar%4];
  const pan=clamp((drop.x-.5)*1.3,-.65,.65), level=env*(.65+drop.strength*.35);
  const push=(kind,midi,gain,duration,p=pan)=>{
    const touch=drop.touch||'neutral',rare=Boolean(drop.stone?.rare);
    const loudness=(touch==='skip'?.78:touch==='lob'?1.22:1)*(rare?1.35:1);
    const tail=touch==='skip'?Math.max(2.6,duration*1.3):touch==='lob'?Math.min(1.8,duration):duration;
    events.push({kind,midi,gain:gain*level*loudness*(1+clamp(drop.excitement||0)*.30),duration:tail,pan:p,brightness:(drop.brightness||1)*(1+clamp(drop.excitement||0)*.08),excitement:clamp(drop.excitement||0),touch,rare});
  };
  const density=drop.rhythm||2;
  if(drop.loop){
    const excitement=clamp(drop.excitement||0);
    const complexity=clamp(drop.impacts||1,1,10),slot=step%((drop.impacts||1)>8?16:8);
    const order={pluck:[0,4,2,6,1,5,3,7,10,14],bass:[0,4,6,2,3,7,1,5,8,12],pad:[0,4,6,2,1,5,3,7,8,12],bell:[2,6,0,4,3,7,1,5,10,14],bloom:[4,0,6,2,5,1,7,3,12,8]}[role];
    if(contactIndex===null&&!order.slice(0,complexity).includes(slot))return [];
    const index=contactIndex??order.indexOf(slot);
    const remembered=drop.contactPitches?.[index]??pick(index);
    const tone=SCALE[remembered];
    const gain=1/Math.sqrt(1+(complexity-1)*.20);
    if(role==='pluck')push('pluck',62+tone,.14*gain,1.7);
    if(role==='bass')push('bass',38+root+(index%2?7:0),.13*gain,slot===0?2.5:.8);
    if(role==='pad'){
      if(index===0&&drop.touch!=='lob')[0,7,12].forEach((n,j)=>push('pad',50+root+n,.04*gain,3,(j-1)*.3));
      else push('pad',62+root+[0,7,12][index%3],.055*gain,1.3);
    }
    if(role==='bell')push('bell',74+tone,.075*gain,2.1);
    if(role==='bloom')push('bloom',62+root+[0,7,12][index%3],.065*gain,2.4);
    return events;
  }
  if(role==='pluck' && (step%((full&&age>10&&age<28)?density:4)===0))
    push('pluck',62+SCALE[pick()],.14,1.7);
  if(role==='bass' && step%8===0) push('bass',38+root,.15,BEAT*3.6,pan*.3);
  if(role==='pad' && (!full||age>=3) && step%8===0)
    [0,7,12,16].forEach((n,j)=>push('pad',50+root+n,.050,BEAT*5,(j-1.5)*.24+pan*.25));
  if(role==='bell' && (!full||age>=6) && step%4===2)
    push('bell',74+SCALE[pick(5)],.074,2.4,-pan);
  if(role==='bloom' && (!full||age>=10) && step%8===4)
    [0,7,12].forEach((n,j)=>push('bloom',62+root+n,.047,4.1,(j-1)*.42));
  return events;
}
function flightPoint(from, to, progress, height) {
  const t = clamp(progress);
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * height };
}


// A monotonic transport keeps flight alive even before the audio device wakes.
// Scheduled notes map that transport to AudioContext time, outside RAF.
class RippleAudio {
  constructor(getDrops, onState = () => {}, runtime = defaultRuntime()) {
    this.runtime=runtime;
    this.getDrops = getDrops; this.onState = onState;
    this.context = null; this.muted = false; this.paused = false;
    this.baseTime = 0; this.baseWall = this.runtime.nowMs(); this.baseAudio = 0;
    this.voices = new Set(); this.cursors = new Map(); this.events = [];
    this.waterBuffers=new Map();
    this.waterDownloads=this.runtime.waterDownloads();
    this.timer = setInterval(() => this.schedule(), 30);
  }
  now() {
    if (this.paused) return this.baseTime;
    return this.baseTime+(this.runtime.nowMs()-this.baseWall)/1000;
  }
  async unlock() {
    let waking;
    if (!this.context || this.context.state==='closed') {
      const current=this.now();


      this.context=this.runtime.createAudioContext();
      // Resume immediately within the original touch, before constructing effects.
      waking=this.context.resume();
      this.baseTime=current;this.baseWall=this.runtime.nowMs();this.baseAudio=this.context.currentTime;
      try{this.buildGraph();}catch(error){const failed=this.context;this.context=null;Promise.resolve(failed.close()).catch(()=>{});throw error;}
      this.context.onstatechange=()=>this.onState();
    } else if(!this.paused && this.context.state!=='running')waking=this.context.resume();
    // Prime iOS's audio output in that same trusted gesture (no extra UI).
    if(!this.paused&&this.context.createBufferSource){
      const primer=this.context.createBufferSource();
      primer.buffer=this.context.createBuffer(1,1,this.context.sampleRate);
      primer.connect(this.context.destination);primer.onended=()=>primer.disconnect();primer.start(0);
    }
    if(waking)await waking;
    this.loadWaterSamples();
    this.schedule();this.onState();
  }

  buildGraph() {
    const c = this.context;
    this.input = c.createGain();
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -17; compressor.knee.value = 18;
    compressor.ratio.value = 5; compressor.attack.value = .008; compressor.release.value = .3;
    const guard = c.createWaveShaper();
    guard.curve = Float32Array.from({ length: 4096 }, (_, i) => .82 * Math.tanh((2 * i / 4095 - 1) * 1.15));
    guard.oversample = '2x';
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : .72;
    this.analyser = c.createAnalyser(); this.analyser.fftSize = 2048;
    this.waterInput=c.createGain();this.waterInput.connect(compressor);
    this.input.connect(compressor); compressor.connect(guard); guard.connect(this.master);
    this.master.connect(this.analyser); this.analyser.connect(c.destination);
    this.delay = c.createDelay(1); this.delay.delayTime.value = BEAT * .75;
    const feedback = c.createGain(); feedback.gain.value = .22;
    const lowpass = c.createBiquadFilter(); lowpass.frequency.value = 2400;
    const wet = c.createGain(); wet.gain.value = .22;
    this.input.connect(this.delay); this.delay.connect(lowpass); lowpass.connect(feedback);
    feedback.connect(this.delay); lowpass.connect(wet); wet.connect(compressor);
    this.reverb = createReverb(c);
    const reverb=this.reverb;
    // The dry output is ready immediately. Build the optional reverb after
    // the trusted touch handler and context resume have completed.
    setTimeout(()=>{
    if(this.destroyed||this.context!==c||!reverb.convolution)return;
    const buffer = c.createBuffer(2, Math.floor(c.sampleRate * 2.8), c.sampleRate);
    let rng = 1729;
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
        data[i] = (rng / 2147483648 - 1) * Math.pow(1 - i / data.length, 3.2) * .4;
      }
    }
    if(this.context===c&&this.reverb===reverb)reverb.buffer=buffer;
    },0);
    const room = c.createGain(); room.gain.value = .32;
    this.input.connect(this.reverb.input); this.reverb.connect(room); room.connect(compressor);
  }
  setMuted(value) {
    this.muted = Boolean(value);
    if (this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : .72, this.context.currentTime, .04);
    this.onState();
  }
  async setPaused(value) {
    value = Boolean(value);
    if (value === this.paused) return;
    const t = this.now();
    this.baseTime = t; this.baseWall = this.runtime.nowMs();
    if (this.context) this.baseAudio = this.context.currentTime;
    this.paused = value; this.onState();
    if (this.context) {
      if (value) await this.context.suspend(); else await this.context.resume();
      // Rapid pause/resume clicks must leave the actual context in the latest desired state.
      if (!this.paused && this.context.state !== 'running') await this.context.resume();
      if (this.paused && this.context.state === 'running') await this.context.suspend();
    }
    this.onState();
  }
  loadWaterSamples(){
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
  waterImpact(hit, drop, musicalLevel=.08) {
    const c=this.context;
    if(!c||c.state!=='running'||this.paused||this.voices.size>=120)return;
    const key=hit.skips?`skip-${hit.index%3+1}`:hit.stone.radius<.108?'small':'large';
    const buffer=this.waterBuffers.get(key);if(!buffer)return;
    const t=c.currentTime+.006,gain=c.createGain(),filter=c.createBiquadFilter(),pan=createStereoPanner(c);
    // Files share -23 LUFS. Match the melodic reference, then mix water at 50%.
    const count=Math.max(1,this.getDrops().filter(d=>d.loop&&this.now()<(d.finishAt??Infinity)).length);
    gain.gain.value=Math.min(.45,musicalLevel*.51/.071*.5/Math.sqrt(count))*.50;
    filter.type='lowpass';filter.frequency.value=12000;filter.Q.value=.3;
    pan.pan.value=clamp(hit.x/(hit.z+2)*3,-.8,.8);
    gain.connect(filter);filter.connect(pan.input);pan.connect(this.waterInput);
    const source=c.createBufferSource(),partial=c.createGain();source.buffer=buffer;partial.gain.value=1;
    source.connect(partial);partial.connect(gain);
    const voice={nodes:[{osc:source,partial}],gain,filter,pan,dropId:drop.id};this.voices.add(voice);
    source.onended=()=>this.disposeVoice(voice);source.start(t);
  }
  voice(event, when, dropId) {
    const c = this.context;
    if (!c || this.voices.size >= 120) return;
    const t = Math.max(c.currentTime + .006, when);
    const gain = c.createGain(); const pan = createStereoPanner(c); const filter = c.createBiquadFilter();
    const count = Math.max(1, this.getDrops().filter(d => this.now() >= d.start && this.now() < (d.loop?(d.finishAt??Infinity):d.start+DURATION)).length);
    const volume = event.gain / Math.sqrt(count);
    const soft = event.kind === 'pad' || event.kind === 'bloom';
    const attack = Math.min(event.duration*.4,event.touch==='skip'?.075:event.touch==='lob'?.012:soft?1.15:event.kind==='bass'?.04:.007);
    const end = t + event.duration;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), t + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    pan.pan.value = event.pan || 0;
    filter.type = 'lowpass'; filter.frequency.value = soft ? 1450 : event.kind === 'bass' ? 600 : 4200;
    filter.frequency.value *= Math.max(.7,Math.min(1.35,event.brightness||1))*(event.rare?1.55:event.touch==='skip'?.68:1)*(1+(event.excitement||0)*.65);
    filter.Q.value = .4;
    gain.connect(filter); filter.connect(pan.input); pan.connect(this.input);
    const nodes = [];
    const frequency = 440 * 2 ** ((event.midi - 69) / 12);
    const parts = event.rare?[1,2,3,4.002,6]:event.kind==='bloom'?[1,2,3]:event.touch==='lob'?[1,2]:soft?[1,1.002,2]:event.touch==='skip'?[1,2,3]:event.kind==='bell'?[1,2.001,3.99]:[1,2];
    const voice = { nodes, gain, filter, pan, dropId };
    this.voices.add(voice);
    parts.forEach((ratio, j) => {
      const osc = c.createOscillator(); const partial = c.createGain();
      osc.type = event.touch!=='skip'&&!event.rare&&event.kind==='pluck'&&j===0?'triangle':'sine';
      osc.frequency.value = frequency * ratio;
      partial.gain.value=(j===0?.72:event.rare?[.72,.18,.10,.065,.025][j]:j===1?(soft?.2:.14):.045)*(j===0?1:1+(event.excitement||0)*.65);
      osc.connect(partial); partial.connect(gain); nodes.push({ osc, partial });
      osc.start(t); osc.stop(end + .04);
      if (j === 0) osc.onended = () => this.disposeVoice(voice);
    });
    this.events.push({ kind: event.kind, midi: event.midi, at: t, dropId });
    if (this.events.length > 700) this.events.splice(0, 100);
  }
  disposeVoice(voice) {
    for (const { osc, partial } of voice.nodes) { try { osc.stop(); } catch {} osc.disconnect(); partial.disconnect(); }
    voice.gain.disconnect(); voice.filter.disconnect(); voice.pan.disconnect(); this.voices.delete(voice);
  }
  schedule() {
    if (!this.context || this.context.state !== 'running' || this.paused) return;
    const now = this.now(), at = this.context.currentTime;
    const drops = this.getDrops();
    for (const id of this.cursors.keys()) if (!drops.some(d => d.id === id)) this.cursors.delete(id);
    for (const d of drops) {
      if (now > (d.loop?(d.finishAt??Infinity):d.start+DURATION)) continue;
      let cursor = this.cursors.get(d.id);
      if (!cursor) { cursor = { step: Math.max(0, Math.floor((now - d.start) / (BEAT / 2))), impact: false }; this.cursors.set(d.id, cursor); }
      if (!cursor.impact && d.start < now + .15) {
        cursor.impact = true;
        if (!d.loop && !d.ensemble && d.start >= now - .2) this.voice({ kind: 'bell', midi: 74, gain: .12 * d.strength, duration: 3, pan: (d.x - .5) * .8 }, at + d.start - now, d.id);
      }
      // Skip late events after a stalled tab; never replay a burst of missed notes.
      cursor.step = Math.max(cursor.step, Math.ceil((now - .05 - d.start) / (BEAT / 2)));
      for (let budget = 0; budget < 8; budget++) {
        const eventTime = d.start + cursor.step * BEAT / 2;
        if (eventTime > now + .15 || eventTime >= (d.loop?(d.finishAt??Infinity):d.start+DURATION)) break;
        for (const note of noteEvents(d, cursor.step)) this.voice(note, at + eventTime - now, d.id);
        cursor.step++;
      }
    }
  }
  clear() {
    for (const voice of [...this.voices]) this.disposeVoice(voice);
    this.cursors.clear(); this.events = [];
    // Flushing the graph also clears delay / convolution tails on reset.
    if (this.context) {
      this.input.disconnect(); this.waterInput.disconnect(); this.delay.disconnect(); this.reverb.disconnect(); this.master.disconnect(); this.analyser.disconnect();
      this.buildGraph();
    }
  }
  destroy() {
    clearInterval(this.timer);this.destroyed=true;
    for(const voice of [...this.voices])this.disposeVoice(voice);
    if(this.context){
      for(const node of [this.input,this.waterInput,this.delay,this.reverb,this.master,this.analyser])if(node)node.disconnect();
      this.context.onstatechange=()=>{};
      Promise.resolve(this.context.close()).catch(()=>{});this.context=null;
    }
  }
}



function readyToListen(parts) { return parts.length>=4; }


function tapEnergy(level,elapsed){return clamp(level)*Math.exp(-Math.max(0,elapsed)/2.8);}
function addTapEnergy(level,interval){return clamp(tapEnergy(level,interval)+.13+.27*clamp((.95-interval)/.8));}

// Shared continuous envelope for touch, sound and persistent ripples.
function movementLevel(d,now){
  if(d.fadeStart!=null)return (d.fadeLevel??.8)/.8*(1-smooth(d.fadeStart,d.finishAt,now));
  if(d.resumeStart!=null)return (d.resumeFrom??1)+(1-(d.resumeFrom??1))*smooth(d.resumeStart,d.resumeStart+1.6,now);
  if(d.finishAt==null)return 1;
  return 1-smooth(d.finishAt-10,d.finishAt-2,now);
}
function canExciteWater(parts,now){return parts.some(d=>movementLevel(d,now)>.50);}

function releaseFinishAt(start,now){return Math.max(start+DURATION,now+4);}

module.exports={readyToListen,tapEnergy,addTapEnergy,movementLevel,canExciteWater,releaseFinishAt,RippleAudio,makeDrop,noteEvents,DURATION,clamp};
