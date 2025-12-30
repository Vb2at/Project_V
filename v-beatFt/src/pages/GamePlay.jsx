import Header from '../components/common/Header';
import GameSession from '../components/engine/GameSession';
import { GAME_CONFIG } from "../constants/GameConfig";

function GamePlay() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Header />

      {/* 🔥 화면 정중앙 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <GameSession />
      </div>
    </div>
  );
}

export default GamePlay;
