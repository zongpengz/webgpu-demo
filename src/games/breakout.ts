import { clamp, circleRect } from '../core/math';
import type {
  Color,
  Difficulty,
  GameEvent,
  GameInput,
  GameSnapshot,
  Phase,
  Simulation,
  Sprite,
} from '../core/types';
import { Effects, MINT } from './shared';

export interface Brick {
  x: number;
  y: number;
  color: Color;
  alive: boolean;
}
const COLORS: Color[] = [
  [0.71, 0.44, 1, 1],
  [0.58, 0.49, 1, 1],
  [0.4, 0.65, 0.98, 1],
  [0.35, 0.8, 0.84, 1],
  [0.43, 0.9, 0.72, 1],
];
const SETTINGS = {
  easy: { speed: 300, width: 95 },
  normal: { speed: 385, width: 78 },
  hard: { speed: 490, width: 59 },
};

export class BreakoutGame implements Simulation {
  phase: Phase = 'ready';
  events: GameEvent[] = [];
  score = 0;
  time = 0;
  lives = 3;
  paddleX = 500;
  ball = { x: 500, y: 535, vx: 170, vy: -340 };
  bricks: Brick[] = [];
  launched = false;
  private effects = new Effects();
  private trail: { x: number; y: number }[] = [];
  private trailTimer = 0;
  constructor(public difficulty: Difficulty = 'normal') {
    this.createBricks();
  }
  get paddleWidth() {
    return SETTINGS[this.difficulty].width;
  }
  private createBricks() {
    this.bricks = [];
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 10; col++)
        this.bricks.push({ x: 122 + col * 84, y: 170 + row * 32, color: COLORS[row], alive: true });
  }
  start() {
    this.effects = new Effects();
    this.trailTimer = 0;
    this.phase = 'running';
    this.score = 0;
    this.time = 0;
    this.lives = 3;
    this.paddleX = 500;
    this.createBricks();
    this.resetBall();
    this.events = [];
  }
  private resetBall() {
    this.launched = false;
    this.ball = { x: this.paddleX, y: 545, vx: 0, vy: 0 };
    this.trail = [];
  }
  preview(_dt: number) {}
  update(dt: number, input: GameInput) {
    if (this.phase !== 'running') return;
    this.time += dt;
    this.effects.update(dt);
    if (input.x) this.paddleX += input.x * 620 * dt;
    else if (input.pointerControl)
      this.paddleX += clamp(input.pointer.x - this.paddleX, -900 * dt, 900 * dt);
    this.paddleX = clamp(this.paddleX, this.paddleWidth + 28, 972 - this.paddleWidth);
    const b = this.ball;
    if (!this.launched) {
      b.x = this.paddleX;
      b.y = 545;
      if (input.dash) {
        const speed = SETTINGS[this.difficulty].speed;
        b.vx = speed * 0.42;
        b.vy = -speed * 0.9075;
        this.launched = true;
      }
      return;
    }
    const oldX = b.x,
      oldY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 35) {
      b.x = 35;
      b.vx = Math.abs(b.vx);
    }
    if (b.x > 965) {
      b.x = 965;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y < 132) {
      b.y = 132;
      b.vy = Math.abs(b.vy);
    }
    if (
      b.vy > 0 &&
      oldY <= 564 &&
      b.y >= 559 &&
      b.y <= 585 &&
      Math.abs(b.x - this.paddleX) < this.paddleWidth + 8
    ) {
      const hit = clamp((b.x - this.paddleX) / this.paddleWidth, -1, 1);
      const speed = Math.hypot(b.vx, b.vy),
        angle = hit * 1.05;
      b.vx = Math.sin(angle) * speed;
      b.vy = -Math.cos(angle) * speed;
      b.y = 559;
      this.events.push('brick');
    }
    for (const brick of this.bricks) {
      if (!brick.alive || !circleRect(b.x, b.y, 8, brick.x, brick.y, 35, 11)) continue;
      brick.alive = false;
      this.score += 50;
      this.effects.burst(brick.x, brick.y, brick.color, 18);
      this.events.push('brick');
      if (oldX < brick.x - 35 || oldX > brick.x + 35) b.vx *= -1;
      else b.vy *= -1;
      b.x = oldX;
      b.y = oldY;
      break;
    }
    if (b.y > 645) {
      this.lives--;
      this.events.push('hit');
      this.resetBall();
      if (this.lives <= 0) {
        this.phase = 'over';
        this.events.push('lose');
      }
    }
    if (this.bricks.every((brick) => !brick.alive)) {
      this.phase = 'won';
      this.score += 500;
      this.events.push('win');
    }
    this.trailTimer += dt;
    if (this.trailTimer > 0.015) {
      this.trail.unshift({ x: b.x, y: b.y });
      this.trail = this.trail.slice(0, 12);
      this.trailTimer = 0;
    }
  }
  getSprites(time: number): Sprite[] {
    const sprites: Sprite[] = this.bricks
      .filter((b) => b.alive)
      .map((b) => ({ x: b.x, y: b.y, rx: 37, ry: 13, color: b.color, kind: 4 }));
    for (let i = this.trail.length - 1; i >= 0; i--)
      sprites.push({
        ...this.trail[i],
        rx: 5 - i * 0.25,
        ry: 5 - i * 0.25,
        color: [0.65, 0.91, 0.91, (1 - i / 12) * 0.4],
        kind: 0,
      });
    sprites.push({ x: this.paddleX, y: 577, rx: this.paddleWidth, ry: 9, color: MINT, kind: 4 });
    sprites.push({
      x: this.ball.x,
      y: this.ball.y + (this.phase === 'ready' ? Math.sin(time * 2) * 4 : 0),
      rx: 11,
      ry: 11,
      color: [0.8, 1, 0.9, 1],
      kind: 0,
    });
    sprites.push({ x: 27, y: 355, rx: 1, ry: 228, color: [0.29, 0.38, 0.51, 0.22], kind: 6 });
    sprites.push({ x: 973, y: 355, rx: 1, ry: 228, color: [0.29, 0.38, 0.51, 0.22], kind: 6 });
    return sprites.concat(this.effects.sprites());
  }
  snapshot(): GameSnapshot {
    return {
      score: this.score,
      time: this.time,
      lives: this.lives,
      cooldown: 0,
      phase: this.phase,
      x: this.paddleX,
      y: 577,
      remaining: this.bricks.filter((b) => b.alive).length,
    };
  }
}
