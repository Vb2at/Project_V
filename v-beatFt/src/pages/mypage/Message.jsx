import { useState } from 'react';

const DUMMY_INBOX = [
    { id: 1, from: 'Alice', preview: '안녕! 곡 잘 들었어', date: '2026-01-16', isRead: false },
    { id: 2, from: 'Bob', preview: '랭킹 축하해!', date: '2026-01-15', isRead: true },
];

const DUMMY_SENT = [
    { id: 3, to: 'Chris', preview: '다음에 같이 해보자', date: '2026-01-14' },
];

export default function Message() {
    const [tab, setTab] = useState('inbox'); // inbox | sent

    const list = tab === 'inbox' ? DUMMY_INBOX : DUMMY_SENT;

    const [selectedId, setSelectedId] = useState(list[0]?.id ?? null);
    const selected = list.find((m) => m.id === selectedId);

    const [isWriteOpen, setIsWriteOpen] = useState(false);
    const [toUser, setToUser] = useState('');
    const [content, setContent] = useState('');


    return (
        <div style={wrap}>
            {/* 상단 탭 */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={tabWrap}>
                    <Tab active={tab === 'inbox'} onClick={() => setTab('inbox')}>
                        받은 쪽지
                    </Tab>
                    <Tab active={tab === 'sent'} onClick={() => setTab('sent')}>
                        보낸 쪽지
                    </Tab>
                </div>
                <button
                    style={btnMain}
                    onClick={() => {
                        setIsWriteOpen(true);
                        setToUser('');
                        setContent('');
                    }}
                >
                    쪽지 쓰기
                </button>
            </div>
            {/* 본문 */}
            <div style={panelWrap}>
                {/* 왼쪽 리스트 */}
                <div style={listPanel}>
                    {list.map((m) => (
                        <div
                            key={m.id}
                            onClick={() => setSelectedId(m.id)}
                            style={{
                                ...listItem,
                                background:
                                    m.id === selectedId ? 'rgba(90,234,255,0.12)' : 'transparent',
                                fontWeight: m.isRead === false ? 700 : 400,
                            }}
                        >
                            <div style={{ fontSize: 13 }}>
                                {tab === 'inbox' ? m.from : `To. ${m.to}`}
                            </div>
                            <div style={previewText}>{m.preview}</div>
                            <div style={dateText}>{m.date}</div>
                        </div>
                    ))}
                </div>

                {/* 오른쪽 상세 */}
                <div style={detailPanel}>
                    {selected ? (
                        <>
                            <div style={detailHeader}>
                                <span>
                                    {tab === 'inbox'
                                        ? `From. ${selected.from}`
                                        : `To. ${selected.to}`}
                                </span>
                                <span style={{ fontSize: 12, opacity: 0.6 }}>
                                    {selected.date}
                                </span>
                            </div>

                            <div style={detailBody}>
                                {selected.preview}
                                <br />
                                <br />
                                (전체 쪽지 내용 영역)
                            </div>

                            {tab === 'inbox' && (
                                <div style={detailFooter}>
                                    <button
                                        style={btnMain}
                                        onClick={() => {
                                            setIsWriteOpen(true);
                                            setToUser(selected.from);
                                        }}
                                    >
                                        답장
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ opacity: 0.5 }}>쪽지를 선택해주세요</div>
                    )}
                </div>
                {isWriteOpen && (
                    <div style={modalBg}>
                        <div style={modalBox}>
                            <div style={{ fontWeight: 700, marginBottom: 12 }}>쪽지 쓰기</div>

                            <select
                                value={toUser}
                                onChange={(e) => setToUser(e.target.value)}
                                style={input}
                            >
                                <option value="">받는 사람 선택</option>
                                <option value="Alice">Alice</option>
                                <option value="Bob">Bob</option>
                                <option value="Chris">Chris</option>
                            </select>

                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="쪽지 내용을 입력하세요"
                                style={{ ...input, height: 120, resize: 'none' }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button
                                    style={btnSub}
                                    onClick={() => {
                                        setIsWriteOpen(false);
                                        setToUser('');
                                        setContent('');
                                    }}
                                >
                                    취소
                                </button>
                                <button style={btnMain}>보내기</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div >
    );
}

/* ================= 공통 ================= */

function Tab({ active, children, ...props }) {
    return (
        <button
            {...props}
            style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: active
                    ? '1px solid #5aeaff'
                    : '1px solid rgba(255,255,255,0.2)',
                background: active ? 'rgba(90,234,255,0.15)' : 'transparent',
                color: active ? '#5aeaff' : '#aaa',
                cursor: 'pointer',
            }}
        >
            {children}
        </button>
    );
}

/* ================= styles ================= */

const wrap = {
    width: '100%',
    maxWidth: 900,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
};

const tabWrap = {
    display: 'flex',
    gap: 8,
};

const panelWrap = {
    display: 'flex',
    height: 420,
    borderRadius: 14,
    overflow: 'hidden',
    background: 'rgba(20,22,28,0.7)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
};

const listPanel = {
    width: 260,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    overflowY: 'auto',
};

const listItem = {
    padding: '10px 12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
};

const previewText = {
    fontSize: 12,
    opacity: 0.7,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const dateText = {
    fontSize: 11,
    opacity: 0.5,
};

const detailPanel = {
    flex: 1,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
};

const detailHeader = {
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
};

const detailBody = {
    flex: 1,
    fontSize: 14,
    lineHeight: 1.6,
    opacity: 0.9,
};

const detailFooter = {
    display: 'flex',
    justifyContent: 'flex-end',
};

const btnMain = {
    padding: '8px 18px',
    borderRadius: 8,
    background: 'rgba(90,234,255,0.15)',
    border: '1px solid #5aeaff',
    color: '#5aeaff',
    cursor: 'pointer',
};
const modalBg = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
};

const modalBox = {
    width: 360,
    background: 'rgba(20,22,28,0.95)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
};

const input = {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#fff',
    outline: 'none',
};
const btnSub = {
    padding: '8px 18px',
    borderRadius: 8,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#aaa',
    cursor: 'pointer',
};