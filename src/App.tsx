import { useState } from 'react';
import { Icon, IconDefinitions } from './components/Icons';
import { Sidebar } from './components/Sidebar';
import { GameStage } from './components/GameStage';
import { ControlPanel } from './components/ControlPanel';
import { NotesDialog, type NoteId } from './components/NotesDialog';
import { gameInfo } from './games/catalog';
import { usePlayground } from './hooks/usePlayground';

export default function App() {
  const lab = usePlayground(),
    info = gameInfo(lab.game);
  const [notesOpen, setNotesOpen] = useState(false),
    [note, setNote] = useState<NoteId>('compute');
  function openNotes(id: NoteId = 'compute') {
    lab.pause();
    setNote(id);
    setNotesOpen(true);
  }
  return (
    <>
      <IconDefinitions />
      <header className="topbar">
        <a className="brand" href="./" aria-label="GPU Lab 首页">
          <span className="brand-icon">
            <Icon name="cube" />
          </span>
          <span>
            GPU<span className="brand-light">LAB</span>
            <span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="主导航">
          <button
            className="nav-item active"
            onClick={() => {
              setNotesOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Icon name="grid" />
            游戏实验室
          </button>
          <button className="nav-item" onClick={() => openNotes()}>
            <Icon name="book" />
            学习笔记
            <span className="new-dot" />
          </button>
        </nav>
        <div className="top-right">
          <span className="local-label">
            <span /> LOCAL PLAYGROUND
          </span>
          <button className="source-button" onClick={() => openNotes()}>
            <Icon name="code" />
            <span>探索源码</span>
            <span className="diagonal-arrow">↗</span>
          </button>
        </div>
      </header>
      <div className="app-shell">
        <Sidebar game={lab.game} engine={lab.engine} onSelect={lab.selectGame} />
        <main id="game-panel" role="tabpanel" aria-labelledby={`tab-${lab.game}`}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> SMALL GAMES. BIG POSSIBILITIES.
              </div>
              <h1>
                {info.name}
                <span className="title-en">{info.en}</span>
              </h1>
              <p className="page-description">{info.description}</p>
            </div>
            <span className="experiment-label mono">EXPERIMENT / 0{info.number}</span>
          </div>
          <div className="play-layout">
            <GameStage lab={lab} />
            <ControlPanel lab={lab} onNotes={() => openNotes()} />
          </div>
          <section className="learning-strip" aria-label="学习路径">
            <div className="learning-intro">
              <span className="tiny-label">PLAY. TWEAK. UNDERSTAND.</span>
              <h2>从好玩开始，理解 WebGPU。</h2>
            </div>
            {(
              [
                { id: 'compute', title: '并行的力量', en: 'Compute Shader' },
                { id: 'render', title: '一次绘制，一片星海', en: 'Instanced Rendering' },
                { id: 'game', title: '让画面活起来', en: 'The Game Loop' },
              ] as const
            ).map((n, i) => (
              <button key={n.id} onClick={() => openNotes(n.id)}>
                <span className="step-number">0{i + 1}</span>
                <span>
                  <strong>{n.title}</strong>
                  <small>{n.en}</small>
                </span>
                <span className="step-arrow">↗</span>
              </button>
            ))}
          </section>
          <footer className="main-footer">
            <span>用代码，创造一点不一样的东西。</span>
            <span className="mono">
              WEBGPU EXPLORATIONS <span>✳</span> VOL. 001
            </span>
          </footer>
        </main>
      </div>
      <NotesDialog open={notesOpen} initialTab={note} onClose={() => setNotesOpen(false)} />
    </>
  );
}
