import { useEffect, useRef } from 'react';
import { Application, Mesh, Geometry, Texture } from 'pixi.js';
import { GAME_CONFIG } from '../../../constants/GameConfig';
import { applyPerspectiveX } from "../notes/perspective";

/* =========================
   🔧 키 빔 이펙트 튜닝 파라미터
   ========================= */

// 전체 수명(ms)
const LIFE_MS = 280;

// 빔 길이(px)
const BEAM_HEIGHT = 1200;

// 레인 대비 폭 비율 (항상 고정)
const WIDTH_RATIO = 0.9;

// 시작 / 성장 스케일(Y)
const START_SCALE_Y = 0.15;
const GROW_SCALE_Y = 0.45;
const MAX_SCALE_Y = 0.6;

// 최대 밝기
const MAX_ALPHA = 0.9;

const HIT_Y_OFFSET = 0;

const MAX_SLOPE_RAD = 2 * Math.PI / 180;   // 최대 기울기 (2도)

/* ========================= */

let beamTexture = null; // 그라데이션 텍스처 캐시

export default function KeyEffectLayer({ pressedKeys, onReady }) {
    const containerRef = useRef(null);
    const appRef = useRef(null);

    const lastKeysRef = useRef(new Set());
    const pressedKeysRef = useRef(new Set());
    const effectsRef = useRef([]); // { mesh, bornAt, baseX, laneWidth }

    useEffect(() => {
        pressedKeysRef.current = pressedKeys ?? new Set();
    }, [pressedKeys]);

    useEffect(() => {
        let mounted = true;
        let tickerFn = null;

        (async () => {
            const app = new Application();
            await app.init({
                width: GAME_CONFIG.CANVAS.WIDTH,
                height: GAME_CONFIG.CANVAS.HEIGHT,
                backgroundAlpha: 0,
                antialias: true,
            });

            if (!mounted) {
                try { app.destroy(true); } catch { }
                return;
            }

            appRef.current = app;
            if (containerRef.current) {
                containerRef.current.appendChild(app.canvas);
            }

            // ✅ 최초 1회만 텍스처 생성
            if (!beamTexture) {
                beamTexture = createBeamTexture();
            }

            tickerFn = () => {
                const prev = lastKeysRef.current;
                const next = pressedKeysRef.current;
                const now = performance.now();

                // 신규 키 입력 감지
                next.forEach((lane) => {
                    if (!prev.has(lane)) {
                        spawnKeyBeam(app, lane, now);
                    }
                });
                lastKeysRef.current = new Set(next);

                /* ===== 애니메이션 ===== */
                effectsRef.current.forEach((e) => {
                    const t = (now - e.bornAt) / LIFE_MS;
                    const p = Math.min(Math.max(t, 0), 1);
                    const eased = 1 - Math.pow(1 - p, 2);

                    const y = GAME_CONFIG.CANVAS.HIT_LINE_Y + (HIT_Y_OFFSET ?? 0);
                    const baseX = e.baseX;
                    const laneWidth = e.laneWidth;

                    const left = baseX - laneWidth / 2;
                    const right = baseX + laneWidth / 2;

                    const scaleY = Math.min(
                        MAX_SCALE_Y,
                        START_SCALE_Y + eased * GROW_SCALE_Y
                    );

                    const topY = y - BEAM_HEIGHT * scaleY;

                    const xLT = applyPerspectiveX(left, topY);
                    const xRT = applyPerspectiveX(right, topY);
                    const xRB = applyPerspectiveX(right, y);
                    const xLB = applyPerspectiveX(left, y);

                    const buf = e.mesh.geometry.getBuffer('aPosition');
                    buf.data[0] = xLT; buf.data[1] = topY;
                    buf.data[2] = xRT; buf.data[3] = topY;
                    buf.data[4] = xRB; buf.data[5] = y;
                    buf.data[6] = xLB; buf.data[7] = y;
                    buf.update();

                    e.mesh.alpha = MAX_ALPHA * (1 - eased);
                });

                /* ===== 수명 관리 ===== */
                effectsRef.current = effectsRef.current.filter((e) => {
                    const alive = now - e.bornAt < LIFE_MS;
                    if (!alive) {
                        app.stage.removeChild(e.mesh);
                        e.mesh.destroy();
                    }
                    return alive;
                });
            };

            app.ticker.add(tickerFn);
            onReady?.();
        })();

        return () => {
            mounted = false;
            const app = appRef.current;

            if (app && tickerFn) {
                try { app.ticker.remove(tickerFn); } catch { }
            }

            effectsRef.current.forEach(e => {
                try { e.mesh.destroy(); } catch { }
            });
            effectsRef.current = [];

            if (app) {
                try {
                    app.stage.removeChildren();
                    app.destroy(true);
                } catch { }
            }

            appRef.current = null;
            if (containerRef.current) containerRef.current.innerHTML = '';
        };
    }, []);

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

    /* =========================
       빔 생성
       ========================= */

    function spawnKeyBeam(app, lane, now) {
        const baseX = getLaneCenterX(lane);
        const y = GAME_CONFIG.CANVAS.HIT_LINE_Y + (HIT_Y_OFFSET ?? 0);
        const laneWidth = GAME_CONFIG.LANE_WIDTHS[lane];

        const left = baseX - laneWidth / 2;
        const right = baseX + laneWidth / 2;

        // 초기 높이 (짧게)
        const topY = y - BEAM_HEIGHT * START_SCALE_Y;

        // 사다리꼴 4점에 원근 적용
        const xLT = applyPerspectiveX(left, topY);
        const xRT = applyPerspectiveX(right, topY);
        const xRB = applyPerspectiveX(right, y);
        const xLB = applyPerspectiveX(left, y);

        // Mesh Geometry 생성
        const geometry = new Geometry({
            attributes: {
                aPosition: [xLT, topY, xRT, topY, xRB, y, xLB, y],
                aUV: [0, 0, 1, 0, 1, 1, 0, 1],
            },
            indexBuffer: [0, 1, 2, 0, 2, 3],
        });

        const mesh = new Mesh({ geometry, texture: beamTexture });
        mesh.blendMode = 'add';
        mesh.alpha = MAX_ALPHA;

        app.stage.addChild(mesh);

        effectsRef.current.push({
            mesh,
            bornAt: now,
            baseX,
            laneWidth,
        });
    }

    function getLaneCenterX(lane) {
        const widths = GAME_CONFIG.LANE_WIDTHS;

        const gap =
            GAME_CONFIG.LANE_GAP ??
            GAME_CONFIG.CANVAS?.LANE_GAP ??
            0;

        const totalW = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);

        const startX =
            GAME_CONFIG.LANE_START_X ??
            GAME_CONFIG.CANVAS?.LANE_START_X ??
            ((GAME_CONFIG.CANVAS.WIDTH - totalW) / 2);

        const left = startX + widths
            .slice(0, lane)
            .reduce((a, b) => a + b, 0) + gap * lane;

        return left + widths[lane] / 2;
    }
}

/* =========================
   🔧 세로 알파 그라데이션 텍스처 생성
   ========================= */

function createBeamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;

    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
    grad.addColorStop(0.0, 'rgba(180, 240, 255, 0.95)'); // 아래 밝음
    grad.addColorStop(0.4, 'rgba(140, 220, 255, 0.6)');
    grad.addColorStop(0.75, 'rgba(120, 210, 255, 0.25)');
    grad.addColorStop(1.0, 'rgba(120, 210, 255, 0.0)'); // 위 투명

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return Texture.from(canvas);
}
