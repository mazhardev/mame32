export class AimEngine {
  remaining = 30;
  hits = 0;
  misses = 0;
  target = { x: 50, y: 50 };
  constructor(private random = Math.random) {
    this.moveTarget();
  }
  moveTarget() {
    this.target = { x: 12 + this.random() * 76, y: 12 + this.random() * 76 };
  }
  hit() {
    if (this.remaining <= 0) return;
    this.hits++;
    this.moveTarget();
  }
  miss() {
    if (this.remaining > 0) this.misses++;
  }
  tick(seconds: number) {
    this.remaining = Math.max(0, this.remaining - Math.max(0, seconds));
  }
  get accuracy() {
    const shots = this.hits + this.misses;
    return shots ? Math.round((this.hits / shots) * 100) : 0;
  }
  get score() {
    return this.hits * 100 + Math.round(this.hits * this.accuracy);
  }
}
