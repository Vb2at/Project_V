import { useEffect, } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Login.css';                 // ✅ 로그인 배경 스타일 재사용
import LoginNoteRain from './LoginNoteRain';
import JoinForm from '../../components/Member/JoinForm';

export default function Join() {
    const { state } = useLocation();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (!state?.terms) {
            navigate('/login', { replace: true });
        }

        return () => { };
    }, [state, navigate]);



    return (
        <div className="login-page">
            <LoginNoteRain />

            <section
                className="login-hero"
                style={{
                    // ✅ 카드가 왼쪽으로 밀리는 문제 해결 핵심
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                }}
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

                {/* 중앙 컨텐츠 */}
                <div
                    className="hero-content"
                    style={{
                        paddingTop: 80,
                        paddingBottom: 48,
                        paddingInline: 24,
                        gap: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <JoinForm />
                </div>
            </section>
        </div>
    );
}
