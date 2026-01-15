// pages/mainpage/MainOverlay.jsx
import { useRef, useState, useEffect, useCallback } from 'react';
import Header from '../../components/Common/Header';
import { useNavigate } from 'react-router-dom';
import { playMenuMove, playMenuConfirm, playPreview, stopPreview, playMenuBgmRandom, isMenuBgmPlaying } from '../../components/engine/SFXManager';
import Visualizer from '../../components/visualizer/Visualizer';
import { getMenuAnalyser } from '../../components/engine/SFXManager';

const dummySongs = [
  { id: 1, title: 'Song A', artist: 'Artist A', cover: null },
  { id: 2, title: 'Song B', artist: 'Artist B', cover: null },
  { id: 3, title: 'Song C', artist: 'Artist C', cover: null },
  { id: 4, title: 'Song D', artist: 'Artist D', cover: null },
  { id: 5, title: 'Song E', artist: 'Artist E', cover: null },
];

const formatDuration = (sec) => {
  const n = Number(sec);
  if (!n || n <= 0) return '--:--';
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const ITEM_HEIGHT = 72;
const INPUT_LOCK_MS = 50;

export default function MainOverlay() {
  const navigate = useNavigate();
  const wheelLockRef = useRef(false);
  const keyLockRef = useRef(false);
  const wheelContainerRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const analyserRef = useRef(null);

  useEffect(() => {
    const unlocked = localStorage.getItem('bgmUnlocked') === 'true';

    if (unlocked && !isMenuBgmPlaying()) {
      playMenuBgmRandom();
    }
  }, []);

  useEffect(() => {
    // singleBgm이 이미 (Start/Login 클릭에서) 실행된 상태라면
    // analyserNode가 여기서 잡힙니다.
    const id = setInterval(() => {
      const a = getMenuAnalyser();
      if (a) {
        analyserRef.current = a;
        clearInterval(id);
      }
    }, 50);

    return () => clearInterval(id);
  }, []);


  //loading / errorMsg 상태 (지금 코드에서 setLoading/setErrorMsg 쓰고 있어서 필수)
  const [loading, setLoading] = useState(true);
  const [_errorMsg, setErrorMsg] = useState('');

  //서버에서 받아온 공개곡을 여기에 덮어씀 (없으면 dummySongs 사용)
  const [songs, setSongs] = useState(dummySongs);

  //공개곡 목록: GET /api/songs
  useEffect(() => {
    let mounted = true;

    const loadPublicSongs = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const res = await fetch('/api/songs', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) throw new Error(`곡 목록 요청 실패 (${res.status})`);

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        // UI에서 쓰는 형태로 최소 가공 (title/artist/cover)
        const mapped = list.map((s) => {
          const len = s.length ?? s.duration ?? s.lengthSec;

          return {
            id: s.id,
            title: (s.title ?? '(no title)').replace(/\.mp3$/i, ''),
            artist: s.artist ?? 'unknown',
            cover: s.coverPath ? `/api/songs/${s.id}/cover` : null,

            bpm: Number.isFinite(Number(s.bpm)) ? Number(s.bpm) : null,
            lengthSec: Number.isFinite(Number(len)) ? Number(len) : null,

            difficulties: Array.isArray(s.difficulties) ? s.difficulties : [],
            diff: (s.diff ? String(s.diff).toUpperCase() : 'NORMAL'),
          };
        });
        if (!mounted) return;

        // 서버에서 곡이 오면 dummySongs 대신 덮어씀
        if (mapped.length > 0) {
          const DIFF_ORDER = ['EASY', 'NORMAL', 'HARD', 'HELL'];

          const sorted = [...mapped].sort((a, b) => {
            const da = DIFF_ORDER.indexOf(a.diff ?? 'NORMAL');
            const db = DIFF_ORDER.indexOf(b.diff ?? 'NORMAL');
            return da - db;
          });

          setSongs(sorted);
          setSelectedIndex(0);
        }
      } catch (err) {
        if (!mounted) return;
        setErrorMsg(err?.message ?? '곡 목록 불러오기 실패');
        // 실패해도 dummySongs로 화면은 유지
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPublicSongs();
    return () => {
      mounted = false;
    };
  }, []);

  // songs 길이가 바뀌면 selectedIndex 범위 보정
  useEffect(() => {
    if (!songs.length) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((prev) => Math.max(0, Math.min(songs.length - 1, prev)));
  }, [songs.length]);

  /* ===============================
     Wheel: 한 번에 한 칸
  =============================== */
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (wheelLockRef.current) return;
    if (!songs.length) return;

    const dir = Math.sign(e.deltaY);
    if (dir === 0) return;

    const nextIndex = Math.max(0, Math.min(songs.length - 1, selectedIndex + dir));
    if (nextIndex === selectedIndex) return;

    wheelLockRef.current = true;
    setSelectedIndex(nextIndex);
    playMenuMove();
    setTimeout(() => {
      wheelLockRef.current = false;
    }, INPUT_LOCK_MS);
  }, [songs.length, selectedIndex]);

  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      handleWheel(e);
    };

    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [handleWheel]);

  /* ===============================
     Keyboard: 전역 ↑ ↓ / Enter
  =============================== */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (keyLockRef.current) return;

      // ↑ ↓ 이동
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!songs.length) return;

        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = Math.max(0, Math.min(songs.length - 1, selectedIndex + dir));
        if (nextIndex === selectedIndex) return;

        keyLockRef.current = true;
        setSelectedIndex(nextIndex);
        playMenuMove();
        setTimeout(() => {
          keyLockRef.current = false;
        }, INPUT_LOCK_MS);
      }

      // Enter 확정
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!songs.length) return;

        console.log('선택 확정:', songs[selectedIndex]);
        playMenuConfirm();
        navigate(`/game/play?songId=${songs[selectedIndex].id}&diff=${songs[selectedIndex].diff}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, songs, navigate]);

  useEffect(() => {
    const url = songs[selectedIndex]?.previewUrl;
    if (!url) return;

    playPreview(url, { durationSec: 8 });
  }, [selectedIndex, songs]);


  const DIFF_ORDER = ['EASY', 'NORMAL', 'HARD', 'HELL'];

  const renderList = [];

  DIFF_ORDER.forEach((diff) => {
    const group = songs.filter((s) => (s.diff ?? 'NORMAL') === diff);
    if (!group.length) return;

    // 난이도 헤더 아이템
    renderList.push({
      id: `__HEADER__${diff}`,
      type: 'header',
      diff,
    });

    // 실제 곡들
    group.forEach((song) => {
      const songIndex = songs.findIndex((s) => s.id === song.id);

      renderList.push({
        ...song,
        type: 'song',
        songIndex,
      });
    });
  });

  const renderSelectedIndex = (() => {
    const id = songs[selectedIndex]?.id;
    if (!id) return 0;
    return renderList.findIndex((item) => item.id === id);
  })();
  const selectedSong = songs[selectedIndex];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Header />

      <main
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '15%',
            top: '40%',
            transform: 'translateY(-50%)',
            width: '48%',
            height: '62%',
            display: 'flex',
            gap: '24px',
          }}
        >


          {/* Album + Detail Column */}
          <div
            style={{
              width: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              flexShrink: 0,
            }}
          >
            {/* Album Cover */}
            <div
              style={{
                aspectRatio: '1 / 1',
                borderRadius: '12px',
                background: selectedSong?.cover
                  ? `url(${selectedSong.cover}) center / cover no-repeat`
                  : 'linear-gradient(135deg, #2a2f3a, #1c2028)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9aa6b2',
                fontSize: '12px',
              }}
            >
              {!selectedSong?.cover && (loading ? 'LOADING...' : 'ALBUM')}
            </div>

            {/* Detail Area (하단) */}
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(20,22,28,0.65)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {selectedSong ? (
                <>
                  {/* Title */}
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#ffffff',
                    }}
                  >
                    {selectedSong.title}
                  </div>

                  {/* Artist */}
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#9aa6b2',
                    }}
                  >
                    {selectedSong.artist}
                  </div>

                  {/* Divider */}
                  <div
                    style={{
                      height: '1px',
                      background: 'rgba(255,255,255,0.1)',
                      margin: '4px 0',
                    }}
                  />

                  {/* Meta Inline Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '12px',
                      color: '#9aa6b2',
                      flexWrap: 'wrap',
                    }}
                  >

                    {/* Length */}
                    <span>
                      <strong style={{ color: '#cfd8e3' }}>LENGTH</strong> {' '}
                      {formatDuration(selectedSong.lengthSec)}
                    </span>

                    <span style={{ opacity: 0.4 }}>•</span>

                    {/* Difficulty */}
                    <span style={{ display: 'flex', gap: '6px' }}>
                      {['EASY', 'NORMAL', 'HARD', 'HELL'].map((d) => {
                        const active = d === (selectedSong.difficulty ?? selectedSong.diff);

                        return (
                          <span
                            key={d}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.08)',
                              fontSize: '11px',
                              opacity: active ? 1 : 0.4,
                              fontWeight: active ? 600 : 400,
                            }}
                          >
                            {d}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.6 }}>곡을 선택해주세요</div>
              )}
            </div>
          </div>

          {/* Game List */}
          <section
            ref={wheelContainerRef}
            style={{
              position: 'relative',
              flex: 1,
              overflow: 'hidden',
              perspective: '900px',
            }}
          >

            {/* 난이도 기준선 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '42%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            >
              {/* 라벨 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '-24px',
                  display: 'flex',
                  gap: '12px',
                  fontSize: '18px',
                  color: '#cfd8e3',
                  opacity: 0.7,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: '#ffffff',
                  }}
                >
                  {selectedSong?.diff ?? 'NORMAL'}
                </span>
              </div>
            </div>


            {/* 고정 포커스 라인 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                height: ITEM_HEIGHT,
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '6px',
                zIndex: 2,
              }}
            />

            {/* 리스트 트랙 */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                transform: `translateY(calc(-${renderSelectedIndex * ITEM_HEIGHT}px - ${ITEM_HEIGHT / 2}px))`,
                transition: 'transform 0.25s ease-out',
              }}
            >
              {renderList.map((item, index) => {
                const d = index - renderSelectedIndex;
                const a = Math.abs(d);

                const scale = Math.max(0.8, 1 - a * 0.12);
                const z = -a * 60;
                const y = d * 10;
                const opacity = Math.max(0.35, 1 - a * 0.25);

                // ✅ HEADER
                if (item.type === 'header') {
                  const isCurrent = item.diff === selectedSong?.diff;
                  return (
                    <div
                      key={item.id}
                      style={{
                        height: ITEM_HEIGHT,
                        paddingLeft: 12,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 15,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: '#cfd8e3',
                        opacity: isCurrent ? 0 : 0.7,
                        pointerEvents: 'none',
                      }}
                    >
                      {!isCurrent && item.diff}
                    </div>
                  );
                }
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedIndex(item.songIndex);
                      playMenuConfirm();
                      stopPreview();
                      navigate(`/game/play?songId=${item.id}&diff=${item.diff}`);
                    }}
                    style={{
                      height: ITEM_HEIGHT,
                      boxSizing: 'border-box',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      transform: `translateY(${y}px) translateZ(${z}px) scale(${scale})`,
                      opacity,
                      transition: 'transform 0.2s, opacity 0.2s',
                      cursor: 'pointer',
                      background:
                        item.songIndex === selectedIndex
                          ? 'rgba(255,255,255,0.08)'
                          : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: item.songIndex === selectedIndex ? '25px' : '18px',
                        color: item.songIndex === selectedIndex ? '#ffffff' : '#b8c4d6',
                        fontWeight: item.songIndex === selectedIndex ? 600 : 400,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: item.songIndex === selectedIndex ? '#cfd8e3' : '#7f8fa6',
                      }}
                    >
                      {item.artist}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main >
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
      {/* Soft Blur Overlay */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '100vh',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'rgba(255,255,255,0.03)',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
    </div >
  );
}