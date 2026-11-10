import type { Color, PickupId, UpgradeId, WeaponId } from '../core/types';

export const STAGES = [
  {
    name: '碎星前哨',
    en: 'SHATTERED OUTPOST',
    sector: 'KEPLER BELT',
    boss: '执刑者',
    bossEn: 'THE WARDEN',
    description: '突破无人机封锁，摧毁前哨重装舰。',
    color: '#67e8f9',
    hp: 4200,
  },
  {
    name: '猩红裂隙',
    en: 'CRIMSON RIFT',
    sector: 'THE RED EXPANSE',
    boss: '裂隙蜂后',
    bossEn: 'THE MATRIARCH',
    description: '穿过交叉火力，迎战裂隙蜂群。',
    color: '#fa8cbb',
    hp: 6800,
  },
  {
    name: '零界核心',
    en: 'NULL POINT',
    sector: 'EVENT HORIZON',
    boss: '零界主脑',
    bossEn: 'NULL SOVEREIGN',
    description: '进入事件视界，终结核心主脑。',
    color: '#f4bc72',
    hp: 9600,
  },
] as const;

export const WEAPONS: Record<
  WeaponId,
  {
    name: string;
    en: string;
    description: string;
    color: string;
    rgb: Color;
    rate: number;
    damage: number;
    bars: number[];
  }
> = {
  pulse: {
    name: '脉冲双炮',
    en: 'PULSE ARRAY',
    description: '高速双联火力，稳定覆盖正前方。',
    color: '#67e8f9',
    rgb: [0.25, 0.88, 1, 1],
    rate: 0.17,
    damage: 10,
    bars: [4, 5, 2],
  },
  spread: {
    name: '离子散射',
    en: 'ION SCATTER',
    description: '扇形弹幕，多线拦截蜂群与敌机。',
    color: '#e8a2ff',
    rgb: [0.85, 0.48, 1, 1],
    rate: 0.3,
    damage: 8,
    bars: [3, 3, 5],
  },
  lance: {
    name: '光矛穿刺',
    en: 'PHOTON LANCE',
    description: '高能穿甲弹，一次贯穿多个目标。',
    color: '#f4bc72',
    rgb: [1, 0.68, 0.3, 1],
    rate: 0.34,
    damage: 28,
    bars: [5, 2, 3],
  },
};
export const WEAPON_IDS: WeaponId[] = ['pulse', 'spread', 'lance'];
export const UPGRADES: Record<
  UpgradeId,
  { title: string; en: string; description: string; icon: string; color: string }
> = {
  overdrive: {
    title: '超频火控',
    en: 'OVERDRIVE',
    description: '武器等级 +1，所有武器伤害额外提高 15%。',
    icon: 'crosshair',
    color: '#67e8f9',
  },
  armor: {
    title: '复合装甲',
    en: 'REINFORCED HULL',
    description: '最大舰体 +25，立即修复 40 点舰体。',
    icon: 'shield',
    color: '#9ee8b7',
  },
  drone: {
    title: '僚机协议',
    en: 'WINGMAN',
    description: '部署一架自动攻击僚机，重复选择可增加僚机。',
    icon: 'ship',
    color: '#e8a2ff',
  },
};
export const PICKUPS: Record<
  PickupId,
  { name: string; letter: string; color: string; rgb: Color }
> = {
  power: { name: '火力升级', letter: 'P', color: '#f4bc72', rgb: [1, 0.7, 0.25, 1] },
  repair: { name: '舰体修复', letter: '+', color: '#9ee8b7', rgb: [0.4, 1, 0.64, 1] },
  shield: { name: '护盾充能', letter: 'S', color: '#67e8f9', rgb: [0.3, 0.86, 1, 1] },
  bomb: { name: '脉冲补充', letter: 'B', color: '#e8a2ff', rgb: [0.85, 0.5, 1, 1] },
};
export const GAME = {
  number: '07',
  name: '零界行动',
  en: 'STARFALL PROTOCOL',
  icon: 'ship',
  description: '最后一架战机。三道防线。穿过火线，抵达零界。',
  sector: 'SECTOR 07 / KEPLER BELT',
  kicker: 'ALL SYSTEMS ONLINE',
  headline: ['穿过火线。', '抵达零界。'],
  intro: '驾驶游隼战机，突破三重封锁。升级武器，迎战深空首领。',
  start: '开始行动',
  canvasLabel:
    '零界行动射击游戏。WASD 或方向键移动，自动开火，空格闪避，E 释放脉冲，Q 切换武器，P 暂停。支持鼠标拖动与触屏操作。',
} as const;
