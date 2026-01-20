// src/pages/editor/NoteEditor.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
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
const SIDE_W = 260;

export default function NoteEditor() {
    const { songId } = useParams();

    const [song, setSong] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [seekTime, setSeekTime] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [undoStack, setUndoStack] = useState([]);
    const [notes, setNotes] = useState([]);
    const [tool, setTool] = useState('tap');
    const navigate = useNavigate();

    // ✅ 반드시 return 전에 있어야 함
    const visibility = VISIBILITY_TEXT[song?.visibility] || '알 수 없음';

    const pushUndo = (prevNotes) => {
        setUndoStack((stack) => [...stack, structuredClone(prevNotes)]);
    };

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const t = Math.max(0, Math.min(duration, ratio * duration));
        setSeekTime(t);
    };

    const formatTime = (ms = 0) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return `${m}:${s}`;
    };
    const handleSave = async () => {
        console.log('SAVE NOTES:', notes);
        const payload = notes.map(n => ({
            lane: n.lane,
            type: n.type,
            time: (n.timing ?? 0) / 1000,
            endTime: n.type === 'long' ? (n.endTime ?? n.timing) / 1000 : null,
        }));

        try {
            const res = await fetch(`/api/songs/${songId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('save failed');

            alert('저장 완료');
        } catch (e) {
            console.error(e);
            alert('저장 실패');
        }
    };
    useEffect(() => {
        if (!songId) return;

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
                        const lane = Number(n.lane ?? n.laneIndex ?? n.key ?? 0);
                        const type = (n.type ?? n.noteType ?? 'tap') === 'long' ? 'long' : 'tap';

                        // 서버가 time(초)로 주는 케이스를 ms로 변환
                        const tSec = Number(n.time ?? n.noteTime ?? n.note_time ?? n.timing ?? 0);
                        const timing = Math.round(tSec * 1000);

                        const endSec = n.endTime ?? n.end_time ?? n.end ?? null;
                        const endTime = endSec != null ? Math.round(Number(endSec) * 1000) : undefined;

                        if (type === 'long') {
                            return {
                                lane,
                                timing,
                                endTime: endTime ?? (timing + 1000),
                                type: 'long',
                                hit: false,
                                holding: false,
                                released: false,
                            };
                        }

                        return {
                            lane,
                            timing,
                            type: 'tap',
                            hit: false,
                        };
                    })
                    : [];

                setNotes(mappedNotes);

            } catch (e) {
                console.error('editor load failed', e);
            }
        })();
    }, [songId]);

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
                        isPlaying={isPlaying}
                        mode="edit"
                        seekTime={seekTime}
                        tool={tool}
                        notes={notes}
                        setNotes={setNotes}
                        pushUndo={pushUndo}
                        songId={songId}
                        onState={({ currentTime, duration }) => {
                            setCurrentTime(currentTime);
                            setDuration(duration);
                        }}
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
                    <div style={barTrack} onClick={handleSeek}>
                        <div
                            style={{
                                ...barFill,
                                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
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
                            sessionStorage.setItem(
                                'EDITOR_TEST_NOTES',
                                JSON.stringify(notes)
                            );

                            window.location.href = `/game/play?songId=${songId}&mode=editorTest`;
                        }}
                    >
                        테스트 플레이
                    </button>
                </div>

                <div style={panelSection}>
                    <div style={panelLabel}>Tools</div>
                    <div style={toolRow}>
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
                    </div>
                    <div style={{ height: 10 }} />
                    <div style={toolRow}>
                        <button
                            style={{ ...toolBtn, ...(tool === 'delete' ? toolBtnActive : {}) }}
                            onClick={() => setTool('delete')}
                        >
                            삭제
                        </button>
                        <button style={toolBtn}>스냅</button>
                    </div>
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
    background: 'rgba(10,20,30,0.25)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(6px)',
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
    overflow: 'hidden',
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

const toolRow = { display: 'flex', gap: 10 };

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