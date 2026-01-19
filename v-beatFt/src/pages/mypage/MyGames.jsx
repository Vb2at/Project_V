// pages/mypage/MyGames.jsx
import { useState } from 'react';
const FILTER_MAP = {
    전체: 'ALL',
    비공개: 'PRIVATE',
    부분공개: 'UNLISTED',
    심사중: 'PENDING',
    전체공개: 'PUBLIC',
    차단: 'BLOCKED',
};

/* ===== 더미 데이터 ===== */
const DUMMY_GAMES = [
    {
        id: 1,
        title: 'My First Beat',
        cover: '/images/album_dummy.png',
        status: 'PRIVATE',
        playCount: 12,
    },
    {
        id: 2,
        title: 'Night Drive',
        cover: '/images/album_dummy.png',
        status: 'BLOCKED',
        playCount: 0,
    },
    {
        id: 3,
        title: 'Neon Rush',
        cover: '/images/album_dummy.png',
        status: 'PUBLIC',
        playCount: 245,
    },
    
];

const FILTERS = ['전체', '비공개', '부분공개', '심사중', '전체공개', '차단'];

function MyGames() {
    const [filter, setFilter] = useState('전체');
    const [games, setGames] = useState(DUMMY_GAMES);
    const [keyword, setKeyword] = useState('');

    const list = games.filter((g) => {
        const statusOk =
            FILTER_MAP[filter] === 'ALL' || g.status === FILTER_MAP[filter];

        const keywordOk = g.title.toLowerCase().includes(keyword.toLowerCase());

        return statusOk && keywordOk;
    });
    return (
        <div style={wrap}>
            {/* ===== 필터 + 검색 ===== */}
            <div style={filterWrap}>
                {/* 필터 버튼들 (왼쪽) */}
                <div style={filterRow}>
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                ...filterBtn,
                                ...(filter === f ? filterBtnActive : {}),
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* 검색 (오른쪽) */}
                <input
                    placeholder="제목 검색"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={searchInput}
                />
            </div>

            {/* ===== 리스트 ===== */}
            {list.length === 0 ? (
                <Empty>등록된 곡이 없습니다</Empty>
            ) : (
                <div style={grid}>
                    {list.map((g) => (
                        <Card key={g.id} game={g} />
                    ))}
                </div>
            )}
        </div>
    );


}

export default MyGames;

/* ================= 카드 ================= */

function Card({ game }) {
    return (
        <div style={card}>
            <img src={game.cover} alt="" style={cover} />

            <div style={title}>{game.title}</div>

            <div style={badgeWrap}>
                <StatusBadge status={game.status} />
            </div>

            <div style={meta}>▶ {game.playCount}</div>

            <div style={btnRow}>
                {game.status !== 'BLOCKED' && (
                    <>
                        <BtnMain>플레이</BtnMain>
                        <BtnSub>수정</BtnSub>
                    </>
                )}
                <BtnSub>삭제</BtnSub>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        PRIVATE: '#777',
        UNLISTED: '#5aeaff',
        PENDING: '#ffaa00',
        PUBLIC: '#3cff6a',
        BLOCKED: '#ff4d4f',
    };

    return (
        <span
            style={{
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 11,
                background: map[status] + '33',
                color: map[status],
                border: `1px solid ${map[status]}`,
            }}
        >
            {status}
        </span>
    );
}

/* ================= 공통 ================= */

const wrap = {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
};

const filterBtn = {
    width: 72,
    padding: '6px 0',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
};

const filterWrap = {
    display: 'flex',
    alignItems: 'center',
};

const filterBtnActive = {
    border: '1px solid #5aeaff',
    color: '#5aeaff',
    background: 'rgba(90,234,255,0.15)',
};

const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 14,
};

const card = {
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
};

const searchInput = {
    marginLeft: 'auto',
    padding: '6px 10px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    outline: 'none',
    width: 200,
};

const cover = {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 8,
    objectFit: 'cover',
    background: '#111',
};

const title = {
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const badgeWrap = {
    display: 'flex',
};

const meta = {
    fontSize: 11,
    opacity: 0.6,
};

const btnRow = {
    display: 'flex',
    gap: 6,
    marginTop: 4,
};

const BtnMain = ({ children }) => (
    <button style={btnMain}>{children}</button>
);

const BtnSub = ({ children }) => (
    <button style={btnSub}>{children}</button>
);

const ACCENT = '#5aeaff';

const btnMain = {
    flex: 1,
    padding: '6px 0',
    borderRadius: 6,
    background: 'rgba(90,234,255,0.15)',
    border: `1px solid ${ACCENT}`,
    color: ACCENT,
    cursor: 'pointer',
    fontSize: 12,
};

const btnSub = {
    flex: 1,
    padding: '6px 0',
    borderRadius: 6,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 12,
};

const filterRow = {
    display: 'flex',
    gap: 15,
    flexWrap: 'wrap',
};

function Empty({ children }) {
    return <div style={{ opacity: 0.5 }}>{children}</div>;
}
