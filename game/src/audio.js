// NEON BREAKER — audio: every sound is synthesized live with WebAudio, no
// audio files. The context is created lazily on the first user gesture (the
// browser will not let it start before that), and every call is a no-op
// until then, so the game is silent but never crashes on first load.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Create (or resume) the audio context. Call from a user gesture.
  ensure() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null; // audio unavailable: the game stays silent
    }
  }

  // One oscillator blip, sliding from freqA to freqB over `seconds`.
  tone(freqA, freqB, seconds, type = 'square', volume = 1) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, freqA), t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t0 + seconds);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.02);
    } catch {
      // ignore: a failed blip must never break the game
    }
  }

  // A short burst of filtered noise (the brick-break crunch).
  noise(seconds, volume = 1, freq = 1800) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 0.8;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    } catch {
      // ignore
    }
  }

  paddle() { this.tone(320, 520, 0.07, 'square', 0.5); }
  wall() { this.tone(220, 300, 0.05, 'square', 0.35); }
  brick() { this.noise(0.12, 0.7, 2200); this.tone(700, 180, 0.1, 'triangle', 0.4); }
  steel() { this.tone(140, 90, 0.08, 'sawtooth', 0.4); }
  powerup() {
    this.tone(523, 523, 0.09, 'sine', 0.6);
    setTimeout(() => this.tone(659, 659, 0.09, 'sine', 0.6), 80);
    setTimeout(() => this.tone(784, 784, 0.14, 'sine', 0.6), 160);
  }
  laser() { this.tone(1200, 300, 0.12, 'sawtooth', 0.35); }
  loseLife() { this.tone(400, 70, 0.45, 'sawtooth', 0.6); }
  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.16, 'triangle', 0.6), i * 110));
  }
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.tone(f, f, 0.2, 'triangle', 0.6), i * 130));
  }
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, f * 0.8, 0.22, 'sawtooth', 0.5), i * 160));
  }
}
