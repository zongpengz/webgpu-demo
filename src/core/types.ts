import type { SpriteKind } from './sprites';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Phase = 'ready' | 'running' | 'paused' | 'upgrade' | 'over' | 'won';
export type WeaponId = 'pulse' | 'spread' | 'lance';
export type UpgradeId = 'overdrive' | 'armor' | 'drone';
export type PickupId = 'power' | 'repair' | 'shield' | 'bomb';
export type Color = [number, number, number, number];
export interface Point {
  x: number;
  y: number;
}
export interface Sprite extends Point {
  rx: number;
  ry: number;
  color: Color;
  kind?: SpriteKind;
  rotation?: number;
  extra?: number;
}
export interface RenderFrame {
  time: number;
  dt: number;
  glow: number;
  stage: number;
  danger: number;
  shake: number;
  flash: number;
  speed: number;
}
export interface GameInput {
  x: number;
  y: number;
  pointer: Point;
  pointerControl: boolean;
  dash: boolean;
  fire?: boolean;
  bomb?: boolean;
}
export interface GameSnapshot {
  score: number;
  time: number;
  lives: number;
  /** 冲刺剩余冷却的归一化值，范围 0～1。 */
  cooldown: number;
  phase: Phase;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  stage: number;
  wave: number;
  waveProgress: number;
  bossHealth: number;
  bossMaxHealth: number;
  bossPhase: number;
  bossArrival: number;
  weapon: WeaponId;
  weaponLevel: number;
  autoFire: boolean;
  bombs: number;
  kills: number;
  combo: number;
  maxCombo: number;
  damageDealt: number;
  announcement: string;
  announcementTime: number;
  shake: number;
  flash: number;
  upgrades: UpgradeId[];
}
export type GameEvent =
  | 'collect'
  | 'hit'
  | 'dash'
  | 'win'
  | 'lose'
  | 'shoot'
  | 'kill'
  | 'boss'
  | 'stage'
  | 'bomb'
  | 'upgrade';
