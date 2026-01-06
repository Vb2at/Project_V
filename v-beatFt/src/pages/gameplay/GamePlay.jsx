import { useEffect, useState, useRef } from 'react';
import Header from '../../components/Common/Header';
import GameSession from '../../components/engine/GameSession';
import Background from '../../components/Common/Background';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import HUD from './HUD.jsx';
import HUDFrame from './HUDFrame.jsx';
import { useNavigate } from 'react-router-dom';
import LoadingNoteRain from './LoadingNoteRain';

function GamePlay() {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  const MIN_LOADING_TIME = 2500;

  const loadingStartRef = useRef(0);
  const [loadingDone, setLoadingDone] = useState(false);

  const [loadingPercent, setLoadingPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [dotCount, setDotCount] = useState(0);
  const loadingEndRef = useRef(null);

  const getSongIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('songId') || '1';
  };
  const getDiffFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('diff') || 'unknown';
  };

  const [songId, setSongId] = useState(getSongIdFromUrl());
  const [diff, setDiff] = useState(getDiffFromUrl());

  const [songProgress, setSongProgress] = useState(0);
  const [classProgress, setClassProgress] = useState(0);

  const navigate = useNavigate();
  const [finished, setFinished] = useState(false);
  const HEADER_HEIGHT = 25;

  // 주소 변경 반영
  useEffect(() => {
    const onPopState = () => {
      setSongId(getSongIdFromUrl());
      setDiff(getDiffFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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


  // 로딩 중 점 애니메이션
  useEffect(() => {
    if (ready) return;

    const i = setInterval(() => {
      setDotCount((d) => (d + 1) % 4);
    }, 300);

    return () => clearInterval(i);
  }, [ready]);

  // 카운트다운
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const raf = requestAnimationFrame(() => setCountdown(null));
      return () => cancelAnimationFrame(raf);
    }

    const t = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(t);
  }, [countdown]);

  // 로딩 or 카운트 중에는 엔진 정지
  const paused = !ready || countdown !== null;

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

      <LeftSidebar songId={songId} diff={diff} />
      <RightSidebar />

      <HUDFrame>
        <HUD
          score={score}
          combo={combo}
          songProgress={songProgress}
          classProgress={classProgress}
        />
      </HUDFrame>

      {/* ===== 로딩 화면 ===== */}
      {!ready && (
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
              width: '460px',
              height: '180px',
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
                fontSize: '32px',
                letterSpacing: '6px',
                color: '#ff00bfff',
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
            {/* === 로딩 에너지바 === */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '320px',
                height: '10px',
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
                  transition: 'none',
                }}
              />
            </div>

            {/* === 퍼센트 텍스트 === */}
            <div
              style={{
                position: 'absolute',
                bottom: '-5px',
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
        <GameSession
          paused={paused}
          onReady={() => {
            loadingEndRef.current = performance.now(); 
            setLoadingDone(true);
          }}
          onState={({ score, combo, diff, currentTime, duration, maxScore }) => {
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
          onFinish={({ score, maxScore }) => {
            if (finished) return;
            setFinished(true);
            navigate('/game/result', { state: { score, maxScore } });
          }}
        />

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
            {countdown}
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
    </div>
  );
}

export default GamePlay;
