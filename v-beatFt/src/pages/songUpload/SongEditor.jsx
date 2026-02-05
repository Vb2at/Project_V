import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { stopMenuBgm } from '../../components/engine/SFXManager';
import axios from 'axios';

import Header from '../../components/Common/Header';
import Background from '../../components/Common/Background';

export default function SongEditor() {
    const { songId } = useParams();

    const navigate = useNavigate();
    const { state } = useLocation();
    const fromPublicUpload = state?.fromPublicUpload === true;

    const VISIBILITY_LABEL = {
        PRIVATE: '비공개',
        UNLISTED: '링크 공개',
        PENDING: '심사중',
        PUBLIC: '전체 공개',
        BLOCKED: '차단됨',
    };


    const handleRequestPublic = async () => {
        if (!window.confirm('전체 공개 심사를 신청하시겠습니까?')) return;

        try {
            setLoading(true);

            const form = new FormData();
            form.append('title', title);
            form.append('artist', artist);
            form.append('visibility', 'PUBLIC'); // 🔥 핵심
            if (coverFile) form.append('cover', coverFile);

            await axios.post(
                `/api/songs/${songId}/update`,
                form,
                { withCredentials: true }
            );

            alert('심사 요청이 접수되었습니다.');
            navigate('/main', { replace: true });

        } catch (e) {
            console.error(e);
            alert('심사 요청 실패');
        } finally {
            setLoading(false);
        }
    };



    const VISIBILITY_COLOR = {
        PRIVATE: '#aaa',
        UNLISTED: '#5aeaff',
        PENDING: '#ffd166',
        PUBLIC: '#06d6a0',
        BLOCKED: '#ff5c5c',
    };
    const editorBtn = {
        padding: '10px 14px',
        borderRadius: 10,
        background: 'linear-gradient(180deg, #0f1b26 0%, #0a121a 100%)',
        border: '1px solid rgba(90,234,255,0.45)',
        color: '#e6f7ff',
        cursor: 'pointer',
    };

    const dangerBtn = {
        ...editorBtn,
        border: '1px solid rgba(255,92,92,0.7)',
        color: '#ffb3b3',
    };

    const audioRef = useRef(null);

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
    const [isPlaying, setIsPlaying] = useState(false);

    const canRequestPublic =
        !fromPublicUpload &&
        visibility === 'PRIVATE';

    const disableRequestPublic =
        visibility === 'PENDING';

    //public선택 시 저장 버튼 숨김
    const hideSave = fromPublicUpload || visibility === 'PENDING';

    useEffect(() => {
        stopMenuBgm();
    }, []);

    /* ===== 초기 정보 로드 ===== */
    useEffect(() => {
        if (!songId) return;

        axios
            .get(`/api/songs/${songId}`, { withCredentials: true })
            .then((res) => {
                const s = res.data;

                setTitle((s.title || '').replace('.mp3', ''));
                setArtist(s.artist || '');
                setVisibility(s.visibility || 'PRIVATE');

                if (s.coverPath) {
                    setCoverPreview(`/api/songs/${songId}/cover`);
                }
            })
            .catch((err) => {
                console.error('[SongEditor load]', err);

                if (err.response?.status === 403) {
                    // 타인 접근 → 차단 (정상 동작)
                    navigate('/main', { replace: true });
                    return;
                }

                alert('곡 정보를 불러오지 못했습니다.');
                navigate('/main', { replace: true });
            });
    }, [songId, navigate]);



    /* ===== 저장 ===== */
    const handleSave = async () => {
        if (loading) return;

        try {
            setLoading(true);

            const form = new FormData();
            form.append('title', title);
            form.append('artist', artist);
            form.append('visibility', visibility);
            if (coverFile) form.append('cover', coverFile);

            await axios.post(
                `/api/songs/${songId}/update`,
                form,
                { withCredentials: true }
            );

            alert('저장 완료!');
            navigate('/main', { replace: true });

        } catch (e) {
            console.error(e);
            alert('저장 실패');
        } finally {
            setLoading(false);
        }
    };

    /* ===== 미리듣기 ===== */
    const togglePreview = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    /* ===== 삭제 ===== */
    const handleDelete = async () => {
        if (!window.confirm('정말 이 곡을 삭제하시겠습니까?')) return;

        try {
            await axios.delete(`/api/songs/${songId}`, { withCredentials: true });
            alert('삭제 완료');
            navigate('/main');
        } catch (e) {
            console.error(e);
            alert('삭제 실패');
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
                        style={{
                            position: 'relative',
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
                        onClick={() => document.getElementById('cover-input').click()}
                    >
                        {/* ▶ 미리듣기 */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePreview();
                            }}
                            style={{
                                position: 'absolute',
                                bottom: 12,
                                right: 12,
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#5aeaff',
                                fontSize: 20,
                                cursor: 'pointer',
                            }}
                        >
                            {isPlaying ? '❚❚' : '▶'}
                        </button>
                    </div>

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
                        <h3 style={{ color: '#5aeaff', textAlign: 'center' }}>곡 정보 수정</h3>

                        {/* 공개 상태 표시 */}
                        <div
                            style={{
                                fontSize: 13,
                                textAlign: 'center',
                                color: VISIBILITY_COLOR[visibility] || '#aaa',
                            }}
                        >
                            현재 상태: {VISIBILITY_LABEL[visibility] || visibility}
                        </div>

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

                        {/* ===== 버튼 영역 ===== */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>

                            {/* === 메인 액션 === */}
                            {!hideSave ? (
                                <button
                                    className="neon-btn"
                                    style={editorBtn}
                                    disabled={loading}
                                    onClick={handleSave}
                                >
                                    {loading ? '저장 중...' : '저장'}
                                </button>
                            ) : (
                                <button
                                    className="neon-btn"
                                    style={editorBtn}
                                    onClick={() => navigate('/main')}
                                >
                                    홈으로
                                </button>
                            )}

                            {!hideSave && (
                                <button
                                    className="neon-btn"
                                    style={editorBtn}
                                    onClick={() => navigate(`/song/${songId}/note/edit`)}
                                >
                                    노트 편집
                                </button>
                            )}

                            <div
                                style={{
                                    height: 1,
                                    background: 'rgba(90,234,255,0.25)',
                                    margin: '12px 0 8px',
                                }}

                            />
                            {canRequestPublic && (
                                <button
                                    className="neon-btn"
                                    style={{
                                        ...editorBtn,
                                        opacity: disableRequestPublic ? 0.5 : 1,
                                        cursor: disableRequestPublic ? 'not-allowed' : 'pointer',
                                    }}
                                    disabled={disableRequestPublic}
                                    onClick={handleRequestPublic}
                                >
                                    {disableRequestPublic ? '심사 진행 중' : '전체 공개 신청'}
                                </button>
                            )}

                            {!hideSave && visibility !== 'PENDING' && (
                                <button
                                    className="neon-btn"
                                    style={dangerBtn}
                                    onClick={handleDelete}
                                >
                                    곡 삭제
                                </button>
                            )}

                        </div>

                    </div>
                </div>

                {/* audio */}
                {songId && (
                    <audio
                        ref={audioRef}
                        src={`/api/songs/${songId}/audio`}
                        onEnded={() => setIsPlaying(false)}
                    />
                )}
            </main>
        </div>
    );
}
