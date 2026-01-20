import { useEffect, useState } from 'react';
import ReportDetailModal from './ReportDetailModal';

const STATUS_TABS = [
  { key: 'PENDING', label: '대기' },
  { key: 'RESOLVED', label: '처리완료' },
  { key: 'REJECTED', label: '반려/무시' },
];

export default function ReportPanel({ onAction }) {
  const [selected, setSelected] = useState(null);

  const [status, setStatus] = useState('PENDING');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const applyLocalMove = (reportId, actionType) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setErr('');

      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await fetch(`/api/admin/report${qs}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message ?? `신고 목록 조회 실패 (${res.status})`);
      }

      const list = Array.isArray(data?.reports) ? data.reports : [];
      setReports(list);
    } catch (e) {
      setReports([]);
      setErr(e?.message ?? '조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [status]);

  useEffect(() => {
    setSelected(null);
  }, [status]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>신고 목록</h3>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btnSub} onClick={loadReports} disabled={loading}>
            새로고침
          </button>
        </div>
      </div>

      {/* 상태 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {STATUS_TABS.map((t) => {
          const active = status === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              style={{ ...chip, ...(active ? chipActive : {}) }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && <div style={{ opacity: 0.6 }}>불러오는 중...</div>}
      {!loading && err && <div style={{ color: '#ff6b6b' }}>{err}</div>}
      {!loading && !err && reports.length === 0 && <div style={{ opacity: 0.6 }}>목록이 없습니다.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {reports.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelected(r)}
            style={{
              padding: '10px 14px',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              cursor: 'pointer',
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>
                [{r.targetType}] {r.targetName ?? `#${r.targetId}`}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>
                {r.reasonCode}
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.5 }}>
              {r.regDate ?? ''}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <ReportDetailModal
          report={selected}
          onClose={() => setSelected(null)}
          onAction={onAction}
          onRefresh={loadReports}
          onLocalMove={applyLocalMove}
        />
      )}
    </div>
  );
}

const ACCENT = '#5aeaff';

const btnSub = {
  padding: '6px 14px',
  borderRadius: 6,
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.25)',
  color: '#ccc',
  cursor: 'pointer',
};

const chip = {
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'transparent',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 13,
};

const chipActive = {
  border: `1px solid ${ACCENT}`,
  color: ACCENT,
  background: 'rgba(90,234,255,0.12)',
};
