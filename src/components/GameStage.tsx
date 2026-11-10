import type { CSSProperties } from 'react';
import type { Playground } from '../hooks/usePlayground';
import type { UpgradeId } from '../core/types';
import { GAME, STAGES, UPGRADES } from '../games/catalog';
import { Icon } from './Icons';

function clock(time: number) {
  return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
}

export function GameStage({ lab }: { lab: Playground }) {
  const s = lab.snapshot,
    stage = STAGES[s.stage],
    ready = s.phase === 'ready';
  const running = s.phase === 'running',
    paused = s.phase === 'paused';
  const finished = s.phase === 'over' || s.phase === 'won';
  const enabled = lab.engine === 'webgpu';
  return (
    <section className="arena-shell" aria-label="作战画面">
      <div className="arena-header">
        <span>
          <i className="status-light" />
          {stage.name}
          <b>/</b>0{s.stage + 1}
        </span>
        <div>
          {[1, 2, 3].map((w) => (
            <i className={w <= s.wave ? 'filled' : ''} key={w} />
          ))}
          <span>{s.bossMaxHealth > 0 ? '首领交战' : `攻势 ${s.wave} / 3`}</span>
          <button
            className="icon-button"
            onClick={lab.togglePause}
            disabled={!enabled || ready || finished || s.phase === 'upgrade'}
            aria-label={paused ? '继续游戏' : '暂停游戏'}
          >
            <Icon name="pause" />
          </button>
          <button
            className="icon-button"
            onClick={() => void lab.fullscreen()}
            aria-label="全屏游戏"
          >
            <Icon name="expand" />
          </button>
        </div>
      </div>
      <div
        className={`stage ${ready ? 'standby' : ''} ${s.health < 30 && running ? 'critical' : ''}`}
        ref={lab.stageRef}
      >
        <canvas ref={lab.canvasRef} tabIndex={0} aria-label={GAME.canvasLabel} />
        <div className="stage-vignette" />
        {!ready && (
          <div className="battle-hud">
            <div className="score-display">
              <span>得分</span>
              <strong>{String(s.score).padStart(7, '0')}</strong>
              {s.combo >= 3 && (
                <em>
                  {s.combo} CHAIN{' '}
                  <span>×{Math.min(4, 1 + Math.floor(s.combo / 8) * 0.5).toFixed(1)}</span>
                </em>
              )}
            </div>
            <div className="flight-clock">
              <span>航行时间</span>
              <strong>{clock(s.time)}</strong>
            </div>
          </div>
        )}
        {s.bossMaxHealth > 0 && (
          <div className="boss-hud">
            <div>
              <span>
                <Icon name="warning" /> {stage.boss}
              </span>
              <span>阶段 {s.bossPhase}</span>
            </div>
            <div className="boss-health">
              <i style={{ width: `${(s.bossHealth / s.bossMaxHealth) * 100}%` }} />
              <b />
              <b />
            </div>
          </div>
        )}
        {s.bossMaxHealth > 0 && s.bossArrival < 2.5 && running && (
          <div className="boss-warning">
            <Icon name="warning" />
            <strong>WARNING</strong>
            <span>首领来袭</span>
          </div>
        )}
        {running && s.announcementTime > 0 && !(s.bossArrival < 2.5 && s.bossMaxHealth > 0) && (
          <div className="battle-announcement" key={s.announcement}>
            <span /> {s.announcement} <span />
          </div>
        )}
        {lab.engine === 'error' ? (
          <div className="engine-error" role="alert">
            <Icon name="warning" />
            <span className="overline">CONNECTION OFFLINE</span>
            <h2>WebGPU 连接未就绪</h2>
            <p>{lab.engineReason}</p>
            <p>请在支持的浏览器中启用 WebGPU 和硬件加速，通过 localhost 或 HTTPS 访问。</p>
            <button className="primary-button" onClick={() => location.reload()}>
              刷新页面重试 <Icon name="arrow" />
            </button>
          </div>
        ) : (
          <>
            {(ready || lab.engine === 'loading') && (
              <div className="deployment-overlay">
                <div className="deployment-copy">
                  <span className="deployment-tag">
                    <i /> 0{s.stage + 1} / {stage.name}
                  </span>
                  <h2>
                    穿过火线。
                    <br />
                    <span>抵达零界。</span>
                  </h2>
                  <button className="primary-button" disabled={!enabled} onClick={lab.start}>
                    <Icon name="ship" />
                    {enabled ? '开始行动' : '正在连接 GPU'}
                    <Icon name="arrow" />
                  </button>
                  <span className="enter-hint">
                    <kbd>ENTER</kbd> 出击
                  </span>
                </div>
                <div className="deployment-annotation">
                  <span>F–07</span>
                  <span>PEREGRINE</span>
                </div>
              </div>
            )}
            {paused && (
              <div className="modal-overlay">
                <div className="pause-card">
                  <span className="overline">TRANSMISSION ON HOLD</span>
                  <h2>行动已暂停</h2>

                  <button className="primary-button" onClick={lab.togglePause}>
                    继续行动 <Icon name="arrow" />
                  </button>
                  <span className="enter-hint">
                    <kbd>P</kbd> 继续飞行
                  </span>
                </div>
              </div>
            )}
            {s.phase === 'upgrade' && (
              <div className="modal-overlay upgrade-overlay">
                <div className="upgrade-heading">
                  <span className="overline">SECTOR SECURED / 0{s.stage + 1}</span>
                  <h2>防线已突破。</h2>
                  <p>选择强化 · 前往{STAGES[s.stage + 1]?.name}</p>
                </div>
                <div className="upgrade-options">
                  {(['overdrive', 'armor', 'drone'] as UpgradeId[]).map((id, i) => (
                    <button
                      key={id}
                      onClick={() => lab.chooseUpgrade(id)}
                      style={{ '--upgrade-color': UPGRADES[id].color } as CSSProperties}
                    >
                      <kbd>{i + 1}</kbd>
                      <Icon name={UPGRADES[id].icon} />

                      <h3>{UPGRADES[id].title}</h3>
                      <p>{UPGRADES[id].description}</p>
                      <span>
                        装配并继续 <Icon name="arrow" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {finished && (
              <div className="modal-overlay">
                <div className={`result-card ${s.phase === 'won' ? 'victory' : ''}`}>
                  <span className="overline">
                    {s.phase === 'won' ? 'MISSION ACCOMPLISHED' : 'SIGNAL LOST / PILOT RECOVERY'}
                  </span>
                  <h2>{s.phase === 'won' ? '零界，已抵达。' : '信号丢失。'}</h2>
                  <div className="result-score">
                    {s.score.toLocaleString('en-US')}
                    <small>PTS</small>
                  </div>
                  <div className="result-stats">
                    <span>
                      击毁<strong>{s.kills}</strong>
                    </span>
                    <span>
                      最高连击<strong>{s.maxCombo}</strong>
                    </span>
                    <span>
                      累计伤害<strong>{Math.round(s.damageDealt).toLocaleString('en-US')}</strong>
                    </span>
                    <span>
                      飞行时间<strong>{clock(s.time)}</strong>
                    </span>
                  </div>
                  <button className="primary-button" onClick={lab.reset}>
                    <Icon name="reset" />
                    重新部署
                    <Icon name="arrow" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {!ready && lab.engine !== 'error' && (
          <div className="player-hud">
            <div className="vitals">
              <div>
                <Icon name="ship" />
                <span>舰体</span>
                <b>
                  {Math.ceil(s.health)}
                  <small>/{s.maxHealth}</small>
                </b>
              </div>
              <div className="hull-track">
                <i style={{ width: `${(s.health / s.maxHealth) * 100}%` }} />
              </div>
              <div className="shield-track">
                <i style={{ width: `${(s.shield / s.maxShield) * 100}%` }} />
              </div>
              <span className="shield-caption">
                护盾 {Math.ceil(s.shield)} / {s.maxShield}
              </span>
            </div>
            <div className="combat-abilities">
              <button
                onClick={lab.dash}
                disabled={!running || s.cooldown > 0}
                aria-label="闪避冲刺"
              >
                <Icon name="bolt" />
                <span>
                  {s.cooldown > 0 ? `${(s.cooldown * 3).toFixed(1)}s` : '闪避'}
                  <kbd>SPACE</kbd>
                </span>
                <i style={{ transform: `scaleX(${1 - s.cooldown})` }} />
              </button>
              <button
                onClick={lab.bomb}
                disabled={!running || s.bombs === 0}
                aria-label="释放裂变脉冲"
              >
                <Icon name="orbit" />
                <span>
                  裂变脉冲 <b>×{s.bombs}</b>
                  <kbd>E</kbd>
                </span>
              </button>
            </div>
          </div>
        )}
        <div className={`stage-toast ${lab.toast ? 'visible' : ''}`} role="status">
          {lab.toast}
        </div>
      </div>
      <div className={`arena-footer ${ready ? '' : 'in-flight'}`}>
        <div className="key-hints">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> 移动
          </span>
          <span>
            <kbd>SPACE</kbd> 闪避
          </span>
          <span>
            <kbd>E</kbd> 脉冲
          </span>
          <span>
            <kbd>Q</kbd> 切枪
          </span>
          <span>
            <kbd>P</kbd> 暂停
          </span>
        </div>
        <button className="text-button" onClick={lab.reset} disabled={!enabled}>
          <Icon name="reset" />
          重新部署
        </button>
      </div>
      <div className="arena-telemetry">
        <span>
          <i className={`status-light ${lab.engine === 'error' ? 'offline' : ''}`} />
          {enabled ? 'WebGPU 实时渲染' : lab.engine === 'error' ? '引擎离线' : '正在连接 GPU'}
        </span>
        <div>
          <span>
            <b>{lab.stats.fps || '—'}</b> FPS
          </span>
        </div>
      </div>
    </section>
  );
}
