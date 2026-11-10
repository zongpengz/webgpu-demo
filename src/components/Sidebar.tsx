import type { CSSProperties } from 'react';
import type { Playground } from '../hooks/usePlayground';
import { STAGES } from '../games/catalog';
import { Icon } from './Icons';

export function Sidebar({ lab }: { lab: Playground }) {
  const active = ['running', 'paused', 'upgrade'].includes(lab.snapshot.phase);
  const selected = active ? lab.snapshot.stage : lab.selectedStage;
  return (
    <aside className="mission-sidebar">
      <div className="section-heading">
        <span>行动航线</span>
      </div>
      <div className="mission-route" aria-label="选择起始关卡">
        {STAGES.map((stage, i) => (
          <button
            key={stage.en}
            className={`mission-card ${selected === i ? 'selected' : ''} ${i > lab.progress ? 'locked' : ''}`}
            style={{ '--mission-color': stage.color } as CSSProperties}
            onClick={() => lab.selectStage(i)}
            disabled={active || i > lab.progress}
            aria-pressed={selected === i}
            title={stage.description}
          >
            <div className="mission-number">
              <span>0{i + 1}</span>
              <Icon name={i < lab.progress ? 'check' : i > lab.progress ? 'lock' : 'arrow'} />
            </div>
            <div className={`sector-art sector-art-${i}`} aria-hidden="true">
              <i />
              <b />
            </div>
            <h3>{stage.name}</h3>

            <div className="mission-meta">
              <span>
                {i < lab.progress ? '已突破' : i > lab.progress ? '等待解锁' : '准备部署'}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="campaign-progress">
        <div>
          <span>航线完成度</span>
          <span>{Math.min(3, lab.progress)} / 3</span>
        </div>
        <div className="progress-segments">
          {[0, 1, 2].map((i) => (
            <i key={i} className={i < lab.progress ? 'filled' : ''} />
          ))}
        </div>
      </div>
    </aside>
  );
}
