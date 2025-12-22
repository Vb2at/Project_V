// src/pages/GamePlay.jsx
import { useState, useEffect } from 'react';
import GameCanvas from '../components/Game/GameCanvas';

export default function GamePlay() {
  // 테스트용 노트 데이터
  const testNotes = [
    { lane: 0, timing: 2000, type: 'tap' },
    { lane: 3, timing: 2500, type: 'tap' },
    { lane: 6, timing: 3000, type: 'tap' },
    { lane: 1, timing: 3500, type: 'tap' },
    { lane: 4, timing: 4000, type: 'tap' },
  ];

  const [currentTime, setCurrentTime] = useState(0);

  // 테스트용 타이머
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 16);
    }, 16);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{display: 'flex', justifyContent: 'center', padding: '20px', background: '#000', minHeight: '100vh' }}>
      <GameCanvas notes={testNotes} currentTime={currentTime} />
    </div>
  );
}