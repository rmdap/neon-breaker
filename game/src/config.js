// NEON BREAKER — configuration: every tunable number of the game lives here,
// so the feel (speed, sizes, colours, scoring) can be tuned in one place.

export const CONFIG = {
  // Canvas (fixed internal resolution; CSS scales it to the window).
  WIDTH: 1280,
  HEIGHT: 720,

  // Palette — neon on deep space blue.
  COLORS: {
    background: '#070a1a',
    grid: 'rgba(90, 140, 255, 0.07)',
    neonCyan: '#22e6ff',
    neonPink: '#ff2e88',
    neonGold: '#ffc233',
    neonGreen: '#39ff88',
    neonPurple: '#b45cff',
    neonOrange: '#ff7a1a',
    white: '#f4f7ff',
    dim: '#8b93b8',
    steel: '#9aa7c7',
    paddle: '#22e6ff',
    ball: '#ffffff',
  },

  // Paddle.
  PADDLE_WIDTH: 132,
  PADDLE_HEIGHT: 16,
  PADDLE_Y: 668,
  PADDLE_SPEED: 900, // px/s with arrow keys
  PADDLE_WIDE_MULT: 1.55,
  PADDLE_WIDE_SECONDS: 12,

  // Ball.
  BALL_RADIUS: 9,
  BALL_BASE_SPEED: 540, // px/s at level 1
  BALL_SPEED_PER_LEVEL: 55,
  BALL_SPEED_PER_BRICK: 3.0,
  BALL_MAX_SPEED: 780,
  BALL_SLOW_MULT: 0.6,
  BALL_SLOW_SECONDS: 8,
  MAX_BOUNCE_ANGLE: (Math.PI * 5) / 12, // 75 degrees from vertical

  // Bricks.
  BRICK_COLS: 10,
  BRICK_ROWS: 8,
  BRICK_WIDTH: 104,
  BRICK_HEIGHT: 28,
  BRICK_GAP: 8,
  BRICK_TOP: 96,
  BRICK_LEFT: 52,

  // Brick colours by hit-points (1 = normal, 2 = tough, 3 = armoured).
  BRICK_COLORS: {
    1: ['#ff2e88', '#ff7a1a', '#ffc233', '#39ff88', '#22e6ff', '#b45cff', '#ff2e88', '#22e6ff'],
    2: ['#ff5c9e', '#ffa04d', '#ffd24d', '#5cff9e', '#5ceeff', '#c07aff', '#ff5c9e', '#5ceeff'],
    3: ['#ff8ab5', '#ffc07a', '#ffe08a', '#8affb5', '#8af2ff', '#d39aff', '#ff8ab5', '#8af2ff'],
  },

  // Lives and scoring.
  START_LIVES: 3,
  MAX_LIVES: 5,
  BRICK_SCORE: 50,
  COMBO_MAX_MULT: 8,
  LEVEL_CLEAR_BONUS: 500,
  LIFE_BONUS: 100,
  POWERUP_DROP_CHANCE: 0.18,

  // Power-ups: key, label, colour, duration in seconds (0 = instant).
  POWERUPS: {
    W: { label: 'WIDE', color: '#22e6ff', seconds: 12 },
    M: { label: 'MULTI', color: '#ff2e88', seconds: 0 },
    S: { label: 'SLOW', color: '#39ff88', seconds: 8 },
    L: { label: 'LASER', color: '#ffc233', seconds: 10 },
    '+': { label: '+1 LIFE', color: '#b45cff', seconds: 0 },
  },
  POWERUP_FALL_SPEED: 220,
  POWERUP_SIZE: 17,

  // Laser bolts fired from the paddle while the laser is active.
  LASER_SPEED: 900,
  LASER_WIDTH: 5,
  LASER_HEIGHT: 18,

  // Juice.
  SHAKE_MAX: 10,
  PARTICLES_PER_BRICK: 16,
  PARTICLE_LIFE: 0.55,
};

// Row colours for normal bricks (row 0 is the top row).
export function brickColorFor(row, hp) {
  const palette = CONFIG.BRICK_COLORS[hp] ?? CONFIG.BRICK_COLORS[1];
  return palette[row % palette.length];
}
