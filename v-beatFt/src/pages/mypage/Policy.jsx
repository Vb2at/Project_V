// pages/mypage/Policy.jsx
import { useState } from 'react';
import { TERMS } from '../../pages/auth/TermsText'; 

export default function Policy() {
  const [agree, setAgree] = useState(false);

  return (
    <div style={wrap}>
      {/* ===== 약관 목록 ===== */}
      {Object.values(TERMS).map((t) => (
        <Section key={t.title} title={t.title}>
          <Box>
            <pre style={termText}>{t.content}</pre>
          </Box>
        </Section>
      ))}

      {/* ===== 회원 탈퇴 ===== */}
      <Section title="회원 탈퇴">
        <Box>
          <p style={{ color: '#ff8a8a', fontWeight: 600 }}>
            탈퇴 시 모든 게임 데이터 및 기록이 영구 삭제됩니다.
          </p>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>위 내용을 모두 확인했으며 탈퇴에 동의합니다.</span>
          </label>

          <button
            disabled={!agree}
            style={{
              ...dangerBtn,
              opacity: agree ? 1 : 0.4,
              cursor: agree ? 'pointer' : 'not-allowed',
            }}
            onClick={() => {
              alert('탈퇴 API 연결 예정');
              // TODO: DELETE /api/me
            }}
          >
            회원 탈퇴
          </button>
        </Box>
      </Section>
    </div>
  );
}

/* ================= UI ================= */

function Section({ title, children }) {
  return (
    <div style={section}>
      <div style={titleStyle}>{title}</div>
      {children}
    </div>
  );
}

function Box({ children }) {
  return <div style={box}>{children}</div>;
}

/* ================= styles ================= */

const wrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};

const section = {
  background: 'rgba(0,0,0,0.25)',
  borderRadius: 12,
  padding: 14,
};

const titleStyle = {
  fontWeight: 700,
  marginBottom: 8,
  color: '#5aeaff',
};

const box = {
  fontSize: 13,
  lineHeight: 1.6,
  opacity: 0.95,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const termText = {
  whiteSpace: 'pre-wrap',
  fontFamily: 'inherit',
};

const checkRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 12,
};

const dangerBtn = {
  marginTop: 12,
  padding: '8px 0',
  borderRadius: 8,
  background: 'rgba(255,77,79,0.15)',
  border: '1px solid #ff4d4f',
  color: '#ff4d4f',
  fontWeight: 700,
};
