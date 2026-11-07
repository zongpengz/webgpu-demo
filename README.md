# GPU Lab · Star Drift 星际闪避

用一款小游戏学习 WebGPU：驾驶飞船穿越陨石带，躲避陨石、收集能量，完成 60 秒的星际航行。

项目使用 **Vite + React + TypeScript**。没有服务端、账号和外部素材，视觉效果来自 WGSL 着色器。React 管理界面，`MeteorGame` 在 CPU 上管理规则，WebGPU 负责装饰星尘的并行计算和画面的实例化渲染。**需要支持并启用 WebGPU 的浏览器。**

## 快速启动

建议使用 **Node.js 24 LTS**，最低要求 Node.js 22.12。依赖版本记录在 `package-lock.json` 中。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址，通常为 **http://localhost:5173**。请通过开发服务器访问，不要直接双击 `index.html`。

```bash
npm run typecheck    # TypeScript 严格类型检查
npm test             # 游戏规则、WebGPU 初始化、错误界面与 WGSL 契约测试
npm run test:watch   # 修改代码时持续运行测试
npm run build        # 类型检查 + 生产构建，输出 dist/
npm run preview      # 预览生产构建
npm run format       # Prettier 格式化源码与文档
npm run format:check # 检查格式，CI 同步执行
```

## 操作与规则

- WASD / 方向键 / 鼠标 / 触屏移动；空格冲刺。
- Enter 开始，P 暂停 / 继续，R 重新开始。右上角可切换全屏。
- 页面失去焦点、切换浏览器标签页或打开学习笔记会自动暂停。关闭笔记后手动继续。

控制台可调节难度、粒子数量（2K / 8K / 16K / 32K）、辉光和音效。**修改难度会重置当前游戏**。音效默认关闭，通过 Web Audio 实时合成。键盘操作画布前可点击画面；控件与学习笔记不会截获游戏操作。

每秒获得 10 分，每颗能量增加 100 分，完成航行额外获得 500 分。飞船有 3 格护盾，受击后短暂无敌；冲刺有冷却时间。最佳成绩保存在浏览器 `localStorage` 中，跨难度共用，不上传服务器。

## WebGPU 要求

页面会实际执行 `navigator.gpu.requestAdapter()` 和 `requestDevice()`，并编译着色器；初始化成功后才标记为 **WebGPU 实时渲染**。浏览器需要支持 WebGPU，且访问环境必须是安全上下文（HTTPS 或 localhost）。支持情况还取决于系统、GPU、驱动和浏览器设置，项目以运行时检测结果为准。

请在浏览器设置中启用 WebGPU 和硬件加速，必要时更新浏览器与 GPU 驱动。页面只有一张 WebGPU 画布，不提供其他渲染路径。

WebGPU 不可用或初始化失败时，游戏不会启动，画面会显示醒目的错误提示和具体诊断。运行中设备丢失或渲染失败也会停止游戏并显示诊断，错误提示优先于暂停和结算画面。处理原因后点击「刷新页面重试」重新初始化。

FPS 是实际帧间隔统计，不是 GPU timestamp 测量。WebGPU 的绘制调用数为背景、粒子、游戏精灵合计 2～3 次；不包含计算调度。辉光来自 SDF 距离函数和加法混合，**不是 Bloom 后处理**。

## 目录结构

```text
src/
├── main.tsx                  # React 入口
├── App.tsx                   # 页面组合与学习笔记入口
├── components/
│   ├── Sidebar.tsx           # 星际闪避静态介绍与引擎状态
│   ├── GameStage.tsx         # 单画布、HUD、错误提示、操作与统计
│   ├── GameStage.test.tsx    # 错误界面优先级与启动状态测试
│   ├── ControlPanel.tsx      # 参数控制台
│   ├── NotesDialog.tsx       # 内置中文学习笔记
│   └── Icons.tsx             # 共享 SVG 图标
├── hooks/usePlayground.ts    # 生命周期、输入、固定步长、渲染调度
├── core/
│   ├── types.ts              # 输入、快照、帧参数与精灵数据类型
│   ├── math.ts               # 数值限制与可复现随机数
│   └── storage.ts            # 本地最佳成绩，兼容禁用存储
├── engine/
│   ├── renderer.ts           # WebGPU 设备、粒子计算与实例渲染
│   ├── renderer.test.ts      # 初始化失败、运行错误与资源释放测试
│   └── audio.ts              # Web Audio 合成音效
├── games/
│   ├── catalog.ts            # 静态 GAME 展示元数据
│   ├── meteor.ts             # 星际闪避，独立于 React / DOM
│   ├── shared.ts             # 游戏反馈粒子
│   └── meteor.test.ts        # 可在 Node 中运行的规则测试
├── shaders.ts                # 四组带中文/英文注释的 WGSL
└── shaders.test.ts           # 着色器解析和 CPU/GPU 内存布局契约
styles.css                    # 设计变量、布局、组件与响应式样式
docs/architecture.md          # 游戏边界、渲染数据流与显存布局
.github/workflows/ci.yml      # 类型检查、测试、生产构建
```

## 建议的学习顺序

1. 玩一局，调整粒子数量和辉光，观察 FPS 与视觉变化。
2. 阅读 `games/meteor.ts`：修改陨石速度、生成间隔或能量奖励，理解规则如何影响体验。
3. 阅读 `engine/renderer.ts`：追踪设备、Buffer、Pipeline、BindGroup 和 CommandEncoder。
4. 阅读 `shaders.ts`：调整星尘的下落速度、漂移或陨石的 SDF 轮廓。
5. 对照[架构说明](docs/architecture.md)，追踪 CPU 精灵与 GPU 星尘如何汇合到同一帧。

## 设计取舍与边界

- Vite 适合本地实验和静态发布；当前不需要 Next.js 的 SSR，也没有 NestJS 后端需求。
- 使用 Vite 内置 TSX 转译，无额外 Babel 配置。TypeScript 独立检查类型。
- 物理逻辑以 120 Hz 固定步长执行，渲染由 `requestAnimationFrame` 驱动。单帧积累时间上限 50 ms，避免卡顿后大量补帧；很慢的设备上游戏时间会相应放慢。
- 游戏状态与渲染器保存在 Ref 中；React 约 10 Hz 更新 HUD，不逐粒子更新组件。
- 粒子由 GPU 并行模拟；游戏规则、精灵和爆裂火花由 CPU 管理。这里不是把全部游戏逻辑移到 GPU。
- GPU 星尘只是背景装饰，不参与碰撞和计分。修改粒子数量不会改变游戏规则。
- 每帧 Uniform 为 **24 字节**：`world: vec2f` 位于偏移 0，`time`、`dt`、`glow`、`count` 四个 `f32` 分别位于偏移 8、12、16、20。
- 每颗星尘占 **16 字节**，只保存位置、随机种子与对齐填充；32K 星尘占用 512 KiB，不保留已移除玩法的数据字段。
- 自动测试验证 CPU 游戏规则、WebGPU 初始化失败与设备丢失处理、错误界面优先级、WGSL 解析和显存字段对齐；解析成功不等于通过 GPU 驱动编译，无法代替真实浏览器上的视觉与设备支持验证。首次运行请确认画面下方显示「WebGPU 实时渲染」。

## 参考资料

- [MDN · WebGPU API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGPU_API)
- [W3C · WGSL 规范](https://www.w3.org/TR/WGSL/)
- [WebGPU 官方示例](https://webgpu.github.io/webgpu-samples/)
