import './Visualizer.css';
import { createPortal } from 'react-dom';
import { useRef, useEffect } from 'react';

/* =========================
   🎛 튜닝 상수
========================= */
const GAIN = 6.0;
const MIN_SCALE = 0.08;
const MAX_SCALE = 3.6;
const WOBBLE = 0.25;
const GAME_BAR_COUNT = 48;

/* =========================
   🎲 bar 고정 민감도
========================= */
const BAR_SENSITIVITY = Array.from(
  { length: GAME_BAR_COUNT },
  () => 0.7 + Math.random() * 0.6
);

/* =========================
   🚀 bar 메타 선계산 (앱 시작 1회)
========================= */
const BAR_META = Array.from({ length: GAME_BAR_COUNT }, (_, i) => {
  const hash = Math.sin(i * 127.1) * 43758.5453;
  const rand = hash - Math.floor(hash);   // 0~1

  const bandRatio = rand;

  const sensitivity =
    BAR_SENSITIVITY[i % BAR_SENSITIVITY.length] *
    (0.6 + rand * 0.9);

  const wobble = 1.0 + Math.sin(i * 0.7) * WOBBLE;
  const gain = GAIN * sensitivity * wobble;

  return { bandRatio, gain };
});

export default function Visualizer({
  size = 'small',
  active = false,
  analyserRef,
}) {
  const isGame = size === 'game';
  const BAR_COUNT = isGame ? GAME_BAR_COUNT : 4;

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
     🚀 RAF 루프 (단일)
  ========================= */
  useEffect(() => {
    if (!isGame) return;

    const tick = () => {
      const analyser = analyserRef?.current;
      if (!analyser || !activeRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const data = dataRef.current;
      analyser.getByteFrequencyData(data);

      /* 평균 계산 (1회) */
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      avgRef.current = (sum / data.length) / 255;

      /* bar 업데이트 */
      for (let i = 0; i < BAR_COUNT; i++) {
        const el = barsRef.current[i];
        if (!el) continue;

        const meta = BAR_META[i];
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
  }, [isGame, analyserRef, BAR_COUNT]);

  const node = (
    <div
      className={[
        'visualizer',
        `visualizer--${size}`,
        active ? 'is-active' : '',
      ].join(' ')}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
        />
      ))}
    </div>
  );

  return isGame
    ? createPortal(node, document.body)
    : node;
}
