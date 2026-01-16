import ReportPanel from '../../components/Common/manager/ReportPanel';
import SongReviewDetailModal from '../../components/Common/manager/SongReviewDetailModal';
import { useState } from 'react';
import UserBlockModal from '../../components/Common/manager/UserBlockModal';
/* ================= Tabs ================= */

const TABS = [
    { key: 'songs', label: '곡 심사' },
    { key: 'reports', label: '신고 관리' },
    { key: 'users', label: '유저 관리' },
];

/* ================= Action Types ================= */

const ACTIONS = {
    SONG_APPROVE: 'SONG_APPROVE',
    SONG_BLOCK: 'SONG_BLOCK',

    REPORT_VIEW: 'REPORT_VIEW',
    REPORT_APPLY: 'REPORT_APPLY',

    USER_BLOCK: 'USER_BLOCK',
    USER_UNBLOCK: 'USER_UNBLOCK',
};

/* ================= Main ================= */

export default function Manager() {
    const [tab, setTab] = useState('songs');
    const [keyword, setKeyword] = useState('');
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewSong, setReviewSong] = useState(null);
    const [blockUserOpen, setBlockUserOpen] = useState(false);
    const [blockUser, setBlockUser] = useState(null);
    const [reviewSongs, setReviewSongs] = useState([
        { id: 1, title: 'Neon Rush', uploader: 'user123', status: 'PENDING' },
        { id: 2, title: 'Night Drive', uploader: 'toxicGuy', status: 'PENDING' },
    ]);
    function handleAction(type, target) {
        console.log('ADMIN ACTION:', type, target);
        // TODO: API / WebSocket 연결 지점
    }

    return (
        <div style={wrap}>
            {/* ===== 상단: 탭 + 검색 ===== */}
            <div style={topRow}>
                <div style={tabRow}>
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                ...tabBtn,
                                ...(tab === t.key ? tabBtnActive : {}),
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <input
                    placeholder={
                        tab === 'songs'
                            ? '곡 제목 검색'
                            : tab === 'users'
                                ? '유저 닉네임 검색'
                                : '신고 대상 검색'
                    }
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={searchInput}
                />
            </div>

            {/* ===== 콘텐츠 ===== */}
            <div style={panel}>
                {tab === 'songs' && (
                    <SongReviewPanel
                        onAction={handleAction}
                        onOpenReview={(song) => {
                            setReviewSong(song);
                            setReviewOpen(true);
                        }}
                        songs={reviewSongs}
                    />
                )}
                {tab === 'reports' && <ReportPanel onAction={handleAction} />}
                {tab === 'users' && (
                    <UserPanel
                        onAction={handleAction}
                        onRequestBlock={(u) => {
                            setBlockUser(u);
                            setBlockUserOpen(true);
                        }}
                    />
                )}
            </div>
            <UserBlockModal
                key={blockUser?.id || 'empty'}   // ⭐ 사유 초기화용 (중요)
                open={blockUserOpen}
                user={blockUser}
                onClose={() => setBlockUserOpen(false)}
                onConfirm={(reason) => {
                    handleAction(ACTIONS.USER_BLOCK, { ...blockUser, reason });
                    setBlockUserOpen(false);
                }}
            />
            <SongReviewDetailModal
                open={reviewOpen}
                song={reviewSong}
                onClose={() => setReviewOpen(false)}
                onApprove={(s) => {
                    console.log('APPROVE', s);
                    setReviewSongs((prev) => prev.filter((x) => x.id !== s.id));
                    setReviewOpen(false);
                }}
                onReject={(s, reason) => {
                    console.log('REJECT', s, reason);
                    setReviewSongs((prev) => prev.filter((x) => x.id !== s.id));
                    setReviewOpen(false);
                }}
                onBlock={(s, reason) => {
                    console.log('BLOCK', s, reason);
                    setReviewSongs((prev) => prev.filter((x) => x.id !== s.id));
                    setReviewOpen(false);
                }}
            />
        </div>
    );
}

