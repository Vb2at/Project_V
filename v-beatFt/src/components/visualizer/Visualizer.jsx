import './Visualizer.css';
import { createPortal } from 'react-dom';

/* =========================
   🎛 튜닝 상수 (직관용)
========================= */
const GAIN = 6.0;        // 소리 증폭량 (크면 더 크게 반응)
const MIN_SCALE = 0.08; // 최소 막대 높이
const MAX_SCALE = 3.6;  // 최대 막대 높이
const WOBBLE = 0.25;    // 막대 간 미세 흔들림

const GAME_BAR_COUNT = 64;

/* =========================
   🎲 막대별 고정 민감도 (랜덤 1회 생성)
   0.7 ~ 1.3 범위
========================= */
const BAR_SENSITIVITY = Array.from(
  { length: GAME_BAR_COUNT },
  () => 0.7 + Math.random() * 0.6
);

export default function Visualizer({
  size = 'small',
  active = false,
  levels = null,   // GameSession에서 전달한 주파수 밴드
  level = 0,       // fallback
}) {
  const isGame = size === 'game';
  const BAR_COUNT = isGame ? GAME_BAR_COUNT : 4;

  // header는 항상 보이고, game만 active 제어
  const show = isGame ? active : true;

  const getStrength = (i) => {
    if (!isGame) return null;

    // 기본 입력 레벨
    let v = level; // 0 ~ 1

    if (levels && levels.length) {
      const bandCount = levels.length;

      // ✅ 공간 분산용 pseudo random (항상 동일한 패턴)
      const hash = Math.sin(i * 127.1) * 43758.5453;
      const rand = hash - Math.floor(hash); // 0~1

      // ✅ 밴드를 랜덤 분산 매핑
      const bandIndex = Math.floor(rand * bandCount);

      const base = levels[bandIndex] ?? 0;

      // ✅ 전체 평균
      const globalAvg =
        levels.reduce((s, x) => s + x, 0) / bandCount;

      // ✅ 막대 고유 민감도 (고정)
      const sensitivity = 0.6 + rand * 0.9; // 0.6 ~ 1.5

      // ✅ 최종 혼합값
      v =
        base * 0.45 +
        globalAvg * 0.55;

      v *= sensitivity;
    }

    // ✅ 막대별 랜덤 민감도 (고정)
    const sensitivity = BAR_SENSITIVITY[i % BAR_SENSITIVITY.length];

    // ✅ 방향성 없는 미세 흔들림만 적용
    const wobble =
      1.0 + Math.sin(i * 0.7) * WOBBLE;

    // ✅ 최종 스케일 계산
    const raw =
      MIN_SCALE + v * GAIN * sensitivity * wobble;

    return Math.min(MAX_SCALE, raw);
  };

  return createPortal(
    <div
      className={[
        'visualizer',
        `visualizer--${size}`,
        show ? 'is-active' : '',
      ].join(' ')}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          style={
            isGame
              ? { transform: `scaleY(${getStrength(i)})` }
              : undefined
          }
        />
      ))}
    </div>,
    document.body
  );
}
