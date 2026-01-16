// pages/mypage/Records.jsx
/* ===== 더미 데이터 ===== */
const DUMMY_RECORDS = [
  {
    id: 1,
    title: 'Neon Rush',
    score: 982345,
    acc: 98.2,
    grade: 'S',
    combo: 423,
    playedAt: '2026-01-16 14:32',
  },
  {
    id: 2,
    title: 'Night Drive',
    score: 812300,
    acc: 91.4,
    grade: 'A',
    combo: 211,
    playedAt: '2026-01-15 22:10',
  },
];

export default function Records() {
  return (
    <div style={wrap}>
      <HeaderRow />

      {DUMMY_RECORDS.length === 0 ? (
        <Empty>플레이 기록이 없습니다</Empty>
      ) : (
        DUMMY_RECORDS.map((r) => <Row key={r.id} record={r} />)
      )}
    </div>
  );
}

/* ================= Row ================= */

function HeaderRow() {
  return (
    <div style={{ ...row, opacity: 0.6, fontSize: 12 }}>
      <div style={{ width: 140 }}>날짜</div>
      <div style={{ flex: 1 }}>곡</div>
      <div style={{ width: 90, textAlign: 'right' }}>점수</div>
      <div style={{ width: 70, textAlign: 'right' }}>ACC</div>
      <div style={{ width: 60, textAlign: 'center' }}>등급</div>
      <div style={{ width: 70, textAlign: 'right' }}>콤보</div>
    </div>
  );
}

function Row({ record }) {
  return (
    <div style={row}>
      <div style={{ width: 140 }}>{record.playedAt}</div>
      <div style={{ flex: 1 }}>{record.title}</div>
      <div style={{ width: 90, textAlign: 'right' }}>{record.score}</div>
      <div style={{ width: 70, textAlign: 'right' }}>{record.acc}%</div>
      <div style={{ width: 60, textAlign: 'center' }}>{record.grade}</div>
      <div style={{ width: 70, textAlign: 'right' }}>{record.combo}</div>
    </div>
  );
}

/* ================= styles ================= */

const wrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const row = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 6px',
  borderRadius: 6,
  background: 'rgba(0,0,0,0.25)',
  fontSize: 13,
};

function Empty({ children }) {
  return <div style={{ opacity: 0.5 }}>{children}</div>;
}
