// src/pages/multi/RightSidebar.jsx
import { useMemo, useEffect, useRef, useState } from 'react';

const HEADER_HEIGHT = 64;
const SIDEBAR_WIDTH = 300;

export default function RightSidebar({ isMulti, rival, singleInfo }) {
  const videoRef = useRef(null);
  const [profileBg, setProfileBg] = useState(null);

  // ===== 멀티 플레이 UI =====
  if (isMulti) {
    if (!rival) return null;

    const { nickname, profileUrl, score, combo } = useMemo(
      () => ({
        nickname: rival?.nickname ?? 'OPPONENT',
        profileUrl: resolveProfileImg(rival?.profileUrl),
        score: rival?.score ?? 0,
        combo: rival?.combo ?? 0,
      }),
      [rival]
    );

    // 프로필 이미지 url 관련 함수
    function resolveProfileImg(src) {
      if (!src) return null;

      if (src.startsWith('http')) return src;

      if (!src.startsWith('/')) {
        return `http://localhost:8080/${src}`;
      }

      return `http://localhost:8080${src}`;
    }

    useEffect(() => {
      if (!profileUrl) {
        setProfileBg(null);
        return;
      }

      const img = new Image();
      img.src = profileUrl;

      img.onload = () => setProfileBg(profileUrl);
      img.onerror = () => setProfileBg(null);
    }, [profileUrl]);

    useEffect(() => {
      const video = videoRef.current;
      const stream = rival?.stream;

      video.onloadedmetadata = () => { };
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      video.play().catch(() => { });
      return () => { video.onloadedmetadata = null; };
    }, [rival?.stream]);

    return (
      <div style={styles.sidebar}>
        <div style={styles.neonLine} />
        <div style={styles.rivalView}>
          <div style={styles.rivalTitle}>MATCH VIEW</div>
          <div style={styles.frameBox}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#222',
              }}
            />
          </div>
        </div>
        <div style={styles.rivalInfo}>
          <div style={styles.profileBlock}>
            <div
              style={{
                ...styles.profileImg,
                background: profileUrl
                  ? `url(${profileUrl}) center / cover no-repeat`
                  : styles.profileFallback.background,
                opacity: profileUrl ? 1 : 0.5,
              }}
            >
              {!profileUrl && 'PROFILE'}
            </div>
            <div style={styles.nickname}>NICK:  {nickname}</div>
          </div>
          <div style={styles.scoreBlock}>
            <InfoRow label="SCORE: " value={score} color="#5aeaff" />
            <InfoRow label="COMBO: " value={combo} color="#ff8cff" />
          </div>
        </div>
      </div>
    );
  }

  // ===== 싱글 플레이 UI =====
  const { modeLabel, playerName, diffLabel } = singleInfo ?? {};
  const logoUrl = '/public/images/teamlogo.png';

  return (
    <div style={styles.sidebar}>
      <div style={styles.neonLine} />
      <div style={styles.singleView}>
        <div style={styles.rivalTitle}>{modeLabel ?? 'SINGLE PLAY'}</div>
        <div style={styles.frameBox}>
          <div style={styles.logoBox}>
            <img src={logoUrl} style={styles.logoImg} />
          </div>
        </div>
      </div>

      {/* ===== RIVAL INFO ===== */}
      <div style={styles.singleInfo}>
        <div style={styles.nickname}>{playerName ?? 'PLAYER'}</div>
        <div style={{ opacity: 0.7 }}>{diffLabel}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={styles.infoRow}>
      <span style={{ ...styles.infoLabel, color }}>{label}</span>
      <span style={{ ...styles.infoValue, color }}>{value}</span>
    </div>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: HEADER_HEIGHT,
    right: 0,
    width: SIDEBAR_WIDTH,
    height: `calc(100vh - ${HEADER_HEIGHT}px)`,
    padding: 12,
    boxSizing: 'border-box',
    background: 'rgba(10, 20, 30, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  neonLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 5,
    height: '100%',
    background: 'linear-gradient(to bottom, #5aeaff, #ff00ea, #5aeaff)',
    boxShadow: '0 0 6px rgba(90,234,255,0.8), 0 0 12px rgba(255,80,200,0.6)',
    pointerEvents: 'none',
  },
  rivalView: {
    flex: 6,
    minHeight: 0,
    borderRadius: 14,
    border: '1px solid rgba(90,234,255,0.55)',
    background: 'rgba(0,0,0,0.35)',
    padding: 10,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  rivalTitle: {
    fontSize: 12,
    letterSpacing: '0.12em',
    opacity: 0.8,
    textAlign: 'center',
  },
  frameBox: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#000',
    border: '1px solid rgba(90,234,255,0.35)',
    margin: '0 auto',
    width: '100%',
    aspectRatio: '9 / 16',
    minHeight: 200,
  },
  logoBox: {
    width: '100%',
    height: '100%',
    background: '#111',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImg: {
    objectFit: 'contain',
  },
  rivalInfo: {
    flex: 4,
    borderRadius: 14,
    border: '1px solid rgba(90,234,255,0.45)',
    background: 'rgba(0,0,0,0.35)',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',

  },
  profileRow: { display: 'flex', alignItems: 'center', gap: 12 },
  profileImg: {
    width: 120,
    height: 120,
    borderRadius: 10,
    border: '1px solid rgba(90,234,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
  },
  profileFallback: { background: 'linear-gradient(135deg, #2a2f3a, #111)' },
  nickname: { fontSize: 14, fontWeight: 700 },
  infoRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },
  infoLabel: {
    opacity: 0.8,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  infoValue: {
    fontWeight: 700,
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  profileBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },

  scoreBlock: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
  },
  // styles 하단에 추가

  singleView: {
    flex: 6,
    borderRadius: 14,
    border: '1px solid rgba(90,234,255,0.55)',
    background: 'rgba(0,0,0,0.35)',
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  singleInfo: {
    flex: 4,
    borderRadius: 14,
    border: '1px solid rgba(90,234,255,0.45)',
    background: 'rgba(0,0,0,0.35)',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

};
