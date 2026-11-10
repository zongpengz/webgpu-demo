import { describe, expect, it } from 'vitest';
import { MeteorGame } from './meteor';
import { seededRandom } from '../core/math';
import type { GameInput, Phase, WeaponId } from '../core/types';
import type { Enemy } from './combat';

const dt = 1 / 120;
const input = (changes: Partial<GameInput> = {}): GameInput => ({
  x: 0,
  y: 0,
  pointer: { x: 500, y: 535 },
  pointerControl: false,
  dash: false,
  ...changes,
});
function create() {
  const game = new MeteorGame('normal', seededRandom(7));
  game.start();
  return game;
}
function advance(game: MeteorGame, seconds: number, controls = input()) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, controls);
}
function enemy(id: number, y = 450): Enemy {
  return {
    id,
    x: 500,
    y,
    baseX: 500,
    health: 60,
    maxHealth: 60,
    kind: 'scout',
    radius: 19,
    speed: 0,
    age: 0,
    shotTimer: 10,
    hit: 0,
  };
}
function bossFight(stage = 0) {
  const game = create();
  game.start(stage);
  game.wave = 3;
  game.waveTime = 12;
  game.update(dt, input());
  return game;
}

describe('Starfall combat', () => {
  it.each<Phase>(['ready', 'paused', 'upgrade', 'over', 'won'])(
    'freezes simulation during %s',
    (phase) => {
      const game = create();
      game.phase = phase;
      const before = game.snapshot();
      game.update(1, input({ x: 1, bomb: true }));
      expect(game.snapshot()).toEqual(before);
      expect(game.bullets).toHaveLength(0);
    },
  );
  it('normalizes diagonal movement and clamps movement to the combat area', () => {
    const a = create(),
      b = create();
    a.update(0.1, input({ x: 1 }));
    b.update(0.1, input({ x: 1, y: -1 }));
    expect(Math.hypot(b.x - 500, b.y - 535)).toBeCloseTo(a.x - 500);
    advance(a, 4, input({ x: 1, y: 1 }));
    expect(a.x).toBeLessThanOrEqual(970);
    expect(a.y).toBeLessThanOrEqual(600);
  });
  it('absorbs damage with shields, applies overflow to hull and prevents repeated hits', () => {
    const game = create();
    game.invulnerable = 0;
    game.shield = 5;
    game.hitPlayer(20);
    expect(game.shield).toBe(0);
    expect(game.health).toBe(85);
    game.hitPlayer(20);
    expect(game.health).toBe(85);
  });
  it('dash grants invulnerability and cannot bypass its cooldown', () => {
    const game = create();
    game.invulnerable = 0;
    game.update(dt, input({ dash: true }));
    expect(game.cooldown).toBe(3);
    game.hitPlayer(100);
    expect(game.health).toBe(100);
    game.update(0.1, input({ dash: true }));
    expect(game.cooldown).toBeCloseTo(2.9);
  });
  it.each<[WeaponId, number]>([
    ['pulse', 2],
    ['spread', 3],
    ['lance', 1],
  ])('%s has a distinct firing pattern', (weapon, count) => {
    const game = create();
    game.setWeapon(weapon);
    game.update(dt, input());
    expect(game.bullets).toHaveLength(count);
    if (weapon === 'lance') expect(game.bullets[0].piercing).toBeGreaterThan(1);
    if (weapon === 'spread') expect(game.bullets[0].vx).toBeLessThan(0);
  });
  it('manual fire waits for input, and leveled scatter grows its fan', () => {
    const game = create();
    game.autoFire = false;
    game.update(dt, input());
    expect(game.bullets).toHaveLength(0);
    game.setWeapon('spread');
    game.weaponLevel = 4;
    game.update(dt, input({ fire: true }));
    expect(game.bullets).toHaveLength(7);
  });
  it('piercing rounds damage multiple targets once per target', () => {
    const game = create();
    game.setWeapon('lance');
    game.enemies = [enemy(1, 450), enemy(2, 400)];
    game.update(0.18, input());
    expect(game.enemies.every((e) => e.health < 60)).toBe(true);
    const health = game.enemies.map((e) => e.health);
    game.autoFire = false;
    game.update(dt, input());
    expect(game.enemies.map((e) => e.health)).toEqual(health);
  });
  it('kills award score and chain progress only once', () => {
    const game = create();
    const victim = enemy(1, 510);
    victim.health = 1;
    game.enemies = [victim];
    game.update(0.02, input());
    expect(game.kills).toBe(1);
    expect(game.combo).toBe(1);
    expect(game.score).toBeGreaterThanOrEqual(80);
    expect(game.events.filter((e) => e === 'kill')).toHaveLength(1);
  });
  it('supplies upgrade firepower and restore hull, shields and pulse charges within limits', () => {
    const game = create();
    game.health = 50;
    game.shield = 10;
    game.bombs = 3;
    for (const kind of ['power', 'repair', 'shield', 'bomb'] as const)
      game.dropPickup(game.x, game.y, kind);
    game.update(dt, input());
    expect(game.weaponLevel).toBe(2);
    expect(game.health).toBe(80);
    expect(game.shield).toBe(50);
    expect(game.bombs).toBe(4);
    expect(game.pickups).toHaveLength(0);
  });
  it('a pulse clears bullets and cannot be used without a charge or outside combat', () => {
    const game = create();
    game.hostileBullets = [
      {
        x: 50,
        y: 50,
        vx: 0,
        vy: 20,
        radius: 5,
        damage: 10,
        life: 5,
        color: [1, 0, 0, 1],
        piercing: 1,
        hitIds: [],
        length: 5,
      },
    ];
    game.releaseBomb();
    expect(game.hostileBullets).toHaveLength(0);
    expect(game.bombs).toBe(1);
    game.bombs = 0;
    game.releaseBomb();
    expect(game.bombs).toBe(0);
    game.phase = 'paused';
    game.bombs = 2;
    game.releaseBomb();
    expect(game.bombs).toBe(2);
  });
  it('successive pulses award a destroyed enemy only once before the next simulation step', () => {
    const game = create();
    game.enemies = [enemy(1)];
    game.releaseBomb();
    const score = game.score;
    game.releaseBomb();
    expect(game.kills).toBe(1);
    expect(game.combo).toBe(1);
    expect(game.score).toBe(score);
    expect(game.damageDealt).toBe(60);
    expect(game.events.filter((event) => event === 'kill')).toHaveLength(1);
  });
  it('three timed waves lead to a boss with aimed, radial and enraged phases', () => {
    const game = create();
    game.invulnerable = 1000;
    advance(game, 36.2);
    expect(game.wave).toBe(3);
    expect(game.boss).not.toBeNull();
    const boss = game.boss!;
    boss.age = 3;
    boss.shotTimer = 0;
    boss.health = boss.maxHealth * 0.5;
    game.update(dt, input());
    expect(boss.phase).toBe(2);
    expect(game.hostileBullets.length).toBeGreaterThanOrEqual(12);
    boss.health = boss.maxHealth * 0.2;
    boss.age = 6;
    boss.shotTimer = 0;
    game.update(dt, input());
    expect(boss.phase).toBe(3);
    expect(boss.laserTimer).toBeGreaterThan(0.85);
    const lockedX = boss.laserX;
    game.update(dt, input({ x: 1 }));
    expect(boss.laserX).toBe(lockedX);
  });
  it.each(['overdrive', 'armor', 'drone'] as const)(
    'boss defeat offers %s and advances exactly one stage',
    (upgrade) => {
      const game = bossFight();
      game.boss!.health = 0;
      game.update(dt, input());
      expect(game.phase).toBe('upgrade');
      game.chooseUpgrade(upgrade);
      expect(game.stage).toBe(1);
      expect(game.phase).toBe('running');
      expect(game.upgrades).toEqual([upgrade]);
      expect(game.shield).toBe(game.maxShield);
      game.chooseUpgrade(upgrade);
      expect(game.stage).toBe(1);
      expect(game.upgrades).toHaveLength(1);
      if (upgrade === 'armor') expect(game.maxHealth).toBe(125);
    },
  );
  it('the last boss ends the campaign and awards victory once', () => {
    const game = bossFight(2);
    game.boss!.health = 0;
    game.update(dt, input());
    expect(game.phase).toBe('won');
    const score = game.score;
    advance(game, 3);
    expect(game.score).toBe(score);
    expect(game.events.filter((e) => e === 'win')).toHaveLength(1);
  });
  it('restart clears projectiles, upgrades, damage and effects from the previous run', () => {
    const game = bossFight();
    game.upgrades.push('armor');
    game.damageDealt = 500;
    game.health = 5;
    game.releaseBomb();
    game.start();
    expect(game.boss).toBeNull();
    expect(game.bullets).toHaveLength(0);
    expect(game.upgrades).toHaveLength(0);
    expect(game.damageDealt).toBe(0);
    expect(game.health).toBe(100);
    expect(game.phase).toBe('running');
  });
});
