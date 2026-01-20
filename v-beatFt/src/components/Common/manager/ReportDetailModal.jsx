import { useState } from 'react';
import { reportActionApi } from '../../../api/report';

const ACTIONS = [
    { key: 'WARN', label: '경고' },
    { key: 'BLOCK', label: '차단' },
    { key: 'DELETE_CONTENT', label: '삭제' },
    { key: 'IGNORE', label: '반려' },
];



export default function ReportDetailModal({ report, onClose, onAction, onRefresh, onLocalMove }) {
    const [action, setAction] = useState('');
    const [memo, setMemo] = useState('');
    const [loading, setLoading] = useState(false);
    const isPending = (report?.status ?? 'PENDING') === 'PENDING';

    const handleComplete = async () => {
        console.log('[REPORT] complete click', report?.id, action, memo);

        const reportId = report?.id ?? report?.reportId ?? report?.report_id ?? report?.rptId;
        if (!reportId) return;

        const needMemo = action !== 'IGNORE';
        if (needMemo && memo.trim().length < 2) {
            alert('처리 사유를 입력하세요');
            return;
        }

        try {
            setLoading(true);

            await reportActionApi(reportId, action, memo.trim());
            onLocalMove?.(reportId, action);    //즉시 대기에서 제거 시킴
            onRefresh?.();  //처리완료, 반려 탭으로 이동 반영
            onAction?.('REPORT_APPLIED', { reportId, action });
            onClose?.();
        } catch (e) {
            alert(e?.message ?? '처리 중 오류 발생');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={overlay}>
            <div style={modal}>
                <h3 style={{ marginBottom: 5 }}>신고 상세내용</h3>

                {/* 대상 정보 */}
                <section style={section}>
                    <span style={sectionTitle}>신고 대상</span>
                    <div>닉네임: {report.targetName}</div>
                    <div>타입: {report.reasonCode}</div>
                </section>

                {/* 신고 내용 */}
                <section style={section}>
                    <span style={sectionTitle}>신고 내용</span>
                    <div>일시: {report.regDate?.replace('T', ' ')}</div>
                    <div>사유: {report.description}</div>
                    <textarea
                        readOnly
                        value={report.description}
                        style={textarea}
                    />
                </section>

                {/* 조치 */}
                {isPending ? (
                    <section style={section}>
                        <span style={sectionTitle}>신고 처리</span>
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
                            placeholder="처리 사유를 입력하세요."
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            style={textarea}
                        />
                    </section>
                ) : (
                    <section style={section}>
                        <span style={sectionTitle}>처리 정보</span>
                        <div>처리 상태: {report.status}</div>
                        <div>처리 유형: {report.actionType}</div>
                        <div>처리 사유: {report.actionReason}</div>
                    </section>
                )}

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
                    {isPending && (
                        <button
                            style={footerBtn}
                            disabled={!action || loading}
                            onClick={handleComplete}
                        >
                            완료
                        </button>
                    )}
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
