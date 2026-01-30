// src/pages/multi/RoomLobby.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import Header from '../../components/Common/Header';
import Visualizer from '../../components/visualizer/Visualizer';
import { getMenuAnalyser, playMenuConfirm } from '../../components/engine/SFXManager';
import Background from '../../components/Common/Background';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

function formatTime(sec) {
  if (sec == null || isNaN(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function sanitizeTitle(t) {
  if (!t) return '';
  return String(t).replace(/\.mp3$/i, '');
}

export default function RoomLobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const analyserRef = useRef(null);
  const stompRef = useRef(null);

  // ✅ 중복/지연 문제 방지용
  const closedHandledRef = useRef(false);      // ROOM_CLOSED 한 번만 처리
  const leavingByButtonRef = useRef(false);    // 나가기 버튼으로 나가는 중(호스트 포함)

  const [myUserId, setMyUserId] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [players, setPlayers] = useState([]);

  const isHost = useMemo(() => {
    if (!roomInfo || myUserId == null) return false;
    return Number(myUserId) === Number(roomInfo.hostUserId);
  }, [roomInfo, myUserId]);
  const lengthSec =
    roomInfo?.length ??
    roomInfo?.duration ??
    roomInfo?.lengthSec ??
    null;
  /* =========================
     초기 방 입장 + 정보 로드
  ========================= */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const joinRes = await fetch(`/api/multi/rooms/${roomId}/join`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!joinRes.ok) throw new Error('방 입장 실패');

        const res = await fetch(`/api/multi/rooms/${roomId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('방 정보 로드 실패');

        const data = await res.json();
        if (!alive) return;
        if (!data?.ok) throw new Error(data?.message || '방 정보 로드 실패');

        setRoomInfo(data.room);
        setPlayers(data.players || []);
        setMyUserId(data.myUserId);
      } catch {
        alert('방 정보를 불러오지 못했습니다.');
        navigate('/main');
      }
    })();

    return () => { alive = false; };
  }, [roomId, navigate]);

  /* =========================
     STOMP
  ========================= */
  useEffect(() => {
    if (!roomId || !roomInfo) return;

    closedHandledRef.current = false;
    leavingByButtonRef.current = false;

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 3000,
      debug: () => { },

      onConnect: () => {
        client.publish({
          destination: '/app/multi/enter',
          body: JSON.stringify({ roomId }),
        });

        const subRoom = client.subscribe(`/topic/multi/room/${roomId}`, (msg) => {
          const data = JSON.parse(msg.body);

          if (data.type === 'ROOM_STATE') {
            console.log('[ROOM_STATE players]', data.players);
            setPlayers(data.players || []);
            return;
          }

          if (data.type === 'START') {
            playMenuConfirm();

            // ✅ 여기서 songId는 항상 보장됨
            navigate(
              `/game/play?mode=multi&roomId=${roomId}&songId=${roomInfo.songId}&startAt=${data.startAt}`
            );
          }
        });

        const subClosed = client.subscribe('/user/queue/room-closed', () => {
          if (closedHandledRef.current) return;
          closedHandledRef.current = true;

          sessionStorage.setItem('roomClosed', '1');
          sessionStorage.setItem('roomClosedRoomId', String(roomId));
          sessionStorage.setItem('roomClosedTs', String(Date.now()));

          navigate('/main', { replace: true });
        });

        client.__vbeatSubs = { subRoom, subClosed };
      },
    });

    client.activate();
    stompRef.current = client;

    return () => {
      try {
        const subs = client.__vbeatSubs;
        subs?.subRoom?.unsubscribe?.();
        subs?.subClosed?.unsubscribe?.();
      } catch { }

      stompRef.current = null;
      client.deactivate();
    };
  }, [roomId, roomInfo, navigate]);


  /* =========================
     Visualizer
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

  if (!roomInfo) return null;

  const me =
    myUserId != null
      ? players.find(p => Number(p.userId) === Number(myUserId)) || null
      : null;

  const opponent =
    myUserId != null
      ? players.find(p => Number(p.userId) !== Number(myUserId)) || null
      : null;

  const toggleReady = () => {
    stompRef.current?.publish({
      destination: '/app/multi/ready',
      body: JSON.stringify({ roomId }),
    });
  };

  const startGame = () => {
    stompRef.current?.publish({
      destination: '/app/multi/start',
      body: JSON.stringify({ roomId }),
    });
  };

  const leaveRoom = () => {
    leavingByButtonRef.current = true;

    // ✅ 방장/상대 모두 leave는 서버에 전송
    stompRef.current?.publish({
      destination: '/app/multi/leave',
      body: JSON.stringify({ roomId }),
    });

    // ✅ 상대: 그냥 즉시 메인으로 나가기
    if (!isHost) {
      navigate('/main');
      return;
    }

    // ✅ 방장: 방을 폭파시키는 주체이므로,
    // '방 종료' 플래그를 여기서 먼저 찍고 메인으로 이동
    // (ROOM_CLOSED 메시지를 기다리면 MainOverlay/RoomLobby 중복 처리로 2번 뜰 수 있음)
    if (!closedHandledRef.current) {
      closedHandledRef.current = true;
      sessionStorage.setItem('roomClosed', '1');
      sessionStorage.setItem('roomClosedRoomId', String(roomId));
      sessionStorage.setItem('roomClosedTs', String(Date.now()));
    }

    navigate('/main', { replace: true });
  };

  const coverSrc = roomInfo.coverPath || '';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Background />
      <Header />

      <div style={{ position: 'absolute', inset: 0, top: 64, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          width: '75%',
          height: '65%',
          background: 'rgba(10,20,30,0.75)',
          border: '2px solid rgba(90,234,255,0.6)',
          borderRadius: 18,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{roomInfo.roomName}</div>
            <div style={{ opacity: 0.7 }}>{players.length} / {roomInfo.maxPlayers}</div>
            <div style={{ marginLeft: 'auto' }}>
              <button style={btnGhost} onClick={leaveRoom}>나가기</button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
            <PlayerCard title="나" player={me} hostUserId={roomInfo.hostUserId} />

            <div style={ghostCenter}>
              <div style={ghostCover}>
                {coverSrc
                  ? <img src={coverSrc} alt="" style={ghostCoverImg} />
                  : <div style={ghostPlaceholder}>COVER</div>
                }
              </div>

              <div style={ghostSongTitle}>
                {sanitizeTitle(roomInfo.songTitle)}
              </div>

              <div
                style={{
                  ...ghostDiff,
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  color:
                    DIFF_COLOR_MAP[String(roomInfo.diff).toUpperCase()] || '#ccc',
                }}
              >
                {String(roomInfo.diff).toUpperCase()}
              </div>

              <div style={ghostMeta}>
                LENGTH {formatTime(lengthSec)}
              </div>
              <div style={ghostRoomId}>Room ID: {roomId}</div>
            </div>

            <PlayerCard title="상대방" player={opponent} hostUserId={roomInfo.hostUserId} />

          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <button style={btnPrimary} onClick={toggleReady} disabled={!me}>
              {me?.ready ? 'NOT READY' : 'READY'}
            </button>
            {isHost && me?.ready && opponent?.ready && (
              <button style={btnPrimaryStrong} onClick={startGame}>START</button>
            )}
          </div>
        </div>
      </div>

      <Visualizer size="game" preset="menu" analyserRef={analyserRef} active />
    </div>
  );
}

/* ===== Player Card ===== */
function PlayerCard({ title, player, hostUserId }) {
  const waiting = !player;

  return (
    <div style={ghostCard}>
      <div style={ghostTitle}>{title}</div>

      <div style={ghostProfile}>
        {player?.profileImg
          ? <img src={player.profileImg} alt="" style={ghostImg} />
          : <div style={ghostPlaceholder}>PROFILE</div>
        }
      </div>

      <div style={ghostName}>
        {waiting
          ? 'WAITING'
          : (
            <>
              {Number(player.userId) === Number(hostUserId) && '👑 '}
              {player.nickname}
            </>
          )
        }
      </div>

      {!waiting && <div style={ghostRecord}>12W · 8L</div>}

      <div
        style={{
          ...ghostStatus,
          color: waiting || !player?.ready ? '#ff5a5a' : '#5aeaff',
          fontWeight: waiting || !player?.ready ? 700 : 600,
        }}
      >
        {waiting ? 'NOT READY' : player.ready ? 'READY' : 'NOT READY'}
      </div>
    </div>
  );
}

/* ===== Styles ===== */
const ghostCard = {
  borderRadius: 14,
  border: '1px solid rgba(90,234,255,0.25)',
  padding: '30px 30px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 30,
  background: 'rgba(0,0,0,0.15)',
};

const ghostTitle = { fontSize: 20, opacity: 0.4 };
const ghostProfile = {
  width: 72, height: 72, borderRadius: 12,
  background: 'rgba(255,255,255,0.05)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const ghostImg = { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 };
const ghostPlaceholder = { fontSize: 10, opacity: 0.3 };
const ghostName = { fontSize: 20, fontWeight: 500 };
const ghostRecord = { fontSize: 20, opacity: 0.35 };
const ghostStatus = { marginTop: 6, fontSize: 15, letterSpacing: '0.2em' };

const ghostCenter = {
  borderRadius: 14,
  border: '1px solid rgba(90,234,255,0.35)',
  padding: '26px 18px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  background: 'rgba(0,0,0,0.18)',
};

const ghostCover = {
  width: 200, height: 200, borderRadius: 10,
  overflow: 'hidden', background: 'rgba(255,255,255,0.06)',
};
const ghostCoverImg = { width: '100%', height: '100%', objectFit: 'cover' };
const ghostSongTitle = { fontSize: 30, fontWeight: 600 };
const ghostDiff = { fontSize: 30 };
const ghostMeta = { fontSize: 11, opacity: 0.8 };
const ghostRoomId = { fontSize: 10, opacity: 0.8 };

const btnGhost = { padding: '6px 14px' };
const btnPrimary = { padding: '10px 28px' };
const btnPrimaryStrong = { ...btnPrimary, fontWeight: 700 };

const DIFF_COLOR_MAP = {
  EASY: '#5aeaff',
  NORMAL: '#6cff5a',
  HARD: '#ffb85a',
  HELL: '#ff5a5a',
};