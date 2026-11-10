/** CPU 精灵与 WGSL 共用的材质编号。编号写入 Sprite.style.x，保持显存布局稳定。 */
export const SPRITE_KIND = {
  spark: 0,
  fighter: 2,
  pickup: 3,
  enemy: 4,
  ring: 5,
  projectile: 6,
  turret: 7,
  bossHull: 8,
  laser: 9,
  exhaust: 10,
  explosion: 11,
  reactor: 12,
  bossWing: 14,
  orbit: 15,
} as const;

export type SpriteKind = (typeof SPRITE_KIND)[keyof typeof SPRITE_KIND];
