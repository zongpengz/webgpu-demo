import type { CSSProperties } from 'react';
import type { Difficulty } from '../core/types';
import type { Playground } from '../hooks/usePlayground';
import { WEAPONS, WEAPON_IDS } from '../games/catalog';
import { DIFFICULTIES } from '../games/combat';
import { Icon } from './Icons';
import { ShipPortrait } from './ShipPortrait';

export function ControlPanel({ lab }: { lab: Playground }) {
  const s = lab.snapshot,
    weapon = WEAPONS[s.weapon];
  const active = ['running', 'paused', 'upgrade'].includes(s.phase);
  return (
    <aside className="loadout-panel">
      <div className="section-heading">
        <span>战机整备</span>
      </div>
      <div className="ship-profile">
        <ShipPortrait />
        <div>
          <strong>游隼 · 改装型</strong>
        </div>
      </div>
      <div className="weapon-heading">
        <span>
          主武器 <small className="weapon-level">MK.{s.weaponLevel}</small>
        </span>
        <kbd>Q</kbd>
      </div>
      <div className="weapon-list" role="group" aria-label="选择武器">
        {WEAPON_IDS.map((id, i) => (
          <button
            key={id}
            className={`weapon-button ${s.weapon === id ? 'selected' : ''}`}
            style={{ '--weapon-color': WEAPONS[id].color } as CSSProperties}
            onClick={() => lab.setWeapon(id)}
            aria-pressed={s.weapon === id}
            title={WEAPONS[id].description}
          >
            <span className={`weapon-glyph weapon-${id}`}>
              <i />
              <i />
              <i />
            </span>
            <span>
              <strong>{WEAPONS[id].name}</strong>
            </span>
            <span className="weapon-index">0{i + 1}</span>
          </button>
        ))}
      </div>
      <div className="weapon-details">
        {['火力', '射速', '覆盖'].map((label, i) => (
          <div className="weapon-stat" key={label}>
            <span>{label}</span>
            <div>
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} style={{ background: n <= weapon.bars[i] ? weapon.color : undefined }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="auto-fire-row">
        <span>
          <Icon name="crosshair" /> 自动开火 <kbd>F</kbd>
        </span>
        <button
          className="switch"
          role="switch"
          aria-label="自动开火"
          aria-checked={s.autoFire}
          onClick={lab.toggleAutoFire}
        >
          <span />
        </button>
      </div>
      <div className="difficulty-group">
        <span>交战强度</span>
        <div className="segmented" role="group" aria-label="交战难度">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((id) => (
            <button
              key={id}
              className={lab.difficulty === id ? 'active' : ''}
              aria-pressed={lab.difficulty === id}
              disabled={active}
              onClick={() => lab.changeDifficulty(id)}
            >
              {DIFFICULTIES[id].name}
            </button>
          ))}
        </div>
      </div>
      <div className="best-record">
        <Icon name="trophy" />
        <div>
          <span>历史最佳</span>
          <strong>
            {lab.best.toLocaleString('en-US')}
            <small>PTS</small>
          </strong>
        </div>
        <span className="record-mark">↗</span>
      </div>
    </aside>
  );
}
