// src/pages/gameplay/Result.jsx
import { getClassByRatio } from "../../util/scoreClass";

export default function Result({ score = 0, maxScore = 1 }) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const grade = getClassByRatio(ratio);

  return (
    <div style={{ minHeight: '100vh', padding: '80px 24px', color: '#e6faff' }}>
      <div style={{ fontSize: 28, fontWeight: 800 }}>RESULT</div>

      <div style={{ marginTop: 24, fontSize: 18 }}>
        점수: {score}
      </div>

      <div style={{ marginTop: 12, fontSize: 18 }}>
        등급: {grade}
      </div>

      <div style={{ marginTop: 12, opacity: 0.7 }}>
        달성률: {(ratio * 100).toFixed(2)}%
      </div>
    </div>
  );
}
