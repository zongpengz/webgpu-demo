import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBest, readProgress, saveBest, saveProgress } from './storage';

afterEach(() => vi.unstubAllGlobals());
function storage() {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  return values;
}
describe('local campaign persistence', () => {
  it('unlocks stages monotonically and caps completion at three', () => {
    storage();
    expect(readProgress()).toBe(0);
    saveProgress(2);
    saveProgress(1);
    expect(readProgress()).toBe(2);
    saveProgress(9);
    expect(readProgress()).toBe(3);
  });
  it('preserves scores created by the original game', () => {
    const values = storage();
    values.set('gpu-lab.best.meteor.v1', '1200');
    expect(readBest()).toBe(1200);
    expect(saveBest(500)).toBe(1200);
    expect(saveBest(1800)).toBe(1800);
  });
  it('keeps the run working when local storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readProgress()).toBe(0);
    expect(saveProgress(1)).toBe(1);
    expect(saveBest(1500)).toBe(1500);
  });
});
