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

function ScoreCard({ title, score, maxScore, maxCombo, grade, glowColor }) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
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

  // ---------- 정규화 ----------
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

  // ============================
  // ★★★ 핵심: 항상 ME = 왼쪽, 상대 = 오른쪽 ★★★
  // ============================
  const LEFT = {
    nickname: myNick,
    score: myScore,
    maxScore: myMaxScore,
    maxCombo: myMaxCombo,
  };

  const RIGHT = {
    nickname: rivalNick,
    score: rivalScore,
    maxScore: rivalMaxScore,
    maxCombo: rivalMaxCombo,
  };

  const myRatio = LEFT.maxScore > 0 ? LEFT.score / LEFT.maxScore : 0;
  const rivalRatio = RIGHT.maxScore > 0 ? RIGHT.score / RIGHT.maxScore : 0;

  const myGrade = getClassByRatio(myRatio);
  const rivalGrade = getClassByRatio(rivalRatio);

  // ---------- BGM + 싱글 점수 저장 ----------
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
          grade: myGrade,
          maxCombo: LEFT.maxCombo,
        };

        axios.post('/api/scores', payload).catch(err =>
          console.error('점수 저장 실패', err)
        );
      }
    }

    return () => stopResultBgm();
  }, []);

  // ---------- 승패 판정 ----------
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
                  grade={myGrade}
                />

                <ScoreCard
                  title={RIGHT.nickname}
                  score={RIGHT.score}
                  maxScore={RIGHT.maxScore}
                  maxCombo={RIGHT.maxCombo}
                  grade={rivalGrade}
                  glowColor="rgba(90,234,255,0.45)"
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
              grade={myGrade}
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
                navigate('/main');
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
