import { useState } from 'react';
import UserReportModal from './UserReportModal';
import { createPortal } from 'react-dom';
export default function UserProfileModal({ open, user, onClose }) {
    const [reportOpen, setReportOpen] = useState(false);

    if (!open || !user) return null;

    const toImgUrl = (v) => {
        if (!v) return null;
        let s = String(v).trim();

        // 이미 절대 URL이면 그대로
        if (s.startsWith('http://') || s.startsWith('https://')) return s;

        // 절대 경로(/upload/...)이면 그대로 백엔드 붙임
        if (s.startsWith('/')) return `http://localhost:8080${s}`;

        // profileImg/UUID.jpg 혹은 그냥 UUID.jpg 처리
        if (s.startsWith('profileImg/')) {
            s = s.replace(/^profileImg\//, '');
        } else if (s.includes('upload/profileImg/')) {
            // 이미 upload/profileImg/ 포함되어 있으면 그대로 사용
            return `http://localhost:8080/${s}`;
        }
        return `http://localhost:8080/upload/profileImg/${encodeURIComponent(s)}`;
    };


    const targetProfileImg = user?.profileImg || null;
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

    return createPortal(
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
                            <img
                                src={toImgUrl(targetProfileImg)}
                                alt="target profile"
                                style={avatarImg}
                            />
                        ) : (
                            <div style={avatarDummy} />
                        )}
                    </div>

                    <div style={name}>
                        {user?.otherNickName
                            ?? user?.nickname
                            ?? user?.nickName
                            ?? 'Unknown'}
                    </div>
                </div>

                {/* ===== 버튼 영역 (새 구조) ===== */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        alignItems: 'center',
                        marginTop: 8,
                    }}
                >
                    {/* 1) 친구추가 버튼 (신고 위) */}
                    <button
                        style={{
                            ...btnSub,
                            height: 100,              // 친구추가만 두껍게
                            width: '100%',
                            border: '1px solid #5aeaff',
                            color: '#5aeaff',
                        }}
                        onClick={() => {
                            console.log('[ADD FRIEND]', user?.userId ?? user?.id);
                            alert('친구 추가 요청 준비중입니다. 마이페이지를 이용해주세요.');
                        }}
                    >
                        친구추가
                    </button>
                    {/* 2) 신고 버튼 */}
                    <button
                        style={{ ...btnDanger, width: '100%' }}
                        onClick={() => setReportOpen(true)}
                    >
                        신고
                    </button>

                    {/* 3) 닫기 버튼 — 중앙 정렬 */}
                    <button
                        style={{
                            ...closeBtn,
                            width: '80%',
                            alignSelf: 'center',
                            marginTop: 6,
                        }}
                        onClick={onClose}
                    >
                        닫기
                    </button>
                </div>
            </div>

            {/* 신고 모달 */}
            <UserReportModal
                open={reportOpen}
                type="USER"
                targetId={user?.userId ?? user?.id}
                targetName={
                    user?.otherNickName
                    ?? user?.nickname
                    ?? user?.nickName
                }
                targetProfileImg={toImgUrl(targetProfileImg)}
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
        </>,
        document.body
    );

}
const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 9998,
};

const modal = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 300,          // 적당한 기본 크기
    maxWidth: '90vw',    // 작은 화면 보호
    background: '#0b0b0b',
    border: '1px solid #333',
    borderRadius: 14,
    padding: 16,
    zIndex: 9999,        // ★ overlay 위에 확실히 올라오게
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

const btnFriend = {
    ...btnSub,
    height: 48,          // ★ 친구추가만 두껍게
    padding: '10px 12px'
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
