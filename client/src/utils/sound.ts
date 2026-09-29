// Web Audio API sound generator for tactile chess sound effects
class ChessSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch {
      // Audio not supported or blocked
    }
    return this.ctx;
  }

  private ensureContext(): AudioContext | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private masterVolume: number = 0.28; // Subtle, gentle ambient volume

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public playMove() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.06);

    const baseGain = 0.07 * this.masterVolume;
    gain.gain.setValueAtTime(baseGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  public playCapture() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state === 'suspended') return;

    // Gentle soft punch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.09);

    const baseGain = 0.1 * this.masterVolume;
    gain.gain.setValueAtTime(baseGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  public playCheck() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state === 'suspended') return;

    const t = ctx.currentTime;
    [580, 780].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      const baseGain = 0.06 * this.masterVolume;
      gain.gain.setValueAtTime(baseGain, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.09);
    });
  }

  public playCastle() {
    this.playMove();
    setTimeout(() => this.playMove(), 70);
  }

  public playBlunder() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state === 'suspended') return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    const baseGain = 0.08 * this.masterVolume;
    gain.gain.setValueAtTime(baseGain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  public playBrilliant() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state === 'suspended') return;

    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      const baseGain = 0.05 * this.masterVolume;
      gain.gain.setValueAtTime(baseGain, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.05 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.17);
    });
  }
}

export const sounds = new ChessSoundEngine();
