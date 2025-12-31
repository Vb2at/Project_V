// src/components/common/LeftSidebar.jsx
export default function LeftSidebar({ score, combo, diff }) {
  const HEADER_HEIGHT = 64;
  return (
    <div
      style={{
        width: '260px',
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        padding: '24px 16px',
        boxSizing: 'border-box',
        color: '#e6faff',
        background: 'rgba(10, 20, 30, 0.6)',
        position: 'fixed',
        top: HEADER_HEIGHT + 'px',
        left: 0,
        maskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '5px',
          height: '100%',
          background: 'linear-gradient(to bottom, #ff0000ff, #ff00eaff, #5aeaff)',
          boxShadow: `0 0 6px rgba(255,80,80,0.8),0 0 12px rgba(255,80,200,0.6),0 0 20px rgba(90,234,255,0.5)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ fontSize: '20px', fontWeight: 700 }}>
        곡 제목
      </div>
        <div style={{ marginTop: '12px' }}>
          <div
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '6px',
              border: '2px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              opacity: 0.7,
            }}
          >
            앨범커버
          </div>
      </div>
      <div style={{ marginTop: '6px', fontSize: '14px', opacity: 0.8 }}>
        난이도: {String(diff).toUpperCase()}
      </div>

      <div style={{ marginTop: '32px', fontSize: '18px' }}>
        점수: {score}
      </div>

      <div style={{ marginTop: '12px', fontSize: '14px', opacity: 0.7 }}>
        콤보: {combo}
      </div>
    </div>
  );
}
