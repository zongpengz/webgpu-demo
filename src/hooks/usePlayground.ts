import { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty, GameId, GameInput, GameSnapshot, Renderer } from '../core/types';
import { createGame } from '../games';
import { CanvasRenderer, WebGPURenderer } from '../engine/renderer';
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
    fallbackRef = useRef<HTMLCanvasElement>(null),
    stageRef = useRef<HTMLDivElement>(null);
  const [initialSimulation] = useState(() => createGame('meteor', 'normal'));
  const rendererRef = useRef<Renderer | null>(null),
    simRef = useRef(initialSimulation);
  const audioRef = useRef<GameAudio | null>(null),
    inputRef = useRef(emptyInput());
  const currentRef = useRef({
    game: 'meteor' as GameId,
    difficulty: 'normal' as Difficulty,
    particles: 16384,
    glow: 0.75,
  });
  const [game, setGame] = useState<GameId>('meteor'),
    [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [snapshot, setSnapshot] = useState<GameSnapshot>(simRef.current.snapshot());
  const [engine, setEngine] = useState<'loading' | 'webgpu' | 'canvas' | 'error'>('loading');
  const [engineReason, setEngineReason] = useState('');
  const [stats, setStats] = useState({ fps: 0, particles: 16384, draws: 0 });
  const [particles, setParticles] = useState(2),
    [glow, setGlow] = useState(75),
    [sound, setSound] = useState(false);
  const [best, setBest] = useState(() => readBest('meteor')),
    [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);
  const focus = useCallback(() => {
    (rendererRef.current?.kind === 'canvas' ? fallbackRef.current : canvasRef.current)?.focus({
      preventScroll: true,
    });
  }, []);
  const start = useCallback(() => {
    if (!rendererRef.current) return;
    simRef.current.start();
    inputRef.current = emptyInput();
    setSnapshot(simRef.current.snapshot());
    focus();
    if (currentRef.current.game === 'breakout') notify('按空格或点击画面发球');
  }, [focus, notify]);
  const togglePause = useCallback(() => {
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
  const selectGame = useCallback((id: GameId) => {
    currentRef.current.game = id;
    simRef.current = createGame(id, currentRef.current.difficulty);
    inputRef.current = emptyInput();
    rendererRef.current?.resetParticles();
    setGame(id);
    setBest(readBest(id));
    setSnapshot(simRef.current.snapshot());
    setToast('');
  }, []);
  const changeDifficulty = useCallback(
    (value: Difficulty) => {
      currentRef.current.difficulty = value;
      setDifficulty(value);
      simRef.current = createGame(currentRef.current.game, value);
      inputRef.current = emptyInput();
      setSnapshot(simRef.current.snapshot());
      notify('难度已更新，开始一局新挑战吧');
    },
    [notify],
  );
  const changeParticles = useCallback(
    (value: number) => {
      setParticles(value);
      currentRef.current.particles = PARTICLE_COUNTS[value];
      rendererRef.current?.setCount(PARTICLE_COUNTS[value]);
      if (rendererRef.current?.kind === 'canvas')
        notify('兼容预览最多显示 2,048 颗粒子；WebGPU 模式支持 32K');
    },
    [notify],
  );
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
    if (currentRef.current.game === 'gravity') notify('粒子轨道已重置');
  }, [start, notify]);
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
    const fallback = (reason: string) => {
      rendererRef.current?.destroy();
      const r = new CanvasRenderer(fallbackRef.current!);
      rendererRef.current = r;
      r.setCount(currentRef.current.particles);
      setEngine('canvas');
      setEngineReason(reason);
    };
    const initialize = async () => {
      try {
        const renderer = await WebGPURenderer.create(canvasRef.current!, (message) => {
          if (!disposed) {
            pause();
            fallback('GPU 连接已中断：' + message);
            notify('GPU 连接中断，已切换到兼容预览');
          }
        });
        if (disposed) {
          renderer.destroy();
          return;
        }
        rendererRef.current = renderer;
        setEngine('webgpu');
      } catch (error) {
        if (disposed) return;
        console.info('[GPU Lab] 使用兼容预览:', error);
        try {
          fallback(error instanceof Error ? error.message : String(error));
        } catch {
          setEngine('error');
          setEngineReason('无法创建画布，请使用支持 Canvas 的浏览器');
          return;
        }
      }
      rendererRef.current!.setCount(currentRef.current.particles);
      observer = new ResizeObserver(() => rendererRef.current?.resize());
      observer.observe(stage);
      raf = requestAnimationFrame(frame);
    };
    function frame(now: number) {
      if (disposed) return;
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
            if (event === 'hit' && s.phase === 'running')
              notify(
                currentRef.current.game === 'breakout'
                  ? '光球丢失，按空格或点击重新发球'
                  : '护盾受损！短暂无敌，继续前进',
              );
            if (event === 'win' || event === 'lose') {
              setBest(saveBest(currentRef.current.game, s.snapshot().score));
              setSnapshot(s.snapshot());
            }
          }
        }
      } else {
        accumulator = 0;
        if (s.phase === 'ready') s.preview(dt);
      }
      const sprites = s.getSprites(now / 1000);
      const mode =
        currentRef.current.game === 'gravity' ? 2 : currentRef.current.game === 'breakout' ? 1 : 0;
      if (mode === 2 && pointerDown && s.phase === 'running')
        sprites.push({ ...input.pointer, rx: 24, ry: 24, color: [0.8, 0.65, 1, 0.5], kind: 5 });
      try {
        r.render(
          {
            time: now / 1000,
            dt: s.phase === 'paused' ? 0 : dt,
            mode,
            pointer: input.pointer,
            pressed: pointerDown && s.phase === 'running',
            glow: currentRef.current.glow,
          },
          sprites,
        );
      } catch (error) {
        if (r.kind === 'webgpu') {
          pause();
          fallback(String(error));
        } else {
          setEngine('error');
          setEngineReason(String(error));
          return;
        }
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
        x: ((e.clientX - rect.left) / rect.width) * 1000,
        y: ((e.clientY - rect.top) / rect.height) * 650,
      };
      inputRef.current.pointerControl = true;
    };
    const down = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
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
    fallbackRef,
    stageRef,
    game,
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
    selectGame,
    changeDifficulty,
    changeParticles,
    changeGlow,
    toggleSound,
    reset,
    fullscreen,
  };
}
export type Playground = ReturnType<typeof usePlayground>;
