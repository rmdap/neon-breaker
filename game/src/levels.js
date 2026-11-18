// NEON BREAKER — levels: three brick layouts, one per level. A layout is
// rows of characters: '.' empty, '1'/'2'/'3' a brick with that many hits,
// 'S' an unbreakable steel brick. buildLevel turns a layout into the brick
// objects the game plays with (position, hit-points, colour, score value).

import { CONFIG, brickColorFor } from './config.js';

// Level 1 — "FIRST LIGHT": plain single-hit bricks, a gentle ramp.
const LEVEL_1 = [
  '..........',
  '.11111111.',
  '.11111111.',
  '.11111111.',
  '.11111111.',
  '.11111111.',
  '..........',
  '..........',
];

// Level 2 — "DOUBLE TROUBLE": tough two-hit bricks mixed into the field.
const LEVEL_2 = [
  '.22222222.',
  '.21111112.',
  '.12111121.',
  '.11222111.',
  '.11122111.',
  '.12111121.',
  '.21111112.',
  '.22222222.',
];

// Level 3 — "STEEL MAZE": armoured bricks and unbreakable steel walls.
const LEVEL_3 = [
  '.33333333.',
  '.3S1111S3.',
  '.31222213.',
  '.S1211121S.',
  '.S1222221S.',
  '.31222213.',
  '.3S1111S3.',
  '.33333333.',
];

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];
export const LEVEL_NAMES = ['FIRST LIGHT', 'DOUBLE TROUBLE', 'STEEL MAZE'];

// A brick the game plays with.
export function makeBrick(col, row, hp, type) {
  return {
    col,
    row,
    x: CONFIG.BRICK_LEFT + col * (CONFIG.BRICK_WIDTH + CONFIG.BRICK_GAP),
    y: CONFIG.BRICK_TOP + row * (CONFIG.BRICK_HEIGHT + CONFIG.BRICK_GAP),
    w: CONFIG.BRICK_WIDTH,
    h: CONFIG.BRICK_HEIGHT,
    hp,
    maxHp: hp,
    type, // 'normal' | 'steel'
    color: type === 'steel' ? CONFIG.COLORS.steel : brickColorFor(row, hp),
    alive: true,
  };
}

// Build the bricks for level `n` (1-based). Steel bricks never break.
export function buildLevel(n) {
  const layout = LEVELS[(n - 1) % LEVELS.length];
  const bricks = [];
  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < layout[row].length; col++) {
      const cell = layout[row][col];
      if (cell === '.') continue;
      if (cell === 'S') bricks.push(makeBrick(col, row, Infinity, 'steel'));
      else bricks.push(makeBrick(col, row, Number(cell), 'normal'));
    }
  }
  return bricks;
}

// How many breakable bricks a level has (the win condition).
export function breakableCount(bricks) {
  return bricks.filter((b) => b.type === 'normal').length;
}
