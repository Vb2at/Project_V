import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function RightSidebar({ isMulti = true }) {
  const HEADER_HEIGHT = 64;

  // ===== 실시간 상대 상태 =====
  const [rival, setRival] = useState({
    nickname: 'OPPONENT',
    state: 'WAITING', // WAITING | READY | PLAYING
    score: 0,
    combo: 0,
    profileUrl: null,
    position: { x: 50, y: 50 }, // % 기준 위치
    notes: [], // 노트 배열
  });

  useEffect(() => {
    // 서버에서 상대 상태 수신
    socket.on('update-game', (data) => {
      setRival(data);
    });

    return () => socket.off('update-game');
  }, []);

  // 화면 크기에 따라 상대 좌표 변환
  const calcPos = (pos) => {
    return {
      left: `${pos.x}%`,
      top: `${pos.y}%`,
    };
  };

  return (
    <div
      style={{
        position: 'fixed',
        width: '300px',
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        padding: '12px',
        boxSizing: 'border-box',
        background: 'rgba(10, 20, 30, 0.6)',
        top: HEADER_HEIGHT + 'px',
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* ===== 네온 라인 ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          width: '5px',
          height: '100%',
          background: 'linear-gradient(to bottom, #5aeaff, #ff00ea, #5aeaff)',
          boxShadow:
            '0 0 6px rgba(90,234,255,0.8), 0 0 12px rgba(255,80,200,0.6), 0 0 20px rgba(90,234,255,0.5)',
          pointerEvents: 'none',
        }}
      />

      {isMulti && (
        <>
          {/* ================== 상단: 상대 화면 ================== */}
          <div
            style={{
              flex: 6,
              borderRadius: 14,
              border: '1px solid rgba(90,234,255,0.55)',
              background: 'rgba(0,0,0,0.35)',
              boxShadow: '0 0 16px rgba(90,234,255,0.25)',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.12em',
                opacity: 0.8,
              }}
            >
              RIVAL VIEW
            </div>

            {/* VIEW AREA */}
            <div
              style={{
                flex: 1,
                borderRadius: 10,
                background:
                  'linear-gradient(135deg, rgba(40,50,70,0.95), rgba(10,15,25,0.95))',
                border: '1px solid rgba(90,234,255,0.35)',
                boxShadow: 'inset 0 0 14px rgba(0,0,0,0.65)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* ================== 상대 캐릭터 ================== */}
              <div
                style={{
                  position: 'absolute',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'red',
                  ...calcPos(rival.position),
                  transition: 'all 0.05s linear',
                }}
              />

              {/* ================== 노트(hit) 표시 ================== */}
              {Array.isArray(rival.notes) &&
                rival.notes.map((note, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#5aeaff',
                      left: `${note.x}%`,
                      top: `${note.y}%`,
                      transition: 'all 0.05s linear',
                    }}
                  />
                ))}
            </div>
          </div>

          {/* ================== 하단: 상대 정보 ================== */}
          <div
            style={{
              flex: 4,
              borderRadius: 14,
              border: '1px solid rgba(90,234,255,0.45)',
              background: 'rgba(0,0,0,0.35)',
              boxShadow: '0 0 12px rgba(90,234,255,0.18)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* PROFILE + NAME */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 10,
                  background: rival.profileUrl
                    ? `url(${rival.profileUrl}) center / cover no-repeat`
                    : 'linear-gradient(135deg, #2a2f3a, #111)',
                  border: '1px solid rgba(90,234,255,0.4)',
                  boxShadow: '0 0 10px rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  opacity: rival.profileUrl ? 1 : 0.5,
                }}
              >
                {!rival.profileUrl && 'PROFILE'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{rival.nickname}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>OPPONENT</div>
              </div>
            </div>

            {/* SCORE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ opacity: 0.75 }}>SCORE</span>
              <span style={{ color: '#5aeaff', fontWeight: 700 }}>{rival.score}</span>
            </div>

            {/* COMBO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ opacity: 0.75 }}>COMBO</span>
              <span style={{ color: '#ff8cff', fontWeight: 700 }}>{rival.combo}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
