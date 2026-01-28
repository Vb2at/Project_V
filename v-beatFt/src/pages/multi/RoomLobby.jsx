// src/pages/multi/RoomLobby.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Common/Header';
import Visualizer from '../../components/visualizer/Visualizer';
import { getMenuAnalyser, playMenuMove, playMenuConfirm } from '../../components/engine/SFXManager';
import Background from '../../components/Common/Background';

function formatTime(sec) {
  if (!sec && sec !== 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RoomLobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // analyserRef 유지 (메뉴와 동일한 방식)
  const analyserRef = useRef(null);
  useEffect(() => {
    const id = setInterval(() => {
      const a = getMenuAnalyser();
      if (a) {
        analyserRef.current = a;
        clearInterval(id);
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  // ===== 테스트용 더미 데이터 =====
  const [roomInfo] = useState({
    roomName: 'music-free-458044',
    songTitle: 'Disco Night',
    artist: 'unknown',
    diff: 'HARD',
    lengthSec: 132,
    isPrivate: false,
    maxPlayers: 2,
    hostUserId: 1,
  });

  const [players, setPlayers] = useState([
    {
      userId: 1,
      nickname: 'YOU',
      ready: false,
      wins: 12,
      loses: 8,
      profileUrl: null,
      waiting: false,
    },
    {
      userId: 2,
      nickname: 'WAITING...',
      ready: false,
      wins: 0,
      loses: 0,
      profileUrl: null,
      waiting: true,
    },
  ]);

  const myUserId = 1; // 테스트용
  const isHost = myUserId === roomInfo.hostUserId;

  // 카운트다운 (null이면 미표시)
  const [countdown, setCountdown] = useState(null);

  const me = players.find(p => p.userId === myUserId);
  const opponent = players.find(p => p.userId !== myUserId);

  const toggleReady = () => {
    setPlayers(prev =>
      prev.map(p =>
        p.userId === myUserId ? { ...p, ready: !p.ready } : p
      )
    );
  };

  // ===== 상대방 입장(테스트) =====
  const simulateOpponentJoin = () => {
    playMenuConfirm(); // ✅ 상대 입장 사운드
    setPlayers(prev =>
      prev.map(p =>
        p.userId === 2
          ? {
            ...p,
            waiting: false,
            nickname: 'RIVAL',
            wins: 5,
            loses: 3,
            ready: false,
          }
          : p
      )
    );
  };

  // ===== START(테스트): 카운트다운 시작 =====
  const startCountdown = () => {
    if (!isHost) return;

    if (opponent?.waiting) {
      alert('상대방이 아직 입장하지 않았습니다.');
      return;
    }

    if (!me?.ready) {
      alert('READY를 먼저 눌러주세요.');
      return;
    }

    if (!opponent?.ready) {
      alert('상대방이 READY가 아닙니다.');
      return;
    }

    setCountdown(3);
  };

  // ===== 카운트다운 진행 + 사운드 =====
  useEffect(() => {
    if (countdown == null) return;

    if (countdown === 0) {
      playMenuConfirm(); // ✅ START 확정 사운드
      navigate(`/game/play?mode=multi&roomId=${roomId}`);
      return;
    }

    playMenuMove(); // ✅ 3,2,1 비프

    const id = setTimeout(() => {
      setCountdown(c => (typeof c === 'number' ? c - 1 : c));
    }, 900);

    return () => clearTimeout(id);
  }, [countdown, navigate, roomId]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background />
      <Header />

      {/* ===== 로비 UI 오버레이 ===== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: 64,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            width: '75%',
            height: '65%',
            background: 'rgba(10,20,30,0.75)',
            border: '2px solid rgba(90,234,255,0.6)',
            borderRadius: 18,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            position: 'relative',
          }}
        >
          {/* ===== 상단 바 ===== */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              borderBottom: '1px solid rgba(255,255,255,0.15)',
              paddingBottom: 10,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {roomInfo.roomName}
            </div>
            <div style={{ opacity: 0.7 }}>
              {players.filter(p => !p.waiting).length} / {roomInfo.maxPlayers}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              {isHost && opponent?.waiting && (
                <button style={btnGhost} onClick={simulateOpponentJoin}>
                  상대 입장(테스트)
                </button>
              )}

              {isHost && opponent && !opponent.waiting && (
                <button
                  style={btnGhost}
                  onClick={() =>
                    setPlayers(prev =>
                      prev.map(p =>
                        p.userId === opponent.userId
                          ? { ...p, ready: !p.ready }
                          : p
                      )
                    )
                  }
                >
                  상대 READY(테스트)
                </button>
              )}

              <button style={btnGhost} onClick={() => navigate(-1)}>
                나가기
              </button>
            </div>

          </div>

          {/* ===== 중앙 카드 영역 ===== */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 18,
              alignItems: 'center',
            }}
          >
            {/* ===== 나 ===== */}
            <PlayerCard title="나" player={me} />

            {/* ===== 방 + 곡 정보 ===== */}
            <div style={centerCard}>
              {/* 앨범 커버 */}
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #2a2f3a, #111)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                  fontSize: 12,
                  opacity: 0.6,
                }}
              >
                COVER
              </div>

              {/* 곡 제목 */}
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                {roomInfo.songTitle}
              </div>

              {/* 난이도 */}
              <div
                style={{
                  fontSize: 13,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: 'rgba(90,234,255,0.15)',
                  border: '1px solid rgba(90,234,255,0.5)',
                  marginBottom: 6,
                }}
              >
                {roomInfo.diff}
              </div>

              {/* ✅ 난이도 밑에 LENGTH만 */}
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
                LENGTH {formatTime(roomInfo.lengthSec)}
              </div>

              {/* 방 정보 블록 */}
              <div
                style={{
                  width: '100%',
                  marginTop: 6,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255,255,255,0.15)',
                  fontSize: 12,
                  opacity: 0.75,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  alignItems: 'center',
                }}
              >
                <div>{roomInfo.isPrivate ? '비공개 방' : '공개 방'}</div>
                <div>Room ID: {roomId}</div>
              </div>
            </div>

            {/* ===== 상대방 ===== */}
            <PlayerCard title="상대방" player={opponent} />
          </div>

          {/* ===== 하단 컨트롤 바 ===== */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <button style={btnPrimary} onClick={toggleReady}>
              {me?.ready ? 'READY 취소' : 'READY'}
            </button>

            {isHost && (
              <button style={btnPrimaryStrong} onClick={startCountdown}>
                START
              </button>
            )}
          </div>

          {/* ===== 카운트다운 오버레이 ===== */}
          {countdown != null && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 18,
                background: 'rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 96,
                fontWeight: 800,
                color: '#e6f7ff',
                textShadow: '0 0 20px rgba(90,234,255,0.55)',
                pointerEvents: 'none',
              }}
            >
              {countdown === 0 ? 'START' : countdown}
            </div>
          )}
        </div>
      </div>

      {/* ===== 비주얼라이저 유지 ===== */}
      <Visualizer
        size="game"
        preset="menu"
        analyserRef={analyserRef}
        active={true}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '28vh',
          zIndex: -2,
          pointerEvents: 'none',
        }}
      />

      {/* Blur Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          background: 'rgba(255,255,255,0.02)',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/* ===== Player Card ===== */

function PlayerCard({ title, player }) {
  const waiting = player?.waiting;

  const cardStyle = {
    ...playerCard,
    transition: 'all 0.35s ease',
    opacity: waiting ? 0.5 : 1,
    transform: waiting ? 'translateY(12px)' : 'translateY(0)',
  };

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, opacity: 0.7 }}>{title}</div>

      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          margin: '10px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          opacity: 0.6,
        }}
      >
        {waiting ? 'WAITING' : 'PROFILE'}
      </div>

      <div style={{ fontSize: 16, fontWeight: 600 }}>
        {player?.nickname ?? 'UNKNOWN'}
      </div>

      {!waiting && (
        <>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {player?.ready ? 'READY' : 'WAITING'}
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
            W {player?.wins ?? 0} / L {player?.loses ?? 0}
          </div>
        </>
      )}
    </div>
  );
}

/* ===== Styles ===== */

const playerCard = {
  height: '100%',
  borderRadius: 14,
  border: '1px solid rgba(90,234,255,0.35)',
  background: 'rgba(0,0,0,0.25)',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const centerCard = {
  height: '100%',
  borderRadius: 14,
  border: '1px solid rgba(90,234,255,0.5)',
  background: 'rgba(10,20,30,0.6)',
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
};

const btnGhost = {
  padding: '6px 14px',
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.3)',
  color: '#cfd8e3',
  cursor: 'pointer',
};

const btnPrimary = {
  padding: '10px 28px',
  borderRadius: 10,
  background: 'rgba(90,234,255,0.18)',
  border: '1px solid rgba(90,234,255,0.7)',
  color: '#5aeaff',
  fontSize: 14,
  cursor: 'pointer',
};

const btnPrimaryStrong = {
  ...btnPrimary,
  background: 'rgba(90,234,255,0.35)',
  border: '1px solid rgba(90,234,255,1)',
  fontWeight: 700,
};
