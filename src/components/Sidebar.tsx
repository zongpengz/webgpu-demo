import { GAME } from '../games/catalog';
import type { Playground } from '../hooks/usePlayground';
import { Icon } from './Icons';

export function Sidebar({ engine }: { engine: Playground['engine'] }) {
  return (
    <aside className="sidebar" aria-label="游戏介绍">
      <div className="sidebar-heading">
        <span>本次实验</span>
        <span className="mono">{GAME.number}</span>
      </div>
      <section className="game-card" aria-labelledby="sidebar-game-title">
        <div className="card-top">
          <span className="game-icon purple">
            <Icon name={GAME.icon} />
          </span>
          <span className="card-number">{GAME.number}</span>
        </div>
        <strong id="sidebar-game-title">{GAME.name}</strong>
        <span className="card-desc">{GAME.summary}</span>
        <span className="card-tags">
          {GAME.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </span>
      </section>
      <div className="sidebar-bottom">
        <div className="engine-mini">
          <span className={`status-light ${engine === 'error' ? 'error' : ''}`} />
          <span>
            {engine === 'webgpu'
              ? 'WebGPU 引擎已连接'
              : engine === 'error'
                ? 'WebGPU 暂不可用'
                : '正在连接 GPU'}
          </span>
          <Icon name="chip" />
        </div>
        <p>
          一点好奇心，无限种可能。
          <br />
          在浏览器里，玩转你的 GPU。
        </p>
        <div className="sidebar-foot mono">
          BUILT FOR THE CURIOUS <span>✳</span>
        </div>
      </div>
    </aside>
  );
}
