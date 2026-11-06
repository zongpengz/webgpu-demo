import type { Difficulty, GameId, Simulation } from '../core/types';
import { MeteorGame } from './meteor';
import { BreakoutGame } from './breakout';
import { GravityGame } from './gravity';

// Add a simulation here, metadata in catalog.ts, and a new shader mode if needed.
export function createGame(id: GameId, difficulty: Difficulty): Simulation {
  switch (id) {
    case 'meteor':
      return new MeteorGame(difficulty);
    case 'breakout':
      return new BreakoutGame(difficulty);
    case 'gravity':
      return new GravityGame();
  }
}
