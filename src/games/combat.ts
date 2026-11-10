import type { Color, PickupId, Point } from '../core/types';

export type EnemyKind = 'scout' | 'striker' | 'gunner';
export interface Enemy extends Point {
  id: number;
  kind: EnemyKind;
  health: number;
  maxHealth: number;
  radius: number;
  baseX: number;
  speed: number;
  age: number;
  shotTimer: number;
  hit: number;
}
export interface Bullet extends Point {
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  color: Color;
  piercing: number;
  hitIds: number[];
  length: number;
}
export interface Pickup extends Point {
  kind: PickupId;
  age: number;
}
export interface Boss extends Point {
  health: number;
  maxHealth: number;
  age: number;
  shotTimer: number;
  phase: number;
  hit: number;
  laserTimer: number;
  laserX: number;
}
export interface Explosion extends Point {
  age: number;
  radius: number;
  color: Color;
}
export const DIFFICULTIES = {
  easy: { name: '新兵', health: 0.7, bulletSpeed: 0.78, spawn: 1.2, damage: 0.7, score: 0.8 },
  normal: { name: '老兵', health: 1, bulletSpeed: 1, spawn: 1, damage: 1, score: 1 },
  hard: { name: '王牌', health: 1.25, bulletSpeed: 1.2, spawn: 0.8, damage: 1.25, score: 1.4 },
};
export const WAVE_DURATION = 12;
export const WAVES_PER_STAGE = 3;
