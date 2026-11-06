export type GameId = 'meteor' | 'breakout' | 'gravity';
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
  pointer: Point;
  mode: number;
  pressed: boolean;
  glow: number;
}
export interface Renderer {
  kind: 'webgpu' | 'canvas';
  count: number;
  drawCalls: number;
  resize(): void;
  setCount(count: number): void;
  resetParticles(): void;
  render(frame: RenderFrame, sprites: Sprite[]): void;
  destroy(): void;
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
  remaining: number;
}
export type GameEvent = 'collect' | 'hit' | 'brick' | 'dash' | 'win' | 'lose';
export interface Simulation {
  phase: Phase;
  events: GameEvent[];
  start(): void;
  update(dt: number, input: GameInput): void;
  preview(dt: number): void;
  getSprites(time: number): Sprite[];
  snapshot(): GameSnapshot;
}
