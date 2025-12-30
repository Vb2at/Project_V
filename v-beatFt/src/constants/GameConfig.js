// src/constants/GameConfig.js
export const GAME_CONFIG = {
  LANES: 7,

  KEYS: ['a', 's', 'd', ' ', 'j', 'k', 'l'],
  KEY_NAMES: ['A', 'S', 'D', 'Space', 'J', 'K', 'L'],

  // ✅ 레인별 폭 (SPACE만 넓음)
  LANE_WIDTHS: [
    90,  // A
    90,  // S
    90,  // D
    140, // SPACE
    90,  // J
    90,  // K
    90,  // L
  ],

  JUDGEMENT: {
    PERFECT: 50,
    GOOD: 100,
    MISS: 150,
  },

  SCORE: {
    PERFECT: 300,
    GOOD: 100,
    MISS: 0,
    LONG_BONUS: 10,
  },

  CANVAS: {
    WIDTH: 680,   // ← LANE_WIDTHS 합계 (90*6 + 140)
    HEIGHT: 650,
    NOTE_HEIGHT: 40,
    HIT_LINE_Y: 550,
  },

  PERSPECTIVE: {
    SCALE_MIN: 0.5,
    SCALE_MAX: 1,
  },

  SPEED: 0.5,

  TAP_NOTE_COLOR: '#c8ff00ff',
  LONG_NOTE_COLOR: '#e64c4cff',
};
