import { useState, useEffect } from 'react';

export default function UserBlockModal({ open, user, onClose, onConfirm }) {
  const [reason, setReason] = useState('');

  if (!open || !user) return null;

  useEffect(() => {
    if(!open) {
      setReason('');
    }
  }, [open]);

  return (
    <>
      <div style={overlay} onClick={onClose} />

      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 4 }}>유저 차단</h3>

        <div style={{ fontSize: 13, opacity: 0.8 }}>
          대상: {user.nickname}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="차단 사유를 입력하세요"
          style={textarea}
        />

        <div style={btnRow}>
          <button style={btnSub} onClick={onClose}>
            취소
          </button>

          <button
            style={btnDanger}
            onClick={() => {
              if (!reason.trim()) {
                alert('차단 사유를 입력하세요');
                return;
              }
              onConfirm(user.id, reason);
            }}
          >
            차단
          </button>
        </div>
      </div>
    </>
  );
}

/* styles 동일 */


/* ================= Styles ================= */

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
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
  gap: 12,
};

const textarea = {
  minHeight: 90,
  resize: 'none',
  borderRadius: 8,
  padding: 10,
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.25)',
  color: '#fff',
  outline: 'none',
};

const btnRow = {
  display: 'flex',
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
  flex: 1,
  height: 34,
  borderRadius: 8,
  border: '1px solid #ff6b6b',
  background: 'rgba(255,107,107,0.15)',
  color: '#ff6b6b',
  cursor: 'pointer',
};
