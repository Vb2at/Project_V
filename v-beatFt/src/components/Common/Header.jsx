// components/Common/Header.jsx (햄버거 점: 쪽지 OR 관리자 OR 친구)
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import SettingsModal from './SettingsModal';

import ProfileAvatar from '../Member/ProfileAvatar';
import {
  playMenuBgmRandom,
  toggleMenuBgm,
  stopMenuBgm,
  isMenuBgmPlaying,
} from '../../components/engine/SFXManager';

import { statusApi } from '../../api/auth';
import Visualizer from '../visualizer/Visualizer';

import './Header.css';

const DEFAULT_SETTINGS = {
  judgeText: true,
  comboText: true,
  hitEffect: true,
  hitSound: true,
  bgmVolume: 80,
  previewVolume: 80,
  sfxVolume: 80,
  tapNoteColor: 0x05acb5,
  longNoteColor: 0xb50549,
  fps: 60,
  lowEffect: false,
  visualizer: true,
};

export default function Header({ onLogout = () => { } }) {
  const HEADER_HEIGHT = 64;

  const navigate = useNavigate();
  const location = useLocation();

  const hideHeaderPaths = ['/login', '/join', '/re-password', '/terms','/'];
  const shouldHide = hideHeaderPaths.includes(location.pathname);

  const isGamePage = location.pathname.startsWith('/game');
  const isEditorPage =
    location.pathname.startsWith('/song/editor') ||
    location.pathname.includes('/note/edit');

  const isMenuPage = !isGamePage && !isEditorPage;

  const [isPlaying, setIsPlaying] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ===== 설정 모달 =====
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const v = localStorage.getItem('userSettings');
      if (!v) return { ...DEFAULT_SETTINGS };

      const parsed = JSON.parse(v);

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        tapNoteColor:
          typeof parsed.tapNoteColor === 'number'
            ? parsed.tapNoteColor
            : parseInt(String(parsed.tapNoteColor || '').replace('#', ''), 16) || DEFAULT_SETTINGS.tapNoteColor,
        longNoteColor:
          typeof parsed.longNoteColor === 'number'
            ? parsed.longNoteColor
            : parseInt(String(parsed.longNoteColor || '').replace('#', ''), 16) || DEFAULT_SETTINGS.longNoteColor,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  });


  // ===== 로그인 상태 =====
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const isBlockUser = status?.loginUserRole === 'BLOCK';

  // ===== 알림 상태 =====
  const [notify, setNotify] = useState({
    messages: false,
    admin: false,
    friend: false,
  });

  const hasDot = notify.messages || notify.admin || notify.friend;
  const hasMessageDot = notify.messages;

  // ===== BGM =====
  const handleToggle = () => {
    toggleMenuBgm();
    setIsPlaying(isMenuBgmPlaying());
  };

  // ===== 로그인 상태 조회 =====
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await statusApi();
        if (res.data?.ok) {
          setStatus({
            loginUserId: res.data.loginUserId,
            loginUser: res.data.loginUser,
            loginUserNickName: res.data.loginUserNickName,
            loginUserRole: res.data.loginUserRole,
          });
        } else {
          setStatus(null);
        }
      } catch {
        setStatus(null);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchStatus();
  }, [location.pathname]); // 경로가 바뀔 때마다 로그인 상태 갱신

  // ===== 알림 이벤트 =====
  useEffect(() => {
    const onPmUnread = (e) => {
      const count = Number(e?.detail?.count ?? 0);
      const hasUnread = Number.isFinite(count) && count > 0;

      setNotify((prev) =>
        prev.messages === hasUnread ? prev : { ...prev, messages: hasUnread }
      );
    };

    const onAdminAlert = (e) => {
      const count = Number(e?.detail?.count ?? 0);
      const hasAlert = Number.isFinite(count) && count > 0;

      setNotify((prev) =>
        prev.admin === hasAlert ? prev : { ...prev, admin: hasAlert }
      );
    };

    const onFriendAlert = (e) => {
      const count = Number(e?.detail?.count ?? 0);
      const hasFriend = Number.isFinite(count) && count > 0;

      setNotify((prev) =>
        prev.friend === hasFriend ? prev : { ...prev, friend: hasFriend }
      );
    };

    window.addEventListener('pm:unread', onPmUnread);
    window.addEventListener('admin:alert', onAdminAlert);
    window.addEventListener('friend:alert', onFriendAlert);

    return () => {
      window.removeEventListener('pm:unread', onPmUnread);
      window.removeEventListener('admin:alert', onAdminAlert);
      window.removeEventListener('friend:alert', onFriendAlert);
    };
  }, []);

  // ===== 게임 페이지 진입 시 메뉴 BGM 정리 =====
  useEffect(() => {
    if (!isMenuPage) {
      stopMenuBgm();
      setIsPlaying(false);
      setMobileOpen(false);
    }
  }, [isMenuPage]);

  // ===== 메뉴 페이지에서만 BGM 상태 싱크 =====
  useEffect(() => {
    if (!isMenuPage) return;

    const sync = setInterval(() => {
      setIsPlaying(isMenuBgmPlaying());
    }, 300);

    return () => clearInterval(sync);
  }, [isMenuPage]);

  return (
    <>
      {!shouldHide && (

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
              }}
            />
          </div>

          {/* BGM 컨트롤 */}
          {isMenuPage && (
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

          {/* 프로필 + 닉네임 */}
          {!statusLoading && status && (
            <div
              style={{
                position: 'absolute',
                right: 230, // 전체 묶음 기준 위치
                top: '50%',
                transform: 'translateY(-50%)',

                display: 'flex',
                alignItems: 'center',
                gap: '10px',

                zIndex: 1100,
                maxWidth: '260px', // 닉네임 영역 포함 전체 폭 제한
                overflow: 'hidden',
              }}
            >
              <ProfileAvatar
                profileImg={status.loginUser?.profileImg}
                userId={status.loginUserId}
                size={50}
              />

              <div
                style={{
                  color: '#5aeaff',
                  fontSize: 25,
                  fontWeight: 600,

                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={status.loginUserNickName}
              >
                {status.loginUserNickName}
              </div>
            </div>
          )}


          {/* 햄버거 */}
          {isMenuPage && (
            <div
              style={{
                position: 'absolute',
                right: '70px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <div style={{ position: 'relative' }}>
                <button
                  className="neon-btn"
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label="mobile menu"
                >
                  <svg viewBox="0 0 24 24" width="30" height="30">
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
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* 모바일 메뉴 */}
          {isMenuPage && mobileOpen && (
            <div
              style={{
                position: 'absolute',
                right: '38px',
                top: HEADER_HEIGHT + 6,
                background: 'rgba(10,20,30,0.95)',
                border: '2px solid rgba(90,234,255,0.4)',
                borderRadius: '10px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 1100,
              }}
            >
              <button
                className="neon-btn"
                onClick={() => {
                  setMobileOpen(false);
                  navigate('/main');
                }}
              >
                메인페이지
              </button>

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

              <button
                className="neon-btn"
                onClick={() => {
                  setMobileOpen(false);
                  setSettingsOpen(true);
                }}
              >
                설정
              </button>

              {!statusLoading && status && (
                <>
                  <button
                    className="neon-btn"
                    onClick={() => navigate('/mypage')}
                  >
                    마이페이지
                  </button>

                  {!isBlockUser && (
                    <button
                      className="neon-btn"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate('/mypage', { state: { tab: 'messages' } });
                      }}
                    >
                      메세지 {hasMessageDot ? '•' : ''}
                    </button>
                  )}

                  <button
                    className="neon-btn"
                    onClick={() => {
                      setMobileOpen(false);
                      setStatus(null);
                      onLogout();
                    }}
                  >
                    로그아웃
                  </button>
                </>
              )}

              {!status && !statusLoading && (
                <button className="neon-btn" onClick={() => navigate('/login')}>
                  로그인
                </button>
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
              background:
                'linear-gradient(to right,#ff0000ff, #ff00eaff, #5aeaff)',
            }}
          />
        </header>
      )}

      {/* 설정 모달 */}
      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        onApply={() => {
          localStorage.setItem('userSettings', JSON.stringify(settings));
          window.dispatchEvent(new Event('settings:changed'));
          setSettingsOpen(false);
        }}
        onReset={() => {
          setSettings(DEFAULT_SETTINGS);
          localStorage.setItem('userSettings', JSON.stringify(DEFAULT_SETTINGS));
          window.dispatchEvent(new Event('settings:changed'));
        }}
      />
    </>
  );
}
