import { BEAT, DURATION, noteEvents } from './core.js';

// The audio clock is authoritative once unlocked. No notes are scheduled by RAF.
export class RippleAudio {
  constructor(getDrops, onState = () => {}) {
    this.getDrops = getDrops; this.onState = onState;
    this.context = null; this.muted = false; this.paused = false;
    this.baseTime = 0; this.baseWall = performance.now(); this.baseAudio = 0;
    this.voices = new Set(); this.cursors = new Map(); this.events = [];
    this.timer = setInterval(() => this.schedule(), 30);
  }
  now() {
    if (this.paused) return this.baseTime;
    return this.baseTime + (this.context ? this.context.currentTime - this.baseAudio : (performance.now() - this.baseWall) / 1000);
  }
  async unlock() {
    if (!this.context) {
      const current = this.now();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('此浏览器不支持音频；画面仍可体验。');
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.baseTime = current; this.baseAudio = this.context.currentTime;
      this.buildGraph();
      this.context.addEventListener('statechange', () => this.onState());
    }
    if (!this.paused && this.context.state !== 'running') await this.context.resume();
    this.schedule(); this.onState();
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
    this.input.connect(compressor); compressor.connect(guard); guard.connect(this.master);
    this.master.connect(this.analyser); this.analyser.connect(c.destination);
    this.delay = c.createDelay(1); this.delay.delayTime.value = BEAT * .75;
    const feedback = c.createGain(); feedback.gain.value = .22;
    const lowpass = c.createBiquadFilter(); lowpass.frequency.value = 2400;
    const wet = c.createGain(); wet.gain.value = .22;
    this.input.connect(this.delay); this.delay.connect(lowpass); lowpass.connect(feedback);
    feedback.connect(this.delay); lowpass.connect(wet); wet.connect(compressor);
    this.reverb = c.createConvolver();
    const buffer = c.createBuffer(2, Math.floor(c.sampleRate * 2.8), c.sampleRate);
    let rng = 1729;
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
        data[i] = (rng / 2147483648 - 1) * Math.pow(1 - i / data.length, 3.2) * .4;
      }
    }
    this.reverb.buffer = buffer;
    const room = c.createGain(); room.gain.value = .32;
    this.input.connect(this.reverb); this.reverb.connect(room); room.connect(compressor);
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
    this.baseTime = t; this.baseWall = performance.now();
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
  voice(event, when, dropId) {
    const c = this.context;
    if (!c || this.voices.size >= 120) return;
    const t = Math.max(c.currentTime + .006, when);
    const gain = c.createGain(); const pan = c.createStereoPanner(); const filter = c.createBiquadFilter();
    const count = Math.max(1, this.getDrops().filter(d => this.now() >= d.start && this.now() < d.start + DURATION).length);
    const volume = event.gain / Math.sqrt(count);
    const soft = event.kind === 'pad' || event.kind === 'bloom';
    const attack = soft ? 1.15 : event.kind === 'bass' ? .04 : .007;
    const end = t + event.duration;
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), t + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    pan.pan.value = event.pan || 0;
    filter.type = 'lowpass'; filter.frequency.value = soft ? 1450 : event.kind === 'bass' ? 600 : 4200;
    filter.Q.value = .4;
    gain.connect(filter); filter.connect(pan); pan.connect(this.input);
    const nodes = [];
    const frequency = 440 * 2 ** ((event.midi - 69) / 12);
    const parts = soft ? [1, 1.002, 2] : event.kind === 'bell' ? [1, 2.001, 3.99] : [1, 2];
    const voice = { nodes, gain, filter, pan, dropId };
    this.voices.add(voice);
    parts.forEach((ratio, j) => {
      const osc = c.createOscillator(); const partial = c.createGain();
      osc.type = event.kind === 'pluck' && j === 0 ? 'triangle' : 'sine';
      osc.frequency.value = frequency * ratio;
      partial.gain.value = j === 0 ? .72 : j === 1 ? (soft ? .2 : .16) : .06;
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
      if (now > d.start + DURATION) continue;
      let cursor = this.cursors.get(d.id);
      if (!cursor) { cursor = { step: Math.max(0, Math.floor((now - d.start) / (BEAT / 2))), impact: false }; this.cursors.set(d.id, cursor); }
      if (!cursor.impact && d.start < now + .15) {
        cursor.impact = true;
        if (d.start >= now - .2) this.voice({ kind: 'bell', midi: 74, gain: .12 * d.strength, duration: 3, pan: (d.x - .5) * .8 }, at + d.start - now, d.id);
      }
      // Skip late events after a stalled tab; never replay a burst of missed notes.
      cursor.step = Math.max(cursor.step, Math.ceil((now - .05 - d.start) / (BEAT / 2)));
      for (let budget = 0; budget < 8; budget++) {
        const eventTime = d.start + cursor.step * BEAT / 2;
        if (eventTime > now + .15 || eventTime >= d.start + DURATION) break;
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
      this.input.disconnect(); this.delay.disconnect(); this.reverb.disconnect(); this.master.disconnect(); this.analyser.disconnect();
      this.buildGraph();
    }
  }
  destroy() {
    clearInterval(this.timer); this.clear();
    if (this.context) this.context.close().catch(() => {});
  }
}
