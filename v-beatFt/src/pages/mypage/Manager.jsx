import ReportPanel from '../../components/Common/manager/ReportPanel';
import SongReviewDetailModal from '../../components/Common/manager/SongReviewDetailModal';
import { useState, useEffect } from 'react';
import UserBlockModal from '../../components/Common/manager/UserBlockModal';
import { fetchReviewSongs, fetchReviewSongDetail, reviewSong as reviewSongApi } from '../../api/adminSong';
import { fetchAdminUsers, blockUser as blockUserApi, unblockUser as unblockUserApi } from '../../api/adminUser';
/* ================= Tabs ================= */

const TABS = [
    { key: 'songs', label: '곡 심사' },
    { key: 'reports', label: '신고 관리' },
    { key: 'users', label: '사용자 관리' },
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
    const [selectedUser, setSelectedUser] = useState(null);
    const [reviewSongs, setReviewSongs] = useState([]);
    const [songLoading, setSongLoading] = useState(false);
    const [songError, setSongError] = useState('');
    const [songPage, setSongPage] = useState(1);
    const [songTotal, setSongTotal] = useState(0);
    const songSize = 10;
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [users, setUsers] = useState([]);
    const [userLoading, setUserLoading] = useState(false);
    const [userError, setUserError] = useState('');
    const [userTotal, setUserTotal] = useState(0);
    const [userPage, setUserPage] = useState(1);
    const userSize = 10;

    //관리자 유저 차단 처리 함수
    async function handleUserBlock(userId, reason) {
        try {
            await blockUserApi(userId, reason);
            alert('해당 사용자 차단이 완료되었습니다.');

            setBlockUserOpen(false);
            setSelectedUser(null);
            //목록 갱신
            loadUsers();
        } catch (e) {
            alert(e.response?.data?.message || '차단에 실패하였습니다.');
        }
    }

    //관리자 유저 차단 해제 처리 함수
    async function handleUserUnblock(user) {
        const ok = window.confirm(
            `[${user.nickname}]님의 차단을 해제 하시겠습니까?`
        );
        if (!ok) {
            return;
        }

        try {
            await unblockUserApi(user.id);
            alert('해당 사용자의 차단 해제가 완료되었습니다.');

            //목록 갱신
            loadUsers();
        } catch (e) {
            alert(e.response?.data?.message || '차단 해제에 실패했습니다.');
        }
    }

    //사용자 목록 불러오는 함수
    async function loadUsers() {
        setUserLoading(true);
        setUserError('');

        try {
            const res = await fetchAdminUsers({
                page: userPage,
                size: userSize,
                keyword,
            });

            const normalized = (res.list ?? []).map(u => ({
                id: u.id,
                nickname: u.nickName,
                role: u.role,
                blocked: u.role === 'BLOCK',
                regDate: u.reg_date
            }));

            setUsers(normalized);
            setUserTotal(res.total ?? 0);
        } catch (e) {
            setUserError(e?.message ?? '사용자 목록 조회 실패');
            setUsers([]);
        } finally {
            setUserLoading(false);
        }
    }

    //곡 심사 목록 불러오는 함수
    async function loadReviewSongs() {
        setSongLoading(true);
        setSongError('');
        try {
            const res = await fetchReviewSongs({
                visibility: 'PENDING',
                page: songPage,
                size: songSize,
                keyword,
            });

            const normalized = (res.list ?? []).map((s) => ({
                id: s.id ?? s.songId,
                title: s.title ?? s.songTitle ?? '(no title)',
                uploader: s.uploader ?? s.uploaderNickName ?? s.nickName ?? s.userNickName ?? '',
                status: s.visibility ?? s.status ?? 'PENDING',
            }));

            setReviewSongs(normalized);
            setSongTotal(res.total ?? 0);
        } catch (e) {
            setSongError(e?.message ?? '목록 조회 실패');
            setReviewSongs([]);
        } finally {
            setSongLoading(false);
        }
    }

    useEffect(() => {
        if (tab !== 'songs') {
            return;
        }
        loadReviewSongs();
    }, [tab, songPage, keyword]);

    useEffect(() => {
        if (tab !== 'users') return;
        loadUsers();
    }, [tab, userPage, keyword]);

    async function openReviewDetail(song) {
        //모달은 즉시 열고, 상세 로딩 시작
        setReviewOpen(true);
        setDetailError('');
        setDetailLoading(true);
        //목록에서 받은 최소 데이터로 먼저 표시
        setReviewSong(song);

        try {
            const raw = await fetchReviewSongDetail(song.id);

            const detail = raw?.song;

            //응답 필드명 통일
            const normalizedDetail = {
                id: detail.id,
                title: detail.title,
                artist: detail.artist,
                visibility: detail.visibility,
                uploadUserId: detail.uploadUserId,
                uploadUserNickname: detail.uploadUserNickname,
                createDate: detail.createDate,
                duration: detail.duration,
                diff: detail.diff,
                coverPath: detail.coverPath
            };

            setReviewSong(normalizedDetail);
        } catch (e) {
            setDetailError(e?.message ?? '상세 조회 실패');
        } finally {
            setDetailLoading(false);
        }
    }

    async function handleAction(reportId, actionType, actionReason) {
        await adminActionApi(reportId, { actionType, actionReason });
        const nextStatus = actionType === 'IGNORE' ? 'REJECTED' : 'RESOLVED';

        setReport(prev =>
            prev.map(r =>
                (r.id === reportId ? { ...r, status: nextStatus, actionType, actionReason } : r)
            )
        );
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
                        onOpenReview={openReviewDetail}
                        songs={reviewSongs}
                        loading={songLoading}
                        error={songError}
                    />
                )}
                {tab === 'reports' && <ReportPanel onAction={handleAction} />}
                {tab === 'users' && (
                    <UserPanel
                        users={users}
                        loading={userLoading}
                        error={userError}
                        onRequestBlock={(u) => {
                            setSelectedUser(u);
                            setBlockUserOpen(true);
                        }}
                        onUnblock={(u) => handleUserUnblock(u)}
                    />
                )}
            </div>
            <UserBlockModal
                key={selectedUser?.id || 'empty'}   // ⭐ 사유 초기화용 (중요)
                open={blockUserOpen}
                user={selectedUser}
                onClose={() => {
                    setBlockUserOpen(false);
                    setSelectedUser(null);
                }}
                onConfirm={(userId, reason) => {
                    handleUserBlock(userId, reason);
                }}
            />
            <SongReviewDetailModal
                open={reviewOpen}
                song={reviewSong}
                loading={detailLoading}
                error={detailError}
                onClose={() => {
                    setReviewOpen(false);
                    setReviewSong(null);
                    setDetailError('');
                    setDetailLoading(false);
                }}

                onApprove={async (s) => {
                    try {
                        await reviewSongApi(s.id, 'APPROVE', null);
                        alert('승인 처리가 완료되었습니다.');
                        setReviewOpen(false);
                        setReviewSong(null);
                        await loadReviewSongs();
                    } catch (e) {
                        alert(e.message);
                    }
                }}

                onReject={async (s, reason) => {
                    try {
                        await reviewSongApi(s.id, 'REJECT', reason);
                        alert('반려 처리가 완료되었습니다.');
                        setReviewOpen(false);
                        setReviewSong(null);
                        await loadReviewSongs();
                    } catch (e) {
                        alert(e.message);
                    }
                }}

                onBlock={async (s, reason) => {
                    try {
                        await reviewSongApi(s.id, 'BLOCK', reason);
                        alert('차단 처리가 완료되었습니다.');
                        setReviewOpen(false);
                        setReviewSong(null);
                        await loadReviewSongs();
                    } catch (e) {
                        alert(e.message);
                    }
                }}
            />

        </div>
    );
}

