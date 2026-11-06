import { backgroundShader, computeShader, particleShader, spriteShader } from '../shaders';
import type { Renderer, RenderFrame, Sprite } from '../core/types';

const MAX_PARTICLES = 32768;
const MAX_SPRITES = 2048;
export const WORLD = { width: 1000, height: 650 };

function initialParticles() {
  const data = new Float32Array(MAX_PARTICLES * 8);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 430;
    data.set(
      [
        500 + Math.cos(a) * r,
        325 + Math.sin(a) * r * 0.75,
        -Math.sin(a) * 65,
        Math.cos(a) * 65,
        Math.random(),
        0,
        0,
        0,
      ],
      i * 8,
    );
  }
  return data;
}

/** Real WebGPU: compute updates storage, then instanced rendering reads it. */
export class WebGPURenderer implements Renderer {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  context!: GPUCanvasContext;
  kind = 'webgpu' as const;
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
  static async create(canvas: HTMLCanvasElement, onLost: (message: string) => void) {
    if (!navigator.gpu) throw new Error('浏览器未提供 WebGPU');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('没有可用的 WebGPU 适配器');
    const device = await adapter.requestDevice();
    const renderer = new WebGPURenderer(canvas, device);
    try {
      await renderer.initialize();
    } catch (error) {
      device.destroy();
      throw error;
    }
    device.lost.then((info) => {
      if (info.reason !== 'destroyed') onLost(info.message);
    });
    return renderer;
  }
  constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
    this.canvas = canvas;
    this.device = device;
    this.kind = 'webgpu';
    this.count = 16384;
    this.drawCalls = 3;
    this.uniformData = new Float32Array(12);
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
      label: '48-byte frame uniforms',
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.particleBuffer = d.createBuffer({
      label: '32K GPU-owned particles',
      size: MAX_PARTICLES * 32,
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
    this.context?.unconfigure();
    this.device.destroy();
  }
  render(frame: RenderFrame, sprites: Sprite[]) {
    const d = this.device;
    this.uniformData.set([
      1000,
      650,
      frame.time,
      frame.dt,
      frame.pointer.x,
      frame.pointer.y,
      frame.mode,
      frame.pressed ? 1 : 0,
      frame.glow,
      this.count,
      0,
      0,
    ]);
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

/** Explicit CPU compatibility preview; never presented as WebGPU. */
export class CanvasRenderer implements Renderer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  kind = 'canvas' as const;
  drawCalls = 0;
  count = 2048;
  particles!: Float32Array<ArrayBuffer>;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建兼容画布');
    this.context = context;
    this.kind = 'canvas';
    this.drawCalls = 0;
    this.setCount(16384);
    this.resetParticles();
    this.resize();
  }
  setCount(count: number) {
    this.count = Math.min(count, 2048);
  }
  resetParticles() {
    this.particles = initialParticles();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  }
  destroy() {}
  render(frame: RenderFrame, sprites: Sprite[]) {
    const c = this.context;
    c.setTransform(this.canvas.width / 1000, 0, 0, this.canvas.height / 650, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#0a0917';
    c.fillRect(0, 0, 1000, 650);
    const haze = c.createRadialGradient(520, 300, 10, 520, 300, 470);
    haze.addColorStop(0, '#211336');
    haze.addColorStop(1, '#0a091700');
    c.fillStyle = haze;
    c.fillRect(0, 0, 1000, 650);
    c.strokeStyle = '#a87ed70b';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x < 1000; x += 50) {
      c.moveTo(x, 0);
      c.lineTo(x, 650);
    }
    for (let y = 0; y < 650; y += 50) {
      c.moveTo(0, y);
      c.lineTo(1000, y);
    }
    c.stroke();
    c.strokeStyle = '#ac78ff16';
    c.beginPath();
    c.ellipse(520, 305, 320, 237, 0, 0, Math.PI * 2);
    c.stroke();
    c.globalCompositeOperation = 'lighter';
    const p = this.particles;
    for (let i = 0; i < this.count; i++) {
      const k = i * 8,
        seed = p[k + 4];
      if (frame.mode === 2) {
        const dx = (frame.pressed ? frame.pointer.x : 500) - p[k],
          dy = (frame.pressed ? frame.pointer.y : 325) - p[k + 1];
        const dist = Math.max(35, Math.hypot(dx, dy)),
          force = 18000 / (dist + 90);
        p[k + 2] =
          (p[k + 2] + ((dx / dist) * force - (dy / dist) * 28) * frame.dt) *
          Math.exp(-frame.dt * 0.12);
        p[k + 3] =
          (p[k + 3] + ((dy / dist) * force + (dx / dist) * 28) * frame.dt) *
          Math.exp(-frame.dt * 0.12);
        p[k] += p[k + 2] * frame.dt;
        p[k + 1] += p[k + 3] * frame.dt;
        if (Math.hypot(p[k] - 500, p[k + 1] - 325) > 850) {
          p[k] = 500 + Math.cos(seed * 100) * 400;
          p[k + 1] = 325 + Math.sin(seed * 100) * 300;
        }
      } else {
        p[k + 1] += (10 + seed * 58) * frame.dt;
        if (p[k + 1] > 655) p[k + 1] = -5;
      }
      c.fillStyle = seed > 0.9 ? '#c2bdff' : '#8b6fb2';
      c.globalAlpha = frame.mode === 2 ? 0.35 : 0.06 + seed ** 8 * 0.6;
      const size = 0.5 + seed * 1.5;
      c.fillRect(p[k], p[k + 1], size, size);
    }
    c.globalAlpha = 1;
    for (const s of sprites) {
      c.save();
      c.translate(s.x, s.y);
      c.rotate(s.rotation || 0);
      const rgb = s.color.slice(0, 3).map((v) => Math.min(255, Math.round(v * 255)));
      c.strokeStyle = `rgba(${rgb},${s.color[3]})`;
      c.fillStyle = `rgba(${rgb},${s.color[3] * 0.13})`;
      c.shadowColor = `rgb(${rgb})`;
      c.shadowBlur = frame.glow * 18;
      c.lineWidth = 1.5;
      c.beginPath();
      if (s.kind === 1) {
        for (let j = 0; j <= 10; j++) {
          const a = (j / 10) * Math.PI * 2,
            r = 0.76 + 0.1 * Math.cos(a * 7 + (s.extra || 0)) + 0.055 * Math.sin(a * 3);
          const x = Math.cos(a) * s.rx * r,
            y = Math.sin(a) * s.ry * r;
          if (j === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
      } else if (s.kind === 2) {
        c.moveTo(0, -s.ry * 0.85);
        c.lineTo(s.rx * 0.8, s.ry * 0.75);
        c.lineTo(0, s.ry * 0.24);
        c.lineTo(-s.rx * 0.8, s.ry * 0.75);
        c.closePath();
      } else if (s.kind === 3) {
        c.moveTo(0, -s.ry * 0.8);
        c.lineTo(s.rx * 0.8, 0);
        c.lineTo(0, s.ry * 0.8);
        c.lineTo(-s.rx * 0.8, 0);
        c.closePath();
      } else if (s.kind === 4 || s.kind === 6)
        c.roundRect(-s.rx * 0.93, -s.ry * 0.85, s.rx * 1.86, s.ry * 1.7, 3);
      else c.ellipse(0, 0, s.rx * 0.72, s.ry * 0.72, 0, 0, Math.PI * 2);
      if (s.kind !== 5) c.fill();
      c.stroke();
      c.restore();
    }
    c.globalCompositeOperation = 'source-over';
  }
}
