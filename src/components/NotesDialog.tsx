import { useEffect, useRef, useState } from 'react';

export type NoteId = 'compute' | 'render' | 'game';
const NOTES = {
  compute: {
    title: '不是循环 32,768 次，而是让 GPU 一起做。',
    paragraphs: [
      '星尘模拟使用一个 24 字节的 Uniform Buffer：world 从字节 0 开始，time、dt、glow、count 分别从字节 8、12、16、20 开始。粒子保存在 Storage Buffer 中，每个 GPU 调用只更新自己负责的粒子。',
      '每个工作组有 64 个调用。16,384 颗星尘会分成 256 组，向下漂移并在越界后循环。这些装饰粒子不参与碰撞与计分；修改粒子数量，观察 FPS 与星空密度的变化。',
    ],
    code: '// src/shaders.ts → computeShader（节选）\n@compute @workgroup_size(64)\nfn main(@builtin(global_invocation_id) id: vec3u) {\n  if (id.x >= u32(g.count)) { return; }\n  var p = particles[id.x];\n  p.position.y += (10. + p.seed * 58.) * g.dt;\n  if (p.position.y > g.world.y + 5.) {\n    p.position.y = -5.;\n  }\n  particles[id.x] = p;\n}',
    files: 'src/shaders.ts · src/engine/renderer.ts',
    challenge: '动手试试：修改 computeShader 中星尘下落速度的系数 58，观察飞行氛围的变化。',
  },
  render: {
    title: '一张小四边形，绘制一整片星海。',
    paragraphs: [
      '粒子复用相同的 6 个顶点，顶点着色器通过 instance_index 从显存读取每颗粒子的位置。一条 draw(6, count) 就能绘制上万颗粒子。',
      '飞船、陨石、能量与爆裂火花也被打包成精灵实例，它们的位置由 CPU 游戏规则决定。片元着色器通过 SDF 距离函数计算轮廓与辉光，加法混合让相遇的光叠加。这里没有加载任何贴图，也没有真正的 Bloom 后处理。',
    ],
    code: '// src/engine/renderer.ts → render()\nconst compute = encoder.beginComputePass();\ncompute.dispatchWorkgroups(Math.ceil(count / 64));\ncompute.end();\n\nconst pass = encoder.beginRenderPass(descriptor);\npass.setPipeline(particlePipeline);\npass.draw(6, count); // 共享顶点，不共享位置\npass.end();',
    files: 'src/engine/renderer.ts · src/shaders.ts',
    challenge: '动手试试：在 spriteShader 中修改陨石的边数 7，把它变成另一种多边形。',
  },
  game: {
    title: '让物理稳定，让界面从容更新。',
    paragraphs: [
      'requestAnimationFrame 驱动渲染。游戏物理以 1/120 秒固定步长更新，碰撞与得分留在 CPU，粒子模拟交给 GPU。切换标签页、失去焦点或打开学习笔记时会自动暂停。',
      'React 只以约 10 Hz 接收游戏快照，不在每颗星尘或每个物理步上重新渲染。MeteorGame 输出精灵、分数、护盾与游戏事件；渲染器只接收画面数据，不决定胜负。',
    ],
    code: '// src/hooks/usePlayground.ts\nconst STEP = 1 / 120;\naccumulator += Math.min(elapsed, 0.05);\nwhile (accumulator >= STEP) {\n  simulation.update(STEP, input);\n  accumulator -= STEP;\n}\nrenderer.render(frame, simulation.getSprites(time));',
    files: 'src/core/types.ts · src/games/meteor.ts · src/hooks/usePlayground.ts',
    challenge: '动手试试：修改 meteor.ts 中的陨石生成间隔，再为新的节奏补充规则测试。',
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
      <p className="dialog-subtitle">这不是一段预渲染视频。这里的每一帧，都是代码正在发生。</p>
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
          <span className="status-light" /> 学习建议：先玩一局，再修改一个参数。
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
