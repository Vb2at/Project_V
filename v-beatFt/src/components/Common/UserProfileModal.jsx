import { useState } from 'react';
import UserReportModal from './UserReportModal';

export default function UserProfileModal({ open, user, onClose }) {
    const [reportOpen, setReportOpen] = useState(false);

    if (!open || !user) return null;

    const toImgUrl = (v) => {
        if (!v) return null;
        const s = String(v);

        if (s.startsWith('http://') || s.startsWith('https://')) return s;
        if (s.startsWith('/')) return `http://localhost:8080${s}`;
        return `http://localhost:8080/${s}`;
    };

    const targetProfileImg = user?.profileImg ?? null;

    const submitUserReport = async (payload) => {
        const body = {
            targetType: payload.targetType,
            targetId: Number(payload.targetId),
            reasonCode: String(payload.reasonCode ?? '').trim(),
            description: String(payload.description ?? ''),
        };

        if (!body.targetType || !Number.isFinite(body.targetId) || !body.reasonCode) {
            throw new Error('신고 정보가 올바르지 않습니다.');
        }

        const res = await fetch('/api/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) {
            throw new Error(data?.message ?? `신고에 실패하였습니다. (${res.status})`);
        }
        return data;
    };

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
                        {targetProfileImg ? (
                            <img src={toImgUrl(targetProfileImg)} alt="target profile" style={avatarImg} />
                        ) : (
                            <div style={avatarDummy} />
                        )}
                    </div>

                    <div style={name}>{user?.nickname}</div>
                </div>

                <div style={btnRow}>

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
                targetId={user?.otherUserId ?? user?.id}
                targetName={user?.otherNickName ?? user?.nickname ?? user?.nickName}
                targetProfileImg={user?.profileImg || '/default/profile.png'}    //신고 모달에 상대 프로필 이미지 URL 전달
                onClose={() => setReportOpen(false)}
                onSubmit={async (payload) => {
                    try {
                        await submitUserReport(payload);
                        alert('신고가 정상적으로 접수되었습니다.');
                        setReportOpen(false);
                        onClose();
                    } catch (e) {
                        alert(e?.message ?? '신고 처리 중 오류가 발생했습니다.');
                    }
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