/* ================= Panels ================= */

function SongReviewPanel({ onOpenReview, songs, loading, error }) {
    return (
        <div style={section}>
            <div style={title}>심사대기 곡 목록</div>

            {loading && <div style={{ opacity: 0.8 }}>불러오는 중...</div>}
            {!!error && <div style={{ color: '#ff6b6b' }}>{error}</div>}

            {!loading && !error && songs.length === 0 && (
                <div style={{ opacity: 0.7, textAlign: 'center', margin: '45px 0px' }}>목록이 없습니다.</div>
            )}

            {songs.map((s) => (
                <div key={s.id} style={songRow}>
                    <div
                        style={{ ...songInfo, cursor: 'pointer', flex: 1 }}
                        onClick={() => onOpenReview?.(s)}
                    >
                        <div style={{ fontWeight: 600 }}>{s.title.replace('.mp3', '')}</div>
                        <div style={songMeta}>by {s.uploader}</div>
                    </div>
                    <button
                        style={testPlayBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/game/play?songId=${s.id}&diff=normal&mode=review`;
                        }}
                    >
                        ▶ 리뷰
                    </button>
                </div>
            ))}
        </div>
    );
}

function UserPanel({ users, loading, error, onRequestBlock, onUnblock }) {
    return (
        <div style={section}>
            <div style={title}>사용자 목록</div>

            {loading && <div>불러오는 중...</div>}
            {!!error && <div style={{ color: '#ff6b6b' }}>{error}</div>}
            {!loading && users.length === 0 && (
                <div style={{ opacity: 0.7, textAlign: 'center', margin: '40px 0' }}>
                    목록이 없습니다.
                </div>
            )}

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
                            <BtnSub onClick={() => onUnblock(u)} >
                                해제
                            </BtnSub>
                        ) : (
                            <BtnSub onClick={() => onRequestBlock(u)}>
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
