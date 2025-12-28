// PixiEffects.jsx
import { useEffect, useRef } from 'react';
import { Application, Assets } from 'pixi.js';
import { GAME_CONFIG } from '../../constants/GameConfig';
import LightEffect from './LightEffect';
import LaneStreamEffect from './LaneStreamEffect';

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

export default function PixiEffects({ effects }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const texturesRef = useRef(null);
  const initReadyRef = useRef(false);
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

  useEffect(() => {
    effectsRef.current = effects || [];
  }, [effects]);

  useEffect(() => {
    let mounted = true;
    let tickerFn = null;

    (async () => {
      const textures = await loadEffectTextures();
      const app = new Application();
      await app.init({
        width: GAME_CONFIG.CANVAS.WIDTH,
        height: GAME_CONFIG.CANVAS.HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
      });

      if (!mounted) {
        try { app.destroy(true); } catch (_) { }
        return;
      }

      texturesRef.current = textures;
      appRef.current = app;
      if (containerRef.current) containerRef.current.appendChild(app.canvas);
      initReadyRef.current = true;

      tickerFn = () => {
        const now = performance.now();
        const currentEffects = effectsRef.current || [];

        for (const effect of currentEffects) {
          if (effect.type !== 'long') continue;
          const key = makeLongKey(effect);
          if (!key) continue;

          const lastPulse = longPulseRef.current.get(key) ?? 0;
          if (now - lastPulse < LONG_PULSE_INTERVAL_MS) continue;

          longPulseRef.current.set(key, now);

          const lane = effect.lane;
          if (lane == null) continue;

          const { LANE_WIDTH, HIT_LINE_Y } = GAME_CONFIG.CANVAS;
          const laneLeft = lane * LANE_WIDTH;
          const laneRight = (lane + 1) * LANE_WIDTH;
          const x = applyPerspective((laneLeft + laneRight) / 2, HIT_LINE_Y);
          
          if (longStreamRef.current.has(key)) {
            longStreamRef.current.get(key).reset(now);
          }
        }

        const presentLongKeys = new Set();
        for (const e of currentEffects) {
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

      app.ticker.add(tickerFn);
    })();

    return () => {
      mounted = false;
      initReadyRef.current = false;
      const app = appRef.current;
      if (app && tickerFn) {
        try { app.ticker.remove(tickerFn); } catch (_) { }
      }
      aliveRef.current.forEach(inst => { try { inst.destroy(); } catch (_) { } });
      aliveRef.current.clear();
      tapEffectsRef.current.forEach(inst => { try { inst.destroy(); } catch (_) { } });
      tapEffectsRef.current = [];
      tapStreamRef.current.forEach(inst => { try { inst.destroy(); } catch (_) { } });
      tapStreamRef.current.clear();
      longStreamRef.current.forEach(inst => { try { inst.destroy(); } catch (_) { } });
      longStreamRef.current.clear();
      processedTapSetRef.current.clear();
      processedTapQueueRef.current = [];
      lastTapCreatedAtByLaneRef.current.clear();
      if (app) {
        try {
          app.ticker.stop();
          app.stage.removeChildren();
          app.destroy(true);
        } catch (_) { }
      }
      appRef.current = null;
      texturesRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const textures = texturesRef.current;
    if (!initReadyRef.current || !app || !textures) return;

    const { LANE_WIDTH, HIT_LINE_Y } = GAME_CONFIG.CANVAS;
    const now = performance.now();

    (effects || []).forEach(effect => {
      const lane = effect.lane ?? -1;
      if (lane < 0) return;

      const laneLeft = lane * LANE_WIDTH;
      const laneRight = (lane + 1) * LANE_WIDTH;
      const x = applyPerspective((laneLeft + laneRight) / 2, HIT_LINE_Y);

      const leftX = applyPerspective(laneLeft, HIT_LINE_Y);
      const rightX = applyPerspective(laneRight, HIT_LINE_Y);
      const widthPx = Math.abs(rightX - leftX);

      const y0 = HIT_LINE_Y;
      const y1 = HIT_LINE_Y - 40;
      const cx0 = applyPerspective((laneLeft + laneRight) / 2, y0);
      const cx1 = applyPerspective((laneLeft + laneRight) / 2, y1);
      const angle = Math.atan2(y1 - y0, cx1 - cx0);

      if (effect.type === 'tap') {
        const tapKey = makeTapKey(effect);
        let allowTap = true;

        if (tapKey) {
          if (processedTapSetRef.current.has(tapKey)) {
            allowTap = false;
          } else {
            processedTapSetRef.current.add(tapKey);
            processedTapQueueRef.current.push(tapKey);
            while (processedTapQueueRef.current.length > TAP_KEY_MAX) {
              const old = processedTapQueueRef.current.shift();
              if (old) processedTapSetRef.current.delete(old);
            }
          }
        } else {
          const lastAt = lastTapCreatedAtByLaneRef.current.get(lane) ?? -Infinity;
          if (now - lastAt < TAP_DEDUPE_WINDOW_MS) allowTap = false;
          lastTapCreatedAtByLaneRef.current.set(lane, now);
        }

        if (allowTap) {
          const inst = new LightEffect({ textures, type: 'tap' });
          inst.container.x = x;
          inst.container.y = HIT_LINE_Y;
          app.stage.addChild(inst.container);
          tapEffectsRef.current.push(inst);

          if (tapStreamRef.current.has(lane)) {
            tapStreamRef.current.get(lane).reset(now);
          } else {
            const stream = new LaneStreamEffect({
              texture: textures.laneStream,
              laneWidth: widthPx,
            });
            stream.sprite.rotation = angle + Math.PI / 2;
            stream.container.x = x;
            stream.container.y = HIT_LINE_Y;
            app.stage.addChild(stream.container);
            tapStreamRef.current.set(lane, stream);
          }
        }
      }

      if (effect.type === 'long') {
        const key = makeLongKey(effect);
        if (key) {
          if (aliveRef.current.has(key)) {
            aliveRef.current.get(key).lastSeen = now;
          } else {
            const inst = new LightEffect({
              textures,
              type: 'long',
              duration: 800,
              startTime: now,
            });
            inst.container.x = x;
            inst.container.y = HIT_LINE_Y;
            inst.lastSeen = now;
            app.stage.addChild(inst.container);
            aliveRef.current.set(key, inst);

            if (!longStreamRef.current.has(key)) {
              const stream = new LaneStreamEffect({
                texture: textures.laneStream,
                laneWidth: widthPx,
              });
              stream.sprite.rotation = angle + Math.PI / 2;
              stream.container.x = x;
              stream.container.y = HIT_LINE_Y;
              app.stage.addChild(stream.container);
              longStreamRef.current.set(key, stream);
            }
          }
        }
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
        zIndex: 10,
      }}

    />
  );
}