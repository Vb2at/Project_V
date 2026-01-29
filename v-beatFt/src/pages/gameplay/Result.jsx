// src/pages/gameplay/Result.jsx
import { getClassByRatio } from "../../util/scoreClass";
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

// 점수 저장 api 연동
async function postScore(payload) {
  const res = await fetch("http://localhost:8080/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to save score");
  }
  return;
}

// ===== 공용 카드 컴포넌트 =====
function ScoreCard({ title, score, maxScore, maxCombo, glowColor }) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const grade = getClassByRatio(ratio);
  const gradeStyle = GRADE_STYLE[grade] ?? GRADE_STYLE.F;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* 네온 윤곽 */}
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

      {/* 카드 */}
      <div
        style={{
          position: 'relative',
          padding: '40px 56px',
          borderRadius: '16px',
          background: '#111',
          isolation: 'isolate',
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

        <div style={{ marginTop: 16, fontSize: 18 }}>
          점수: {score}
        </div>

        <div style={{ marginTop: 8, fontSize: 18 }}>
          최대 콤보: {maxCombo}
        </div>

        <div style={{ marginTop: 8, opacity: 0.7 }}>
          달성률: {(ratio * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const sentRef = useRef(false);

  useEffect(() => {
    playResultEnter();
    startResultBgm();
    return () => {
      stopResultBgm();
    };
  }, []);

  const {
    mode = 'single',

    songId = null,
    diff = null,

    score = 0,
    maxScore = 1,
    maxCombo = 0,
    isReview = false,

    // 멀티용
    myScore = score,
    myMaxScore = maxScore,
    myMaxCombo = maxCombo,

    rivalScore = 0,
    rivalMaxScore = maxScore,
    rivalMaxCombo = 0,
  } = state ?? {};

  const isMulti = mode === 'multi';

  const ratio = maxScore > 0 ? score / maxScore : 0;
  const grade = getClassByRatio(ratio);
  const accuracy = Number((ratio * 100).toFixed(2));

  // 싱글일 때만 점수 저장
  useEffect(() => {
    if (isMulti) return;

    if (isReview) return;

    if (sentRef.current) return;
    sentRef.current = true;

    if (!songId || !diff) return;

    postScore({ songId, diff, score, accuracy, grade, maxCombo })
      .catch((err) => {
        console.error("점수 저장 실패:", err);
      });
  }, [isMulti, songId, diff, score, accuracy, grade, maxCombo, isReview]);

  // 멀티 승패
  let multiResultText = 'DRAW';
  if (myScore > rivalScore) multiResultText = 'WIN';
  else if (myScore < rivalScore) multiResultText = 'LOSE';
  const resultColor =
    multiResultText === 'WIN'
      ? '#ff6b6b'   // 내가 승 → RED
      : multiResultText === 'LOSE'
        ? '#5aeaff'   // 상대 승 → CYAN
        : '#ffffff';  // DRAW → WHITE



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

          {/* ===== 멀티 ===== */}
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
                  title="ME"
                  score={myScore}
                  maxScore={myMaxScore}
                  maxCombo={myMaxCombo}
                />

                <ScoreCard
                  title="RIVAL"
                  score={rivalScore}
                  maxScore={rivalMaxScore}
                  maxCombo={rivalMaxCombo}
                  glowColor="rgba(90,234,255,0.45)"   // 시안계
                />
              </div>
            </>
          )}

          {/* ===== 싱글 ===== */}
          {!isMulti && (
            <ScoreCard
              title="S C O R E"
              score={score}
              maxScore={maxScore}
              maxCombo={maxCombo}
            />
          )}

          {/* ===== 버튼 ===== */}
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
            }}
          >
            {!isMulti && (
              <button
                onClick={() => {
                  playMenuConfirm();
                  navigate(-1);
                }}
                style={btnStyle}
              >
                다시하기
              </button>
            )}

            <button
              onClick={() => {
                playMenuConfirm();
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
