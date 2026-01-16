import './Visualizer.css';
import { createPortal } from 'react-dom';
import { useRef, useEffect, useMemo } from 'react';

/* =========================
   ✅ 프리셋 분리 (게임/로그인)
   - 게임(default): 기존 값 유지
   - 로그인: 여기만 튜닝
========================= */
const PRESET = {
  game: {
    GAIN: 6.0,
    MIN_SCALE: 0.08,
    MAX_SCALE: 3.6,
    WOBBLE: 0.25,
    BAR_COUNT: 48,
  },
  menu: {
    GAIN: 3.2,
    MIN_SCALE: 0.05,
    MAX_SCALE: 1.8,
    WOBBLE: 0.15,
    BAR_COUNT: 48,
  },
};

export default function Visualizer({
  size = 'small',
  active = false,
  analyserRef,
  preset,
  style,
}) {
  const isGame = size === 'game';

  // ✅ size가 game이면 기본 preset은 game

  const presetKey = preset ?? (isGame ? 'game' : 'menu');


  const cfg = PRESET[presetKey] ?? PRESET.game;
  const { GAIN, MIN_SCALE, MAX_SCALE, WOBBLE, BAR_COUNT } = cfg;

  const barsRef = useRef([]);
  const activeRef = useRef(active);
  const avgRef = useRef(0);
  const dataRef = useRef(new Uint8Array(128));
  const rafRef = useRef(0);

  /* active 상태만 ref로 미러링 */
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /* =========================
     ✅ bar meta (BAR_COUNT/cfg에 맞춰 안정적으로 생성)
     - 전역 상수 제거
     - preset 바꿔도 게임 영향 없음
  ========================= */
  const barMeta = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const hash = Math.sin(i * 127.1) * 43758.5453;
      const rand = hash - Math.floor(hash); // 0~1

      const bandRatio = rand;

      // 민감도는 고정적이면서도 bar별 차이를 주기
      const sensitivity = (0.7 + ((i * 73) % 100) / 100 * 0.6) * (0.6 + rand * 0.9);
      const wobble = 1.0 + Math.sin(i * 0.7) * WOBBLE;

      const gain = GAIN * sensitivity * wobble;

      return { bandRatio, gain };
    });
  }, [BAR_COUNT, GAIN, WOBBLE]);

  /* =========================
     ✅ RAF 루프 (game일 때만)
  ========================= */
  useEffect(() => {
    if (!isGame) return;

    const tick = () => {
      const analyser = analyserRef?.current;

      // analyser 없거나 비활성이면 계속 대기
      if (!analyser || !activeRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const data = dataRef.current;
      analyser.getByteFrequencyData(data);
      let max = 0;
      for (let i = 0; i < data.length; i++) if (data[i] > max) max = data[i];

      // 평균
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      avgRef.current = (sum / data.length) / 255;

      // bar 업데이트
      for (let i = 0; i < BAR_COUNT; i++) {
        const el = barsRef.current[i];
        if (!el) continue;

        const meta = barMeta[i];
        const bandIndex = Math.floor(meta.bandRatio * data.length);
        const base = data[bandIndex] / 255;
        const v = base * 0.45 + avgRef.current * 0.55;

        const raw = MIN_SCALE + v * meta.gain;
        const scale = raw > MAX_SCALE ? MAX_SCALE : raw;

        el.style.transform = `scaleY(${scale})`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isGame, analyserRef, BAR_COUNT, barMeta, MIN_SCALE, MAX_SCALE]);

  const node = (
    <div
      className={[
        'visualizer',
        `visualizer--${size}`,
        active ? 'is-active' : '',
      ].join(' ')}
      style={style}
      aria-hidden="true"
    >
      {Array.from({ length: isGame ? BAR_COUNT : 4 }).map((_, i) => (
        <span key={i} ref={(el) => (barsRef.current[i] = el)} />
      ))}
    </div>
  );

  return isGame ? createPortal(node, document.body) : node;
}
