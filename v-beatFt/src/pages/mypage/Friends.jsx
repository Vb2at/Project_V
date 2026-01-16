import { useState } from 'react';
import ProfileAvatar from '../../components/Member/ProfileAvatar';
import UserProfileModal from '../../components/Common/UserProfileModal';

/* ===== 더미 데이터 (API 연결 전) ===== */
const DUMMY_FRIENDS = [
    { id: 1, nick: 'Alice', status: 'FRIEND', online: true },
    { id: 2, nick: 'Bob', status: 'FRIEND', online: false },
];

const DUMMY_REQUESTS = [
    { id: 3, nick: 'Chris', status: 'REQUEST' },
];

export default function Friends() {
    const [friends, setFriends] = useState(DUMMY_FRIENDS);
    const [requests, setRequests] = useState(DUMMY_REQUESTS);
    const [addNick, setAddNick] = useState('');
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileUser, setProfileUser] = useState(null);

    function openProfile(user) {
        setProfileUser(user);
        setProfileOpen(true);
    }

    const handleAdd = () => {
        if (!addNick.trim()) return;

        setRequests((prev) => [
            ...prev,
            { id: Date.now(), nick: addNick, status: 'REQUEST' },
        ]);

        setAddNick('');
    };
    return (

        <div style={wrap}>
            {/* 친구 추가 */}
            <div style={addWrap}>
                <input
                    value={addNick}
                    onChange={(e) => setAddNick(e.target.value)}
                    placeholder="닉네임 입력"
                    style={input}
                />
                <button style={btnMain} onClick={handleAdd}>
                    추가
                </button>
            </div>
            {/* 친구 요청 */}
            <Section title="친구 요청">
                {requests.length === 0 && <Empty>요청 없음</Empty>}
                {requests.map((u) => (
                    <Row key={u.id}>
                        <UserInfo nick={u.nick} />

                        <div style={{ display: 'flex', gap: 8 }}>
                            <BtnMain>수락</BtnMain>
                            <BtnSub>거절</BtnSub>
                        </div>
                    </Row>
                ))}
            </Section>

            {/* 친구 목록 */}
            <Section title="친구 목록">
                {friends.length === 0 && <Empty>친구 없음</Empty>}
                {friends.map((u) => (
                    <Row key={u.id}>
                        <div
                            style={{ cursor: 'pointer' }}
                            onClick={() => openProfile(u)}
                        >
                            <UserInfo nick={u.nick} online={u.online} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <BtnSub>쪽지</BtnSub>
                            <BtnSub>삭제</BtnSub>
                        </div>
                    </Row>
                ))}
            </Section>
            <UserProfileModal
                open={profileOpen}
                user={profileUser}
                onClose={() => setProfileOpen(false)}
            />
        </div >
    );
}

/* ================= UI ================= */

function Section({ title, children }) {
    return (
        <div style={section}>
            <div style={titleStyle}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {children}
            </div>
        </div>
    );
}

function Row({ children }) {
    return (
        <div style={row}>
            {children}
        </div>
    );
}

function UserInfo({ nick, online }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProfileAvatar size={36} />
            <span>{nick}</span>
            {online && <Dot />}
        </div>
    );
}

function Dot() {
    return (
        <span
            style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#3cff6a',
                boxShadow: '0 0 6px rgba(60,255,106,0.8)',
            }}
        />
    );
}

function Empty({ children }) {
    return <div style={{ opacity: 0.5, fontSize: 13 }}>{children}</div>;
}

/* ================= styles ================= */

const wrap = {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
};

const section = {
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 12,
};

const titleStyle = {
    fontWeight: 600,
    marginBottom: 8,
};

const row = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 4px',
};

const BtnMain = ({ children }) => (
    <button style={btnMain}>{children}</button>
);

const BtnSub = ({ children }) => (
    <button style={btnSub}>{children}</button>
);

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
const addWrap = {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
};

const input = {
    flex: 1,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#fff',
    outline: 'none',
};