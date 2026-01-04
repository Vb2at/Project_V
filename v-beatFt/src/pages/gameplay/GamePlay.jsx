import { useEffect, useState } from 'react';
import Header from '../../components/Common/Header';
import GameSession from '../../components/engine/GameSession';
import Background from '../../components/Common/Background';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import HUD from './HUD.jsx';
import HUDFrame from './HUDFrame.jsx';
import { useNavigate } from 'react-router-dom';

function GamePlay() {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  // ✅ URL에서 songId/diff 읽기
  const getSongIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('songId') || '1';
  };
  const getDiffFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('diff') || 'unknown';
  };

  const [songId, setSongId] = useState(getSongIdFromUrl());
  const [diff, setDiff] = useState(getDiffFromUrl());

  const [songProgress, setSongProgress] = useState(0);
  const [classProgress, setClassProgress] = useState(0);
  const navigate = useNavigate();
  const [finished, setFinished] = useState(false);
  const HEADER_HEIGHT = 25;

  // ✅ 주소창이 바뀌면 반영(popstate)
  useEffect(() => {
    const onPopState = () => {
      setSongId(getSongIdFromUrl());
      setDiff(getDiffFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        paddingTop: HEADER_HEIGHT + 'px',
        background: 'transparent',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Background />
      <Header />

      {/* ✅ LeftSidebar에 songId 반드시 넘김 */}
      <LeftSidebar songId={songId} diff={diff} />

      <RightSidebar />

      <HUDFrame>
        <HUD
          score={score}
          combo={combo}
          songProgress={1}
          classProgress={0.5}
        />
      </HUDFrame>

      <div
        style={{
          position: 'absolute',
          top: `calc(48% + ${HEADER_HEIGHT / 2}px)`,
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <GameSession
          onState={({ score, combo, diff, currentTime, duration, maxScore }) => {
            setScore(score);
            setCombo(combo);

            // ✅ 게임 쪽에서 diff가 오면 그걸로 업데이트(원래 로직 유지)
            if (diff) setDiff(diff);

            setSongProgress(
              duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
            );
            setClassProgress(
              maxScore > 0 ? Math.min(1, Math.max(0, score / maxScore)) : 0
            );
          }}
          onFinish={({ score, maxScore }) => {
            if (finished) return;
            setFinished(true);
            navigate('/game/result', { state: { score, maxScore } });
          }}
        />
      </div>
    </div>
  );
}

export default GamePlay;
