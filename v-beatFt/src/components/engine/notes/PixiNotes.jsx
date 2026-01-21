import { useEffect, useRef } from 'react';
import { Application, Mesh, Geometry, Texture } from 'pixi.js';
import { GAME_CONFIG } from '../../../constants/GameConfig';
import { loadNoteTextures } from './noteTextures';
import { applyPerspectiveX, getPerspectiveScale } from './perspective';

const spritesRefSingleton = new Map();
const tapPool = [];
const longPool = [];
const longOutlinePool = [];
const longFadeStartMap = new Map(); // noteId → fade 시작 시점

export default function PixiNotes({ notes, currentTime, speed, selectedNoteId, onReady }) {
    const appRef = useRef(null);
    const readyRef = useRef(false);
    const speedRef = useRef(speed);
    const onReadyRef = useRef(onReady);
    const containerRef = useRef(null);
    const notesRef = useRef(notes);
    const timeRef = useRef(currentTime);
    const selectedRef = useRef(selectedNoteId);

    useEffect(() => { notesRef.current = notes; }, [notes]);
    useEffect(() => { timeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { selectedRef.current = selectedNoteId; }, [selectedNoteId]);
    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
        let mounted = true;
        let tickerFn = null;
        const containerEl = containerRef.current;
        (async () => {
            const textures = await loadNoteTextures();
            if (!mounted) return;

            const app = new Application();
            await app.init({
                width: GAME_CONFIG.CANVAS.WIDTH,
                height: GAME_CONFIG.CANVAS.HEIGHT,
                backgroundAlpha: 0,
                antialias: true,
            });

            if (!mounted) {
                try { app.destroy(true); } catch (e) { void e; }
                return;
            }

            appRef.current = app;

            if (containerRef.current) {
                containerRef.current.appendChild(app.canvas);
            }

            readyRef.current = true;
            onReadyRef.current?.();
            tickerFn = () => {
                const nowNotes = notesRef.current || [];
                const nowTime = timeRef.current;
                syncNotes(app.stage, textures, nowNotes, nowTime, speedRef.current, selectedRef.current);
            };

            app.ticker.add(tickerFn);
        })();

        return () => {
            mounted = false;
            readyRef.current = false;
            const app = appRef.current;
            if (app && tickerFn) app.ticker.remove(tickerFn);

            spritesRefSingleton.forEach(sprite => {
                try { sprite.destroy({ children: true }); } catch (e) { void e; }
            });
            spritesRefSingleton.clear();

            if (app) {
                app.stage.removeChildren();
                app.destroy(true);
            }
            appRef.current = null;
            if (containerEl) containerEl.innerHTML = '';
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0, left: 0,
                width: GAME_CONFIG.CANVAS.WIDTH,
                height: GAME_CONFIG.CANVAS.HEIGHT,
                pointerEvents: 'none',
                zIndex: 5,
            }}
        />
    );
}

