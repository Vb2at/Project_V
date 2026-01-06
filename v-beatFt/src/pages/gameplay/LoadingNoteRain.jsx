// src/pages/GamePlay/LoadingNoteRain.jsx
import { useEffect, useState } from 'react';

const WIDTH = 300;   // GamePlay 로딩 박스 width
const HEIGHT = 180;  // GamePlay 로딩 박스 height

export default function LoadingNoteRain({ count = 6 }) {
  const [notes, setNotes] = useState([]);

  // 노트 생성
  useEffect(() => {
    const spawn = setInterval(() => {
      setNotes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          x: Math.random() * (WIDTH - 14),
          y: -20,
          speed: 0.8 + Math.random() * 0.8, // 느린 속도
        },
      ]);
    }, 400); 

    return () => clearInterval(spawn);
  }, []);

  // 위치 업데이트
  useEffect(() => {
    const tick = setInterval(() => {
      setNotes((prev) =>
        prev
          .map((n) => ({ ...n, y: n.y + n.speed }))
          .filter((n) => n.y < HEIGHT + 40)
      );
    }, 16);

    return () => clearInterval(tick);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {notes.map((n) => (
        <div
          key={n.id}
          style={{
            position: 'absolute',
            left: n.x,
            top: n.y,
            width: '6px',
            height: '14px',
            borderRadius: '1px',
            background: 'rgba(0, 238, 255, 1)',
            boxShadow: '0 0 6px rgba(0, 238, 255, 1)',
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}
