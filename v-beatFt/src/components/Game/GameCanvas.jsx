// src/components/Game/GameCanvas.jsx
import { useEffect, useRef } from 'react';
import { GAME_CONFIG } from '../../constants/GameConfig';

export default function GameCanvas({ notes, currentTime }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    function gameLoop() {
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);
      
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);
      
      drawLanes(ctx);
      drawHitLine(ctx);
      drawNotes(ctx, notes, currentTime);
      
      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();
    return () => cancelAnimationFrame(animationId);
  }, [notes, currentTime]);

  return (
    <canvas 
      ref={canvasRef} 
      width={GAME_CONFIG.CANVAS.WIDTH} 
      height={GAME_CONFIG.CANVAS.HEIGHT}
      style={{border: '2px solid #333'}}
    />
  );
}

function drawLanes(ctx) {
  const { LANES, LANE_WIDTH, CANVAS } = GAME_CONFIG;
  
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  
  for (let i = 0; i <= LANES; i++) {
    const x = i * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS.HEIGHT);
    ctx.stroke();
  }
}

function drawHitLine(ctx) {
  const { CANVAS } = GAME_CONFIG;
  
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS.HIT_LINE_Y);
  ctx.lineTo(CANVAS.WIDTH, CANVAS.HIT_LINE_Y);
  ctx.stroke();
}

function drawNotes(ctx, notes, currentTime) {
  const { LANE_WIDTH, NOTE_HEIGHT, HIT_LINE_Y } = GAME_CONFIG.CANVAS;
  const SPEED = GAME_CONFIG.SPEED;
  
  notes.forEach(note => {
    const x = note.lane * LANE_WIDTH;
    
    if (note.type === 'long') {
      // 롱노트 그리기
      const startDiff = note.timing - currentTime;
      const endDiff = note.endTiming - currentTime;
      
      const startY = HIT_LINE_Y - (startDiff * SPEED);
      const endY = HIT_LINE_Y - (endDiff * SPEED);
      
      const noteLength = startY - endY;
      
      // 롱노트 몸통 (그라디언트)
      const gradient = ctx.createLinearGradient(x, endY, x, startY);
      gradient.addColorStop(0, GAME_CONFIG.LONG_NOTE_COLOR);
      gradient.addColorStop(1, GAME_CONFIG.LONG_NOTE_COLOR + 'AA');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 10, endY, LANE_WIDTH - 20, noteLength);
      
      // 롱노트 시작 부분 (헤드)
      ctx.fillStyle = note.holding ? '#22c55e' : GAME_CONFIG.LONG_NOTE_COLOR;
      ctx.fillRect(x + 5, startY - NOTE_HEIGHT, LANE_WIDTH - 10, NOTE_HEIGHT);
      
      // 롱노트 끝 부분 (테일)
      ctx.fillStyle = GAME_CONFIG.LONG_NOTE_COLOR;
      ctx.fillRect(x + 5, endY, LANE_WIDTH - 10, NOTE_HEIGHT);
      
    } else {
      // 일반 탭노트
      const timeDiff = note.timing - currentTime;
      const y = HIT_LINE_Y - (timeDiff * SPEED);
      
      if (y > -NOTE_HEIGHT && y < HIT_LINE_Y + 100) {
        ctx.fillStyle = GAME_CONFIG.TAP_NOTE_COLOR;
        ctx.fillRect(x + 5, y, LANE_WIDTH - 10, NOTE_HEIGHT);
      }
    }
  });
}