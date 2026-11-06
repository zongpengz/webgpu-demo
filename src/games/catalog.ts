import type { GameId } from '../core/types';

export interface GameInfo {
  id: GameId;
  number: string;
  name: string;
  en: string;
  icon: string;
  color: string;
  summary: string;
  tags: string[];
  description: string;
  sector: string;
  kicker: string;
  headline: [string, string];
  intro: string;
  start: string;
  canvasLabel: string;
  tech: string;
}
export const GAMES: GameInfo[] = [
  {
    id: 'meteor',
    number: '01',
    name: '星际闪避',
    en: 'STAR DRIFT',
    icon: 'ship',
    color: 'purple',
    summary: '驾驶飞船，穿越陨石带',
    tags: ['小游戏', '实例化渲染'],
    description: '驶入未知星域。在流动的星尘中，找到属于你的航线。',
    sector: 'SECTOR 07 / 星尘带',
    kicker: 'YOUR NEXT ADVENTURE AWAITS',
    headline: ['在星尘之间', '保持航向。'],
    intro: '躲开陨石，收集能量，完成 60 秒的星际航行。',
    start: '开始飞行',
    canvasLabel: '星际闪避。方向键或 WASD 移动，空格冲刺，P 暂停。也可用鼠标或触屏移动飞船。',
    tech: '每一颗星尘都在 GPU 上独立计算，再用一次绘制调用，把整片星空带到你面前。',
  },
  {
    id: 'breakout',
    number: '02',
    name: '霓虹打砖块',
    en: 'NEON BREAKER',
    icon: 'grid',
    color: 'green',
    summary: '经典玩法，新的光芒',
    tags: ['小游戏', '碰撞检测'],
    description: '一次反弹，一束新光。用最熟悉的玩法，点亮整片霓虹。',
    sector: 'ARENA 02 / 霓虹矩阵',
    kicker: 'A CLASSIC. IN A NEW LIGHT.',
    headline: ['打破边界', '点亮霓虹。'],
    intro: '移动挡板接住光球，击碎全部 50 块霓虹砖。',
    start: '进入竞技场',
    canvasLabel: '霓虹打砖块。A D 或左右方向键移动，空格或点击画面发球，P 暂停。也支持鼠标与触屏。',
    tech: '光球的每次反弹由固定步长的物理更新决定。砖块、拖尾与爆裂火花，共享同一条 GPU 实例渲染管线。',
  },
  {
    id: 'gravity',
    number: '03',
    name: '粒子引力场',
    en: 'GRAVITY FIELD',
    icon: 'orbit',
    color: 'orange',
    summary: '让数万颗粒子为你起舞',
    tags: ['交互实验', '计算着色器'],
    description: '引力是你的画笔。轻轻一触，重新排列这片微小的宇宙。',
    sector: 'FIELD 03 / 引力实验',
    kicker: 'A LITTLE CHAOS. A LOT OF BEAUTY.',
    headline: ['创造引力', '让星海流动。'],
    intro: '按住鼠标或触摸画面，吸引粒子，画出属于你的星轨。',
    start: '进入引力场',
    canvasLabel: '粒子引力场。按住鼠标或触摸画面吸引粒子，P 暂停，R 重置粒子。',
    tech: '位置和速度留在显存中。每个 Compute Shader 调用负责一颗粒子，引力计算结束后直接渲染，无需回传 CPU。',
  },
];
export const gameInfo = (id: GameId) => GAMES.find((game) => game.id === id)!;