/* ================= Panels ================= */

function SongReviewPanel({ onOpenReview, songs }) {
    return (
        <div style={section}>
            <div style={title}>심사 대기 곡</div>
            {songs.map((s) => (
                <div key={s.id} style={songRow}>
                    {/* 곡 정보 (상세 모달) */}
                    <div
                        style={{ ...songInfo, cursor: 'pointer', flex: 1 }}
                        onClick={() => onOpenReview?.({
                            id: s.id,
                            title: s.title,
                            artist: s.uploader,
                            bpm: 128,
                            lengthSec: 142,
                            diff: 'NORMAL',
                        })}
                    >
                        <div style={{ fontWeight: 600 }}>{s.title}</div>
                        <div style={songMeta}>by {s.uploader}</div>
                    </div>
                    <button
                        style={testPlayBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.location.href =
                                `/game/play?songId=${s.id}&diff=normal&mode=review`;
                        }}
                    >
                        ▶ 리뷰
                    </button>
                </div>
            ))}
        </div>
    );
}
function UserPanel({ onAction, onRequestBlock }) {
    const users = [
        { id: 1, nickname: 'toxicPlayer', blocked: true },
        { id: 2, nickname: 'niceGuy', blocked: false },
    ];

    return (
        <div style={section}>
            <div style={title}>유저 목록</div>

            {users.map((u) => (
                <div key={u.id} style={userRow}>
                    <div style={userInfo}>
                        <div style={{ fontWeight: 600 }}>{u.nickname}</div>
                        <div style={userStatus(u.blocked)}>
                            {u.blocked ? '차단됨' : '정상'}
                        </div>
                    </div>

                    <div style={btnRow}>
                        {u.blocked ? (
                            <BtnSub
                                onClick={() => onAction(ACTIONS.USER_UNBLOCK, u)}
                            >
                                차단 해제
                            </BtnSub>
                        ) : (
                            <BtnSub
                                onClick={() => onRequestBlock(u)}
                            >
                                차단
                            </BtnSub>
                        )}
                    </div>
                </div>
            ))}

        </div>
    );
}
/* ================= UI ================= */

function Row({ children }) {
    return <div style={row}>{children}</div>;
}

const BtnMain = ({ children, onClick }) => (
    <button style={btnMain} onClick={onClick}>
        {children}
    </button>
);

const BtnSub = ({ children, onClick }) => (
    <button style={btnSub} onClick={onClick}>
        {children}
    </button>
);

/* ================= Styles ================= */

const wrap = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
};

/* top */
const topRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const tabRow = {
    display: 'flex',
    gap: 10,
};

const tabBtn = {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
};

const tabBtnActive = {
    border: '1px solid #5aeaff',
    color: '#5aeaff',
    background: 'rgba(90,234,255,0.15)',
};

const searchInput = {
    height: 34,
    width: 220,
    borderRadius: 8,
    padding: '0 12px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    outline: 'none',
};

/* panel */
const panel = {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
};

const section = {
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
};

const title = {
    fontWeight: 600,
    marginBottom: 6,
};

/* row */
const row = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 4px',
};

const btnRow = {
    display: 'flex',
    gap: 6,
};

/* buttons */
const ACCENT = '#5aeaff';

const btnMain = {
    padding: '6px 14px',
    borderRadius: 6,
    background: 'rgba(90,234,255,0.15)',
    border: `1px solid ${ACCENT}`,
    color: ACCENT,
    cursor: 'pointer',
};

const btnSub = {
    padding: '6px 14px',
    borderRadius: 6,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#ccc',
    cursor: 'pointer',
};
const songRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const songInfo = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
};

const songMeta = {
    fontSize: 12,
    opacity: 0.6,
};
const userRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const userInfo = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
};

const userStatus = (blocked) => ({
    fontSize: 15,
    color: blocked ? '#ff6b6b' : '#5aeaff',
    opacity: 0.85,
});
const testPlayBtn = {
    height: 32,
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#5aeaff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};
