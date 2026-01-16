// src/pages/gameplay/Result.jsx
import { getClassByRatio } from "../../util/scoreClass";
import Background from '../../components/Common/Background';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { playResultEnter, startResultBgm, stopResultBgm, playMenuConfirm, } from '../../components/engine/SFXManager';

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
    credentials: "include",   //세션 쿠키
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to save score");
  }
  return;
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
    songId = null,
    diff = null,
    score = 0,
    maxScore = 1,
    maxCombo = 0,
    isReview = false,
  } = state ?? {};
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const grade = getClassByRatio(ratio);
  const gradeStyle = GRADE_STYLE[grade] ?? GRADE_STYLE.F;
  const accuracy = Number((ratio * 100).toFixed(2));

  useEffect(() => {
    if (isReview) {
      console.log('관리자 테스트 플레이: 기록 저장 안 함');
      return;
    }

    if (sentRef.current) return;
    sentRef.current = true;

    if (!songId || !diff) {
      console.warn("score 저장 실패: songId/diff 없음", { songId, diff });
      return;
    }

    postScore({ songId, diff, score, accuracy, grade, maxCombo })
      .catch((err) => {
        console.error("점수 저장 실패:", err);
      });
  }, [songId, diff, score, accuracy, grade, maxCombo, isReview]);
  
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Background />

      {/* 중앙 정렬 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* ===== 카드 + 버튼 전체 컨테이너 ===== */}
        <div style={{ textAlign: 'center' }}>

          {/* ===== 카드 전용 래퍼 ===== */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* 네온 윤곽 (카드 전용) */}
            <div
              style={{
                position: 'absolute',
                inset: -8,
                borderRadius: '22px',
                background: 'rgba(255,80,80,0.45)',
                filter: 'blur(12px)',
                pointerEvents: 'none',
                opacity: 0.6,
              }}
            />

            {/* 카드 */}
            <div
              style={{
                position: 'relative',
                padding: '48px 72px',
                borderRadius: '16px',
                background: '#111',
                isolation: 'isolate',
                color: '#e6faff',
                boxShadow: `
                  0 0 24px rgba(255,80,80,0.35),
                  0 0 48px rgba(255,0,0,0.25)
                `,
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 6 }}>
                S C O R E
              </div>

              <div
                style={{
                  marginTop: 28,
                  fontSize: 96,
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

              <div style={{ marginTop: 24, fontSize: 20 }}>
                점수: {score}
              </div>

              <div style={{ marginTop: 12, fontSize: 20 }}>
                최대 콤보: {maxCombo}
              </div>

              <div style={{ marginTop: 12, opacity: 0.7 }}>
                달성률: {(ratio * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* ===== 버튼 (완전 독립) ===== */}
          <div
            style={{
              marginTop: 28,
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
            }}
          >
            <button
              onClick={() => {
                playMenuConfirm();
                navigate(-1);
              }}
              style={{
                padding: '12px 28px',
                borderRadius: 8,
                background: '#222',
                color: '#fff',
                border: '1px solid #555',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              다시하기
            </button>

            <button
              onClick={() => {
                playMenuConfirm();
                navigate('/main');
              }}
              style={{
                padding: '12px 28px',
                borderRadius: 8,
                background: '#222',
                color: '#fff',
                border: '1px solid #555',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              나가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
