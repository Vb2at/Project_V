// src/components/Game/GameCanvas.jsx
import { useEffect, useRef } from 'react';
import { GAME_CONFIG } from '../../constants/GameConfig';

export default function GameCanvas({ notes, currentTime, pressedKeys = new Set() }) {
  const canvasRef = useRef(null);
  const notesRef = useRef(notes);
  const timeRef = useRef(currentTime);
  const keysRef = useRef(pressedKeys);

  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { timeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { keysRef.current = pressedKeys; }, [pressedKeys]);



  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    // 게임 루프 (60fps)
    function gameLoop() {
      // 캔버스 초기화
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);

      // 배경 그리기
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);

      // 순서대로 그리기
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
      style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
    />
  );
}

// ===== 원근법 계산 함수 =====

function getPerspectiveScale(y) {
  const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;
  const { HEIGHT } = GAME_CONFIG.CANVAS;
  return SCALE_MIN + (y / HEIGHT) * (SCALE_MAX - SCALE_MIN);
}

function applyPerspective(x, y) {
  const { WIDTH } = GAME_CONFIG.CANVAS;
  const centerX = WIDTH / 2;
  const scale = getPerspectiveScale(y);
  const perspectiveX = centerX + (x - centerX) * scale;
  return { x: perspectiveX, scale };
}

// ===== 레인 그리기 =====

function drawLanes(ctx) {
  const { LANES, CANVAS } = GAME_CONFIG;
  const { LANE_WIDTH } = CANVAS;

  // 1. 레인 배경 먼저 그리기 (홀짝 구분)
  for (let i = 0; i < LANES; i++) {
    const laneLeft = i * LANE_WIDTH;
    const laneRight = (i + 1) * LANE_WIDTH;

    // 레인의 4개 꼭짓점 계산 (원근법 적용)
    const topLeft = applyPerspective(laneLeft, 0);
    const topRight = applyPerspective(laneRight, 0);
    const bottomLeft = applyPerspective(laneLeft, CANVAS.HEIGHT);
    const bottomRight = applyPerspective(laneRight, CANVAS.HEIGHT);

    // 홀짝 레인 다른 색상 (사다리꼴)
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
      // 키 눌렸을 때
      ctx.fillStyle = '#00ffffff';
    } else {
      // 키 안 눌렸을 때
      ctx.fillStyle = 'transparent';
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

      const startDiff = note.timing - currentTime;
      const endDiff = note.endTime - currentTime;

      const startY = HIT_LINE_Y - (startDiff * SPEED);
      const endY = HIT_LINE_Y - (endDiff * SPEED);

      const headHeight = NOTE_HEIGHT * applyPerspective(laneLeft, startY).scale;
      const headTopY = Math.round(startY - headHeight);

      const tailHeight = NOTE_HEIGHT * applyPerspective(laneLeft, endY).scale;
      const tailBottomY = Math.round(endY + tailHeight);

      // ✅ 그리기용 좌표만 클램프
      const drawTopY = Math.max(headTopY, 0);
      const drawBottomY = Math.min(tailBottomY, GAME_CONFIG.CANVAS.HEIGHT);

      if (tailBottomY >= -1 || headTopY <= GAME_CONFIG.CANVAS.HEIGHT + 1) {

        const drawTopLeft = applyPerspective(laneLeft, drawTopY);
        const drawTopRight = applyPerspective(laneRight, drawTopY);

        const drawBottomLeft = applyPerspective(laneLeft, drawBottomY);
        const drawBottomRight = applyPerspective(laneRight, drawBottomY);

        const longNoteColor = note.holding
          ? '#22c55e'
          : GAME_CONFIG.LONG_NOTE_COLOR;

        ctx.fillStyle = longNoteColor;
        ctx.beginPath();
        ctx.moveTo(drawTopLeft.x + 5 * drawTopLeft.scale, drawTopY);
        ctx.lineTo(drawTopRight.x - 5 * drawTopRight.scale, drawTopY);
        ctx.lineTo(drawBottomRight.x - 5 * drawBottomRight.scale, drawBottomY);
        ctx.lineTo(drawBottomLeft.x + 5 * drawBottomLeft.scale, drawBottomY);
        ctx.closePath();
        ctx.fill();

        ctx.save();
        ctx.translate(0.5, 0.5);

        // ✅ stroke는 완전히 화면 안에 있을 때만
        if (headTopY >= 0 && tailBottomY <= GAME_CONFIG.CANVAS.HEIGHT) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.restore();
      }

    }
    else {
      // ===== 탭노트 =====
      const timeDiff = note.timing - currentTime;
      const y = HIT_LINE_Y - (timeDiff * SPEED);

      if (y > -NOTE_HEIGHT && y < HIT_LINE_Y + 100) {
        const noteTopLeft = applyPerspective(laneLeft, y);
        const noteTopRight = applyPerspective(laneRight, y);
        const noteHeight = NOTE_HEIGHT * noteTopLeft.scale;

        const noteBottomY = y + noteHeight;
        const noteBottomLeft = applyPerspective(laneLeft, noteBottomY);
        const noteBottomRight = applyPerspective(laneRight, noteBottomY);

        ctx.fillStyle = GAME_CONFIG.TAP_NOTE_COLOR;
        ctx.beginPath();
        ctx.moveTo(noteTopLeft.x + 5 * noteTopLeft.scale, y);
        ctx.lineTo(noteTopRight.x - 5 * noteTopRight.scale, y);
        ctx.lineTo(noteBottomRight.x - 5 * noteBottomRight.scale, noteBottomY);
        ctx.lineTo(noteBottomLeft.x + 5 * noteBottomLeft.scale, noteBottomY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });
}