// PixiEffects.jsx
import { useEffect, useRef } from 'react';
import { Application, Assets, Container } from 'pixi.js';
import { GAME_CONFIG } from '../../../constants/GameConfig';
import LightEffect from './LightEffect';
import LaneStreamEffect from './LaneStreamEffect';
import JudgmentText from '../ui/JudgmentText';
import ComboText from '../ui/ComboText';

function getLaneLeftX(lane) {
  return GAME_CONFIG.LANE_WIDTHS
    .slice(0, lane)
    .reduce((a, b) => a + b, 0);
}

function getLaneRightX(lane) {
  return getLaneLeftX(lane) + GAME_CONFIG.LANE_WIDTHS[lane];
}

const LONG_PULSE_INTERVAL_MS = 140;
const LONG_MISSING_GRACE_MS = 60;

let texturesPromise = null;

async function loadEffectTextures() {
  if (!texturesPromise) {
    texturesPromise = (async () => {
      const [core, bloom, flare, laneStream] = await Promise.all([
        Assets.load('/effects/core.png'),
        Assets.load('/effects/bloom.png'),
        Assets.load('/effects/flare.png'),
        Assets.load('/effects/laneStream.png'),
      ]);
      return { core, bloom, flare, laneStream };
    })();
  }
  return texturesPromise;
}

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

function makeLongKey(effect) {
  if (!effect || effect.type !== 'long') return null;
  if (effect.noteId != null) return `long-${effect.noteId}`;
  if (effect.id != null) return `long-${effect.id}`;
  return `long-${effect.lane}-${effect.index}`;
}

function makeTapKey(effect) {
  if (!effect || effect.type !== 'tap') return null;
  if (effect.id != null) return `tap-${effect.id}`;
  if (effect.tapId != null) return `tap-${effect.tapId}`;
  if (effect.time != null) return `tap-${effect.lane}-${effect.time}`;
  if (effect.index != null) return `tap-${effect.lane}-${effect.index}`;
  return null;
}

