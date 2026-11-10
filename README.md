# 零界行动 · Starfall Protocol

WebGPU 驱动的深空射击游戏。驾驶游隼战机突破碎星前哨、猩红裂隙和零界核心，切换火力，收集补给，迎战分阶段首领。

项目使用 **Vite + React + TypeScript**。游戏画面由 WGSL 着色器生成，整备界面的战机插画使用 SVG，音效使用 Web Audio。React 管理界面，`MeteorGame` 在 CPU 上管理规则，WebGPU 负责装饰星尘的并行计算和画面的实例化渲染。**需要支持并启用 WebGPU 的浏览器。**

## 快速启动

使用 **Node.js 24** 和 **pnpm 11.6.0**，Node.js 最低要求为 22.12。`package.json` 的 `packageManager` 固定 pnpm 版本，`pnpm-lock.yaml` 锁定完整依赖树。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

已安装 pnpm 11.6.0 时可跳过 `corepack enable`。首次安装或切换分支后执行 `pnpm install --frozen-lockfile`，新增依赖使用 `pnpm add`，开发依赖使用 `pnpm add -D`，并提交更新后的锁文件。

打开终端显示的本地地址，通常为 **http://localhost:5173**。请通过开发服务器访问，不要直接双击 `index.html`。

```bash
pnpm typecheck    # TypeScript 严格类型检查
pnpm test         # 游戏规则、WebGPU 初始化、错误界面与 WGSL 契约测试
pnpm test:watch   # 修改代码时持续运行测试
pnpm build        # 类型检查 + 生产构建，输出 dist/
pnpm preview      # 预览生产构建
pnpm format       # Prettier 格式化源码与文档
pnpm format:check # 检查格式，CI 同步执行
```

## 战役与操作

三段战役各包含三波 12 秒攻势，随后进入首领战。首领随剩余耐久切换瞄准射击、环形弹幕和激光攻击，激光先预警再造成伤害。击败首领后，选择火控、装甲或僚机强化，继续下一段航线。通关记录会解锁对应起始关卡。

| 操作                                | 功能                                     |
| ----------------------------------- | ---------------------------------------- |
| WASD / 方向键 / 鼠标拖动 / 触屏拖动 | 移动战机                                 |
| Space                               | 闪避冲刺，短暂无敌，冷却 3 秒            |
| E / B                               | 释放裂变脉冲，清除敌方弹幕并造成范围伤害 |
| Q                                   | 切换脉冲双炮、离子散射、光矛穿刺         |
| F                                   | 切换自动开火，默认开启                   |
| J / 鼠标左键按住                    | 手动开火                                 |
| P / Escape                          | 暂停或继续                               |
| R / Enter                           | 重新部署 / 从待机开始                    |
| 1 / 2 / 3                           | 关间选择强化                             |

主武器最高 MK.5。脉冲双炮提供高射速，离子散射随等级扩大扇面，光矛可以贯穿多个敌机。场上补给包括火力升级、舰体修复、护盾充能和脉冲补充，靠近后会吸附。

护盾优先吸收伤害，脱离伤害 5 秒后以每秒 3 点恢复。舰体耗尽会结束本局。连续击毁会提高计分倍率，连击窗口为 3.5 秒，最高 4 倍。不同难度调整敌方耐久、弹速、生成节奏、伤害与计分。

战场占据主窗口，左上角「菜单」打开指挥终端，集中提供航线、整备、设置与手册。打开菜单会暂停战斗，关闭后恢复打开前正在进行的战斗。页面失去焦点或切换浏览器标签页后需手动继续。难度与起始关卡在部署前选择，战斗中可随时切换武器。

音效默认关闭，通过 Web Audio 合成。在「菜单 → 设置」中开启音效和调整星尘密度、光晕。战斗 HUD 支持全屏，触屏玩家可以直接点击闪避与脉冲按钮。

最佳成绩沿用原有本地存储键，战役解锁单独保存在 `starfall.campaign.completed.v1`。存储不可用时仍可游玩。

## WebGPU 要求

页面会实际执行 `navigator.gpu.requestAdapter()` 和 `requestDevice()`，并编译着色器，初始化成功后才允许开始行动。浏览器需要支持 WebGPU，且访问环境必须是安全上下文（HTTPS 或 localhost）。支持情况还取决于系统、GPU、驱动和浏览器设置，项目以运行时检测结果为准。

请在浏览器设置中启用 WebGPU 和硬件加速，必要时更新浏览器与 GPU 驱动。页面只有一张 WebGPU 画布，不提供其他渲染路径。

WebGPU 不可用或初始化失败时，游戏不会启动，画面会显示醒目的错误提示和具体诊断。运行中设备丢失或渲染失败也会停止游戏并显示诊断，错误提示优先于暂停和结算画面。处理原因后点击「刷新页面重试」重新初始化。

