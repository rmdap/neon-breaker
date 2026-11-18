// NEON BREAKER — particles and screen shake: the juice. Bricks burst into
// glowing shards, power-ups trail sparks, and big breaks kick the camera.
// Nothing here knows about the game rules; it only spawns, moves and draws.

import { CONFIG } from './config.js';

export class Particles {
  constructor() {
    this.list = [];
    this.shake = 0; // current shake magnitude, decays every frame
    this.shakeX = 0;
    this.shakeY = 0;
  }

  // A burst of shards at (x, y) in the given colour.
  burst(x, y, color, count = CONFIG.PARTICLES_PER_BRICK, speed = 260) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.9);
      this.list.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 60,
        life: CONFIG.PARTICLE_LIFE * (0.6 + Math.random() * 0.7),
        maxLife: CONFIG.PARTICLE_LIFE,
        size: 2 + Math.random() * 4,
        color,
        gravity: 520,
      });
    }
  }

  // A short sparkle trail (used by falling power-ups).
  sparkle(x, y, color) {
    this.list.push({
      x, y,
      vx: (Math.random() - 0.5) * 40,
      vy: 30 + Math.random() * 40,
      life: 0.35,
      maxLife: 0.35,
      size: 2 + Math.random() * 2,
      color,
      gravity: 0,
    });
  }

  // Kick the camera; bigger breaks kick harder.
  kick(amount) {
    this.shake = Math.min(CONFIG.SHAKE_MAX, this.shake + amount);
  }

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 1.2 * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    this.shake = Math.max(0, this.shake - 26 * dt);
    this.shakeX = (Math.random() * 2 - 1) * this.shake;
    this.shakeY = (Math.random() * 2 - 1) * this.shake;
  }

  draw(ctx) {
    for (const p of this.list) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
