// src/components/Game/GameCanvas.jsx
import { useEffect, useRef } from 'react';
import { GAME_CONFIG } from "../../../constants/GameConfig";

// 게임 캔버스 컴포넌트
export default function GameCanvas({ notes, currentTime, pressedKeys = new Set() }) {
  const canvasRef = useRef(null);

  const notesRef = useRef(notes);
  const timeRef = useRef(currentTime);
  const keyFlashRef = useRef(new Map());

  // props → ref 동기화
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { timeRef.current = currentTime; }, [currentTime]);

  // 키 플래시 타이밍 관리
  useEffect(() => {
    const now = performance.now();

    // 새로 눌린 키
    pressedKeys.forEach(key => {
      if (!keyFlashRef.current.has(key)) {
        keyFlashRef.current.set(key, now);
      }
    });

    // 떼어진 키 제거
    [...keyFlashRef.current.keys()].forEach(key => {
      if (!pressedKeys.has(key)) {
        keyFlashRef.current.delete(key);
      }
    });
  }, [pressedKeys]);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    function gameLoop() {
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);

      // 배경
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);

      // 렌더 순서
      drawLanes(ctx);
      drawKeyLabels(ctx, pressedKeys, keyFlashRef);
      drawHitLine(ctx);
      drawNotes(ctx, notesRef.current, timeRef.current);
      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();
    return () => cancelAnimationFrame(animationId);
  }, [pressedKeys]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_CONFIG.CANVAS.WIDTH}
      height={GAME_CONFIG.CANVAS.HEIGHT}
      style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
    />
  );
}

// 원근법 유틸

function getPerspectiveScale(y) {
  const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;
  const { HEIGHT } = GAME_CONFIG.CANVAS;
  return SCALE_MIN + (y / HEIGHT) * (SCALE_MAX - SCALE_MIN);
}

function applyPerspective(x, y) {
  const { WIDTH } = GAME_CONFIG.CANVAS;
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
      : 'rgba(116,4,4,0.18)';

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

    ctx.strokeStyle = (i === 0 || i === LANES) ? '#ff4c20ff' : '#00ffffff';
    ctx.lineWidth = (i === 0 || i === LANES) ? 3 : 2;

    ctx.beginPath();
    ctx.moveTo(top.x, 0);
    ctx.lineTo(bottom.x, CANVAS.HEIGHT);
    ctx.stroke();
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

// 키 UI
function drawKeyLabels(ctx, pressedKeys, keyFlashRef) {
  const { CANVAS } = GAME_CONFIG;
  const hitLineY = CANVAS.HIT_LINE_Y;

  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';

  GAME_CONFIG.KEY_NAMES.forEach((keyName, i) => {
    const laneLeft = getLaneLeftX(i);
    const laneRight = getLaneRightX(i);
    const bottomY = hitLineY + 80;
    const topY = bottomY - 850;

    const textY = hitLineY + 54;  // 텍스트 고정 기준

    const tl = applyPerspective(laneLeft, topY);
    const tr = applyPerspective(laneRight, topY);
    const bl = applyPerspective(laneLeft, bottomY);
    const br = applyPerspective(laneRight, bottomY);

    if (pressedKeys.has(i)) {
      const now = performance.now();
      const start = keyFlashRef.current.get(i);
      const FLASH_DURATION = 120;

      const t = start ? (now - start) / FLASH_DURATION : 1;
      const alpha = t < 1 ? 1 - t : 0;

      const basePad = 2;
      const topPad = basePad * 0.5;
      const bottomPad = basePad * 1.2;

      ctx.save();

      const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
      grad.addColorStop(0.0, `rgba(180,255,255,0)`);
      grad.addColorStop(0.4, `rgba(180,255,255,${0.05 * alpha})`);
      grad.addColorStop(1.0, `rgba(180,255,255,${0.5 + alpha * 0.4})`);

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0,255,255,0.8)';
      ctx.shadowBlur = 35 * bl.scale;

      ctx.beginPath();
      ctx.moveTo(tl.x + topPad * tl.scale, topY);
      ctx.lineTo(tr.x - topPad * tr.scale, topY);
      ctx.lineTo(br.x - bottomPad * br.scale, bottomY);
      ctx.lineTo(bl.x + bottomPad * bl.scale, bottomY);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    const laneCenterX = (laneLeft + laneRight) / 2;
    const px = applyPerspective(laneCenterX, textY);
    const cx = px.x
    ctx.fillStyle = pressedKeys.has(i) ? '#000' : '#fff';
    ctx.fillText(keyName, cx, textY);
  });
}

// 노트 렌더링

function drawNotes(ctx, notes, currentTime) {
  const { NOTE_HEIGHT, HIT_LINE_Y } = GAME_CONFIG.CANVAS;
  const SPEED = GAME_CONFIG.SPEED;

  notes.forEach(note => {
    const left = getLaneLeftX(note.lane);
    const right = getLaneRightX(note.lane);

    if (note.type === 'long') {
      const SEG = 20;
      const count = Math.ceil((note.endTime - note.timing) / SEG);

      for (let i = 0; i < count; i++) {
        const s = note.timing + i * SEG;
        const e = Math.min(s + SEG, note.endTime);

        const sy = HIT_LINE_Y - (s - currentTime) * SPEED;
        const ey = HIT_LINE_Y - (e - currentTime) * SPEED;

        const topY = Math.max(sy - NOTE_HEIGHT, 0);
        const bottomY = Math.min(ey + NOTE_HEIGHT, GAME_CONFIG.CANVAS.HEIGHT);

        if (bottomY < 0 || topY > GAME_CONFIG.CANVAS.HEIGHT) continue;

        const tl = applyPerspective(left, topY);
        const tr = applyPerspective(right, topY);
        const bl = applyPerspective(left, bottomY);
        const br = applyPerspective(right, bottomY);

        ctx.fillStyle = note.holding ? '#22c55e' : GAME_CONFIG.LONG_NOTE_COLOR;
        ctx.beginPath();
        ctx.moveTo(tl.x + 5 * tl.scale, topY);
        ctx.lineTo(tr.x - 5 * tr.scale, topY);
        ctx.lineTo(br.x - 5 * br.scale, bottomY);
        ctx.lineTo(bl.x + 5 * bl.scale, bottomY);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const y = HIT_LINE_Y - (note.timing - currentTime) * SPEED;
      if (y < -NOTE_HEIGHT || y > HIT_LINE_Y + 100) return;

      const tl = applyPerspective(left, y);
      const tr = applyPerspective(right, y);
      const h = NOTE_HEIGHT * tl.scale;
      const by = y + h;

      const bl = applyPerspective(left, by);
      const br = applyPerspective(right, by);

      ctx.fillStyle = GAME_CONFIG.TAP_NOTE_COLOR;
      ctx.beginPath();
      ctx.moveTo(tl.x + 5 * tl.scale, y);
      ctx.lineTo(tr.x - 5 * tr.scale, y);
      ctx.lineTo(br.x - 5 * br.scale, by);
      ctx.lineTo(bl.x + 5 * bl.scale, by);
      ctx.closePath();
      ctx.fill();
    }
  });
}
