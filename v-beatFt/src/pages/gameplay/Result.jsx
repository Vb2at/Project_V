import { getClassByRatio } from "../../util/scoreClass";
import Background from '../../components/Common/Background';

const GRADE_STYLE = {
  S: { color: '#ffd75e', glow: 'rgba(255,215,94,0.9)' },
  A: { color: '#6ffcff', glow: 'rgba(111,252,255,0.9)' },
  B: { color: '#7dff9a', glow: 'rgba(125,255,154,0.9)' },
  C: { color: '#6fa8ff', glow: 'rgba(111,168,255,0.9)' },
  D: { color: '#b38cff', glow: 'rgba(179,140,255,0.9)' },
  F: { color: '#ff6b6b', glow: 'rgba(255,107,107,0.9)' },
};

export default function Result({ score = 0, maxScore = 1 }) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const grade = getClassByRatio(ratio);
  const gradeStyle = GRADE_STYLE[grade] ?? GRADE_STYLE.F;

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Background />
      <div/>

      {/* ===== 중앙 정렬 ===== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#e6faff',
        }}
      >
        {/* ===== 카드 래퍼 ===== */}
        <div style={{ position: 'relative' }}>
          {/* ===== 네온 윤곽선 ===== */}
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '22px',
              background: 'rgba(255,80,80,0.45)',
              filter: 'blur(10px)',
              opacity: 0.8,
            }}
          />

          {/* ===== 카드 본체 ===== */}
          <div
            style={{
              position: 'relative',
              padding: '48px 72px',
              borderRadius: '16px',
              background: '#111',
              boxShadow: `
                0 0 24px rgba(255,80,80,0.35),
                0 0 48px rgba(255,0,0,0.25)
              `,
              textAlign: 'center',
              animation: 'cardIn 800ms ease-out',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 6 }}>
              RESULT
            </div>

            {/* ===== 등급 ===== */}
            <div
              style={{
                marginTop: 28,
                fontSize: 96,
                fontWeight: 900,
                color: gradeStyle.color,
                textShadow: `
                  0 0 12px ${gradeStyle.glow},
                  0 0 32px ${gradeStyle.glow}
                `,
                animation: 'gradePop 1000ms ease-out',
              }}
            >
              {grade}
            </div>

            <div style={{ marginTop: 24, fontSize: 20 }}>
              점수: {score}
            </div>

            <div style={{ marginTop: 12, opacity: 0.7 }}>
              달성률: {(ratio * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* ===== 애니메이션 정의 ===== */}
      <style>
        {`
          @keyframes bgPulse {
            0%   { opacity: 1; }
            50%  { opacity: 0.92; }
            100% { opacity: 1; }
          }

          @keyframes cardIn {
            0%   { opacity: 0; transform: scale(0.96); }
            100% { opacity: 1; transform: scale(1); }
          }

          @keyframes gradePop {
            0%   { transform: scale(0.7); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
