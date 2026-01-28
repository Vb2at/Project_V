import { useState, useRef } from 'react';
import { changePasswordApi } from '../../api/auth';

export default function PasswordChangeModal({ onClose }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const pwRef = useRef(null);
  const pw2Ref = useRef(null);

  const handleSubmit = async () => {
    if (!pw) {
      setMsg('비밀번호를 입력하세요.');
      pwRef.current?.focus();
      return;
    }
    if (pw !== pw2) {
      setMsg('비밀번호가 일치하지 않습니다.');
      pw2Ref.current?.focus();
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      const res = await changePasswordApi('', pw);

      if (res.data?.ok) {
        alert(res.data.message || '비밀번호가 변경되었습니다.');
        onClose();
      } else {
        setMsg(res.data?.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={backdrop}>
      <div style={modal}>
        <h3 style={{ marginBottom: 16 }}>비밀번호 변경</h3>

        <input
          ref={pwRef}
          type="password"
          placeholder="새 비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={input}
        />
        <input
          ref={pw2Ref}
          type="password"
          placeholder="새 비밀번호 확인"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          style={input}
        />

        <div style={{ height: 18, color: '#ff6b6b', fontSize: 13 }}>
          {msg || '\u00A0'}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button onClick={handleSubmit} disabled={loading} style={btnBlue}>
            {loading ? '변경 중...' : '변경'}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
};

const modal = {
  width: 360,
  padding: 24,
  borderRadius: 14,
  background: '#1c1f26',
  color: '#fff',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  display: 'flex',
  flexDirection: 'column',
};

const input = {
  height: 44,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.4)',
  color: '#fff',
  padding: '0 14px',
  marginBottom: 10,
};

const btnBlue = {
  flex: 1,
  height: 40,
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #00aeff, #00ccff)',
  fontWeight: 700,
  cursor: 'pointer',
};

const btnGray = {
  flex: 1,
  height: 40,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  color: '#ccc',
  cursor: 'pointer',
};
