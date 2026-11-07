import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Phase } from '../core/types';
import type { Playground } from '../hooks/usePlayground';
import { MeteorGame } from '../games/meteor';
import { GameStage } from './GameStage';

function stage(engine: Playground['engine'], phase: Phase = 'ready') {
  const lab = {
    engine,
    engineReason: 'WebGPU diagnostic: GPU unavailable',
    snapshot: { ...new MeteorGame().snapshot(), phase },
    stats: { fps: 0, particles: 0, draws: 0 },
    canvasRef: { current: null },
    stageRef: { current: null },
    toast: '',
    start: vi.fn(),
    togglePause: vi.fn(),
    fullscreen: vi.fn(),
    reset: vi.fn(),
  } as unknown as Playground;
  return renderToStaticMarkup(<GameStage lab={lab} />);
}

describe('WebGPU stage', () => {
  it.each<Phase>(['ready', 'running', 'paused', 'over', 'won'])(
    'shows actionable errors ahead of the %s game screen',
    (phase) => {
      const html = stage('error', phase);
      expect(html).toContain('role="alert"');
      expect(html).toContain('WebGPU diagnostic: GPU unavailable');
      expect(html).toContain('启用 WebGPU');
      expect(html).toContain('刷新页面重试');
      expect(html).not.toContain('再次出发');
      expect(html).not.toContain('继续探索');
      expect(html.match(/<canvas\b/g)).toHaveLength(1);
    },
  );

  it('disables starting until WebGPU is initialized', () => {
    expect(stage('loading')).toMatch(/<button class="primary-button" disabled=""/);
    expect(stage('webgpu')).toContain('开始飞行');
    expect(stage('webgpu')).not.toContain('role="alert"');
    expect(stage('webgpu')).not.toMatch(/<button class="primary-button" disabled=""/);
  });
});
