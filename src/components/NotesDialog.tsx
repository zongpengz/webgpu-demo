import { useEffect, useRef, useState } from 'react';

export type NoteId = 'compute' | 'render' | 'game';
const NOTES = {
  compute: {
    title: '让 32,768 颗星尘并行运动。',
    paragraphs: [
      '战斗渲染使用一个 48 字节的 Uniform Buffer，包含画布大小、时间、星尘密度、关卡色调、受击震动与闪光。粒子保存在 Storage Buffer 中，每个 GPU 调用更新自己负责的粒子。',
      '每个工作组有 64 个调用。16,384 颗星尘会分成 256 组，向下漂移并在越界后循环。这些装饰粒子不参与碰撞与计分；修改粒子数量，观察 FPS 与星空密度的变化。',
    ],
    code: '// src/shaders.ts → computeShader（节选）\n@compute @workgroup_size(64)\nfn main(@builtin(global_invocation_id) id: vec3u) {\n  if (id.x >= u32(g.count)) { return; }\n  var p = particles[id.x];\n  p.position.y += (12. + p.seed * 70.) * g.dt * g.speed;\n  if (p.position.y > g.world.y + 5.) {\n    p.position.y = -5.;\n  }\n  particles[id.x] = p;\n}',
    files: 'src/shaders.ts · src/engine/renderer.ts',
    challenge: '尝试修改 computeShader 中星尘下落速度的系数 70，观察航行氛围的变化。',
  },
  render: {
    title: '一张小四边形，绘制一整片星海。',
    paragraphs: [
      '粒子复用相同的 6 个顶点，顶点着色器通过 instance_index 从显存读取每颗粒子的位置。一条 draw(6, count) 就能绘制上万颗粒子。',
      '战机、敌机、首领、弹道与火花被打包成精灵实例，位置由 CPU 游戏规则决定。片元着色器通过 SDF 距离函数计算机体轮廓、金属面板与光晕。星尘采用加法混合，机体采用透明度混合，保留深色装甲的层次。',
    ],
    code: '// src/engine/renderer.ts → render()\nconst compute = encoder.beginComputePass();\ncompute.dispatchWorkgroups(Math.ceil(count / 64));\ncompute.end();\n\nconst pass = encoder.beginRenderPass(descriptor);\npass.setPipeline(particlePipeline);\npass.draw(6, count); // 共享顶点，不共享位置\npass.end();',
    files: 'src/engine/renderer.ts · src/shaders.ts',
    challenge: '尝试修改 spriteShader 中 wingDistance 的八个顶点，为游隼设计新的后掠翼。',
  },
  game: {
    title: '让物理稳定，让界面从容更新。',
    paragraphs: [
      'requestAnimationFrame 驱动渲染。游戏物理以 1/120 秒固定步长更新，碰撞与得分留在 CPU，粒子模拟交给 GPU。切换标签页、失去焦点或打开学习笔记时会自动暂停。',
      'React 以约 10 Hz 接收游戏快照。MeteorGame 管理三波攻势、首领阶段、弹道碰撞、补给与关间强化，输出精灵和游戏事件。战役进度和最佳分数保存在本地存储中。',
    ],
    code: '// src/hooks/usePlayground.ts\nconst STEP = 1 / 120;\naccumulator += Math.min(elapsed, 0.05);\nwhile (accumulator >= STEP) {\n  simulation.update(STEP, input);\n  accumulator -= STEP;\n}\nrenderer.render(frame, simulation.getSprites(time));',
    files: 'src/core/types.ts · src/games/meteor.ts · src/hooks/usePlayground.ts',
    challenge: '尝试修改 combat.ts 的波次时长和 catalog.ts 的首领耐久，为新的交战节奏补充测试。',
  },
};
export function NotesDialog({
  open,
  initialTab,
  onClose,
}: {
  open: boolean;
  initialTab: NoteId;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [tab, setTab] = useState(initialTab);
  useEffect(() => {
    if (open) {
      setTab(initialTab);
      ref.current?.showModal();
    } else if (ref.current?.open) ref.current.close();
  }, [open, initialTab]);
  const note = NOTES[tab],
    tabs: NoteId[] = ['compute', 'render', 'game'];
  return (
    <dialog
      ref={ref}
      aria-labelledby="notes-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-header">
        <span className="eyebrow">THE LAB NOTEBOOK</span>
        <button className="close-button" onClick={onClose} aria-label="关闭学习笔记">
          ×
        </button>
      </div>
      <h2 id="notes-title">从一颗粒子，到一片星海。</h2>
      <p className="dialog-subtitle">从着色器、显存布局到游戏循环，理解每一帧如何生成。</p>
      <div
        className="note-tabs"
        role="tablist"
        aria-label="学习主题"
        onKeyDown={(e) => {
          const index = tabs.indexOf(tab);
          const i =
            e.key === 'ArrowRight' ? (index + 1) % 3 : e.key === 'ArrowLeft' ? (index + 2) % 3 : -1;
          if (i !== -1) {
            e.preventDefault();
            setTab(tabs[i]);
            document.getElementById(`note-tab-${tabs[i]}`)?.focus();
          }
        }}
      >
        {tabs.map((id, i) => (
          <button
            key={id}
            role="tab"
            id={`note-tab-${id}`}
            aria-controls="note-content"
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className={tab === id ? 'active' : ''}
          >
            0{i + 1} · {['并行计算', '实例渲染', '游戏循环'][i]}
          </button>
        ))}
      </div>
      <div id="note-content" role="tabpanel" aria-labelledby={`note-tab-${tab}`}>
        <h3>{note.title}</h3>
        {note.paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
        <pre>{note.code}</pre>
        <p>
          <code>{note.files}</code>
        </p>
        <p className="note-challenge">{note.challenge}</p>
      </div>
      <div className="dialog-footer">
        <span>
          <span className="status-light" /> 先玩一局，再修改一个参数。
        </span>
        <a
          href="https://developer.mozilla.org/zh-CN/docs/Web/API/WebGPU_API"
          target="_blank"
          rel="noreferrer"
        >
          WebGPU 文档 ↗
        </a>
      </div>
    </dialog>
  );
}
