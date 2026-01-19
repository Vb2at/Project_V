import { useState } from 'react';
import UserReportModal from './UserReportModal';

export default function UserProfileModal({ open, user, onClose }) {
    const [reportOpen, setReportOpen] = useState(false);

    if (!open || !user) return null;

const submitUserReport = async (payload) => {
  const main = String(payload?.mainReason ?? '').trim();
  const sub = String(payload?.subReason ?? '').trim();
  if (!main || !sub) throw new Error('신고 사유를 선택해주세요.');

  const reasonCode = `${main}_${sub}`;

  const targetId = Number(user?.otherUserId ?? user?.id);
  const targetName =
    user?.otherNickName ?? user?.nickName ?? user?.nickname ?? user?.nick ?? '유저';

  if (!Number.isFinite(targetId)) {
    throw new Error('신고 대상 유저 정보가 올바르지 않습니다.');
  }

  const body = {
    targetType: 'USER',
    targetId,
    reasonCode,
    description: String(payload?.description ?? ''),
  };

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
