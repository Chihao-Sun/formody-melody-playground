// Native snapshot of verified Sites v51. See provenance.json.
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

module.exports={cross,sub,distance,regularPolygon,insideOrOnBoundary,outerBilliardsStep,traceOrbit};
