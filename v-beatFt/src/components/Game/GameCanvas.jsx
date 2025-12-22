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
      // 화면 클리어
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);
      
      // 배경
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);
      
      // 레인 그리기
      drawLanes(ctx);
      
      // 판정 라인
      drawHitLine(ctx);
      
      // 노트 그리기
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
  const SPEED = GAME_CONFIG.SPEED; // 이 줄 추가
  
  notes.forEach(note => {
    const timeDiff = note.timing - currentTime;
    const y = HIT_LINE_Y - (timeDiff * SPEED);
    
    // 화면 안에 있을 때만 그리기
    if (y > -NOTE_HEIGHT && y < HIT_LINE_Y + 100) {
      const x = note.lane * LANE_WIDTH;
      
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(x + 5, y, LANE_WIDTH - 10, NOTE_HEIGHT);
    }
  });
}