import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { unlockAudioContext } from '../../components/engine/SFXManager';
import '../../components/Member/LoginForm.css';
import './Login.css';
import LoginNoteRain from './LoginNoteRain';

export default function RePw() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const emailRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    unlockAudioContext();
  }, []);

  // 쿨타임
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const isValidEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setMsg('이메일을 입력하세요.');
      emailRef.current?.focus();
      emailRef.current?.classList.add('is-error');
      setTimeout(() => emailRef.current?.classList.remove('is-error'), 300);
      return;
    }

    if (!isValidEmail(email)) {
      setMsg('이메일 형식이 올바르지 않습니다.');
      emailRef.current?.focus();
      return;
    }

    if (cooldown > 0) return;

    setIsLoading(true);
    setMsg('');

    try {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      setMsg('입력하신 이메일로 임시 비밀번호를 전송했습니다.');
      setCooldown(60);
    } catch {
      setMsg('서버 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ✅ 레인노트 유지 */}
      <LoginNoteRain />

      <section
        className="login-hero"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}
      >
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

        {/* 중앙 카드 */}
        <div
          className="hero-content"
          style={{
            paddingTop: 280,
            paddingBottom: 48,
            paddingInline: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div className="login-form-wrap">
            <div
              className="login-form"
              style={{
                padding: '56px 48px',
                borderRadius: 18,
                width: 450,
                transform: 'translateY(-30px)',
                scale: 1.2,
                position: 'relative',
                zIndex: 20,
                background: 'rgb(38, 38, 38)',
                boxShadow: `0 20px 60px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05)`,
                color: '#fff',
                textAlign: 'center',
              }}
            >
              <h2 style={{ marginBottom: 24 }}>비밀번호 재설정</h2>

              <div className="login-form__fields">
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="가입한 이메일"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.4)',
                    color: '#fff',
                    fontSize: 16,
                    padding: '0 14px',
                  }}
                />
              </div>

              <div style={{ height: 20, marginTop: 10 }}>
                <div style={{ color: '#ff6b6b', fontSize: 13 }}>
                  {msg || '\u00A0'}
                </div>
              </div>

              <div className="login-form__actions" style={{ marginTop: 12 }}>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || cooldown > 0}
                  className="login-btn primary"
                  style={{
                    width: '100%',
                    height: 48,
                    background: 'linear-gradient(135deg, #00aeffff, #00ccffff)',
                    color: '#000',
                    borderRadius: 12,
                    fontWeight: 600,
                    cursor: (isLoading || cooldown > 0) ? 'not-allowed' : 'pointer',
                    border: 'none',
                    opacity: (isLoading || cooldown > 0) ? 0.6 : 1,
                  }}
                >
                  {isLoading
                    ? '전송 중...'
                    : cooldown > 0
                      ? `재전송 (${cooldown}s)`
                      : '임시 비밀번호 받기'}
                </button>
              </div>

              <div
                className="login-form__links"
                style={{ marginTop: 20, fontSize: 13, color: '#aaa' }}
              >
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/login')}
                >
                  로그인으로 돌아가기
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
