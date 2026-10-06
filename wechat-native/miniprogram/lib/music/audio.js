// Native snapshot of verified Sites v51. See provenance.json.
const {defaultRuntime}=require('../platform/runtime.js');
const { BeatClock } = require('./clock.js');

function createVoice(context, output, note, time, options) {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  oscillator.type = options.waveform;
  oscillator.frequency.setValueAtTime(note.frequency, time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(options.cutoff, time);
  const peak = options.gain * note.velocity;
  envelope.gain.setValueAtTime(0, time);
  envelope.gain.linearRampToValueAtTime(peak, time + options.attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + options.decay);
  oscillator.connect(filter);filter.connect(envelope);envelope.connect(output);
  oscillator.start(time);
  oscillator.stop(time + options.decay + 0.05);
  const voice = { oscillator, envelope, stopped: false };
  oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); };
  return voice;
}

class InstrumentAudio {
  constructor(options, getPhrase, onEvent, onState, runtime = defaultRuntime()) {
    this.runtime=runtime;
    this.options = options; this.getPhrase = getPhrase;
    this.onEvent = onEvent; this.onState = onState;
    this.clock = new BeatClock(options); this.context = null;
    this.voices = new Set(); this.timer = null; this.running = false;
  }
  async start() {
    if (!this.context) {
      this.context = this.runtime.createAudioContext();
      const ctx = this.context;
      this.master = ctx.createGain(); this.master.gain.value = 0.65;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12; compressor.ratio.value = 4;
      this.bus = ctx.createGain(); this.bus.connect(this.master);
      this.delay = ctx.createDelay(2); this.delay.delayTime.value = this.options.delay.seconds;
      this.feedback = ctx.createGain(); this.feedback.gain.value = this.options.delay.feedback;
      this.wet = ctx.createGain(); this.wet.gain.value = this.options.delay.wet;
      this.bus.connect(this.delay); this.delay.connect(this.feedback);this.feedback.connect(this.delay);
      this.delay.connect(this.wet);this.wet.connect(this.master);
      this.master.connect(compressor);compressor.connect(ctx.destination);
      ctx.onstatechange = () => {
        if (ctx.state !== 'running' && this.running) this.pause();
      };
    }
    // Resume is invoked inside the Start button's user gesture.
    await this.context.resume();
    if (this.context.state !== 'running') throw new Error('声音尚未开启，请再点击一次开启。');
    if (this.running) return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(0.65, this.context.currentTime, 0.02);
    this.running = true;
    this.clock.start(this.context.currentTime);
    this.tick(); this.timer = setInterval(() => this.tick(), this.options.pollMs);
    this.onState(true);
  }
  tick() {
    this.clock.poll(this.context.currentTime, (time, step) => {
      const { phrase, revision } = this.getPhrase();
      const index = step % phrase.length;
      const note = phrase[index];
      if (note) {
        const voice = createVoice(this.context, this.bus, note, time, this.options.voice);
        this.voices.add(voice);
        const cleanup=voice.oscillator.onended;voice.oscillator.onended=()=>{cleanup();this.voices.delete(voice);};
      }
      this.onEvent({ time, step, index, note, revision });
    });
  }
  pause() {
    this.running = false; this.clock.stop();
    clearInterval(this.timer); this.timer = null;
    if (this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.008);
      for (const voice of this.voices) {
        if (voice.stopped) continue;
        voice.stopped = true;
        voice.envelope.gain.cancelScheduledValues(now);
        voice.envelope.gain.setTargetAtTime(0.0001, now, 0.005);
        try { voice.oscillator.stop(now + 0.03); } catch { /* already ended */ }
      }
      // Clear the delay's feedback so resume never replays an old phrase.
      this.feedback.gain.setValueAtTime(0, now);
      this.feedback.gain.setValueAtTime(this.options.delay.feedback, now + 0.6);
    }
    this.onState(false);
  }
  destroy(){this.pause();if(this.context){this.context.onstatechange=()=>{};Promise.resolve(this.context.close()).catch(()=>{});this.context=null;}}
  get time() { return this.context?.currentTime ?? 0; }
}

module.exports={createVoice,InstrumentAudio};
