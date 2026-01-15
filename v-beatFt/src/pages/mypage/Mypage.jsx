// pages/member/MyPage.jsx
import { useEffect, useRef } from 'react';
import Header from '../../components/Common/Header';
import Visualizer from '../../components/visualizer/Visualizer';
import ProfileSection from '../../components/Member/ProfileSection';
import { getMenuAnalyser, playMenuBgmRandom, isMenuBgmPlaying } from '../../components/engine/SFXManager';
import { useState } from 'react';

export default function MyPage() {
    const analyserRef = useRef(null);
    const [tab, setTab] = useState('profile');
    const [status, setStatus] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/auth/status', { credentials: 'include' });
                const data = await res.json();
                if (data?.ok) setStatus(data);
            } catch { }
        })();
    }, []);

    // 메뉴 BGM 유지
    useEffect(() => {
        if (!isMenuBgmPlaying()) {
            playMenuBgmRandom();
        }
    }, []);

    // analyser 연결 (MainOverlay와 동일 방식)
    useEffect(() => {
        const id = setInterval(() => {
            const a = getMenuAnalyser();
            if (a) {
                analyserRef.current = a;
                clearInterval(id);
            }
        }, 50);

        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <Header />

            {/* ===== 메인 콘텐츠 영역 ===== */}
            <main
                style={{
                    position: 'absolute',
                    top: 64,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    padding: '40px 21%',
                    gap: '0px',
                }}
            >
                {/* 좌측 메뉴 */}
                <aside
                    style={{
                        width: '220px',
                        borderRadius: '12px',
                        background: 'rgba(20,22,28,0.7)',
                        padding: '14px',
                    }}
                >
                    {[
                        ['profile', '프로필'],
                        ['games', '내 게임'],
                        ['records', '플레이 기록'],
                        ['friends', '친구'],
                        ['messages', '메시지'],
                        ['policy', '약관 / 탈퇴'],
                    ].map(([key, label]) => (
                        <div
                            key={key}
                            onClick={() => setTab(key)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: tab === key ? '#5aeaff' : '#cfd8e3',
                                fontWeight: tab === key ? 600 : 400,
                            }}
                        >
                            {label}
                        </div>
                    ))}
                </aside>

                {/* 우측 패널 */}
                <section
                    style={{
                        width: '100%',
                        maxWidth: '860px',
                        margin: '0 auto',
                        borderRadius: '14px',
                        background: 'rgba(20,22,28,0.65)',
                        padding: '20px',
                    }}
                >
                    {tab === 'profile' && <ProfileSection user={status} />}
                    {tab === 'games' && <div>내 게임 목록</div>}
                    {tab === 'records' && <div>플레이 기록</div>}
                    {tab === 'friends' && <div>친구 목록</div>}
                    {tab === 'messages' && <div>메시지 목록</div>}
                    {tab === 'policy' && <div>약관 / 회원탈퇴</div>}
                </section>
            </main>

            {/* ===== Visualizer ===== */}
            <Visualizer
                size="game"
                preset="menu"
                analyserRef={analyserRef}
                active={true}
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '28vh',
                    zIndex: -2,
                    pointerEvents: 'none',
                }}
            />

            {/* Blur Overlay */}
            <div
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '100vh',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    background: 'rgba(255,255,255,0.03)',
                    zIndex: -1,
                    pointerEvents: 'none',
                }}
            />
        </div >
    );
}
