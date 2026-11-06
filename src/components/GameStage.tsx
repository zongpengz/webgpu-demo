import type { Playground } from '../hooks/usePlayground';
import { gameInfo } from '../games/catalog';
import { Icon } from './Icons';

function formatTime(time: number) {
  return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
}

export function GameStage({ lab }: { lab: Playground }) {
  const info = gameInfo(lab.game),
    s = lab.snapshot;
  const isReady = s.phase === 'ready',
    paused = s.phase === 'paused',
    finished = s.phase === 'over' || s.phase === 'won';
  const overlay = s.phase !== 'running';
  const gravity = lab.game === 'gravity',
    breakout = lab.game === 'breakout';
  const title = paused
    ? ['稍作停留', '星海在等你。']
    : finished
      ? s.phase === 'won'
        ? ['任务完成', '漂亮的航行。']
        : ['旅程暂歇', '再来一次？']
      : info.headline;
  const description = paused
    ? '休息一下。准备好后，继续刚才的旅程。'
    : finished
      ? `${formatTime(s.time)} 的探索，获得 ${s.score} 分。${s.phase === 'won' ? '新的纪录，等你创造。' : '每一次出发，都会更接近星辰。'}`
      : info.intro;
  return (
    <section className="stage-section" aria-label="游戏画面">
      <div className="stage" id="stage" ref={lab.stageRef}>
        <canvas
          ref={lab.canvasRef}
          tabIndex={lab.engine === 'canvas' ? -1 : 0}
          aria-label={info.canvasLabel}
          style={{ visibility: lab.engine === 'canvas' ? 'hidden' : 'visible' }}
        />
        <canvas
          ref={lab.fallbackRef}
          tabIndex={lab.engine === 'canvas' ? 0 : -1}
          aria-label={`${info.canvasLabel} 当前为 Canvas 2D 兼容预览。`}
          style={{ visibility: lab.engine === 'canvas' ? 'visible' : 'hidden' }}
        />
        <div className="stage-vignette" />
        <div className="stage-top">
          <span className="live-label">
            <span />
            <span>{info.sector}</span>
          </span>
          <div className="stage-actions">
            <button
              className="icon-button"
              onClick={lab.togglePause}
              disabled={isReady || finished || lab.engine === 'loading' || lab.engine === 'error'}
              aria-label={paused ? '继续游戏' : '暂停游戏'}
              title="暂停 / 继续 (P)"
            >
              <Icon name="pause" />
            </button>
            <button
              className="icon-button"
              onClick={() => void lab.fullscreen()}
              aria-label="全屏游戏"
              title="全屏"
            >
              <Icon name="expand" />
            </button>
          </div>
        </div>
        <div className="game-hud">
          <div>
            <span>{gravity ? '活跃粒子' : '本次得分'}</span>
            <strong>
              {gravity
                ? lab.stats.particles.toLocaleString('en-US')
                : String(s.score).padStart(4, '0')}
            </strong>
          </div>
          <div className="hud-right">
            <span>{gravity ? '探索时间' : breakout ? '剩余砖块' : '飞行时间'}</span>
            <strong>
              {breakout ? `${String(s.remaining).padStart(2, '0')}` : formatTime(s.time)}
              {lab.game === 'meteor' && <span className="time-target"> / 01:00</span>}
              {breakout && <span className="time-target"> / 50</span>}
            </strong>
          </div>
        </div>
        <div className="scene-coordinate mono">
          X {String(Math.round(s.x)).padStart(4, '0')}
          <span className="coordinate-line" />Y {String(Math.round(s.y)).padStart(4, '0')}
        </div>
        {overlay && (
          <div className="start-overlay">
            <span className="overlay-kicker mono">
              {paused
                ? 'TAKE YOUR TIME. THE STARS CAN WAIT.'
                : finished
                  ? s.phase === 'won'
                    ? 'MISSION COMPLETE'
                    : 'EVERY END IS A NEW BEGINNING'
                  : info.kicker}
            </span>
            <h2>
              {title[0]}
              <br />
              <span>{title[1]}</span>
            </h2>
            <p>{description}</p>
            <button
              className="primary-button"
              onClick={paused ? lab.togglePause : lab.start}
              disabled={lab.engine === 'loading' || lab.engine === 'error'}
            >
              <Icon name={info.icon} />
              <span>
                {lab.engine === 'loading'
                  ? '正在连接 GPU'
                  : lab.engine === 'error'
                    ? '渲染器不可用'
                    : paused
                      ? '继续探索'
                      : finished
                        ? '再次出发'
                        : info.start}
              </span>
              <span className="button-arrow">↗</span>
            </button>
            <span className="start-hint">
              {lab.engine === 'error'
                ? lab.engineReason
                : paused
                  ? '或按 P 继续'
                  : '或按 Enter 开始探索'}
            </span>
          </div>
        )}
        <div className="stage-bottom">
          <div
            className="lives"
            aria-label={gravity ? '自由探索模式' : `剩余${breakout ? '光球' : '护盾'} ${s.lives}`}
          >
            {gravity ? (
              <>
                <span>∞</span>
                <i>FREE EXPLORATION</i>
              </>
            ) : (
              <>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i >= s.lives ? 'lost' : ''}>
                    ◇
                  </span>
                ))}
                <i>{breakout ? 'LIVES' : 'SHIELD'}</i>
              </>
            )}
          </div>
          <div className="boost-label">
            <span>
              {gravity
                ? '按住画面 · 创造引力'
                : breakout
                  ? '反弹角度由击球位置决定'
                  : s.cooldown > 0
                    ? '推进器充能中'
                    : '推进器就绪'}
            </span>
            {!gravity && !breakout && (
              <span className="boost-track">
                <i style={{ width: `${(1 - s.cooldown) * 100}%` }} />
              </span>
            )}
          </div>
        </div>
        <div className={`stage-toast ${lab.toast ? 'visible' : ''}`} role="status">
          {lab.toast}
        </div>
      </div>
      <div className="stage-toolbar">
        <div className="key-hints">
          {gravity ? (
            <>
              <span>
                <kbd>DRAG</kbd>
                <i>吸引粒子</i>
              </span>
              <span>
                <kbd>R</kbd>
                <i>重置</i>
              </span>
            </>
          ) : breakout ? (
            <>
              <span>
                <kbd>A</kbd>
                <kbd>D</kbd>
                <i>移动</i>
              </span>
              <span>
                <kbd>SPACE</kbd>
                <i>发球</i>
              </span>
            </>
          ) : (
            <>
              <span>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd>
                <i>移动</i>
              </span>
              <span>
                <kbd>SPACE</kbd>
                <i>冲刺</i>
              </span>
            </>
          )}
          <span>
            <kbd>P</kbd>
            <i>暂停</i>
          </span>
        </div>
        <button
          className="text-button"
          onClick={lab.reset}
          disabled={lab.engine === 'loading' || lab.engine === 'error'}
        >
          <Icon name="reset" />
          重新开始
        </button>
      </div>
      <div className="telemetry">
        <div title={lab.engineReason || 'Compute + instanced rendering'}>
          <span
            className={`status-light ${lab.engine === 'canvas' || lab.engine === 'error' ? 'fallback' : ''}`}
          />
          <span>
            {lab.engine === 'webgpu'
              ? 'WebGPU 实时渲染'
              : lab.engine === 'canvas'
                ? 'Canvas 2D 兼容预览'
                : lab.engine === 'error'
                  ? '渲染器初始化失败'
                  : '正在初始化 WebGPU'}
          </span>
        </div>
        <div className="telemetry-values mono">
          <span>
            <b>{lab.stats.fps || '--'}</b> FPS
          </span>
          <span>
            <b>{lab.stats.particles.toLocaleString('en-US')}</b> PARTICLES
          </span>
          <span>
            <b>{lab.engine === 'webgpu' ? lab.stats.draws || '--' : '—'}</b> DRAW CALLS
          </span>
        </div>
      </div>
      {lab.engine === 'canvas' && (
        <p className="compatibility-note">
          兼容模式 · {lab.engineReason.split('\n')[0].slice(0, 160)}。实际显示 2,048 颗 CPU 粒子。
        </p>
      )}
    </section>
  );
}
