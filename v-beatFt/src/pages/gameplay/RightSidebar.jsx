// src/pages/multi/RightSidebar.jsx
export default function RightSidebar({
  isMulti = false,
  rival = null,
}) {
  if (!isMulti) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 300,
        height: '100vh',
        background: '#111',
        color: '#0f0',
        padding: 16,
        fontFamily: 'monospace',
        zIndex: 99999,
        overflow: 'auto',
      }}
    >
      <h3>RIGHT SIDEBAR (TEST)</h3>

      <div style={{ marginBottom: 12 }}>
        <strong>isMulti:</strong> {String(isMulti)}
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>rival raw:</strong>
        <pre
          style={{
            marginTop: 8,
            padding: 8,
            background: '#000',
            color: '#0f0',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(rival, null, 2)}
        </pre>
      </div>

      <div>
        <strong>parsed fields</strong>
        <div>nickname: {rival?.nickname ?? '(null)'}</div>
        <div>score: {rival?.score ?? '(null)'}</div>
        <div>combo: {rival?.combo ?? '(null)'}</div>
        <div>profileUrl: {rival?.profileUrl ?? '(null)'}</div>
      </div>
    </div>
  );
}
