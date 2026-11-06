# GPU Lab · WebGPU 游乐场

用小游戏学习 WebGPU：驾驶飞船穿越陨石带、击碎霓虹砖块，或者用鼠标为数万颗粒子创造引力。

项目使用 **Vite + React + TypeScript**。没有服务端、账号和外部素材，视觉效果来自 WGSL 着色器。React 管理界面，独立游戏模块管理规则，WebGPU 负责粒子并行计算和实例化渲染。

## 快速启动

建议使用 **Node.js 24 LTS**，最低要求 Node.js 22.12。依赖版本记录在 `package-lock.json` 中。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址，通常为 **http://localhost:5173**。请通过开发服务器访问，不要直接双击 `index.html`。

```bash
npm run typecheck    # TypeScript 严格类型检查
npm test             # Vitest 游戏规则 + WGSL 解析与显存布局测试
npm run test:watch   # 修改代码时持续运行测试
npm run build        # 类型检查 + 生产构建，输出 dist/
npm run preview      # 预览生产构建
npm run format       # Prettier 格式化源码与文档
npm run format:check # 检查格式，CI 同步执行
```

## 三个实验

| 实验                       | 玩法                           | 学习重点                                       |
| -------------------------- | ------------------------------ | ---------------------------------------------- |
| 星际闪避 / Star Drift      | 躲避陨石、收集能量，生存 60 秒 | 游戏循环、实例渲染、SDF 轮廓、无敌与冷却       |
| 霓虹打砖块 / Neon Breaker  | 操作挡板反弹光球，清除 50 块砖 | 固定步长、碰撞检测、反弹角度、粒子反馈         |
| 粒子引力场 / Gravity Field | 按住鼠标或触摸画面，牵引粒子   | Compute Shader、Storage Buffer、向心力与切向力 |

### 操作

- **星际闪避**：WASD / 方向键 / 鼠标 / 触屏移动；空格冲刺。
- **打砖块**：A、D / 左右方向键 / 鼠标 / 触屏移动；空格或点击画面发球。挡板击球位置决定反弹角度。
- **引力场**：按住并拖动鼠标或手指，改变引力中心；松开后恢复中央引力。
- **通用**：Enter 开始，P 暂停 / 继续，R 重新开始。右上角可切换全屏。
- 页面失去焦点、切换浏览器标签页或打开学习笔记会自动暂停。关闭笔记后手动继续。

控制台可调节难度、粒子数量（2K / 8K / 16K / 32K）、辉光和音效。**修改难度会重置当前游戏**。音效默认关闭，通过 Web Audio 实时合成。键盘操作画布前可点击画面；控件与学习笔记不会截获游戏操作。

星际闪避每秒获得 10 分，每颗能量增加 100 分，完成航行额外获得 500 分。打砖块每块 50 分，清空额外获得 500 分。两款小游戏各有 3 次容错；最佳成绩分别保存在浏览器 `localStorage` 中，跨难度共用，不上传服务器。

## WebGPU 与兼容预览

页面会实际执行 `navigator.gpu.requestAdapter()` 和 `requestDevice()`，并编译着色器；初始化成功后才标记为 **WebGPU 实时渲染**。浏览器需要支持 WebGPU，且访问环境必须是安全上下文（HTTPS 或 localhost）。支持情况还取决于系统、GPU、驱动和浏览器设置，项目以运行时检测结果为准。

如果 WebGPU 不可用、初始化失败或设备丢失，会切换到明确标注的 **Canvas 2D 兼容预览**：

- 两款小游戏仍可试玩。
- 粒子改为 CPU 计算，**实际数量上限 2,048**，底部显示实际数量。
- 控制台滑块仍显示请求数量；兼容提示说明上限，不将 Canvas 2D 称为 WebGPU。
- 不支持 WebGPU 的原因会显示在画面下方；设备丢失时自动暂停。

