import type { CSSProperties } from 'react';
import type { Difficulty } from '../core/types';
import type { Playground } from '../hooks/usePlayground';
import { PARTICLE_COUNTS } from '../hooks/usePlayground';
import { gameInfo } from '../games/catalog';
import { Icon } from './Icons';

export function ControlPanel({ lab, onNotes }: { lab: Playground; onNotes: () => void }) {
  const labels: Record<Difficulty, string> = { easy: '轻松', normal: '标准', hard: '挑战' };
  const gravity = lab.game === 'gravity';
  return (
    <aside className="control-panel" aria-label="实验控制台">
      <div className="panel-heading">
        <Icon name="chip" />
        <h2>实验控制台</h2>
        <span>⌘</span>
      </div>
      <section className="control-group">
        <div className="control-label">
          {gravity ? '自由探索' : '挑战难度'}
          <span>{gravity ? '无输赢' : labels[lab.difficulty]}</span>
        </div>
        <div className="segmented" role="group" aria-label="挑战难度">
          {(Object.keys(labels) as Difficulty[]).map((key) => (
            <button
              key={key}
              disabled={gravity}
              className={lab.difficulty === key ? 'active' : ''}
              aria-pressed={lab.difficulty === key}
              onClick={() => lab.changeDifficulty(key)}
            >
              {labels[key]}
            </button>
          ))}
        </div>
        <p className="control-note">
          {gravity
            ? '没有目标，只有引力与想象力。'
            : lab.difficulty === 'normal'
              ? '刚刚好的紧张感，准备好了吗？'
              : lab.difficulty === 'easy'
                ? '放慢节奏，从容地探索。'
                : '更快的节奏，考验你的反应。'}
        </p>
      </section>
      <section className="control-group">
        <label className="control-label" htmlFor="particles">
          粒子数量
          <span className="mono">{PARTICLE_COUNTS[lab.particles].toLocaleString('en-US')}</span>
        </label>
        <input
          type="range"
          id="particles"
          min="0"
          max="3"
          step="1"
          value={lab.particles}
          style={{ '--fill': `${(lab.particles / 3) * 100}%` } as CSSProperties}
          onChange={(e) => lab.changeParticles(Number(e.target.value))}
        />
        <div className="range-labels mono">
          <span>2K</span>
          <span>32K</span>
        </div>
        <label className="control-label glow-label" htmlFor="glow">
          辉光强度<span className="mono">{lab.glow}%</span>
        </label>
        <input
          type="range"
          id="glow"
          min="0"
          max="100"
          value={lab.glow}
          style={{ '--fill': `${lab.glow}%` } as CSSProperties}
          onChange={(e) => lab.changeGlow(Number(e.target.value))}
        />
        <div className="range-labels">
          <span>柔和</span>
          <span>耀眼</span>
        </div>
      </section>
      <section className="sound-row">
        <label htmlFor="sound">
          <Icon name="sound" />
          游戏音效
        </label>
        <button
          className="switch"
          id="sound"
          role="switch"
          aria-checked={lab.sound}
          aria-label="游戏音效"
          onClick={() => void lab.toggleSound()}
        >
          <span />
        </button>
      </section>
      <div className="record-card">
        <span>{gravity ? '每一个轨道，都是新的' : '个人最佳'}</span>
        <strong>
          {gravity ? '∞' : String(lab.best).padStart(4, '0')}
          <span>{gravity ? 'POSSIBILITIES' : 'PTS'}</span>
        </strong>
        <span className="record-decoration">↗</span>
      </div>
      <div className="under-hood">
        <span className="tiny-label">UNDER THE HOOD</span>
        <h3>不止是好看。</h3>
        <p>
          {lab.engine === 'canvas'
            ? '当前为 Canvas 2D 兼容预览，最多显示 2,048 颗 CPU 粒子。在支持 WebGPU 的浏览器中，可体验真正的 GPU 并行计算。'
            : gameInfo(lab.game).tech}
        </p>
        <button className="learn-link" onClick={onNotes}>
          看看它如何工作
          <Icon name="arrow" />
        </button>
      </div>
    </aside>
  );
}
