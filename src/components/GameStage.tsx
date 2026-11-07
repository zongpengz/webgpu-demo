import type { Playground } from '../hooks/usePlayground';
import { GAME } from '../games/catalog';
import { Icon } from './Icons';

function formatTime(time: number) {
  return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
}

export function GameStage({ lab }: { lab: Playground }) {
  const s = lab.snapshot;
  const isReady = s.phase === 'ready',
    paused = s.phase === 'paused',
    finished = s.phase === 'over' || s.phase === 'won';
  const overlay = s.phase !== 'running';
  const title = paused
    ? ['稍作停留', '星海在等你。']
    : finished
      ? s.phase === 'won'
        ? ['任务完成', '漂亮的航行。']
        : ['旅程暂歇', '再来一次？']
      : GAME.headline;
  const description = paused
    ? '休息一下。准备好后，继续刚才的旅程。'
    : finished
      ? `${formatTime(s.time)} 的探索，获得 ${s.score} 分。${s.phase === 'won' ? '新的纪录，等你创造。' : '每一次出发，都会更接近星辰。'}`
      : GAME.intro;
  return (
    <section className="stage-section" aria-label="游戏画面">
      <div className="stage" id="stage" ref={lab.stageRef}>
        <canvas
          ref={lab.canvasRef}
          tabIndex={lab.engine === 'webgpu' ? 0 : -1}
          aria-label={GAME.canvasLabel}
        />
        <div className="stage-vignette" />
        <div className="stage-top">
          <span className="live-label">
            <span />
            <span>{GAME.sector}</span>
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
            <span>本次得分</span>
            <strong>{String(s.score).padStart(4, '0')}</strong>
          </div>
          <div className="hud-right">
            <span>飞行时间</span>
            <strong>
              {formatTime(s.time)}
              <span className="time-target"> / 01:00</span>
            </strong>
          </div>
        </div>
        <div className="scene-coordinate mono">
          X {String(Math.round(s.x)).padStart(4, '0')}
          <span className="coordinate-line" />Y {String(Math.round(s.y)).padStart(4, '0')}
        </div>
        {lab.engine === 'error' ? (
          <div
            className="start-overlay engine-error"
            role="alert"
            aria-labelledby="engine-error-title"
          >
            <div className="engine-error-content">
              <span className="overlay-kicker mono">WEBGPU REQUIRED</span>
              <h2 id="engine-error-title">WebGPU 暂不可用</h2>
              <p className="engine-error-reason">{lab.engineReason || '未能建立 WebGPU 连接。'}</p>
              <p className="engine-error-help">
                本游戏需要 WebGPU。请使用支持 WebGPU 的浏览器，在浏览器设置中启用 WebGPU
                和硬件加速， 并通过 HTTPS 或 localhost
                访问。若运行中连接中断或渲染失败，请刷新页面重试； 如仍失败，请检查浏览器、GPU
                驱动与上方诊断信息。
              </p>
              <button className="primary-button" onClick={() => window.location.reload()}>
                <Icon name="reset" />
                刷新页面重试
              </button>
            </div>
          </div>
        ) : (
          overlay && (
            <div className="start-overlay">
              <span className="overlay-kicker mono">
                {paused
                  ? 'TAKE YOUR TIME. THE STARS CAN WAIT.'
                  : finished
                    ? s.phase === 'won'
                      ? 'MISSION COMPLETE'
                      : 'EVERY END IS A NEW BEGINNING'
                    : GAME.kicker}
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
                disabled={lab.engine === 'loading'}
              >
                <Icon name={GAME.icon} />
                <span>
                  {lab.engine === 'loading'
                    ? '正在连接 GPU'
                    : paused
                      ? '继续探索'
                      : finished
                        ? '再次出发'
                        : GAME.start}
                </span>
                <span className="button-arrow">↗</span>
              </button>
              <span className="start-hint">
                {lab.engine === 'loading'
                  ? '需要支持 WebGPU 的浏览器'
                  : paused
                    ? '或按 P 继续'
                    : '或按 Enter 开始探索'}
              </span>
            </div>
          )
        )}
        <div className="stage-bottom">
          <div className="lives" aria-label={`剩余护盾 ${s.lives}`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i >= s.lives ? 'lost' : ''}>
                ◇
              </span>
            ))}
            <i>SHIELD</i>
          </div>
          <div className="boost-label">
            <span>{s.cooldown > 0 ? '推进器充能中' : '推进器就绪'}</span>
            <span className="boost-track">
              <i style={{ width: `${(1 - s.cooldown) * 100}%` }} />
            </span>
          </div>
        </div>
        <div className={`stage-toast ${lab.toast ? 'visible' : ''}`} role="status">
          {lab.toast}
        </div>
      </div>
      <div className="stage-toolbar">
        <div className="key-hints">
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
          <span className={`status-light ${lab.engine === 'error' ? 'error' : ''}`} />
          <span>
            {lab.engine === 'webgpu'
              ? 'WebGPU 实时渲染'
              : lab.engine === 'error'
                ? 'WebGPU 暂不可用'
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
    </section>
  );
}
