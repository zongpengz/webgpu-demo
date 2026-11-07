import { backgroundShader, computeShader, particleShader, spriteShader } from '../shaders';
import type { RenderFrame, Sprite } from '../core/types';

const MAX_PARTICLES = 32768;
const MAX_SPRITES = 2048;
export const WORLD = { width: 1000, height: 650 };

function initialParticles() {
  const data = new Float32Array(MAX_PARTICLES * 4);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 430;
    data.set([500 + Math.cos(a) * r, 325 + Math.sin(a) * r * 0.75, Math.random(), 0], i * 4);
  }
  return data;
}

/** Real WebGPU: compute updates storage, then instanced rendering reads it. */
export class WebGPURenderer {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  context!: GPUCanvasContext;
  count = 16384;
  drawCalls = 3;
  uniformData: Float32Array<ArrayBuffer>;
  spriteData: Float32Array<ArrayBuffer>;
  uniformBuffer!: GPUBuffer;
  particleBuffer!: GPUBuffer;
  spriteBuffer!: GPUBuffer;
  backgroundPipeline!: GPURenderPipeline;
  computePipeline!: GPUComputePipeline;
  particlePipeline!: GPURenderPipeline;
  spritePipeline!: GPURenderPipeline;
  backgroundGroup!: GPUBindGroup;
  computeGroup!: GPUBindGroup;
  particleGroup!: GPUBindGroup;
  spriteGroup!: GPUBindGroup;
  private destroyed = false;
  private onUncapturedError?: (event: GPUUncapturedErrorEvent) => void;
  static async create(canvas: HTMLCanvasElement, onError: (message: string) => void) {
    if (!navigator.gpu)
      throw new Error(
        '当前环境未提供 WebGPU。请使用支持 WebGPU 的浏览器，启用 WebGPU 和硬件加速，并通过 localhost 或 HTTPS 安全上下文访问。',
      );
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter)
      throw new Error(
        '没有可用的 WebGPU 适配器。请在浏览器中启用 WebGPU 和硬件加速，并确认显卡及驱动支持 WebGPU。',
      );
    const device = await adapter.requestDevice();
    const renderer = new WebGPURenderer(canvas, device);
    try {
      await renderer.initialize();
    } catch (error) {
      renderer.destroy();
      throw error;
    }
    renderer.onUncapturedError = (event) => {
      onError('WebGPU 运行错误：' + event.error.message + '。请刷新页面重试。');
    };
    device.addEventListener('uncapturederror', renderer.onUncapturedError);
    device.lost.then((info) => {
      if (!renderer.destroyed && info.reason !== 'destroyed')
        onError('GPU 连接已中断：' + info.message + '。请刷新页面重试。');
    });
    return renderer;
  }
  constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
    this.canvas = canvas;
    this.device = device;
    this.count = 16384;
    this.drawCalls = 3;
    this.uniformData = new Float32Array(6);
    this.spriteData = new Float32Array(MAX_SPRITES * 12);
  }
  async initialize() {
    const d = this.device;
    d.pushErrorScope('validation');
    const context = this.canvas.getContext('webgpu');
    if (!context) throw new Error('无法创建 WebGPU 画布');
    this.context = context;
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device: d, format, alphaMode: 'opaque' });
    this.uniformBuffer = d.createBuffer({
      label: '24-byte frame uniforms',
      size: this.uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.particleBuffer = d.createBuffer({
      label: '32K GPU-owned particles',
      size: MAX_PARTICLES * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.spriteBuffer = d.createBuffer({
      label: 'Game sprite instances',
      size: MAX_SPRITES * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    d.queue.writeBuffer(this.particleBuffer, 0, initialParticles());
    const module = async (label: string, code: string) => {
      const shader = d.createShaderModule({ label, code });
      const info = await shader.getCompilationInfo();
      const errors = info.messages.filter((m) => m.type === 'error');
      if (errors.length)
        throw new Error(
          `${label}: ${errors.map((e) => `line ${e.lineNum}: ${e.message}`).join('\n')}`,
        );
      return shader;
    };
    const [bg, compute, particles, sprites] = await Promise.all([
      module('Background WGSL', backgroundShader),
      module('Particle compute WGSL', computeShader),
      module('Particle render WGSL', particleShader),
      module('Sprite SDF WGSL', spriteShader),
    ]);
    const renderPipeline = (shader: GPUShaderModule, additive: boolean) =>
      d.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module: shader, entryPoint: 'vs' },
        fragment: {
          module: shader,
          entryPoint: 'fs',
          targets: [
            {
              format,
              ...(additive
                ? {
                    blend: {
                      color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
                      alpha: { srcFactor: 'zero', dstFactor: 'one', operation: 'add' },
                    },
                  }
                : {}),
            },
          ],
        },
        primitive: { topology: 'triangle-list' },
      });
    [this.backgroundPipeline, this.computePipeline, this.particlePipeline, this.spritePipeline] =
      await Promise.all([
        renderPipeline(bg, false),
        d.createComputePipelineAsync({
          layout: 'auto',
          compute: { module: compute, entryPoint: 'main' },
        }),
        renderPipeline(particles, true),
        renderPipeline(sprites, true),
      ]);
    const group = (pipeline: GPURenderPipeline | GPUComputePipeline, buffer?: GPUBuffer) =>
      d.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          ...(buffer ? [{ binding: 1, resource: { buffer } }] : []),
        ],
      });
    this.backgroundGroup = group(this.backgroundPipeline);
    this.computeGroup = group(this.computePipeline, this.particleBuffer);
    this.particleGroup = group(this.particlePipeline, this.particleBuffer);
    this.spriteGroup = group(this.spritePipeline, this.spriteBuffer);
    const error = await d.popErrorScope();
    if (error) throw new Error(error.message);
    this.resize();
  }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const limit = this.device.limits.maxTextureDimension2D;
    this.canvas.width = Math.min(limit, Math.max(1, Math.round(width * dpr)));
    this.canvas.height = Math.min(limit, Math.max(1, Math.round(height * dpr)));
  }
  setCount(count: number) {
    this.count = Math.min(MAX_PARTICLES, count);
  }
  resetParticles() {
    this.device.queue.writeBuffer(this.particleBuffer, 0, initialParticles());
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.onUncapturedError)
      this.device.removeEventListener('uncapturederror', this.onUncapturedError);
    this.context?.unconfigure();
    this.device.destroy();
  }
  render(frame: RenderFrame, sprites: Sprite[]) {
    const d = this.device;
    this.uniformData.set([WORLD.width, WORLD.height, frame.time, frame.dt, frame.glow, this.count]);
    d.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);
    const count = Math.min(sprites.length, MAX_SPRITES);
    for (let i = 0; i < count; i++) {
      const s = sprites[i];
      this.spriteData.set(
        [s.x, s.y, s.rx, s.ry, ...s.color, s.kind || 0, s.rotation || 0, s.extra || 0, 0],
        i * 12,
      );
    }
    if (count) d.queue.writeBuffer(this.spriteBuffer, 0, this.spriteData, 0, count * 12);
    const encoder = d.createCommandEncoder({ label: 'Compute → render frame' });
    const compute = encoder.beginComputePass();
    compute.setPipeline(this.computePipeline);
    compute.setBindGroup(0, this.computeGroup);
    compute.dispatchWorkgroups(Math.ceil(this.count / 64));
    compute.end();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
        },
      ],
    });
    pass.setPipeline(this.backgroundPipeline);
    pass.setBindGroup(0, this.backgroundGroup);
    pass.draw(3);
    pass.setPipeline(this.particlePipeline);
    pass.setBindGroup(0, this.particleGroup);
    pass.draw(6, this.count);
    if (count) {
      pass.setPipeline(this.spritePipeline);
      pass.setBindGroup(0, this.spriteGroup);
      pass.draw(6, count);
    }
    pass.end();
    d.queue.submit([encoder.finish()]);
    this.drawCalls = count ? 3 : 2;
  }
}
