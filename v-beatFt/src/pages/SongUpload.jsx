import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import Header from '../components/Common/Header';
import Background from '../components/Common/Background';
import Visualizer from '../components/visualizer/Visualizer';

import {
    getMenuAnalyser,
    playMenuBgmRandom,
    isMenuBgmPlaying,
} from '../components/engine/SFXManager';
export default function SongUpload() {
    const neonInput = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        background: 'linear-gradient(180deg, #0e141b 0%, #0a0f15 100%)',
        border: '1px solid rgba(90,234,255,0.35)',
        color: '#e6f7ff',
        outline: 'none',
        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.6)',
    };
    const neonInputFocus = {
        border: '1px solid rgba(90,234,255,0.8)',
        boxShadow: '0 0 8px rgba(90,234,255,0.6)',
    };


    const navigate = useNavigate();
    const analyserRef = useRef(null);

    /* ===== form state ===== */
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [visibility, setVisibility] = useState('PRIVATE');
    const [coverFile, setCoverFile] = useState(null);
    const [audioFile, setAudioFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    /* ===== 메뉴 BGM 유지 ===== */
    useEffect(() => {
        if (!isMenuBgmPlaying()) playMenuBgmRandom();
    }, []);

    /* ===== analyser 연결 ===== */
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

    /* ===== 업로드 ===== */
    const handleSubmit = async () => {
        if (!title || !artist || !coverFile || !audioFile) {
            alert('모든 항목을 입력해 주세요.');
            return;
        }

        const form = new FormData();
        form.append('title', title);
        form.append('artist', artist);
        form.append('visibility', visibility);
        form.append('cover', coverFile);
        form.append('audio', audioFile);

        try {
            setLoading(true);

            const res = await axios.post('/api/songs/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
            });

            const song = res.data;

            alert(
                visibility === 'PUBLIC'
                    ? '업로드 완료! 관리자 심사 후 공개됩니다.'
                    : '업로드 완료!'
            );

            navigate(`/song/editor/${song.songId}`, { state: { song } });
        } catch (e) {
            console.error(e);
            alert('업로드 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <Background style={{ position: 'fixed', inset: 0, zIndex: -3 }} />
            <Header />

            {/* ===== 메인 ===== */}
            <main
                style={{
                    position: 'absolute',
                    top: 64,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* ===== 좌우 박스 래퍼 ===== */}
                <div
                    style={{
                        display: 'flex',
                        gap: 80,
                    }}
                >
                    {/* ================= 왼쪽: 앨범 커버 ================= */}
                    <div
                        onClick={() => document.getElementById('cover-input').click()}
                        style={{
                            width: 480,
                            height: 480,
                            borderRadius: 18,
                            background: coverPreview
                                ? `url(${coverPreview}) center / cover no-repeat`
                                : 'linear-gradient(180deg, #2a2f38 0%, #151a22 100%)',
                            border: '2px solid rgba(90,234,255,0.55)',
                            boxShadow: '0 0 20px rgba(90,234,255,0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9fbfd4',
                            cursor: 'pointer',
                        }}
                    >
                        {!coverPreview && (
                            <span
                                style={{
                                    color: '#9fb0c2',
                                    letterSpacing: 2,
                                    fontWeight: 600,
                                    opacity: 0.7,
                                }}
                            >
                                ALBUM
                            </span>
                        )}
                    </div>

                    {/* ================= 오른쪽: 정보 입력 ================= */}
                    <div
                        style={{
                            width: 500,
                            height: 350,
                            marginTop: 50,
                            padding: 20,
                            borderRadius: 18,
                            background: 'rgba(10,20,30,0.85)',
                            border: '2px solid rgba(90,234,255,0.45)',
                            boxShadow: '0 0 20px rgba(90,234,255,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 16,
                        }}
                    >
                        <h3 style={{ color: '#5aeaff', textAlign: 'center' }}>곡 등록</h3>

                        <input
                            style={neonInput}
                            placeholder="곡 제목"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        <input
                            style={neonInput}
                            placeholder="아티스트"
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                        />

                        {/* 실제 커버 input (숨김) */}
                        <input
                            id="cover-input"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                setCoverFile(file);
                                if (file) setCoverPreview(URL.createObjectURL(file));
                            }}
                        />

                        <label
                            style={{
                                color: '#cfd8e3',
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 20,   // 여기서 간격 조절
                            }}
                        >   오디오 파일
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => setAudioFile(e.target.files[0])}
                            />
                        </label>

                        {/* ===== 공개 설정 ===== */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[
                                ['PRIVATE', '비공개'],
                                ['UNLISTED', '링크 공유'],
                                ['PUBLIC', '전체 공개'],
                            ].map(([value, label]) => {
                                const active = visibility === value;

                                return (
                                    <div
                                        key={value}
                                        onClick={() => setVisibility(value)}
                                        style={{
                                            flex: 1,
                                            padding: '10px 0',
                                            textAlign: 'center',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            color: active ? '#0ff' : '#cfd8e3',
                                            background: active
                                                ? 'linear-gradient(180deg, rgba(90,234,255,0.25), rgba(10,20,30,0.9))'
                                                : 'linear-gradient(180deg, #0e141b, #0a0f15)',
                                            border: active
                                                ? '1px solid rgba(90,234,255,0.9)'
                                                : '1px solid rgba(90,234,255,0.3)',
                                            boxShadow: active
                                                ? '0 0 10px rgba(90,234,255,0.8)'
                                                : 'inset 0 0 6px rgba(0,0,0,0.6)',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {label}
                                    </div>
                                );
                            })}
                        </div>

                        {visibility === 'PUBLIC' && (
                            <div style={{ fontSize: 12, color: '#ff9aa2' }}>
                                ※ 전체 공개는 관리자 심사 후 노출됩니다.
                            </div>
                        )}

                        <button className="neon-btn" disabled={loading} onClick={handleSubmit}>
                            {loading ? '업로드 중...' : '업로드'}
                        </button>
                    </div>
                </div>
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

            {/* ===== Blur Overlay ===== */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
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
