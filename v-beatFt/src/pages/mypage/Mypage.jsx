// pages/member/MyPage.jsx
import { useEffect, useRef, useState } from 'react';
import Header from '../../components/Common/Header';
import Visualizer from '../../components/visualizer/Visualizer';
import ProfileSection from './ProfileSection';
import Background from '../../components/Common/Background';
import Message from "./Message";
import Friends from './Friends';
import MyGames from './MyGames';
import Records from './Records';
import Policy from './Policy';
import Manager from './Manager';
import {
    getMenuAnalyser,
    playMenuBgmRandom,
    isMenuBgmPlaying,
} from '../../components/engine/SFXManager';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamation } from '@fortawesome/free-solid-svg-icons';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';

export default function MyPage() {
    const analyserRef = useRef(null);
    const location = useLocation();

    const [tab, setTab] = useState(location.state?.tab ?? 'profile');
    const [status, setStatus] = useState(null);
    const [notify, setNotify] = useState({
        messages: true, // 테스트용
        friends: false,
    });
    const [myInfo, setMyInfo] = useState(null);

    // 내 정보 조회
    useEffect(() => {
        const fetchMyInfo = async () => {
            try {
                const { data } = await api.get('/api/user/myInfo');
                if (!data.ok) {
                    alert(data.message);
                    return;
                }
                setMyInfo(data.user);
            } catch (e) {
                console.error(e);
                alert('정보 조회 실패');
            }
        };
        fetchMyInfo();
    }, []);

    // 로그인 상태 조회
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/auth/login/status', {
                    credentials: 'include',
                });
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

    // analyser 연결
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

    if (!myInfo) return null;

    return (
        <div style={{ position: 'absolute', inset: 0 }}>

            <Background
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: -3,
                }}
            />

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
                        ['manager', '관리자'],
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
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <span>{label}</span>
                                {key === 'messages' && notify.messages && <AlertMark />}
                                {key === 'friends' && notify.friends && <AlertMark />}
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
                        overflowY: 'auto',
                        maxHeight: 'calc(100vh - 64px - 80px)',
                    }}
                >
                    {tab === 'manager' && <Manager />}
                    {tab === 'profile' && (
                        <ProfileSection myInfo={myInfo} status={status} />
                    )}
                    {tab === 'games' && <MyGames />}
                    {tab === 'records' && <Records />}
                    {tab === 'friends' && <Friends user={status} />}
                    {tab === 'messages' && <Message />}
                    {tab === 'policy' && <Policy />}
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
        </div>
    );
}

function AlertMark() {
    return (

        <FontAwesomeIcon
            icon={faExclamation}
            style={{ color: '#ff4d4f', fontSize: 20 }}
        />
    );
}
