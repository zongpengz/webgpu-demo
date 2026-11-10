import { useRef, useState } from 'react';
import { Icon, IconDefinitions } from './components/Icons';
import { Sidebar } from './components/Sidebar';
import { GameStage } from './components/GameStage';
import { ControlPanel } from './components/ControlPanel';
import { CommandDialog } from './components/CommandDialog';
import { NotesDialog } from './components/NotesDialog';
import { usePlayground, PARTICLE_COUNTS } from './hooks/usePlayground';

type MenuSection = 'campaign' | 'loadout' | 'settings' | 'guide';
const MENU_SECTIONS: { id: MenuSection; label: string; icon: string }[] = [
  { id: 'campaign', label: '战役航线', icon: 'orbit' },
  { id: 'loadout', label: '战机整备', icon: 'ship' },
  { id: 'settings', label: '设置', icon: 'settings' },
  { id: 'guide', label: '飞行手册', icon: 'book' },
];

export default function App() {
  const lab = usePlayground();
  const [menu, setMenu] = useState<MenuSection | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const resumeAfterMenu = useRef(false);

  function openMenu() {
    // 只恢复由本次菜单触发的暂停，保留玩家原先的暂停状态。
    resumeAfterMenu.current = lab.snapshot.phase === 'running';
    lab.pause();
    setMenu('campaign');
  }
  function closeMenu() {
    setMenu(null);
    setNotesOpen(false);
    if (resumeAfterMenu.current && lab.snapshot.phase === 'paused') lab.togglePause();
    resumeAfterMenu.current = false;
    // 等原生 dialog 卸载并完成焦点归还后，再让画布接收快捷键。
    requestAnimationFrame(() => lab.canvasRef.current?.focus({ preventScroll: true }));
  }

  return (
    <>
      <IconDefinitions />
      <main className="flight-layout">
        <button
          className="flight-menu-button"
          onClick={openMenu}
          aria-label="打开游戏菜单"
          aria-haspopup="dialog"
        >
          <span className="menu-bars" aria-hidden="true">
            <i />
            <i />
          </span>
          <span>菜单</span>
        </button>
        <GameStage lab={lab} />
      </main>
      {menu && (
        <CommandDialog titleId="command-title" className="flight-dialog" onClose={closeMenu}>
          <div className="flight-dialog-header">
            <div>
              <span className="overline">STARFALL PROTOCOL</span>
              <h2 id="command-title">指挥终端</h2>
            </div>
            <button className="close-button" autoFocus onClick={closeMenu} aria-label="返回游戏">
              ×
            </button>
          </div>
          <nav className="flight-menu-tabs" aria-label="游戏菜单">
            {MENU_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setMenu(section.id)}
                aria-pressed={menu === section.id}
              >
                <Icon name={section.icon} />
                {section.label}
              </button>
            ))}
          </nav>
          <div className="flight-dialog-content">
            {menu === 'campaign' && <Sidebar lab={lab} />}
            {menu === 'loadout' && <ControlPanel lab={lab} />}
            {menu === 'settings' && (
              <div className="flight-settings">
                <div className="sound-setting">
                  <span>游戏音效</span>
                  <button
                    className="switch"
                    role="switch"
                    aria-label="游戏音效"
                    aria-checked={lab.sound}
                    onClick={() => void lab.toggleSound()}
                  >
                    <span />
                  </button>
                </div>
                <label htmlFor="particles">
                  星尘密度 <span>{PARTICLE_COUNTS[lab.particles].toLocaleString('en-US')}</span>
                </label>
                <input
                  id="particles"
                  type="range"
                  min="0"
                  max="3"
                  value={lab.particles}
                  onChange={(e) => lab.changeParticles(Number(e.target.value))}
                />
                <label htmlFor="glow">
                  光晕强度 <span>{lab.glow}%</span>
                </label>
                <input
                  id="glow"
                  type="range"
                  min="0"
                  max="100"
                  value={lab.glow}
                  onChange={(e) => lab.changeGlow(Number(e.target.value))}
                />
                <div className="settings-metrics">
                  <span>
                    帧率<strong>{lab.stats.fps || '—'} FPS</strong>
                  </span>
                  <span>
                    绘制调用<strong>{lab.stats.draws}</strong>
                  </span>
                  <span>
                    渲染器<strong>WebGPU</strong>
                  </span>
                </div>
                <button
                  className="engine-notes-link"
                  onClick={() => {
                    setMenu(null);
                    setNotesOpen(true);
                  }}
                >
                  <Icon name="code" />
                  引擎档案
                  <Icon name="arrow" />
                </button>
              </div>
            )}
            {menu === 'guide' && (
              <div className="flight-guide">
                <div className="guide-rows">
                  {[
                    ['WASD / ↑↓←→', '移动，也可使用鼠标或触屏'],
                    ['SPACE', '闪避冲刺，短暂无敌'],
                    ['E / B', '释放脉冲，清除敌方弹幕'],
                    ['Q', '切换双炮、散射与穿刺'],
                    ['F / J', '切换自动开火 / 按住手动开火'],
                    ['P / ESC', '暂停或继续'],
                    ['1 / 2 / 3', '选择关间强化'],
                    ['P / + / S / B', '补给标记 · 火力 / 修复 / 护盾 / 脉冲'],
                  ].map(([key, text]) => (
                    <div key={key}>
                      <kbd>{key}</kbd>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                <p className="guide-note">
                  突破三段航线，击败每关首领。护盾在脱离伤害 5
                  秒后恢复，靠近补给可自动吸附。激光预警出现后横向闪避。
                </p>
              </div>
            )}
          </div>
          <button className="primary-button return-to-flight" onClick={closeMenu}>
            返回战场
            <Icon name="arrow" />
          </button>
        </CommandDialog>
      )}
      <NotesDialog open={notesOpen} initialTab="compute" onClose={closeMenu} />
    </>
  );
}
