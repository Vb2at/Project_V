// 클래스별 기준 및 색상 정의
const CLASS_STEPS = [
  { key: 'F', at: 0.00, color: '#ff6b6b' },
  { key: 'D', at: 0.40, color: '#b38cff' },
  { key: 'C', at: 0.60, color: '#6fa8ff' },
  { key: 'B', at: 0.70, color: '#7dff9a' },
  { key: 'A', at: 0.90, color: '#6ffcff' },
  { key: 'S', at: 1.00, color: '#ffd75e' },
];

function getClassColor(ratio) {
  for (let i = CLASS_STEPS.length - 1; i >= 0; i--) {
    if (ratio >= CLASS_STEPS[i].at) {
      return CLASS_STEPS[i].color;
    }
  }
  return CLASS_STEPS[0].color;
}

/**
 * 하단이 오른쪽으로 갈수록 단계적으로 내려가는 계단 모양 데이터
 */
const PATH_DATA = `
  M 0,0 
  L 420,0 
  L 420,20 
  L 294,20 
  L 294,17 
  L 248,17 
  L 248,14 
  L 168,14 
  L 168,11 
  L 0,11 
  Z
`;

export default function HUD({
  score = 0,
  combo = 0,
  songProgress = 0,
  classProgress = 0,
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '420px',
        pointerEvents: 'none',
        color: '#e6faff',
      }}
    >
      {/* 1. CLASS LABELS */}
      <div style={{ position: 'relative', width: '420px', height: '16px', marginBottom: '4px' }}>
        {CLASS_STEPS.map(step => (
          <div
            key={step.key}
            style={{
              position: 'absolute',
              left: `${step.at * 98}%`,
              fontSize: '20px',
              bottom: '1px',
              opacity: 0.6,
              fontWeight: 'bold',
            }}
          >
            {step.key}
          </div>
        ))}
      </div>

      {/* 2. CLASS PROGRESS BAR */}
      <div style={{ position: 'relative', width: '420px', height: '22px', marginBottom: '12px' }}>
        <svg
          width="420"
          height="22"
          viewBox="0 0 420 22"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* 계단 마스크 */}
            <clipPath id="energy-mask">
              <path d={PATH_DATA} />
            </clipPath>

          </defs>

          {/* ✅ 배경 트랙 (검정 제거, 단계 색상 유지) */}
          <path
            d={PATH_DATA}
            fill={getClassColor(classProgress)}
            opacity="0.25"
            stroke="rgba(120, 180, 255, 0.25)"
            strokeWidth="1"
          />

          {/* 진행 게이지 */}
          <rect
            x="0"
            y="0"
            width={`${classProgress * 100}%`}
            height="22"
            fill={getClassColor(classProgress)}
            clipPath="url(#energy-mask)"
            style={{ transition: 'width 0.15s linear' }}
          />

          {/* 외곽선 */}
          <path
            d={PATH_DATA}
            fill="none"
            stroke="rgba(120, 180, 255, 0.9)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 3. SONG PROGRESS & SCORE */}
      <div
        style={{
          textAlign: 'left',
          fontSize: '26px',
          fontWeight: 700,
        }}
      >
        {/* SONG PROGRESS */}
        <div
          style={{
            height: '8px',
            background: 'rgba(255,255,255,0.15)',
            marginBottom: '10px',
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${songProgress * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #5aeaff, #ff4dff)',
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        {/* SCORE & COMBO */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          {score.toLocaleString()}
          <span style={{ marginLeft: '15px', fontSize: '18px', opacity: 0.8, color: '#00e5ff' }}>
            ×{combo}
          </span>
        </div>
      </div>
    </div>
  );
}
