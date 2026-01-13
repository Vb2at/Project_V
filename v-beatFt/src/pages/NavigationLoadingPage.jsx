import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoadingNoteRain from './gameplay/LoadingNoteRain';   // 경로 맞게 유지

const TIPS = [
  "SYSTEM · Neural sync stabilizing...",
  "TIP · 롱노트는 끝까지 유지하면 추가 점수를 얻습니다.",
  "CORE · Signal latency calibrated.",
  "TIP · Perfect 판정은 점수 보너스를 제공합니다.",
];

const DURATION = 1200;   // 이동 연출 시간(ms)

export default function NavigationLoadingPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [loadingPercent, setLoadingPercent] = useState(0);
  const startRef = useRef(0);
  const [tipIndex, setTipIndex] = useState(
    () => Math.floor(Math.random() * TIPS.length)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 3500);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    startRef.current = performance.now();

    let rafId = 0;

    const tick = () => {
      const now = performance.now();
      const progress = Math.min(1, (now - startRef.current) / DURATION);

      setLoadingPercent(progress * 100);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        const target = state?.target ?? '/main';
        navigate(target, { replace: true });
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [navigate, state]);

  return (
    <>
      {/* ===== 로딩 화면 ===== */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, #220000, #000)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: '460px',
            height: '180px',
            position: 'relative',
            borderRadius: '14px',
            overflow: 'hidden',
          }}
        >
          {/* 페이크 노트 낙하 */}
          <LoadingNoteRain count={10} />

          {/* LOADING 텍스트 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '32px',
              letterSpacing: '6px',
              color: '#ff00bfff',
              textShadow: `
                0 0 8px #ff4a4a,
                0 0 24px #ff0000,
                0 0 48px #aa0000
              `,
              pointerEvents: 'none',
            }}
          >
            이동중...
          </div>

          {/* === 로딩 에너지바 === */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              height: '10px',
              background: 'rgba(255,0,0,0.15)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${loadingPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff3a3a, #ff0000)',
                boxShadow: `
                  0 0 8px rgba(255,80,80,0.8),
                  0 0 16px rgba(255,0,0,0.6)
                `,
              }}
            />
          </div>

          {/* === 퍼센트 텍스트 === */}
          <div
            style={{
              position: 'absolute',
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '18px',
              color: '#ffaaaa',
              letterSpacing: '2px',
              textShadow: '0 0 6px rgba(255,80,80,0.8)',
              pointerEvents: 'none',
            }}
          >
            {Math.round(loadingPercent)}%
          </div>

          {/* === TIP 텍스트 === */}
          <div
            style={{
              position: 'fixed',   // ✅ 여기만 변경
              bottom: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 12,
              opacity: 0.65,
              color: '#7df9ff',
              letterSpacing: '0.04em',
              pointerEvents: 'none',
              textShadow: '0 0 8px rgba(125,249,255,0.35)',
            }}
          >
            {TIPS[tipIndex]}
          </div>
        </div>
      </div>
    </>
  );
}
