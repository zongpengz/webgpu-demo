import { clamp } from '../core/math';
import type {
  Color,
  Difficulty,
  GameEvent,
  GameInput,
  GameSnapshot,
  Phase,
  PickupId,
  Sprite,
  UpgradeId,
  WeaponId,
} from '../core/types';
import { STAGES, WEAPONS, WEAPON_IDS, PICKUPS } from './catalog';
import { DIFFICULTIES, WAVE_DURATION, WAVES_PER_STAGE } from './combat';
import type { Boss, Bullet, Enemy, EnemyKind, Explosion, Pickup } from './combat';
import { Effects } from './shared';
import { combatSprites } from './visuals';

/** 纯 CPU 战斗状态。由 usePlayground 调度，输出 UI 快照、绘制精灵和待消费事件。 */
export class MeteorGame {
  phase: Phase = 'ready';
  events: GameEvent[] = [];
  score = 0;
  time = 0;
  x = 500;
  y = 535;
  health = 100;
  maxHealth = 100;
  shield = 60;
  maxShield = 60;
  cooldown = 0;
  invulnerable = 0;
  dashTime = 0;
  stage = 0;
  wave = 1;
  waveTime = 0;
  weapon: WeaponId = 'pulse';
  weaponLevel = 1;
  autoFire = true;
  bombs = 2;
  kills = 0;
  combo = 0;
  maxCombo = 0;
  damageDealt = 0;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  hostileBullets: Bullet[] = [];
  pickups: Pickup[] = [];
  explosions: Explosion[] = [];
  boss: Boss | null = null;
  upgrades: UpgradeId[] = [];
  effects: Effects;
  shake = 0;
  flash = 0;
  announcement = '';
  announcementTime = 0;
  private spawnTimer = 0.4;
  private fireTimer = 0;
  private droneTimer = 0;
  private pickupTimer = 7;
  private lastHit = 0;
  private comboTimer = 0;
  private nextId = 1;
  private damageBonus = 1;
  constructor(
    public difficulty: Difficulty = 'normal',
    private random = Math.random,
  ) {
    this.effects = new Effects(random);
  }
  get lives() {
    return Math.ceil(this.health / 25);
  }
  get bossPhase() {
    return this.boss?.phase ?? 0;
  }
  start(stage = 0) {
    // 重新部署清空本局强化，保留玩家选择的武器、自动开火与难度。
    this.phase = 'running';
    this.events = [];
    this.time = 0;
    this.score = 0;
    this.x = 500;
    this.y = 535;
    this.health = 100;
    this.maxHealth = 100;
    this.shield = 60;
    this.maxShield = 60;
    this.cooldown = 0;
    this.invulnerable = 1.5;
    this.dashTime = 0;
    this.stage = clamp(Math.floor(stage), 0, STAGES.length - 1);
    this.wave = 1;
    this.waveTime = 0;
    this.weaponLevel = 1 + this.stage;
    this.bombs = 2;
    this.kills = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.damageDealt = 0;
    this.enemies = [];
    this.bullets = [];
    this.hostileBullets = [];
    this.pickups = [];
    this.explosions = [];
    this.boss = null;
    this.upgrades = [];
    this.effects = new Effects(this.random);
    this.spawnTimer = 0.6;
    this.fireTimer = 0;
    this.droneTimer = 0;
    this.pickupTimer = 7;
    this.lastHit = 0;
    this.comboTimer = 0;
    this.damageBonus = 1;
    this.shake = 0;
    this.flash = 0;
    this.announce(`行动 ${String(this.stage + 1).padStart(2, '0')}  /  ${STAGES[this.stage].name}`);
  }
  preview(dt: number) {
    this.effects.update(dt);
  }
  setWeapon(weapon: WeaponId) {
    this.weapon = weapon;
    this.fireTimer = 0;
  }
  cycleWeapon() {
    this.setWeapon(WEAPON_IDS[(WEAPON_IDS.indexOf(this.weapon) + 1) % WEAPON_IDS.length]);
  }
  toggleAutoFire() {
    this.autoFire = !this.autoFire;
  }
  private announce(message: string) {
    this.announcement = message;
    this.announcementTime = 2.8;
  }
  update(dt: number, input: GameInput) {
    // 暂停、关间强化和结算共用这个入口，均不推进战斗时间。
    if (this.phase !== 'running') return;
    this.time += dt;
    this.score += dt * 3;
    this.lastHit += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.dashTime = Math.max(0, this.dashTime - dt);
    this.announcementTime = Math.max(0, this.announcementTime - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.combo = 0;
    this.shake = Math.max(0, this.shake - dt * 20);
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.lastHit > 5) this.shield = Math.min(this.maxShield, this.shield + dt * 3);
    this.effects.update(dt);
    for (const explosion of this.explosions) explosion.age += dt;
    this.explosions = this.explosions.filter((explosion) => explosion.age < 0.75);
    this.movePlayer(dt, input);
    if (input.bomb) this.releaseBomb();
    this.fireTimer -= dt;
    if ((this.autoFire || input.fire) && this.fireTimer <= 0) this.fireWeapon();
    this.updateDrones(dt);
    if (this.boss) this.updateBoss(dt);
    else this.updateWaves(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    if (this.phase !== 'running') return;
    this.updatePickups(dt);
    if (this.boss && this.boss.health <= 0) this.completeStage();
  }
  private movePlayer(dt: number, input: GameInput) {
    if (input.dash && this.cooldown === 0) {
      this.dashTime = 0.22;
      this.cooldown = 3;
      this.invulnerable = Math.max(this.invulnerable, 0.35);
      this.events.push('dash');
      this.effects.burst(this.x, this.y, WEAPONS[this.weapon].rgb, 12);
    }
    const speed = this.dashTime > 0 ? 900 : 380;
    if (input.x || input.y) {
      const length = Math.hypot(input.x, input.y);
      this.x += (input.x / length) * speed * dt;
      this.y += (input.y / length) * speed * dt;
    } else if (input.pointerControl) {
      const dx = input.pointer.x - this.x,
        dy = input.pointer.y - this.y,
        distance = Math.hypot(dx, dy);
      if (distance > 0.1) {
        const step = Math.min(distance, speed * dt);
        this.x += (dx / distance) * step;
        this.y += (dy / distance) * step;
      }
    }
    this.x = clamp(this.x, 30, 970);
    this.y = clamp(this.y, 145, 600);
  }
  private fireWeapon() {
    const spec = WEAPONS[this.weapon],
      level = this.weaponLevel;
    const damage = spec.damage * (1 + (level - 1) * 0.18) * this.damageBonus;
    this.fireTimer = spec.rate / (1 + (level - 1) * 0.08);
    if (this.weapon === 'spread') {
      const count = level >= 4 ? 7 : level >= 2 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        const angle = (i - (count - 1) / 2) * 0.13;
        this.bullets.push(
          this.makeBullet(
            this.x,
            this.y - 24,
            Math.sin(angle) * 680,
            -Math.cos(angle) * 680,
            damage,
            spec.rgb,
          ),
        );
      }
    } else if (this.weapon === 'lance') {
      const bullet = this.makeBullet(this.x, this.y - 30, 0, -880, damage, spec.rgb);
      bullet.piercing = 3 + Math.floor(level / 2);
      bullet.radius = 6;
      bullet.length = 36;
      this.bullets.push(bullet);
    } else {
      for (const side of [-1, 1])
        this.bullets.push(
          this.makeBullet(this.x + side * 12, this.y - 20, side * 12, -780, damage, spec.rgb),
        );
      if (level >= 3)
        this.bullets.push(this.makeBullet(this.x, this.y - 34, 0, -850, damage * 0.65, spec.rgb));
    }
    this.events.push('shoot');
  }
  private makeBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    color: Color,
  ): Bullet {
    return { x, y, vx, vy, damage, color, radius: 4, life: 4, piercing: 1, hitIds: [], length: 14 };
  }
  private updateDrones(dt: number) {
    const drones = this.upgrades.filter((upgrade) => upgrade === 'drone').length;
    this.droneTimer -= dt;
    if (!drones || this.droneTimer > 0) return;
    this.droneTimer = 0.28;
    for (let i = 0; i < drones; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.bullets.push(
        this.makeBullet(
          this.x + side * (42 + Math.floor(i / 2) * 20),
          this.y - 8,
          0,
          -720,
          8 * this.damageBonus,
          [0.75, 0.5, 1, 1],
        ),
      );
    }
  }
  private updateWaves(dt: number) {
    this.waveTime += dt;
    this.spawnTimer -= dt;
    this.pickupTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnFormation();
      this.spawnTimer =
        (2.2 - this.stage * 0.2 - this.wave * 0.1) * DIFFICULTIES[this.difficulty].spawn;
    }
    if (this.pickupTimer <= 0) {
      this.dropPickup(130 + this.random() * 740, -20, this.weaponLevel < 3 ? 'power' : 'shield');
      this.pickupTimer = 10;
    }
    if (this.waveTime >= WAVE_DURATION) {
      this.waveTime = 0;
      if (this.wave < WAVES_PER_STAGE) {
        this.wave++;
        this.announce(`第 ${this.wave} 波  /  敌机编队接近`);
      } else this.spawnBoss();
    }
  }
  private spawnFormation() {
    const index = this.kills + Math.floor(this.time / 2),
      kind: EnemyKind = index % 4 === 0 ? 'gunner' : index % 3 === 0 ? 'striker' : 'scout';
    const count = kind === 'gunner' ? 2 : 3 + this.stage,
      center = 180 + this.random() * 640;
    for (let i = 0; i < count; i++) {
      const x = clamp(center + (i - (count - 1) / 2) * 78, 60, 940);
      const health =
        (kind === 'gunner' ? 62 : kind === 'striker' ? 32 : 22) *
        (1 + this.stage * 0.25) *
        DIFFICULTIES[this.difficulty].health;
      this.enemies.push({
        id: this.nextId++,
        x,
        baseX: x,
        y: -40 - Math.abs(i - (count - 1) / 2) * 35,
        kind,
        health,
        maxHealth: health,
        radius: kind === 'gunner' ? 27 : 19,
        speed: 80 + this.stage * 16 + (kind === 'striker' ? 60 : 0),
        age: i * 0.3,
        shotTimer: 1.2 + i * 0.35,
        hit: 0,
      });
    }
  }
  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue;
      enemy.age += dt;
      enemy.hit = Math.max(0, enemy.hit - dt * 8);
      enemy.y += enemy.speed * dt;
      enemy.x = clamp(
        enemy.baseX +
          Math.sin(enemy.age * (enemy.kind === 'striker' ? 2 : 1.2)) *
            (enemy.kind === 'striker' ? 100 : 35),
        25,
        975,
      );
      enemy.shotTimer -= dt;
      if (enemy.y > 65 && enemy.y < 420 && enemy.shotTimer <= 0) {
        const angle = Math.atan2(this.y - enemy.y, this.x - enemy.x),
          count = enemy.kind === 'gunner' ? 3 : 1;
        for (let i = 0; i < count; i++)
          this.enemyShot(
            enemy.x,
            enemy.y + 15,
            angle + (i - (count - 1) / 2) * 0.18,
            155 + this.stage * 24,
            14,
          );
        enemy.shotTimer = enemy.kind === 'gunner' ? 1.5 : 2.4;
      }
      if (
        Math.hypot(enemy.x - this.x, enemy.y - this.y) < enemy.radius + 12 &&
        this.invulnerable === 0
      ) {
        this.hitPlayer(24);
        this.destroyEnemy(enemy);
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.health > 0 && enemy.y < 720);
  }
  private enemyShot(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    color: Color = [1, 0.3, 0.36, 1],
  ) {
    if (this.hostileBullets.length >= 450) return;
    const velocity = speed * DIFFICULTIES[this.difficulty].bulletSpeed;
    const bullet = this.makeBullet(
      x,
      y,
      Math.cos(angle) * velocity,
      Math.sin(angle) * velocity,
      damage,
      color,
    );
    bullet.radius = 6;
    bullet.length = 7;
    bullet.life = 7;
    this.hostileBullets.push(bullet);
  }
  private spawnBoss() {
    const maxHealth = STAGES[this.stage].hp * DIFFICULTIES[this.difficulty].health;
    this.boss = {
      x: 500,
      y: -100,
      health: maxHealth,
      maxHealth,
      age: 0,
      shotTimer: 2.8,
      phase: 1,
      hit: 0,
      laserTimer: 0,
      laserX: 500,
    };
    this.enemies = [];
    this.hostileBullets = [];
    this.events.push('boss');
    this.invulnerable = Math.max(this.invulnerable, 1);
    this.announce(`高威胁目标  /  ${STAGES[this.stage].boss}`);
  }
  private updateBoss(dt: number) {
    const boss = this.boss!;
    boss.age += dt;
    boss.hit = Math.max(0, boss.hit - dt * 8);
    boss.y += (148 - boss.y) * Math.min(1, dt * 1.6);
    boss.x = 500 + Math.sin(boss.age * (0.5 + this.stage * 0.1)) * (165 + this.stage * 25);
    const phase =
      boss.health / boss.maxHealth > 0.66 ? 1 : boss.health / boss.maxHealth > 0.33 ? 2 : 3;
    if (phase !== boss.phase) {
      boss.phase = phase;
      this.announce(`首领阶段 ${phase}  /  弹幕模式切换`);
      this.shake = 5;
      if (phase === 3) {
        boss.laserX = this.x;
        boss.laserTimer = 2.2;
      }
    }
    if (boss.age < 2.6) return;
    boss.shotTimer -= dt;
    if (boss.shotTimer <= 0) {
      const angle = Math.atan2(this.y - boss.y, this.x - boss.x);
      if (phase === 1) {
        for (const port of [-65, 65])
          for (let i = -1; i <= 1; i++)
            this.enemyShot(boss.x + port, boss.y + 25, angle + i * 0.19, 185, 18);
        if (this.stage === 1) {
          for (let i = 0; i < 8; i++)
            this.enemyShot(
              boss.x,
              boss.y + 20,
              (i / 8) * Math.PI * 2 + boss.age * 0.3,
              130,
              14,
              [1, 0.4, 0.7, 1],
            );
        }
      } else {
        const count = 12 + this.stage * 4;
        for (let i = 0; i < count; i++)
          this.enemyShot(
            boss.x,
            boss.y + 22,
            (i / count) * Math.PI * 2 + boss.age * 0.22,
            phase === 3 ? 195 : 155,
            16,
            [1, 0.4, 0.6, 1],
          );
        if (phase === 3)
          for (let i = -2; i <= 2; i++)
            this.enemyShot(boss.x, boss.y + 30, angle + i * 0.13, 240, 18);
        if (this.stage === 2 && phase === 2) {
          for (let i = -1; i <= 1; i++)
            this.enemyShot(boss.x, boss.y + 30, angle + i * 0.16, 230, 18, [1, 0.7, 0.3, 1]);
        }
      }
      boss.shotTimer = phase === 1 ? 1.1 : phase === 2 ? 1.25 : 0.92;
    }
    if (phase === 3) {
      const cycle = boss.age % 6;
      if (cycle < 0.12 && boss.laserTimer <= 0) {
        boss.laserX = this.x;
        boss.laserTimer = 2.2;
      }
    }
    if (boss.laserTimer > 0) {
      // laserX 在预警开始时锁定。倒计时末段才造成伤害，给玩家横向闪避的时间。
      boss.laserTimer = Math.max(0, boss.laserTimer - dt);
      if (
        boss.laserTimer < 0.85 &&
        boss.laserTimer > 0.1 &&
        Math.abs(this.x - boss.laserX) < 24 &&
        this.y > boss.y
      )
        this.hitPlayer(24);
    }
    if (Math.hypot(this.x - boss.x, this.y - boss.y) < 90) this.hitPlayer(25);
  }
  private updateBullets(dt: number) {
    for (const bullet of this.bullets) {
      const previousY = bullet.y;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      for (const enemy of this.enemies) {
        if (enemy.health <= 0 || bullet.life <= 0 || bullet.hitIds.includes(enemy.id)) continue;
        // 覆盖子弹本步扫过的纵向区间，避免高速弹直接跨过敌机。
        const nearestY = clamp(enemy.y, bullet.y, previousY);
        if (Math.hypot(bullet.x - enemy.x, nearestY - enemy.y) < enemy.radius + bullet.radius) {
          this.damageDealt += Math.min(enemy.health, bullet.damage);
          enemy.health -= bullet.damage;
          enemy.hit = 1;
          bullet.hitIds.push(enemy.id);
          bullet.piercing--;
          if (bullet.piercing <= 0) bullet.life = 0;
          this.effects.burst(bullet.x, enemy.y, bullet.color, 3);
          if (enemy.health <= 0) this.destroyEnemy(enemy);
        }
      }
      const boss = this.boss;
      if (
        boss &&
        boss.age > 1.8 &&
        bullet.life > 0 &&
        !bullet.hitIds.includes(-1) &&
        Math.abs(bullet.x - boss.x) < 105 + this.stage * 15 &&
        bullet.y < boss.y + 55 &&
        previousY > boss.y - 55
      ) {
        this.damageDealt += Math.max(0, Math.min(boss.health, bullet.damage));
        boss.health -= bullet.damage;
        boss.hit = 1;
        bullet.hitIds.push(-1);
        bullet.life = 0;
        this.effects.burst(bullet.x, boss.y + 40, bullet.color, 3);
      }
    }
    for (const bullet of this.hostileBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (
        this.invulnerable === 0 &&
        Math.hypot(bullet.x - this.x, bullet.y - this.y) < bullet.radius + 8
      ) {
        bullet.life = 0;
        this.hitPlayer(bullet.damage);
      }
    }
    const visible = (bullet: Bullet) =>
      bullet.life > 0 && bullet.x > -60 && bullet.x < 1060 && bullet.y > -100 && bullet.y < 730;
    this.bullets = this.bullets.filter(visible);
    this.hostileBullets = this.hostileBullets.filter(visible);
    this.enemies = this.enemies.filter((enemy) => enemy.health > 0);
  }
  private destroyEnemy(enemy: Enemy) {
    enemy.health = 0;
    this.kills++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = 3.5;
    this.score +=
      (enemy.kind === 'gunner' ? 150 : 80) *
      Math.min(4, 1 + Math.floor(this.combo / 8) * 0.5) *
      DIFFICULTIES[this.difficulty].score;
    this.explode(enemy.x, enemy.y, enemy.radius * 1.4, [1, 0.5, 0.26, 1]);
    this.events.push('kill');
    if (this.kills % 7 === 0 || this.random() < 0.12)
      this.dropPickup(enemy.x, enemy.y, this.randomPickup());
  }
  private randomPickup(): PickupId {
    if (this.health < this.maxHealth * 0.5) return 'repair';
    const pick = this.random();
    return pick < 0.45 ? 'power' : pick < 0.7 ? 'shield' : pick < 0.85 ? 'repair' : 'bomb';
  }
  private explode(x: number, y: number, radius: number, color: Color) {
    this.explosions.push({ x, y, radius, color, age: 0 });
    this.effects.burst(x, y, color, 22);
  }
  hitPlayer(amount: number) {
    if (this.phase !== 'running' || this.invulnerable > 0) return;
    let damage = amount * DIFFICULTIES[this.difficulty].damage;
    const absorbed = Math.min(this.shield, damage);
    this.shield -= absorbed;
    damage -= absorbed;
    this.health = Math.max(0, this.health - damage);
    this.lastHit = 0;
    this.invulnerable = 0.75;
    this.combo = 0;
    this.shake = 7;
    this.flash = 0.25;
    this.events.push('hit');
    this.effects.burst(this.x, this.y, [0.4, 0.8, 1, 1], 18);
    if (this.health <= 0) {
      this.phase = 'over';
      this.explode(this.x, this.y, 70, [1, 0.5, 0.2, 1]);
      this.events.push('lose');
    }
  }
  releaseBomb() {
    if (this.phase !== 'running' || this.bombs <= 0) return;
    this.bombs--;
    this.hostileBullets = [];
    this.shake = 9;
    this.flash = 0.45;
    this.invulnerable = Math.max(this.invulnerable, 1);
    for (const enemy of this.enemies) {
      // 清理数组在后续 update 中执行，同一物理步内多次释放也只能结算一次击杀。
      if (enemy.health <= 0) continue;
      this.damageDealt += Math.max(0, Math.min(enemy.health, 100));
      enemy.health -= 100;
      if (enemy.health <= 0) this.destroyEnemy(enemy);
    }
    if (this.boss) {
      this.damageDealt += Math.max(0, Math.min(this.boss.health, 160));
      this.boss.health -= 160;
      this.boss.hit = 1;
    }
    this.explode(this.x, this.y - 80, 520, [0.3, 0.8, 1, 1]);
    this.events.push('bomb');
    this.announce('裂变脉冲  /  敌方弹幕已清除');
  }
  dropPickup(x: number, y: number, kind: PickupId) {
    this.pickups.push({ x, y, kind, age: 0 });
  }
  private updatePickups(dt: number) {
    for (const pickup of this.pickups) {
      pickup.age += dt;
      pickup.y += dt * 62;
      const dx = this.x - pickup.x,
        dy = this.y - pickup.y,
        distance = Math.hypot(dx, dy);
      if (distance < 125 && distance > 1) {
        pickup.x += (dx / distance) * 180 * dt;
        pickup.y += (dy / distance) * 180 * dt;
      }
      if (distance < 29) {
        if (pickup.kind === 'power') this.weaponLevel = Math.min(5, this.weaponLevel + 1);
        if (pickup.kind === 'repair') this.health = Math.min(this.maxHealth, this.health + 30);
        if (pickup.kind === 'shield') this.shield = Math.min(this.maxShield, this.shield + 40);
        if (pickup.kind === 'bomb') this.bombs = Math.min(4, this.bombs + 1);
        pickup.age = 99;
        this.score += 100;
        this.events.push('collect');
        this.announce(`${PICKUPS[pickup.kind].name}  /  补给已接收`);
        this.effects.burst(this.x, this.y, PICKUPS[pickup.kind].rgb, 15);
      }
    }
    this.pickups = this.pickups.filter((pickup) => pickup.age < 14 && pickup.y < 700);
  }
  private completeStage() {
    const boss = this.boss!;
    this.explode(boss.x, boss.y, 210, [1, 0.55, 0.25, 1]);
    this.boss = null;
    this.score += (1500 + this.stage * 750) * DIFFICULTIES[this.difficulty].score;
    this.kills++;
    this.hostileBullets = [];
    this.bullets = [];
    this.enemies = [];
    this.events.push('stage');
    this.shake = 10;
    this.flash = 0.5;
    this.phase = this.stage === STAGES.length - 1 ? 'won' : 'upgrade';
    if (this.phase === 'won') this.events.push('win');
  }
  chooseUpgrade(upgrade: UpgradeId) {
    // 首次选择后立即离开 upgrade，后续点击或重复按键不再推进关卡。
    if (this.phase !== 'upgrade') return;
    this.upgrades.push(upgrade);
    if (upgrade === 'overdrive') {
      this.weaponLevel = Math.min(5, this.weaponLevel + 1);
      this.damageBonus *= 1.15;
    }
    if (upgrade === 'armor') {
      this.maxHealth += 25;
      this.health = Math.min(this.maxHealth, this.health + 40);
    }
    this.stage++;
    this.wave = 1;
    this.waveTime = 0;
    this.phase = 'running';
    this.shield = this.maxShield;
    this.bombs = Math.min(4, this.bombs + 1);
    this.invulnerable = 2;
    this.pickups = [];
    this.explosions = [];
    this.spawnTimer = 0.8;
    this.pickupTimer = 5;
    this.x = 500;
    this.y = 535;
    this.events.push('upgrade');
    this.announce(`行动 ${this.stage + 1}  /  ${STAGES[this.stage].name}`);
  }
  getSprites(time: number): Sprite[] {
    return combatSprites(this, time);
  }
  snapshot(): GameSnapshot {
    return {
      score: Math.floor(this.score),
      time: this.time,
      lives: this.lives,
      cooldown: this.cooldown / 3,
      phase: this.phase,
      x: this.x,
      y: this.y,
      health: this.health,
      maxHealth: this.maxHealth,
      shield: this.shield,
      maxShield: this.maxShield,
      stage: this.stage,
      wave: this.wave,
      waveProgress: Math.min(1, this.waveTime / WAVE_DURATION),
      bossHealth: Math.max(0, this.boss?.health ?? 0),
      bossMaxHealth: this.boss?.maxHealth ?? 0,
      bossPhase: this.bossPhase,
      bossArrival: this.boss?.age ?? 0,
      weapon: this.weapon,
      weaponLevel: this.weaponLevel,
      autoFire: this.autoFire,
      bombs: this.bombs,
      kills: this.kills,
      combo: this.combo,
      maxCombo: this.maxCombo,
      damageDealt: this.damageDealt,
      announcement: this.announcement,
      announcementTime: this.announcementTime,
      shake: this.shake,
      flash: this.flash,
      upgrades: [...this.upgrades],
    };
  }
}
