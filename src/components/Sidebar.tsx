import { GAMES } from '../games/catalog';
import type { GameId } from '../core/types';
import { Icon } from './Icons';

interface Props {
  game: GameId;
  engine: string;
  onSelect: (id: GameId) => void;
}
export function Sidebar({ game, engine, onSelect }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-heading">
        <span>选择你的实验</span>
        <span className="mono">03</span>
      </div>
      <div
        className="game-list"
        role="tablist"
        aria-label="实验项目"
        onKeyDown={(e) => {
          const i = GAMES.findIndex((g) => g.id === game);
          const next =
            e.key === 'ArrowDown' || e.key === 'ArrowRight'
              ? (i + 1) % GAMES.length
              : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
                ? (i + GAMES.length - 1) % GAMES.length
                : e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? GAMES.length - 1
                    : -1;
          if (next !== -1) {
            e.preventDefault();
            onSelect(GAMES[next].id);
            document.getElementById(`tab-${GAMES[next].id}`)?.focus();
          }
        }}
      >
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={`game-card ${game === g.id ? 'selected' : ''}`}
            role="tab"
            aria-selected={game === g.id}
            id={`tab-${g.id}`}
            aria-controls="game-panel"
            tabIndex={game === g.id ? 0 : -1}
            onClick={() => onSelect(g.id)}
          >
            <div className="card-top">
              <span className={`game-icon ${g.color}`}>
                <Icon name={g.icon} />
              </span>
              <span className="card-number">{g.number}</span>
            </div>
            <strong>
              {g.name}
              <span>↗</span>
            </strong>
            <span className="card-desc">{g.summary}</span>
            <span className="card-tags">
              {g.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </span>
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        <div className="engine-mini">
          <span
            className={`status-light ${engine === 'canvas' || engine === 'error' ? 'fallback' : ''}`}
          />
          <span>
            {engine === 'webgpu'
              ? 'WebGPU 引擎已连接'
              : engine === 'canvas'
                ? 'Canvas 兼容预览'
                : engine === 'error'
                  ? '渲染器初始化失败'
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
