// pages/GamePlay.jsx
import Header from '../components/common/Header';
import GameSession from '../components/engine/GameSession';


function GamePlay() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <GameSession />
    </div>
  );
}

export default GamePlay;
