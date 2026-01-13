import { useEffect, useState, useRef } from 'react';
import './Login.css';
import LoginForm from '../../components/Member/LoginForm';
import {
  singleBgm,
  isMenuBgmPlaying,
  stopMenuBgm,
} from '../../components/engine/SFXManager';
import LoginNoteRain from './LoginNoteRain';

export default function Login() {
  const [bgmOn, setBgmOn] = useState(true);
  const LOGIN_BGM_SRC = '/sound/bgm/menu2.mp3';
  const logoRef = useRef(null);

  // ✅ 로그인 진입 시 고정 BGM 자동 재생
  useEffect(() => {
    singleBgm({
      src: LOGIN_BGM_SRC,
      loop: true,
      volume: 0.4,
    });

    return () => {
      stopMenuBgm();
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();

    const tick = (now) => {
      const t = (now - start) / 1000;

      const scale = 1 + Math.sin(t * 1.0) * 0.10;   // 진폭 3%

      if (logoRef.current) {
        logoRef.current.style.transform =
          `translateY(-180px) scale(${scale})`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ✅ BGM 토글 (반드시 singleBgm / stop 사용)
  const toggleBgm = () => {
    const playing = isMenuBgmPlaying();

    if (!playing) {
      singleBgm({
        src: LOGIN_BGM_SRC,
        loop: true,
        volume: 0.4,
      });
      setBgmOn(true);
    } else {
      stopMenuBgm();
      setBgmOn(false);
    }
  };

  return (
    <div className="login-page">
      <LoginNoteRain />
      {/* 상단 Hero 영역 */}
      <section className="login-hero">
        {/* 배경 */}
        <div
          className="hero-bg"
          style={{
            background: `
              linear-gradient(
                180deg,
                #8f0015 0%,
                #120000 50%,
                #007a86 100%
              )
            `,
          }}
        />

        {/* 오버레이 */}
        <div
          className="hero-overlay"
          style={{
            background: `
              radial-gradient(
                circle at center,
                rgba(0,0,0,0.05) 0%,
                rgba(0,0,0,0.15) 60%,
                rgba(0,0,0,0.30) 100%
              )
            `,
          }}
        />

        {/* 우측 상단 BGM 토글 버튼 */}
        <button
          onClick={toggleBgm}
          style={{
            position: 'absolute',
            top: 20,
            right: 24,
            zIndex: 10,
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(0,0,0,0.35)',
            color: '#fff',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            fontSize: 12,
          }}
        >
          {bgmOn ? 'BGM ON' : 'BGM OFF'}
        </button>

        {/* 중앙 컨텐츠 */}
        <div
          className="hero-content"
          style={{
            paddingTop: 80,
            paddingBottom: 48,
            paddingInline: 24,
            gap: 8,
          }}
        >
          {/* 상단 로고 */}
          <div
            className="hero-logo"
            style={{
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <img
              ref={logoRef}
              src="/images/mainlogo.png"
              alt="V-BEAT"
              style={{
                height: 500,
                maxWidth: '100%',
                objectFit: 'contain',
                transform: 'translateY(-180px)',
                filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.35))',
              }}
            />
          </div>

          {/* 로그인 폼 */}
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
