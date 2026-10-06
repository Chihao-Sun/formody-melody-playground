// Called by a small timer, never by animation frames. Times are AudioContext times.
export class BeatClock {
  constructor(options) {
    this.duration = 60 / options.bpm / options.stepsPerBeat;
    this.lookAhead = options.lookAhead;
    this.running = false;
    this.step = 0;
    this.nextTime = 0;
  }
  start(now) { this.running = true; this.step = 0; this.nextTime = now + 0.05; }
  stop() { this.running = false; }
  poll(now, schedule) {
    if (!this.running) return;
    // A stalled main thread must not produce an avalanche of overdue notes.
    if (this.nextTime < now) {
      const skipped = Math.ceil((now - this.nextTime) / this.duration);
      this.step += skipped;
      this.nextTime += skipped * this.duration;
    }
    while (this.nextTime < now + this.lookAhead) {
      schedule(this.nextTime, this.step++);
      this.nextTime += this.duration;
    }
  }
}
