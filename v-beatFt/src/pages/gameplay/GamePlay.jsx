import { useState } from 'react';
import Header from '../../components/common/Header';
import GameSession from '../../components/engine/GameSession';
import Background from '../../components/common/Background';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import { GAME_CONFIG } from "../../constants/GameConfig";
function GamePlay() {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [diff, setDiff] = useState(
    new URLSearchParams(window.location.search).get('diff') || 'unknown'
  );
  const HEADER_HEIGHT = 25;
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
      <LeftSidebar
        score={score}
        combo={combo}
        diff={diff}
      />
      <RightSidebar/>
      <div
        style={{
          position: 'absolute',
          top:  `calc(48% + ${HEADER_HEIGHT / 2}px)`,
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <GameSession
          onState={({ score, combo, diff }) => {
            setScore(score);
            setCombo(combo);
            setDiff(diff);
            
          }}
        />
      </div>
    </div>
  );
}

export default GamePlay;
