// NEON BREAKER — main: boot the game, run the frame loop, and build the
// deterministic screenshot scenes. `?shot=start|play|win|gameover` renders
// one frozen scene for the entry's screenshots: the scene is constructed
// from fixed numbers, never from a live simulation, so every render of the
// same shot looks the same.

import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Game, STATES } from './game.js';
import { Renderer } from './render.js';
import { buildLevel } from './levels.js';

const canvas = document.getElementById('game');
canvas.width = CONFIG.WIDTH;
canvas.height = CONFIG.HEIGHT;

const input = new Input(canvas);
const game = new Game(input);
const renderer = new Renderer(canvas);

// Exposed for play-testing (and for curious players): the live game.
window.__neonBreaker = game;

// ---- deterministic screenshot scenes --------------------------------------

// A frozen mid-game scene: level 2, part of the field already smashed, the
// ball in flight, a power-up falling, particles frozen mid-burst.
function buildPlayShot() {
  game.level = 2;
  game.state = STATES.PLAYING;
  game.score = 2450;
  game.lives = 3;
  game.combo = 4;
  game.bestCombo = 5;
  game.bricksBroken = 23;
  game.bricks = buildLevel(2);
  // Smash a fixed set of bricks (top-left wedge and a few in the middle).
  const smashed = [0, 1, 2, 3, 4, 10, 11, 12, 20, 21, 30, 40, 41, 50, 13, 14, 23, 33, 43, 53, 63, 71, 72];
  for (const i of smashed) {
    const b = game.bricks[i];
    if (b && b.type === 'normal') b.alive = false;
  }
  game.bricksLeft = game.bricks.filter((b) => b.alive && b.type === 'normal').length;
  game.paddle.x = CONFIG.WIDTH / 2 - 160;
  game.balls = [{
    x: 640, y: 470, vx: 210, vy: -380, r: CONFIG.BALL_RADIUS, stuck: false,
  }];
  game.powerups = [{ x: 820, y: 330, vy: 0, key: 'W', size: CONFIG.POWERUP_SIZE, caught: false }];
  game.timers = { wide: 0, slow: 0, laser: 0 };
  // Frozen particles around two freshly broken bricks.
  game.particles.list = [];
  const spots = [[430, 124, '#ff2e88'], [640, 160, '#ffc233']];
  for (const [x, y, color] of spots) {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      game.particles.list.push({
        x: x + Math.cos(angle) * 22,
        y: y + Math.sin(angle) * 16,
        vx: 0, vy: 0,
        life: 0.4, maxLife: 0.55,
        size: 3 + (i % 3),
        color,
        gravity: 0,
      });
    }
  }
  game.particles.shake = 0;
}

function buildWinShot() {
  game.level = 3;
  game.state = STATES.WIN;
  game.score = 12850;
  game.lives = 2;
  game.combo = 0;
  game.bestCombo = 8;
  game.bricksBroken = 164;
  game.highScore = 12850;
  game.bricks = [];
  game.balls = [];
  game.powerups = [];
}

function buildGameOverShot() {
  game.level = 2;
  game.state = STATES.GAME_OVER;
  game.score = 3200;
  game.lives = 0;
  game.combo = 0;
  game.bestCombo = 6;
  game.bricksBroken = 47;
  game.bricks = buildLevel(2);
  game.balls = [];
  game.powerups = [];
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
let frozen = false;

if (shot === 'play') {
  buildPlayShot();
  frozen = true;
} else if (shot === 'win') {
  buildWinShot();
  frozen = true;
} else if (shot === 'gameover') {
  buildGameOverShot();
  frozen = true;
} else {
  // 'start' and anything else: the title screen.
  game.state = STATES.START;
  if (shot === 'start') frozen = true;
}

// ---- frame loop -----------------------------------------------------------

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (!frozen) {
    game.handleInput();
    game.update(dt);
  } else {
    // A frozen shot still draws every frame (for the screenshot), but the
    // world never advances: the same pixels every time.
    game.stateTime += dt;
  }
  renderer.draw(game);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
