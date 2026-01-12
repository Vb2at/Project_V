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
    PERFECT: 30,
    GREAT: 50,     
    GOOD: 100,
    MISS: 200,
  },

  SCORE: {
    PERFECT: 300,
    GREAT: 150,   
    GOOD: 100,
    MISS: 0,
    LONG_BONUS: 100,
  },

  CANVAS: {
    WIDTH: 1200,
    HEIGHT: 1120,
    NOTE_HEIGHT: 40,
    HIT_LINE_Y: 1000,
  },

  PERSPECTIVE: {
    SCALE_MIN: 0.2,
    SCALE_MAX: 1,
  },

  SPEED: 0.7,

  DIFFICULTY: {
    EASY: { SPEED: 1.0 },
    NORMAL: { SPEED: 1.2 },
    HARD: { SPEED: 1.6 },
    HELL: { SPEED: 2.0 },
  },

  TAP_NOTE_COLOR: '#c8ff00ff',
  LONG_NOTE_COLOR: '#e64c4cff',
};
