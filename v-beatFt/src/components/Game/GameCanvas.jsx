// src/components/Game/GameCanvas.jsx
import { useEffect, useRef } from 'react';
import { GAME_CONFIG } from '../../constants/GameConfig';

/**
 * 게임 캔버스 컴포넌트
 * - 리듬 게임의 모든 시각 요소(레인, 노트, 판정라인 등)를 렌더링
 * - Canvas 2D API를 사용한 60fps 게임 루프 실행
 */
export default function GameCanvas({ notes, currentTime, pressedKeys = new Set() }) {
  const canvasRef = useRef(null);
  
  // props를 ref로 관리 (게임 루프 내부에서 최신 값 접근용)
  const notesRef = useRef(notes);
  const timeRef = useRef(currentTime);
  const keysRef = useRef(pressedKeys);

  // props가 변경될 때마다 ref 업데이트
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { timeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { keysRef.current = pressedKeys; }, [pressedKeys]);

  // 게임 루프 초기화 및 실행
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    // 60fps 게임 루프
    function gameLoop() {
      // 캔버스 초기화
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);
      
      // 배경 그리기
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);

      // 렌더링 순서: 레인 → 판정라인 → 노트 → 키 표시
      drawLanes(ctx);
      drawHitLine(ctx);
      drawNotes(ctx, notesRef.current, timeRef.current);
      drawKeyLabels(ctx, keysRef.current);

      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_CONFIG.CANVAS.WIDTH}
      height={GAME_CONFIG.CANVAS.HEIGHT}
      style= {{display: 'block', position: 'absolute', top: 0, left: 0 }}
    />
  );
}

// ===== 원근법 계산 함수 =====

function getPerspectiveScale(y) {
  const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;
  const { HEIGHT } = GAME_CONFIG.CANVAS;
  return SCALE_MIN + (y / HEIGHT) * (SCALE_MAX - SCALE_MIN);
}

//원근법 적용한 X 좌표 및 스케일 반환

function applyPerspective(x, y) {
  const { WIDTH } = GAME_CONFIG.CANVAS;
  const centerX = WIDTH / 2;
  const scale = getPerspectiveScale(y);
  const perspectiveX = centerX + (x - centerX) * scale;
  return { x: perspectiveX, scale };
}

// ===== 레인 그리기 =====

