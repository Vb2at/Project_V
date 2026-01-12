// src/components/engine/GameSession.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import GameCanvas from './canvas/GameCanvas';
import PixiEffects from './effects/PixiEffects';
import PixiNotes from './notes/PixiNotes';
import { InputHandler } from '../../core/input/InputHandler';
import { NoteCalculator } from '../../core/judge/NoteCalculator';
import { GAME_CONFIG } from '../../constants/GameConfig';
import { playTapNormal, playTapAccent } from './SFXManager';
import Visualizer from '../visualizer/Visualizer';
import KeyEffectLayer from "./effects/KeyEffectLayer";

export default function GameSession({ analyserRef, onState, paused, bgmVolume, sfxVolume, onReady, onFinish }) {
  const SAFE_SCORE = 300;
  const MISS_PENALTY = 100;
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
  const comboRef = useRef(0);
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [effects, setEffects] = useState([]);
  const passedSafeZoneRef = useRef(false);
  const readyCalledRef = useRef(false);
  const notesRef = useRef(notes);
  const currentTimeRef = useRef(0);
  const maxComboRef = useRef(0);
  const onReadyRef = useRef(onReady);
  const onFinishRef = useRef(onFinish);

  const applyMissPenalty = () => {
    setScore((s) => {
      if (s >= SAFE_SCORE) {
        return s - MISS_PENALTY;
      }
      return Math.max(0, s - MISS_PENALTY);
    });
  };
  const getComboMultiplier = (combo) => {
    if (combo >= 50) return 3;
    if (combo >= 20) return 2;
    return 1;
  };

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    if (score >= SAFE_SCORE) {
      passedSafeZoneRef.current = true;
    }
  }, [score]);

  useEffect(() => {
    if (
      passedSafeZoneRef.current &&   // 세이프존 한번이라도 넘겼고
      score <= 0 &&                  // 점수가 0이 되었고
      !finishedRef.current           // 아직 종료 안 했으면
    ) {
      finishedRef.current = true;
      audioRef.current?.pause();
      onFinishRef.current?.({
        score: 0,
        maxScore: maxScoreRef.current,
        maxCombo: maxComboRef.current,
        gameOver: true,
      });
    }
  }, [score]);

  useEffect(() => {
    maxComboRef.current = Math.max(maxComboRef.current, combo);
  }, [combo]);
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
  const speed =
    GAME_CONFIG.DIFFICULTY[diff?.toUpperCase()]?.SPEED
    ?? GAME_CONFIG.SPEED;
  useEffect(() => {
    if (typeof onState === 'function') {
      onState({
        score,
        combo,
        diff,
        currentTime: currentTimeRef.current,
        duration: audioRef.current?.duration
          ? audioRef.current.duration * 1000
          : 0,
        maxScore: maxScoreRef.current,
      });
    }
  }, [score, combo, diff, onState]);

  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const dataArrayRef = useRef(null);
  const finishedRef = useRef(false);
  const scoreRef = useRef(0);
  const maxScoreRef = useRef(1);

  const getMaxJudgementScore = () => {
    const vals = Object.values(GAME_CONFIG.SCORE).filter(
      (v) => typeof v === 'number'
    );
    return vals.length ? Math.max(...vals) : 0;
  };

  const calcMaxScore = useCallback((list) => {
    const maxJudge = getMaxJudgementScore();
    return (Array.isArray(list) ? list : []).reduce((acc, n) => {
      if (n.type === 'long') {
        const dur = Math.max(0, (n.endTime ?? n.timing) - n.timing);
        const ticks = Math.ceil(dur / 100); // 롱 보너스 100ms 기준
        return acc + (ticks * (GAME_CONFIG.SCORE.LONG_BONUS ?? 0)) + maxJudge;
      }
      return acc + maxJudge;
    }, 0);
  }, []);

  useEffect(() => {
    maxScoreRef.current = Math.max(1, calcMaxScore(notes));
  }, [notes, calcMaxScore]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    readyCalledRef.current = false;
    finishedRef.current = false;

    const handleReady = () => {
      if (readyCalledRef.current) return;
      readyCalledRef.current = true;
      onReadyRef.current?.();
    };

    const handleEnded = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      audioRef.current?.pause();
      onFinishRef.current?.({
        score: scoreRef.current,
        maxScore: maxScoreRef.current,
        maxCombo: maxComboRef.current,
        gameOver: false,
      });
    };

    audio.src = audioUrl;
    audio.currentTime = 0;

    // WebAudio Analyser 연결 (1회)
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
    }

    audio.addEventListener('canplay', handleReady, { once: true });
    audio.addEventListener('ended', handleEnded);

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { });
    }

    return () => {
      audio.removeEventListener('canplay', handleReady);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, analyserRef]);

  useEffect(() => {
    if (!paused) {
      setPressedKeys(new Set());
    }
  }, [paused]);

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
    setAudioUrl(`${API_BASE}/api/songs/${sid}/audio`);

    // 노트 로드
    const notesRes = await fetch(`${API_BASE}/api/songs/${sid}/notes`);
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused || finishedRef.current) return;

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
  }, [paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused) return;
      const now = currentTimeRef.current;
      setNotes((prev) => {
        let missOccurred = false;

        const newNotes = prev.map((note) => {
          if (note.hit) return note;

          if (note.type === 'long') {
            if (!note.holding && now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              applyMissPenalty();
              setEffects((prevEff) => [
                ...prevEff,
                { type: 'judge', lane: note.lane, judgement: 'MISS', combo: 0, id: crypto.randomUUID() },
              ]);
              return { ...note, hit: true, judgement: 'MISS' };
            }
            if (note.holding && now > note.endTime + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              applyMissPenalty();
              setEffects((prevEffects) =>
                prevEffects.filter(
                  (e) => !(e.type === 'long' && e.noteId === `${note.timing}-${note.lane}`)
                )
              );
              setEffects((prevEff) => [
                ...prevEff,
                { type: 'judge', lane: note.lane, judgement: 'MISS', combo: 0, id: crypto.randomUUID() },
              ]);
              return { ...note, hit: true, holding: false, released: true, judgement: 'MISS' };
            }
          } else {
            if (now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              applyMissPenalty();
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
  }, [paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused) return;
      const holdingNotes = notesRef.current.filter((n) => n.holding && !n.released);
      if (holdingNotes.length > 0) {
        const mult = getComboMultiplier(comboRef.current);
        const bonus =
          holdingNotes.length * GAME_CONFIG.SCORE.LONG_BONUS * mult;
        setScore((prev) => prev + bonus);
        setCombo((prev) => {
          const next = prev + 1;
          setEffects((eff) => [
            ...eff,
          ]);
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    const handleKeyPress = (laneIndex) => {
      if (paused) return;

      //첫 입력 때 오디오 재생 보장(자동재생 막힘 대응)
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => { });
      }

      if (pressedKeys.has(laneIndex)) return;
      setPressedKeys((prev) => new Set(prev).add(laneIndex));

      const ACCENT_LANES = new Set([1, 3, 5]);

      if (ACCENT_LANES.has(laneIndex)) {
        playTapAccent(sfxVolume);
      } else {
        playTapNormal(sfxVolume);
      }

      const result = NoteCalculator.judgeNote(laneIndex, currentTimeRef.current, notesRef.current);
      if (!result || !result.note) return;

      const note = result.note;
      const noteId = `${note.timing}-${note.lane}`;

      if (result.judgement === 'MISS') {
        applyMissPenalty();
        setCombo(0);
        setEffects((eff) => [
          ...eff,
          { type: 'judge', lane: laneIndex, judgement: 'MISS', combo: 0, id: crypto.randomUUID() },
        ]);
        return;
      }

      // ★ 롱 시작: 딱 1회
      if (note.type === 'long' && !note.holding) {
        setNotes((prev) => prev.map((n) => (n === note ? { ...n, hit: true, holding: true } : n)));
        setCombo((prev) => {
          const next = prev + 1;

          setEffects((pe) =>
            pe.some((e) => e.type === 'long' && e.noteId === noteId)
              ? pe
              : [
                ...pe,
                { type: 'long', lane: laneIndex, noteId },
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

        return; // ★ 중요
      }

      // ★ 탭
      setNotes((prev) => prev.map((n) => (n === note ? { ...n, hit: true } : n)));
      setCombo((prev) => {
        const next = prev + 1;

        setEffects((eff) => [
          ...eff,
          { type: 'tap', lane: laneIndex, id: crypto.randomUUID() },
          {
            type: 'judge',
            lane: laneIndex,
            judgement: result.judgement,
            combo: next,
            id: crypto.randomUUID(),
          },
        ]);
        return next;
      });

      setScore((prev) => {
        const mult = getComboMultiplier(comboRef.current + 1);
        return prev + GAME_CONFIG.SCORE[result.judgement] * mult;
      });
    };

    const handleKeyRelease = (laneIndex) => {
      setPressedKeys((prev) => {
        const s = new Set(prev);
        s.delete(laneIndex);
        return s;
      });

      const result = NoteCalculator.judgeNoteRelease(
        laneIndex,
        currentTimeRef.current,
        notesRef.current
      );

      if (result && result.note) {
        const note = result.note;
        const noteId = `${note.timing}-${note.lane}`;

        setNotes((prev) =>
          prev.map((n) => (n === note ? { ...n, hit: true, holding: false, released: true } : n))
        );
        setEffects((prev) => prev.filter((e) => !(e.type === 'long' && e.noteId === noteId)));
        setScore((prev) => {
          const mult = getComboMultiplier(comboRef.current);
          return prev + GAME_CONFIG.SCORE[result.judgement] * mult;
        });
      } else {
        setNotes((prev) =>
          prev.map((n) => {
            if (n.lane === laneIndex && n.holding) {
              setCombo(0);
              setEffects((eff) =>
                eff.filter((e) => !(e.type === 'long' && e.noteId === `${n.timing}-${n.lane}`))
              );
              return { ...n, holding: false, released: true };
            }
            return n;
          })
        );
      }
    };

    const ih = new InputHandler(handleKeyPress, handleKeyRelease);
    return () => ih.destroy();
  }, [pressedKeys, paused, sfxVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (paused) {
      audio.pause();
    } else if (audio.paused) {
      audio.play().catch(() => { });
    }
  }, [paused]);

  const SCALE = 0.8;

  return (
    <div
      style={{
        width: `${GAME_CONFIG.CANVAS.WIDTH * SCALE}px`,
        height: `${GAME_CONFIG.CANVAS.HEIGHT * SCALE}px`,
        position: 'relative',
        margin: '80px auto 0',   // ✅ 헤더 80px + 가운데 정렬
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${GAME_CONFIG.CANVAS.WIDTH}px`,
          height: `${GAME_CONFIG.CANVAS.HEIGHT}px`,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left', // ✅ wrapper가 이미 스케일 크기라 left 기준이 정답
        }}
      >
        <GameCanvas
          notes={notes.filter((n) => {
            if (n.type === 'long') {
              const t = (GAME_CONFIG.CANVAS.HEIGHT + 100) / speed;
              return currentTime < n.endTime + t;
            }
            return !n.hit;
          })}
          currentTime={currentTime}
          pressedKeys={pressedKeys}
        />

        <PixiNotes notes={notes} currentTime={currentTime} speed={speed} />
        <KeyEffectLayer pressedKeys={pressedKeys} />
        <PixiEffects effects={effects} />
        <audio ref={audioRef} />
        <Visualizer active={!paused} size="game" analyserRef={analyserRef} />
      </div>
    </div>
  );

}
