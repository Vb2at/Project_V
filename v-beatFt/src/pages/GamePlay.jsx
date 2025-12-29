// src/pages/GamePlay.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import GameCanvas from '../components/Game/GameCanvas';
import { InputHandler } from '../engine/InputHandler';
import { NoteCalculator } from '../engine/NoteCalculator';
import { GAME_CONFIG } from '../constants/GameConfig';
import PixiEffects from '../components/Game/PixiEffects';
import { addTapEffect } from '../util/EffectsHelpers';

export default function GamePlay() {
  // ✅ 노래바꾸는 곳
  const songId = 45;

  const [notes, setNotes] = useState([
    // (fallback) 0-2초: 기본 탭노트
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
  const [isReady, setIsReady] = useState(false); // ✅ AI/오디오 준비 완료 여부
  const [isPlaying, setIsPlaying] = useState(false); // ✅ 재생 여부

  // ✅ 최신 값 참조용 ref (InputHandler를 1회만 만들기 위해 필수)
  const notesRef = useRef(notes);
  const currentTimeRef = useRef(0);

  // ✅ 오디오 ref
  const audioRef = useRef(null);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // =========================================================
  // ✅ (추가) AI 노트 로드 + 오디오 URL 세팅
  //  - 노트: GET /api/ai/song/{songId}/notes
  //  - 오디오: GET /api/ai/song/{songId}/audio (stream)
  // =========================================================
  useEffect(() => {
    let mounted = true;

    const loadAiNotesAndAudio = async () => {
      try {
        // ✅ 1) 노트 가져오기
        const notesRes = await axios.get(`/api/ai/song/${songId}/notes`);
        const data = notesRes.data;

        // 서버가 { notes: [...], noteCount: n } 형태라고 가정
        const rawNotes = data?.notes ?? [];

        // ✅ 프론트 엔진 형태로 매핑
        // - 서버: time (초, decimal), lane (0~6), type('tap'|'long'), endTime(초) 혹은 end_time
        // - 프론트: timing(ms), endTime(ms)
        const mapped = rawNotes.map(n => {
          const type = n.type ?? 'tap';
          const startMs = Math.round(Number(n.time) * 1000);
          const endSec = n.endTime ?? n.end_time; // 혹시 end_time으로 내려올 수 있어서 둘 다
          const endMs = endSec != null ? Math.round(Number(endSec) * 1000) : undefined;

          if (type === 'long') {
            return {
              lane: Number(n.lane),
              timing: startMs,
              endTime: endMs ?? startMs + 500, // endTime 없으면 임시
              type: 'long',
              hit: false,
              holding: false,
            };
          }

          return {
            lane: Number(n.lane),
            timing: startMs,
            type: 'tap',
            hit: false,
          };
        });

        if (mounted && mapped.length > 0) {
          setNotes(mapped); // ✅ 기존 더미 노트 덮어쓰기
        }

        // ✅ 2) 오디오 URL 세팅 (Spring 스트리밍 엔드포인트)
        // <audio src>로 바로 재생
        if (audioRef.current) {
          audioRef.current.src = `/api/ai/song/${songId}/audio`;
          audioRef.current.load();
        }

        if (mounted) setIsReady(true);
      } catch (e) {
        console.error('AI/Audio load failed:', e);
        // 실패해도 더미 노트로는 플레이 가능하게 유지
        if (mounted) setIsReady(true);
      }
    };

    // 초기화 (게임 리셋 느낌)
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setScore(0);
    setCombo(0);
    setEffects([]);

    loadAiNotesAndAudio();

    return () => {
      mounted = false;
    };
  }, [songId]);

  // =========================================================
  // ✅ 타이머 (재생 중일 때만 currentTime 증가)
  // =========================================================
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 16;
        currentTimeRef.current = newTime;

        setNotes(prevNotes =>
          prevNotes.map(note => {
            if (note.type === 'long' && note.holding && newTime > note.endTime) {
              setEffects(prevEffects =>
                prevEffects.filter(e => !(e.type === 'long' && e.lane === note.lane))
              );
              return { ...note, holding: false };
            }
            return note;
          })
        );

        return newTime;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // =========================================================
  // ✅ Miss 자동 감지 (재생 중일 때만)
  // =========================================================
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const now = currentTimeRef.current;

      setNotes(prev => {
        let missOccurred = false;

        const newNotes = prev.map(note => {
          if (note.hit) return note;

          if (note.type === 'long') {
            if (!note.holding && now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              return { ...note, hit: true, judgement: 'MISS' };
            }
            if (note.holding && now > note.endTime + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;

              // 롱노트 임펙트 제거
              setEffects(prevEffects =>
                prevEffects.filter(e => !(e.type === 'long' && e.lane === note.lane))
              );

              return { ...note, hit: true, holding: false, judgement: 'MISS' };
            }
          } else {
            if (now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
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
  }, [isPlaying]);

  // =========================================================
  // ✅ 롱노트 홀딩 보너스 (재생 중일 때만)
  // =========================================================
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const holdingNotes = notesRef.current.filter(n => n.holding && !n.hit);
      if (holdingNotes.length > 0) {
        const bonus = holdingNotes.length * GAME_CONFIG.SCORE.LONG_BONUS;
        setScore(prev => prev + bonus);
        setCombo(prev => prev + 1);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // =========================================================
  // ✅ 입력 처리 (반드시 1회만 등록) - 재생 중 아닐 땐 무시
  // =========================================================
  useEffect(() => {
    const handleKeyPress = laneIndex => {
      if (!isPlaying) return;

      setPressedKeys(prev => new Set(prev).add(laneIndex));

      const result = NoteCalculator.judgeNote(
        laneIndex,
        currentTimeRef.current,
        notesRef.current
      );

      if (!result) return;

      if (result.note.type === 'long') {
        setNotes(prev =>
          prev.map(note => (note === result.note ? { ...note, holding: true } : note))
        );

        setEffects(prev => [
          ...prev,
          {
            type: 'long',
            lane: laneIndex,
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          },
        ]);
      } else {
        setNotes(prev => prev.map(note => (note === result.note ? { ...note, hit: true } : note)));
        addTapEffect(setEffects, laneIndex);
      }

      const addScore = GAME_CONFIG.SCORE[result.judgement];
      setScore(prev => prev + addScore);
      setCombo(prev => prev + 1);
    };

    const handleKeyRelease = laneIndex => {
      if (!isPlaying) return;

      setPressedKeys(prev => {
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
        setNotes(prev =>
          prev.map(note =>
            note === result.note ? { ...note, hit: true, holding: false } : note
          )
        );

        setEffects(prev => prev.filter(e => !(e.type === 'long' && e.lane === laneIndex)));

        const addScore = GAME_CONFIG.SCORE[result.judgement];
        setScore(prev => prev + addScore);
      } else {
        setNotes(prev =>
          prev.map(note => {
            if (note.lane === laneIndex && note.holding) {
              setCombo(0);

              setEffects(prevEffects =>
                prevEffects.filter(e => !(e.type === 'long' && e.lane === laneIndex))
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
  }, [isPlaying]);

  // =========================================================
  // ✅ 재생 시작/정지 (오디오 시간과 currentTime 동기화)
  // =========================================================
  const startGame = async () => {
    if (!audioRef.current) return;

    // 오디오가 로드 안 되었으면 load
    if (!audioRef.current.src) {
      audioRef.current.src = `/api/ai/song/${songId}/audio`;
      audioRef.current.load();
    }

    try {
      // 시작 시점 정렬
      setCurrentTime(0);
      currentTimeRef.current = 0;

      audioRef.current.currentTime = 0;
      await audioRef.current.play();

      setIsPlaying(true);
    } catch (e) {
      console.error('audio play failed:', e);
    }
  };

  const stopGame = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setScore(0);
    setCombo(0);
    setEffects([]);
    // 노트는 다시 초기화하지 않고 유지 (원하면 여기서 hit/holding reset하면 됨)
    setNotes(prev =>
      prev.map(n =>
        n.type === 'long'
          ? { ...n, hit: false, holding: false, judgement: undefined, released: false }
          : { ...n, hit: false, judgement: undefined }
      )
    );
  };

  // 오디오 끝나면 자동 정지
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onEnded = () => setIsPlaying(false);
    el.addEventListener('ended', onEnded);

    return () => el.removeEventListener('ended', onEnded);
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
      {/* ✅ 숨겨진 오디오 태그 (스트리밍 재생) */}
      <audio ref={audioRef} preload="auto" />

      <div
        style={{
          color: 'white',
          fontSize: '24px',
          marginBottom: '12px',
          display: 'flex',
          gap: '40px',
          alignItems: 'center',
        }}
      >
        <div>점수: {score}</div>
        <div>콤보: {combo}</div>
      </div>

      {/* ✅ 시작/정지 버튼 (최소 UI) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <button
          onClick={startGame}
          disabled={!isReady || isPlaying}
          style={{ padding: '10px 16px', cursor: isReady && !isPlaying ? 'pointer' : 'not-allowed' }}
        >
          {isReady ? (isPlaying ? '재생중...' : 'START') : '로딩중...'}
        </button>
        <button onClick={stopGame} disabled={!isPlaying} style={{ padding: '10px 16px' }}>
          STOP
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          width: GAME_CONFIG.CANVAS.WIDTH + 'px',
          height: GAME_CONFIG.CANVAS.HEIGHT + 'px',
        }}
      >
        <GameCanvas
          notes={notes.filter(n => {
            if (!n.hit) return true;

            // 롱노트는 released여도 endTime까지 표시
            if (n.type === 'long') {
              const timeToDisappear = (GAME_CONFIG.CANVAS.HEIGHT + 100) / GAME_CONFIG.SPEED;
              return currentTime < n.endTime + timeToDisappear;
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
