import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  playMenuBgmRandom,
  toggleMenuBgm,
  stopMenuBgm,
  isMenuBgmPlaying,
} from '../../components/engine/SFXManager';

import { logoutApi, statusApi } from '../../api/auth'; // 로그아웃/상태조회 api
import Visualizer from '../visualizer/Visualizer';

import './Header.css';

export default function Header() {
  const HEADER_HEIGHT = 64;

  const navigate = useNavigate();
  const location = useLocation();
  const isGamePage = location.pathname.startsWith('/game');

  const [isPlaying, setIsPlaying] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ 로그인 상태
  const [status, setStatus] = useState(null); // { loginUserId, loginUser, loginUserNickName }
  const [statusLoading, setStatusLoading] = useState(true);

  const handleToggle = () => {
    toggleMenuBgm();
    setIsPlaying(isMenuBgmPlaying());
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
      setStatus(null);            // ✅ 로그아웃 즉시 UI 반영
      setMobileOpen(false);
      navigate('/login');
    } catch (e) {
      console.error(e);
      alert('로그아웃 실패');
    }
  };

  // ✅ 로그인 상태 확인 (처음 1회)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await statusApi();

        if (res.data?.ok !== true) {
          if (alive) setStatus(null);
          return;
        }

        if (alive) {
          setStatus({
            loginUserId: res.data.loginUserId,
            loginUser: res.data.loginUser,
            loginUserNickName: res.data.loginUserNickName,
          });
        }
      } catch (e) {
        if (alive) setStatus(null);
      } finally {
        if (alive) setStatusLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ 게임 페이지에서는 메뉴 BGM 끄기
  useEffect(() => {
    if (isGamePage) {
      stopMenuBgm();
      setIsPlaying(false);
      setMobileOpen(false);
    }
  }, [isGamePage]);

  // ✅ 게임 페이지가 아닐 때만, 실제 재생상태 polling으로 맞추기
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
          left: '-20px',
          top: '55%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img
          src="/images/logo.png"
          alt="V-BEAT"
          style={{
            height: '130px',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
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
          <button className="neon-btn" onClick={handleToggle} aria-label="toggle bgm">
            {isPlaying ? (
              // ⏸ Pause (네 코드에서는 반대로 주석이 달려있었음)
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
                    <stop offset="100%" stopColor="#ff0080" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              // ▶ Play
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
                    <stop offset="100%" stopColor="#ff0080" />
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
              setIsPlaying(isMenuBgmPlaying());
            }}
            aria-label="random bgm"
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
                  <stop offset="100%" stopColor="#ff0080" />
                </linearGradient>
              </defs>
            </svg>
          </button>
        </div>
      )}

      {/* 우측 모바일 메뉴 버튼 */}
      {!isGamePage && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            className="neon-btn"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="mobile menu"
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                fill="none"
                stroke="url(#grad-mobile)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="grad-mobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5aeaff" />
                  <stop offset="100%" stopColor="#ff0040" />
                </linearGradient>
              </defs>
            </svg>
          </button>
        </div>
      )}

      {/* 모바일 메뉴 패널 */}
      {!isGamePage && mobileOpen && (
        <div
          className="mobile-menu-panel"
          style={{
            position: 'absolute',
            right: '8px',
            top: HEADER_HEIGHT + 6,
            background: 'rgba(10,20,30,0.95)',
            border: '2px solid rgba(90,234,255,0.4)',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 1100,
            boxShadow: '0 0 12px rgba(90,234,255,0.4)',
          }}
        >
          <button className="neon-btn">설정</button>

          {statusLoading ? null : (
            <>
              {/* 로그인 상태에서만 노출 */}
              {status && (
                <>
                  <button className="neon-btn">프로필</button>
                  <button className="neon-btn">메세지</button>
                  <button className="neon-btn" onClick={handleLogout}>
                    로그아웃
                  </button>
                </>
              )}

              {/* 로그아웃 상태에서만 노출 */}
              {!status && (
                <button className="neon-btn" onClick={() => navigate('/login')}>
                  로그인
                </button>
              )}
            </>
          )}
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
          background: 'linear-gradient(to right,#ff0000ff, #ff00eaff, #5aeaff)',
          boxShadow:
            '0 0 6px rgba(255,80,80,0.8), 0 0 12px rgba(255,0,200,0.6), 0 0 20px rgba(90,234,255,0.5)',
          pointerEvents: 'none',
        }}
      />
    </header>
  );
}
