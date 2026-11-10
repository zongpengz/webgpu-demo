import { SPRITE_KIND } from '../core/sprites';
import type { Color, Sprite } from '../core/types';
import type { MeteorGame } from './meteor';
import { PICKUPS } from './catalog';

function ship(
  sprites: Sprite[],
  x: number,
  y: number,
  time: number,
  color: Color,
  scale = 1,
  boost = false,
  rotation = 0,
) {
  const firstSprite = sprites.length;
  const flame = (boost ? 42 : 22) + Math.sin(time * 32) * 5;
  for (const side of [-1, 1]) {
    sprites.push({
      x: x + side * 10.2 * scale,
      y: y + 36 * scale,
      rx: 4 * scale,
      ry: flame * scale,
      kind: SPRITE_KIND.exhaust,
      color: [color[0], color[1], color[2], 0.65],
    });
    sprites.push({
      x: x + side * 10.2 * scale,
      y: y + 26 * scale,
      rx: 2.5 * scale,
      ry: 12 * scale,
      kind: SPRITE_KIND.exhaust,
      color: [0.8, 0.95, 1, 0.9],
    });
  }
  sprites.push({ x, y, rx: 30 * scale, ry: 35 * scale, color, kind: SPRITE_KIND.fighter });
  for (let i = firstSprite; i < sprites.length; i++) {
    const sprite = sprites[i];
    const dx = sprite.x - x,
      dy = sprite.y - y;
    sprite.x = x + dx * Math.cos(rotation) - dy * Math.sin(rotation);
    sprite.y = y + dx * Math.sin(rotation) + dy * Math.cos(rotation);
    sprite.rotation = rotation;
  }
}
export function combatSprites(game: MeteorGame, time: number): Sprite[] {
  // 数组顺序就是透明度混合顺序。组合机体中，尾焰在下，装甲与反应堆在上。
  const sprites: Sprite[] = [],
    idle = game.phase === 'ready';
  for (const bullet of game.bullets)
    sprites.push({
      x: bullet.x,
      y: bullet.y,
      rx: bullet.radius,
      ry: bullet.length,
      kind: SPRITE_KIND.projectile,
      color: bullet.color,
      rotation: Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2,
    });
  for (const bullet of game.hostileBullets) {
    sprites.push({
      x: bullet.x,
      y: bullet.y,
      rx: 8,
      ry: 8,
      color: bullet.color,
      kind: SPRITE_KIND.spark,
    });
    sprites.push({
      x: bullet.x,
      y: bullet.y,
      rx: 3,
      ry: 3,
      color: [1, 0.9, 0.8, 0.9],
      kind: SPRITE_KIND.spark,
    });
  }
  for (const enemy of game.enemies) {
    const color: Color =
      enemy.hit > 0.7
        ? [1, 1, 1, 1]
        : enemy.kind === 'gunner'
          ? [1, 0.6, 0.3, 1]
          : enemy.kind === 'striker'
            ? [0.95, 0.35, 0.65, 1]
            : [1, 0.35, 0.38, 1];
    sprites.push({
      x: enemy.x,
      y: enemy.y,
      rx: enemy.radius * 1.2,
      ry: enemy.radius * 1.2,
      color,
      kind: enemy.kind === 'gunner' ? SPRITE_KIND.turret : SPRITE_KIND.enemy,
    });
    sprites.push({
      x: enemy.x,
      y: enemy.y + 1,
      rx: 4,
      ry: 4,
      color: [1, 0.88, 0.6, 1],
      kind: SPRITE_KIND.spark,
    });
    if (enemy.health < enemy.maxHealth) {
      sprites.push({
        x: enemy.x,
        y: enemy.y - enemy.radius - 10,
        rx: 22,
        ry: 1,
        color: [0.2, 0.25, 0.35, 0.8],
        kind: SPRITE_KIND.projectile,
      });
      const width = (22 * enemy.health) / enemy.maxHealth;
      sprites.push({
        x: enemy.x - 22 + width,
        y: enemy.y - enemy.radius - 10,
        rx: width,
        ry: 1,
        color: [1, 0.4, 0.4, 0.9],
        kind: SPRITE_KIND.projectile,
      });
    }
  }
  const boss = game.boss;
  if (boss) {
    const color: Color =
      boss.hit > 0.8
        ? [1, 1, 1, 1]
        : game.stage === 1
          ? [0.95, 0.35, 0.65, 1]
          : game.stage === 2
            ? [1, 0.65, 0.3, 1]
            : [1, 0.36, 0.36, 1];
    if (boss.laserTimer > 0) {
      const firing = boss.laserTimer < 0.85;
      sprites.push({
        x: boss.laserX,
        y: 410,
        rx: firing ? 24 : 2,
        ry: 260,
        color: [1, 0.25, 0.35, firing ? 0.85 : 0.38],
        kind: SPRITE_KIND.laser,
      });
    }
    // Thrusters and articulated weapon pods sit beneath the armored central hull.
    const span = 80 + game.stage * 15;
    for (const side of [-1, 1]) {
      sprites.push({
        x: boss.x + side * span,
        y: boss.y - 55,
        rx: 8,
        ry: 34,
        color: [color[0], color[1], color[2], 0.5],
        kind: SPRITE_KIND.exhaust,
        rotation: Math.PI,
      });
      sprites.push({
        x: boss.x + side * (span + 6),
        y: boss.y + 12,
        rx: game.stage === 1 ? 43 : 32,
        ry: game.stage === 1 ? 67 : 52,
        color,
        kind: SPRITE_KIND.bossWing,
        rotation: side * (game.stage === 1 ? -0.5 : 0.2),
      });
    }
    sprites.push({
      x: boss.x,
      y: boss.y,
      rx: 115 + game.stage * 16,
      ry: 68,
      color,
      kind: SPRITE_KIND.bossHull,
      extra: boss.phase,
    });
    for (const side of [-1, 1]) {
      sprites.push({
        x: boss.x + side * span,
        y: boss.y + 29,
        rx: 22,
        ry: 31,
        color,
        kind: SPRITE_KIND.turret,
        rotation: side * 0.08,
      });
      sprites.push({
        x: boss.x + side * 43,
        y: boss.y - 12,
        rx: 13,
        ry: 19,
        color,
        kind: SPRITE_KIND.turret,
      });
    }
    if (game.stage === 2) {
      sprites.push({
        x: boss.x,
        y: boss.y,
        rx: 90,
        ry: 90,
        color: [color[0], color[1], color[2], 0.45],
        kind: SPRITE_KIND.orbit,
        rotation: time * 0.08,
      });
    }
    sprites.push({
      x: boss.x,
      y: boss.y + 7,
      rx: 34 + game.stage * 3,
      ry: 34 + game.stage * 3,
      color,
      kind: SPRITE_KIND.reactor,
      extra: boss.phase,
    });
  }
  for (const pickup of game.pickups) {
    const color = PICKUPS[pickup.kind].rgb;
    sprites.push({
      x: pickup.x,
      y: pickup.y,
      rx: 23 + Math.sin(time * 3) * 2,
      ry: 23 + Math.sin(time * 3) * 2,
      color: [color[0], color[1], color[2], 0.25],
      kind: SPRITE_KIND.ring,
    });
    sprites.push({
      x: pickup.x,
      y: pickup.y,
      rx: 15,
      ry: 17,
      color,
      kind: SPRITE_KIND.pickup,
      extra: ['power', 'repair', 'shield', 'bomb'].indexOf(pickup.kind) + 1,
    });
  }
  for (const explosion of game.explosions) {
    const life = explosion.age / 0.75,
      radius = explosion.radius * (0.2 + life),
      [r, g, b] = explosion.color;
    sprites.push({
      x: explosion.x,
      y: explosion.y,
      rx: radius,
      ry: radius,
      color: [r, g, b, (1 - life) * 0.8],
      kind: SPRITE_KIND.ring,
    });
    sprites.push({
      x: explosion.x,
      y: explosion.y,
      rx: radius * 0.55,
      ry: radius * 0.55,
      color: [r, g, b, (1 - life) ** 3],
      kind: SPRITE_KIND.explosion,
    });
  }
  if (game.phase !== 'over') {
    const visible = game.invulnerable <= 0 || Math.floor(time * 16) % 2 === 0;
    const x = idle ? 735 : game.x,
      y = idle ? 335 + Math.sin(time * 0.9) * 8 : game.y;
    if (visible)
      ship(
        sprites,
        x,
        y,
        time,
        [0.58, 0.82, 0.95, 1],
        idle ? 3.3 : 1,
        game.dashTime > 0,
        idle ? -0.2 : 0,
      );
    if (game.shield > 0 && !idle)
      sprites.push({
        x,
        y,
        rx: idle ? 69 : 45,
        ry: idle ? 76 : 50,
        color: [0.25, 0.8, 1, game.invulnerable > 0 ? 0.5 : 0.08],
        kind: SPRITE_KIND.ring,
      });
    const drones = game.upgrades.filter((upgrade) => upgrade === 'drone').length;
    for (let i = 0; i < drones; i++)
      ship(
        sprites,
        x + (i % 2 === 0 ? -1 : 1) * (42 + Math.floor(i / 2) * 20),
        y + 8,
        time,
        [0.65, 0.5, 1, 1],
        0.38,
      );
    if (idle) {
      ship(
        sprites,
        585,
        460 + Math.sin(time * 0.8) * 5,
        time,
        [0.4, 0.7, 0.85, 0.55],
        0.72,
        false,
        -0.2,
      );
      ship(
        sprites,
        885,
        445 + Math.cos(time * 0.8) * 5,
        time,
        [0.4, 0.7, 0.85, 0.55],
        0.72,
        false,
        -0.2,
      );
    }
  }
  return sprites.concat(game.effects.sprites());
}
