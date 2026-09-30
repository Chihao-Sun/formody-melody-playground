export function bindSeed(canvas, scene, getSeed, setSeed) {
  let pointer = null;
  const update = event => {
    const rect = canvas.getBoundingClientRect();
    setSeed(scene.world(event.clientX - rect.left, event.clientY - rect.top));
  };
  canvas.addEventListener('pointerdown', event => {
    if (pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = event.pointerId; canvas.setPointerCapture(pointer); canvas.classList.add('dragging');
    update(event);
  });
  canvas.addEventListener('pointermove', event => { if (pointer === event.pointerId) update(event); });
  const release = event => {
    if (pointer === event.pointerId) { pointer = null; canvas.classList.remove('dragging'); }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('keydown', event => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const d = directions[event.key]; if (!d) return;
    event.preventDefault(); const p = getSeed(); const delta = event.shiftKey ? 0.2 : 0.06;
    setSeed({ x: p.x + d[0] * delta, y: p.y + d[1] * delta });
  });
}