//게임 레인 배경 및 구분선 렌더링
function drawLanes(ctx) {
  const { LANES, CANVAS } = GAME_CONFIG;
  const { LANE_WIDTH } = CANVAS;

  // 1. 레인 배경
  for (let i = 0; i < LANES; i++) {
    const laneLeft = i * LANE_WIDTH;
    const laneRight = (i + 1) * LANE_WIDTH;

    // 레인의 4개 꼭짓점 계산
    const topLeft = applyPerspective(laneLeft, 0);
    const topRight = applyPerspective(laneRight, 0);
    const bottomLeft = applyPerspective(laneLeft, CANVAS.HEIGHT);
    const bottomRight = applyPerspective(laneRight, CANVAS.HEIGHT);

    // 홀짝 레인 다른 색상으로 사다리꼴
    ctx.fillStyle = i % 2 === 0 ? 'rgba(82, 82, 82, 0.3)' : 'rgba(116, 4, 4, 0.18)';
    ctx.beginPath();
    ctx.moveTo(topLeft.x, 0);
    ctx.lineTo(topRight.x, 0);
    ctx.lineTo(bottomRight.x, CANVAS.HEIGHT);
    ctx.lineTo(bottomLeft.x, CANVAS.HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  // 2. 레인 구분선 그리기 (배경 위에)
  for (let i = 0; i <= LANES; i++) {
    const originalX = i * LANE_WIDTH;
    const topPoint = applyPerspective(originalX, 0);
    const bottomPoint = applyPerspective(originalX, CANVAS.HEIGHT);

    // 양 끝은 빨강, 중간은 청록색
    if (i === 0 || i === LANES) {
      ctx.strokeStyle = '#ff4c20ff';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = '#00ffffff';
      ctx.lineWidth = 2;
    }

    ctx.beginPath();
    ctx.moveTo(topPoint.x, 0);
    ctx.lineTo(bottomPoint.x, CANVAS.HEIGHT);
    ctx.stroke();
  }
}

// ===== 판정 라인 그리기 =====
function drawHitLine(ctx) {
  const { CANVAS } = GAME_CONFIG;
  const centerX = CANVAS.WIDTH / 2;
  const hitLineY = CANVAS.HIT_LINE_Y;
  const hitScale = getPerspectiveScale(hitLineY);

  // 판정 라인 양 끝 계산
  const hitLineLeft = centerX + (-centerX) * hitScale;
  const hitLineRight = centerX + (centerX) * hitScale;

  // 빨강 굵은 선
  ctx.strokeStyle = '#ff4c20ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hitLineLeft, hitLineY);
  ctx.lineTo(hitLineRight, hitLineY);
  ctx.stroke();
}

// ===== 키 표시 그리기 =====
function drawKeyLabels(ctx, pressedKeys) {
  const { CANVAS } = GAME_CONFIG;
  const { LANE_WIDTH } = CANVAS;
  const hitLineY = CANVAS.HIT_LINE_Y;

  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';

  GAME_CONFIG.KEY_NAMES.forEach((keyName, i) => {
    // 레인의 좌우 경계
    const laneLeft = i * LANE_WIDTH;
    const laneRight = (i + 1) * LANE_WIDTH;

    // 키박스의 위아래 Y 위치
    const boxTopY = hitLineY + 10;
    const boxHeight = 28;
    const boxBottomY = boxTopY + boxHeight;

    // 위쪽 경계 (원근법 적용)
    const topLeft = applyPerspective(laneLeft, boxTopY);
    const topRight = applyPerspective(laneRight, boxTopY);

    // 아래쪽 경계 (원근법 적용)
    const bottomLeft = applyPerspective(laneLeft, boxBottomY);
    const bottomRight = applyPerspective(laneRight, boxBottomY);

    // 키박스를 사다리꼴로 그리기
    if (pressedKeys.has(i)) {
      ctx.fillStyle = '#00ffffff'; // 키 눌렸을 때
    } else {
      ctx.fillStyle = 'transparent'; // 키 안 눌렸을 때
    }

    ctx.beginPath();
    ctx.moveTo(topLeft.x + 5 * topLeft.scale, boxTopY);
    ctx.lineTo(topRight.x - 5 * topRight.scale, boxTopY);
    ctx.lineTo(bottomRight.x - 5 * bottomRight.scale, boxBottomY);
    ctx.lineTo(bottomLeft.x + 5 * bottomLeft.scale, boxBottomY);
    ctx.closePath();
    ctx.fill();

    // 텍스트 (박스 중앙)
    const centerX = (topLeft.x + topRight.x + bottomLeft.x + bottomRight.x) / 4;
    const textY = (boxTopY + boxBottomY) / 2 + 7;
    ctx.fillStyle = pressedKeys.has(i) ? '#000000' : '#ffffff';
    ctx.fillText(keyName, centerX, textY);
  });
}

// ===== 노트 그리기 =====
function drawNotes(ctx, notes, currentTime) {
  const { LANE_WIDTH, NOTE_HEIGHT, HIT_LINE_Y } = GAME_CONFIG.CANVAS;
  const SPEED = GAME_CONFIG.SPEED;

  notes.forEach(note => {
    // 레인의 좌우 경계
    const laneLeft = note.lane * LANE_WIDTH;
    const laneRight = (note.lane + 1) * LANE_WIDTH;

    if (note.type === 'long') {
      // ===== 롱노트 =====
      const totalDuration = note.endTime - note.timing;
      const SEGMENT_MS = 40; // 40ms 단위로 세그먼트 분할
      const segmentCount = Math.ceil(totalDuration / SEGMENT_MS);

      // 각 세그먼트를 개별 사다리꼴로 렌더링
      for (let i = 0; i < segmentCount; i++) {
        const segStartTime = note.timing + i * SEGMENT_MS;
        const segEndTime = Math.min(segStartTime + SEGMENT_MS, note.endTime);

        // 현재 시간 기준 세그먼트 Y 위치 계산
        const segStartDiff = segStartTime - currentTime;
        const segEndDiff = segEndTime - currentTime;
        const segStartY = HIT_LINE_Y - (segStartDiff * SPEED);
        const segEndY = HIT_LINE_Y - (segEndDiff * SPEED);

        // 원근법 적용한 세그먼트 높이 계산
        const segHeadHeight = NOTE_HEIGHT * applyPerspective(laneLeft, segStartY).scale;
        const segHeadTopY = Math.round(segStartY - segHeadHeight);
        const segTailHeight = NOTE_HEIGHT * applyPerspective(laneLeft, segEndY).scale;
        const segTailBottomY = Math.round(segEndY + segTailHeight);

        // 화면 밖이면 스킵
        if (segTailBottomY < -1 || segHeadTopY > GAME_CONFIG.CANVAS.HEIGHT + 1) continue;

        // 화면 범위 내로 클리핑
        const drawTopY = Math.max(segHeadTopY, 0);
        const drawBottomY = Math.min(segTailBottomY, GAME_CONFIG.CANVAS.HEIGHT);

        // 4개 꼭짓점 계산
        const topLeft = applyPerspective(laneLeft, drawTopY);
        const topRight = applyPerspective(laneRight, drawTopY);
        const bottomLeft = applyPerspective(laneLeft, drawBottomY);
        const bottomRight = applyPerspective(laneRight, drawBottomY);

        // 홀딩 중이면 초록색, 아니면 기본 롱노트 색상
        ctx.fillStyle = note.holding ? '#22c55e' : GAME_CONFIG.LONG_NOTE_COLOR;

        ctx.beginPath();
        ctx.moveTo(topLeft.x + 5 * topLeft.scale, drawTopY);
        ctx.lineTo(topRight.x - 5 * topRight.scale, drawTopY);
        ctx.lineTo(bottomRight.x - 5 * bottomRight.scale, drawBottomY);
        ctx.lineTo(bottomLeft.x + 5 * bottomLeft.scale, drawBottomY);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // ===== 탭노트 =====
      const timeDiff = note.timing - currentTime;
      const y = HIT_LINE_Y - (timeDiff * SPEED);

      // 화면 범위 내에 있을 때만 렌더링
      if (y > -NOTE_HEIGHT && y < HIT_LINE_Y + 100) {
        // 4개 꼭짓점 계산
        const noteTopLeft = applyPerspective(laneLeft, y);
        const noteTopRight = applyPerspective(laneRight, y);
        const noteHeight = NOTE_HEIGHT * noteTopLeft.scale;
        const noteBottomY = y + noteHeight;
        const noteBottomLeft = applyPerspective(laneLeft, noteBottomY);
        const noteBottomRight = applyPerspective(laneRight, noteBottomY);

        // 노트 사다리꼴 그리기 (흰색 테두리)
        ctx.fillStyle = GAME_CONFIG.TAP_NOTE_COLOR;
        ctx.beginPath();
        ctx.moveTo(noteTopLeft.x + 5 * noteTopLeft.scale, y);
        ctx.lineTo(noteTopRight.x - 5 * noteTopRight.scale, y);
        ctx.lineTo(noteBottomRight.x - 5 * noteBottomRight.scale, noteBottomY);
        ctx.lineTo(noteBottomLeft.x + 5 * noteBottomLeft.scale, noteBottomY);
        ctx.closePath();
        ctx.fill();

        // 흰색 테두리
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });
}