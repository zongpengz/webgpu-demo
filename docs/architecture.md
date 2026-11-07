# 星际闪避架构

## 边界

项目只包含 Star Drift（星际闪避），只使用 WebGPU 渲染。UI、CPU 游戏规则与 GPU 实现通过 `src/core/types.ts` 里的契约连接，`src/games/catalog.ts` 的静态 `GAME` 对象集中管理展示文案。

| 层               | 职责                                        | 不负责                   |
| ---------------- | ------------------------------------------- | ------------------------ |
| React 组件       | 静态介绍、参数、HUD、错误提示、学习笔记     | 物理更新与逐粒子状态     |
| `usePlayground`  | 输入、暂停、RAF、固定步长、音效与生命周期   | 具体游戏规则             |
| `MeteorGame`     | 陨石、能量、移动、碰撞、分数、胜负与护盾    | DOM、GPU API             |
| `WebGPURenderer` | 接收帧参数与 `Sprite[]`，模拟星尘并绘制画面 | 分数、胜负、用户操作规则 |
| WGSL             | 装饰星尘、背景、精灵轮廓与辉光              | React 状态与游戏规则     |

游戏规则封装在不依赖 DOM 的 `MeteorGame` 中，与渲染调度分离，能在 Node 中直接测试。不再为单一游戏和单一渲染器保留工厂或多实现接口。CPU 负责游戏对象与爆裂火花的更新，输出精灵实例；GPU 负责独立的背景星尘模拟。这两类粒子不是同一套规则：星尘不参与碰撞或计分，控制台的粒子数量只改变星尘密度。

## 一帧的数据流

```text
键盘 / 鼠标 / 触屏
        ↓
usePlayground 中的输入 Ref
        ↓
MeteorGame.update(1/120, input)   ← 固定步长，按累积时间补步
        ├── GameEvent[] → 音效、提示、结算
        ├── GameSnapshot → React HUD（约 10 Hz）
        └── Sprite[]：飞船、陨石、能量、火花
              ↓
WebGPURenderer.render(frame, sprites)
        ├── queue.writeBuffer：24 字节 Uniform + CPU 精灵实例
        ├── Compute Pass：更新星尘 Storage Buffer
        └── Render Pass：背景 → 星尘实例 → 精灵实例
              ↓
requestAnimationFrame
```

单帧积累时间上限为 50 ms，避免卡顿后大量补步；慢设备上的游戏时间会相应放慢。游戏状态与渲染器保存在 Ref 中，React 不参与每个物理步，也不管理每颗星尘。

计算与渲染使用同一个 `GPUCommandEncoder`，先计算、再读取星尘 Buffer。GPU 管理资源同步，无需把星尘位置读回 CPU。每个计算调用只写自己负责的粒子，工作组大小为 64，通过 `ceil(count / 64)` 调度，并检查索引是否越界。

## 显存布局

### Uniform Buffer · 24 字节

| 字段           | 偏移 / 字节 | 含义                    |
| -------------- | ----------- | ----------------------- |
| `world: vec2f` | 0           | 逻辑画布宽高 1000 × 650 |
| `time: f32`    | 8           | 动画时间                |
| `dt: f32`      | 12          | 星尘步长，暂停为 0      |
| `glow: f32`    | 16          | 辉光强度                |
| `count: f32`   | 20          | 本帧有效星尘数          |

CPU 使用包含 6 个元素的 `Float32Array`，顺序为宽、高、时间、步长、辉光、数量。指针仅用于 CPU 飞船控制，不传给星尘着色器。

### Storage Buffer

- `Particle`：16 字节，`position: vec2f` 位于偏移 0，`seed: f32` 位于偏移 8，末尾 4 字节为对齐填充。最多 32,768 颗，占 512 KiB；星尘漂移由时间与 `seed` 决定，不存储未使用的速度。
- `Sprite`：48 字节，`geometry: vec4f`、`color: vec4f`、`style: vec4f`。最多 2,048 个实例，CPU 每帧打包有效精灵。
- 坐标采用固定逻辑空间，画布像素尺寸根据容器与 DPR 调整；DPR 上限为 2，并受设备纹理尺寸上限约束。

修改 WGSL 数据结构时，必须同时调整 CPU 打包步长、Buffer 大小、字段顺序和对齐，并更新 `src/shaders.test.ts` 的布局契约。

## 渲染方式

背景使用全屏三角形。星尘和游戏精灵各使用 6 个顶点组成的四边形，通过 `instance_index` 读取各自的 Storage Buffer，一次 `draw(6, count)` 绘制整批实例。

星尘在 Compute Shader 中向下移动并横向缓慢漂移，越界后循环。游戏精灵的位置来自 CPU，片元着色器使用 SDF 距离函数绘制飞船、陨石与能量轮廓。辉光来自着色器和加法混合，没有贴图，也没有 Bloom 后处理。

每帧有 2～3 次绘制调用：背景、星尘，以及非空时的精灵批次。计算调度不算绘制调用。UI 中的 FPS 是帧间隔统计，不是 GPU timestamp 测量。

## 状态与资源

游戏状态为 `ready → running ↔ paused → over / won`。重新开始或切换难度会重置 `MeteorGame`。页面失焦、隐藏或打开学习笔记时暂停，关闭笔记后手动继续。

引擎状态独立于游戏状态：`loading → webgpu` 或 `loading → error`，运行中也可能从 `webgpu → error`。页面只有一张画布。初始化实际请求适配器和设备，编译 WGSL 并创建异步 Pipeline，成功后才能开始游戏。

WebGPU 不可用、初始化失败、设备丢失或运行中渲染失败都会进入错误状态并停止游戏，不切换渲染路径。运行时同时处理同步渲染异常与设备的 `uncapturederror` 异步错误事件，销毁渲染器时移除监听。`engineReason` 保留具体诊断；`GameStage` 用可见的 `role="alert"` 展示原因、WebGPU 启用条件与刷新指引。错误画面优先于暂停、结束和待机画面，不把运行时故障统一描述成浏览器不支持。

运行要求为支持并启用 WebGPU 的浏览器、可用 GPU 与驱动、硬件加速，以及 HTTPS 或 localhost 安全上下文。修复环境或遇到运行时故障后，通过刷新页面重新初始化。

组件卸载会取消 RAF、移除输入监听、断开 ResizeObserver、销毁 GPU Device 并关闭 AudioContext。音频只在用户点击开关后启用。

## 验证

运行 `npm test`、`npm run typecheck` 和 `npm run build`，检查游戏规则、WebGPU 初始化失败与设备丢失回调、错误界面优先级、WGSL 解析、内存布局与构建。着色器解析测试不能替代实际驱动编译和浏览器验证。

在真实浏览器中还需检查：键盘与触控、自动暂停、难度重置、粒子与辉光控制、全屏，以及 WebGPU 缺失、初始化失败和运行中设备丢失时的可见诊断。