function syncNotes(stage, textures, notes, currentTime, speed, selectedNoteId) {
    const sprites = spritesRefSingleton;
    const { NOTE_HEIGHT, HIT_LINE_Y, HEIGHT: CANVAS_HEIGHT } = GAME_CONFIG.CANVAS;
    const SPEED = speed;
    const visibleIds = new Set();

    notes.forEach(note => {

        if (note.spawnTime != null && currentTime < note.spawnTime) {
            return;
        }
        const renderTime =
            note.spawnTime != null ? Math.max(currentTime, note.spawnTime) : currentTime;
        // ---------------- 1. LONG NOTE (판정선 통과 로직) ----------------
        if (note.type === 'long') {
            const start = note.timing;
            const end = note.endTime;

            const BASE_SEG_LEN = NOTE_HEIGHT * 0.6;
            const STEP_TIME = BASE_SEG_LEN / SPEED;

            const left = getLaneLeftX(note.lane);
            const right = getLaneRightX(note.lane);
            const centerX = (left + right) / 2;
            const WIDTH_SCALE = 1.0; //v 폭
            const adjLeft = centerX + (left - centerX) * WIDTH_SCALE;
            const adjRight = centerX + (right - centerX) * WIDTH_SCALE;

            // t의 시작점을currentTime으로 제한하지 않고 원본 start부터 계산하되,
            // 화면 하단 밖(HIT_LINE_Y + 200)에 있는 마디는 스킵합니다.
            let t = start;
            let index = 0;

            const noteId = `${note.timing}-${note.lane}`;
            const isSelected = selectedNoteId === noteId;

            // holding 시작 시점 기록
            if (note.holding && !longFadeStartMap.has(noteId)) {
                longFadeStartMap.set(noteId, currentTime);
            }

            const fadeStartTime = longFadeStartMap.get(noteId);
            const FADE_PX_PER_MS = SPEED * 0.02; // 페이드 속도 (튜닝 포인트)
            const FADE_RANGE_PX = 90;

            if (fadeStartTime != null) {
                const elapsed = currentTime - fadeStartTime;
                const cutY = HIT_LINE_Y - elapsed * FADE_PX_PER_MS;
                if (cutY < -50) return;   // 더 이상 렌더하지 않음
            }

            while (t < end) {
                const y = Math.round(HIT_LINE_Y - (t - renderTime) * SPEED);
                let bottomY = y;

                if (fadeStartTime != null) {
                    const elapsed = currentTime - fadeStartTime;
                    const cutY = HIT_LINE_Y - elapsed * FADE_PX_PER_MS;
                    bottomY = Math.min(y, cutY);
                }

                let fadeAlpha = 1.0;

                if (fadeStartTime != null) {
                    const elapsed = currentTime - fadeStartTime;
                    const cutY = HIT_LINE_Y - elapsed * FADE_PX_PER_MS;

                    // 세그먼트가 페이드 영역에 들어오면 점점 투명
                    const dist = cutY - bottomY; // 0 근처가 경계
                    if (dist < FADE_RANGE_PX) {
                        const t = Math.max(0, Math.min(1, dist / FADE_RANGE_PX));
                        fadeAlpha = t; // 1 → 0 자연 감소
                    }
                }

                // 화면 상단 밖
                if (y < -50) break;

                // 원근 보정용 스케일 (최소값 제한으로 에러 방지)
                const nextT = Math.min(t + STEP_TIME, end);
                const OVERLAP_PX = 1; // 충분한 오버랩
                const rawNextY = HIT_LINE_Y - (nextT - renderTime) * SPEED + OVERLAP_PX;
                const nextY = Math.round(rawNextY); // 서브픽셀 경계 제거

                if (bottomY <= nextY) {
                    t = nextT;
                    index++;
                    continue;
                }

                const EDGE_HIDE_PX = 1; // 경계선 숨김용

                // 화면 하단 밖 (이미 지나간 마디들 스킵)
                if (y > CANVAS_HEIGHT + 100) {
                    t = nextT;
                    index++;
                    continue;
                }

                const segIndex = index;

                const id = `long-${note.timing}-${note.lane}-${segIndex}`;
                visibleIds.add(id);
                index++;

                let sprite = sprites.get(id);
                if (!sprite) {
                    sprite = acquireLongSprite();
                    sprite.visible = true;
                    stage.addChild(sprite);
                    sprites.set(id, sprite);
                }

                const tlx = applyPerspectiveX(adjLeft, nextY);
                const trx = applyPerspectiveX(adjRight, nextY);
                const blx = applyPerspectiveX(adjLeft, y);
                const brx = applyPerspectiveX(adjRight, y);

                const buffer = sprite.geometry.getBuffer('aPosition');
                const verts = buffer.data;
                verts[0] = tlx; verts[1] = nextY - EDGE_HIDE_PX;
                verts[2] = trx; verts[3] = nextY - EDGE_HIDE_PX;
                verts[4] = blx; verts[5] = bottomY;
                verts[6] = brx; verts[7] = bottomY;
                buffer.update();

                if (!sprite.__tinted) {
                    sprite.tint = isSelected ? 0x00ffff : 0xff0059;
                    sprite.__tinted = true;
                }
                sprite.tint = isSelected ? 0x00ffff : 0xff0059;
                const baseAlpha = note.holding ? 0.9 : 0.8;
                sprite.alpha = (isSelected ? 1.0 : baseAlpha) * fadeAlpha;
                //완전히 투명해진 세그먼트는 즉시 제거
                if (fadeStartTime != null && fadeAlpha <= 0.02) {
                    releaseSprite(sprite);
                    sprites.delete(id);
                    t = nextT;
                    index++;
                    continue;
                }

                // ---------------- outline (holding 시만) ----------------
                const outlineId = `${id}-outline`;

                const OUTLINE_ACTIVE_RANGE = 240; // 판정선 기준 표시 범위(px)

                if (
                    note.holding &&
                    bottomY > HIT_LINE_Y - OUTLINE_ACTIVE_RANGE
                ) {

                    visibleIds.add(outlineId);

                    let outline = sprites.get(outlineId);
                    if (!outline) {
                        outline = acquireLongOutlineSprite();
                        outline.visible = true;
                        stage.addChildAt(outline, 0);    // 바디 뒤
                        sprites.set(outlineId, outline);
                    }

                    const OUTLINE_PX = 5; // 외곽선 두께 (튜닝 포인트)

                    const OUTLINE_OVERLAP_PX = 3.0;   // 세그먼트 연결 겹침
                    const CAP_PX = OUTLINE_PX + 0.1;                // 하단 캡 닫기
                    const bottomCapY = bottomY + CAP_PX;

                    const topY = nextY - OUTLINE_OVERLAP_PX - EDGE_HIDE_PX;
                    const botY = bottomCapY;

                    const otlx = applyPerspectiveX(adjLeft - OUTLINE_PX, topY);
                    const otrx = applyPerspectiveX(adjRight + OUTLINE_PX, topY);
                    const oblx = applyPerspectiveX(adjLeft - OUTLINE_PX, botY);
                    const obrx = applyPerspectiveX(adjRight + OUTLINE_PX, botY);

                    const obuf = outline.geometry.getBuffer('aPosition');
                    const overts = obuf.data;
                    overts[0] = otlx; overts[1] = topY;
                    overts[2] = otrx; overts[3] = topY;
                    overts[4] = oblx; overts[5] = botY;
                    overts[6] = obrx; overts[7] = botY;
                    obuf.update();

                    outline.tint = 0x50ff00;  // 외곽선 색
                    outline.alpha = note.holding ? 0.2 : fadeAlpha;
                }

                t = nextT;
            }
            return;
        }

        // ---------------- 2. TAP NOTE (기존 유지) ----------------
        if (note.hit) return;

        const renderTiming = note.timing;

        const y = HIT_LINE_Y - (renderTiming - currentTime) * SPEED;
        if (y < -NOTE_HEIGHT * 2 || y > CANVAS_HEIGHT + 100) return

        const id = `${note.timing}-${note.lane}`;
        visibleIds.add(id);
        const isSelected = selectedNoteId === id;

        let sprite = sprites.get(id);
        if (!sprite) {
            sprite = acquireTapSprite(textures);
            sprite.visible = true;
            stage.addChild(sprite);
            sprites.set(id, sprite);
        }

        const left = getLaneLeftX(note.lane);
        const right = getLaneRightX(note.lane);
        const centerX = (left + right) / 2;
        const adjLeft = centerX + (left - centerX) * 1.2;
        const adjRight = centerX + (right - centerX) * 1.2;

        const scale = getPerspectiveScale(y);
        const h = NOTE_HEIGHT * scale;
        const halfH = h / 2;

        const tlx = applyPerspectiveX(adjLeft, y - halfH);
        const trx = applyPerspectiveX(adjRight, y - halfH);
        const blx = applyPerspectiveX(adjLeft, y + halfH);
        const brx = applyPerspectiveX(adjRight, y + halfH);

        const buffer = sprite.geometry.getBuffer('aPosition');
        const verts = buffer.data;
        verts[0] = tlx; verts[1] = y - halfH;
        verts[2] = trx; verts[3] = y - halfH;
        verts[4] = blx; verts[5] = y + halfH;
        verts[6] = brx; verts[7] = y + halfH;
        buffer.update();

        sprite.tint = isSelected ? 0xffe600 : 0xffffff; // 노란 형광
        sprite.alpha = isSelected ? 1.0 : 0.85;
        const s = isSelected ? 1.18 : 1.0;
        sprite.scale.set(s, s);
    });

    sprites.forEach((sprite, id) => {
        if (!visibleIds.has(id)) {
            releaseSprite(sprite);
            sprites.delete(id);
        }
    });
}

