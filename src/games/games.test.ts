import { describe, expect, it } from 'vitest';
import { MeteorGame } from './meteor';
import { BreakoutGame } from './breakout';
import { GravityGame } from './gravity';
import { seededRandom } from '../core/math';
import type { GameInput } from '../core/types';

const input = (changes: Partial<GameInput> = {}): GameInput => ({
  x: 0,
  y: 0,
  pointer: { x: 500, y: 535 },
  pointerControl: false,
  dash: false,
  ...changes,
});
const dt = 1 / 120;

describe('星际闪避', () => {
  it('暂停时不移动，也不计时', () => {
    const game = new MeteorGame('normal', seededRandom(1));
    game.start();
    game.phase = 'paused';
    game.update(1, input({ x: 1 }));
    expect(game.x).toBe(500);
    expect(game.time).toBe(0);
  });
  it('将飞船限制在游戏区域内，并统一斜向速度', () => {
    const a = new MeteorGame(),
      b = new MeteorGame();
    a.start();
    b.start();
    a.update(0.1, input({ x: 1 }));
    b.update(0.1, input({ x: 1, y: -1 }));
    expect(Math.hypot(b.x - 500, b.y - 535)).toBeCloseTo(a.x - 500);
    for (let i = 0; i < 500; i++) a.update(dt, input({ x: 1, y: 1 }));
    expect(a.x).toBeLessThanOrEqual(975);
    expect(a.y).toBeLessThanOrEqual(605);
  });
  it('命中扣一层护盾，随后在无敌时间内免疫重复伤害', () => {
    const game = new MeteorGame();
    game.start();
    const meteor = { x: 500, y: 535, r: 30, speed: 0, rotation: 0, spin: 0, seed: 1 };
    game.meteors = [{ ...meteor }, { ...meteor }];
    game.update(dt, input());
    expect(game.lives).toBe(2);
    game.meteors.push({ ...meteor });
    game.update(dt, input());
    expect(game.lives).toBe(2);
  });
  it('冲刺有冷却，并能抵挡同一时刻的陨石', () => {
    const game = new MeteorGame();
    game.start();
    game.meteors = [{ x: 500, y: 535, r: 30, speed: 0, rotation: 0, spin: 0, seed: 1 }];
    game.update(dt, input({ dash: true }));
    expect(game.lives).toBe(3);
    expect(game.cooldown).toBe(2.5);
    game.update(0.1, input({ dash: true }));
    expect(game.cooldown).toBeCloseTo(2.4);
  });
  it('收集能量计分，60 秒完成后只结算一次奖励', () => {
    const game = new MeteorGame();
    game.start();
    game.gems = [{ x: 500, y: 535, speed: 0 }];
    game.update(dt, input());
    expect(game.snapshot().score).toBe(100);
    game.time = 60 - dt;
    game.meteors = [];
    game.update(dt, input());
    expect(game.phase).toBe('won');
    const score = game.score;
    game.update(1, input());
    expect(game.score).toBe(score);
  });
});

describe('霓虹打砖块', () => {
  it('等待发球，发球后才移动光球', () => {
    const game = new BreakoutGame();
    game.start();
    game.update(dt, input());
    expect(game.launched).toBe(false);
    game.update(dt, input({ dash: true }));
    expect(game.launched).toBe(true);
    expect(game.ball.vy).toBeLessThan(0);
  });
  it('侧壁与挡板反弹，击中边缘时保留向上的速度', () => {
    const game = new BreakoutGame();
    game.start();
    game.launched = true;
    game.ball = { x: 36, y: 400, vx: -200, vy: 100 };
    game.update(0.02, input());
    expect(game.ball.vx).toBeGreaterThan(0);
    game.ball = { x: 550, y: 558, vx: 0, vy: 300 };
    game.update(0.01, input());
    expect(game.ball.vy).toBeLessThan(0);
    expect(game.ball.vx).toBeGreaterThan(0);
  });
  it('击碎一块砖只加一次分，并在清空后获胜', () => {
    const game = new BreakoutGame();
    game.start();
    game.launched = true;
    const brick = game.bricks[0];
    game.bricks = [brick];
    game.ball = { x: brick.x, y: brick.y + 20, vx: 0, vy: -300 };
    game.update(0.01, input());
    expect(brick.alive).toBe(false);
    expect(game.phase).toBe('won');
    expect(game.score).toBe(550);
  });
  it('丢球后重新等待发球，三次丢球结束游戏', () => {
    const game = new BreakoutGame();
    game.start();
    for (let i = 0; i < 3; i++) {
      game.launched = true;
      game.ball.y = 660;
      game.update(dt, input());
    }
    expect(game.lives).toBe(0);
    expect(game.phase).toBe('over');
  });
});

describe('粒子引力场', () => {
  it('保持自由探索，并能重置计时', () => {
    const game = new GravityGame();
    game.start();
    game.update(5, input());
    expect(game.snapshot().time).toBe(5);
    game.phase = 'paused';
    game.update(5, input());
    expect(game.snapshot().time).toBe(5);
    game.start();
    expect(game.snapshot().time).toBe(0);
  });
});
