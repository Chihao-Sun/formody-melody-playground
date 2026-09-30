import test from 'node:test';
import assert from 'node:assert/strict';
import { BeatClock } from '../dist/src/music/clock.js';
import { makePhrase, midiToHz } from '../dist/src/music/mapping.js';
import { regularPolygon, traceOrbit } from '../dist/src/math/outer-billiards.js';
import { config } from '../dist/src/config.js';

test('changing the symbolic orbit changes the pitched phrase', () => {
  const poly = regularPolygon();
  const a = makePhrase(traceOrbit({ x: 1.2, y: 1.22 }, poly), config.music);
  const b = makePhrase(traceOrbit({ x: -2.3, y: .1 }, poly), config.music);
  assert.notDeepEqual(a.map(n => n?.midi), b.map(n => n?.midi));
  a.forEach(n => assert.equal(n.midi, config.music.midiByVertex[n.vertex]));
});

test('missing math steps become rests, never made-up symbols', () => {
  const phrase = makePhrase({ symbols: [2] }, config.music);
  assert.equal(phrase[0].vertex, 2); assert.ok(phrase.slice(1).every(n => n === null));
  assert.equal(midiToHz(69), 440);
});

test('jittery scheduler polls preserve exact audio-clock intervals without duplication', () => {
  const clock = new BeatClock(config.music); const notes = [];
  clock.start(0);
  for (let now = 0; now < 5; now += .013 + ((notes.length % 3) * .009)) clock.poll(now, (time, step) => notes.push({ time, step }));
  assert.ok(notes.length > 15);
  notes.slice(1).forEach((n, i) => {
    assert.ok(Math.abs(n.time - notes[i].time - clock.duration) < 1e-10);
    assert.equal(n.step, notes[i].step + 1);
  });
});

test('a long stall skips overdue notes and keeps the beat grid', () => {
  const clock = new BeatClock(config.music); const notes = [];
  clock.start(0); clock.poll(0, (time, step) => notes.push({ time, step }));
  clock.poll(3, (time, step) => notes.push({ time, step }));
  assert.ok(notes.slice(1).every(n => n.time >= 3));
  assert.ok(notes.slice(1).every(n => Math.abs((n.time - .05) / clock.duration - n.step) < 1e-10));
});

test('stop schedules no notes; resume starts a fresh phrase', () => {
  const clock = new BeatClock(config.music); clock.start(0); clock.stop();
  clock.poll(1, () => assert.fail('note after stopping'));
  clock.start(7); clock.poll(7, (time, step) => { assert.equal(step, 0); assert.equal(time, 7.05); });
});
