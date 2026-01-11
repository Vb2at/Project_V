// src/components/engine/notes/perspective.js
import { GAME_CONFIG } from '../../../constants/GameConfig';

/**
 * 기본 원근 스케일 (가로 폭 결정)
 */
export function getPerspectiveScale(y) {
  const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;
  const { HEIGHT } = GAME_CONFIG.CANVAS;
  // 선형 보간: 위쪽(0)은 SCALE_MIN, 아래쪽(HEIGHT)은 SCALE_MAX
  return SCALE_MIN + (y / HEIGHT) * (SCALE_MAX - SCALE_MIN);
}

/**
 * 노트 두께(세로) 전용 스케일
 * 내려올수록 급격히 커지는 것을 막기 위해 보정된 값을 반환합니다.
 */
export function getNoteHeightScale(y) {
  const scale = getPerspectiveScale(y);
  // 루트나 지수 연산을 통해 아래쪽에서 너무 비대해지는 것을 방지합니다.
  return Math.pow(scale, 0.7); 
}

export function applyPerspectiveX(x, y) {
  const { WIDTH } = GAME_CONFIG.CANVAS;
  const centerX = WIDTH / 2;
  const scale = getPerspectiveScale(y);
  return centerX + (x - centerX) * scale;
}