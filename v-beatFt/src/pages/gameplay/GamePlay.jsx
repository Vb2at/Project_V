import { useEffect, useState, useRef } from 'react';
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

function GamePlay() {
  const { songId: paramSongId } = useParams();
  const [searchParams] = useSearchParams();

  // 멀티테스트용 더미 
  const [rivalScore, setRivalScore] = useState(0);
  const [rivalCombo, setRivalCombo] = useState(0);
  const [rivalName] = useState('RIVAL'); // 테스트용


  // ===== 멀티 진입 파라미터 =====
  const mode = searchParams.get('mode');                 // 'multi' | ...
  const roomId = searchParams.get('roomId');             // 멀티 방 id
  const isMulti = mode === 'multi';

  // ===== songId 결정 =====
  // 싱글/기존: /song/:songId 또는 ?songId=
  const baseSongId = paramSongId ?? searchParams.get('songId');

  // 멀티: URL에 songId가 없을 수 있으니 room에서 받아올 songId를 따로 관리
  const [multiSongId, setMultiSongId] = useState(null);
  const resolvedSongId = isMulti ? (multiSongId ?? baseSongId) : baseSongId;

  // 멀티: (선택) 서버가 startAt을 주면 여기 저장해서 GameSession으로 전달
  const [multiStartAt, setMultiStartAt] = useState(null); // ms epoch 또는 서버 기준 값(백엔드 스펙 맞추기)

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
  const [bgmVolume, setBgmVolume] = useState(1);
  const [sfxVolume, setSfxVolume] = useState(1);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const analyserRef = useRef(null);
  const [sessionKey, setSessionKey] = useState(0);
  const effectiveBgmVolume = bgmMuted ? 0 : bgmVolume;
  const effectiveSfxVolume = sfxMuted ? 0 : sfxVolume;
  const MIN_LOADING_TIME = 2500;
  const loadingStartRef = useRef(0);
  const loadingEndRef = useRef(null);
  const HEADER_HEIGHT = 25;
  const location = useLocation();

  const navigate = useNavigate();

  const [tipIndex, setTipIndex] = useState(
    () => Math.floor(Math.random() * TIPS.length)
  );


  useEffect(() => {
    const t = setInterval(() => {
      setRivalScore(s => s + Math.floor(Math.random() * 300));
      setRivalCombo(c => (c + 1) % 50);
    }, 800);

    return () => clearInterval(t);
  }, []);

  // ===== 멀티 방 정보 로드 (songId 확보용) =====
  useEffect(() => {
    if (!isMulti) return;
    // ===== 멀티 UI 테스트용 더미 =====
    setMultiSongId(baseSongId ?? '1');
    setDiff('HARD');
    setMultiStartAt(null);
    return;
    // 더미 제거 후 하단 사용 
    // if (!roomId) return;

    // let alive = true;

    // (async () => {
    //   try {
    //     const res = await fetch(`/api/multi/rooms/${roomId}`, {
    //       method: 'GET',
    //       headers: { Accept: 'application/json' },
    //       credentials: 'include',
    //     });

    //     if (!res.ok) throw new Error(`멀티 방 정보 요청 실패 (${res.status})`);

    //     const data = await res.json();
    //     if (!alive) return;

    //     // ✅ 백엔드 스펙에 맞춰서 키 이름만 조정하면 됩니다.
    //     // - songId: number
    //     // - diff: 'easy' | 'normal' | ...
    //     // - startAt: 서버 기준 시작 시각(선택)
    //     const nextSongId = data?.songId ?? data?.song?.id ?? null;
    //     const nextDiff = data?.diff ?? data?.difficulty ?? null;
    //     const nextStartAt = data?.startAt ?? null;

    //     if (nextSongId != null) setMultiSongId(String(nextSongId));
    //     if (nextDiff) setDiff(String(nextDiff));
    //     if (nextStartAt != null) setMultiStartAt(nextStartAt);

    //   } catch (e) {
    //     console.error(e);
    //     alert('멀티 방 정보를 불러오지 못했습니다.');
    //     navigate('/main', { replace: true });
    //   }
    // })();

    // return () => { alive = false; };
  }, [isMulti, roomId, navigate]);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 2200);

    return () => clearInterval(tipTimer);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Escape') return;

      setUserPaused((p) => {
        const next = !p;

        // ▶ Pause → Resume 전환 시 카운트다운 재시작
        if (p === true && next === false) {
          setCountdown(3);
        }

        return next;
      });
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!loadingDone) return;

    const raf = requestAnimationFrame(function tick() {
      const now = performance.now();
      const minEnd = loadingStartRef.current + MIN_LOADING_TIME;
      const realEnd = loadingEndRef.current ?? Infinity;

      const targetEnd = Math.max(minEnd, realEnd);
      const progress = Math.min(
        1,
        (now - loadingStartRef.current) /
        (targetEnd - loadingStartRef.current)
      );

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
    setCountdown(3);
  }, [isMulti]);

  // 카운트다운
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

  // 로딩 or 카운트 중에는 엔진 정지
  const paused = userPaused || !ready || countdown !== null;

  // ✅ 멀티인데 songId 확보 전이면 로딩을 계속 유지
  const canStartSession = Boolean(resolvedSongId);

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
      <RightSidebar />
      <HUDFrame>
        <HUD
          score={score}
          combo={combo}
          songProgress={songProgress}
          classProgress={classProgress}
        />
      </HUDFrame>
      {/* 🎵 하단 비주얼라이저 (브라우저 기준 fixed) */}
      <Visualizer
        size="game"
        active={!paused}
        analyserRef={analyserRef}
      />

      {/* ===== 로딩 화면 ===== */}
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
            {/*페이크 노트 낙하 */}
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

            {/* ===== Loading Bar ===== */}
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

            {/* === 퍼센트 텍스트 === */}
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
          {/* === TIP Text === */}
          <div
            style={{
              position: 'absolute',
              bottom: '100px',          // 로딩바 위
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

      {/* ===== Pause Modal ===== */}
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

            {/*BGM */}
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <div style={{ marginBottom: 6 }}>M U S I C</div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  onClick={() => setBgmMuted((m) => !m)}
                  style={{
                    width: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: bgmMuted ? '#ff4d4d' : '#3a3a3aff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {bgmMuted ? 'OFF' : 'ON'}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(Number(e.target.value))}
                  style={{ width: 220 }}
                />

              </div>
            </div>

            {/* SFX */}
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
              <div style={{ marginBottom: 6 }}>S F X</div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  onClick={() => setSfxMuted((m) => !m)}
                  style={{
                    width: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: sfxMuted ? '#ff4d4d' : '#3a3a3aff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {sfxMuted ? 'OFF' : 'ON'}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(Number(e.target.value))}
                  style={{ width: 220 }}
                />

              </div>
            </div>

            {/* 버튼 */}
            <div
              style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'center',
              }}
            >
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

      {/* ===== 게임 영역 ===== */}
      <div
        style={{
          position: 'absolute',
          top: `calc(48% + ${HEADER_HEIGHT / 2}px)`,
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* 🎭 레인 마스크 (뒤 비주얼라이저 차단용) */}
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

        {resolvedSongId && (
          <GameSession
            songId={resolvedSongId}
            analyserRef={analyserRef}
            key={sessionKey}
            paused={paused}
            bgmVolume={effectiveBgmVolume}
            sfxVolume={effectiveSfxVolume}

            // ✅ 멀티 전달
            isMulti={isMulti}
            roomId={roomId}
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

              setSongProgress(
                duration > 0 ? Math.min(1, currentTime / duration) : 0
              );
              setClassProgress(
                maxScore > 0 ? Math.min(1, score / maxScore) : 0
              );
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

              navigate('/game/result', {
                state: { score, maxScore, maxCombo, diff: finishDiff ?? diff ?? 'unknown', songId: resolvedSongId },
              });
            }}
          />
        )}

        {/* ===== 카운트다운 ===== */}
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

      {/* pulse 애니메이션 */}
      <style>
        {`
          @keyframes pulse {
            0%   { opacity: 0.6; transform: scale(0.98); }
            50%  { opacity: 1;   transform: scale(1.02); }
            100% { opacity: 0.6; transform: scale(0.98); }
          }
        `}
      </style>
    </div >
  );
}

export default GamePlay;