export default function PixiEffects({
  effects,
  showHitEffect = true,
  showJudgeText = true,
  showComboText = true,
  lowEffect = false,
  fpsLimit = 60,
  onPixiReady,
}) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const texturesRef = useRef(null);
  const initReadyRef = useRef(false);
  const judgeLayerRef = useRef(null);

  const longPulseRef = useRef(new Map());
  const effectsRef = useRef(effects || []);
  const aliveRef = useRef(new Map());
  const tapEffectsRef = useRef([]);
  const longStreamRef = useRef(new Map());
  const tapStreamRef = useRef(new Map());

  const processedTapSetRef = useRef(new Set());
  const processedTapQueueRef = useRef([]);
  const TAP_KEY_MAX = 1500;

  const judgeTextsRef = useRef([]);
  const judgeClearedThisBatchRef = useRef(false);
  const consumedEffectIdsRef = useRef(new Set());

  const comboTextRef = useRef(null);

  // ✅ 매 프레임 Set 재생성 방지
  const presentLongKeysRef = useRef(new Set());

  // ✅ tickerFn([])에서 props 최신값 사용
  const showHitEffectRef = useRef(showHitEffect);
  const showJudgeTextRef = useRef(showJudgeText);
  const showComboTextRef = useRef(showComboText);
  const fpsLimitRef = useRef(fpsLimit);
  const lowEffectRef = useRef(lowEffect);

  useEffect(() => { effectsRef.current = effects || []; }, [effects]);
  useEffect(() => { showHitEffectRef.current = showHitEffect; }, [showHitEffect]);
  useEffect(() => { showJudgeTextRef.current = showJudgeText; }, [showJudgeText]);
  useEffect(() => { showComboTextRef.current = showComboText; }, [showComboText]);
  useEffect(() => { fpsLimitRef.current = fpsLimit; }, [fpsLimit]);
  useEffect(() => { lowEffectRef.current = lowEffect; }, [lowEffect]);

  useEffect(() => {
    let mounted = true;
    let tickerFn = null;

    const container = containerRef.current;
    const alive = aliveRef.current;
    const tapEffects = tapEffectsRef.current;
    const tapStream = tapStreamRef.current;
    const longStream = longStreamRef.current;
    const processedTapSet = processedTapSetRef.current;
    const processedTapQueue = processedTapQueueRef.current;

    (async () => {
      const textures = await loadEffectTextures();
      const app = new Application();
      await app.init({
        width: GAME_CONFIG.CANVAS.WIDTH,
        height: GAME_CONFIG.CANVAS.HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
        preserveDrawingBuffer: true,
      });

      if (!mounted) {
        try { app.destroy(true); } catch {/* ignore */ }
        return;
      }

      onPixiReady?.(app.canvas);
      texturesRef.current = textures;

      appRef.current = app;
      if (containerRef.current) containerRef.current.appendChild(app.canvas);
      initReadyRef.current = true;

      const judgeLayer = new Container();
      app.stage.addChild(judgeLayer);
      judgeLayerRef.current = judgeLayer;

      tickerFn = () => {
        const now = performance.now();
        const currentEffects = effectsRef.current || [];

        // ✅ maxFPS는 runtime 값으로 유지 (props 변경 반영)
        app.ticker.maxFPS = (lowEffectRef.current ? 30 : (fpsLimitRef.current || 60));

        // ✅ comboText 최신값 반영
        if (!showComboTextRef.current && comboTextRef.current) {
          app.stage.removeChild(comboTextRef.current.container);
          comboTextRef.current.destroy();
          comboTextRef.current = null;
        }
        if (comboTextRef.current) {
          comboTextRef.current.update(now);
          if (comboTextRef.current.dead) {
            app.stage.removeChild(comboTextRef.current.container);
            comboTextRef.current.destroy();
            comboTextRef.current = null;
          }
        }

        // ✅ presentLongKeys: 재사용(Set.clear) + pulse 처리와 1-pass로 합치기
        const presentLongKeys = presentLongKeysRef.current;
        presentLongKeys.clear();

        for (let i = 0; i < currentEffects.length; i++) {
          const effect = currentEffects[i];
          if (!effect || effect.type !== 'long') continue;

          const key = makeLongKey(effect);
          if (!key) continue;

          presentLongKeys.add(key);

          const lastPulse = longPulseRef.current.get(key) ?? 0;
          if (now - lastPulse < LONG_PULSE_INTERVAL_MS) continue;

          longPulseRef.current.set(key, now);

          const stream = longStreamRef.current.get(key);
          if (stream) stream.reset(now);
        }

        // JudgeText 업데이트
        judgeTextsRef.current = judgeTextsRef.current.filter((inst) => {
          inst.update(now);
          if (inst.dead) {
            judgeLayerRef.current.removeChild(inst.container);
            inst.destroy();
            return false;
          }
          return true;
        });

        // ✅ Map 순회 중 delete 방지(죽은 키를 모아서 처리)
        const deadKeys = [];
        alive.forEach((inst, key) => {
          if (presentLongKeys.has(key)) {
            inst.lastSeen = now;
          } else {
            const lastSeen = inst.lastSeen ?? now;
            if (!inst.ending && now - lastSeen > LONG_MISSING_GRACE_MS) {
              inst.startEnd(now);
            }
          }

          inst.update(now);

          if (inst.dead) {
            deadKeys.push(key);
          }
        });

        for (let i = 0; i < deadKeys.length; i++) {
          const key = deadKeys[i];
          const inst = alive.get(key);
          if (inst) {
            app.stage.removeChild(inst.container);
            inst.destroy();
            alive.delete(key);
          }
          const stream = longStream.get(key);
          if (stream) {
            app.stage.removeChild(stream.container);
            stream.destroy();
            longStream.delete(key);
          }
        }

        // tap effects update
        tapEffectsRef.current = tapEffectsRef.current.filter((inst) => {
          if (inst.dead) return false;
          inst.update(now);
          if (inst.dead) {
            app.stage.removeChild(inst.container);
            inst.destroy();
            return false;
          }
          return true;
        });

        // lane stream update
        tapStream.forEach((inst, lane) => {
          inst.update(now);
          if (inst.dead) {
            app.stage.removeChild(inst.container);
            inst.destroy();
            tapStream.delete(lane);
          }
        });

        longStream.forEach((inst) => {
          inst.update(now);
        });

        // ✅ TAP dedupe 메모리 상한 적용 (무한 증가 방지)
        // (실제 추가는 아래 effects 처리 useEffect에서 수행하므로, 여기서는 안전장치로만 유지)
        while (processedTapQueue.length > TAP_KEY_MAX) {
          const old = processedTapQueue.shift();
          if (old != null) processedTapSet.delete(old);
        }
      };

      app.ticker.maxFPS = (lowEffectRef.current ? 30 : (fpsLimitRef.current || 60));
      app.ticker.add(tickerFn);
    })();

    return () => {
      mounted = false;
      initReadyRef.current = false;

      const app = appRef.current;
      if (app && tickerFn) {
        try { app.ticker.remove(tickerFn); } catch {/* ignore */ }
      }

      alive.forEach((inst) => { try { inst.destroy(); } catch {/* ignore */} });
      alive.clear();

      tapEffects.forEach((inst) => { try { inst.destroy(); } catch {/* ignore */} });
      tapEffects.length = 0;

      tapStream.forEach((inst) => { try { inst.destroy(); } catch {/* ignore */} });
      tapStream.clear();

      longStream.forEach((inst) => { try { inst.destroy(); } catch {/* ignore */} });
      longStream.clear();

      processedTapSet.clear();
      processedTapQueue.length = 0;

      longPulseRef.current.clear();
      presentLongKeysRef.current.clear();
      judgeTextsRef.current.forEach((inst) => { try { inst.destroy(); } catch {/* ignore */} });
      judgeTextsRef.current.length = 0;
      consumedEffectIdsRef.current.clear();
      judgeClearedThisBatchRef.current = false;

      if (comboTextRef.current) {
        try { comboTextRef.current.destroy(); } catch {/* ignore */ }
        comboTextRef.current = null;
      }

      if (app) {
        try {
          app.ticker.stop();
          app.stage.removeChildren();
          app.destroy(true);
        } catch {/* ignore */ }
      }

      appRef.current = null;
      texturesRef.current = null;

      if (container) container.innerHTML = '';
    };
  }, []); // ✅ Pixi 앱은 1회 생성 유지

  useEffect(() => {
    const app = appRef.current;
    const textures = texturesRef.current;
    if (!initReadyRef.current || !app || !textures) return;

    judgeClearedThisBatchRef.current = false;

    const { HIT_LINE_Y } = GAME_CONFIG.CANVAS;
    const now = performance.now();

    (effects || []).forEach((effect) => {
      if (effect?.id && consumedEffectIdsRef.current.has(effect.id)) return;

      const lane = effect?.type === 'judge' ? null : effect?.lane;
      if (effect?.type !== 'judge' && (lane == null || lane < 0)) return;

      // ================= 판정 텍스트 =================
      if (effect.type === 'judge') {
        if (!showJudgeTextRef.current) {
          if (effect.id) consumedEffectIdsRef.current.add(effect.id);
          return;
        }

        if (!judgeClearedThisBatchRef.current) {
          judgeTextsRef.current.forEach((old) => {
            judgeLayerRef.current.removeChild(old.container);
            old.destroy();
          });
          judgeTextsRef.current.length = 0;
          judgeClearedThisBatchRef.current = true;
        }

        const inst = new JudgmentText({ text: effect.judgement });
        inst.container.x = GAME_CONFIG.CANVAS.WIDTH / 2;
        inst.container.y = GAME_CONFIG.CANVAS.HEIGHT * 0.65;
        inst.container.rotation = 0;
        inst.container.scale.set(1, 1);
        inst.container.skew.set(0, 0);

        judgeLayerRef.current.addChild(inst.container);
        judgeTextsRef.current.push(inst);

        if (showComboTextRef.current && effect.combo && effect.combo > 1) {
          if (comboTextRef.current) {
            judgeLayerRef.current.removeChild(comboTextRef.current.container);
            comboTextRef.current.destroy();
          }
          const comboInst = new ComboText({ combo: effect.combo });
          comboInst.container.x = inst.container.x;
          judgeLayerRef.current.addChild(comboInst.container);
          comboTextRef.current = comboInst;
        }

        if (effect.id) consumedEffectIdsRef.current.add(effect.id);
        return;
      }

      // ================= tap / long 공통 =================
      const laneLeft = getLaneLeftX(lane);
      const laneRight = getLaneRightX(lane);
      const x = applyPerspective((laneLeft + laneRight) / 2, HIT_LINE_Y);
      const streamWidthPx = Math.abs(laneRight - laneLeft);

      // ================= TAP =================
      if (effect.type === 'tap') {
        if (!showHitEffectRef.current) {
          if (effect.id) consumedEffectIdsRef.current.add(effect.id);
          return;
        }

        const tapKey = makeTapKey(effect);
        if (tapKey) {
          if (processedTapSetRef.current.has(tapKey)) return;

          processedTapSetRef.current.add(tapKey);
          processedTapQueueRef.current.push(tapKey);

          // ✅ 상한 유지(무한 증가 방지)
          while (processedTapQueueRef.current.length > TAP_KEY_MAX) {
            const old = processedTapQueueRef.current.shift();
            if (old != null) processedTapSetRef.current.delete(old);
          }
        }

        const inst = new LightEffect({ textures, type: 'tap' });
        inst.container.x = x;
        inst.container.y = HIT_LINE_Y;
        app.stage.addChild(inst.container);
        tapEffectsRef.current.push(inst);

        if (effect.id) consumedEffectIdsRef.current.add(effect.id);
      }

      // ================= LONG =================
      if (effect.type === 'long') {
        if (!showHitEffectRef.current) {
          if (effect.id) consumedEffectIdsRef.current.add(effect.id);
          return;
        }

        const key = makeLongKey(effect);
        if (!key) return;

        if (!aliveRef.current.has(key)) {
          const inst = new LightEffect({
            textures,
            type: 'long',
            startTime: now,
          });
          inst.container.x = x;
          inst.container.y = HIT_LINE_Y;
          inst.lastSeen = now;

          app.stage.addChild(inst.container);
          aliveRef.current.set(key, inst);

          const stream = new LaneStreamEffect({
            texture: textures.laneStream,
            laneWidth: streamWidthPx,
          });
          stream.container.x = x;
          stream.container.y = HIT_LINE_Y;

          app.stage.addChild(stream.container);
          longStreamRef.current.set(key, stream);
        }

        if (effect.id) consumedEffectIdsRef.current.add(effect.id);
      }
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
        zIndex: 20,
      }}
    />
  );
}
