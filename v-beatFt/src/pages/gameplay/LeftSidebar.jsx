import { useEffect, useState } from 'react';

export default function LeftSidebar({ songId, diff }) {
  const HEADER_HEIGHT = 64;

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(!!songId);

  useEffect(() => {
    if (!songId) return;

    let alive = true;

    fetch(`/api/songs/${songId}`)
      .then((res) => {
        if (!res.ok) throw new Error('song fetch failed');
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        setSong(data);
      })
      .catch((err) => {
        console.error(err);
        if (!alive) return;
        setSong(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [songId]);


  //.mp3 제거
  const stripMP3 = (name) => (name ? name.replace(/\.mp3$/i, '') : '');
  //제목 표시할 때 적용
  const titleText = song?.title ? stripMP3(song.title) : 'LOADING...';
  //난이도는 서버값 우선
  const diffText = String(song?.diff ?? diff ?? 'UNKNOWN').toUpperCase();

  return (
    <div
      style={{
        width: '260px',
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        padding: '24px 16px',
        boxSizing: 'border-box',
        color: '#e6faff',
        background: 'rgba(10, 20, 30, 0.6)',
        position: 'fixed',
        top: HEADER_HEIGHT + 'px',
        left: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '5px',
          height: '100%',
          background: 'linear-gradient(to bottom, #ff0000ff, #ff00eaff, #5aeaff)',
          boxShadow: `0 0 6px rgba(255,80,80,0.8),
                      0 0 12px rgba(255,80,200,0.6),
                      0 0 20px rgba(90,234,255,0.5)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ fontSize: '20px', fontWeight: 700 }}>
        {titleText}
        {loading && (
          <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.6 }}>
            LOADING...
          </span>
        )}
      </div>

      <div style={{ fontSize: '14px', fontWeight: 400, marginTop: '5px' }}>
        {song?.artist || "UNKNOWN ARTIST"}
      </div>

      <div style={{ marginTop: '12px' }}>
        {song?.coverPath ? (
          <img
            src={`/api/songs/${songId}/cover`}
            alt="cover"
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '6px',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          />
        ) : (
          <div
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '6px',
              border: '2px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              opacity: 0.7,
            }}
          >
            NO COVER
          </div>
        )}
      </div>

      <div style={{ marginTop: '6px', fontSize: '14px', opacity: 0.8 }}>
        난이도: {diffText}
      </div>
    </div>
  );
}