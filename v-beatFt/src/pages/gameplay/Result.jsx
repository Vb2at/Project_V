import { getClassByRatio } from "../../util/scoreClass";
import axios from 'axios';
import Background from '../../components/Common/Background';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import {
  playResultEnter,
  startResultBgm,
  stopResultBgm,
  playMenuConfirm,
} from '../../components/engine/SFXManager';

const GRADE_STYLE = {
  S: { color: '#ffd75e', glow: 'rgba(255,215,94,0.9)' },
  A: { color: '#6ffcff', glow: 'rgba(111,252,255,0.9)' },
  B: { color: '#7dff9a', glow: 'rgba(125,255,154,0.9)' },
  C: { color: '#6fa8ff', glow: 'rgba(111,168,255,0.9)' },
  D: { color: '#b38cff', glow: 'rgba(179,140,255,0.9)' },
  F: { color: '#ff6b6b', glow: 'rgba(255,107,107,0.9)' },
};

// ──────────────── ★ 수정 1: baseMaxScore를 받도록 추가 ★ ────────────────
function ScoreCard({ title, score, maxScore, maxCombo, grade, glowColor, baseMaxScore }) {
  const ratio = baseMaxScore > 0 ? score / baseMaxScore : 0;   // ← 통일 기준 사용
  const gradeStyle = GRADE_STYLE[grade] ?? GRADE_STYLE.F;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '22px',
          background: glowColor ?? 'rgba(255,80,80,0.45)',
          filter: 'blur(12px)',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'relative',
          padding: '40px 56px',
          borderRadius: '16px',
          background: '#111',
          color: '#e6faff',
          minWidth: 260,
          boxShadow: `
            0 0 24px ${glowColor ?? 'rgba(255,80,80,0.35)'},
            0 0 48px ${glowColor ?? 'rgba(255,0,0,0.25)'}
          `,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 4 }}>
          {title}
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 72,
            fontWeight: 900,
            color: gradeStyle.color,
            textShadow: `
              0 0 12px ${gradeStyle.glow},
              0 0 32px ${gradeStyle.glow}
            `,
          }}
        >
          {grade}
        </div>

        <div style={{ marginTop: 16, fontSize: 18 }}>점수: {score}</div>
        <div style={{ marginTop: 8, fontSize: 18 }}>최대 콤보: {maxCombo}</div>
        <div style={{ marginTop: 8, opacity: 0.7 }}>
          달성률: {(ratio * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const savedRef = useRef(false);

  const state = location.state ?? {};
  const isMulti = state.mode === 'multi';

  const myScore = state.myScore ?? 0;
  const rivalScore = state.rivalScore ?? 0;

  const myMaxScore = state.myMaxScore ?? 1;
  const rivalMaxScore = state.rivalMaxScore ?? 1;

  const myMaxCombo = state.myMaxCombo ?? 0;
  const rivalMaxCombo = state.rivalMaxCombo ?? 0;

  const myNick = state.myNickname ?? 'ME';
  const rivalNick = state.rivalNickname ?? 'RIVAL';

  const songId = state.songId;
  const diff = state.diff;
  const winByLeave = !!state.winByLeave;

  const isGuest = state.viewer === 'guest';

  const LEFT = {
    nickname: isGuest ? rivalNick : myNick,
    score: isGuest ? rivalScore : myScore,
    maxScore: isGuest ? rivalMaxScore : myMaxScore,
    maxCombo: isGuest ? rivalMaxCombo : myMaxCombo,
  };

  const RIGHT = {
    nickname: isGuest ? myNick : rivalNick,
    score: isGuest ? myScore : rivalScore,
    maxScore: isGuest ? myMaxScore : rivalMaxScore,
    maxCombo: isGuest ? myMaxCombo : rivalMaxCombo,
  };

  // ──────────────── ★ 수정 2: 공통 기준 확정 ★ ────────────────
  const baseMaxScore = LEFT.maxScore;   // ← 두 카드의 “유일 기준”

  const leftRatio = baseMaxScore > 0 ? LEFT.score / baseMaxScore : 0;
  const rightRatio = baseMaxScore > 0 ? RIGHT.score / baseMaxScore : 0;

  const leftGrade = getClassByRatio(leftRatio);
  const rightGrade = getClassByRatio(rightRatio);

  useEffect(() => {
    playResultEnter();
    startResultBgm();

    if (songId && !savedRef.current) {
      savedRef.current = true;

      if (!isMulti) {
        const payload = {
          songId,
          diff,
          score: LEFT.score,
          accuracy:
            LEFT.maxScore > 0
              ? (LEFT.score / LEFT.maxScore) * 100
              : 0,
          grade: leftGrade,
          maxCombo: LEFT.maxCombo,
        };

        axios.post('/api/scores', payload).catch(err =>
          console.error('점수 저장 실패', err)
        );
      }
    }

    return () => stopResultBgm();
  }, []);

  let multiResultText = 'DRAW';
  if (winByLeave || LEFT.score > RIGHT.score) multiResultText = 'WIN';
  else if (LEFT.score < RIGHT.score) multiResultText = 'LOSE';

  const resultColor =
    multiResultText === 'WIN'
      ? '#ff6b6b'
      : multiResultText === 'LOSE'
        ? '#5aeaff'
        : '#ffffff';

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Background />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {isMulti && (
            <>
              <div
                style={{
                  padding: '18px 60px',
                  borderRadius: 14,
                  background: '#111',
                  marginBottom: 28,
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: 4,
                  color: resultColor,
                  textShadow: `0 0 12px ${resultColor}`,
                  boxShadow: `0 0 28px ${resultColor}`,
                }}
              >
                {multiResultText}
              </div>

              <div style={{ display: 'flex', gap: 48 }}>
                <ScoreCard
                  title={LEFT.nickname}
                  score={LEFT.score}
                  maxScore={LEFT.maxScore}
                  maxCombo={LEFT.maxCombo}
                  grade={leftGrade}
                  baseMaxScore={baseMaxScore}   // ← 통일 기준 전달
                />

                <ScoreCard
                  title={RIGHT.nickname}
                  score={RIGHT.score}
                  maxScore={RIGHT.maxScore}
                  maxCombo={RIGHT.maxCombo}
                  grade={rightGrade}
                  glowColor="rgba(90,234,255,0.45)"
                  baseMaxScore={baseMaxScore}   // ← 통일 기준 전달
                />
              </div>
            </>
          )}

          {!isMulti && (
            <ScoreCard
              title="S C O R E"
              score={LEFT.score}
              maxScore={LEFT.maxScore}
              maxCombo={LEFT.maxCombo}
              grade={leftGrade}
              baseMaxScore={LEFT.maxScore}
            />
          )}

          <div
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => {
                playMenuConfirm();
                stopResultBgm();
                window.__ALLOW_LEAVE__ = true;
                window.location.href = '/main';
              }}
              style={btnStyle}
            >
              메인으로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '12px 28px',
  borderRadius: 8,
  background: '#222',
  color: '#fff',
  border: '1px solid #555',
  cursor: 'pointer',
  fontSize: 16,
};
