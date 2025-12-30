// src/components/common/Header.jsx

export default function Header() {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '64px',   // ← 실제 헤더 높이
        background: '#000',
        zIndex: 1000,
      }}
    >
      V-BEAT
    </header>
  );
}
