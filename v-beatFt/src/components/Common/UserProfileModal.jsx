import { useState } from 'react';
import UserReportModal from './UserReportModal';

export default function UserProfileModal({ open, user, onClose }) {
    const [reportOpen, setReportOpen] = useState(false);

    if (!open || !user) return null;

    return (
        <>
            <div
                style={overlay}
                onClick={() => {
                    setReportOpen(false);
                    onClose();
                }}
            />
            <div style={modal}>
                <div style={header}>
                    <div style={avatarWrap}>
                        {user.profileImg ? (
                            <img src={user.profileImg} alt="" style={avatarImg} />
                        ) : (
                            <div style={avatarDummy} />
                        )}
                    </div>

                    <div style={name}>{user.nickname}</div>
                </div>

                <div style={btnRow}>
                    <button style={btnSub}>친구 추가</button>
                    <button style={btnSub}>차단</button>
                    <button
                        style={btnDanger}
                        onClick={() => setReportOpen(true)}
                    >
                        신고
                    </button>
                </div>

                <button style={closeBtn} onClick={onClose}>
                    닫기
                </button>
            </div>

            {/* 신고 모달 */}
            <UserReportModal
                open={reportOpen}
                type="USER"
                targetId={user.id}
                targetName={user.nickname}
                onClose={() => setReportOpen(false)}
                onSubmit={(payload) => {
                    console.log('USER REPORT:', payload);
                }}
            />
        </>
    );
}
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
    width: 360,
    background: '#0b0b0b',
    border: '1px solid #333',
    borderRadius: 14,
    padding: 16,
    zIndex: 9001,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
};

const header = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
};

const avatarWrap = {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #5aeaff, #8b5cff)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
};

const avatarImg = {
    width: 64,
    height: 64,
    borderRadius: '50%',
    objectFit: 'cover',
    background: '#000',
};

const avatarDummy = {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#111',
};

const name = {
    fontSize: 16,
    fontWeight: 600,
};

const btnRow = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
};

const btnSub = {
    flex: 1,
    height: 34,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
};

const btnDanger = {
    ...btnSub,
    border: '1px solid #ff6b6b',
    color: '#ff6b6b',
};

const closeBtn = {
    height: 32,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
};
