export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export function circleRect(
  cx: number,
  cy: number,
  radius: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  return Math.hypot(cx - clamp(cx, x - w, x + w), cy - clamp(cy, y - h, y + h)) < radius;
}
/** Small seeded PRNG, also lets physics tests replay the same scenario. */
export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
