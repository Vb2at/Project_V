import { useState } from 'react';

export default function SongReviewDetailModal({
    open,
    song,
    onClose,
    onApprove,
    onReject,
    onBlock,
}) {
    if (!open || !song) return null;

    const [mode, setMode] = useState(null); // 'REJECT' | 'BLOCK'
    const [reason, setReason] = useState('');

    return (
        <>
            <div style={overlay} onClick={onClose} />

            <div style={modal}>
                <h3 style={{ marginBottom: 6 }}>곡 심사 상세</h3>

                {/* ===== 기본 정보 ===== */}
                <section style={section}>
                    <div style={title}>{song.title}</div>
                    <div style={sub}>제작자: {song.artist}</div>
                    <div style={sub}>업로드: {song.createdAt || '2026-01-16'}</div>
                </section>

                {/* ===== 메타 ===== */}
                <section style={sectionRow}>
                    <Meta label="BPM" value={song.bpm ?? '--'} />
                    <Meta label="LENGTH" value={song.lengthSec ? `${song.lengthSec}s` : '--'} />
                    <Meta label="DIFF" value={song.diff ?? 'NORMAL'} />
                </section>

                {/* ===== 커버 ===== */}
                <section style={coverWrap}>
                    {song.cover ? (
                        <img src={song.cover} alt="" style={coverImg} />
                    ) : (
                        <div style={coverDummy}>NO COVER</div>
                    )}
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
                    </section>
                )}
                {/* ===== 조치 버튼 ===== */}
                <section style={actionRow}>
                    <button style={btnApprove} onClick={() => onApprove?.(song)}>
                        승인
                    </button>
                    <button style={btnReject} onClick={() => setMode('REJECT')}>반려</button>
                    <button style={btnBlock} onClick={() => setMode('BLOCK')}>차단</button>
                </section>
                <button style={closeBtn} onClick={onClose}>
                    닫기
                </button>
            </div>
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
