import { useState } from 'react';

export default function RightSidebar({ isMulti = false }) {
  const HEADER_HEIGHT = 64;

  // ===== 상대 상태 (더미 UI용) =====
  const [rival] = useState({
    nickname: 'OPPONENT',
    score: 0,
    combo: 0,
    profileUrl: null,
    position: { x: 50, y: 50 },
    notes: [],
  });

  const calcPos = (pos) => ({
    left: `${pos.x}%`,
    top: `${pos.y}%`,
  });

  if (!isMulti) return null;

  return (
    <div
      style={{
        position: 'fixed',
        width: '300px',
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        padding: '12px',
        boxSizing: 'border-box',
        background: 'rgba(10, 20, 30, 0.6)',
        top: HEADER_HEIGHT,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 20,
      }}
    >
      {/* 네온 라인 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 5,
          height: '100%',
          background: 'linear-gradient(to bottom, #5aeaff, #ff00ea, #5aeaff)',
          boxShadow:
            '0 0 6px rgba(90,234,255,0.8), 0 0 12px rgba(255,80,200,0.6)',
          pointerEvents: 'none',
        }}
      />

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
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: '0.12em', opacity: 0.8 }}>
          RIVAL VIEW
        </div>

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
          {/* 상대 위치 점 */}
          <div
            style={{
              position: 'absolute',
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'red',
              ...calcPos(rival.position),
            }}
          />

          {/* 노트 더미 */}
          {rival.notes.map((note, idx) => (
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              opacity: rival.profileUrl ? 1 : 0.5,
            }}
          >
            {!rival.profileUrl && 'PROFILE'}
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{rival.nickname}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>OPPONENT</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.75 }}>SCORE</span>
          <span style={{ color: '#5aeaff', fontWeight: 700 }}>
            {rival.score}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.75 }}>COMBO</span>
          <span style={{ color: '#ff8cff', fontWeight: 700 }}>
            {rival.combo}
          </span>
        </div>
      </div>
    </div>
  );
}