FPS 是实际帧间隔统计，不是 GPU timestamp 测量。WebGPU 的绘制调用数为背景、粒子、游戏精灵合计 2～3 次；不包含计算调度。辉光来自 SDF 距离函数和加法混合，**不是 Bloom 后处理**。

## 目录结构

```text
src/
├── main.tsx                  # React 入口
├── App.tsx                   # 页面组合与学习笔记入口
├── components/
│   ├── Sidebar.tsx           # 实验切换
│   ├── GameStage.tsx         # Canvas、HUD、操作与统计
│   ├── ControlPanel.tsx      # 参数控制台
│   ├── NotesDialog.tsx       # 内置中文学习笔记
│   └── Icons.tsx             # 共享 SVG 图标
├── hooks/usePlayground.ts    # 生命周期、输入、固定步长、渲染调度
├── core/
│   ├── types.ts              # Simulation / Renderer 等公共契约
│   ├── math.ts               # 碰撞辅助与可复现随机数
│   └── storage.ts            # 本地最佳成绩，兼容禁用存储
├── engine/
│   ├── renderer.ts           # WebGPU 实现 + Canvas 兼容实现
│   └── audio.ts              # Web Audio 合成音效
├── games/
│   ├── catalog.ts            # 游戏文案与展示元数据
│   ├── index.ts              # Simulation 工厂
│   ├── meteor.ts             # 星际闪避，独立于 React / DOM
│   ├── breakout.ts           # 打砖块，独立于 React / DOM
│   ├── gravity.ts            # 引力实验的生命周期
│   ├── shared.ts             # 游戏反馈粒子
│   └── games.test.ts         # 可在 Node 中运行的规则测试
├── shaders.ts                # 四组带中文/英文注释的 WGSL
└── shaders.test.ts           # 着色器解析和 CPU/GPU 内存布局契约
styles.css                    # 设计变量、布局、组件与响应式样式
docs/architecture.md          # 渲染数据流与扩展指南
.github/workflows/ci.yml      # 类型检查、测试、生产构建
```

## 建议的学习顺序

1. 玩一局，调整粒子数量和辉光，观察 FPS 与视觉变化。
2. 阅读 `games/meteor.ts`：修改陨石速度、生成间隔或能量奖励，理解规则如何影响体验。
3. 阅读 `engine/renderer.ts`：追踪设备、Buffer、Pipeline、BindGroup 和 CommandEncoder。
4. 阅读 `shaders.ts`：从粒子直线移动开始，再尝试引力、切向运动和新的 SDF 形状。
5. 按照[架构与扩展指南](docs/architecture.md)，加入第四个小游戏。

## 设计取舍与边界

- Vite 适合本地实验和静态发布；当前不需要 Next.js 的 SSR，也没有 NestJS 后端需求。
- 使用 Vite 内置 TSX 转译，无额外 Babel 配置。TypeScript 独立检查类型。
- 物理逻辑以 120 Hz 固定步长执行，渲染由 `requestAnimationFrame` 驱动。单帧积累时间上限 50 ms，避免卡顿后大量补帧；很慢的设备上游戏时间会相应放慢。
- 游戏状态与渲染器保存在 Ref 中；React 约 10 Hz 更新 HUD，不逐粒子更新组件。
- 粒子由 GPU 并行模拟；游戏规则、精灵和爆裂火花由 CPU 管理。这里不是把全部游戏逻辑移到 GPU。
- 为保持示例可读，引力实验采用单吸引点和切向力，没有实现粒子间 N-body 相互作用。
- 自动测试验证 CPU 游戏规则、WGSL 解析和显存字段对齐；解析成功不等于通过 GPU 驱动编译，无法代替真实浏览器上的视觉与兼容性验证。首次运行请确认画面下方显示的渲染模式。

## 参考资料

- [MDN · WebGPU API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGPU_API)
- [W3C · WGSL 规范](https://www.w3.org/TR/WGSL/)
- [WebGPU 官方示例](https://webgpu.github.io/webgpu-samples/)
