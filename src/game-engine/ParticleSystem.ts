export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shape: 'circle' | 'square';
  spin: number;
  angle: number;
}

export interface BurstOptions {
  count?: number;
  colors?: string[];
  speed?: number;
  speedVariance?: number;
  life?: number;
  size?: number;
  gravity?: number;
  spread?: number;
  angle?: number;
  shape?: 'circle' | 'square';
}

/** Lightweight pooled particle emitter shared across arcade and action games. */
export class ParticleSystem {
  private particles: Particle[] = [];
  private max: number;

  constructor(max = 400) {
    this.max = max;
  }

  get count() {
    return this.particles.length;
  }

  burst(x: number, y: number, opts: BurstOptions = {}) {
    const count = opts.count ?? 14;
    const colors = opts.colors ?? ['#facc15', '#fb923c', '#f87171'];
    const baseSpeed = opts.speed ?? 140;
    const variance = opts.speedVariance ?? 0.6;
    const life = opts.life ?? 0.7;
    const spread = opts.spread ?? Math.PI * 2;
    const baseAngle = opts.angle ?? 0;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) break;
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = baseSpeed * (1 - variance / 2 + Math.random() * variance);
      const maxLife = life * (0.6 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        size: (opts.size ?? 3) * (0.6 + Math.random() * 0.9),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: opts.gravity ?? 260,
        shape: opts.shape ?? 'circle',
        spin: (Math.random() - 0.5) * 8,
        angle: Math.random() * Math.PI,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'square') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles.length = 0;
  }
}
