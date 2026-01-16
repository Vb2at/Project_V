import { useState } from 'react';
import ReportDetailModal from './ReportDetailModal';

const DUMMY_REPORTS = [
    {
        id: 1,
        type: 'SONG',
        targetId: 101,
        targetName: 'Night Drive',
        reason: '저작권 침해 의심',
        description: '상업 음원 그대로 사용한 것 같습니다.',
        createdAt: '2026-01-16 13:22',
    },
    {
        id: 2,
        type: 'USER',
        targetId: 55,
        targetName: 'toxicPlayer',
        reason: '욕설',
        description: '채팅에서 계속 욕설을 합니다.',
        createdAt: '2026-01-16 12:10',
    },
];

export default function ReportPanel({ onAction }) {
    const [selected, setSelected] = useState(null);

    return (
        <div>
            <h3 style={{ marginBottom: 12 }}>신고 목록</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DUMMY_REPORTS.map((r) => (
                    <div
                        key={r.id}
                        onClick={() => setSelected(r)}
                        style={{
                            padding: '10px 14px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            background: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 600 }}>
                                [{r.type}] {r.targetName}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.65 }}>
                                {r.reason}
                            </div>
                        </div>

                        <div style={{ fontSize: 12, opacity: 0.5 }}>
                            {r.createdAt}
                        </div>
                    </div>
                ))}
            </div>

            {selected && (
                <ReportDetailModal
                    report={selected}
                    onClose={() => setSelected(null)}
                    onAction={onAction}
                />
            )}
        </div>
    );
}
