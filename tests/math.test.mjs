import test from 'node:test';
import assert from 'node:assert/strict';
import { cross, sub, distance, regularPolygon, outerBilliardsStep, traceOrbit } from '../dist/src/math/outer-billiards.js';

const square = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
const close = (a, b, eps = 1e-8) => assert.ok(distance(a, b) < eps, `${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

test('known square orbit: four hand-computed central reflections', () => {
  const orbit = traceOrbit({ x: 2, y: 0.3 }, square);
  const expected = [{ x: 2, y: 0.3 }, { x: 0, y: 1.7 }, { x: -2, y: 0.3 }, { x: 0, y: -2.3 }, { x: 2, y: 0.3 }];
  assert.deepEqual(orbit.symbols, [2, 3, 0, 1]);
  orbit.points.forEach((p, i) => close(p, expected[i]));
  assert.equal(orbit.returnAfter, 4);
});

test('chosen supporting edge extension is singular', () => {
  assert.equal(outerBilliardsStep({ x: 2, y: 1 }, square).status, 'singular');
});

test('an edge extension on the opposite tangent is still in the map domain', () => {
  const step = outerBilliardsStep({ x: 2, y: -1 }, square);
  assert.equal(step.status, 'ok'); assert.equal(step.vertex, 2);
});

test('a later singularity terminates without inventing a continuation', () => {
  const orbit = traceOrbit({ x: 0, y: -3 }, square);
  assert.equal(orbit.status, 'singular'); assert.equal(orbit.symbols.length, 1);
  close(orbit.points[1], { x: 2, y: 1 });
});

test('interior, boundary and polygon vertex are excluded', () => {
  for (const p of [{ x: 0, y: 0 }, { x: 1, y: 0 }, square[0]]) assert.equal(outerBilliardsStep(p, square).status, 'inside');
});

test('finite non-returning horizon reports only iteration limit', () => {
  const orbit = traceOrbit({ x: 1.2, y: 1.22 }, regularPolygon(), 16);
  assert.equal(orbit.status, 'iteration-limit'); assert.equal(orbit.returnAfter, null);
  assert.equal(orbit.symbols.length, 16);
});

test('regular pentagon has equal edges and counterclockwise convex vertices', () => {
  const poly = regularPolygon();
  const size = distance(poly[0], poly[1]);
  poly.forEach((v, i) => {
    assert.ok(Math.abs(distance(v, poly[(i + 1) % 5]) - size) < 1e-12);
    assert.ok(cross(sub(poly[(i + 1) % 5], v), sub(poly[(i + 2) % 5], poly[(i + 1) % 5])) > 0);
  });
});

test('512 pentagon steps obey supporting half-plane and midpoint invariants', () => {
  const poly = regularPolygon(); const orbit = traceOrbit({ x: 1.2, y: 1.22 }, poly);
  for (let i = 0; i < orbit.symbols.length; i++) {
    const p = orbit.points[i]; const q = orbit.points[i + 1]; const pivot = poly[orbit.symbols[i]];
    close({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, pivot);
    const dir = sub(q, p);
    for (const v of poly) assert.ok(cross(dir, sub(v, p)) > -1e-8);
  }
});

test('repeating seed input yields identical output without mutation', () => {
  const seed = { x: 1.2, y: 1.22 }; const poly = regularPolygon(); const original = structuredClone({ seed, poly });
  assert.deepEqual(traceOrbit(seed, poly), traceOrbit(seed, poly));
  assert.deepEqual({ seed, poly }, original);
});

test('Euclidean rotations and translations preserve vertex sequence', () => {
  const poly = regularPolygon(); const seed = { x: 1.2, y: 1.22 };
  const transform = p => ({ x: p.x * Math.cos(.37) - p.y * Math.sin(.37) + 4, y: p.x * Math.sin(.37) + p.y * Math.cos(.37) - 3 });
  const a = traceOrbit(seed, poly, 64); const b = traceOrbit(transform(seed), poly.map(transform), 64);
  assert.deepEqual(a.symbols, b.symbols); a.points.forEach((p, i) => close(transform(p), b.points[i]));
});

test('invalid numbers and geometry arguments are rejected', () => {
  assert.equal(outerBilliardsStep({ x: NaN, y: 1 }, square).status, 'invalid');
  assert.throws(() => regularPolygon(2)); assert.throws(() => traceOrbit({ x: 2, y: 0 }, square, -1));
});
