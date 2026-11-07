import { describe, expect, it } from 'vitest';
import { MeteorGame } from './meteor';
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
