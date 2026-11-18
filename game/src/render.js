// NEON BREAKER — render: everything the player sees. The background grid,
// bricks, paddle, balls, power-ups, particles, the HUD and every screen
// (title, pause, level clear, win, game over). It reads the game, never
// changes it — except for `layout`, the button rectangles the game needs
// for clicks, which the renderer owns because it places the buttons.

import { CONFIG } from './config.js';
import { STATES } from './game.js';
import { LEVEL_NAMES } from './levels.js';

const BUTTON_W = 300;
const BUTTON_H = 64;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowText(ctx, text, x, y, font, color, glowColor, glow = 18) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.save();
    // Screen shake: the whole scene jitters by the particle system's offset.
    ctx.translate(game.particles.shakeX, game.particles.shakeY);
    this.drawBackground(game);
    if (game.state !== STATES.START) {
      this.drawBricks(game);
      this.drawPowerups(game);
      this.drawBolts(game);
      this.drawPaddle(game);
      this.drawBalls(game);
    }
    game.particles.draw(ctx);
    ctx.restore();
    this.drawHUD(game);
    if (game.state === STATES.START) this.drawStart(game);
    else if (game.state === STATES.PAUSED) this.drawPause(game);
    else if (game.state === STATES.LEVEL_CLEAR) this.drawLevelClear(game);
    else if (game.state === STATES.WIN) this.drawWin(game);
    else if (game.state === STATES.GAME_OVER) this.drawGameOver(game);
    else if (game.state === STATES.SERVING) this.drawServeHint(game);
  }

  drawBackground(game) {
    const ctx = this.ctx;
    const { WIDTH, HEIGHT } = CONFIG;
    ctx.fillStyle = CONFIG.COLORS.background;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);
    // Faint perspective grid.
    ctx.strokeStyle = CONFIG.COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 64) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
    }
    for (let y = 0; y <= HEIGHT; y += 64) {
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
    }
    ctx.stroke();
    // Soft neon glow blobs, top corners.
    const glow = (x, y, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 320);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 320, y - 320, 640, 640);
    };
    glow(80, 40, 'rgba(34, 230, 255, 0.10)');
    glow(WIDTH - 80, 40, 'rgba(255, 46, 136, 0.10)');
    // A thin neon frame.
    ctx.strokeStyle = 'rgba(34, 230, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, WIDTH - 12, HEIGHT - 12);
  }

  drawBricks(game) {
    const ctx = this.ctx;
    for (const b of game.bricks) {
      if (!b.alive) continue;
      const isSteel = b.type === 'steel';
      ctx.save();
      ctx.shadowColor = isSteel ? '#c8d2ea' : b.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.color;
      roundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Cracked look for damaged multi-hit bricks.
      if (!isSteel && b.hp < b.maxHp) {
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w * 0.2, b.y + 4);
        ctx.lineTo(b.x + b.w * 0.5, b.y + b.h / 2);
        ctx.lineTo(b.x + b.w * 0.35, b.y + b.h - 4);
        ctx.stroke();
      }
      if (isSteel) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STEEL', b.x + b.w / 2, b.y + b.h / 2 + 1);
      } else if (b.maxHp > 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.hp), b.x + b.w / 2, b.y + b.h / 2 + 1);
      }
      ctx.restore();
    }
  }

  drawPaddle(game) {
    const ctx = this.ctx;
    const p = game.paddle;
    ctx.save();
    ctx.shadowColor = CONFIG.COLORS.paddle;
    ctx.shadowBlur = 16;
    const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y);
    grad.addColorStop(0, '#22e6ff');
    grad.addColorStop(0.5, '#7df3ff');
    grad.addColorStop(1, '#22e6ff');
    ctx.fillStyle = grad;
    roundRect(ctx, p.x, p.y, p.w, p.h, 8);
    ctx.fill();
    ctx.restore();
    // Laser tips while the laser is active.
    if (game.timers.laser > 0) {
      ctx.fillStyle = CONFIG.COLORS.neonGold;
      ctx.fillRect(p.x + 10, p.y - 10, 8, 10);
      ctx.fillRect(p.x + p.w - 18, p.y - 10, 8, 10);
    }
  }

  drawBalls(game) {
    const ctx = this.ctx;
    for (const ball of game.balls) {
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = CONFIG.COLORS.ball;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawPowerups(game) {
    const ctx = this.ctx;
    for (const pu of game.powerups) {
      const def = CONFIG.POWERUPS[pu.key];
      ctx.save();
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(7,10,26,0.9)';
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.key, pu.x, pu.y + 1);
      ctx.restore();
    }
  }

  drawBolts(game) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = CONFIG.COLORS.neonGold;
    ctx.shadowBlur = 10;
    ctx.fillStyle = CONFIG.COLORS.neonGold;
    for (const bolt of game.bolts) {
      ctx.fillRect(bolt.x - CONFIG.LASER_WIDTH / 2, bolt.y, CONFIG.LASER_WIDTH, CONFIG.LASER_HEIGHT);
    }
    ctx.restore();
  }

  // ---- HUD --------------------------------------------------------------

  drawHUD(game) {
    const ctx = this.ctx;
    const { WIDTH } = CONFIG;
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.COLORS.white;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${String(game.score).padStart(6, '0')}`, 28, 34);
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${game.level} — ${game.levelName}`, WIDTH / 2, 34);
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${String(Math.max(game.highScore, game.score)).padStart(6, '0')}`, WIDTH - 28, 34);
    // Lives as hearts.
    ctx.textAlign = 'left';
    ctx.font = '22px monospace';
    let hearts = '';
    for (let i = 0; i < CONFIG.MAX_LIVES; i++) hearts += i < game.lives ? '♥ ' : '♡ ';
    ctx.fillStyle = CONFIG.COLORS.neonPink;
    ctx.fillText(hearts.trim(), 28, 66);
    // Combo badge.
    if (game.combo >= 2) {
      ctx.textAlign = 'right';
      ctx.fillStyle = CONFIG.COLORS.neonGold;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`COMBO x${Math.min(game.combo, CONFIG.COMBO_MAX_MULT)}`, WIDTH - 28, 66);
    }
    // Active effects.
    const effects = game.activeEffects;
    if (effects.length > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = CONFIG.COLORS.neonGreen;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(effects.join('   '), WIDTH / 2, 66);
    }
    ctx.restore();
  }

  // ---- screens ------------------------------------------------------------

  // A dark panel behind the stats block of the win / game-over screens, so
  // the white text never has to fight the bricks showing through.
  drawStatsPanel(y, height) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 18, 0.85)';
    roundRect(ctx, CONFIG.WIDTH / 2 - 360, y, 720, height, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 230, 255, 0.25)';
    ctx.lineWidth = 1;
    roundRect(ctx, CONFIG.WIDTH / 2 - 360, y, 720, height, 16);
    ctx.stroke();
    ctx.restore();
  }

  drawButton(game, rect, label) {
    const ctx = this.ctx;
    const hover = game.input.mouseX >= rect.x && game.input.mouseX <= rect.x + rect.w
      && game.input.mouseY >= rect.y && game.input.mouseY <= rect.y + rect.h;
    ctx.save();
    ctx.shadowColor = CONFIG.COLORS.neonCyan;
    ctx.shadowBlur = hover ? 26 : 14;
    ctx.fillStyle = hover ? '#0e2a3a' : '#0a1a2e';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = CONFIG.COLORS.neonCyan;
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.stroke();
    ctx.fillStyle = CONFIG.COLORS.neonCyan;
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.restore();
  }

  drawStart(game) {
    const ctx = this.ctx;
    const { WIDTH, HEIGHT } = CONFIG;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 18, 0.72)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    glowText(ctx, 'NEON', WIDTH / 2, 190, 'bold 110px monospace', CONFIG.COLORS.neonCyan, '#22e6ff', 30);
    glowText(ctx, 'BREAKER', WIDTH / 2, 292, 'bold 110px monospace', CONFIG.COLORS.neonPink, '#ff2e88', 30);
    ctx.fillStyle = CONFIG.COLORS.dim;
    ctx.font = '22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Smash every brick. Survive all three levels.', WIDTH / 2, 380);
    ctx.fillStyle = CONFIG.COLORS.white;
    ctx.font = '20px monospace';
    ctx.fillText('MOUSE or ← →  move the paddle      SPACE  launch / fire laser', WIDTH / 2, 428);
    ctx.fillText('P  pause      R  restart      M  mute', WIDTH / 2, 460);
    ctx.fillStyle = CONFIG.COLORS.neonGold;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Catch falling power-ups:  W wide   M multi-ball   S slow   L laser   + extra life', WIDTH / 2, 508);
    const rect = { x: WIDTH / 2 - BUTTON_W / 2, y: 552, w: BUTTON_W, h: BUTTON_H };
    game.layout = { ...(game.layout ?? {}), startButton: rect };
    this.drawButton(game, rect, '▶  START');
    ctx.restore();
  }

  drawServeHint(game) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = CONFIG.COLORS.white;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    glowText(ctx, 'CLICK OR PRESS SPACE TO LAUNCH', CONFIG.WIDTH / 2, 560, 'bold 22px monospace', CONFIG.COLORS.white, '#22e6ff', 10);
    ctx.restore();
  }

  drawPause(game) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 18, 0.66)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    glowText(ctx, 'PAUSED', CONFIG.WIDTH / 2, 330, 'bold 72px monospace', CONFIG.COLORS.white, '#22e6ff', 22);
    ctx.fillStyle = CONFIG.COLORS.dim;
    ctx.font = '22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press P to resume — R to restart', CONFIG.WIDTH / 2, 420);
    ctx.restore();
  }

  drawLevelClear(game) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 18, 0.55)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    glowText(ctx, 'LEVEL CLEAR!', CONFIG.WIDTH / 2, 300, 'bold 64px monospace', CONFIG.COLORS.neonGreen, '#39ff88', 24);
    ctx.fillStyle = CONFIG.COLORS.white;
    ctx.font = '26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Score ${game.score}  —  next up: ${LEVEL_NAMES[game.level % 3]}`, CONFIG.WIDTH / 2, 380);
    ctx.restore();
  }

  drawWin(game) {
    const ctx = this.ctx;
    const { WIDTH } = CONFIG;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 18, 0.88)';
    ctx.fillRect(0, 0, WIDTH, CONFIG.HEIGHT);
    this.drawStatsPanel(180, 440);
    glowText(ctx, 'YOU WIN!', WIDTH / 2, 220, 'bold 92px monospace', CONFIG.COLORS.neonGold, '#ffc233', 30);
    ctx.fillStyle = CONFIG.COLORS.white;
    ctx.font = '28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Final score  ${game.score}`, WIDTH / 2, 330);
    ctx.fillText(`Best combo  x${game.bestCombo}      Bricks smashed  ${game.bricksBroken}`, WIDTH / 2, 376);
    if (game.score >= game.highScore && game.score > 0) {
      ctx.fillStyle = CONFIG.COLORS.neonPink;
      ctx.font = 'bold 26px monospace';
      ctx.fillText('★ NEW HIGH SCORE ★', WIDTH / 2, 428);
    }
    const rect = { x: WIDTH / 2 - BUTTON_W / 2, y: 480, w: BUTTON_W, h: BUTTON_H };
    game.layout = { ...(game.layout ?? {}), againButton: rect };
    this.drawButton(game, rect, '↻  PLAY AGAIN');
    ctx.fillStyle = CONFIG.COLORS.dim;
    ctx.font = '20px monospace';
    ctx.fillText('or press R', WIDTH / 2, 580);
    ctx.restore();
  }

  drawGameOver(game) {
    const ctx = this.ctx;
    const { WIDTH } = CONFIG;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 18, 0.88)';
    ctx.fillRect(0, 0, WIDTH, CONFIG.HEIGHT);
    this.drawStatsPanel(180, 450);
    glowText(ctx, 'GAME OVER', WIDTH / 2, 220, 'bold 88px monospace', CONFIG.COLORS.neonPink, '#ff2e88', 28);
    ctx.fillStyle = CONFIG.COLORS.white;
    ctx.font = '28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Final score  ${game.score}`, WIDTH / 2, 330);
    ctx.fillText(`You reached level ${game.level} — ${game.levelName}`, WIDTH / 2, 376);
    ctx.fillText(`Best combo  x${game.bestCombo}      Bricks smashed  ${game.bricksBroken}`, WIDTH / 2, 420);
    const rect = { x: WIDTH / 2 - BUTTON_W / 2, y: 480, w: BUTTON_W, h: BUTTON_H };
    game.layout = { ...(game.layout ?? {}), againButton: rect };
    this.drawButton(game, rect, '↻  TRY AGAIN');
    ctx.fillStyle = CONFIG.COLORS.dim;
    ctx.font = '20px monospace';
    ctx.fillText('or press R', WIDTH / 2, 580);
    ctx.restore();
  }
}
