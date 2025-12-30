// src/components/engine/GameSession.jsx
import { useState, useEffect, useRef } from 'react';
import GameCanvas from './canvas/GameCanvas';
import PixiEffects from './effects/PixiEffects';
import { InputHandler } from '../../core/input/InputHandler';
import { NoteCalculator } from '../../core/judge/NoteCalculator';
import { GAME_CONFIG } from '../../constants/GameConfig';
import { playTapNormal, playTapAccent } from './SFXManager';

export default function GameSession() {

  const [notes, setNotes] = useState([
    // (fallback 더미) songId 로드되면 AI 노트로 덮어씀
    { lane: 3, timing: 500, type: 'tap', hit: false },
    { lane: 3, timing: 700, type: 'tap', hit: false },
    { lane: 3, timing: 900, type: 'tap', hit: false },
    { lane: 3, timing: 1100, type: 'tap', hit: false },
    { lane: 3, timing: 1300, type: 'tap', hit: false },
    { lane: 3, timing: 1500, type: 'tap', hit: false },
    { lane: 3, timing: 1700, type: 'tap', hit: false },

    // 2-4초: 롱노트 + 탭노트 혼합
    { lane: 1, timing: 2000, endTime: 3000, type: 'long', hit: false, holding: false },
    { lane: 5, timing: 2000, endTime: 3000, type: 'long', hit: false, holding: false },
    { lane: 3, timing: 2500, type: 'tap', hit: false },
    { lane: 0, timing: 3200, type: 'tap', hit: false },
    { lane: 6, timing: 3400, type: 'tap', hit: false },

    // 4-6초: 연속 탭노트
    { lane: 0, timing: 4000, type: 'tap', hit: false },
    { lane: 1, timing: 4200, type: 'tap', hit: false },
    { lane: 2, timing: 4400, type: 'tap', hit: false },
    { lane: 3, timing: 4600, type: 'tap', hit: false },
    { lane: 4, timing: 4800, type: 'tap', hit: false },
    { lane: 5, timing: 5000, type: 'tap', hit: false },
    { lane: 6, timing: 5200, type: 'tap', hit: false },
    { lane: 3, timing: 5400, type: 'tap', hit: false },
    { lane: 1, timing: 5600, type: 'tap', hit: false },
    { lane: 5, timing: 5800, type: 'tap', hit: false },

    // 6-8초: 동시 롱노트
    { lane: 0, timing: 6000, endTime: 7500, type: 'long', hit: false, holding: false },
    { lane: 6, timing: 6000, endTime: 7500, type: 'long', hit: false, holding: false },
    { lane: 3, timing: 6500, type: 'tap', hit: false },
    { lane: 3, timing: 7000, type: 'tap', hit: false },

    // 8-10초: 마무리 패턴
    { lane: 2, timing: 8000, type: 'tap', hit: false },
    { lane: 4, timing: 8200, type: 'tap', hit: false },
    { lane: 1, timing: 8400, type: 'tap', hit: false },
    { lane: 5, timing: 8600, type: 'tap', hit: false },
    { lane: 3, timing: 8800, endTime: 9500, type: 'long', hit: false, holding: false },
    { lane: 0, timing: 9600, type: 'tap', hit: false },
    { lane: 6, timing: 9800, type: 'tap', hit: false },
    { lane: 3, timing: 10000, type: 'tap', hit: false },
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
  // UI 최소: Play 버튼만 / songId는 URL에서
  // =========================
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  //songId는 URL 쿼리로 받음: /game/play?songId=7
  const getSongIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('songId') || '1'; // 기본값 1
  };

  //diff는 URL 쿼리로 받음: /game/play?songId=7&diff=hard
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

  // 주소창 songId/diff가 바뀌면 자동으로 로드되게(popstate 대응)
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

  // songId가 바뀌면 노트/오디오 자동 로드
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
      if (pressedKeys.has(laneIndex)) return;
      setPressedKeys(prev => new Set(prev).add(laneIndex));

      const ACCENT_LANES = new Set([1, 3, 5]);

      if (ACCENT_LANES.has(laneIndex)) {
        playTapAccent();
      } else {
        playTapNormal();
      }

      const result = NoteCalculator.judgeNote(
        laneIndex,
        currentTimeRef.current,
        notesRef.current
      );
      if (!result || !result.note) return;

      const note = result.note;
      const noteId = `${note.timing}-${note.lane}`;

      if (result.judgement === 'MISS') {
        setCombo(0);
        setEffects(eff => [...eff, {
          type: 'judge', lane: laneIndex, judgement: 'MISS', combo: 0, id: crypto.randomUUID()
        }]);
        return;
      }

      // ★ 롱 시작: 딱 1회
      if (note.type === 'long' && !note.holding) {
        setNotes(prev =>
          prev.map(n => n === note ? { ...n, hit: true, holding: true } : n)
        );

        setCombo(prev => {
          const next = prev + 1;
          setEffects(pe =>
            pe.some(e => e.type === 'long' && e.noteId === noteId)
              ? pe
              : [...pe,
              { type: 'long', lane: laneIndex, noteId },
              { type: 'judge', lane: laneIndex, judgement: result.judgement, combo: next, id: crypto.randomUUID() }
              ]
          );
          return next;
        });

        return; // ★ 중요
      }

      // ★ 탭
      setNotes(prev => prev.map(n => n === note ? { ...n, hit: true } : n));

      setCombo(prev => {
        const next = prev + 1;
        setEffects(eff => [...eff,
        { type: 'tap', lane: laneIndex, id: crypto.randomUUID() },
        { type: 'judge', lane: laneIndex, judgement: result.judgement, combo: next, id: crypto.randomUUID() }
        ]);
        return next;
      });

      setScore(prev => prev + GAME_CONFIG.SCORE[result.judgement]);
    };

    const handleKeyRelease = (laneIndex) => {
      setPressedKeys(prev => {
        const s = new Set(prev); s.delete(laneIndex); return s;
      });

      const result = NoteCalculator.judgeNoteRelease(
        laneIndex, currentTimeRef.current, notesRef.current
      );

      if (result && result.note) {
        const note = result.note;
        const noteId = `${note.timing}-${note.lane}`;

        setNotes(prev =>
          prev.map(n => n === note ? { ...n, hit: true, holding: false, released: true } : n)
        );
        setEffects(prev => prev.filter(e => !(e.type === 'long' && e.noteId === noteId)));
        setScore(prev => prev + GAME_CONFIG.SCORE[result.judgement]);
      } else {
        setNotes(prev => prev.map(n => {
          if (n.lane === laneIndex && n.holding) {
            setCombo(0);
            setEffects(eff => eff.filter(e => !(e.type === 'long' && e.noteId === `${n.timing}-${n.lane}`)));
            return { ...n, holding: false, released: true };
          }
          return n;
        }));
      }
    };

    const ih = new InputHandler(handleKeyPress, handleKeyRelease);
    return () => ih.destroy();
  }, [pressedKeys]);


  return (
    <div
      style={{
        paddingTop: '64px', // ✅ 헤더 높이만큼
        width: GAME_CONFIG.CANVAS.WIDTH + 'px',
        height: GAME_CONFIG.CANVAS.HEIGHT + 'px',
        position: 'relative',
        background: '#000',
      }}
    >
      {/* ✅ UI는 Play 버튼 + 난이도 표시만 */}
      <div style={{ display: 'flex', height: '1px', alignItems: 'center', gap: '5px', marginBottom: '12px' }}>
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