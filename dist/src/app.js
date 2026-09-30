import { config } from './config.js';
import { regularPolygon, traceOrbit } from './math/outer-billiards.js';
import { makePhrase } from './music/mapping.js';
import { InstrumentAudio } from './music/audio.js';
import { Scene } from './render/scene.js';
import { bindSeed } from './interaction/seed.js';

const el = id => document.getElementById(id);
const state = {
  seed: { ...config.initialSeed }, vertices: regularPolygon(config.math.vertices, config.math.radius, config.math.rotation),
  revision: 0, active: null, running: false,
  phraseSteps: config.music.phraseSteps,
  stepDuration: 60 / config.music.bpm / config.music.stepsPerBeat,
};
let phrase; let events = []; let starting = false;
const scene = new Scene(el('canvas'), config.visual);

function setSeed(seed) {
  if (!Number.isFinite(seed.x) || !Number.isFinite(seed.y)) throw new TypeError('Seed coordinates must be finite.');
  state.seed = { ...seed }; state.revision++; state.active = null;
  state.orbit = traceOrbit(seed, state.vertices, config.math.maxSteps);
  phrase = makePhrase(state.orbit, config.music);
  el('coordinates').textContent = `x ${seed.x >= 0 ? '+' : ''}${seed.x.toFixed(3)}   y ${seed.y >= 0 ? '+' : ''}${seed.y.toFixed(3)}`;
  const { status, symbols, returnAfter } = state.orbit;
  const messages = {
    'return-detected': `${symbols.length} 步轨迹 · 数值回归 ${returnAfter} 步`,
    'iteration-limit': `${symbols.length} 步内未检测到回归`,
    'inside': '请把 Seed 放在五边形外',
    'invalid': '起点坐标无效',
    'singular': `第 ${symbols.length + 1} 步切点不唯一 · 轨迹停止`,
    'numerical-limit': '已达到数值计算上限',
  };
  el('orbit-status').textContent = messages[status];
  el('phrase').replaceChildren(...phrase.map(note => {
    const bar = document.createElement('i');
    bar.style.setProperty('--height', `${note ? 8 + (note.midi - Math.min(...config.music.midiByVertex)) * 1.7 : 3}px`);
    return bar;
  }));
  scene.draw(state, audio.time);
}

const audio = new InstrumentAudio(config.music, () => ({ phrase, revision: state.revision }), event => events.push(event), running => {
  state.running = running;
  el('play').textContent = running ? 'Ⅱ' : '▶';
  el('play').setAttribute('aria-label', running ? '暂停声音' : '开启声音');
  el('play').title = running ? '暂停声音' : '开启声音';
  el('indicator').classList.toggle('live', running);
  el('audio-state').textContent = running ? '正在演奏' : '声音已暂停';
  el('transport-status').textContent = running ? `${config.music.phraseSteps} 步乐句 · 循环播放` : '点击播放，继续探索';
  if (!running) { events = []; state.active = null; for (const bar of el('phrase').children) bar.classList.remove('active'); }
});

async function toggleAudio() {
  if (starting) return;
  if (state.running) { audio.pause(); return; }
  starting = true; el('error').textContent = '';
  try {
    await audio.start();
    el('intro').classList.add('hidden');
    el('canvas').focus({ preventScroll: true });
  } catch (error) { el('error').textContent = error.message; }
  finally { starting = false; }
}

setSeed(state.seed);
bindSeed(el('canvas'), scene, () => state.seed, setSeed);
el('start').addEventListener('click', toggleAudio);
el('play').addEventListener('click', toggleAudio);
el('reset').addEventListener('click', () => setSeed(config.initialSeed));
el('about').addEventListener('click', () => el('about-dialog').showModal());
el('close-about').addEventListener('click', () => el('about-dialog').close());
el('phrase-length').textContent = config.music.phraseSteps;
el('tempo-label').textContent = `${config.music.bpm} BPM · ${config.music.stepsPerBeat} STEPS / BEAT`;
document.addEventListener('visibilitychange', () => { if (document.hidden && state.running) audio.pause(); });
window.addEventListener('pagehide', () => { if (state.running) audio.pause(); });

function frame() {
  const now = audio.time;
  while (events.length && events[0].time <= now) {
    const event = events.shift();
    if (event.revision !== state.revision) continue;
    state.active = event;
    [...el('phrase').children].forEach((bar, i) => bar.classList.toggle('active', i === event.index));
  }
  scene.draw(state, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Optional browser API: same action as placing the single visible Seed.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const registration = {
    name: 'set_formody_seed', title: '移动 Formody 起点',
    description: 'Move the one visible Seed in Euclidean coordinates and recompute its orbit. Does not start audio.',
    inputSchema: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || Object.keys(input).some(k => k !== 'x' && k !== 'y') || typeof input.x !== 'number' || typeof input.y !== 'number' || !Number.isFinite(input.x) || !Number.isFinite(input.y)) {
        throw new TypeError('Expected finite x and y coordinates only.');
      }
      setSeed(input);
      return { seed: { ...state.seed }, status: state.orbit.status, steps: state.orbit.symbols.length };
    },
  };
  try { Promise.resolve(document.modelContext.registerTool(registration, { signal: lifecycle.signal })).catch(() => {}); } catch { /* optional standard */ }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
