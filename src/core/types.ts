export type Difficulty = 'easy' | 'normal' | 'hard';
export type Phase = 'ready' | 'running' | 'paused' | 'over' | 'won';
export type Color = [number, number, number, number];
export interface Point {
  x: number;
  y: number;
}
export interface Sprite extends Point {
  rx: number;
  ry: number;
  color: Color;
  kind?: number;
  rotation?: number;
  extra?: number;
}
export interface RenderFrame {
  time: number;
  dt: number;
  glow: number;
}
export interface GameInput {
  x: number;
  y: number;
  pointer: Point;
  pointerControl: boolean;
  dash: boolean;
}
export interface GameSnapshot {
  score: number;
  time: number;
  lives: number;
  cooldown: number;
  phase: Phase;
  x: number;
  y: number;
}
export type GameEvent = 'collect' | 'hit' | 'dash' | 'win' | 'lose';
