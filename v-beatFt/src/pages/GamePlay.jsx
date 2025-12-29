// src/pages/GamePlay.jsx
import { useState, useEffect, useRef } from 'react';
import GameCanvas from '../components/Game/GameCanvas';
import { InputHandler } from '../engine/InputHandler';
import { NoteCalculator } from '../engine/NoteCalculator';
import { GAME_CONFIG } from '../constants/GameConfig';
import PixiEffects from '../components/Game/PixiEffects';

export default function GamePlay() {
  // =========================
  // 기존 상태
  // =========================
  const [notes, setNotes] = useState([
    // (fallback 더미) songId 로드되면 AI 노트로 덮어씀
    { lane: 3, timing: 500, type: 'tap', hit: false },
    { lane: 3, timing: 700, type: 'tap', hit: false },
    { lane: 3, timing: 900, type: 'tap', hit: false },
  ]);

  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [effects, setEffects] = useState([]);

  const notesRef = useRef(notes);
  const currentTimeRef = useRef(0);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // =========================
  // ✅ UI 최소: Play 버튼만 / songId는 URL에서
  // =========================
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // ✅ ✅ ✅ songId는 URL 쿼리로 받음: /game/play?songId=7
  const getSongIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('songId') || '1'; // 기본값 1
  };

  // ✅ diff는 URL 쿼리로 받음: /game/play?songId=7&diff=hard
  const getDiffFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('diff') || 'unknown';
  };

  const [songId, setSongId] = useState(getSongIdFromUrl());
  const [diff, setDiff] = useState(getDiffFromUrl());

  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const normalizeNotesFromApi = (payload) => {
    const list = Array.isArray(payload) ? payload : (payload?.notes || payload?.data || []);
    if (!Array.isArray(list)) return [];

    return list.map((n) => {
      const tSec = Number(n.time ?? n.noteTime ?? n.note_time ?? n.timing ?? 0);
      const lane = Number(n.lane ?? n.laneIndex ?? n.key ?? 0);
      const type = (n.type ?? n.noteType ?? 'tap') === 'long' ? 'long' : 'tap';

      const startMs = Math.round(tSec * 1000);
      const endSec = n.endTime ?? n.end_time ?? n.end ?? null;
      const endMs = endSec != null ? Math.round(Number(endSec) * 1000) : undefined;

      if (type === 'long') {
        return {
          lane,
          timing: startMs,
          endTime: endMs ?? startMs + 1000,
          type: 'long',
          hit: false,
          holding: false,
        };
      }
      return { lane, timing: startMs, type: 'tap', hit: false };
    });
  };

  const resetGame = () => {
    setIsPlaying(false);
    setScore(0);
    setCombo(0);
    setEffects([]);
    setPressedKeys(new Set());
    setCurrentTime(0);
    currentTimeRef.current = 0;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const loadSongById = async (sidRaw) => {
    const sid = String(sidRaw).trim();
    if (!sid) return false;

    // 오디오 URL 세팅
    setAudioUrl(`${API_BASE}/api/ai/song/${sid}/audio`);

    // 노트 로드
    const notesRes = await fetch(`${API_BASE}/api/ai/song/${sid}/notes`);
    if (!notesRes.ok) return false;

    const notesJson = await notesRes.json();
    const mapped = normalizeNotesFromApi(notesJson);
    if (!mapped.length) return false;

    resetGame();
    setNotes(mapped);
    return true;
  };

  // ✅ 주소창 songId/diff가 바뀌면 자동으로 로드되게(popstate 대응)
  useEffect(() => {
    const onPopState = () => {
      const sid = getSongIdFromUrl();
      const d = getDiffFromUrl();
      setSongId(sid);
      setDiff(d);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // ✅ songId가 바뀌면 노트/오디오 자동 로드
  useEffect(() => {
    loadSongById(songId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;

    try {
      // audioUrl이 아직 없으면 먼저 로드
      if (!audioUrl) {
        const ok = await loadSongById(songId);
        if (!ok) return;
      }

      if (el.paused) {
        await el.play();
        setIsPlaying(true);
      } else {
        el.pause();
        setIsPlaying(false);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  // 오디오 시간 -> 게임 시간(ms) 동기화
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => {
      const ms = Math.floor((el.currentTime || 0) * 1000);
      currentTimeRef.current = ms;
      setCurrentTime(ms);
    };
    const onEnded = () => setIsPlaying(false);

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  // =========================
  // 기존 로직 (최대한 유지)
  // =========================
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const newTime = prev + 16;
        currentTimeRef.current = newTime;

        setNotes((prevNotes) =>
          prevNotes.map((note) => {
            if (note.type === 'long' && note.holding && newTime > note.endTime) {
              setEffects((prevEffects) =>
                prevEffects.filter(
                  (e) => !(e.type === 'long' && e.noteId === `${note.timing}-${note.lane}`)
                )
              );
              return { ...note, holding: false, released: true };
            }
            return note;
          })
        );

        return newTime;
      });
    }, 16);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = currentTimeRef.current;

      setNotes((prev) => {
        let missOccurred = false;

        const newNotes = prev.map((note) => {
          if (note.hit) return note;

          if (note.type === 'long') {
            if (!note.holding && now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              return { ...note, hit: true, judgement: 'MISS' };
            }
            if (note.holding && now > note.endTime + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              setEffects((prevEffects) =>
                prevEffects.filter(
                  (e) => !(e.type === 'long' && e.noteId === `${note.timing}-${note.lane}`)
                )
              );
              return { ...note, hit: true, holding: false, released: true, judgement: 'MISS' };
            }
          } else {
            if (now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              setEffects((prevEff) => [
                ...prevEff,
                { type: 'judge', lane: note.lane, judgement: 'MISS', id: crypto.randomUUID() },
              ]);
              return { ...note, hit: true, judgement: 'MISS' };
            }
          }
          return note;
        });

        if (missOccurred) setCombo(0);
        return missOccurred ? newNotes : prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const holdingNotes = notesRef.current.filter((n) => n.holding && !n.released);
      if (holdingNotes.length > 0) {
        const bonus = holdingNotes.length * GAME_CONFIG.SCORE.LONG_BONUS;
        setScore((prev) => prev + bonus);
        setCombo((prev) => {
          const next = prev + 1;
          setEffects((eff) => [
            ...eff,
            { type: 'judge', judgement: '', combo: next, id: crypto.randomUUID() },
          ]);
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyPress = (laneIndex) => {
      setPressedKeys((prev) => new Set(prev).add(laneIndex));

      const result = NoteCalculator.judgeNote(
        laneIndex,
        currentTimeRef.current,
        notesRef.current
      );
      if (!result) return;

      if (result.judgement === 'MISS') {
        setCombo(0);
        setEffects((eff) => [
          ...eff,
          { type: 'judge', lane: laneIndex, judgement: 'MISS', combo: 0, id: crypto.randomUUID() },
        ]);
        return;
      }

      if (result.note.type === 'long') {
        setNotes((prev) =>
          prev.map((note) => (note === result.note ? { ...note, holding: true, hit: true } : note))
        );

        setCombo((prev) => {
          const next = prev + 1;

          setEffects((prevEff) =>
            prevEff.some(
              (e) => e.type === 'long' && e.noteId === `${result.note.timing}-${result.note.lane}`
            )
              ? prevEff
              : [
                  ...prevEff,
                  { type: 'long', lane: laneIndex, noteId: `${result.note.timing}-${result.note.lane}` },
                  {
                    type: 'judge',
                    lane: laneIndex,
                    judgement: result.judgement,
                    combo: next,
                    id: crypto.randomUUID(),
                  },
                ]
          );

          return next;
        });
      } else {
        setNotes((prev) =>
          prev.map((note) => (note === result.note ? { ...note, hit: true } : note))
        );

        setCombo((prev) => {
          const next = prev + 1;
          setEffects((eff) => [
            ...eff,
            { type: 'tap', lane: laneIndex, id: crypto.randomUUID() },
            { type: 'judge', lane: laneIndex, judgement: result.judgement, combo: next, id: crypto.randomUUID() },
          ]);
          return next;
        });
      }

      const addScore = GAME_CONFIG.SCORE[result.judgement];
      setScore((prev) => prev + addScore);
    };

    const handleKeyRelease = (laneIndex) => {
      setPressedKeys((prev) => {
        const newSet = new Set(prev);
        newSet.delete(laneIndex);
        return newSet;
      });

      const result = NoteCalculator.judgeNoteRelease(
        laneIndex,
        currentTimeRef.current,
        notesRef.current
      );

      if (result) {
        setNotes((prev) =>
          prev.map((note) =>
            note === result.note ? { ...note, hit: true, holding: false, released: true } : note
          )
        );

        setEffects((prev) =>
          prev.filter(
            (e) => !(e.type === 'long' && e.noteId === `${result.note.timing}-${result.note.lane}`)
          )
        );

        setScore((prev) => prev + GAME_CONFIG.SCORE[result.judgement]);
      } else {
        setNotes((prev) =>
          prev.map((note) => {
            if (note.lane === laneIndex && note.holding) {
              setCombo(0);
              setEffects((prevEffects) =>
                prevEffects.filter(
                  (e) => !(e.type === 'long' && e.noteId === `${note.timing}-${note.lane}`)
                )
              );
              return { ...note, holding: false, released: true };
            }
            return note;
          })
        );
      }
    };

    const inputHandler = new InputHandler(handleKeyPress, handleKeyRelease);
    return () => inputHandler.destroy();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#000',
        minHeight: '100vh',
        justifyContent: 'center',
      }}
    >
      {/* ✅ UI는 Play 버튼 + 난이도 표시만 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
        <button
          onClick={togglePlay}
          style={{ padding: '8px 14px', cursor: 'pointer' }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <div style={{ color: '#aaa', fontSize: '14px' }}>
          Difficulty: <b style={{ color: '#fff' }}>{String(diff).toUpperCase()}</b>
        </div>
      </div>

      {/* ✅ 빈 문자열 src 경고 방지 */}
      <audio ref={audioRef} src={audioUrl || null} />

      <div
        style={{
          color: 'white',
          fontSize: '24px',
          marginBottom: '20px',
          display: 'flex',
          gap: '40px',
        }}
      >
        <div>점수: {score}</div>
        <div>콤보: {combo}</div>
      </div>

      <div
        style={{
          position: 'relative',
          width: GAME_CONFIG.CANVAS.WIDTH + 'px',
          height: GAME_CONFIG.CANVAS.HEIGHT + 'px',
        }}
      >
        <GameCanvas
          notes={notes.filter((n) => {
            if (!n.hit || (n.type === 'long' && n.holding)) return true;
            if (n.type === 'long') {
              const t = (GAME_CONFIG.CANVAS.HEIGHT + 100) / GAME_CONFIG.SPEED;
              return currentTime < n.endTime + t;
            }
            return false;
          })}
          currentTime={currentTime}
          pressedKeys={pressedKeys}
        />

        <PixiEffects effects={effects} />
      </div>
    </div>
  );
}
