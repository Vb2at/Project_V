export default function HUDFrame({ children }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '88px',
        left: '28%',
        transform: 'translateX(-50%)',
        width: '460px',
        padding: '14px 18px 18px',
        pointerEvents: 'none',
        zIndex: 90,

        /* 배경만 유지 (프레임 박스 느낌 제거) */
        background: `
          linear-gradient(180deg,
            rgba(120,200,255,0.10),
            rgba(40,80,120,0.03)
          )
        `,
        backdropFilter: 'blur(6px)',

        /* ❌ 전체 외곽 제거 */
        border: 'none',
        boxShadow: 'none',
      }}
    >
      {/* ✅ 상단 얇은 UV 기준선 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, #5aeaff, transparent)',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      {/* ✅ 좌측 UV 네온 포인트 */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: 0,
          width: '3px',
          height: '60%',
          background: 'linear-gradient(#5aeaff, #ff4dff)',
          boxShadow: '0 0 8px rgba(90,234,255,0.9)',
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      />

      {/* HUD 본문 */}
      {children}
    </div>
  );
}
