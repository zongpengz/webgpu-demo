import type { GameEvent, GameInput, GameSnapshot, Phase, Simulation, Sprite } from '../core/types';

/** Particle motion lives in the compute shader. The CPU only draws the attractor. */
export class GravityGame implements Simulation {
  phase: Phase = 'ready';
  events: GameEvent[] = [];
  time = 0;
  start() {
    this.phase = 'running';
    this.time = 0;
  }
  update(dt: number, _input: GameInput) {
    if (this.phase === 'running') this.time += dt;
  }
  preview(_dt: number) {}
  getSprites(time: number): Sprite[] {
    return [
      {
        x: 500,
        y: 325,
        rx: 30 + Math.sin(time) * 4,
        ry: 30 + Math.sin(time) * 4,
        color: [0.66, 0.45, 1, 0.2],
        kind: 5,
      },
      { x: 500, y: 325, rx: 7, ry: 7, color: [0.8, 0.64, 1, 0.7], kind: 0 },
    ];
  }
  snapshot(): GameSnapshot {
    return {
      score: 0,
      time: this.time,
      lives: 3,
      cooldown: 0,
      phase: this.phase,
      x: 500,
      y: 325,
      remaining: 0,
    };
  }
}