FPS 是实际帧间隔统计，不是 GPU timestamp 测量。WebGPU 的绘制调用数为背景、粒子、游戏精灵合计 2～3 次；不包含计算调度。星尘采用加法混合，机体采用透明度混合，光晕由 SDF 距离函数计算。

## 目录结构

```text
src/
├── main.tsx                  # React 入口
├── App.tsx                   # 沉浸战场、菜单导航与暂停恢复
├── components/
│   ├── Sidebar.tsx           # 战役航线与关卡解锁
│   ├── GameStage.tsx         # 单画布、HUD、错误提示、操作与统计
│   ├── GameStage.test.tsx    # 错误界面优先级与启动状态测试
│   ├── ControlPanel.tsx      # 武器整备、难度与历史成绩
│   ├── CommandDialog.tsx     # 指挥终端模态窗口
│   ├── ShipPortrait.tsx      # 整备界面战机插画
│   ├── NotesDialog.tsx       # 内置中文学习笔记
│   └── Icons.tsx             # 共享 SVG 图标
├── hooks/usePlayground.ts    # 生命周期、输入、固定步长、渲染调度
├── core/
│   ├── types.ts              # 输入、快照、帧参数与精灵数据类型
│   ├── sprites.ts            # CPU 与 WGSL 共用的精灵材质编号
│   ├── math.ts               # 数值限制与可复现随机数
│   └── storage.ts            # 本地最佳成绩与战役解锁，兼容禁用存储
├── engine/
│   ├── renderer.ts           # WebGPU 设备、粒子计算与实例渲染
│   ├── renderer.test.ts      # 初始化失败、运行错误与资源释放测试
│   └── audio.ts              # Web Audio 合成音效
├── games/
│   ├── catalog.ts            # 关卡、武器、补给与强化配置
│   ├── meteor.ts             # 战斗、波次、首领与强化状态机
│   ├── combat.ts             # 敌机、弹道和首领类型与难度配置
│   ├── visuals.ts            # 战斗对象到 GPU 精灵的转换
│   ├── shared.ts             # 游戏反馈粒子
│   └── meteor.test.ts        # 可在 Node 中运行的规则测试
├── shaders.ts                # 四组带中文/英文注释的 WGSL
└── shaders.test.ts           # 着色器解析和 CPU/GPU 内存布局契约
styles.css                    # 基础控件、战场、弹窗与响应式样式
pnpm-lock.yaml                # pnpm 锁定的依赖树
docs/architecture.md          # 游戏边界、渲染数据流与显存布局
.github/workflows/ci.yml      # 类型检查、测试、生产构建
```

## 建议的学习顺序

1. 玩一局，调整粒子数量和辉光，观察 FPS 与视觉变化。
2. 阅读 `games/meteor.ts`：修改波次节奏、敌机火力或补给奖励，理解规则如何影响体验。
3. 阅读 `engine/renderer.ts`：追踪设备、Buffer、Pipeline、BindGroup 和 CommandEncoder。
4. 阅读 `shaders.ts`：调整星尘的下落速度、漂移或战机的 SDF 轮廓。
5. 对照[架构说明](docs/architecture.md)，追踪 CPU 精灵与 GPU 星尘如何汇合到同一帧。

## 设计取舍与边界

- Vite 适合本地实验和静态发布；当前不需要 Next.js 的 SSR，也没有 NestJS 后端需求。
- 使用 Vite 内置 TSX 转译，无额外 Babel 配置。TypeScript 独立检查类型。
- 物理逻辑以 120 Hz 固定步长执行，渲染由 `requestAnimationFrame` 驱动。单帧积累时间上限 50 ms，避免卡顿后大量补帧；很慢的设备上游戏时间会相应放慢。
- 游戏状态与渲染器保存在 Ref 中；React 约 10 Hz 更新 HUD，不逐粒子更新组件。
- 粒子由 GPU 并行模拟；游戏规则、精灵和爆裂火花由 CPU 管理。这里不是把全部游戏逻辑移到 GPU。
- GPU 星尘只是背景装饰，不参与碰撞和计分。修改粒子数量不会改变游戏规则。
- 每帧 Uniform 为 **48 字节**。在画布、时间、光晕与粒子数量之外，新增关卡色调、首领警戒、震动偏移、受击闪光和航行速度。
- 每颗星尘占 **16 字节**，只保存位置、随机种子与对齐填充；32K 星尘占用 512 KiB，不保留已移除玩法的数据字段。
- 自动测试验证 CPU 游戏规则、WebGPU 初始化失败与设备丢失处理、错误界面优先级、WGSL 解析和显存字段对齐；解析成功不等于通过 GPU 驱动编译，无法代替真实浏览器上的视觉与设备支持验证。首次运行应确认能够开始行动，且控制台无着色器或 GPU 验证错误。

## 参考资料

- [MDN · WebGPU API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGPU_API)
- [W3C · WGSL 规范](https://www.w3.org/TR/WGSL/)
- [WebGPU 官方示例](https://webgpu.github.io/webgpu-samples/)
