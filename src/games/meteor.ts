import { clamp } from '../core/math';
import type {
  Difficulty,
  GameEvent,
  GameInput,
  GameSnapshot,
  Phase,
  Simulation,
  Sprite,
} from '../core/types';
import { Effects, MINT, PURPLE } from './shared';

interface Meteor {
  x: number;
  y: number;
  r: number;
  speed: number;
  rotation: number;
  spin: number;
  seed: number;
}
interface Gem {
  x: number;
  y: number;
  speed: number;
}
const SETTINGS = {
  easy: { speed: 0.75, interval: 0.65 },
  normal: { speed: 1, interval: 0.44 },
  hard: { speed: 1.35, interval: 0.28 },
};

export class MeteorGame implements Simulation {
  phase: Phase = 'ready';
  events: GameEvent[] = [];
  score = 0;
  time = 0;
  lives = 3;
  x = 500;
  y = 535;
  cooldown = 0;
  invulnerable = 0;
  dashTime = 0;
  meteors: Meteor[] = [];
  gems: Gem[] = [];
  private spawn = 0;
  private gemTimer = 1.3;
  private effects: Effects;
  constructor(
    public difficulty: Difficulty = 'normal',
    private random = Math.random,
  ) {
    this.effects = new Effects(random);
    for (let i = 0; i < 12; i++) {
      const m = this.makeMeteor();
      m.y = random() * 540 - 30;
      // Keep the title and the player's ship legible in the attract scene.
      if (m.x > 300 && m.x < 700 && m.y > 180 && m.y < 440) m.x += m.x > 500 ? 240 : -240;
      this.meteors.push(m);
    }
    this.gems = [
      { x: 220, y: 390, speed: 65 },
      { x: 775, y: 470, speed: 70 },
    ];
  }
  private makeMeteor(): Meteor {
    return {
      x: 40 + this.random() * 920,
      y: -70,
      r: 17 + this.random() * 31,
      speed: (115 + this.random() * 115) * SETTINGS[this.difficulty].speed,
      rotation: this.random() * 6,
      spin: (this.random() - 0.5) * 1.5,
      seed: this.random() * 9,
    };
  }
  start() {
    this.effects = new Effects(this.random);
    this.phase = 'running';
    this.score = 0;
    this.time = 0;
    this.lives = 3;
    this.x = 500;
    this.y = 535;
    this.cooldown = 0;
    this.invulnerable = 0;
    this.dashTime = 0;
    this.meteors = [];
    this.gems = [];
    this.spawn = 0.1;
    this.gemTimer = 1.3;
    this.events = [];
  }
  preview(dt: number) {
    for (const m of this.meteors) {
      m.y += m.speed * dt * 0.18;
      m.rotation += m.spin * dt * 0.3;
      if (m.y > 700) m.y = -70;
    }
    for (const g of this.gems) {
      g.y += g.speed * dt * 0.2;
      if (g.y > 680) g.y = -20;
    }
  }
  update(dt: number, input: GameInput) {
    if (this.phase !== 'running') return;
    this.time += dt;
    this.score += dt * 10;
    this.effects.update(dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.dashTime = Math.max(0, this.dashTime - dt);
    if (input.dash && this.cooldown === 0) {
      this.dashTime = 0.22;
      this.cooldown = 2.5;
      this.invulnerable = Math.max(this.invulnerable, 0.3);
      this.events.push('dash');
    }
    const speed = this.dashTime > 0 ? 890 : 350;
    if (input.x || input.y) {
      const length = Math.hypot(input.x, input.y);
      this.x += (input.x / length) * speed * dt;
      this.y += (input.y / length) * speed * dt;
    } else if (input.pointerControl) {
      const dx = input.pointer.x - this.x,
        dy = input.pointer.y - this.y,
        distance = Math.hypot(dx, dy);
      if (distance > 0.01) {
        const step = Math.min(distance, speed * dt);
        this.x += (dx / distance) * step;
        this.y += (dy / distance) * step;
      }
    }
    this.x = clamp(this.x, 25, 975);
    this.y = clamp(this.y, 140, 605);
    this.spawn -= dt;
    this.gemTimer -= dt;
    if (this.spawn <= 0) {
      this.meteors.push(this.makeMeteor());
      this.spawn += SETTINGS[this.difficulty].interval / (1 + this.time / 100);
    }
    if (this.gemTimer <= 0) {
      this.gems.push({ x: 55 + this.random() * 890, y: -25, speed: 110 });
      this.gemTimer += 1.5;
    }
    for (const m of this.meteors) {
      m.y += m.speed * dt;
      m.rotation += m.spin * dt;
      if (this.invulnerable === 0 && Math.hypot(m.x - this.x, m.y - this.y) < m.r * 0.74 + 12) {
        this.lives--;
        this.invulnerable = 1.5;
        m.y = 800;
        this.effects.burst(this.x, this.y, PURPLE, 45);
        this.events.push('hit');
        if (this.lives <= 0) {
          this.phase = 'over';
          this.events.push('lose');
          break;
        }
      }
    }
    for (const g of this.gems) {
      g.y += g.speed * dt;
      if (Math.hypot(g.x - this.x, g.y - this.y) < 29) {
        g.y = 800;
        this.score += 100;
        this.effects.burst(g.x, this.y, MINT);
        this.events.push('collect');
      }
    }
    this.meteors = this.meteors.filter((m) => m.y < 730);
    this.gems = this.gems.filter((g) => g.y < 720);
    if (this.time >= 60 && this.phase === 'running') {
      this.time = 60;
      this.phase = 'won';
      this.score += 500;
      this.events.push('win');
    }
  }
  getSprites(time: number): Sprite[] {
    const sprites: Sprite[] = this.meteors.map((m) => ({
      x: m.x,
      y: m.y,
      rx: m.r,
      ry: m.r,
      kind: 1,
      rotation: m.rotation,
      extra: m.seed,
      color: [0.56 + (m.seed % 1) * 0.2, 0.36, 0.79, 0.65],
    }));
    for (const g of this.gems) {
      sprites.push({
        x: g.x,
        y: g.y,
        rx: 21,
        ry: 21,
        color: [0.35, 0.83, 0.74, 0.1],
        kind: 5,
        rotation: time * 0.4,
      });
      sprites.push({
        x: g.x,
        y: g.y,
        rx: 12,
        ry: 16,
        color: MINT,
        kind: 3,
        rotation: Math.sin(time) * 0.15,
      });
    }
    // Engine flame is made of the same instanced SDF sprites as everything else.
    if (this.phase !== 'over') {
      const visible = this.invulnerable <= 0 || Math.floor(time * 15) % 2 === 0;
      const boost = this.dashTime > 0;
      if (visible) {
        sprites.push({
          x: this.x,
          y: this.y + 30,
          rx: boost ? 7 : 4,
          ry: (boost ? 40 : 17) + Math.sin(time * 27) * 4,
          color: [0.59, 0.34, 1, 0.6],
          kind: 6,
        });
        sprites.push({ x: this.x, y: this.y, rx: 23, ry: 28, color: [0.8, 0.67, 1, 1], kind: 2 });
        sprites.push({ x: this.x, y: this.y - 1, rx: 4, ry: 8, color: [0.9, 0.85, 1, 1], kind: 3 });
      }
      if (boost)
        sprites.push({
          x: this.x,
          y: this.y + 10,
          rx: 52,
          ry: 62,
          color: [0.55, 0.35, 1, 0.35],
          kind: 5,
        });
    }
    return sprites.concat(this.effects.sprites());
  }
  snapshot(): GameSnapshot {
    return {
      score: Math.floor(this.score),
      time: this.time,
      lives: this.lives,
      cooldown: this.cooldown / 2.5,
      phase: this.phase,
      x: this.x,
      y: this.y,
      remaining: 0,
    };
  }
}
