import type { GameEvent } from '../core/types';

export class GameAudio {
  private context?: AudioContext;
  enabled = false;
  async enable(enabled: boolean) {
    if (enabled) {
      this.context ??= new AudioContext();
      await this.context.resume();
    }
    this.enabled = enabled;
  }
  play(event: GameEvent) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context,
      now = ctx.currentTime;
    const frequencies: Record<GameEvent, number> = {
      collect: 780,
      hit: 110,
      dash: 220,
      win: 980,
      lose: 130,
    };
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = event === 'hit' || event === 'lose' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(frequencies[event], now);
    osc.frequency.exponentialRampToValueAtTime(
      frequencies[event] * (event === 'win' || event === 'collect' ? 1.8 : 0.5),
      now + 0.16,
    );
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  destroy() {
    void this.context?.close();
  }
}
