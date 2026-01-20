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
  isPlaying = true,
  mode = 'play', // 'play' | 'edit'
  seekTime,
  tool,
  notes = null,
  setNotes = null,
  pushUndo,
  songId: propSongId,
  analyserRef, onState, paused, bgmVolume, sfxVolume, onReady, onFinish
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
  }, [seekTime, usedSetNotes, mode]);

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
    maxScoreRef.current = Math.max(1, calcMaxScore(usedNotes));
  }, [usedNotes, calcMaxScore]);

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
      if (analyserRef) {
        analyserRef.current = analyser; // ✅ 있을 때만 연결
      }
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioCtxRef.current = ctx;
      if (analyserRef) {
        analyserRef.current = analyser;
      }

      dataArrayRef.current = dataArray;
    }

    audio.addEventListener('canplay', handleReady, { once: true });
    audio.addEventListener('ended', handleEnded);

    if (isPlaying && !paused) {
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => { });
    }

    return () => {
      audio.removeEventListener('canplay', handleReady);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, analyserRef, isPlaying, mode, paused]);

  useEffect(() => {
    if (mode === 'edit') return;
    if (!paused) {
      setPressedKeys(new Set());
    }
  }, [paused, mode]);

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

    // 오디오 URL 세팅
    setAudioUrl(`${API_BASE}/api/songs/${sid}/audio`);

    // 노트 로드
    const notesRes = await fetch(`${API_BASE}/api/songs/${sid}/notes`);
    if (!notesRes.ok) return false;

    const notesJson = await notesRes.json();
    const mapped = normalizeNotesFromApi(notesJson);
    if (!mapped.length) return false;

    resetGame();
    usedSetNotes(mapped);
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
      if (!isPlaying) return;
      if (paused || finishedRef.current) return;

      setCurrentTime((prev) => {
        const newTime = prev + 16;
        currentTimeRef.current = newTime;
        usedSetNotes((prevNotes) =>
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
  }, [paused, isPlaying, mode, usedSetNotes]);

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
    if (mode === 'edit' && !isPlaying) return;
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
  }, [paused, mode]);

  useEffect(() => {
    if (mode === 'edit') return;
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

  useEffect(() => {

    if (mode === 'edit') return;

    const audio = audioRef.current;
    if (!audio) return;

    if (paused) {
      audio.pause();
    } else if (audio.paused) {
      audio.play().catch(() => { });
    }
  }, [paused, mode]);
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

    return { lane, timing: Math.round(t) };
  };


  // 2. 에디터 클릭 핸들러 (탭 생성 및 삭제)
  const handleEditorClick = (e) => {
    if (mode !== 'edit' || dragStartRef.current) {
      console.log("중단: 에디터 모드가 아니거나 드래그 중입니다.");
      return;
    }

    const { lane, timing } = getGameCoords(e.clientX, e.clientY);

    if (lane < 0 || lane >= getLaneCount()) {
      console.log("중단: 레인 범위를 벗어났습니다.");
      return;
    }

    if (tool === 'delete') {
      pushUndo(notesRef.current); // ✅ 먼저 undo 저장
      usedSetNotes((prev) =>
        prev.filter(n => !(n.lane === lane && Math.abs(n.timing - timing) < 60))
      );
    } else if (tool === 'tap') {

      pushUndo(notesRef.current);

      const HIT_Y = GAME_CONFIG.CANVAS.HIT_LINE_Y;

      // 화면 맨 위에서부터 내려오기 시작하도록 보정
      const spawnOffset = (HIT_Y - 0) / speed; // top 기준
      const spawnTiming = timing - spawnOffset;

      usedSetNotes((prev) => [
        ...prev,
        {
          lane,
          timing: Math.round(timing),
          type: 'tap',
          hit: false,
        }
      ]);
    }
  };

  const handleMouseMove = (e) => {
    if (mode !== 'edit') return;
    const { lane } = getGameCoords(e.clientX, e.clientY);
    setIsInLaneArea(lane >= 0 && lane < getLaneCount());
  };


  // 3. 에디터 드래그 핸들러 (롱노트 생성)
  const handleEditorMouseDown = (e) => {
    if (mode !== 'edit' || tool !== 'long' || e.button !== 0) return;
    const { lane, timing } = getGameCoords(e.clientX, e.clientY);
    if (lane >= 0 && lane < getLaneCount()) {
      dragStartRef.current = { lane, timing };
    }
  };

  const handleEditorMouseUp = (e) => {
    if (mode !== 'edit' || tool !== 'long' || !dragStartRef.current) return;

    const { timing: tEndRaw } = getGameCoords(e.clientX, e.clientY);
    const { lane, timing: tStartRaw } = dragStartRef.current;
    dragStartRef.current = null;

    const MIN_PREVIEW_MS = 400;

    const now = currentTimeRef.current;

    const tStart = Math.max(Math.min(tStartRaw, tEndRaw), now + MIN_PREVIEW_MS);
    const tEnd = Math.max(Math.max(tStartRaw, tEndRaw), tStart + 150);

    if (tEnd - tStart < 150) return;

    pushUndo(notesRef.current);

    const HIT_Y = GAME_CONFIG.CANVAS.HIT_LINE_Y;
    const spawnOffset = (HIT_Y - 0) / speed;


    const start = Math.min(tStart, tEnd);
    const end = Math.max(tStart, tEnd);

    usedSetNotes((prev) => [
      ...prev,
      {
        lane,
        timing: Math.round(start),
        endTime: Math.round(end),
        type: 'long',
        hit: false,
        holding: false,
      }
    ]);
  };

  // 4. 렌더링 (JSX)
  return (
    <div
      ref={viewRef}
      onClick={handleEditorClick}
      onMouseDown={handleEditorMouseDown}
      onMouseUp={handleEditorMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { dragStartRef.current = null; }}
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
        <GameCanvas
          notes={(usedNotes ?? []).filter((n) => {
            if (n.type === 'long') {
              return currentTime < (n.endTime || n.timing) + 2000;
            }
            return !n.hit || currentTime < n.timing + 500;
          })}
          currentTime={currentTime}
          pressedKeys={pressedKeys}
        />

        <PixiNotes notes={usedNotes ?? []} currentTime={currentTime} speed={speed} />
        {mode === 'play' && (
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
