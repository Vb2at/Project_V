// src/components/Game/GameCanvas.jsx
import { useEffect, useRef } from 'react';
import { GAME_CONFIG } from "../../../constants/GameConfig";
const KEY_LABELS = ['A', 'S', 'D', 'SPACE', 'J', 'K', 'L'];

// 게임 캔버스 컴포넌트
export default function GameCanvas({
  currentTime,
  pressedKeys = new Set(),
  onCanvasReady,   
}) {
  const canvasRef = useRef(null);
  const pressedKeysRef = useRef(pressedKeys);
  const timeRef = useRef(currentTime);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    onCanvasReady?.(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pressedKeysRef.current = pressedKeys;
  }, [pressedKeys]);

  // props → ref 동기화
  useEffect(() => { timeRef.current = currentTime; }, [currentTime]);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    function gameLoop() {
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);

      // 배경
      // ctx.fillStyle = 'rgba(26, 26, 26, 0.6)';
      // ctx.fillRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);

      // 렌더 순서
      drawLanes(ctx);
      drawHitLine(ctx);
      drawKeyIndicators(ctx, pressedKeysRef.current);
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
      style={{ display: 'block', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
    />
  );
}

function drawKeyIndicators(ctx, pressedKeys) {
  const { CANVAS, LANES } = GAME_CONFIG;
  const y = CANVAS.HIT_LINE_Y + 35;   // 히트라인 아래 위치
  const BOX_Y_OFFSET = 20;

  for (let lane = 0; lane < LANES; lane++) {
    const isPressed = pressedKeys.has(lane);

    const left = getLaneLeftX(lane);
    const right = getLaneRightX(lane);

    const bl = applyPerspective(left, y);
    const br = applyPerspective(right, y);

    const WIDTH_RATIO = 0.98;
    const width = (br.x - bl.x) * WIDTH_RATIO;
    const offsetX = (br.x - bl.x - width) / 2;
    const height = 50;

    /* ======================
       눌림 박스 (Pressed Only)
       ====================== */
    if (isPressed) {
      ctx.fillStyle = 'rgba(180, 240, 255, 0.9)';
      ctx.shadowColor = 'rgba(180, 240, 255, 0.9)';
      ctx.shadowBlur = 18;

      const boxY = y + BOX_Y_OFFSET;
      // ===== 사다리꼴 상단 Y (박스 위쪽) =====
      const topY = boxY - height;

      // ===== 월드 기준 좌우 =====
      const worldLeft = left + offsetX;
      const worldRight = right - offsetX;

      // ===== 상단 좌표 =====
      const tl = applyPerspective(worldLeft, topY);
      const tr = applyPerspective(worldRight, topY);

      // ===== 하단 좌표 (y만 다르고 같은 worldX 사용) =====
      const blp = applyPerspective(worldLeft, boxY);
      const brp = applyPerspective(worldRight, boxY);

      ctx.beginPath();
      ctx.moveTo(tl.x, topY);     // 좌상
      ctx.lineTo(tr.x, topY);     // 우상
      ctx.lineTo(brp.x, boxY);     // 우하
      ctx.lineTo(blp.x, boxY);     // 좌하
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    /* ======================
       키 텍스트 (Always Visible)
       ====================== */
    const label = KEY_LABELS[lane] ?? '';

    ctx.font = 'bold 25px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isPressed) {
      // 눌렸을 때: 밝고 발광
      ctx.fillStyle = '#c02f5fee';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 10;
    } else {
      // 평소: 은은하게
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.shadowBlur = 0;
    }

    ctx.fillText(
      label,
      bl.x + offsetX + width / 2,
      y - 1
    );
    ctx.shadowBlur = 0;
  }
}


// 원근법 유틸

function getPerspectiveScale(y) {
  const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;
  const { HEIGHT } = GAME_CONFIG.CANVAS;
  return SCALE_MIN + (y / HEIGHT) * (SCALE_MAX - SCALE_MIN);
}

function applyPerspective(x, y) {
  const { WIDTH } = GAME_CONFIG.CANVAS;
  const VISIBLE_WIDTH = WIDTH * 0.1;
  const centerX = WIDTH / 2;
  const scale = getPerspectiveScale(y);
  return {
    x: centerX + (x - centerX) * scale,
    scale
  };
}

// 레인 렌더링

function drawLanes(ctx) {
  const { LANES, CANVAS } = GAME_CONFIG;

  for (let i = 0; i < LANES; i++) {
    const left = getLaneLeftX(i);
    const right = getLaneRightX(i);

    const tl = applyPerspective(left, 0);
    const tr = applyPerspective(right, 0);
    const bl = applyPerspective(left, CANVAS.HEIGHT);
    const br = applyPerspective(right, CANVAS.HEIGHT);

    ctx.fillStyle = i % 2 === 0
      ? 'rgba(82,82,82,0.3)'
      : 'rgba(179, 0, 0, 0.18)';

    ctx.beginPath();
    ctx.moveTo(tl.x, 0);
    ctx.lineTo(tr.x, 0);
    ctx.lineTo(br.x, CANVAS.HEIGHT);
    ctx.lineTo(bl.x, CANVAS.HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i <= LANES; i++) {
    const x = (i === LANES)
      ? GAME_CONFIG.CANVAS.WIDTH
      : getLaneLeftX(i);

    const top = applyPerspective(x, 0);
    const bottom = applyPerspective(x, CANVAS.HEIGHT);
    if (i === 0 || i === LANES) {
      ctx.strokeStyle = '#ff3355';
      ctx.shadowColor = 'rgba(255, 80, 140, 1)';
      ctx.shadowBlur = 22;
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = '#7df9ff';
      ctx.shadowColor = 'rgba(125, 249, 255, 0.9)';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
    }

    ctx.beginPath();
    ctx.moveTo(top.x, 0);
    ctx.lineTo(bottom.x, CANVAS.HEIGHT);
    ctx.stroke();
    ctx.shadowBlur = 0;

  }
}

// 판정 라인

function drawHitLine(ctx) {
  const { CANVAS } = GAME_CONFIG;
  const centerX = CANVAS.WIDTH / 2;
  const y = CANVAS.HIT_LINE_Y;
  const scale = getPerspectiveScale(y);

  ctx.strokeStyle = '#ff4c20ff';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(centerX + (-centerX) * scale, y);
  ctx.lineTo(centerX + (centerX) * scale, y);
  ctx.stroke();
}

function getLaneLeftX(lane) {
  return GAME_CONFIG.LANE_WIDTHS
    .slice(0, lane)
    .reduce((a, b) => a + b, 0);
}

function getLaneRightX(lane) {
  return getLaneLeftX(lane) + GAME_CONFIG.LANE_WIDTHS[lane];
}
