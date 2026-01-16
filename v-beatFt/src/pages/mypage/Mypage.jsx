// pages/member/MyPage.jsx
import { useEffect, useRef } from 'react';
import Header from '../../components/Common/Header';
import Visualizer from '../../components/visualizer/Visualizer';
import ProfileSection from './ProfileSection';
import Message from "./Message";
import Friends from './Friends';
import { getMenuAnalyser, playMenuBgmRandom, isMenuBgmPlaying } from '../../components/engine/SFXManager';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamation } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router-dom';

export default function MyPage() {
    const analyserRef = useRef(null);
    const location = useLocation();

    const [tab, setTab] = useState(
        location.state?.tab ?? 'profile'
    );
    const [status, setStatus] = useState(null);
    const [notify, setNotify] = useState({
        messages: true, // 테스트용
        friends: false,
    });

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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{label}</span>

                                {(key === 'messages' && notify.messages) && <AlertMark />}
                                {(key === 'friends' && notify.friends) && <AlertMark />}
                            </div>
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
                    {tab === 'manager' && <div>관리자</div>}
                    {tab === 'profile' && <ProfileSection user={status} />}
                    {tab === 'games' && <div>내 게임 목록</div>}
                    {tab === 'records' && <div>플레이 기록</div>}
                    {tab === 'friends' && <Friends user={status} />}
                    {tab === 'messages' && <Message />}
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
function Dot() {
    return (
        <span
            style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ff4d4f',
                display: 'inline-block',
            }}
        />
    );
}
function AlertMark() {
    return (
        <FontAwesomeIcon
            icon={faExclamation}
            style={{
                color: '#ff4d4f',
                fontSize: 20,
            }}
        />
    );
}
