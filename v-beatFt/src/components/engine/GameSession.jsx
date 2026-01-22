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

export default function GameSession({
  isPlaying = false,
  mode = 'play', // 'play' | 'edit'
  seekTime,
  tool,
  notes = null,
  setNotes = null,
  pushUndo,
  setSelectedNoteIds,
  selectedNoteIds,
  songId: propSongId,
  analyserRef, onState, paused = false, bgmVolume, sfxVolume, onReady, onFinish
}) {
  const isEditorTest =
    new URLSearchParams(window.location.search).get('mode') === 'editorTest';

  const SAFE_SCORE = 300;
  const MISS_PENALTY = 100;
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [effects, setEffects] = useState([]);
  const passedSafeZoneRef = useRef(false);
  const readyCalledRef = useRef(false);
  const notesRef = useRef(notes ?? []);
  const currentTimeRef = useRef(0);
  const maxComboRef = useRef(0);
  const onReadyRef = useRef(onReady);
  const onFinishRef = useRef(onFinish);
  const [internalNotes, setInternalNotes] = useState([]);
  const usedNotes = Array.isArray(notes) ? notes : internalNotes;
  const usedSetNotes = setNotes ?? setInternalNotes;
  const [isInLaneArea, setIsInLaneArea] = useState(false);
  const draggingNoteRef = useRef(null);
  const effectivePaused = mode === 'edit' ? !isPlaying : paused;
  const dragBaseTimeRef = useRef(0);     // 드래그 시작 당시 currentTimeRef 고정
  const dragOffsetMsRef = useRef(0);     // move용: note.timing - mouseTiming
  const dragEndOffsetMsRef = useRef(0);  // resize용: note.endTime - mouseTiming
  const justDraggedRef = useRef(false);
  const dragStartPosRef = useRef(null);
  const deleteDragRef = useRef(null); // { x1, y1, x2, y2 }
  const [, forceRender] = useState(0); // 드래그 박스 렌더 트리거
  const selectDragRef = useRef(null); // { x1, y1, x2, y2 }
  const draggingPreviewRef = useRef(new Map()); // id -> { timing, lane, endTime }

  const getLaneCount = () =>
    GAME_CONFIG.LANE?.COUNT ?? GAME_CONFIG.KEY?.COUNT ?? 7;

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
    if (mode === 'edit') return; 
    if (seekTime == null) return;

    setCurrentTime(seekTime);
    currentTimeRef.current = seekTime;

    if (audioRef.current) {
      audioRef.current.currentTime = seekTime / 1000;
    }

    usedSetNotes((prev) =>
      prev.map((n) => {
        if (n.type === 'long') {
          if (seekTime < n.timing) {
            return { ...n, hit: false, holding: false, released: false };
          }
          if (seekTime >= n.endTime) {
            return { ...n, hit: true, holding: false, released: true };
          }
          return { ...n, hit: true, holding: true };
        }
        return seekTime >= n.timing
          ? { ...n, hit: true }
          : { ...n, hit: false };
      })
    );
  }, [seekTime, paused, usedSetNotes]);

  useEffect(() => {
    if (mode !== 'edit') return;
    const onUp = () => {
      draggingNoteRef.current = null;
      dragBaseTimeRef.current = 0;
      dragOffsetMsRef.current = 0;
      dragEndOffsetMsRef.current = 0;
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [mode]);

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
    if (mode === 'edit') return;
    if (!audioRef.current) return;
    if (!Number.isFinite(bgmVolume)) return;

    // eslint-disable-next-line react-hooks/immutability
    audioRef.current.volume = bgmVolume;
  }, [bgmVolume, mode]);

  useEffect(() => {
    notesRef.current = usedNotes ?? [];
  }, [notes, usedNotes]);

  useEffect(() => {
    if (mode === 'edit') return;

    if (score >= SAFE_SCORE) {
      passedSafeZoneRef.current = true;
    }
  }, [score, mode]);

  useEffect(() => {
    if (mode === 'edit') return;

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
  }, [score, mode]);

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

  const [songId, setSongId] = useState(propSongId || getSongIdFromUrl());

  useEffect(() => {
    if (propSongId) setSongId(propSongId);
  }, [propSongId]);

  const [diff, setDiff] = useState(getDiffFromUrl());
  const speed =
    (GAME_CONFIG.DIFFICULTY?.[diff?.toUpperCase()]?.SPEED) ??
    (GAME_CONFIG.SPEED) ??
    2; // 최종 방어선: 모든 설정이 없으면 기본값 2

  useEffect(() => {
    if (typeof onState !== 'function') return;

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
  }, [score, combo, diff, onState, mode]);

  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef(null);
  const viewRef = useRef(null);
  const dragStartRef = useRef(null);
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
    // eslint-disable-next-line react-hooks/immutability
    maxScoreRef.current = Math.max(1, calcMaxScore(usedNotes));
  }, [usedNotes, calcMaxScore]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    readyCalledRef.current = false;
    // eslint-disable-next-line react-hooks/immutability
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
    // eslint-disable-next-line react-hooks/immutability
    audio.src = audioUrl;
    audio.currentTime = 0;

    if (!audioCtxRef.current) {
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();

        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(ctx.destination);

        audioCtxRef.current = ctx;
        if (analyserRef) analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch { /* ignore */ }
    }

    audio.addEventListener('canplay', handleReady, { once: true });
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('canplay', handleReady);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, analyserRef]); // ✅ paused/mode 제거


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (effectivePaused) {
      audio.pause();
      return;
    }

    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => { });
    }

    if (audio.paused) {
      audio.play().catch(() => { });
    }
  }, [effectivePaused, audioUrl]);

  useEffect(() => {
    if (mode === 'edit') return;
    if (!paused) {
      setPressedKeys(new Set());
    }
  }, [paused, mode]);

  useEffect(() => {
    if (mode !== 'edit') return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        deleteDragRef.current = null;
        selectDragRef.current = null;
        forceRender(v => v + 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);


  const normalizeNotesFromApi = (payload) => {
    const list = Array.isArray(payload) ? payload : (payload?.notes || payload?.data || []);
    if (!Array.isArray(list)) return [];

    return list.map((n) => {
      // ✅ time/noteTime/note_time 이 있으면 "초", 없으면 timing은 "ms"로 간주
      const hasSecTime = n.time != null || n.noteTime != null || n.note_time != null;

      const tRaw = Number(hasSecTime ? (n.time ?? n.noteTime ?? n.note_time ?? 0) : (n.timing ?? 0));
      const lane = Number(n.lane ?? n.laneIndex ?? n.key ?? 0);
      const type = (n.type ?? n.noteType ?? 'tap') === 'long' ? 'long' : 'tap';

      const startMs = Math.round(hasSecTime ? (tRaw * 1000) : tRaw);

      const endRaw = n.endTime ?? n.end_time ?? n.end ?? null;
      const endMs = endRaw != null ? Math.round(Number(hasSecTime ? (Number(endRaw) * 1000) : Number(endRaw))) : undefined;

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
      // eslint-disable-next-line react-hooks/immutability
      audioRef.current.currentTime = 0;
    }
  };

  const loadSongById = useCallback(async (sidRaw) => {
    const sid = String(sidRaw).trim();
    if (!sid) return false;

    if (isEditorTest) {
      const raw = sessionStorage.getItem('EDITOR_TEST_NOTES');
      if (raw) {
        const parsed = JSON.parse(raw);
        resetGame();
        usedSetNotes(parsed);
        setAudioUrl(`${API_BASE}/api/songs/${sid}/audio`);
        return true;
      }
    }

    setAudioUrl(`${API_BASE}/api/songs/${sid}/audio`);

    const notesRes = await fetch(`${API_BASE}/api/songs/${sid}/notes`);
    if (!notesRes.ok) return false;

    const notesJson = await notesRes.json();
    const mapped = normalizeNotesFromApi(notesJson);
    if (!mapped.length) return false;

    resetGame();
    usedSetNotes(mapped);
    return true;
  }, [API_BASE, isEditorTest, usedSetNotes]);

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
    if (mode === 'edit') {
      resetGame();
      setAudioUrl(`${API_BASE}/api/songs/${songId}/audio`);
      return;
    }
    loadSongById(songId);
  }, [API_BASE, songId, mode, loadSongById]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (effectivePaused) return;

      const audio = audioRef.current;
      if (!audio) return;

      const newTime = audio.currentTime * 1000;
      currentTimeRef.current = newTime;
      setCurrentTime(newTime);

      usedSetNotes((prevNotes) =>
        prevNotes.map((note) => {
          if (note.type === 'long' && note.holding && currentTimeRef.current > note.endTime) {
            return { ...note, holding: false, released: true };
          }
          return note;
        })
      );
    }, 16);

    return () => clearInterval(interval);
  }, [effectivePaused, usedSetNotes]);


  useEffect(() => {
    if (mode === 'edit') return;
    const interval = setInterval(() => {
      if (paused) return;
      const now = currentTimeRef.current;
      usedSetNotes((prev) => {
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
  }, [paused, mode, usedSetNotes]);

  useEffect(() => {
    if (mode === 'edit') return;
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
  }, [paused, mode, isPlaying]);

  useEffect(() => {
    if (mode === 'edit') return;
    const handleKeyPress = (laneIndex) => {
      if (paused) return;

      //첫 입력 때 오디오 재생 보장(자동재생 막힘 대응)
      if (!paused && audioRef.current && audioRef.current.paused) {
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
        usedSetNotes((prev) => prev.map((n) => (n === note ? { ...n, hit: true, holding: true } : n)));
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
      usedSetNotes((prev) => prev.map((n) => (n === note ? { ...n, hit: true } : n)));
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

        usedSetNotes((prev) =>
          prev.map((n) => (n === note ? { ...n, hit: true, holding: false, released: true } : n))
        );
        setEffects((prev) => prev.filter((e) => !(e.type === 'long' && e.noteId === noteId)));
        setScore((prev) => {
          const mult = getComboMultiplier(comboRef.current);
          return prev + GAME_CONFIG.SCORE[result.judgement] * mult;
        });
      } else {
        usedSetNotes((prev) =>
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
  }, [pressedKeys, paused, sfxVolume, mode, usedSetNotes]);

  const SCALE = 0.8;

  // 1. 좌표 및 타이밍 계산 통합 함수
  const getGameCoords = (clientX, clientY) => {
    if (!viewRef.current) return { lane: -1, timing: 0 };
    const rect = viewRef.current.getBoundingClientRect();

    // 화면 좌표 → 월드 좌표(스케일 보정)
    const sx = (clientX - rect.left) / SCALE;
    const sy = (clientY - rect.top) / SCALE;

    // ===== 원근 역보정 함수 (X만) =====
    const unprojectX = (screenX, y) => {
      const { WIDTH, HEIGHT } = GAME_CONFIG.CANVAS;
      const centerX = WIDTH / 2;

      const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;
      const scale =
        SCALE_MIN + (y / HEIGHT) * (SCALE_MAX - SCALE_MIN);

      return centerX + (screenX - centerX) / scale;
    };

    // ===== 사다리꼴 영역(screen space) 경계 체크 =====
    const { WIDTH, HEIGHT } = GAME_CONFIG.CANVAS;
    const centerX = WIDTH / 2;

    const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;

    // sy는 이미 SCALE 보정된 월드 좌표 → 화면 기준으로 다시 보정
    const screenY = sy;

    const scale =
      SCALE_MIN + (screenY / HEIGHT) * (SCALE_MAX - SCALE_MIN);

    // 사다리꼴 좌/우 경계 (screen space)
    const leftScreenX = centerX + (0 - centerX) * scale;
    const rightScreenX = centerX + (WIDTH - centerX) * scale;

    // 레인 영역 밖이면 무조건 차단
    if (sx < leftScreenX || sx > rightScreenX) {
      return { lane: -1, timing: 0 };
    }
    // =================================

    const HIT_Y = GAME_CONFIG.CANVAS.HIT_LINE_Y;

    // 화면 X → 월드 X (원근 역보정)
    const wx = unprojectX(sx, sy);

    // 레인 판정 (LANE_WIDTHS 기준)
    const widths = GAME_CONFIG.LANE_WIDTHS;
    let acc = 0;
    let lane = -1;

    for (let i = 0; i < widths.length; i++) {
      acc += widths[i];
      if (wx < acc) {
        lane = i;
        break;
      }
    }

    // 타이밍 계산
    const currentSpeed = Number(speed) > 0 ? Number(speed) : 2;
    const timeOffset = (HIT_Y - sy) / currentSpeed;
    const t = (currentTimeRef.current || 0) + timeOffset;

    return { lane, timing: t };
  };

  const getLaneLeftX = (lane) => {
    return (GAME_CONFIG.LANE_WIDTHS ?? [])
      .slice(0, lane)
      .reduce((a, b) => a + b, 0);
  };

  const getLaneRightX = (lane) => {
    return getLaneLeftX(lane) + (GAME_CONFIG.LANE_WIDTHS?.[lane] ?? 0);
  };

  // 2. 에디터 클릭 핸들러 (탭 생성 및 삭제)
  const handleEditorClick = (e) => {
    if (justDraggedRef.current) return;
    if (tool === 'delete' && deleteDragRef.current) return;
    if (mode !== 'edit' || dragStartRef.current || draggingNoteRef.current) {
      return;
    }

    const { lane, timing } = getGameCoords(e.clientX, e.clientY);

    if (tool === 'delete') {
      pushUndo(notesRef.current); // ✅ 먼저 undo 저장
      usedSetNotes((prev) =>
        prev.filter(n => !(n.lane === lane && Math.abs(n.timing - timing) < 60))
      );
    } else if (tool === 'tap') {

      pushUndo(notesRef.current);

      const newTiming = Math.round(timing);

      usedSetNotes((prev) => {
        const isDuplicateTap = prev.some(n =>
          n.type === 'tap' &&
          n.lane === lane &&
          Math.abs(n.timing - newTiming) < 60
        );

        const isInsideLong = prev.some(n =>
          n.type === 'long' &&
          n.lane === lane &&
          newTiming > n.timing &&
          newTiming < (n.endTime ?? n.timing)
        );

        if (isDuplicateTap || isInsideLong) return prev;

        return [
          ...prev,
          {
            lane,
            timing: newTiming,
            type: 'tap',
            hit: false,
          }
        ];
      });
    }
  };
  const getLaneFromClient = (clientX, clientY) => {
    if (!viewRef.current) return -1;
    const rect = viewRef.current.getBoundingClientRect();

    const sx = (clientX - rect.left) / SCALE;
    const sy = (clientY - rect.top) / SCALE;

    const { WIDTH, HEIGHT } = GAME_CONFIG.CANVAS;
    const centerX = WIDTH / 2;
    const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;

    const scale = SCALE_MIN + (sy / HEIGHT) * (SCALE_MAX - SCALE_MIN);

    const leftScreenX = centerX + (0 - centerX) * scale;
    const rightScreenX = centerX + (WIDTH - centerX) * scale;

    if (sx < leftScreenX || sx > rightScreenX) return -1;

    const unprojectX = (screenX, y) =>
      centerX + (screenX - centerX) / scale;

    const wx = unprojectX(sx, sy);

    const widths = GAME_CONFIG.LANE_WIDTHS;
    let acc = 0;
    for (let i = 0; i < widths.length; i++) {
      acc += widths[i];
      if (wx < acc) return i;
    }
    return -1;
  };

  const handleMouseMove = (e) => {
    if (mode !== 'edit') return;

    // ===== NOTE DRAG MOVE =====
    if (tool === 'select' && draggingNoteRef.current) {
      justDraggedRef.current = true;

      const dragInfo = draggingNoteRef.current;
      const { mode: dragMode, baseTiming, baseLane, baseById } = dragInfo;

      // 현재 마우스 timing
      const rect = viewRef.current.getBoundingClientRect();
      const sy = (e.clientY - rect.top) / SCALE;
      const HIT_Y = GAME_CONFIG.CANVAS.HIT_LINE_Y;

      const mouseTimingNow =
        dragBaseTimeRef.current + (HIT_Y - sy) / speed;

      const baseNewTiming =
        Math.max(0, mouseTimingNow + dragOffsetMsRef.current);

      const delta = baseNewTiming - baseTiming;

      const newLaneMaybe = getLaneFromClient(e.clientX, e.clientY);
      const laneDelta = newLaneMaybe >= 0 ? (newLaneMaybe - baseLane) : 0;

      draggingPreviewRef.current.clear();

      for (const [id, base] of baseById.entries()) {
        const targetLane = base.lane + laneDelta;
        if (targetLane < 0 || targetLane >= getLaneCount()) continue;

        if (dragMode === 'move') {
          const prev = draggingPreviewRef.current.get(id) || {};
          draggingPreviewRef.current.set(id, {
            ...prev,
            timing: Math.max(0, base.timing + delta),
            lane: targetLane,
          });
        }

        if (dragMode === 'resize' && base.type === 'long') {
          const minLen = 150;
          const newEnd = Math.max(
            mouseTimingNow + dragEndOffsetMsRef.current,
            base.timing + minLen
          );
          const prev = draggingPreviewRef.current.get(id) || {};
          draggingPreviewRef.current.set(id, {
            ...prev,
            endTime: newEnd,
          });
        }
      }


      return;
    }

    // ===== DELETE DRAG MOVE =====
    if (tool === 'delete' && deleteDragRef.current) {
      deleteDragRef.current.x2 = e.clientX;
      deleteDragRef.current.y2 = e.clientY;
      forceRender(v => v + 1);
      return;
    }

    // ===== SELECT BOX DRAG MOVE =====
    if (tool === 'select' && selectDragRef.current && !draggingNoteRef.current) {
      selectDragRef.current.x2 = e.clientX;
      selectDragRef.current.y2 = e.clientY;
      forceRender(v => v + 1);
      return;
    }

    // ===== 커서 영역 판정 =====
    if (!draggingNoteRef.current && !selectDragRef.current && !deleteDragRef.current) {
      const { lane } = getGameCoords(e.clientX, e.clientY);
      setIsInLaneArea(lane >= 0 && lane < getLaneCount());
    }
  };

  // 3. 에디터 드래그 핸들러 (롱노트 생성)

  const handleEditorMouseDown = (e) => {
    if (mode !== 'edit' || e.button !== 0) return;
    if (tool === 'delete' && deleteDragRef.current) return;

    if (tool === 'delete') {
      deleteDragRef.current = {
        x1: e.clientX,
        y1: e.clientY,
        x2: e.clientX,
        y2: e.clientY,
      };
      return;
    }

    // ===== SELECT BOX DRAG START (빈 공간) =====
    if (tool === 'select' && e.shiftKey) {
      selectDragRef.current = {
        x1: e.clientX,
        y1: e.clientY,
        x2: e.clientX,
        y2: e.clientY,
      };
      forceRender(v => v + 1);
      return;
    }

    const { lane } = getGameCoords(e.clientX, e.clientY);
    const { timing: clickTiming } = getGameCoords(e.clientX, e.clientY);

    // ===== 선택(노트 잡기) =====
    if (tool === 'select' && lane >= 0 && lane < getLaneCount()) {
      const HIT_RANGE = 80;
      let picked = null;
      let best = HIT_RANGE + 1;

      for (const n of (notesRef.current ?? [])) {
        if (n.lane !== lane) continue;

        let d = Math.abs(n.timing - clickTiming);
        if (n.type === 'long' && n.endTime != null) {
          if (clickTiming >= n.timing && clickTiming <= n.endTime) d = 0;
        }

        if (d <= HIT_RANGE && d < best) {
          best = d;
          picked = n;
        }
      }

      if (!picked) {
        setSelectedNoteIds?.(new Set());
        draggingNoteRef.current = null;
        return;
      }

      // resize 판정
      let dragMode = 'move';
      if (picked.type === 'long' && picked.endTime != null) {
        const END_HIT_MS = 80;
        if (Math.abs(picked.endTime - clickTiming) < END_HIT_MS) dragMode = 'resize';
      }

      // ✅ 드래그 기준 시간 고정
      dragBaseTimeRef.current = currentTimeRef.current || 0;

      // ✅ 마우스 다운 시점 timing
      const rect = viewRef.current.getBoundingClientRect();
      const sy = (e.clientY - rect.top) / SCALE;
      const HIT_Y = GAME_CONFIG.CANVAS.HIT_LINE_Y;
      const mouseTimingDown =
        dragBaseTimeRef.current + (HIT_Y - sy) / speed;

      // ✅ offset 고정(튐 방지)
      dragOffsetMsRef.current = (picked.timing ?? 0) - mouseTimingDown;
      dragEndOffsetMsRef.current =
        (picked.type === 'long' ? (picked.endTime ?? picked.timing) : picked.timing) - mouseTimingDown;

      const pickedId = `${picked.timing}-${picked.lane}`;

      // ✅ 선택 세트 확정(현재 selectedNoteIds + picked)
      let selectedIds;

      if (e.shiftKey) {
        selectedIds = new Set(selectedNoteIds ?? []);
        selectedIds.add(pickedId);
      } else {
        selectedIds = new Set([pickedId]); // ✅ 단일 선택
      }
      // ✅ 핵심: 드래그 시작 스냅샷(원본값) 저장 → 누적 이동 금지
      const baseById = new Map();

      for (const n of (notesRef.current ?? [])) {
        const id = `${n.timing}-${n.lane}`;
        if (!selectedIds.has(id)) continue;

        baseById.set(id, {
          timing: n.timing,
          lane: n.lane,
          endTime: n.endTime,
          type: n.type,
        });
      }

      draggingNoteRef.current = {
        mode: dragMode,
        baseTiming: picked.timing,
        baseLane: picked.lane,
        baseById,
        selectedIds,
      };

      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      setSelectedNoteIds?.(new Set([pickedId]));
      return;
    }

    // ===== 롱노트 생성 드래그 시작 =====
    if (tool !== 'long') return;
    if (lane >= 0 && lane < getLaneCount()) {
      const { timing: startTiming } = getGameCoords(e.clientX, e.clientY);
      dragStartRef.current = { lane, timing: startTiming };
    }
  };

  const handleEditorMouseUp = (e) => {

    if (mode === 'edit' && draggingPreviewRef.current.size > 0) {
      pushUndo(notesRef.current);

      const preview = draggingPreviewRef.current;
      const selectedIds = draggingNoteRef.current?.selectedIds;

      usedSetNotes(prev => {
        const next = prev.map(n => {
          const id = `${n.timing}-${n.lane}`;
          if (!selectedIds?.has(id)) return n;

          const p = preview.get(id);
          if (!p) return n;

          return { ...n, ...p };
        });

        // ✅ ref도 즉시 동일한 값으로 동기화 (롤백 방지 핵심)
        notesRef.current = next;
        return next;
      });

      draggingPreviewRef.current.clear();
    }

    // ===== 공통 드래그 정리 =====
    if (mode === 'edit') {
      draggingNoteRef.current = null;
      dragBaseTimeRef.current = 0;
      dragOffsetMsRef.current = 0;
      dragEndOffsetMsRef.current = 0;
      dragStartPosRef.current = null;

      setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    }

    // ===== 공통 드래그 정리 =====
    if (mode === 'edit') {
      draggingNoteRef.current = null;
      dragBaseTimeRef.current = 0;
      dragOffsetMsRef.current = 0;
      dragEndOffsetMsRef.current = 0;
      dragStartPosRef.current = null;

      setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    }

    // ===== DELETE DRAG END =====
    if (mode === 'edit' && tool === 'delete' && deleteDragRef.current) {
      const { x1, y1, x2, y2 } = deleteDragRef.current;
      deleteDragRef.current = null;

      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      const rect = viewRef.current.getBoundingClientRect();

      pushUndo(notesRef.current);

      usedSetNotes(prev =>
        prev.filter(n => {
          const { lane, timing } = n;

          const y =
            GAME_CONFIG.CANVAS.HIT_LINE_Y -
            (timing - currentTimeRef.current) * speed;

          const xLeft = getLaneLeftX(lane);
          const xRight = getLaneRightX(lane);

          const centerX = GAME_CONFIG.CANVAS.WIDTH / 2;
          const scale =
            GAME_CONFIG.PERSPECTIVE.SCALE_MIN +
            (y / GAME_CONFIG.CANVAS.HEIGHT) *
            (GAME_CONFIG.PERSPECTIVE.SCALE_MAX - GAME_CONFIG.PERSPECTIVE.SCALE_MIN);

          const screenLeft =
            (centerX + (xLeft - centerX) * scale) * SCALE + rect.left;
          const screenRight =
            (centerX + (xRight - centerX) * scale) * SCALE + rect.left;
          const screenY =
            y * SCALE + rect.top;

          const inside =
            screenRight >= minX &&
            screenLeft <= maxX &&
            screenY >= minY &&
            screenY <= maxY;

          return !inside;
        })
      );

      return;
    }

    // ===== SELECT DRAG END =====
    if (mode === 'edit' && tool === 'select' && selectDragRef.current) {
      const { x1, y1, x2, y2 } = selectDragRef.current;
      selectDragRef.current = null;

      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      const rect = viewRef.current.getBoundingClientRect();

      const picked = new Set();
      for (const n of notesRef.current) {
        const y =
          GAME_CONFIG.CANVAS.HIT_LINE_Y -
          (n.timing - currentTimeRef.current) * speed;

        const xLeft = getLaneLeftX(n.lane);
        const xRight = getLaneRightX(n.lane);

        const centerX = GAME_CONFIG.CANVAS.WIDTH / 2;
        const scale =
          GAME_CONFIG.PERSPECTIVE.SCALE_MIN +
          (y / GAME_CONFIG.CANVAS.HEIGHT) *
          (GAME_CONFIG.PERSPECTIVE.SCALE_MAX - GAME_CONFIG.PERSPECTIVE.SCALE_MIN);

        const screenLeft =
          (centerX + (xLeft - centerX) * scale) * SCALE + rect.left;
        const screenRight =
          (centerX + (xRight - centerX) * scale) * SCALE + rect.left;
        const screenY =
          y * SCALE + rect.top;

        const inside =
          screenRight >= minX &&
          screenLeft <= maxX &&
          screenY >= minY &&
          screenY <= maxY;

        if (inside) picked.add(`${n.timing}-${n.lane}`);
      }

      setSelectedNoteIds?.(picked);
      forceRender(v => v + 1);
      return;
    }

    // ===== LONG NOTE CREATE =====
    if (mode !== 'edit' || tool !== 'long' || !dragStartRef.current) return;

    const { timing: tEndRaw } = getGameCoords(e.clientX, e.clientY);
    const { lane, timing: tStartRaw } = dragStartRef.current;
    const MIN_PREVIEW_MS = 400;

    const now = currentTimeRef.current;

    const tStart = Math.max(Math.min(tStartRaw, tEndRaw), now + MIN_PREVIEW_MS);
    const tEnd = Math.max(Math.max(tStartRaw, tEndRaw), tStart + 150);

    if (tEnd - tStart < 150) return;

    const start = Math.min(tStart, tEnd);
    const end = Math.max(tStart, tEnd);

    const newStart = Math.round(start);
    const newEnd = Math.round(end);

    pushUndo(notesRef.current);

    usedSetNotes(prev => {
      const isOverlap = prev.some(n => {
        if (n.lane !== lane) return false;

        if (n.type === 'long') {
          return newStart < (n.endTime ?? n.timing) && newEnd > n.timing;
        }

        return n.timing > newStart && n.timing < newEnd;
      });

      if (isOverlap) return prev;

      return [
        ...prev,
        {
          lane,
          timing: newStart,
          endTime: newEnd,
          type: 'long',
          hit: false,
          holding: false,
        }
      ];
    });
  };

  // 4. 렌더링 (JSX)
  return (
    <div
      ref={viewRef}
      onClick={handleEditorClick}
      onMouseDown={handleEditorMouseDown}
      onMouseUp={handleEditorMouseUp}
      onMouseMove={handleMouseMove}

      onMouseLeave={() => {
        dragStartRef.current = null;
        draggingNoteRef.current = null;
        dragBaseTimeRef.current = 0;
        dragOffsetMsRef.current = 0;
        dragEndOffsetMsRef.current = 0;
      }}

      onContextMenu={(e) => {
        e.preventDefault();
        if (mode !== 'edit') return;
        const { lane, timing } = getGameCoords(e.clientX, e.clientY);

        usedSetNotes((prev) => {
          pushUndo(prev);
          return prev.filter(n => !(n.lane === lane && Math.abs(n.timing - timing) < 150));
        });
      }}
      style={{
        width: `${GAME_CONFIG.CANVAS.WIDTH * SCALE}px`,
        height: `${GAME_CONFIG.CANVAS.HEIGHT * SCALE}px`,
        position: 'relative',
        margin: '80px auto 0',
        overflow: 'hidden',
        cursor:
          mode === 'edit'
            ? (isInLaneArea ? 'crosshair' : 'default')
            : 'default',
      }}
    >
      <div
        style={{
          width: `${GAME_CONFIG.CANVAS.WIDTH}px`,
          height: `${GAME_CONFIG.CANVAS.HEIGHT}px`,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        {mode === 'edit' && tool === 'delete' && deleteDragRef.current && (() => {
          const rect = viewRef.current?.getBoundingClientRect();
          if (!rect) return null;

          const { x1, y1, x2, y2 } = deleteDragRef.current;

          // viewRef 기준 좌표로 변환 + SCALE 보정
          const lx1 = (x1 - rect.left) / SCALE;
          const ly1 = (y1 - rect.top) / SCALE;
          const lx2 = (x2 - rect.left) / SCALE;
          const ly2 = (y2 - rect.top) / SCALE;

          const left = Math.min(lx1, lx2);
          const top = Math.min(ly1, ly2);
          const width = Math.abs(lx2 - lx1);
          const height = Math.abs(ly2 - ly1);

          return (
            <div
              style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                border: '2px dashed #ff5577',
                background: 'rgba(255,80,120,0.15)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          );
        })()}

        {mode === 'edit' && tool === 'select' && selectDragRef.current && (() => {
          const rect = viewRef.current?.getBoundingClientRect();
          if (!rect) return null;

          const { x1, y1, x2, y2 } = selectDragRef.current;

          // client → viewRef 로컬 + SCALE 역보정
          const lx1 = (x1 - rect.left) / SCALE;
          const ly1 = (y1 - rect.top) / SCALE;
          const lx2 = (x2 - rect.left) / SCALE;
          const ly2 = (y2 - rect.top) / SCALE;

          const left = Math.min(lx1, lx2);
          const top = Math.min(ly1, ly2);
          const width = Math.abs(lx2 - lx1);
          const height = Math.abs(ly2 - ly1);

          return (
            <div
              style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                border: '2px dashed #55ccff',
                background: 'rgba(80,180,255,0.15)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          );
        })()}

        <GameCanvas
          notes={
            mode === 'edit'
              ? (usedNotes ?? [])
              : (usedNotes ?? []).filter((n) => {
                if (n.type === 'long') {
                  return currentTime < (n.endTime || n.timing) + 2000;
                }
                return !n.hit || currentTime < n.timing + 500;
              })
          }
          currentTime={currentTime}
          pressedKeys={pressedKeys}
        />

        <PixiNotes
          notes={usedNotes ?? []}
          currentTime={currentTime}
          speed={speed}
          selectedNoteIds={selectedNoteIds}
          draggingPreviewRef={draggingPreviewRef}
        />      {mode === 'play' && (
          <>
            <KeyEffectLayer pressedKeys={pressedKeys} />
            <PixiEffects effects={effects} />
            <Visualizer active={!paused} size="game" analyserRef={analyserRef} />
          </>
        )}

        <audio ref={audioRef} />
      </div>
    </div>
  );
}