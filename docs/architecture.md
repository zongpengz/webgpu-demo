# 架构与扩展指南

## 边界

UI、游戏规则与 GPU 实现通过 `src/core/types.ts` 里的接口连接。

| 层              | 职责                                      | 不负责                   |
| --------------- | ----------------------------------------- | ------------------------ |
| React 组件      | 页面、参数、HUD、无障碍、学习笔记         | 物理更新与逐粒子状态     |
| `usePlayground` | 输入、暂停、RAF、固定步长、音效与生命周期 | 具体游戏规则             |
| `Simulation`    | 可测试的游戏规则，输出 `Sprite[]` 与快照  | DOM、GPU API             |
| `Renderer`      | 接收帧参数与精灵，绘制画面                | 分数、胜负、用户操作规则 |
| WGSL            | 粒子模拟、背景、形状与光的计算            | React 状态与业务流程     |

当前粒子模拟、实例渲染和兼容渲染位于一个渲染模块，四组 WGSL 在一个文件中便于对照。未来着色器和渲染通道增加后，可再按 pipeline 拆分。

## 一帧的数据流

```text
键盘 / 鼠标 / 触屏
        ↓
usePlayground 中的输入 Ref
        ↓
Simulation.update(1/120, input)   ← 0～6 次 / 渲染帧
        ├── GameEvent[] → 音效、提示、结算
        ├── GameSnapshot → React HUD（约 10 Hz）
        └── Sprite[]
              ↓
Renderer.render(frame, sprites)
        ├── queue.writeBuffer：48 字节 Uniform + 游戏精灵
        ├── Compute Pass：更新粒子 Storage Buffer
        └── Render Pass：背景 → 粒子实例 → 精灵实例
              ↓
requestAnimationFrame
```

计算与渲染使用同一个 `GPUCommandEncoder`，先计算、再读取粒子 Buffer。GPU 管理资源同步，无需把粒子位置读回 CPU。各计算调用只写自己负责的粒子，避免读写竞争。

## 显存布局

### Uniform Buffer · 48 字节

| 字段             | 偏移 / 字节 | 含义                     |
| ---------------- | ----------- | ------------------------ |
| `world: vec2f`   | 0           | 逻辑画布宽高 1000 × 650  |
| `time: f32`      | 8           | 动画时间                 |
| `dt: f32`        | 12          | 粒子步长，暂停为 0       |
| `pointer: vec2f` | 16          | 逻辑空间中的指针位置     |
| `mode: f32`      | 24          | 0 星际 / 1 砖块 / 2 引力 |
| `pressed: f32`   | 28          | 引力是否跟随指针         |
| `glow: f32`      | 32          | 辉光强度                 |
| `count: f32`     | 36          | 本帧有效粒子数           |
| `padding: vec2f` | 40          | 对齐填充                 |

### Storage Buffer

- `Particle`：32 字节，`position: vec2f`、`velocity: vec2f`、`data: vec4f`。最多 32,768 颗，约 1 MiB。
- `Sprite`：48 字节，`geometry: vec4f`、`color: vec4f`、`style: vec4f`。最多 2,048 个实例。
- 坐标采用固定逻辑空间，Canvas 像素尺寸根据容器与 DPR 调整；DPR 上限为 2。

修改 WGSL 数据结构时，必须同时调整 CPU 打包步长、Buffer 大小、字段顺序和对齐。

## 状态与资源生命周期

`ready → running ↔ paused → over / won`。重新开始或切换难度会重置 Simulation。切换游戏重新创建对应实例，不重复初始化 GPU 设备。

初始先请求 WebGPU，编译着色器并创建异步 Pipeline；失败后使用另一张 Canvas 创建 2D 预览。两张 Canvas 是必要的：一张 Canvas 绑定 `webgpu` 后不能再次绑定 `2d`。只有可见的 Canvas 可获取键盘焦点。

组件卸载会取消 RAF、移除输入监听、断开 ResizeObserver、销毁 GPU Device 并关闭 AudioContext。GPU 设备丢失时暂停游戏并切换兼容预览。音频只在用户点击开关后启用。

## 加入第四个小游戏

1. 在 `core/types.ts` 的 `GameId` 中加入标识，例如 `'pong'`。
2. 新建 `games/pong.ts`，实现 `Simulation`。用 `update` 更新规则，`getSprites` 输出共用的精灵数据，`snapshot` 输出 HUD 需要的字段。
3. 在 `games/index.ts` 注册工厂，在 `games/catalog.ts` 添加文案、图标、操作和学习重点。
4. 在 `GameStage.tsx` 增加必要的 HUD 与按键提示；游戏数量改变时同步页面展示数量。
5. 若现有形状不够用，在 `spriteShader` 与 Canvas 兼容分支中增加同一种形状。若需要新的 GPU 模拟方式，在帧 `mode` 的路由和 Compute Shader 中一起添加。
6. 给关键规则添加纯逻辑测试，执行 `npm test`、`npm run typecheck` 和 `npm run build`，再在浏览器确认 WebGPU 与兼容模式。

```ts
class PongGame implements Simulation {
  phase: Phase = 'ready';
  events: GameEvent[] = [];
  start() {
    /* 重置状态，并切换 running */
  }
  update(dt: number, input: GameInput) {
    /* 球、挡板、碰撞 */
  }
  preview(dt: number) {
    /* 可选的待机演示 */
  }
  getSprites(time: number): Sprite[] {
    /* 输出形状 */ return [];
  }
  snapshot(): GameSnapshot {
    /* 返回分数、时间等快照 */
  }
}
```

上面是接口示意，方法体需要补全。游戏模块可以在 Node 测试环境直接实例化，无需 React、浏览器或 GPU。

## 可以继续尝试的方向

- 给引力加入可调阻尼、排斥模式和多个吸引点。
- 用独立渲染纹理实现真正的 Bloom；对照当前 SDF 光晕观察成本与效果。
- 加入 GPU timestamp 查询时先检测可选 feature，区分 CPU 帧率和 GPU 计算耗时。
- 游戏规模增大后，把输入、GPU 生命周期和帧调度从 Hook 提取为引擎对象；当前保持少量模块，便于学习。
