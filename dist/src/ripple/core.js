import { regularPolygon, traceOrbit } from '../math/outer-billiards.js';

// Pure, deterministic composition model. Seconds are on the shared transport.
export const DURATION = 38;
export const MAX_DROPS = 4;
export const BEAT = 60 / 84;
export const SCALE = [0, 2, 4, 7, 9]; // D-major pentatonic; all voices share it.
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const PHASES = [
  ['RIPPLE', '涟漪', '一个落点，世界开始回应。'],
  ['INTERWEAVE', '交织', '线条相遇，旋律长出新的声部。'],
  ['RESONANCE', '齐奏', '从一处微光，铺开整片声色。'],
  ['AFTERGLOW', '余韵', '纹样慢慢晕开，声音回到安静。'],
];
export function phaseAt(age) { return age < 4 ? 0 : age < 13 ? 1 : age < 23 ? 2 : 3; }
export function envelope(age) {
  if (age < 0 || age >= DURATION) return 0;
  return smooth(0, .22, age) * (1 - smooth(25, DURATION, age));
}
export function makeDrop(x, y, strength, start, id = 0) {
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
export function noteEvents(drop, step) {
  if (!Number.isInteger(step) || step < 0) throw new RangeError('Nonnegative musical step required.');
  const age = step * BEAT / 2;
  const env = envelope(age);
  if (!env || !drop.motif.length) return [];
  const pick = (offset = 0) => drop.motif[(step + offset) % drop.motif.length];
  const events = [];
  const level = env * (.62 + drop.strength * .38);
  const push = (kind, midi, gain, duration, pan = 0) => events.push({ kind, midi, gain: gain * level, duration, pan });
  if ((age < 4 && step % 4 === 0) || (age >= 4 && age < 25 && step % (age < 13 ? 2 : 1) === 0) || (age >= 25 && step % 4 === 0)) {
    push('pluck', 62 + SCALE[pick()], .085, 2.8, (drop.x - .5) * .9);
  }
  if (age >= 4 && age < 29 && step % 8 === 0) {
    // D / G / A compatible pentatonic harmony; never random unrelated chords.
    const root = [0, 7, 0, 9][Math.floor(step / 8) % 4];
    push('bass', 38 + root, .10, BEAT * 3.6, -.13);
  }
  if (age >= 7 && age < 32 && step % 8 === 0) {
    [0, 7, 14, 21].forEach((n, j) => push('pad', 50 + n, .033, 5.6, (j - 1.5) * .34));
  }
  if (age >= 12 && age < 28 && step % 2 === 1) {
    push('bell', 74 + SCALE[pick(5)], .038, 3.4, (.5 - drop.x) * 1.3);
  }
  if (age >= 15 && age < 24 && step % 4 === 2) {
    push('bloom', 62 + SCALE[pick(3)], .026, 4.2, .35);
  }
  return events;
}
export function flightPoint(from, to, progress, height) {
  const t = clamp(progress);
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * height };
}
