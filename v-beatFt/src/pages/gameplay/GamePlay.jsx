// src/pages/multi/GamePlay.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { statusApi } from '../../api/auth';
import Header from '../../components/Common/Header';
import GameSession from '../../components/engine/GameSession';
import Background from '../../components/Common/Background';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import HUD from './HUD.jsx';
import HUDFrame from './HUDFrame.jsx';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const lobbyRival = location.state?.rival ?? null;
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
  const [rival, setRival] = useState(() => ({
    userId: lobbyRival?.userId ?? null,
    nickname: lobbyRival?.nickname ?? null,
    profileUrl: lobbyRival?.profileUrl ?? null,
    score: 0,
    combo: 0,
    stream: null,
  }));
  const [localStream, setLocalStream] = useState(null);
  const [rivalUserId, setRivalUserId] = useState(null);
  const MIN_LOADING_TIME = 2500;
  const loadingStartRef = useRef(0);
  const loadingEndRef = useRef(null);
  const HEADER_HEIGHT = 25;
  const [loginUser, setLoginUser] = useState(undefined);
  const enteredRef = useRef(false);
  const pendingRivalScoreRef = useRef(null);
  const navigate = useNavigate();
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [song, setSong] = useState(null);
  const [myId, setMyId] = useState(null);
  const peerRef = useRef(null);
  const myIdRef = useRef(null);
  const [stompConnected, setStompConnected] = useState(false);
  // ✅ stomp single instance
  const stompRef = useRef(null);
  const pendingIceRef = useRef([]);
  const pendingOfferRef = useRef(null);
  const rtcSubRef = useRef(null);
  const stompClientRef = stompRef;
  const pendingIceToSendRef = useRef([]);
  const [multiPhase, setMultiPhase] = useState('LOBBY');  // 'LOBBY' | 'LOADING' | 'PLAY'
  const handleStreamReady = useCallback((stream) => {
    if (!stream) return;
    console.log('[LOCAL STREAM RECEIVED]', stream.getTracks());
    setLocalStream(stream); // ✅ 여기까지만
  }, []);

  const startRTC = async (rivalId) => {
    if (!localStream || !stompConnected || peerRef.current) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerRef.current = pc;

    /* 1️⃣ addTrack */
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    /* 2️⃣ ontrack */
    pc.ontrack = e => {
      const stream = e.streams[0];
      if (!stream) return;
      setRival(prev => ({ ...prev, stream }));
    };

    /* 3️⃣ ICE candidate */
    pc.onicecandidate = e => {
      if (!e.candidate) return;
      const payload = { roomId, candidate: e.candidate, userId: myId };
      stompRef.current.publish({
        destination: '/app/multi/rtc/candidate',
        body: JSON.stringify(payload),
      });
    };

    /* 4️⃣ offerer 결정 및 OFFER 전송 */
    const isOfferer = String(myId) < String(rivalId);
    if (isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      stompRef.current.publish({
        destination: '/app/multi/rtc/offer',
        body: JSON.stringify({ roomId, offer, userId: myId }),
      });
    }
  };
  const [localReady, setLocalReady] = useState(false);
  const [rivalReady, setRivalReady] = useState(false);

  useEffect(() => {
    if (!ready) {
      setCountdown(null);
    }
  }, [ready]);

  useEffect(() => {
    if (!isMulti) return;
    if (!ready) return;          // 🔒 로딩 끝
    if (!multiStartAt) return;   // 🔒 START 수신됨

    setCountdown(3);
  }, [isMulti, ready, multiStartAt]);


  useEffect(() => {
    if (isMulti) return;   // ✅ 멀티 차단
    if (!ready) return;
    if (!loadingDone) return;

    setCountdown(3);
  }, [isMulti, ready, loadingDone]);

  useEffect(() => {
    if (!isMulti || !roomId) return;
    if (!myId) return;

    const client = new Client({
      webSocketFactory: () =>
        new SockJS('http://localhost:8080/ws', null, { withCredentials: true }),
      reconnectDelay: 3000,
      debug: () => { },
      onStompError: (frame) => {
        console.error('[STOMP ERROR]', frame);
      },
      onConnect: () => {
        console.log('[STOMP CONNECTED]');
        stompRef.current = client;
        setStompConnected(true);

        // ================= ROOM_STATE =================
        client.subscribe(`/topic/multi/room/${roomId}`, (msg) => {
          const data = JSON.parse(msg.body);

          if (data.type === 'ALL_READY') {
            setRivalReady(true);   // ✅ 상대 준비 완료
            setMultiPhase('PLAY'); // 기존
          }

          // songId 동기화
          if (data.songId != null) {
            setMultiSongId(String(data.songId));
          } else if (data.song?.id != null) {
            setMultiSongId(String(data.song.id));
          }

          if (data.type === 'START' && data.startAt) {
            setMultiStartAt(data.startAt);
            setMultiPhase('LOADING');
          }

          if (data.type === 'ALL_READY') {
            setMultiPhase('PLAY');
          }

          if (!Array.isArray(data.players)) return;

          const other = data.players.find(
            (p) => String(p.userId) !== String(myId)
          );

          if (other) {
            setRivalUserId(other.userId);

            setRival((prev) => ({
              ...prev,
              userId: other.userId,
              nickname: other.nickname ?? prev.nickname ?? null,
              profileUrl: other.profileImg ?? prev.profileUrl ?? null,
            }));

            // SCORE 캐시 반영
            const cached = pendingRivalScoreRef.current;
            if (cached) {
              setRival((prev) => {
                if (!prev?.userId) return prev;
                if (String(prev.userId) !== String(other.userId)) return prev;
                return { ...prev, ...cached };
              });
              pendingRivalScoreRef.current = null;
            }
          }
        });

        // 🔥 ICE send flush (필수)
        if (pendingIceToSendRef.current.length > 0) {
          console.log('[RTC ICE FLUSH]', pendingIceToSendRef.current.length);

          for (const p of pendingIceToSendRef.current) {
            client.publish({
              destination: '/app/multi/rtc/candidate',
              body: JSON.stringify(p),
            });
          }
          pendingIceToSendRef.current = [];

        }


        // ================= SCORE =================
        client.subscribe(`/topic/multi/room/${roomId}/score`, (msg) => {
          const data = JSON.parse(msg.body);
          console.log('[SCORE]', data);

          if (String(data.userId) === String(myId)) return;

          // ROOM_STATE 전에 오면 캐시
          pendingRivalScoreRef.current = {
            score: data.score,
            combo: data.combo,
            maxCombo: data.maxCombo,
          };

          setRival((prev) => {
            if (!prev?.userId) return prev;
            if (String(prev.userId) !== String(data.userId)) return prev;
            return {
              ...prev,
              score: data.score,
              combo: data.combo,
              maxCombo: data.maxCombo,
            };
          });
        });

        // ================= RTC =================
        if (rtcSubRef.current) {
          rtcSubRef.current.unsubscribe();
          rtcSubRef.current = null;
        }

        rtcSubRef.current = client.subscribe(
          `/topic/multi/room/${roomId}/rtc`,
          async (msg) => {
            const data = JSON.parse(msg.body);
            console.log('[RTC TYPE]', data.type);

            if (String(data.userId) === String(myId)) return;

            if (data.type === 'OFFER') {
              const pc = peerRef.current;
              if (!pc) {
                pendingOfferRef.current = data.offer;
                return;
              }

              await pc.setRemoteDescription(data.offer);

              for (const c of pendingIceRef.current) {
                try {
                  await pc.addIceCandidate(c);
                } catch { }
              }
              pendingIceRef.current = [];

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              stompRef.current.publish({
                destination: '/app/multi/rtc/answer',
                body: JSON.stringify({ roomId, answer, userId: myId }),
              });
            }

            if (data.type === 'ANSWER') {
              const pc = peerRef.current;
              if (!pc) return;

              await pc.setRemoteDescription(data.answer);

              for (const c of pendingIceRef.current) {
                try {
                  await pc.addIceCandidate(c);
                } catch { }
              }
              pendingIceRef.current = [];
            }

            if (data.type === 'CANDIDATE') {
              const pc = peerRef.current;
              if (!pc || !pc.remoteDescription) {
                pendingIceRef.current.push(data.candidate);
                return;
              }
              await pc.addIceCandidate(data.candidate);
            }
          }
        );

        // ================= ENTER =================
        if (!enteredRef.current) {
          setTimeout(() => {
            client.publish({
              destination: '/app/multi/enter',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ roomId }),
            });

            client.publish({
              destination: '/app/multi/ready',
              body: JSON.stringify({ roomId }),
            });

            enteredRef.current = true;
          }, 0);
        }
      },
    });

    client.activate();

    return () => {
      enteredRef.current = false;
      if (rtcSubRef.current) {
        rtcSubRef.current.unsubscribe();
        rtcSubRef.current = null;
      }
      client.deactivate();
    };
  }, [isMulti, roomId, myId]);


  useEffect(() => {
    console.log('[RTC EFFECT CHECK]', {
      isMulti,
      roomId,
      stompConnected,
      localStream: !!localStream,
      rivalUserId,
      myId,
      peerExists: !!peerRef.current,
    });



    if (!isMulti) return;
    if (!roomId) return;
    if (!stompConnected) return;
    if (!localStream) return;
    if (peerRef.current) return;

    console.log('[RTC START CONDITIONS OK]', {
      localTracks: localStream.getTracks().map(t => t.kind),
      myId,
      rivalUserId,
    });

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicegatheringstatechange = () => {
      console.log('[RTC ICE GATHERING]', pc.iceGatheringState);
    };

    console.log('[RTC PC CREATED]', {
      stompConnected,
      localStream: !!localStream,
      rivalUserId,
    });



    peerRef.current = pc;

    /* 1️⃣ addTrack (1회만) */
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
      console.log('[RTC ADD TRACK]', track.kind);
    });

    /* 2️⃣ ontrack */
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (!stream) return;

      console.log('[RTC ONTRACK]', stream.getTracks());

      setRival(prev => {
        if (prev.stream === stream) return prev;
        return { ...prev, stream };
      });
    };

    /* 3️⃣ ICE sender */
    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        console.log('[RTC ICE DONE]');
        return;
      }

      console.log('[RTC ICE]', e.candidate.candidate);

      const payload = { roomId, candidate: e.candidate, userId: myId };

      // STOMP 연결 전이면 버퍼링
      if (!stompRef.current?.connected) {
        pendingIceToSendRef.current.push(payload);
        return;
      }

      stompRef.current.publish({
        destination: '/app/multi/rtc/candidate',
        body: JSON.stringify(payload),
      });
    };


    /* 4️⃣ stash OFFER / ICE 처리 */
    (async () => {
      if (pendingOfferRef.current) {
        console.log('[RTC STASHED OFFER APPLY]');
        await pc.setRemoteDescription(pendingOfferRef.current);
        pendingOfferRef.current = null;

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        stompRef.current.publish({
          destination: '/app/multi/rtc/answer',
          body: JSON.stringify({ roomId, answer, userId: myId }),
        });

        console.log('[RTC ANSWER SENT]');
      }
      console.log('[RTC OFFERER CHECK]', { myId, peerExists: !!peerRef.current });
      console.log('[RTC GUARD CHECK]', {
        stompConnected,
        localStream: !!localStream,
        rivalUserId,
        peerExists: !!peerRef.current,
      });
      if (peerRef.current) {
        console.log('[RTC CREATE OFFER START]');
        const offer = await pc.createOffer();
        console.log('[RTC CREATE OFFER DONE]', offer?.type, offer?.sdp?.length);

        await pc.setLocalDescription(offer);
        console.log('[RTC SET LOCAL DESC]', pc.signalingState);

        stompRef.current.publish({
          destination: '/app/multi/rtc/offer',
          body: JSON.stringify({ roomId, offer, userId: myId }),
        });
      }
    })();

    return () => {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.getSenders?.().forEach(s => {
          try { pc.removeTrack(s); } catch { }
        });
        pc.close();
      } catch { }
      peerRef.current = null;

      // ✅ 재시작/재시도 시 잔여물 제거
      pendingIceRef.current = [];
      pendingOfferRef.current = null;

      setRival(prev => (prev ? { ...prev, stream: null } : prev));
    };
  }, [
    isMulti,
    roomId,
    stompConnected,
    localStream,
    rivalUserId,
    myId,
  ]);

  useEffect(() => {
    setLocalStream(null);
  }, [sessionKey]);

  // ✅ 게임 재시작(sessionKey 변경) 시 WebRTC 상태 완전 초기화
  useEffect(() => {
    // 기존 peer 정리
    if (peerRef.current) {
      try {
        peerRef.current.ontrack = null;
        peerRef.current.onicecandidate = null;
        peerRef.current.close();
      } catch { }
      peerRef.current = null;
    }

    // 스트림/RTC 상태 리셋
    pendingIceRef.current = [];
    pendingOfferRef.current = null;

    // UI도 리셋 (안 하면 오른쪽 video는 이전 상태로 남을 수 있음)
    setRival((prev) => ({
      ...prev,
      stream: null,
      score: 0,
      combo: 0,
    }));
  }, [sessionKey]);


  useEffect(() => {
    if (!rivalUserId) return;

    fetch(`/api/user/info?userId=${rivalUserId}`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {

        const u = data?.user ?? data ?? {};
        setRival(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            nickname: prev.nickname ?? u.nickName ?? u.nickname ?? null,
            profileUrl: prev.profileUrl ?? u.profileImg ?? u.profileUrl ?? null,
          };
        });
      })
      .catch(console.error);
  }, [rivalUserId]);


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

        const id = String(res.data.loginUser.id);
        setMyId(id);
        myIdRef.current = id;
      })
      .catch((err) => {
        console.error('로그인 상태 확인 실패:', err);
        setLoginUser(null);
      });
  }, []);

  useEffect(() => {
    if (loginUser === undefined) return;

    if (!isMulti && (!loginUser || loginUser.loginUser.status === 'BLOCKED')) {
      alert('이용이 제한된 기능입니다.');
      navigate('/main');
      return;
    }

    const fetchSongByToken = async (token) => {
      try {
        // 토큰으로 곡 정보 가져오기
        const resSong = await fetch(`/api/songs/info?token=${token}`, {
          credentials: 'include', // 세션 쿠키 포함
        });
        if (!resSong.ok) throw new Error('토큰에 접근이 불가합니다.');

        const fetchedSong = await resSong.json();
        setSong(fetchedSong);
        setDiff(fetchedSong.diff ?? 'unknown');

        // 오디오 blob 가져오기
        const resAudio = await fetch(`/api/songs/audio?token=${token}`, {
          credentials: 'include', // 세션 쿠키 포함
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
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [loadingDone]);

  useEffect(() => {
    loadingStartRef.current = performance.now();
  }, []);

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
    countdown !== null ||            
    (!isMulti && userPaused) ||
    !ready;

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

      <LeftSidebar songId={tokenParam ? song?.id : resolvedSongId} diff={diff} />
      <RightSidebar
        isMulti={isMulti}
        rival={rival}
      />
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
            mode="play"
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
            stompConnected={stompConnected}
            startAt={multiStartAt}
            onReady={() => {
              loadingEndRef.current = performance.now();
              setLoadingDone(true);
              setLocalReady(true);
            }}
            onState={({ score, combo, diff, currentTime, duration, maxScore }) => {
              if (finished) return;

              setScore(score);
              setCombo(combo);
              if (diff) setDiff(diff);

              setSongProgress(duration > 0 ? Math.min(1, currentTime / duration) : 0);
              setClassProgress(maxScore > 0 ? Math.min(1, score / maxScore) : 0);
            }}
            onFinish={({ score, maxScore, maxCombo, diff: finishDiff }) => {
              if (finished) return;
              setFinished(true);

              if (isMulti && roomId && stompClientRef.current) {
                stompClientRef.current.publish({
                  destination: '/app/multi/end',
                  body: JSON.stringify({ roomId }),
                });
              }
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
            onStreamReady={handleStreamReady}
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
