import { useEffect, useRef } from 'react';
import { Application, Assets } from 'pixi.js';
import { GAME_CONFIG } from '../../constants/GameConfig';
import LightEffect from './LightEffect';

function getPerspectiveScale(y) {
  const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;
  const { HEIGHT } = GAME_CONFIG.CANVAS;
  return SCALE_MIN + (y / HEIGHT) * (SCALE_MAX - SCALE_MIN);
}

function applyPerspective(x, y) {
  const { WIDTH } = GAME_CONFIG.CANVAS;
  const centerX = WIDTH / 2;
  const scale = getPerspectiveScale(y);
  return centerX + (x - centerX) * scale;
}

/**
 * 키 생성 규칙
 * - tap: 이벤트 단위로 유니크해야 함 (id가 있으면 id 사용)
 * - long: 노트 단위로 1개 유지 (lane/index 조합)
 *
 * 아래는 "현실 대응" 버전:
 * - tap은 effect.id가 있으면 그걸로 고정
 * - 없으면 lane+index+chartTime(있으면)로 고정
 */
function makeKey(effect) {
  if (!effect) return null;

  if (effect.type === 'tap') {
    if (effect.id != null) return `tap-${effect.id}`;
    if (effect.chartTime != null) return `tap-${effect.lane}-${effect.index}-${effect.chartTime}`;
    return `tap-${effect.lane}-${effect.index}`; // 마지막 fallback (데이터가 불안정하면 여기서 중복날 수 있음)
  }

  if (effect.type === 'long') {
    // long은 유지가 핵심이므로 노트 단위 고정키
    return `long-${effect.lane}-${effect.index}`;
  }

  return null;
}

export default function PixiEffects({ effects }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const texturesRef = useRef(null);

  // 현재 프레임 effects를 ticker에서 보기 위한 ref
  const effectsRef = useRef(effects);

  // key -> LightEffect
  const aliveRef = useRef(new Map());

  useEffect(() => {
    effectsRef.current = effects || [];
  }, [effects]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      texturesRef.current = {
        core: await Assets.load('/effects/core.png'),
        bloom: await Assets.load('/effects/bloom.png'),
        flare: await Assets.load('/effects/flare.png'),
      };

      const app = new Application();
      await app.init({
        width: GAME_CONFIG.CANVAS.WIDTH,
        height: GAME_CONFIG.CANVAS.HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
      });

      if (!mounted) return;

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      app.ticker.add(() => {
        const now = performance.now();
        const currentEffects = effectsRef.current || [];

        // 이번 프레임에 존재하는 key 집합
        const presentKeys = new Set();
        for (const e of currentEffects) {
          const k = makeKey(e);
          if (k) presentKeys.add(k);
        }

        // alive 업데이트 + long 종료 감지
        aliveRef.current.forEach((inst, key) => {
          // long은 effects에서 사라진 순간 종료 처리
          if (inst.type === 'long' && !presentKeys.has(key)) {
            inst.startEnd(now);
          }

          inst.update(now);

          if (inst.dead) {
            app.stage.removeChild(inst.container);
            inst.destroy();
            aliveRef.current.delete(key);
          }
        });
      });
    })();

    return () => {
      mounted = false;
      if (appRef.current) appRef.current.destroy(true);
    };
  }, []);

  // 생성: "현재 effects 전체"를 보되, key로 단 1회만 생성
  useEffect(() => {
    if (!appRef.current || !texturesRef.current) return;

    const app = appRef.current;
    const { LANE_WIDTH, HIT_LINE_Y } = GAME_CONFIG.CANVAS;

    // 같은 render에서 중복 effect가 들어와도 1번만 처리
    const createdThisPass = new Set();

    (effects || []).forEach(effect => {
      const key = makeKey(effect);
      if (!key) return;
      if (createdThisPass.has(key)) return;
      createdThisPass.add(key);

      if (aliveRef.current.has(key)) return;

      const laneLeft = effect.lane * LANE_WIDTH;
      const laneRight = (effect.lane + 1) * LANE_WIDTH;
      const x = applyPerspective((laneLeft + laneRight) / 2, HIT_LINE_Y);

      const inst = new LightEffect({
        textures: texturesRef.current,
        type: effect.type,
      });

      inst.container.x = x;
      inst.container.y = HIT_LINE_Y;

      app.stage.addChild(inst.container);
      aliveRef.current.set(key, inst);
    });
  }, [effects]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: GAME_CONFIG.CANVAS.WIDTH,
        height: GAME_CONFIG.CANVAS.HEIGHT,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}
