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
const TAP_DEDUPE_WINDOW_MS = 80;

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
  const lastTapCreatedAtByLaneRef = useRef(new Map());
  const judgeTextsRef = useRef([]);
  const judgeClearedThisBatchRef = useRef(false);
  const consumedEffectIdsRef = useRef(new Set());
  const comboTextRef = useRef(null);;
  const lastTickRef = useRef(0);
  const lowEffectRef = useRef(lowEffect);

  useEffect(() => {
    effectsRef.current = effects || [];
  }, [effects]);

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
    const lastTapCreatedAtByLane = lastTapCreatedAtByLaneRef.current;


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
      window.__pixiEffectTextures = textures;
      window.__pixiStreamTexture = textures.laneStream;

      appRef.current = app;
      if (containerRef.current) containerRef.current.appendChild(app.canvas);
      initReadyRef.current = true;

      const judgeLayer = new Container();
      app.stage.addChild(judgeLayer);
      judgeLayerRef.current = judgeLayer;

      tickerFn = () => {

        const now = performance.now();

        const currentEffects = effectsRef.current || [];

        if (!showComboText && comboTextRef.current) {
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

        for (const effect of currentEffects) {
          if (effect.type !== 'long') continue;
          const key = makeLongKey(effect);
          if (!key) continue;

          const lastPulse = longPulseRef.current.get(key) ?? 0;
          if (now - lastPulse < LONG_PULSE_INTERVAL_MS) continue;

          longPulseRef.current.set(key, now);

          const lane = effect.lane;
          if (lane == null) continue;

          if (longStreamRef.current.has(key)) {
            longStreamRef.current.get(key).reset(now);
          }
        }
        judgeTextsRef.current = judgeTextsRef.current.filter(inst => {
          inst.update(now);
          if (inst.dead) {
            judgeLayerRef.current.removeChild(inst.container);
            inst.destroy();
            return false;
          }
          return true;
        });

        const presentLongKeys = new Set();
        for (const e of currentEffects) {
          if (e.type !== 'long') continue;
          const k = makeLongKey(e);
          if (k) presentLongKeys.add(k);
        }

        aliveRef.current.forEach((inst, key) => {
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
            app.stage.removeChild(inst.container);
            inst.destroy();
            aliveRef.current.delete(key);

            const stream = longStreamRef.current.get(key);
            if (stream) {
              app.stage.removeChild(stream.container);
              stream.destroy();
              longStreamRef.current.delete(key);
            }
          }
        });

        tapEffectsRef.current = tapEffectsRef.current.filter(inst => {
          if (inst.dead) return false;
          inst.update(now);
          if (inst.dead) {
            app.stage.removeChild(inst.container);
            inst.destroy();
            return false;
          }
          return true;
        });

        tapStreamRef.current.forEach((inst, lane) => {
          inst.update(now);
          if (inst.dead) {
            app.stage.removeChild(inst.container);
            inst.destroy();
            tapStreamRef.current.delete(lane);
          }
        });

        longStreamRef.current.forEach((inst) => {
          inst.update(now);
        });
      };
      app.ticker.maxFPS = fpsLimit || 60;
      app.ticker.add(tickerFn);
    })();

    return () => {
      mounted = false;
      initReadyRef.current = false;
      const app = appRef.current;
      if (app && tickerFn) {
        try { app.ticker.remove(tickerFn); } catch {/* ignore */ }
      }
      alive.forEach(inst => { try { inst.destroy(); } catch { /* ignore */ } });
      alive.clear();
      tapEffects.forEach(inst => { try { inst.destroy(); } catch { /* ignore */ } });
      tapStream.forEach(inst => { try { inst.destroy(); } catch { /* ignore */ } });
      tapStream.clear();
      longStream.forEach(inst => { try { inst.destroy(); } catch { /* ignore */ } });
      longStream.clear();
      processedTapSet.clear();  // 여기서 사용
      processedTapQueue.length = 0;  // 여기서 사용
      lastTapCreatedAtByLane.clear();  // 여기서 사용
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
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const textures = texturesRef.current;
    if (!initReadyRef.current || !app || !textures) return;
    judgeClearedThisBatchRef.current = false;
    const { HIT_LINE_Y } = GAME_CONFIG.CANVAS;
    const now = performance.now();

    (effects || []).forEach(effect => {
      if (effect.id && consumedEffectIdsRef.current.has(effect.id)) return;

      const lane = effect.type === 'judge' ? null : effect.lane;
      if (effect.type !== 'judge' && lane < 0) return;

      /* ================= 판정 텍스트 ================= */
      if (effect.type === 'judge') {
        if (!showJudgeText) {
          consumedEffectIdsRef.current.add(effect.id);
          return;
        }
        if (!judgeClearedThisBatchRef.current) {
          judgeTextsRef.current.forEach(old => {
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

        if (showComboText && effect.combo && effect.combo > 1) {
          if (comboTextRef.current) {
            judgeLayerRef.current.removeChild(comboTextRef.current.container);
            comboTextRef.current.destroy();
          }
          const comboInst = new ComboText({ combo: effect.combo });
          comboInst.container.x = inst.container.x;
          judgeLayerRef.current.addChild(comboInst.container);
          comboTextRef.current = comboInst;
        }

        consumedEffectIdsRef.current.add(effect.id);
        return;
      }

      /* ================= tap / long 공통 ================= */
      const laneLeft = getLaneLeftX(lane);
      const laneRight = getLaneRightX(lane);

      const x = applyPerspective((laneLeft + laneRight) / 2, HIT_LINE_Y);
      const streamWidthPx = Math.abs(laneRight - laneLeft);
      /* ================= TAP ================= */
      if (effect.type === 'tap') {
        if (!showHitEffect) {
          consumedEffectIdsRef.current.add(effect.id);
          return;
        }
        const tapKey = makeTapKey(effect);
        let allowTap = true;

        if (tapKey) {
          if (processedTapSetRef.current.has(tapKey)) {
            allowTap = false;
          } else {
            processedTapSetRef.current.add(tapKey);
            processedTapQueueRef.current.push(tapKey);
          }
        }

        if (!allowTap) return;

        const inst = new LightEffect({ textures, type: 'tap' });
        inst.container.x = x;
        inst.container.y = HIT_LINE_Y;
        app.stage.addChild(inst.container);
        tapEffectsRef.current.push(inst);

        consumedEffectIdsRef.current.add(effect.id);
      }

      /* ================= LONG ================= */
      if (effect.type === 'long') {
        if (!showHitEffect) {
          consumedEffectIdsRef.current.add(effect.id);
          return;
        }
        const key = makeLongKey(effect);

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

          consumedEffectIdsRef.current.add(effect.id);
        }
      }
    });
  }, [effects]);

  useEffect(() => {
    lowEffectRef.current = lowEffect;
  }, [lowEffect]);

  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    app.ticker.maxFPS = (lowEffect ? 30 : (fpsLimit || 60));
  }, [fpsLimit, lowEffect]);


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