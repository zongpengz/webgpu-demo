// 沿用旧版本键名，让已有玩家的最高分在升级后继续有效。
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

const progressKey = 'starfall.campaign.completed.v1';
export function readProgress() {
  try {
    const value = Number(localStorage.getItem(progressKey));
    return Number.isFinite(value) ? Math.max(0, Math.min(3, Math.floor(value))) : 0;
  } catch {
    return 0;
  }
}
export function saveProgress(completed: number) {
  // 重玩较早关卡时保留已解锁的航线。返回值也供禁用存储时的当前会话使用。
  const progress = Math.max(readProgress(), Math.min(3, completed));
  try {
    localStorage.setItem(progressKey, String(progress));
  } catch {
    /* Storage is optional. */
  }
  return progress;
}
