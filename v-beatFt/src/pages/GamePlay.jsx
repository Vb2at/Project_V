// src/pages/GamePlay.jsx
import { useState, useEffect, useRef } from 'react';
import GameCanvas from '../components/Game/GameCanvas';
import { InputHandler } from '../engine/InputHandler';
import { NoteCalculator } from '../engine/NoteCalculator';
import { GAME_CONFIG } from '../constants/GameConfig';
import PixiEffects from '../components/Game/PixiEffects';

export default function GamePlay() {
  const [notes, setNotes] = useState([
    // 0-2초: 기본 탭노트
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

  // 타이머
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 16;
        currentTimeRef.current = newTime;

        setNotes(prevNotes =>
          prevNotes.map(note => {
            if (note.type === 'long' && note.holding && newTime > note.endTime) {
              setEffects(prevEffects =>
                prevEffects.filter(
                  e =>
                    !(e.type === 'long' &&
                      e.noteId === `${note.timing}-${note.lane}`) // ★ FIX
                )
              );
              return { ...note, holding: false, released: true }; // ★ FIX
            }
            return note;
          })
        );

        return newTime;
      });
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // Miss 자동 감지
  useEffect(() => {
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

              setEffects(prevEffects =>
                prevEffects.filter(
                  e =>
                    !(e.type === 'long' &&
                      e.noteId === `${note.timing}-${note.lane}`) // ★ FIX
                )
              );

              return { ...note, hit: true, holding: false, released: true, judgement: 'MISS' };
            }
          } else {
            if (now > note.timing + GAME_CONFIG.JUDGEMENT.MISS) {
              missOccurred = true;
              setEffects(prev => [
                ...prev,
                {
                  type: 'judge',
                  lane: note.lane,
                  judgement: 'MISS',
                  id: crypto.randomUUID(),
                },
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

  // 롱노트 홀딩 보너스
  useEffect(() => {
    const interval = setInterval(() => {
      const holdingNotes = notesRef.current.filter(n => n.holding && !n.released);
      if (holdingNotes.length > 0) {
        const bonus = holdingNotes.length * GAME_CONFIG.SCORE.LONG_BONUS;
        setScore(prev => prev + bonus);
        setCombo(prev => {
          const next = prev + 1;

          setEffects(effects => [
            ...effects,
            {
              type: 'judge',
              judgement: '',
              combo: next,
              id: crypto.randomUUID(),
            },
          ]);

          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyPress = laneIndex => {
      setPressedKeys(prev => new Set(prev).add(laneIndex));

      const result = NoteCalculator.judgeNote(
        laneIndex,
        currentTimeRef.current,
        notesRef.current
      );

      if (!result) return;

      if (result.judgement === 'MISS') {
        setCombo(0);
        setEffects(effects => [
          ...effects,
          {
            type: 'judge',
            lane: laneIndex,
            judgement: 'MISS',
            combo: 0,
            id: crypto.randomUUID(),
          },
        ]);
        return;
      }

      if (result.note.type === 'long') {
        setNotes(prev =>
          prev.map(note =>
            note === result.note
              ? { ...note, holding: true, hit: true }
              : note
          )
        );
        setCombo(prev => {
          const next = prev + 1;

          setEffects(prev =>
            prev.some(
              e =>
                e.type === 'long' &&
                e.noteId === `${result.note.timing}-${result.note.lane}`
            )
              ? prev
              : [
                  ...prev,
                  {
                    type: 'long',
                    lane: laneIndex,
                    noteId: `${result.note.timing}-${result.note.lane}`,
                  },
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
        setNotes(prev =>
          prev.map(note => (note === result.note ? { ...note, hit: true } : note))
        );

        setCombo(prev => {
          const next = prev + 1;

          setEffects(effects => [
            ...effects,
            {
              type: 'tap',
              lane: laneIndex,
              id: crypto.randomUUID(),
            },
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
      }

      const addScore = GAME_CONFIG.SCORE[result.judgement];
      setScore(prev => prev + addScore);
    };

    const handleKeyRelease = laneIndex => {
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
            note === result.note
              ? { ...note, hit: true, holding: false, released: true } // ★ FIX
              : note
          )
        );

        setEffects(prev =>
          prev.filter(
            e =>
              !(e.type === 'long' &&
                e.noteId === `${result.note.timing}-${result.note.lane}`) // ★ FIX
          )
        );
        setScore(prev => prev + GAME_CONFIG.SCORE[result.judgement]);
      } else {
        setNotes(prev =>
          prev.map(note => {
            if (note.lane === laneIndex && note.holding) {
              setCombo(0);
              setEffects(prevEffects =>
                prevEffects.filter(
                  e =>
                    !(e.type === 'long' &&
                      e.noteId === `${note.timing}-${note.lane}`)
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
          notes={notes.filter(n => {
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
