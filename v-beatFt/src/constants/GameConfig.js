// src/constants/GameConfig.js
export const GAME_CONFIG = {
  LANES: 7,
  KEYS: ['a', 's', 'd', ' ', 'j', 'k', 'l'], // 키 매핑 변경
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
    LONG_BONUS: 10  // 롱노트 홀딩 보너스 (틱당)
  },
  
  CANVAS: {
    WIDTH: 700,
    HEIGHT: 600,
    LANE_WIDTH: 100,
    NOTE_HEIGHT: 20,
    HIT_LINE_Y: 550
  },
  
  SPEED: 0.5,
  
  LONG_NOTE_COLOR: '#4dabf7',  // 롱노트 색상 (파란색)
  TAP_NOTE_COLOR: '#ff6b6b'    // 탭노트 색상 (빨간색)
};