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


export default function PixiNotes({ notes, currentTime, speed, selectedNoteIds, draggingPreviewRef, tapNoteColor, longNoteColor, fpsLimit = 60, onReady }) {
    const appRef = useRef(null);
    const readyRef = useRef(false);
    const speedRef = useRef(speed);
    const onReadyRef = useRef(onReady);
    const containerRef = useRef(null);
    const notesRef = useRef(notes);
    const timeRef = useRef(currentTime);
    const selectedRef = useRef(selectedNoteIds);
    const tapColorRef = useRef(tapNoteColor);
    const longColorRef = useRef(longNoteColor);

    useEffect(() => {
        const app = appRef.current;
        if (!app) return;
        app.ticker.maxFPS = 60;
    }, [fpsLimit]);

    useEffect(() => {
        tapColorRef.current = tapNoteColor;
    }, [tapNoteColor]);

    useEffect(() => {
        longColorRef.current = longNoteColor;
    }, [longNoteColor]);

    useEffect(() => { notesRef.current = notes; }, [notes]);
    useEffect(() => { timeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { selectedRef.current = selectedNoteIds; }, [selectedNoteIds]);
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
            app.ticker.maxFPS = 0;
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
                const nowTime = timeRef.current; // audio.currentTime 기준으로 부드럽게
                syncNotes(app.stage, textures, nowNotes, nowTime, speedRef.current, selectedRef.current, draggingPreviewRef, tapColorRef.current, longColorRef.current);
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
    }, [draggingPreviewRef]);

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

function syncNotes(stage, textures, notes, currentTime, speed, selectedNoteIds, draggingPreviewRef, tapNoteColor, longNoteColor) {
    const sprites = spritesRefSingleton;
    longFadeStartMap.clear();
    const { NOTE_HEIGHT, HIT_LINE_Y, HEIGHT: CANVAS_HEIGHT } = GAME_CONFIG.CANVAS;
    const SPEED = speed;
    const visibleIds = new Set();

    notes.forEach(note => {

        const baseId = note.id;
        const preview = draggingPreviewRef?.current?.get(baseId);
        const renderNote = preview ? { ...note, ...preview } : note;

        if (renderNote.spawnTime != null && currentTime < renderNote.spawnTime) {
            return;
        }

        const renderTime =
            renderNote.spawnTime != null
                ? Math.max(currentTime, renderNote.spawnTime)
                : currentTime;

        // ================= LONG NOTE =================
        if (renderNote.type === 'long') {
            const start = renderNote.timing;
            const end = renderNote.endTime;

            const BASE_SEG_LEN = NOTE_HEIGHT * 0.6;
            const STEP_TIME = 40;

            const left = getLaneLeftX(renderNote.lane);
            const right = getLaneRightX(renderNote.lane);
            const noteId = renderNote.id;
            const isSelected = selectedNoteIds?.has(noteId);

            const centerX = (left + right) / 2;
            const WIDTH_SCALE = 1.0;
            const adjLeft = centerX + (left - centerX) * WIDTH_SCALE;
            const adjRight = centerX + (right - centerX) * WIDTH_SCALE;

            if (renderNote.holding && !longFadeStartMap.has(noteId)) {
                longFadeStartMap.set(noteId, currentTime);
            }

            const fadeStartTime = longFadeStartMap.get(noteId);
            const FADE_PX_PER_MS = GAME_CONFIG.SPEED * 0.02;
            const FADE_RANGE_PX = 90;

            if (fadeStartTime != null) {
                const elapsed = currentTime - fadeStartTime;
                const cutY = HIT_LINE_Y - elapsed * FADE_PX_PER_MS;
                if (cutY < -50) return;
            }

            let t = start;
            let index = 0;

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
                    const dist = cutY - bottomY;
                    if (dist < FADE_RANGE_PX) {
                        const tt = Math.max(0, Math.min(1, dist / FADE_RANGE_PX));
                        fadeAlpha = tt;
                    }
                }

                if (y < -50) break;

                const nextT = Math.min(t + STEP_TIME, end);
                const OVERLAP_PX = 1;
                const rawNextY = HIT_LINE_Y - (nextT - renderTime) * SPEED + OVERLAP_PX;
                const nextY = Math.round(rawNextY);

                if (bottomY <= nextY) {
                    t = nextT;
                    index++;
                    continue;
                }

                const EDGE_HIDE_PX = 1;

                if (y > CANVAS_HEIGHT + 100) {
                    t = nextT;
                    index++;
                    continue;
                }

                const segIndex = index;
                const id = `long-${renderNote.id}-${segIndex}`;
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

                sprite.tint = isSelected ? 0x00ffff : longNoteColor;
                const baseAlpha = renderNote.holding ? 0.9 : 0.8;
                sprite.alpha = (isSelected ? 1.0 : baseAlpha) * fadeAlpha;

                if (fadeStartTime != null && fadeAlpha <= 0.02) {
                    releaseSprite(sprite);
                    sprites.delete(id);
                    t = nextT;
                    index++;
                    continue;
                }

                // outline
                const outlineId = `${id}-outline`;
                const OUTLINE_ACTIVE_RANGE = 240;

                if (renderNote.holding && bottomY > HIT_LINE_Y - OUTLINE_ACTIVE_RANGE) {
                    visibleIds.add(outlineId);

                    let outline = sprites.get(outlineId);
                    if (!outline) {
                        outline = acquireLongOutlineSprite();
                        outline.visible = true;
                        stage.addChildAt(outline, 0);
                        sprites.set(outlineId, outline);
                    }

                    const OUTLINE_PX = 5;
                    const OUTLINE_OVERLAP_PX = 3.0;
                    const CAP_PX = OUTLINE_PX + 0.1;
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

                    outline.tint = longNoteColor;
                    outline.alpha = renderNote.holding ? 0.2 : fadeAlpha;
                }

                t = nextT;
            }

            return;
        }

        // ================= TAP NOTE =================
        if (renderNote.hit) return;

        const renderTiming = renderNote.timing;
        const y = HIT_LINE_Y - (renderTiming - currentTime) * SPEED;
        if (y < -NOTE_HEIGHT * 2 || y > CANVAS_HEIGHT + 100) return;

        const id = `tap-${renderNote.id}`;
        visibleIds.add(id);
        const isSelected = selectedNoteIds?.has(renderNote.id);

        let sprite = sprites.get(id);
        if (!sprite) {
            sprite = acquireTapSprite(textures);
            sprite.visible = true;
            stage.addChild(sprite);
            sprites.set(id, sprite);
        }

        const left = getLaneLeftX(renderNote.lane);
        const right = getLaneRightX(renderNote.lane);
        const centerX = (left + right) / 2;

        const sel = isSelected ? 1.18 : 1.0;
        const adjLeft = centerX + (left - centerX) * sel;
        const adjRight = centerX + (right - centerX) * sel;

        const scale = getPerspectiveScale(y);
        const h = NOTE_HEIGHT * scale * sel;
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

        sprite.tint = isSelected ? 0xffe600 : tapNoteColor;
        sprite.alpha = isSelected ? 1.0 : 0.85;
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

function acquireTapSprite() {
    const sprite = tapPool.pop() || createMesh(Texture.WHITE, 'tap');
    sprite.texture = Texture.WHITE;
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