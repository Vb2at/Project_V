import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { unlockAudioContext } from '../../components/engine/SFXManager';
import './LoginForm.css';

export default function LoginForm() {

    unlockAudioContext();
    localStorage.setItem('bgmUnlocked', 'true');

    // 1. 상태(State) 관리
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [glitchScale, setGlitchScale] = useState(0);

    // 2. 참조(Ref) 및 훅(Hook)
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const logoRef = useRef(null);
    const navigate = useNavigate();

    // 3. 소셜 로그인 처리 (함수명 통합)
    const handleSocialLogin = (provider) => {
        unlockAudioContext();

        const API_BASE = "http://localhost:8080";
        if (provider === 'google') {
            window.location.href = `${API_BASE}/oauth/google`;
        } else if (provider === 'kakao') {
            window.location.href = `${API_BASE}/oauth/kakao`;
        }
    };

    // 4. 일반 로그인 처리
    const handleSubmit = async () => {
        unlockAudioContext();

        if (!email) {
            setErrorMessage('이메일을 입력하세요.');
            emailRef.current?.focus();
            emailRef.current?.classList.add('is-error');
            setTimeout(() => emailRef.current?.classList.remove('is-error'), 300);
            return;
        }

        if (!password.trim()) {
            setErrorMessage('비밀번호를 입력하세요.');
            passwordRef.current?.focus();
            passwordRef.current?.classList.add('is-error');
            setTimeout(() => passwordRef.current?.classList.remove('is-error'), 300);
            return;
        }

        setErrorMessage('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/doLogin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, loginPw: password }),
            });

            const data = await res.json();

            if (!data.ok) {
                setErrorMessage(data.message || '로그인에 실패했습니다.');
                return;
            }

            navigate('/nav-loading', { state: { target: '/main' } });
        } catch {
            setErrorMessage('서버 연결에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 5. 로고 글리치 애니메이션 로직
    useEffect(() => {
        const el = logoRef.current;
        if (!el) return;

        const rand = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(() => {
            const gx = rand(-10, 10);
            const gy = rand(-1.5, 1.5);
            const hue = rand(-40, 40);

            el.style.setProperty('--gx', `${gx}px`);
            el.style.setProperty('--gy', `${gy}px`);
            el.style.setProperty('--hue', `${hue}deg`);

            setGlitchScale(Math.random() > 0.8 ? rand(10, 20) : rand(0, 3));
        }, 120);

        return () => clearInterval(interval);
    }, []);

    // 6. JSX 렌더링 영역
    return (
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
                {/* 로고 영역 */}
                <div
                    className="hero-logo"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        marginBottom: 30,
                    }}
                >
                    <div
                        className="logo-glitch-wrap glitch"
                        ref={logoRef}
                        style={{ filter: 'url(#glitch-filter)' }}
                    >
                        <img
                            src="/images/mainlogo.png"
                            alt="V-BEAT"
                            style={{
                                height: 110,
                                maxWidth: '100%',
                                objectFit: 'contain',
                                transform: 'scale(2.5)',
                                filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.35))',
                            }}
                        />
                    </div>
                </div>

                {/* 입력 폼 영역 */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                >
                    <div className="login-form__fields" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                            type="email"
                            placeholder="이메일"
                            className="login-input"
                            ref={emailRef}
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
                        <input
                            type="password"
                            placeholder="비밀번호"
                            className="login-input"
                            ref={passwordRef}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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

                    {/* 에러 메시지 */}
                    <div style={{ height: 20, marginTop: 10, position: 'relative' }}>
                        <div
                            style={{
                                color: '#ff6b6b',
                                fontSize: 13,
                                opacity: errorMessage ? 1 : 0,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            {errorMessage || '\u00A0'}
                        </div>
                    </div>

                    <div className="login-form__actions" style={{ marginTop: 12 }}>
                        <button
                            className="login-btn primary"
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                height: 48,
                                background: 'linear-gradient(135deg, #00aeffff, #00ccffff)',
                                color: '#000',
                                borderRadius: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: 'none'
                            }}
                        >
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                    </div>
                </form>

                {/* 추가 링크 영역 (회원가입/비밀번호 찾기) */}
                <div
                    className="login-form__links"
                    style={{
                        marginTop: 20,
                        fontSize: 13,
                        color: '#aaa',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '15px'
                    }}
                >
                    <span
                        style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                        onMouseOver={(e) => e.target.style.color = '#00ccff'}
                        onMouseOut={(e) => e.target.style.color = '#aaa'}
                        onClick={() => navigate('/terms')}
                    >
                        회원가입
                    </span>
                    <span style={{ color: '#555', cursor: 'default' }}>|</span>
                    <span
                        style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                        onMouseOver={(e) => e.target.style.color = '#00ccff'}
                        onMouseOut={(e) => e.target.style.color = '#aaa'}
                        onClick={() => navigate('/find-password')}
                    >
                        비밀번호 찾기
                    </span>
                </div>

                {/* 소셜 로그인 영역 */}
                <div
                    style={{
                        marginTop: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <button
                        className="btn bg-white text-black"
                        style={{ width: 260, height: 44, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, border: '1px solid #e5e5e5', cursor: 'pointer' }}
                        onClick={() => handleSocialLogin('google')}
                        disabled={isLoading}
                    >
                        <svg width="16" height="16" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
                        Login with Google
                    </button>
                    <button
                        className="btn bg-[#FEE502] text-[#181600]"
                        style={{ width: 260, height: 44, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, border: '1px solid #f1d800', cursor: 'pointer' }}
                        onClick={() => handleSocialLogin('kakao')}
                        disabled={isLoading}
                    >
                        <svg width="16" height="16" viewBox="0 0 512 512"><path fill="#181600" d="M255.5 48C299.345 48 339.897 56.5332 377.156 73.5996C414.415 90.666 443.871 113.873 465.522 143.22C487.174 172.566 498 204.577 498 239.252C498 273.926 487.174 305.982 465.522 335.42C443.871 364.857 414.46 388.109 377.291 405.175C340.122 422.241 299.525 430.775 255.5 430.775C241.607 430.775 227.262 429.781 212.467 427.795C148.233 472.402 114.042 494.977 109.892 495.518C107.907 496.241 106.012 496.15 104.208 495.248C103.486 494.706 102.945 493.983 102.584 493.08C102.223 492.177 102.043 491.365 102.043 490.642V489.559C103.126 482.515 111.335 453.169 126.672 401.518C91.8486 384.181 64.1974 361.2 43.7185 332.575C23.2395 303.951 13 272.843 13 239.252C13 204.577 23.8259 172.566 45.4777 143.22C67.1295 113.873 96.5849 90.666 133.844 73.5996C171.103 56.5332 211.655 48 255.5 48Z"></path></svg>
                        Kakao 로그인
                    </button>
                </div>

                {/* 게스트 플레이 영역 */}
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={() => {
                            unlockAudioContext();
                            navigate('/start', { state: { target: '/main' } });
                        }}
                        style={{
                            width: 260,
                            height: 44,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: '#ddd',
                            fontSize: 15,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        로그인 없이 플레이
                    </button>
                </div>

                {/* SVG 필터 정의 */}
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <filter id="glitch-filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale={glitchScale} xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </svg>
            </div>
        </div>
    );
}