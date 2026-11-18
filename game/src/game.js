// NEON BREAKER — game: the rules and the state machine. Paddle and ball
// physics, brick collisions, power-ups, combo scoring, lives, levels and
// the win/lose flow. It knows nothing about drawing (render.js does that)
// or about the DOM (main.js wires it up).

import { CONFIG } from './config.js';
import { buildLevel, breakableCount, LEVEL_NAMES } from './levels.js';
import { Particles } from './particles.js';
import { SoundFX } from './audio.js';

export const STATES = {
  START: 'start',
  SERVING: 'serving', // ball stuck to the paddle, waiting for launch
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_CLEAR: 'levelclear',
  WIN: 'win',
  GAME_OVER: 'gameover',
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class Game {
  constructor(input) {
    this.input = input;
    this.particles = new Particles();
    this.sound = new SoundFX();
    this.state = STATES.START;
    this.stateTime = 0; // seconds spent in the current state
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.lives = CONFIG.START_LIVES;
    this.level = 1;
    this.combo = 0;
    this.bestCombo = 0;
    this.bricksBroken = 0;
    this.bricks = [];
    this.balls = [];
    this.powerups = [];
    this.bolts = [];
    this.timers = { wide: 0, slow: 0, laser: 0 }; // seconds left per effect
    this.paddle = this.freshPaddle();
    this.serveBall();
    this.buildCurrentLevel();
  }

  loadHighScore() {
    try {
      return Number(window.localStorage.getItem('neon-breaker-high') ?? 0) || 0;
    } catch {
      return 0;
    }
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        window.localStorage.setItem('neon-breaker-high', String(this.highScore));
      } catch {
        // storage unavailable: the score just lives for this session
      }
    }
  }

  freshPaddle() {
    return {
      x: CONFIG.WIDTH / 2 - CONFIG.PADDLE_WIDTH / 2,
      y: CONFIG.PADDLE_Y,
      w: CONFIG.PADDLE_WIDTH,
      h: CONFIG.PADDLE_HEIGHT,
    };
  }

  buildCurrentLevel() {
    this.bricks = buildLevel(this.level);
    this.bricksLeft = breakableCount(this.bricks);
  }

  serveBall() {
    this.balls = [{
      x: this.paddle.x + this.paddle.w / 2,
      y: this.paddle.y - CONFIG.BALL_RADIUS - 1,
      vx: 0,
      vy: 0,
      r: CONFIG.BALL_RADIUS,
      stuck: true,
    }];
  }

  ballSpeed() {
    const base = CONFIG.BALL_BASE_SPEED
      + (this.level - 1) * CONFIG.BALL_SPEED_PER_LEVEL
      + this.bricksBroken * CONFIG.BALL_SPEED_PER_BRICK;
    const slowed = this.timers.slow > 0 ? CONFIG.BALL_SLOW_MULT : 1;
    return Math.min(CONFIG.BALL_MAX_SPEED, base) * slowed;
  }

  // Launch the stuck ball at a slight random angle, and start playing.
  launchBall() {
    const ball = this.balls.find((b) => b.stuck);
    if (!ball) return;
    const speed = this.ballSpeed();
    const angle = (Math.random() - 0.5) * 0.6;
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
    ball.stuck = false;
    this.setState(STATES.PLAYING);
  }

  startGame() {
    this.score = 0;
    this.lives = CONFIG.START_LIVES;
    this.level = 1;
    this.combo = 0;
    this.bestCombo = 0;
    this.bricksBroken = 0;
    this.powerups = [];
    this.bolts = [];
    this.timers = { wide: 0, slow: 0, laser: 0 };
    this.paddle = this.freshPaddle();
    this.buildCurrentLevel();
    this.serveBall();
    this.state = STATES.SERVING;
    this.stateTime = 0;
  }

  nextLevel() {
    this.level += 1;
    this.combo = 0;
    this.powerups = [];
    this.bolts = [];
    this.paddle = this.freshPaddle();
    this.buildCurrentLevel();
    this.serveBall();
    this.state = STATES.SERVING;
    this.stateTime = 0;
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
  }

  // ---- per-frame update -------------------------------------------------

  update(dt) {
    this.stateTime += dt;
    this.particles.update(dt);
    if (this.state === STATES.PLAYING || this.state === STATES.SERVING) {
      this.updatePaddle(dt);
      this.updateTimers(dt);
      this.updatePowerups(dt);
      this.updateBolts(dt);
      if (this.state === STATES.PLAYING) {
        this.updateBalls(dt);
        this.checkLevelCleared();
      }
    }
    if (this.state === STATES.LEVEL_CLEAR && this.stateTime > 2.2) {
      if (this.level >= 3) {
        this.saveHighScore();
        this.sound.win();
        this.setState(STATES.WIN);
      } else {
        this.nextLevel();
      }
    }
  }

  updatePaddle(dt) {
    const wide = this.timers.wide > 0;
    const targetW = CONFIG.PADDLE_WIDTH * (wide ? CONFIG.PADDLE_WIDE_MULT : 1);
    // Smoothly grow/shrink toward the target width, centred on the paddle.
    const center = this.paddle.x + this.paddle.w / 2;
    this.paddle.w += (targetW - this.paddle.w) * Math.min(1, 10 * dt);
    this.paddle.x = center - this.paddle.w / 2;

    // Mouse steers the paddle to the pointer; arrow keys nudge it.
    if (this.input.mouseInside) {
      const target = this.input.mouseX - this.paddle.w / 2;
      this.paddle.x += (target - this.paddle.x) * Math.min(1, 22 * dt);
    }
    if (this.input.leftDown) this.paddle.x -= CONFIG.PADDLE_SPEED * dt;
    if (this.input.rightDown) this.paddle.x += CONFIG.PADDLE_SPEED * dt;
    this.paddle.x = clamp(this.paddle.x, 8, CONFIG.WIDTH - this.paddle.w - 8);

    // A stuck ball rides on the paddle.
    for (const ball of this.balls) {
      if (ball.stuck) {
        ball.x = this.paddle.x + this.paddle.w / 2;
        ball.y = this.paddle.y - ball.r - 1;
      }
    }
  }

  updateTimers(dt) {
    for (const key of Object.keys(this.timers)) {
      this.timers[key] = Math.max(0, this.timers[key] - dt);
    }
  }

  updateBalls(dt) {
    for (const ball of this.balls) {
      if (ball.stuck) continue;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      this.collideWalls(ball);
      this.collidePaddle(ball);
      this.collideBricks(ball);
    }
    // Balls that fell below the screen are gone.
    const before = this.balls.length;
    this.balls = this.balls.filter((b) => b.y - b.r < CONFIG.HEIGHT + 40);
    if (this.balls.length === 0 && before > 0) this.loseLife();
  }

  collideWalls(ball) {
    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
      this.sound.wall();
    } else if (ball.x + ball.r > CONFIG.WIDTH) {
      ball.x = CONFIG.WIDTH - ball.r;
      ball.vx = -Math.abs(ball.vx);
      this.sound.wall();
    }
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
      // Nudge the angle a little on every top-wall bounce: a near-vertical
      // ball can otherwise shuttle up and down one cleared column forever.
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.vx += (Math.random() - 0.5) * 90;
      const s = Math.hypot(ball.vx, ball.vy) || speed;
      ball.vx = (ball.vx / s) * speed;
      ball.vy = (ball.vy / s) * speed;
      this.sound.wall();
    }
  }

  collidePaddle(ball) {
    if (ball.vy <= 0) return;
    const p = this.paddle;
    if (
      ball.y + ball.r >= p.y && ball.y - ball.r <= p.y + p.h &&
      ball.x >= p.x - ball.r && ball.x <= p.x + p.w + ball.r
    ) {
      // Angle from where the ball hits the paddle: centre = straight up.
      // A small random jitter keeps the ball from ever falling into an
      // exact repeating loop that never finds the last bricks.
      const rel = clamp((ball.x - (p.x + p.w / 2)) / (p.w / 2), -1, 1);
      const speed = Math.hypot(ball.vx, ball.vy);
      const angle = rel * CONFIG.MAX_BOUNCE_ANGLE + (Math.random() - 0.5) * 0.12;
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      ball.y = p.y - ball.r - 0.5;
      this.combo = 0; // a paddle touch resets the combo
      this.sound.paddle();
    }
  }

  collideBricks(ball) {
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      if (
        ball.x + ball.r < brick.x || ball.x - ball.r > brick.x + brick.w ||
        ball.y + ball.r < brick.y || ball.y - ball.r > brick.y + brick.h
      ) continue;
      // Which side did the ball hit? Compare the overlap on each axis.
      const overlapX = Math.min(ball.x + ball.r - brick.x, brick.x + brick.w - (ball.x - ball.r));
      const overlapY = Math.min(ball.y + ball.r - brick.y, brick.y + brick.h - (ball.y - ball.r));
      if (overlapX < overlapY) ball.vx = -ball.vx;
      else ball.vy = -ball.vy;
      this.hitBrick(brick);
      return; // one brick per ball per frame keeps the physics stable
    }
  }

  hitBrick(brick) {
    if (brick.type === 'steel') {
      this.sound.steel();
      this.particles.burst(brick.x + brick.w / 2, brick.y + brick.h / 2, '#c8d2ea', 6, 140);
      return;
    }
    brick.hp -= 1;
    this.particles.burst(
      brick.x + brick.w / 2, brick.y + brick.h / 2,
      brick.color, brick.hp <= 0 ? CONFIG.PARTICLES_PER_BRICK : 6,
    );
    if (brick.hp > 0) {
      this.sound.steel();
      return;
    }
    brick.alive = false;
    this.bricksLeft -= 1;
    this.bricksBroken += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = Math.min(this.combo, CONFIG.COMBO_MAX_MULT);
    this.score += CONFIG.BRICK_SCORE * mult;
    this.particles.kick(brick.maxHp >= 2 ? 5 : 3);
    this.sound.brick();
    this.maybeDropPowerup(brick);
  }

  maybeDropPowerup(brick) {
    if (Math.random() > CONFIG.POWERUP_DROP_CHANCE) return;
    const keys = Object.keys(CONFIG.POWERUPS);
    // Extra life is rarer than the rest.
    let key = keys[Math.floor(Math.random() * keys.length)];
    if (key === '+' && Math.random() < 0.6) key = 'W';
    this.powerups.push({
      x: brick.x + brick.w / 2,
      y: brick.y + brick.h / 2,
      vy: CONFIG.POWERUP_FALL_SPEED,
      key,
      size: CONFIG.POWERUP_SIZE,
    });
  }

  updatePowerups(dt) {
    for (const p of this.powerups) {
      p.y += p.vy * dt;
      if (Math.random() < 0.3) this.particles.sparkle(p.x, p.y, CONFIG.POWERUPS[p.key].color);
    }
    // Caught by the paddle?
    const p = this.paddle;
    for (const pu of this.powerups) {
      if (
        pu.y + pu.size >= p.y && pu.y - pu.size <= p.y + p.h &&
        pu.x >= p.x - pu.size && pu.x <= p.x + p.w + pu.size
      ) {
        pu.caught = true;
        this.applyPowerup(pu.key);
      }
    }
    this.powerups = this.powerups.filter((pu) => !pu.caught && pu.y < CONFIG.HEIGHT + 30);
  }

  applyPowerup(key) {
    this.sound.powerup();
    switch (key) {
      case 'W':
        this.timers.wide = CONFIG.PADDLE_WIDE_SECONDS;
        break;
      case 'M': {
        const source = this.balls[0];
        if (!source) break;
        const speed = Math.hypot(source.vx, source.vy) || this.ballSpeed();
        for (const angle of [-0.5, 0.5]) {
          this.balls.push({
            x: source.x,
            y: source.y,
            vx: source.vx * Math.cos(angle) - source.vy * Math.sin(angle),
            vy: source.vx * Math.sin(angle) + source.vy * Math.cos(angle),
            r: CONFIG.BALL_RADIUS,
            stuck: false,
          });
        }
        // Normalise the new balls to the current speed.
        for (const b of this.balls) {
          if (b.stuck) continue;
          const s = Math.hypot(b.vx, b.vy);
          if (s > 0) {
            b.vx = (b.vx / s) * speed;
            b.vy = (b.vy / s) * speed;
          }
        }
        break;
      }
      case 'S':
        this.timers.slow = CONFIG.BALL_SLOW_SECONDS;
        break;
      case 'L':
        this.timers.laser = CONFIG.POWERUPS.L.seconds;
        break;
      case '+':
        this.lives = Math.min(CONFIG.MAX_LIVES, this.lives + 1);
        break;
      default:
        break;
    }
  }

  updateBolts(dt) {
    if (this.timers.laser <= 0) {
      this.bolts = [];
      return;
    }
    for (const bolt of this.bolts) bolt.y -= CONFIG.LASER_SPEED * dt;
    for (const bolt of this.bolts) {
      for (const brick of this.bricks) {
        if (!brick.alive) continue;
        if (
          bolt.x >= brick.x && bolt.x <= brick.x + brick.w &&
          bolt.y >= brick.y && bolt.y <= brick.y + brick.h
        ) {
          bolt.spent = true;
          this.hitBrick(brick);
          break;
        }
      }
    }
    this.bolts = this.bolts.filter((b) => !b.spent && b.y > -20);
  }

  fireLaser() {
    if (this.timers.laser <= 0 || this.state !== STATES.PLAYING) return;
    const p = this.paddle;
    this.bolts.push(
      { x: p.x + 14, y: p.y - CONFIG.LASER_HEIGHT },
      { x: p.x + p.w - 14, y: p.y - CONFIG.LASER_HEIGHT },
    );
    this.sound.laser();
  }

  loseLife() {
    this.lives -= 1;
    this.combo = 0;
    this.powerups = [];
    this.bolts = [];
    this.timers = { wide: 0, slow: 0, laser: 0 };
    this.paddle = this.freshPaddle();
    this.sound.loseLife();
    this.particles.kick(8);
    if (this.lives <= 0) {
      this.saveHighScore();
      this.sound.gameOver();
      this.setState(STATES.GAME_OVER);
    } else {
      this.serveBall();
      this.setState(STATES.SERVING);
    }
  }

  checkLevelCleared() {
    if (this.bricksLeft > 0) return;
    const bonus = CONFIG.LEVEL_CLEAR_BONUS + this.lives * CONFIG.LIFE_BONUS;
    this.score += bonus;
    this.balls = [];
    this.powerups = [];
    this.bolts = [];
    this.sound.levelClear();
    this.setState(STATES.LEVEL_CLEAR);
  }

  // ---- input handling ---------------------------------------------------

  // Called once per frame with the input state; returns nothing.
  handleInput() {
    const input = this.input;
    // Clicks on canvas-drawn buttons.
    for (const click of input.clickQueue) {
      this.sound.ensure();
      this.handleClick(click.x, click.y);
    }
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      this.sound.ensure();
      if (this.state === STATES.START) this.startGame();
      else if (this.state === STATES.SERVING) this.launchBall();
      else if (this.state === STATES.WIN || this.state === STATES.GAME_OVER) this.startGame();
      else if (this.state === STATES.PLAYING) this.fireLaser();
    }
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      if (this.state === STATES.PLAYING) this.setState(STATES.PAUSED);
      else if (this.state === STATES.PAUSED) this.setState(STATES.PLAYING);
    }
    if (input.wasPressed('KeyR')) {
      if (this.state !== STATES.START) this.startGame();
    }
    if (input.wasPressed('KeyM')) this.sound.muted = !this.sound.muted;
  }

  // Button rectangles live in render.js's layout; the game asks it.
  handleClick(x, y) {
    if (this.state === STATES.START && this.inButton(x, y, this.layout?.startButton)) {
      this.startGame();
    } else if (this.state === STATES.WIN && this.inButton(x, y, this.layout?.againButton)) {
      this.startGame();
    } else if (this.state === STATES.GAME_OVER && this.inButton(x, y, this.layout?.againButton)) {
      this.startGame();
    } else if (this.state === STATES.SERVING) {
      this.launchBall();
    } else if (this.state === STATES.PLAYING) {
      this.fireLaser();
    }
  }

  inButton(x, y, rect) {
    return !!rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  get levelName() {
    return LEVEL_NAMES[(this.level - 1) % LEVEL_NAMES.length];
  }

  get activeEffects() {
    const out = [];
    if (this.timers.wide > 0) out.push(`WIDE ${Math.ceil(this.timers.wide)}s`);
    if (this.timers.slow > 0) out.push(`SLOW ${Math.ceil(this.timers.slow)}s`);
    if (this.timers.laser > 0) out.push(`LASER ${Math.ceil(this.timers.laser)}s`);
    return out;
  }
}
