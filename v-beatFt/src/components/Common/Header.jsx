// components/Common/Header.jsx (햄버거 점: 쪽지 OR 관리자 OR 친구)
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProfileAvatar from '../Member/ProfileAvatar';
import {
  playMenuBgmRandom,
  toggleMenuBgm,
  stopMenuBgm,
  isMenuBgmPlaying,
} from '../../components/engine/SFXManager';

import { logoutApi, statusApi } from '../../api/auth';
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
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  
  //차단 여부 확인
  const isBlockUser = status?.loginUserRole === 'BLOCK';

  const handleToggle = () => {
    toggleMenuBgm();
    setIsPlaying(isMenuBgmPlaying());
  };

  // ✅ 알림 상태 (쪽지/관리자/친구)
  const [notify, setNotify] = useState({
    messages: false,
    admin: false,
    friend: false, // ✅ 추가
  });

  const handleLogout = async () => {
    try {
      await logoutApi();
      setStatus(null);
      setMobileOpen(false);

      // ✅ 로그아웃하면 알림 점 끄기
      setNotify({ messages: false, admin: false, friend: false }); // ✅ 수정

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
            loginUserRole: res.data.loginUserRole,
          });
        }
      } catch {
        if (alive) setStatus(null);
      } finally {
        if (alive) setStatusLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ MyPage가 쏘는 이벤트를 받아서 빨간점 on/off
  useEffect(() => {
    const onPmUnread = (e) => {
      const count = Number(e?.detail?.count ?? 0);
      const hasUnread = Number.isFinite(count) && count > 0;

      setNotify((prev) => {
        if (prev.messages === hasUnread) return prev;
        return { ...prev, messages: hasUnread };
      });
    };

    const onAdminAlert = (e) => {
      const count = Number(e?.detail?.count ?? 0);
      const hasAlert = Number.isFinite(count) && count > 0;

      setNotify((prev) => {
        if (prev.admin === hasAlert) return prev;
        return { ...prev, admin: hasAlert };
      });
    };

    // ✅ 추가: 친구 요청 알림
    const onFriendAlert = (e) => {
      const count = Number(e?.detail?.count ?? 0);
      const hasFriend = Number.isFinite(count) && count > 0;

      setNotify((prev) => {
        if (prev.friend === hasFriend) return prev;
        return { ...prev, friend: hasFriend };
      });
    };

    window.addEventListener('pm:unread', onPmUnread);
    window.addEventListener('admin:alert', onAdminAlert);
    window.addEventListener('friend:alert', onFriendAlert); // ✅ 추가

    return () => {
      window.removeEventListener('pm:unread', onPmUnread);
      window.removeEventListener('admin:alert', onAdminAlert);
      window.removeEventListener('friend:alert', onFriendAlert); // ✅ 추가
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

  // ✅ 햄버거: 쪽지 OR 관리자 OR 친구 / 메시지 메뉴: 쪽지만
  const hasDot = notify.messages || notify.admin || notify.friend; // ✅ 수정
  const hasMessageDot = notify.messages;

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
          onClick={() => navigate('/main')}
          alt="V-BEAT"
          style={{
            height: '130px',
            objectFit: 'contain',
            cursor: 'pointer',
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
          <Visualizer active={isPlaying} size="small" />

          <button className="neon-btn" onClick={handleToggle} aria-label="toggle bgm">
            {isPlaying ? (
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

      {/* 닉네임 */}
      {!statusLoading && status && (
        <div
          style={{
            position: 'absolute',
            right: 230,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#5aeaff',
            fontSize: 25,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {status.loginUserNickName}
        </div>
      )}

      {/* 프로필 이미지 */}
      {!statusLoading && status && (
        <div
          style={{
            position: 'absolute',
            right: 320,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1100,
          }}
        >
          <ProfileAvatar
            profileImg={status.loginUser.profileImg}
            userId={status.loginUserId}
            size={50}
          />
        </div>
      )}

      {/* 우측 모바일 메뉴 버튼 */}
      {!isGamePage && (
        <div
          style={{
            position: 'absolute',
            right: '50px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              className="neon-btn"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="mobile menu"
            >
              <svg viewBox="0 0 24 24" width="50" height="40">
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

            {/* ✅ 쪽지 or 관리자 or 친구 알림 있으면 점 (햄버거) */}
            {hasDot && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#ff4d4f',
                  boxShadow: '0 0 6px rgba(255,77,79,0.8)',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* 모바일 메뉴 패널 */}
      {!isGamePage && mobileOpen && (
        <div
          className="mobile-menu-panel"
          style={{
            position: 'absolute',
            right: '30px',
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
          {status && !isBlockUser && (
            <button
              className="neon-btn"
              onClick={() => {
                setMobileOpen(false);
                navigate('/song/upload');
              }}
            >
              곡 등록
            </button>
          )}

          <button className="neon-btn">설정</button>

          {statusLoading ? null : (
            <>
              {status && (
                <>
                  <button className="neon-btn" onClick={() => navigate('/mypage')}>
                    마이페이지
                  </button>

                  {!isBlockUser && (
                    <button
                      className="neon-btn"
                      style={{ position: 'relative' }}
                      onClick={() => {
                        setMobileOpen(false);
                        navigate('/mypage', { state: { tab: 'messages' } });
                      }}
                    >
                      메세지

                      {/* ✅ 쪽지(미확인) 있으면 점 (메세지 메뉴) */}
                      {hasMessageDot && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 6,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#ff4d4f',
                          }}
                        />
                      )}
                    </button>
                  )}

                  <button className="neon-btn" onClick={handleLogout}>
                    로그아웃
                  </button>
                </>
              )}

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
