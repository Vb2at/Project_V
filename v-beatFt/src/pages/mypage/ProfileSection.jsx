import { useState, useRef } from 'react';
import ProfileAvatar from '../../components/Member/ProfileAvatar';

export default function ProfileSection({ user }) {
  const originNick = user?.loginUserNickName ?? '';

  const [nickname, setNickname] = useState(originNick);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  // 계정 정보
  const email = user?.loginUser?.email ?? '-';
  const joinAt = user?.loginUser?.createdAt
    ? new Date(user.loginUser.createdAt).toLocaleDateString()
    : '-';
  const provider = user?.loginUser?.provider ?? 'LOCAL';

  const roleMap = { USER: '일반', ADMIN: '관리', BLOCKED: '차단' };
  const role = roleMap[user?.loginUser?.role] ?? '일반';

  /* ================= handlers ================= */

  async function saveProfile() {
    try {
      const file = fileRef.current?.files?.[0];
      const nickChanged = nickname !== originNick;

      if (file) {
        const form = new FormData();
        form.append('image', file);
        await fetch('/api/me/profile-image', {
          method: 'POST',
          body: form,
          credentials: 'include',
        });
      }

      if (nickChanged) {
        await fetch('/api/me/nickname', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ nickname }),
        });
      }

      if (file || nickChanged) {
        window.dispatchEvent(new Event('profile-updated'));
        alert('프로필 저장 완료');
      }
    } catch (e) {
      console.error(e);
      alert('프로필 저장 실패');
    }
  }

  async function changePassword() {
    if (!currentPw || !newPw || !newPw2) return alert('모든 비밀번호를 입력해주세요.');
    if (newPw !== newPw2) return alert('새 비밀번호가 일치하지 않습니다.');

    try {
      const res = await fetch('/api/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });

      if (!res.ok) throw new Error();

      alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      window.location.href = '/login';
    } catch (e) {
      console.error(e);
      alert('현재 비밀번호가 올바르지 않습니다.');
    }
  }

  return (
    <div style={pageWrap}>
      {/* ================= 1. 프로필 카드 ================= */}
      <div style={cardStyle}>
        <div style={profileRow}>
          {/* avatar */}
          <div style={avatarWrap}>
            <ProfileAvatar
              profileImg={preview || user?.loginUser?.profileImg}
              userId={user?.loginUserId}
              size={96}
            />
            <button style={btnSub} onClick={() => fileRef.current?.click()}>
              이미지 변경
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPreview(URL.createObjectURL(file));
              }}
            />
          </div>

          {/* nickname */}
          <div style={{ width: 380}}>
            <div style={title}>닉네임</div>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={inputStyle({ maxWidth: 280, marginTop: 10 })}
            />
          </div>
        </div>

        {/* save */}
        <div style={cardFooterCenter}>
          <button style={btnMain} onClick={saveProfile}>
            프로필 저장
          </button>
        </div>
      </div>

      {/* ================= 2. 계정 정보 카드 ================= */}
      <div style={cardStyle}>
        <div style={title}>계정 정보</div>
        <div style={infoWrap}>
          <InfoRow label="이메일" value={email} />
          <InfoRow label="가입일" value={joinAt} />
          <InfoRow label="로그인 방식" value={provider} />
          <InfoRow label="계정상태" value={role} />
        </div>
      </div>

      {/* ================= 3. 비밀번호 변경 카드 ================= */}
      <div style={cardStyle}>
        <div style={title}>비밀번호 변경</div>

        <div style={pwWrap}>
          <input
            type="password"
            placeholder="현재 비밀번호"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            style={inputStyle()}
          />
          <input
            type="password"
            placeholder="새 비밀번호"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            style={inputStyle()}
          />
          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={newPw2}
            onChange={(e) => setNewPw2(e.target.value)}
            style={inputStyle()}
          />
        </div>

        <div style={cardFooterCenter}>
          <button style={btnMain} onClick={changePassword}>
            비밀번호 변경
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= styles ================= */

const pageWrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  maxWidth: 820,
  width: '100%',
};

const cardStyle = {
  borderRadius: 14,
  background: 'rgba(20,22,28,0.7)',
  padding: '22px 28px',
  boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const profileRow = {
  display: 'flex',
  gap: 28,
  alignItems: 'flex-start',
  justifyContent: 'center', 
};

const cardFooterCenter = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: 14,
};

const avatarWrap = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
};

const infoWrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const pwWrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxWidth: 420,
  width: '100%',
  margin: '12px auto 0',
};

const title = {
  fontSize: 16,
  fontWeight: 600,
  color: '#ffffff',
};

const inputStyle = (extra = {}) => ({
  height: 38,
  borderRadius: 7,
  padding: '0 12px',
  background: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#ffffff',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 14,
  ...extra,
});

const ACCENT = '#5aeaff';

const btnMain = {
  padding: '8px 22px',
  borderRadius: 9,
  background: 'rgba(90,234,255,0.15)',
  border: `1px solid ${ACCENT}`,
  color: ACCENT,
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
};

const btnSub = {
  padding: '5px 12px',
  borderRadius: 7,
  background: 'rgba(90,234,255,0.1)',
  border: `1px solid ${ACCENT}`,
  color: ACCENT,
  cursor: 'pointer',
  fontSize: 12,
};

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <span style={{ width: 100, color: '#9aa6b2', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#ffffff', fontSize: 13 }}>{value}</span>
    </div>
  );
}
