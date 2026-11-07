import { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty, GameInput, GameSnapshot } from '../core/types';
import { MeteorGame } from '../games/meteor';
import { WebGPURenderer, WORLD } from '../engine/renderer';
import { GameAudio } from '../engine/audio';
import { readBest, saveBest } from '../core/storage';

export const PARTICLE_COUNTS = [2048, 8192, 16384, 32768];
const STEP = 1 / 120;
const emptyInput = (): GameInput => ({
  x: 0,
  y: 0,
  pointer: { x: 500, y: 325 },
  pointerControl: false,
  dash: false,
});

export function usePlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    stageRef = useRef<HTMLDivElement>(null);
  const [initialSimulation] = useState(() => new MeteorGame());
  const rendererRef = useRef<WebGPURenderer | null>(null),
    simRef = useRef(initialSimulation);
  const audioRef = useRef<GameAudio | null>(null),
    inputRef = useRef(emptyInput());
  const currentRef = useRef({
    particles: 16384,
    glow: 0.75,
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [snapshot, setSnapshot] = useState<GameSnapshot>(simRef.current.snapshot());
  const [engine, setEngine] = useState<'loading' | 'webgpu' | 'error'>('loading');
  const [engineReason, setEngineReason] = useState('');
  const [stats, setStats] = useState({ fps: 0, particles: 16384, draws: 0 });
  const [particles, setParticles] = useState(2),
    [glow, setGlow] = useState(75),
    [sound, setSound] = useState(false);
  const [best, setBest] = useState(readBest),
    [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);
  const focus = useCallback(() => {
    canvasRef.current?.focus({ preventScroll: true });
  }, []);
  const start = useCallback(() => {
    if (!rendererRef.current) return;
    simRef.current.start();
    inputRef.current = emptyInput();
    setSnapshot(simRef.current.snapshot());
    focus();
  }, [focus]);
  const togglePause = useCallback(() => {
    if (!rendererRef.current) return;
    const s = simRef.current;
    if (s.phase === 'running') s.phase = 'paused';
    else if (s.phase === 'paused') s.phase = 'running';
    setSnapshot(s.snapshot());
    focus();
  }, [focus]);
  const pause = useCallback(() => {
    inputRef.current = emptyInput();
    if (simRef.current.phase === 'running') {
      simRef.current.phase = 'paused';
      setSnapshot(simRef.current.snapshot());
    }
  }, []);
  const changeDifficulty = useCallback(
    (value: Difficulty) => {
      setDifficulty(value);
      simRef.current = new MeteorGame(value);
      inputRef.current = emptyInput();
      setSnapshot(simRef.current.snapshot());
      notify('难度已更新，开始一局新挑战吧');
    },
    [notify],
  );
  const changeParticles = useCallback((value: number) => {
    setParticles(value);
    currentRef.current.particles = PARTICLE_COUNTS[value];
    rendererRef.current?.setCount(PARTICLE_COUNTS[value]);
  }, []);
  const changeGlow = useCallback((value: number) => {
    setGlow(value);
    currentRef.current.glow = value / 100;
  }, []);
  const toggleSound = useCallback(async () => {
    try {
      const next = !audioRef.current?.enabled;
      await audioRef.current?.enable(next);
      setSound(next);
    } catch {
      setSound(false);
      notify('浏览器暂时无法开启音效');
    }
  }, [notify]);
  const reset = useCallback(() => {
    rendererRef.current?.resetParticles();
    start();
  }, [start]);
  const fullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stageRef.current?.requestFullscreen) await stageRef.current.requestFullscreen();
      else notify('当前浏览器暂不支持全屏');
      focus();
    } catch {
      notify('当前浏览器未能进入全屏');
    }
  }, [focus, notify]);

  useEffect(() => {
    let disposed = false,
      stopped = false,
      raf = 0,
      last = 0,
      accumulator = 0,
      statTime = 0,
      uiTime = 0,
      frames = 0;
    let observer: ResizeObserver | undefined;
    const audio = new GameAudio();
    audioRef.current = audio;
    const keys = new Set<string>();
    const stage = stageRef.current!;
    const fail = (reason: string) => {
      if (disposed || stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      pause();
      rendererRef.current?.destroy();
      rendererRef.current = null;
      setEngine('error');
      setEngineReason(reason);
      setStats({ fps: 0, particles: 0, draws: 0 });
    };
    const initialize = async () => {
      try {
        const renderer = await WebGPURenderer.create(canvasRef.current!, fail);
        if (disposed || stopped) {
          renderer.destroy();
          return;
        }
        rendererRef.current = renderer;
        renderer.setCount(currentRef.current.particles);
        observer = new ResizeObserver(() => rendererRef.current?.resize());
        observer.observe(stage);
        setEngine('webgpu');
        raf = requestAnimationFrame(frame);
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    };
    function frame(now: number) {
      if (disposed || stopped) return;
      const elapsed = last ? (now - last) / 1000 : 0;
      const dt = Math.min(elapsed, 0.05);
      last = now;
      const s = simRef.current,
        r = rendererRef.current!;
      const input = inputRef.current;
      input.x =
        Number(keys.has('d') || keys.has('arrowright')) -
        Number(keys.has('a') || keys.has('arrowleft'));
      input.y =
        Number(keys.has('s') || keys.has('arrowdown')) -
        Number(keys.has('w') || keys.has('arrowup'));
      if (s.phase === 'running') {
        accumulator += dt;
        while (accumulator >= STEP) {
          s.update(STEP, input);
          input.dash = false;
          accumulator -= STEP;
          for (const event of s.events.splice(0)) {
            audio.play(event);
            if (event === 'hit' && s.phase === 'running') notify('护盾受损！短暂无敌，继续前进');
            if (event === 'win' || event === 'lose') {
              setBest(saveBest(s.snapshot().score));
              setSnapshot(s.snapshot());
            }
          }
        }
      } else {
        accumulator = 0;
        if (s.phase === 'ready') s.preview(dt);
      }
      const sprites = s.getSprites(now / 1000);
      try {
        r.render(
          {
            time: now / 1000,
            dt: s.phase === 'paused' ? 0 : dt,
            glow: currentRef.current.glow,
          },
          sprites,
        );
      } catch (error) {
        fail('WebGPU 渲染失败：' + String(error) + '。请刷新页面重试。');
        return;
      }
      frames++;
      statTime += elapsed;
      uiTime += dt;
      if (uiTime >= 0.1) {
        setSnapshot(s.snapshot());
        uiTime = 0;
      }
      if (statTime >= 0.6) {
        setStats({ fps: Math.round(frames / statTime), particles: r.count, draws: r.drawCalls });
        frames = 0;
        statTime = 0;
      }
      raf = requestAnimationFrame(frame);
    }
    const onKey = (e: KeyboardEvent) => {
      if (
        !rendererRef.current ||
        document.querySelector('dialog[open]') ||
        (e.target instanceof Element && e.target.closest('input,button,a,textarea,select'))
      )
        return;
      const key = e.key.toLowerCase();
      if (
        [
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          ' ',
          'w',
          'a',
          's',
          'd',
          'p',
          'r',
          'enter',
        ].includes(key)
      )
        e.preventDefault();
      keys.add(key);
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key))
        inputRef.current.pointerControl = false;
      if (e.repeat) return;
      if (key === 'enter' && ['ready', 'over', 'won'].includes(simRef.current.phase)) start();
      if (key === 'p' || key === 'escape') togglePause();
      if (key === 'r') reset();
      if (key === ' ') inputRef.current.dash = true;
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    let pointerDown = false;
    const updatePointer = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      inputRef.current.pointer = {
        x: ((e.clientX - rect.left) / rect.width) * WORLD.width,
        y: ((e.clientY - rect.top) / rect.height) * WORLD.height,
      };
      inputRef.current.pointerControl = true;
    };
    const down = (e: PointerEvent) => {
      if (!rendererRef.current || !(e.target instanceof HTMLCanvasElement)) return;
      pointerDown = true;
      updatePointer(e);
      inputRef.current.dash = true;
      stage.setPointerCapture(e.pointerId);
      focus();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || pointerDown) updatePointer(e);
    };
    const up = () => {
      pointerDown = false;
    };
    const blur = () => {
      keys.clear();
      pointerDown = false;
      pause();
      last = 0;
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('lostpointercapture', up);
    void initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      rendererRef.current?.destroy();
      rendererRef.current = null;
      audio.destroy();
      clearTimeout(toastTimer.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      stage.removeEventListener('lostpointercapture', up);
    };
  }, [focus, notify, pause, reset, start, togglePause]);

  return {
    canvasRef,
    stageRef,
    difficulty,
    snapshot,
    engine,
    engineReason,
    stats,
    particles,
    glow,
    sound,
    best,
    toast,
    start,
    togglePause,
    pause,
    changeDifficulty,
    changeParticles,
    changeGlow,
    toggleSound,
    reset,
    fullscreen,
  };
}
export type Playground = ReturnType<typeof usePlayground>;
