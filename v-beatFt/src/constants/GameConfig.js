// src/constants/GameConfig.js
export const GAME_CONFIG = {
  LANES: 7,

  KEYS: ['a', 's', 'd', ' ', 'j', 'k', 'l'],
  KEY_NAMES: ['A', 'S', 'D', 'Space', 'J', 'K', 'L'],

  //레인별 폭 (SPACE만 넓음)
  LANE_WIDTHS: [
    160,  // A
    160,  // S
    160,  // D
    240, // SPACE
    160,  // J
    160,  // K
    160,  // L
  ],

  JUDGEMENT: {
    PERFECT: 50,
    GOOD: 100,
    MISS: 150,
  },

  SCORE: {
    PERFECT: 500,
    GOOD: 300,
    MISS: 0,
    LONG_BONUS: 100,
  },

  CANVAS: {
    WIDTH: 1200,
    HEIGHT: 890,
    NOTE_HEIGHT: 60,
    HIT_LINE_Y: 760,
  },

  PERSPECTIVE: {
    SCALE_MIN: 0.08,
    SCALE_MAX: 1,
  },

  SPEED: 1.2,

  TAP_NOTE_COLOR: '#c8ff00ff',
  LONG_NOTE_COLOR: '#e64c4cff',
};
