import { useState } from 'react';

export default function SongReviewDetailModal({
    open,
    song,
    onClose,
    onApprove,
    onReject,
    onBlock,
}) {
    const [mode, setMode] = useState(null); // 'REJECT' | 'BLOCK'
    const [reason, setReason] = useState('');

    if (!open || !song) return null;

    return (
        <>
            <div style={overlay} onClick={onClose} />

            <div style={modal}>
                <h3 style={{ marginBottom: 6 }}>상세내용</h3>

                {/* ===== 기본 정보 ===== */}
                <section style={section}>
                    <div style={title}>{song.title ? song.title.replace('.mp3', ' ') : ''}</div>
                    <div style={sub}>업로드 유저: {song.uploadUserNickname}</div>
                    <div style={sub}>업로드 날짜: {' '} {song.createDate ? song.createDate.replace('T', ' ') : '--'}</div>
                </section>

                {/* ===== 메타 ===== */}
                <section style={sectionRow}>
                    <Meta label="곡 길이" value={song.duration ? `${song.duration}초` : '--'} />
                    <Meta label="난이도" value={song.diff?.toUpperCase()} />
                </section>

                {/* ===== 커버 ===== */}
                <section style={coverWrap}>
                    <img
                        src={`/api/songs/${song.id}/cover`}
                        alt="cover"
                        style={coverImg}
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </section>
                {mode && (
                    <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ color: '#ff6b6b', fontSize: 13 }}>
                            {mode === 'REJECT' ? '반려 사유 입력' : '차단 사유 입력'}
                        </div>

                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="조치 사유를 입력하세요"
                            style={{
                                background: '#111',
                                border: '1px solid #333',
                                borderRadius: 6,
                                padding: 8,
                                color: '#fff',
                                minHeight: 70,
                                resize: 'none',
                            }}
                        />

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                style={btnReject}
                                onClick={() => { setMode(null); setReason(''); }}
                            >
                                이전으로
                            </button>

                            <button
                                style={btnApprove}
                                onClick={() => {
                                    if (!reason.trim()) {
                                        alert(mode === 'REJECT' ? '반려 사유를 입력하세요.' : '차단 사유 입력하세요.');
                                        return;
                                    }
                                    if (mode === 'REJECT') onReject?.(song, reason.trim());
                                    if (mode === 'BLOCK') onBlock?.(song, reason.trim());
                                }}
                            >
                                {mode === 'REJECT' ? '완료' : '완료'}
                            </button>
                        </div>
                    </section>
                )}
            {/* ===== 조치 버튼 ===== */}
            {!mode && (
                <section style={actionRow}>
                    <button style={btnApprove} onClick={() => onApprove?.(song)}>
                        승인
                    </button>
                    <button style={btnReject} onClick={() => setMode('REJECT')}>반려</button>
                    <button style={btnBlock} onClick={() => setMode('BLOCK')}>차단</button>
                </section>
            )}
            <button style={closeBtn} onClick={onClose}>
                닫기
            </button>
        </div >
        </>
    );
}

/* ================= UI ================= */

function Meta({ label, value }) {
    return (
        <div style={metaBox}>
            <div style={metaLabel}>{label}</div>
            <div style={metaValue}>{value}</div>
        </div>
    );
}

/* ================= Styles ================= */

const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 9000,
};

const modal = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 420,
    background: '#0b0b0b',
    border: '1px solid #333',
    borderRadius: 14,
    padding: 16,
    zIndex: 9001,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};

const section = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
};

const sectionRow = {
    display: 'flex',
    gap: 8,
};

const title = {
    fontSize: 16,
    fontWeight: 600,
};

const sub = {
    fontSize: 12,
    color: '#aaa',
};

const coverWrap = {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 10,
    background: '#111',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const coverImg = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
};

const coverDummy = {
    color: '#555',
    fontSize: 12,
};
const actionRow = {
    display: 'flex',
    gap: 8,
};

const btnApprove = {
    flex: 1,
    height: 34,
    borderRadius: 8,
    border: '1px solid #5aeaff',
    background: 'rgba(90,234,255,0.15)',
    color: '#5aeaff',
    cursor: 'pointer',
};

const btnReject = {
    flex: 1,
    height: 34,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
};

const btnBlock = {
    flex: 1,
    height: 34,
    borderRadius: 8,
    border: '1px solid #ff6b6b',
    background: 'rgba(255,107,107,0.12)',
    color: '#ff6b6b',
    cursor: 'pointer',
};

const closeBtn = {
    height: 30,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
};

const metaBox = {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
};

const metaLabel = {
    fontSize: 10,
    opacity: 0.6,
};

const metaValue = {
    fontSize: 13,
    fontWeight: 600,
};
