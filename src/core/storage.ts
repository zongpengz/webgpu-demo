import type { GameId } from './types';

const key = (game: GameId) => `gpu-lab.best.${game}.v1`;
export function readBest(game: GameId) {
  try {
    const value = Number(localStorage.getItem(key(game)));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}
export function saveBest(game: GameId, score: number) {
  const best = Math.max(readBest(game), score);
  try {
    localStorage.setItem(key(game), String(best));
  } catch {
    /* Private browsing/storage quotas must not interrupt a game. */
  }
  return best;
}
