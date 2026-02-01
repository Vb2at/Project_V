// src/pages/editor/NoteEditor.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { stopMenuBgm } from '../../components/engine/SFXManager';
import GameSession from '../../components/engine/GameSession';
import Header from '../../components/Common/Header';
import LeftSidebar from '../gameplay/LeftSidebar';
import RightSidebar from '../gameplay/RightSidebar';
import Background from '../../components/Common/Background';
const VISIBILITY_TEXT = {
    PRIVATE: '비공개',
    UNLISTED: '링크 공개',
    PUBLIC: '전체 공개',
    PENDING: '심사중',
    BLOCKED: '차단됨',
};

const HEADER_HEIGHT = 64;
const SIDE_W = 300;

export default function NoteEditor() {
    const { songId } = useParams();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const isEditorReturn = params.get('mode') === 'editorTest';
    const [song, setSong] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [seekTime, setSeekTime] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [undoStack, setUndoStack] = useState([]);
    const [notes, setNotes] = useState([]);
    const [tool, setTool] = useState('tap');
    const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
    const navigate = useNavigate();
    const timelineRef = useRef(null);
    const [isScrubbing, setIsScrubbing] = useState(false);

    // ✅ 반드시 return 전에 있어야 함
    const visibility = VISIBILITY_TEXT[song?.visibility] || '알 수 없음';

    const pushUndo = (prevNotes) => {
        setUndoStack((stack) => [...stack, structuredClone(prevNotes)]);
    };

    const handleSeek = (e) => {
        const t = getTimeFromClientX(e.clientX);
        setSeekTime(t);
    };

    const handleTimelineMouseDown = (e) => {
        const t = getTimeFromClientX(e.clientX);
        setSeekTime(t);
        setIsScrubbing(true);
    };

    const handleTimelineMouseMove = (e) => {
        if (!isScrubbing) return;
        const t = getTimeFromClientX(e.clientX);
        setSeekTime(t);
    };

    const handleTimelineMouseUp = () => {
        setIsScrubbing(false);
    };

    const handleGameState = useCallback(({ currentTime, duration }) => {
        setCurrentTime(currentTime);
        setDuration(duration);
    }, []);

    const getTimeFromClientX = (clientX) => {
        if (!timelineRef.current || !duration) return currentTime;

        const rect = timelineRef.current.getBoundingClientRect();
        const ratio = (clientX - rect.left) / rect.width;

        return Math.max(0, Math.min(duration, ratio * duration));
    };

    const formatTime = (ms = 0) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return `${m}:${s}`;
    };
    const handleSave = async () => {
        const payload = notes.map(n => ({
            lane: n.lane,
            type: n.type,
            time: (n.timing ?? 0) / 1000,
            endTime: n.type === 'long' ? (n.endTime ?? n.timing) / 1000 : null,
        }));

        try {
            const res = await fetch(`/api/songs/${songId}/notes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('save failed');

            alert('저장 완료');
            navigate(`/song/${songId}/edit`, { replace: true });
        } catch {
            alert('저장 실패');
        }
    };

    useEffect(() => {
        stopMenuBgm();
    }, []);

    useEffect(() => {
        window.addEventListener('mouseup', handleTimelineMouseUp);
        return () => window.removeEventListener('mouseup', handleTimelineMouseUp);
    }, []);

    useEffect(() => {
        if (!songId) return;
        if (isEditorReturn) return; // ✅ editorTest 복귀면 서버 로드 절대 금지

        (async () => {
            try {
                const songRes = await fetch(`/api/songs/${songId}`);
                const songJson = await songRes.json();

                const notesRes = await fetch(`/api/songs/${songId}/notes`);
                const notesJson = await notesRes.json();


                setSong(songJson.data ?? songJson.song ?? songJson);

                const rawNotes = notesJson?.data ?? notesJson?.notes ?? notesJson;

                const mappedNotes = Array.isArray(rawNotes)
                    ? rawNotes.map((n) => {
                        const id = crypto.randomUUID();
                        const lane = Number(n.lane ?? n.laneIndex ?? n.key ?? 0);
                        const type = (n.type ?? n.noteType ?? 'tap') === 'long' ? 'long' : 'tap';
                        const tSec = Number(n.time ?? n.noteTime ?? n.note_time ?? n.timing ?? 0);
                        const timing = Math.round(tSec * 1000);
                        const endSec = n.endTime ?? n.end_time ?? n.end ?? null;
                        const endTime = endSec != null ? Math.round(Number(endSec) * 1000) : undefined;

                        if (type === 'long') {
                            return { id, lane, timing, endTime: endTime ?? timing + 1000, type: 'long', hit: false, holding: false, released: false };
                        }
                        return { id, lane, timing, type: 'tap', hit: false };
                    })
                    : [];

                setNotes(mappedNotes);
            } catch (e) {
                console.error('editor load failed', e);
            }
        })();
    }, [songId, isEditorReturn]);


    // ===== editorTest 복귀 시 상태 복원 =====
    useEffect(() => {
        const raw = sessionStorage.getItem('EDITOR_STATE_SNAPSHOT');
        if (!raw) return;

        try {
            const snap = JSON.parse(raw);

            if (Array.isArray(snap.notes)) {
                setNotes(snap.notes.map(n => ({ ...n, id: n.id ?? crypto.randomUUID() })));
            }
            if (typeof snap.currentTime === 'number') setSeekTime(snap.currentTime);
            if (snap.tool) setTool(snap.tool);

        } catch (e) {
            console.error('editor snapshot restore failed', e);
        }

        sessionStorage.removeItem('EDITOR_STATE_SNAPSHOT');
        sessionStorage.removeItem('EDITOR_RETURNING');
    }, []);
    return (
        <div style={page}>
            {/* ===== Background (최하단) ===== */}
            <div style={bgWrap}>
                <Background />
            </div>

            {/* ===== Header ===== */}
            <Header />

            {/* ===== Sidebars (기존 그대로) ===== */}
            <LeftSidebar
                songId={songId}
                diff={song?.diff}
                currentTime={currentTime}
                duration={duration}
            />
            <RightSidebar />

            {/* ===== 왼쪽 사이드바: 난이도 아래 공개여부 오버레이 ===== */}
            <div style={leftVisibilityWrap}>
                공개: <b>{visibility}</b>
            </div>

            {/* ===== Game Stage (viewport 기준 fixed) ===== */}
            <div style={gameStage}>
                <div style={gameAnchor}>
                    {/* 레인 마스크 (GamePlay 동일) */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: -5,
                            pointerEvents: 'none',
                            background: `
                linear-gradient(
                  #000000 0%,
                  #000000 60%,
                  #000000 85%,
                  #000000 100%
                )
              `,
                            clipPath: 'polygon(40% 8%, 60% 8%, 100% 100%, 0% 100%)',
                        }}
                    />

                    <GameSession
                        mode="edit"
                        isPlaying={isPlaying}
                        seekTime={seekTime}
                        tool={tool}
                        notes={notes}
                        setNotes={setNotes}
                        pushUndo={pushUndo}
                        selectedNoteIds={selectedNoteIds}
                        setSelectedNoteIds={setSelectedNoteIds}
                        songId={songId}
                        onState={handleGameState}
                    />
                </div>
            </div>

            {/* ===== Editor Right Panel ===== */}
            <div style={editorRightWrap}>
                <div style={panelTitle}>EDITOR</div>

                <div style={panelSection}>
                    <div style={panelLabel}>Time</div>
                    <div style={panelValue}>

                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                    <div
                        ref={timelineRef}
                        style={{ ...barTrack, position: 'relative', cursor: 'pointer' }}
                        onMouseDown={handleTimelineMouseDown}
                        onMouseMove={handleTimelineMouseMove}
                        onClick={handleSeek}
                    >
                        <div
                            style={{
                                ...barFill,
                                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                            }}
                        />

                        {/* 현재 위치 핸들 */}
                        <div
                            style={{
                                ...barHandle,
                                left: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                            }}
                        />
                    </div>
                    <div style={panelSub}>
                        <span>Remain</span>
                        <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
                    </div>
                </div>

                <div style={panelSection}>
                    <div style={panelLabel}>Playback</div>

                    <button
                        style={primaryBtn}
                        onClick={() => setIsPlaying((p) => !p)}
                    >
                        {isPlaying ? 'Pause' : 'Play'}
                    </button>
                </div>

                <div style={panelSection}>
                    <div style={panelLabel}>Actions</div>
                    <button style={primaryBtn} onClick={handleSave}>저장</button>
                    <div style={{ height: 10 }} />
                    <button
                        style={secondaryBtn}
                        onClick={() => {
                            setUndoStack((stack) => {
                                if (stack.length === 0) return stack;
                                const last = stack[stack.length - 1];
                                setNotes(last);
                                return stack.slice(0, -1);
                            });
                        }}
                    >
                        되돌리기
                    </button>
                    <div style={{ height: 10 }} />
                    <button
                        style={secondaryBtn}
                        onClick={() => {
                            // ▶ 복귀 플래그
                            sessionStorage.setItem('EDITOR_RETURNING', '1');

                            // ▶ 상태 스냅샷
                            sessionStorage.setItem(
                                'EDITOR_STATE_SNAPSHOT',
                                JSON.stringify({ notes, currentTime, tool })
                            );

                            // ▶ 테스트 노트 전달
                            sessionStorage.setItem(
                                'EDITOR_TEST_NOTES',
                                JSON.stringify(notes)
                            );

                            navigate(`/game/play?songId=${songId}&mode=editorTest`);
                        }}
                    >
                        테스트 플레이
                    </button>
                </div>

                <div style={panelSection}>
                    <div style={panelLabel}>Tools</div>
                    <div style={toolGrid}>
                        <button
                            style={{ ...toolBtn, ...(tool === 'tap' ? toolBtnActive : {}) }}
                            onClick={() => setTool('tap')}
                        >
                            TAP
                        </button>

                        <button
                            style={{ ...toolBtn, ...(tool === 'long' ? toolBtnActive : {}) }}
                            onClick={() => setTool('long')}
                        >
                            LONG
                        </button>

                        <button
                            style={{ ...toolBtn, ...(tool === 'select' ? toolBtnActive : {}) }}
                            onClick={() => setTool('select')}
                        >
                            SELECT
                        </button>

                        <button
                            style={{ ...toolBtn, ...(tool === 'delete' ? toolBtnActive : {}) }}
                            onClick={() => setTool('delete')}
                        >
                            DELETE
                        </button>
                    </div>

                    <div style={{ height: 10 }} />
                </div>
            </div>
        </div>
    );
}

/* ================= layout ================= */

const page = {
    minHeight: '100vh',
    position: 'relative',
};

const bgWrap = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
};

const gameStage = {
    position: 'fixed',
    inset: 0,
    zIndex: 20,
    pointerEvents: 'none',
};

const gameAnchor = {
    position: 'absolute',
    top: `calc(46% + ${HEADER_HEIGHT / 2}px)`,
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'auto',
};

const editorRightWrap = {
    position: 'fixed',
    top: HEADER_HEIGHT,
    right: 0,
    width: `${SIDE_W}px`,
    height: `calc(100vh - ${HEADER_HEIGHT}px)`,
    zIndex: 60,
    padding: '18px 14px',
    boxSizing: 'border-box',
     background: 'rgba(10,20,30,0.45)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
};

/* ===== 왼쪽 사이드바 안쪽 공개여부 위치 ===== */

const leftVisibilityWrap = {
    position: 'fixed',
    top: HEADER_HEIGHT + 24 + 270 + 6 + 14 + 14,
    left: 16,
    width: SIDE_W - 32,
    zIndex: 80,
    fontSize: 13,
    opacity: 0.9,
    color: '#e6faff',
    pointerEvents: 'none',
    textShadow: '0 0 6px rgba(0,255,255,0.18)',
};

/* ================= panel ================= */

const panelTitle = {
    fontSize: 14,
    letterSpacing: '0.18em',
    fontWeight: 800,
    color: '#c8feff',
    marginBottom: 14,
};

const panelSection = {
    padding: '12px',
    borderRadius: 10,
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.08)',
    marginBottom: 12,
};

const panelLabel = { fontSize: 12, opacity: 0.7, marginBottom: 6 };
const panelValue = { fontSize: 14, fontWeight: 700, marginBottom: 10 };
const panelSub = { display: 'flex', justifyContent: 'space-between', fontSize: 12 };

const barTrack = {
    height: 6,
    borderRadius: 4,
    background: 'rgba(255,255,255,0.15)',
    overflow: 'visible',
};

const barFill = { height: '100%', background: 'linear-gradient(90deg,#00ffff,#00ff88)' };

const primaryBtn = {
    width: '100%',
    padding: '10px',
    borderRadius: 10,
    border: '1px solid rgba(0,255,255,0.55)',
    background: 'rgba(0,255,255,0.10)',
    color: '#bfffff',
    fontWeight: 800,
    cursor: 'pointer',
};

const secondaryBtn = {
    width: '100%',
    padding: '10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e6faff',
    fontWeight: 700,
    cursor: 'pointer',
};


const toolBtn = {
    flex: 1,
    padding: '10px 0',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e6faff',
    fontWeight: 800,
    cursor: 'pointer',
};
const toolBtnActive = {
    border: '1px solid rgba(0,255,255,0.8)',
    background: 'rgba(0,255,255,0.18)',
    boxShadow: '0 0 10px rgba(0,255,255,0.35)',
};
const barHandle = {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#00ffff',
    boxShadow: '0 0 8px rgba(0,255,255,0.8)',
    pointerEvents: 'none',
};
const toolGrid = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
};