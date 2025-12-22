export const GAME_CONFIG = {
  LANES: 7,
  KEYS: ['s', 'd', 'f', ' ', 'j', 'k', 'l'],
  KEY_NAMES: ['S', 'D', 'F', 'Space', 'J', 'K', 'L'],
  
  JUDGEMENT: {
    PERFECT: 50,   // ms
    GOOD: 100,
    MISS: 150
  },
  
  SCORE: {
    PERFECT: 300,
    GOOD: 100,
    MISS: 0
  },
  
  CANVAS: {
    WIDTH: 700,
    HEIGHT: 600,
    LANE_WIDTH: 100,
    NOTE_HEIGHT: 20,
    HIT_LINE_Y: 550
  },
  
  SPEED: 0.5  // 노트 떨어지는 속도 (px/ms)
};