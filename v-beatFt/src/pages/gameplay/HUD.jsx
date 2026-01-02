import { getClassByRatio } from '../../util/scoreClass';

// 클래스별 기준 및 색상 정의
const CLASS_STEPS = [
  { key: 'F', at: 0.00, color: '#555555' },
  { key: 'D', at: 0.40, color: '#3f7cff' },
  { key: 'C', at: 0.60, color: '#00e5ff' },
  { key: 'B', at: 0.70, color: '#00ff6a' },
  { key: 'A', at: 0.90, color: '#ffb300' },
  { key: 'S', at: 1, color: '#ff1f8f' },
];

function getClassGradient(ratio) {
  for (let i = CLASS_STEPS.length - 1; i >= 0; i--) {
    if (ratio >= CLASS_STEPS[i].at) {
      const curr = CLASS_STEPS[i];
      const next = CLASS_STEPS[i + 1];
      if (!next) return curr.color;
      const t = (ratio - curr.at) / (next.at - curr.at);
      if (t < 0.8) return curr.color;
      return `linear-gradient(90deg, ${curr.color}, ${next.color})`;
    }
  }
  return CLASS_STEPS[0].color;
}

/**
 * 하단이 오른쪽으로 갈수록 단계적으로 내려가는 계단 모양 데이터
 * M(시작), L(선), Z(닫기)
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

      {/* 1. CLASS LABELS (F, D, C, B, A, S) */}
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

      {/* 2. CLASS PROGRESS BAR (SVG 방식) */}
      <div style={{ position: 'relative', width: '420px', height: '22px', marginBottom: '12px' }}>
        <svg
          width="420"
          height="22"
          viewBox="0 0 420 22"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* 계단 모양 마스크 정의 */}
            <clipPath id="energy-mask">
              <path d={PATH_DATA} />
            </clipPath>
          </defs>

          {/* 배경 트랙: 에너지가 비어있을 때 보이는 흐릿한 가이드라인 */}
          <path
            d={PATH_DATA}
            fill="rgba(255, 255, 255, 0.05)"
            stroke="rgba(120, 180, 255, 0.2)"
            strokeWidth="1"
          />

          {/* 게이지 본체: 색상이 채워지는 부분 */}
          <rect
            x="0"
            y="0"
            width={`${classProgress * 100}%`}
            height="22"
            fill={getClassGradient(classProgress)}
            clipPath="url(#energy-mask)"
            style={{ transition: 'width 0.15s linear' }}
          />

          {/* 외곽선: 에너지가 없어도 전체 계단 모양을 유지해줌 */}
          <path
            d={PATH_DATA}
            fill="none"
            stroke="rgba(120, 180, 255, 0.9)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 3. SONG PROGRESS & SCORE SECTION */}
      <div
        style={{
          textAlign: 'left',
          fontSize: '26px',
          fontWeight: 700,
        }}
      >
        {/* SONG PROGRESS LINE */}
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

        {/* SCORE & COMBO DISPLAY */}
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