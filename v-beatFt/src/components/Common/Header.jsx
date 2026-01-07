import { useState, useEffect } from 'react';
import {
  playMenuBgmRandom,
  toggleMenuBgm,
  stopMenuBgm,
  isMenuBgmPlaying,
} from '../../components/engine/SFXManager';
import './Header.css';
import Visualizer from '../visualizer/Visualizer';
import { useLocation } from 'react-router-dom';

export default function Header() {
  const HEADER_HEIGHT = 64;
  const [isPlaying, setIsPlaying] = useState(false);

  const location = useLocation();
  const isGamePage = location.pathname.startsWith('/game');

  const handleToggle = () => {
    toggleMenuBgm();
    setIsPlaying(isMenuBgmPlaying());
  };

  useEffect(() => {
    if (isGamePage) {
      stopMenuBgm();
    }
  }, [isGamePage]);

  useEffect(() => {
    if (isGamePage) return;

    const sync = setInterval(() => {
      setIsPlaying(isMenuBgmPlaying());
    }, 300);

    return () => clearInterval(sync);
  }, [isGamePage]);
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
      {/* 좌측 타이틀 */}
      <div
        style={{
          position: 'absolute',
          left: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        V-BEAT
      </div>

      {/* 🎧 메인메뉴에서만 BGM 컨트롤 표시 */}
      {!isGamePage && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Visualizer */}
          <Visualizer active={isPlaying} size="small" />

          {/* 재생 / 일시정지 */}
          <button className="neon-btn" onClick={handleToggle}>
            {isPlaying ? (
              // ▶ Play
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path
                  d="M8 5v14M16 5v14"
                  fill="none"
                  stroke="url(#grad-toggle)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="grad-toggle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5aeaff" />
                    <stop offset="100%" stopColor="#ff00ea" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              // ⏸ Pause
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path
                  d="M7 4l12 8-12 8V4z"
                  fill="none"
                  stroke="url(#grad-toggle)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="grad-toggle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5aeaff" />
                    <stop offset="100%" stopColor="#ff00ea" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </button>

          {/* 랜덤 재생 */}
          <button
            className="neon-btn"
            onClick={() => {
              playMenuBgmRandom();
              setIsPlaying(isMenuBgmPlaying());   // ✅ 실제 상태 기준
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                d="M5 4l7 8-7 8V4zm8 0l7 8-7 8V4z"
                fill="none"
                stroke="url(#grad-next)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="grad-next" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5aeaff" />
                  <stop offset="100%" stopColor="#ff00ea" />
                </linearGradient>
              </defs>
            </svg>
          </button>
        </div>
      )}

      {/* 하단 네온 바 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
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
