export class Scene {
  constructor(canvas, options) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.options = options;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width; this.height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, this.options.pixelRatioCap);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min(this.width, this.height) * 0.135;
    this.cx = this.width / 2; this.cy = this.height / 2;
  }
  screen(p) { return { x: this.cx + p.x * this.scale, y: this.cy - p.y * this.scale }; }
  world(x, y) { return { x: (x - this.cx) / this.scale, y: (this.cy - y) / this.scale }; }
  segment(a, b) {
    const c = this.ctx; const p = this.screen(a); const q = this.screen(b);
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
  }
  draw(state, audioTime) {
    const c = this.ctx; const theme = this.options;
    c.clearRect(0, 0, this.width, this.height);
    // All lines below come from the geometry; no decorative/fake trajectory field.
    const { orbit, vertices, seed, active, running } = state;
    c.strokeStyle = theme.trajectory;
    c.lineWidth = 0.7;
    const count = Math.min(orbit.symbols.length, theme.visibleSteps);
    c.globalAlpha = count > 100 ? 0.09 : 0.23;
    for (let i = 0; i < count; i++) this.segment(orbit.points[i], orbit.points[i + 1]);
    c.globalAlpha = 0.52; c.lineWidth = 0.9;
    for (let i = 0; i < Math.min(state.phraseSteps, count); i++) this.segment(orbit.points[i], orbit.points[i + 1]);
    c.globalAlpha = 1;
    const valid = orbit.status !== 'inside' && orbit.status !== 'invalid';
    let current = null;
    if (running && active?.note && active.revision === state.revision) {
      const index = active.note.orbitIndex;
      const a = orbit.points[index]; const b = orbit.points[index + 1];
      const progress = Math.max(0, Math.min(1, (audioTime - active.time) / state.stepDuration));
      c.strokeStyle = theme.active; c.lineWidth = 1.3;
      this.segment(a, b);
      current = { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress };
    }
    c.beginPath(); vertices.forEach((v, i) => { const p = this.screen(v); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
    c.closePath(); c.fillStyle = 'rgba(7,9,14,0.94)'; c.fill();
    c.strokeStyle = theme.polygon; c.lineWidth = 1; c.stroke();
    const noteVertex = running && active?.revision === state.revision ? active.note?.vertex : -1;
    vertices.forEach((v, i) => {
      const p = this.screen(v); const illuminated = i === noteVertex;
      c.beginPath(); c.arc(p.x, p.y, illuminated ? 4 : 2, 0, Math.PI * 2);
      c.fillStyle = illuminated ? theme.active : theme.polygon; c.fill();
    });
    if (current) {
      const p = this.screen(current);
      c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2); c.fillStyle = theme.active; c.fill();
    }
    const p = this.screen(seed);
    c.strokeStyle = valid ? theme.seed : theme.warning;
    c.fillStyle = c.strokeStyle;
    c.beginPath(); c.arc(p.x, p.y, 11, 0, Math.PI * 2); c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2); c.fill();
    c.font = '10px monospace'; c.fillText('SEED', p.x + 19, p.y + 4);
  }
}
