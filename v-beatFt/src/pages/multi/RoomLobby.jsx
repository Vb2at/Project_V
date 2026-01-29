import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Common/Header';
import Visualizer from '../../components/visualizer/Visualizer';
import { getMenuAnalyser, playMenuConfirm } from '../../components/engine/SFXManager';
import Background from '../../components/Common/Background';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

function formatTime(sec) {
  if (!sec && sec !== 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RoomLobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const analyserRef = useRef(null);
  const stompRef = useRef(null);

  const [myUserId, setMyUserId] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [players, setPlayers] = useState([]);

  /* =========================
     초기 방 정보 로드 (REST)
  ========================= */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`/api/multi/rooms/${roomId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('방 정보 로드 실패');

        const data = await res.json();
        if (!alive) return;

        setRoomInfo(data.room);
        setPlayers(data.players || []);
        setMyUserId(data.myUserId); // ✅ 내 userId 세팅
      } catch (e) {
        alert('방 정보를 불러오지 못했습니다.');
        navigate(-1);
      }
    })();

    return () => {
      alive = false;
    };
  }, [roomId, navigate]);

  /* =========================
     STOMP 연결
  ========================= */
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 3000,
      debug: () => {},

      onConnect: () => {
        // 방 입장 알림
        client.publish({
          destination: '/app/multi/join',
          body: JSON.stringify({ roomId }),
        });

        // 방 상태 구독
        client.subscribe(`/topic/multi/room/${roomId}`, (msg) => {
          let data;
          try {
            data = JSON.parse(msg.body);
          } catch {
            return;
          }

          if (data.type === 'ROOM_STATE') {
            setPlayers(data.players || []);
          }

          if (data.type === 'START') {
            playMenuConfirm();
            navigate(`/game/play?mode=multi&roomId=${roomId}`);
          }
        });
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      try {
        client.deactivate();
      } finally {
        stompRef.current = null;
      }
    };
  }, [roomId, navigate]);

  /* =========================
     Visualizer analyser 연결
  ========================= */
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

  /* =========================
     내 정보 / 호스트 판정
  ========================= */
  if (!roomInfo) return null;

  const isHost =
    myUserId != null && Number(myUserId) === Number(roomInfo.hostUserId);

  const me =
    players.find((p) => Number(p.userId) === Number(myUserId)) || null;

  const opponent =
    players.find((p) => Number(p.userId) !== Number(myUserId)) || null;

  /* =========================
     Ready / Start / Leave
  ========================= */
  const toggleReady = () => {
    if (!stompRef.current) return;

    stompRef.current.publish({
      destination: '/app/multi/ready',
      body: JSON.stringify({ roomId }),
    });
  };

  const startGame = () => {
    if (!stompRef.current) return;

    stompRef.current.publish({
      destination: '/app/multi/start',
      body: JSON.stringify({ roomId }),
    });
  };

  const leaveRoom = () => {
    navigate(-1);
  };

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background />
      <Header />

      {/* ===== 로비 UI ===== */}
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
              {players.length} / {roomInfo.maxPlayers}
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <button style={btnGhost} onClick={leaveRoom}>
                나가기
              </button>
            </div>
          </div>

          {/* ===== 중앙 카드 ===== */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <PlayerCard title="나" player={me} />

            <div style={centerCard}>
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

              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                {roomInfo.songTitle}
              </div>

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

              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
                LENGTH {formatTime(roomInfo.lengthSec)}
              </div>

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

            <PlayerCard title="상대방" player={opponent} />
          </div>

          {/* ===== 하단 버튼 ===== */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <button style={btnPrimary} onClick={toggleReady}>
              {me?.ready ? 'READY 취소' : 'READY'}
            </button>

            {isHost && (
              <button style={btnPrimaryStrong} onClick={startGame}>
                START
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Visualizer ===== */}
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
  const waiting = !player;

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
        {player?.nickname ?? 'WAITING...'}
      </div>

      {!waiting && (
        <>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {player?.ready ? 'READY' : 'WAITING'}
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
