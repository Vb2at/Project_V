import './LoginForm.css';
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const navigate = useNavigate();
    const logoRef = useRef(null);

    const handleSubmit = () => {
        if (!email) {
            setErrorMessage('이메일을 입력하세요.');
            emailRef.current?.focus();
            emailRef.current?.classList.add('is-error');
            setTimeout(() => emailRef.current?.classList.remove('is-error'), 300);
            return;
        }

        if (!password) {
            setErrorMessage('비밀번호를 입력하세요.');
            passwordRef.current?.focus();
            passwordRef.current?.classList.add('is-error');
            setTimeout(() => passwordRef.current?.classList.remove('is-error'), 300);
            return;
        }

        setErrorMessage('');
        setIsLoading(true);

        // ✅ 다음 단계에서 여기에 API 호출이 들어갑니다.
        setTimeout(() => {
            console.log('SUBMIT OK', { email, password });
            setIsLoading(false);
        }, 800);
    };

    useEffect(() => {
        const el = logoRef.current;
        if (!el) return;

        const interval = setInterval(() => {
            el.classList.add('logo-glitch');

            setTimeout(() => {
                el.classList.remove('logo-glitch');
            }, 250);   // 글리치 지속 시간
        }, 2800);     // 몇 초마다 발생할지

        return () => clearInterval(interval);
    }, []);
    return (
        <div
            className="login-form"
            style={{
                padding: '56px 48px',
                borderRadius: 18,
                transform: 'translateY(-30px)',
                scale: 1.2,
                position: 'relative',
                zIndex: 20,
                background: 'rgb(56, 56, 56)',
                boxShadow: `
          0 20px 60px rgba(0, 0, 0, 0.6),
          inset 0 0 0 1px rgba(255, 255, 255, 0.05)
        `,
                color: '#fff',
                textAlign: 'center',
            }}
        >
            {/* 상단 로고 */}
            <div
                className="hero-logo"
                style={{
                    display: 'flex',              // ✅ 가운데 정렬
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    marginBottom: 12,
                }}
            >
                <img
                    ref={logoRef}
                    src="/images/mainlogo.png"
                    alt="V-BEAT"
                    style={{
                        height: 130,                 // ✅ 실제 필요한 크기로 축소
                        maxWidth: '100%',
                        objectFit: 'contain',
                        transform: 'scale(2.8)',
                        filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.35))',
                    }}
                />
            </div>

            {/* 입력 폼 */}
            <div className="login-form__fields">
                <input
                    type="email"
                    placeholder="이메일"
                    className="login-input"
                    ref={emailRef}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(0,0,0,0.4)',
                        color: '#fff',
                        fontSize: 20,
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
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(0,0,0,0.4)',
                        color: '#fff',
                        fontSize: 20,
                        padding: '0 14px',
                    }}
                />
            </div>
            {/* 로그인에러메세지 */}
            <div
                style={{
                    position: 'relative',
                    height: 20,
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ff6b6b',
                        fontSize: 13,
                        pointerEvents: 'none',
                        opacity: errorMessage ? 1 : 0,
                    }}
                >
                    {errorMessage || '\u00A0'}
                </div>
            </div>
            {/* 버튼 영역 */}
            <div className="login-form__actions">
                <button
                    className="login-btn primary"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    style={{
                        background: 'linear-gradient(135deg, #00aeffff, #00ccffff)',
                        color: '#000',
                        borderRadius: 12,
                        fontWeight: 600,
                    }}
                >
                    {isLoading ? '로그인 중...' : '로그인'}
                </button>
            </div>

            {/* 하단 링크 */}
            <div
                className="login-form__links"
                style={{
                    marginTop: 18,
                    fontSize: 13,
                }}
            >
                <button
                    className="link-btn"
                    onClick={() => navigate('/join')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#bbb',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                    }}
                >
                    회원가입
                </button>

                <span
                    className="divider"
                    style={{ opacity: 0.4 }}
                >
                    |
                </span>

                <button
                    className="link-btn"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#bbb',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                    }}
                >
                    비밀번호 찾기
                </button>
            </div>
            {/* ===== 소셜 로그인 버튼 ===== */}
            <div
                style={{
                    marginTop: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,                 // ✅ 버튼 간격
                }}
            >
                <button
                    className="btn bg-white text-black border-[#e5e5e5]"
                    style={{ width: 260, fontWeight: 'bold', }}   // ✅ 동일 폭
                >
                    <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
                    Login with Google
                </button>
                <button
                    className="btn bg-[#FEE502] text-[#181600] border-[#f1d800]"
                    style={{ width: 260, fontWeight: 'bold', }}   // ✅ 동일 폭
                >
                    <svg aria-label="Kakao logo" width="16" height="16" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="#181600" d="M255.5 48C299.345 48 339.897 56.5332 377.156 73.5996C414.415 90.666 443.871 113.873 465.522 143.22C487.174 172.566 498 204.577 498 239.252C498 273.926 487.174 305.982 465.522 335.42C443.871 364.857 414.46 388.109 377.291 405.175C340.122 422.241 299.525 430.775 255.5 430.775C241.607 430.775 227.262 429.781 212.467 427.795C148.233 472.402 114.042 494.977 109.892 495.518C107.907 496.241 106.012 496.15 104.208 495.248C103.486 494.706 102.945 493.983 102.584 493.08C102.223 492.177 102.043 491.365 102.043 490.642V489.559C103.126 482.515 111.335 453.169 126.672 401.518C91.8486 384.181 64.1974 361.2 43.7185 332.575C23.2395 303.951 13 272.843 13 239.252C13 204.577 23.8259 172.566 45.4777 143.22C67.1295 113.873 96.5849 90.666 133.844 73.5996C171.103 56.5332 211.655 48 255.5 48Z"></path></svg>
                    Kakao 로그인
                </button>
            </div>
            {/* ===== 로그인 없이 플레이 ===== */}
            <div
                style={{
                    marginTop: 12,
                    display: 'flex',
                    justifyContent: 'center',
                }}
            >
                <button
                    onClick={() => navigate('/nav-loading', { state: { target: '/main' } })}
                    style={{
                        width: 260,
                        height: 44,
                        borderRadius: 5,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        color: '#ddd',
                        fontSize: 16,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        fontWeight: 'bold',
                    }}
                >
                    로그인 없이 플레이
                </button>
            </div>
        </div >
    );
}
