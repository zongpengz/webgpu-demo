import { SPRITE_KIND } from '../core/sprites';
import type { Color, Sprite } from '../core/types';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: Color;
}
export class Effects {
  private sparks: Spark[] = [];
  constructor(private random = Math.random) {}
  burst(x: number, y: number, color: Color, count = 22) {
    for (let i = 0; i < count && this.sparks.length < 500; i++) {
      const a = this.random() * Math.PI * 2,
        v = 35 + this.random() * 180,
        life = 0.3 + this.random() * 0.6;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color });
    }
  }
  update(dt: number) {
    for (const p of this.sparks) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.sparks = this.sparks.filter((p) => p.life > 0);
  }
  sprites(): Sprite[] {
    return this.sparks.map((p) => ({
      x: p.x,
      y: p.y,
      rx: 2,
      ry: 2,
      color: [p.color[0], p.color[1], p.color[2], p.life / p.max],
      kind: SPRITE_KIND.spark,
    }));
  }
}
