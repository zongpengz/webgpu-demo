const key = 'gpu-lab.best.meteor.v1';
export function readBest() {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}
export function saveBest(score: number) {
  const best = Math.max(readBest(), score);
  try {
    localStorage.setItem(key, String(best));
  } catch {
    /* Private browsing/storage quotas must not interrupt a game. */
  }
  return best;
}
