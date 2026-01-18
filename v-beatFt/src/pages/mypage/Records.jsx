// pages/mypage/Records.jsx
import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function record() {
  const [record, setRecord] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/scores/record');
        setRecord(Array.isArray(res.data) ? res.data : []);
      } catch(e) {
        setRecord([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={wrap}>
      <HeaderRow />

      {loading ? (
        <Empty>불러오는 중...</Empty>
      ) : record.length === 0 ? (
        <Empty>플레이 기록이 없습니다</Empty>
      ) : (
        record.map((r, idx) => <Row key={idx} record={r} />)
      )}
    </div>
  );
}

/* ================= Row ================= */

function HeaderRow() {
  return (
    <div style={{ ...row, opacity: 0.6, fontSize: 12 }}>
      <div style={{ width: 140, textAlign: 'center' }}>날짜</div>
      <div style={{ width: 140, textAlign: 'center' }}>곡</div>
      <div style={{ width: 90, textAlign: 'right' }}>점수</div>
      <div style={{ width: 70, textAlign: 'right' }}>ACC</div>
      <div style={{ width: 60, textAlign: 'right' }}> 등급</div>
      <div style={{ width: 70, textAlign: 'right' }}>콤보</div>
    </div>
  );
}

function Row({ record }) {
  const playedAt = record.regDate ?? "-";
  const acc = record.accuracy ?? record.acc ?? 0;
  const combo = record.maxCombo ?? record.combo ?? 0;

  return (
    <div style={row}>
      <div style={{ width: 140, textAlign: 'center' }}>{playedAt}</div>
      <div style={{ width: 130, textAlign: 'center' }}>{record.title?.replace(/\.mp3$/i, '')}</div>
      <div style={{ width: 90, textAlign: 'right' }}>{record.score}</div>
      <div style={{ width: 70, textAlign: 'right' }}>{acc}%</div>
      <div style={{ width: 60, textAlign: 'right' }}>{record.grade}</div>
      <div style={{ width: 70, textAlign: 'right' }}>{combo}</div>
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
