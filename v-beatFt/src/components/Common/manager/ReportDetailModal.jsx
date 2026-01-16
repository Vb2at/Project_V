import { useState } from 'react';

const ACTIONS = [
    { key: 'WARN', label: '경고' },
    { key: 'BLOCK', label: '차단' },
    { key: 'DELETE', label: '삭제' },
    { key: 'IGNORE', label: '무시' },
];

export default function ReportDetailModal({ report, onClose, onAction }) {
    const [action, setAction] = useState('');
    const [memo, setMemo] = useState('');

    return (
        <div style={overlay}>
            <div style={modal}>
                <h3 style={{ marginBottom: 12 }}>신고 상세</h3>

                {/* 대상 정보 */}
                <section style={section}>
                    <span style={sectionTitle}>대상</span>
                    <div>타입: {report.type}</div>
                    <div>ID: {report.targetId}</div>
                    <div>이름: {report.targetName}</div>
                </section>

                {/* 신고 내용 */}
                <section style={section}>
                    <span style={sectionTitle}>신고 내용</span>
                    <div>사유: {report.reason}</div>
                    <div>시각: {report.createdAt}</div>
                    <textarea
                        readOnly
                        value={report.description}
                        style={textarea}
                    />
                </section>

                {/* 조치 */}
                <section style={section}>
                    <span style={sectionTitle}>조치</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ACTIONS.map((a) => (
                            <button
                                key={a.key}
                                onClick={() => setAction(a.key)}
                                style={{
                                    ...actionBtn,
                                    ...(action === a.key
                                        ? actionBtnActive
                                        : {}),
                                }}
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>

                    <textarea
                        placeholder="조치 사유 입력"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        style={textarea}
                    />
                </section>

                {/* 하단 버튼 */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 12,
                        marginTop: 8,
                        width: '100%',
                    }}
                >
                    <button
                        style={footerBtn}
                        onClick={onClose}
                    >
                        닫기
                    </button>
                    <button
                        style={footerBtn}
                        disabled={!action}
                        onClick={() => {
                            onAction?.('REPORT_APPLY', { action, memo, report });
                        }}
                    >
                        조치 확정
                    </button>
                </div>
            </div>
        </div >
    );
}

/* ===== styles ===== */

const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
};

const modal = {
    width: 520,
    background: '#0b0b0b',
    border: '1px solid #333',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};

const section = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingTop: 4,
};

const textarea = {
    background: '#111',
    border: '1px solid #333',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    minHeight: 60,
    resize: 'none',
};

const actionBtn = {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #444',
    background: '#111',
    color: '#aaa',
    cursor: 'pointer',
};

const actionBtnActive = {
    background: '#1e90ff22',
    border: '1px solid #1e90ff',
    color: '#fff',
};
const sectionTitle = {
    fontWeight: 600,
    color: '#5aeaff',
    marginBottom: 2,
};
const footerBtn = {
    minWidth: 72,
    height: 34,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
};
