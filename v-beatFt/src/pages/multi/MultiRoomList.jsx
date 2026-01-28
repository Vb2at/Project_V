export default function MultiRoomList() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Header 그대로 사용 가능 */}

      <main style={{ position: 'absolute', top: 64, left: 0, right: 0, bottom: 0 }}>
        <div
          style={{
            position: 'absolute',
            left: '10%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '48%',
            height: '62%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* 🔵 멀티 컨트롤 바 */}
          <div
            style={{
              height: 42,
              border: '1px solid rgba(90,234,255,0.6)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 12px',
            }}
          >
            <button>공개방</button>
            <button>방 만들기</button>
            <button>초대 입장</button>
          </div>

          {/* 🟡 방 리스트 영역 */}
          <div
            style={{
              flex: 1,
              border: '2px solid rgba(255,255,0,0.8)',
              borderRadius: 12,
              overflowY: 'auto',
              padding: 12,
            }}
          >
            방 리스트
          </div>
        </div>

        {/* 🔴 오른쪽 패널 (일단 비워둠) */}
        <div
          style={{
            position: 'absolute',
            right: '10%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '22%',
            height: '70%',
            borderRadius: 14,
            background: 'rgba(120,0,0,0.35)',
          }}
        />
      </main>
    </div>
  );
}