function getLaneLeftX(lane) {
    return GAME_CONFIG.LANE_WIDTHS.slice(0, lane).reduce((a, b) => a + b, 0);
}

function getLaneRightX(lane) {
    return getLaneLeftX(lane) + GAME_CONFIG.LANE_WIDTHS[lane];
}

function createMesh(texture, type) {
    const geometry = new Geometry({
        attributes: {
            aPosition: { buffer: new Float32Array(8), size: 2 },
            aUV: { buffer: new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), size: 2 },
        },
        indexBuffer: [0, 1, 2, 2, 1, 3],
    });
    const mesh = new Mesh({ geometry, texture });
    mesh.__type = type;
    return mesh;
}

function acquireTapSprite(textures) {
    const sprite = tapPool.pop() || createMesh(textures.tap, 'tap');
    sprite.texture = textures.tap;
    return sprite;
}

function acquireLongSprite() {
    const sprite = longPool.pop() || createMesh(Texture.WHITE, 'long');
    sprite.texture = Texture.WHITE;
    return sprite;
}

function releaseSprite(sprite) {
    sprite.visible = false;
    sprite.removeFromParent();
    if (sprite.__type === 'tap') tapPool.push(sprite);
    else if (sprite.__type === 'long') longPool.push(sprite);
    else if (sprite.__type === 'long-outline') longOutlinePool.push(sprite);
}
function acquireLongOutlineSprite() {
    const sprite = longOutlinePool.pop() || createMesh(Texture.WHITE, 'long-outline');
    sprite.texture = Texture.WHITE;
    return sprite;
}