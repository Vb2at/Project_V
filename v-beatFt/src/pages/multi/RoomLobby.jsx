// src/pages/multi/RoomLobby.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import Header from '../../components/Common/Header';
import Visualizer from '../../components/visualizer/Visualizer';
import { getMenuAnalyser, playMenuConfirm } from '../../components/engine/SFXManager';
import Background from '../../components/Common/Background';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

// 프로필 이미지 경로 정리 함수
function resolveProfileImg(src) {
  if (!src) return null;

  // 카카오 (절대 url)
  if (src.startsWith('http')) return src;

  // 슬래시 없는 서버 경로
  if (!src.startsWith('/')) {
    return `http://localhost:8080/${src}`;
  }

  // 슬래시 있는 서버 경로
  return `http://localhost:8080${src}`;
}

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
  const opponentRef = useRef(null);

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
  const songTitleRef = useRef(null);
  const [isTitleOverflow, setIsTitleOverflow] = useState(false);

  useEffect(() => {
    if (document.getElementById('vb-marquee-style')) return;

    const style = document.createElement('style');
    style.id = 'vb-marquee-style';
    style.innerHTML = `
    @keyframes vb-marquee {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-100%); }
    }
  `;
    document.head.appendChild(style);
  }, []);


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

  useEffect(() => {
    const el = songTitleRef.current;
    if (!el) return;

    // 실제 내용 길이가 컨테이너보다 길면 true
    setIsTitleOverflow(el.scrollWidth > el.clientWidth);
  }, [roomInfo?.songTitle]);

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
            setPlayers(data.players || []);
            return;
          }

          if (data.type === 'START') {
            playMenuConfirm();

            const op = opponentRef.current;

            navigate(
              `/game/play?mode=multi&roomId=${roomId}&songId=${roomInfo.songId}&startAt=${data.startAt}`,
              {
                state: {
                  rival: op
                    ? {
                      userId: op.userId,
                      nickname: op.nickname,
                      profileUrl: op.profileImg,
                    }
                    : null,
                },
              }
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

  opponentRef.current = opponent;

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
              <button style={neonBtnDanger} onClick={leaveRoom}>
                나가기
              </button>
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

              <div style={ghostSongTitleWrap}>
                <div
                  style={{
                    ...ghostSongTitleBase,
                    ...(isTitleOverflow
                      ? ghostSongTitleMarquee
                      : { textAlign: 'center', width: '100%' }),
                  }}
                  ref={songTitleRef}
                >
                  {sanitizeTitle(roomInfo.songTitle)}
                </div>
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
            <button
              onClick={toggleReady}
              disabled={!me}
              style={
                !me
                  ? neonBtnDisabled
                  : me?.ready
                    ? neonBtnActive
                    : neonBtn
              }
            >
              {me?.ready ? 'NOT READY' : 'READY'}
            </button>

            {isHost && me?.ready && opponent?.ready && (
              <button
                onClick={startGame}
                style={neonBtnActive}
              >
                START
              </button>
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
        {player?.profileImg ? (
          <img
            src={resolveProfileImg(player.profileImg)}
            onError={(e) => {
              e.currentTarget.src = '/assets/default_profile.png';
            }}
            alt=""
            style={ghostImg}
          />
        ) : (
          <div style={ghostPlaceholder}>PROFILE</div>
        )}
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
const ghostSongTitleWrap = {
  width: 260,            // 중앙 카드 폭에 맞춤
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

const ghostSongTitleMarquee = {
  display: 'inline-block',
  paddingLeft: '100%',
  animation: 'vb-marquee 20s linear infinite',
};

const ghostSongTitleBase = {
  fontSize: 30,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
const neonBtn = {
  minWidth: 140,
  height: 44,
  padding: '0 28px',
  borderRadius: 12,
  background: 'rgba(10,20,30,0.9)',
  border: '1px solid rgba(90,234,255,0.6)',
  color: '#5aeaff',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '0.15em',
  cursor: 'pointer',
  boxShadow: `
    inset 0 0 12px rgba(90,234,255,0.35),
    0 0 18px rgba(90,234,255,0.45)
  `,
  transition: 'all 0.2s ease',
};

const neonBtnActive = {
  ...neonBtn,
  background: 'rgba(90,234,255,0.18)',
  color: '#ffffff',
  boxShadow: `
    inset 0 0 18px rgba(90,234,255,0.6),
    0 0 26px rgba(90,234,255,0.8)
  `,
};

const neonBtnDisabled = {
  ...neonBtn,
  opacity: 0.35,
  cursor: 'default',
  boxShadow: 'none',
};
const neonBtnDanger = {
  minWidth: 110,
  height: 36,
  padding: '0 22px',
  borderRadius: 10,
  background: 'rgba(30,10,10,0.9)',
  border: '1px solid rgba(255,90,90,0.6)',
  color: '#ff6b6b',
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '0.1em',
  cursor: 'pointer',
  boxShadow: `
    inset 0 0 10px rgba(255,90,90,0.35),
    0 0 16px rgba(255,90,90,0.45)
  `,
  transition: 'all 0.2s ease',
};
