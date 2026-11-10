import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebGPURenderer } from './renderer';

const canvas = {} as HTMLCanvasElement;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('WebGPU renderer lifecycle', () => {
  it('requires WebGPU and explains how to enable it', async () => {
    vi.stubGlobal('navigator', {});
    await expect(WebGPURenderer.create(canvas, vi.fn())).rejects.toThrow(
      /启用 WebGPU 和硬件加速.*localhost.*HTTPS/,
    );
  });

  it('reports an unavailable adapter instead of creating another renderer', async () => {
    const requestAdapter = vi.fn().mockResolvedValue(null);
    vi.stubGlobal('navigator', { gpu: { requestAdapter } });
    await expect(WebGPURenderer.create(canvas, vi.fn())).rejects.toThrow(
      /没有可用的 WebGPU 适配器.*启用 WebGPU/,
    );
    expect(requestAdapter).toHaveBeenCalledOnce();
  });

  it('preserves device request diagnostics', async () => {
    vi.stubGlobal('navigator', {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({
          requestDevice: vi.fn().mockRejectedValue(new Error('device request denied')),
        }),
      },
    });
    await expect(WebGPURenderer.create(canvas, vi.fn())).rejects.toThrow('device request denied');
  });

  it('destroys the device if shader or pipeline initialization fails', async () => {
    const device = { destroy: vi.fn() };
    vi.stubGlobal('navigator', {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({
          requestDevice: vi.fn().mockResolvedValue(device),
        }),
      },
    });
    vi.spyOn(WebGPURenderer.prototype, 'initialize').mockRejectedValue(new Error('WGSL error'));
    await expect(WebGPURenderer.create(canvas, vi.fn())).rejects.toThrow('WGSL error');
    expect(device.destroy).toHaveBeenCalledOnce();
  });

  it.each(['unknown', 'destroyed'] as const)(
    'reports unexpected device loss but not intentional destruction (%s)',
    async (reason) => {
      type LostInfo = Pick<GPUDeviceLostInfo, 'reason' | 'message'>;
      let resolveLost!: (info: LostInfo) => void;
      const lost = new Promise<LostInfo>((resolve) => {
        resolveLost = resolve;
      });
      const device = Object.assign(new EventTarget(), { destroy: vi.fn(), lost });
      vi.stubGlobal('navigator', {
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue({
            requestDevice: vi.fn().mockResolvedValue(device),
          }),
        },
      });
      vi.spyOn(WebGPURenderer.prototype, 'initialize').mockResolvedValue();
      const onError = vi.fn();
      const renderer = await WebGPURenderer.create(canvas, onError);
      resolveLost({ reason, message: 'GPU disconnected' });
      await lost;
      if (reason === 'destroyed') expect(onError).not.toHaveBeenCalled();
      else
        expect(onError).toHaveBeenCalledExactlyOnceWith(
          'GPU 连接已中断：GPU disconnected。请刷新页面重试。',
        );
      renderer.destroy();
      expect(device.destroy).toHaveBeenCalledOnce();
    },
  );

  it('forwards asynchronous errors and removes the listener on destruction', async () => {
    const device = Object.assign(new EventTarget(), {
      destroy: vi.fn(),
      lost: new Promise(() => {}),
    });
    vi.stubGlobal('navigator', {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({
          requestDevice: vi.fn().mockResolvedValue(device),
        }),
      },
    });
    vi.spyOn(WebGPURenderer.prototype, 'initialize').mockResolvedValue();
    const onError = vi.fn();
    const renderer = await WebGPURenderer.create(canvas, onError);
    const event = () =>
      Object.assign(new Event('uncapturederror'), { error: { message: 'invalid GPU command' } });

    device.dispatchEvent(event());
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      'WebGPU 运行错误：invalid GPU command。请刷新页面重试。',
    );
    renderer.destroy();
    device.dispatchEvent(event());
    renderer.destroy();
    expect(onError).toHaveBeenCalledOnce();
    expect(device.destroy).toHaveBeenCalledOnce();
  });

  it('packs particle positions and seeds into 16-byte records', () => {
    const writeBuffer = vi.fn();
    const renderer = new WebGPURenderer(canvas, {
      queue: { writeBuffer },
    } as unknown as GPUDevice);
    renderer.resetParticles();
    const data = writeBuffer.mock.calls[0][2] as Float32Array;
    expect(data.byteLength).toBe(32768 * 16);
    for (const i of [0, data.length - 4]) {
      expect(data[i]).toBeGreaterThanOrEqual(0);
      expect(data[i]).toBeLessThanOrEqual(1000);
      expect(data[i + 1]).toBeGreaterThanOrEqual(0);
      expect(data[i + 1]).toBeLessThanOrEqual(650);
      expect(data[i + 2]).toBeGreaterThanOrEqual(0);
      expect(data[i + 2]).toBeLessThanOrEqual(1);
      expect(data[i + 3]).toBe(0);
    }
  });
});
