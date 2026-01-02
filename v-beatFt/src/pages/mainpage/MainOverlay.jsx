// pages/mainpage/MainOverlay.jsx
import { useRef, useState, useEffect } from 'react';
import Header from '../../components/Common/Header';

const dummySongs = [
  { id: 1, title: 'Song A', artist: 'Artist A', cover: null },
  { id: 2, title: 'Song B', artist: 'Artist B', cover: null },
  { id: 3, title: 'Song C', artist: 'Artist C', cover: null },
  { id: 4, title: 'Song D', artist: 'Artist D', cover: null },
  { id: 5, title: 'Song E', artist: 'Artist E', cover: null },
];

const ITEM_HEIGHT = 72;
const INPUT_LOCK_MS = 50;

export default function MainOverlay() {
  const wheelLockRef = useRef(false);
  const keyLockRef = useRef(false);

  const [selectedIndex, setSelectedIndex] = useState(0);

  /* ===============================
     Wheel: 한 번에 한 칸
  =============================== */
  const handleWheel = (e) => {
    e.preventDefault();
    if (wheelLockRef.current) return;

    const dir = Math.sign(e.deltaY);
    if (dir === 0) return;

    const nextIndex = Math.max(
      0,
      Math.min(dummySongs.length - 1, selectedIndex + dir)
    );
    if (nextIndex === selectedIndex) return;

    wheelLockRef.current = true;
    setSelectedIndex(nextIndex);

    setTimeout(() => {
      wheelLockRef.current = false;
    }, INPUT_LOCK_MS);
  };

  /* ===============================
     Keyboard: 전역 ↑ ↓ / Enter
  =============================== */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (keyLockRef.current) return;

      // ↑ ↓ 이동
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();

        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = Math.max(
          0,
          Math.min(dummySongs.length - 1, selectedIndex + dir)
        );
        if (nextIndex === selectedIndex) return;

        keyLockRef.current = true;
        setSelectedIndex(nextIndex);

        setTimeout(() => {
          keyLockRef.current = false;
        }, INPUT_LOCK_MS);
      }

      // Enter 확정
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log('선택 확정:', dummySongs[selectedIndex]);
        // TODO: 게임 시작 / 라우팅
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);

  const selectedSong = dummySongs[selectedIndex];

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
            top: '50%',
            transform: 'translateY(-50%)',
            width: '48%',
            height: '62%',
            display: 'flex',
            gap: '24px',
          }}
        >
          {/* Album Cover */}
          <div
            style={{
              width: '500px',
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
              flexShrink: 0,
            }}
          >
            {!selectedSong?.cover && 'ALBUM'}
          </div>

          {/* Game List */}
          <section
            onWheel={handleWheel}
            style={{
              position: 'relative',
              flex: 1,
              overflow: 'hidden',
              perspective: '900px',
            }}
          >
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
                transform: `translateY(calc(-${selectedIndex * ITEM_HEIGHT}px - ${
                  ITEM_HEIGHT / 2
                }px))`,
                transition: 'transform 0.25s ease-out',
              }}
            >
              {dummySongs.map((song, index) => {
                const d = index - selectedIndex;
                const a = Math.abs(d);

                const scale = Math.max(0.8, 1 - a * 0.12);
                const z = -a * 60;
                const y = d * 10;
                const opacity = Math.max(0.35, 1 - a * 0.25);

                return (
                  <div
                    key={song.id}
                    onClick={() => setSelectedIndex(index)}
                    style={{
                      height: ITEM_HEIGHT,
                      boxSizing: 'border-box',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',

                      transform: `
                        translateY(${y}px)
                        translateZ(${z}px)
                        scale(${scale})
                      `,
                      opacity,
                      transition: 'transform 0.2s, opacity 0.2s',
                      cursor: 'pointer',

                      background:
                        index === selectedIndex
                          ? 'rgba(255,255,255,0.08)'
                          : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: index === selectedIndex ? '25px' : '18px',
                        color: index === selectedIndex ? '#ffffff' : '#b8c4d6',
                        fontWeight: index === selectedIndex ? 600 : 400,
                      }}
                    >
                      {song.title}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color:
                          index === selectedIndex ? '#cfd8e3' : '#7f8fa6',
                      }}
                    >
                      {song.artist}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
