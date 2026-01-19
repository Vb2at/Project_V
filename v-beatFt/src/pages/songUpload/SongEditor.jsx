import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

import Header from '../../components/Common/Header';
import Background from '../../components/Common/Background';

export default function SongEditor() {
    const { songId } = useParams();
    console.log('songId:', songId);
    const navigate = useNavigate();

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

    /* ===== state ===== */
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [visibility, setVisibility] = useState('PRIVATE');
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    /* ===== 초기 정보 로드 ===== */
    useEffect(() => {
        axios.get(`/api/songs/${songId}`, { withCredentials: true })
            .then(res => {
                const s = res.data;
                setTitle(s.title || '');
                setArtist(s.artist || '');
                setVisibility(s.visibility || 'PRIVATE'); if (s.coverPath) {
                    setCoverPreview(`/api/songs/${songId}/cover`);
                }
            })
            .catch(() => {
                alert('곡 정보를 불러오지 못했습니다.');
                navigate('/');
            });
    }, [songId]);

    useEffect(() => {
        axios.get(`/api/songs/${songId}`)
            .then(res => console.log(res.data))
            .catch(err => console.error(err));
    }, [songId]);

    /* ===== 저장 ===== */
    const handleSave = async () => {
        if (loading) return;

        const form = new FormData();
        form.append('title', title);
        form.append('artist', artist);
        form.append('visibility', visibility);
        if (coverFile) form.append('cover', coverFile);

        try {
            setLoading(true);

            await axios.post(
                `/api/songs/${songId}/update`,
                form,
                { withCredentials: true }
            );

            alert('저장 완료!');
            navigate('/');

        } catch (e) {
            console.error(e);
            alert('저장 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <Background style={{ position: 'fixed', inset: 0, zIndex: -1 }} />
            <Header />

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
                <div style={{ display: 'flex', gap: 80 }}>

                    {/* ===== 커버 ===== */}
                    <div
                        onClick={() => document.getElementById('cover-input').click()}
                        style={{
                            width: 420,
                            height: 420,
                            borderRadius: 18,
                            background: coverPreview
                                ? `url(${coverPreview}) center / cover no-repeat`
                                : 'linear-gradient(180deg, #2a2f38 0%, #151a22 100%)',
                            border: '2px solid rgba(90,234,255,0.55)',
                            boxShadow: '0 0 20px rgba(90,234,255,0.45)',
                            cursor: 'pointer',
                        }}
                    />

                    {/* ===== 정보 ===== */}
                    <div
                        style={{
                            width: 480,
                            padding: 24,
                            borderRadius: 18,
                            background: 'rgba(10,20,30,0.85)',
                            border: '2px solid rgba(90,234,255,0.45)',
                            boxShadow: '0 0 20px rgba(90,234,255,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                        }}
                    >
                        <h3 style={{ color: '#5aeaff', textAlign: 'center' }}>최종 정보 확인</h3>

                        <input
                            style={neonInput}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="곡 제목"
                        />

                        <input
                            style={neonInput}
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            placeholder="아티스트"
                        />

                        <input
                            id="cover-input"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setCoverFile(file);
                                setCoverPreview(URL.createObjectURL(file));
                            }}
                        />

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

                        <button className="neon-btn" disabled={loading} onClick={handleSave}>
                            {loading ? '저장 중...' : '최종 업로드'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
