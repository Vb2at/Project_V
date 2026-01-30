// src/pages/multi/GamePlay.jsx
import { useEffect, useState, useRef } from 'react';
import { statusApi } from '../../api/auth';
import Header from '../../components/Common/Header';
import GameSession from '../../components/engine/GameSession';
import Background from '../../components/Common/Background';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import HUD from './HUD.jsx';
import HUDFrame from './HUDFrame.jsx';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingNoteRain from './LoadingNoteRain';
import { playCountTick, playCountStart } from '../../components/engine/SFXManager';
import { playMenuConfirm } from '../../components/engine/SFXManager';
import Visualizer from '../../components/visualizer/Visualizer';
import { LOADING_TIPS as TIPS } from '../../constants/LoadingTips';
import { useSearchParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';

const DEFAULT_SETTINGS = {
  fps: 60,
  hitEffect: true,
  judgeText: true,
  comboText: true,
  lowEffect: false,
  visualizer: true,
  tapNoteColor: 0x05acb5,
  longNoteColor: 0xb50549,
  bgmVolume: 100,
  sfxVolume: 100,
  bgmMuted: false,
  sfxMuted: false,
};

function GamePlay() {
  const { songId: paramSongId } = useParams();
  const [searchParams] = useSearchParams();

  const [settings, setSettings] = useState(() => {
    try {
      const v = localStorage.getItem('userSettings');
      const parsed = v ? JSON.parse(v) : {};
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // ===== 멀티 진입 파라미터 =====
  const mode = searchParams.get('mode'); // 'multi' | ...
  const roomId = searchParams.get('roomId'); // 멀티 방 id
  const isMulti = mode === 'multi' || Boolean(roomId);

  // 토큰 파라미터
  const tokenParam = searchParams.get('token');

  // ===== songId 결정 =====
  const baseSongId = paramSongId ?? searchParams.get('songId');

  // 멀티: URL에 songId가 없을 수 있으니 room에서 받아올 songId를 따로 관리
  const [multiSongId, setMultiSongId] = useState(null);
  const resolvedSongId = isMulti ? (multiSongId ?? baseSongId) : baseSongId;

  // 멀티: (선택) 서버가 startAt을 주면 여기 저장해서 GameSession으로 전달
  const [multiStartAt, setMultiStartAt] = useState(null);
  const startAtParam = searchParams.get('startAt');

  const [diff, setDiff] = useState('unknown');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [loadingDone, setLoadingDone] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [finished, setFinished] = useState(false);
  const [songProgress, setSongProgress] = useState(0);
  const [classProgress, setClassProgress] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [rivalResult, setRivalResult] = useState(null);
  const analyserRef = useRef(null);
  const [sessionKey, setSessionKey] = useState(0);

  // ✅ 오른쪽 사이드바에 들어갈 상대 상태(닉/프사/점수/콤보)
  const [rival, setRival] = useState(null);

  const MIN_LOADING_TIME = 2500;
  const loadingStartRef = useRef(0);
  const loadingEndRef = useRef(null);
  const HEADER_HEIGHT = 25;
  const [loginUser, setLoginUser] = useState(null);

  const navigate = useNavigate();

  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [song, setSong] = useState(null);

  // ✅ stomp single instance
  const stompRef = useRef(null);
  // const stompConnectedRef = useRef(false);

  // ===== 멀티 STOMP 연결 + 구독 + ROOM_STATE 요청 =====
  useEffect(() => {
    if (!isMulti || !roomId) return;

    const myId = String(loginUser?.loginUser?.id ?? '');

    const client = new Client({
      webSocketFactory: () =>
        new SockJS('http://localhost:8080/ws', null, { withCredentials: true }),

      connectHeaders: {},

      reconnectDelay: 3000,
      debug: () => { },

      onConnect: () => {
        stompRef.current = client;
        // 1) ROOM_STATE
        client.subscribe(`/topic/multi/room/${roomId}`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.type !== 'ROOM_STATE') return;

          console.log('[ROOM_STATE raw]', data.players, 'myId=', myId);

          if (!Array.isArray(data.players)) return;

          const other = data.players.find(
            (p) => String(p.userId) !== myId
          );
          if (!other) return;

          setRival(prev => ({
            ...(prev ?? {}),
            nickname: other.nickname ?? 'OPPONENT',
            profileUrl: other.profileImg ?? null,
            score: prev?.score ?? 0,
            combo: prev?.combo ?? 0,
            maxCombo: prev?.maxCombo ?? 0,
          }));
        });

        // 2) SCORE
        client.subscribe(`/topic/multi/room/${roomId}/score`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data?.type !== 'SCORE') return;

          const senderId = String(data?.userId ?? data?.id);
          if (senderId === myId) return;

          // 🔥 상대 점수 왔다는 건 상대가 "확실히 존재"한다는 뜻
          try {
            client.publish({
              destination: `/app/multi/room/${roomId}/state`,
              body: JSON.stringify({ roomId }),
            });
          } catch { }

          setRival(prev => ({
            ...(prev ?? {}),
            score: data.score,
            combo: data.combo,
            maxCombo: data.maxCombo,
          }));
        });

        // 3) ROOM_STATE 강제 요청
        const body = JSON.stringify({ roomId });
        try { client.publish({ destination: `/app/multi/room/state`, body }); } catch { }

      },
    });

    client.activate(); // ✅ 이 줄이 핵심
    return () => {
      try { client.deactivate(); } catch { }
    };
  }, [isMulti, roomId, loginUser]);

  useEffect(() => {
    if (!isMulti) return;
    if (!startAtParam) return;

    const v = Number(startAtParam);
    if (!Number.isFinite(v)) return;

    setMultiStartAt(v);
  }, [isMulti, startAtParam]);

  useEffect(() => {
    statusApi()
      .then((res) => {
        setLoginUser(res.data);
      })
      .catch((err) => {
        console.error('로그인 상태 확인 실패:', err);
        setLoginUser(null);
      });
  }, []);

  useEffect(() => {
    if (loginUser === null) return;

    if (!loginUser || loginUser.loginUser.status === 'BLOCKED') {
      alert('이용이 제한된 기능입니다.');
      navigate('/main');
      return;
    }

    const fetchSongByToken = async (token) => {
      try {
        const resSong = await fetch(`/api/songs/by-token/${token}`, {
          credentials: 'include',
        });
        if (!resSong.ok) throw new Error('토큰에 접근이 불가합니다.');

        const fetchedSong = await resSong.json();
        setSong(fetchedSong);
        setDiff(fetchedSong.diff ?? 'unknown');

        const resAudio = await fetch(`/api/songs/${fetchedSong.id}/audio?token=${token}`, {
          credentials: 'include',
        });
        if (!resAudio.ok) throw new Error('오디오 접근 불가');

        const blob = await resAudio.blob();
        const audioEl = document.getElementById('game-audio');
        if (audioEl) {
          audioEl.src = URL.createObjectURL(blob);
          audioEl.load();
        }
      } catch (err) {
        console.error(err);
        alert(err.message);
        navigate('/main');
      }
    };

    if (tokenParam) {
      fetchSongByToken(tokenParam);
      return;
    }

    const fetchSongById = async (songId) => {
      try {
        const res = await fetch(`/api/songs/${songId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('곡 접근 불가');

        const fetchedSong = await res.json();
        setSong(fetchedSong);
        setDiff(fetchedSong.diff ?? 'unknown');
      } catch (err) {
        console.error(err);
        alert(err.message);
        navigate('/main');
      }
    };

    if (resolvedSongId) {
      fetchSongById(resolvedSongId);
    }
  }, [tokenParam, loginUser]); // ✅ 원본 유지

  useEffect(() => {
    const sync = () => {
      try {
        const v = localStorage.getItem('userSettings');
        const parsed = v ? JSON.parse(v) : {};
        setSettings((prev) => ({ ...prev, ...DEFAULT_SETTINGS, ...parsed }));
      } catch { }
    };

    window.addEventListener('settings:changed', sync);
    return () => window.removeEventListener('settings:changed', sync);
  }, []);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 2200);

    return () => clearInterval(tipTimer);
  }, []);

  useEffect(() => {
    if (isMulti) return;

    const onKey = (e) => {
      if (e.code !== 'Escape') return;

      setUserPaused((p) => {
        const next = !p;
        if (p === true && next === false) {
          setCountdown(3);
        }
        return next;
      });
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMulti]);

  useEffect(() => {
    if (!isMulti) return;
    if (!multiStartAt) return;

    let timer = null;

    const tick = () => {
      const diff = Math.ceil((multiStartAt - Date.now()) / 1000);

      if (diff > 0) {
        setCountdown(diff);
      } else {
        setCountdown(0);
        setTimeout(() => setCountdown(null), 300);
        if (timer) clearInterval(timer);
      }
    };

    tick();
    timer = setInterval(tick, 200);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isMulti, multiStartAt]);

  useEffect(() => {
    if (!loadingDone) return;

    const raf = requestAnimationFrame(function tick() {
      const now = performance.now();
      const minEnd = loadingStartRef.current + MIN_LOADING_TIME;
      const realEnd = loadingEndRef.current ?? Infinity;

      const targetEnd = Math.max(minEnd, realEnd);
      const progress = Math.min(1, (now - loadingStartRef.current) / (targetEnd - loadingStartRef.current));

      setLoadingPercent(progress * 100);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setReady(true);
        setCountdown(3);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [loadingDone]);

  useEffect(() => {
    loadingStartRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (!isMulti) return;

    // 멀티 모드에서는 로딩 스킵
    setLoadingDone(true);
    setReady(true);
    setCountdown(null);
  }, [isMulti]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      playCountStart();
      const t = setTimeout(() => {
        setCountdown(null);
      }, 300);
      return () => clearTimeout(t);
    }

    playCountTick();
    const t = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [countdown]);

  const waitingForMultiStart = isMulti && multiStartAt != null && Date.now() < multiStartAt;

  const paused =
    (!isMulti && userPaused) ||
    !ready ||
    countdown !== null ||
    waitingForMultiStart;

  const canStartSession = tokenParam ? Boolean(song) : Boolean(resolvedSongId);

  return (
    <div
      style={{
        minHeight: '100vh',
        paddingTop: HEADER_HEIGHT + 'px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Background />
      <Header />

      <LeftSidebar songId={resolvedSongId} diff={diff} />
      <RightSidebar isMulti={isMulti} rival={rival} />

      <HUDFrame>
        <HUD score={score} combo={combo} songProgress={songProgress} classProgress={classProgress} />
      </HUDFrame>

      {(!ready || (isMulti && !canStartSession)) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at center, #220000, #000)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: '600px',
              height: '800px',
              position: 'relative',
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            <LoadingNoteRain count={10} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '50px',
                fontWeight: 'bold',
                letterSpacing: '6px',
                color: 'rgb(255, 255, 255)',
                textShadow: `
                  0 0 8px #ff4a4a,
                  0 0 24px #ff0000,
                  0 0 48px #aa0000
                `,
                pointerEvents: 'none',
              }}
            >
              LOADING
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '200px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '500px',
                height: '20px',
                background: 'rgba(255,0,0,0.15)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${loadingPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ff3a3a, #ff0000)',
                  boxShadow: `
                    0 0 8px rgba(255,80,80,0.8),
                    0 0 16px rgba(255,0,0,0.6)
                  `,
                  transition: 'non',
                }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '200px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '18px',
                color: '#ffaaaa',
                letterSpacing: '2px',
                textShadow: '0 0 6px rgba(255,80,80,0.8)',
                pointerEvents: 'none',
              }}
            >
              {Math.round(loadingPercent)}%
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '24px',
              letterSpacing: '0.04em',
              color: '#7df9ff',
              opacity: 0.85,
              textShadow: '0 0 6px rgba(125,249,255,0.35)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {TIPS[tipIndex]}
          </div>
        </div>
      )}

      {userPaused && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              width: 460,
              padding: 32,
              borderRadius: 16,
              background: '#5c5c5cff',
              boxShadow: '0 0 40px rgba(255,0,0,0.45)',
              color: '#fff',
            }}
          >
            <h2 style={{ marginBottom: 24, textAlign: 'center' }}>일 시 정 지</h2>

            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <div style={{ marginBottom: 6 }}>M U S I C</div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  onClick={() => {
                    setSettings((prev) => {
                      const next = { ...prev, bgmMuted: !prev.bgmMuted };
                      localStorage.setItem('userSettings', JSON.stringify(next));
                      window.dispatchEvent(new Event('settings:changed'));
                      return next;
                    });
                  }}
                  style={{
                    width: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: settings.bgmMuted ? '#ff4d4d' : '#3a3a3aff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {settings.bgmMuted ? 'OFF' : 'ON'}
                </button>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.bgmVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSettings((prev) => {
                      const next = { ...prev, bgmVolume: v };
                      localStorage.setItem('userSettings', JSON.stringify(next));
                      window.dispatchEvent(new Event('settings:changed'));
                      return next;
                    });
                  }}
                  style={{ width: 220 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 28, textAlign: 'center' }}>
              <div style={{ marginBottom: 6 }}>S F X</div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  onClick={() => {
                    setSettings((prev) => {
                      const next = { ...prev, sfxMuted: !prev.sfxMuted };
                      localStorage.setItem('userSettings', JSON.stringify(next));
                      window.dispatchEvent(new Event('settings:changed'));
                      return next;
                    });
                  }}
                  style={{
                    width: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: settings.sfxMuted ? '#ff4d4d' : '#3a3a3aff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {settings.sfxMuted ? 'OFF' : 'ON'}
                </button>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.sfxVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSettings((prev) => {
                      const next = { ...prev, sfxVolume: v };
                      localStorage.setItem('userSettings', JSON.stringify(next));
                      window.dispatchEvent(new Event('settings:changed'));
                      return next;
                    });
                  }}
                  style={{ width: 220 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                style={{
                  flex: 1,
                  background: 'linear-gradient(90deg, #ff3a3ab9, #ff009db0)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 0',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  playMenuConfirm();
                  setSessionKey((k) => k + 1);
                  setUserPaused(false);
                  setCountdown(3);
                }}
              >
                다시시작
              </button>

              <button
                style={{
                  flex: 1,
                  background: '#3a3a3aff',
                  color: '#ddd',
                  border: '1px solid #444',
                  borderRadius: 8,
                  padding: '10px 0',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  playMenuConfirm();

                  const params = new URLSearchParams(window.location.search);
                  const isEditorTest = params.get('mode') === 'editorTest';

                  if (isEditorTest) {
                    navigate(`/song/${resolvedSongId}/note/edit?mode=editorTest`, { replace: true });
                  } else {
                    navigate('/main');
                  }
                }}
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: `calc(48% + ${HEADER_HEIGHT / 2}px)`,
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: -5,
            pointerEvents: 'none',
            background: `
              linear-gradient(
               #000000 0%,
               #000000 60%,
               #000000 85%,
               #000000 100%
              )
            `,
            clipPath: 'polygon(40% 8%, 60% 8%, 100% 100%, 0% 100%)',
          }}
        />

        {(tokenParam ? Boolean(song) : (!isMulti && resolvedSongId && song) || (isMulti && resolvedSongId)) && (
          <GameSession
            songId={tokenParam ? song.id : resolvedSongId}
            token={tokenParam}
            analyserRef={analyserRef}
            loginUserId={loginUser?.loginUser?.id}
            key={sessionKey}
            paused={paused}
            fpsLimit={settings.fps}
            onRivalFinish={(rival) => {
              setRivalResult(rival);
            }}
            bgmVolume={(settings.bgmMuted ? 0 : (settings.bgmVolume ?? 100)) / 100}
            sfxVolume={(settings.sfxMuted ? 0 : (settings.sfxVolume ?? 100)) / 100}
            settings={settings}
            isMulti={isMulti}
            roomId={roomId}
            stompClientRef={stompRef}
            startAt={multiStartAt}
            onReady={() => {
              loadingEndRef.current = performance.now();
              setLoadingDone(true);
            }}
            onState={({ score, combo, diff, currentTime, duration, maxScore }) => {
              if (paused) return;

              setScore(score);
              setCombo(combo);
              if (diff) setDiff(diff);

              setSongProgress(duration > 0 ? Math.min(1, currentTime / duration) : 0);
              setClassProgress(maxScore > 0 ? Math.min(1, score / maxScore) : 0);
            }}
            onFinish={({ score, maxScore, maxCombo, diff: finishDiff }) => {
              if (finished) return;
              setFinished(true);

              const params = new URLSearchParams(window.location.search);
              const isEditorTest = params.get('mode') === 'editorTest';

              if (isEditorTest) {
                navigate(`/song/${resolvedSongId}/note/edit?mode=editorTest`, { replace: true });
                return;
              }

              if (isMulti) {
                navigate('/game/result', {
                  state: {
                    mode: 'multi',
                    myScore: score,
                    myMaxScore: maxScore,
                    myMaxCombo: maxCombo,
                    rivalScore: rivalResult?.score ?? 0,
                    rivalMaxScore: rivalResult?.maxScore ?? maxScore,
                    rivalMaxCombo: rivalResult?.maxCombo ?? 0,
                  },
                });
              } else {
                navigate('/game/result', {
                  state: {
                    mode: 'single',
                    score,
                    maxScore,
                    maxCombo,
                    diff: finishDiff ?? diff ?? 'unknown',
                    songId: resolvedSongId,
                  },
                });
              }
            }}
          />
        )}

        {settings.visualizer && <Visualizer active={!paused} size="game" analyserRef={analyserRef} />}

        {countdown !== null && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '140px',
              fontWeight: 900,
              color: '#ffdddd',
              background: `
                radial-gradient(
                  circle,
                  rgba(255,80,80,0.28) 0%,
                  rgba(255,40,40,0.18) 25%,
                  rgba(180,20,20,0.08) 45%,
                  rgba(0,0,0,0) 60%
                )
              `,
              textShadow: `
                0 0 6px  rgba(255,120,120,0.9),
                0 0 18px rgba(255,60,60,0.85),
                0 0 36px rgba(220,40,40,0.75),
                0 0 64px rgba(160,20,20,0.6)
              `,
              filter: 'brightness(1.1) saturate(1.35)',
              pointerEvents: 'none',
            }}
          >
            {countdown === 0 ? 'START' : countdown}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes pulse {
            0%   { opacity: 0.6; transform: scale(0.98); }
            50%  { opacity: 1;   transform: scale(1.02); }
            100% { opacity: 0.6; transform: scale(0.98); }
          }
        `}
      </style>
    </div>
  );
}

export default GamePlay;
