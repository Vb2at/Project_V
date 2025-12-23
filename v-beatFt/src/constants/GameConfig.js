// src/constants/GameConfig.js
export const GAME_CONFIG = {
  LANES: 7,
  KEYS: ['a', 's', 'd', ' ', 'j', 'k', 'l'],
  KEY_NAMES: ['A', 'S', 'D', 'Space', 'J', 'K', 'L'],
  
  JUDGEMENT: {
    PERFECT: 50,
    GOOD: 100,
    MISS: 150
  },
  
  SCORE: {
    PERFECT: 300,
    GOOD: 100,
    MISS: 0,
    LONG_BONUS: 10
  },
  
  CANVAS: {
    WIDTH: 700,
    HEIGHT: 650,
    LANE_WIDTH: 100,
    NOTE_HEIGHT: 20,
    HIT_LINE_Y: 550
  },
  
  PERSPECTIVE: {
    SCALE_MIN: 0.3,
    SCALE_MAX: 1.0
  },
  
  SPEED: 0.5,
  
  TAP_NOTE_COLOR: '#3b82f6',
  LONG_NOTE_COLOR: '#8b5cf6'
};