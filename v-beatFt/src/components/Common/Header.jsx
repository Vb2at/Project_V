// src/components/common/Header.jsx

export default function Header() {
  const HEADER_HEIGHT = 64;
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: HEADER_HEIGHT + 'px',
        background: 'rgba(10, 20, 30, 0.6)',
        zIndex: 1000,
      }}
    >
      V-BEAT
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,               // ← 하단 경계
          width: '100%',
          height: '4px',
          background:
            'linear-gradient(to right,#ff0000ff, #ff00eaff, #5aeaff)',
          boxShadow:
            '0 0 6px rgba(255,80,80,0.8), 0 0 12px rgba(255,0,200,0.6), 0 0 20px rgba(90,234,255,0.5)',
          pointerEvents: 'none',
        }}
      />
    </header>
  );

}
