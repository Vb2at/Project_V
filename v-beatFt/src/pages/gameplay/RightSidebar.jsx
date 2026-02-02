import { useMemo, useEffect, useRef } from 'react';

const HEADER_HEIGHT = 64;
const SIDEBAR_WIDTH = 300;

/* ===== util ===== */
function resolveProfileImg(src) {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  if (!src.startsWith('/')) return `http://localhost:8080/${src}`;
  return `http://localhost:8080${src}`;
}

export default function RightSidebar({ isMulti, rival, opponentLeft, singleInfo }) {
  const videoRef = useRef(null);

  const memo = useMemo(() => {
    if (!isMulti) return null;
    return {
      nickname: rival?.nickname ?? 'OPPONENT',
      profileUrl: resolveProfileImg(rival?.profileUrl),
      score: rival?.score ?? 0,
      combo: rival?.combo ?? 0,
    };
  }, [isMulti, rival]);

  /* ===== video stream ===== */
  useEffect(() => {
    if (!isMulti) return;

    const video = videoRef.current;
    if (!video) return;

    const stream = rival?.stream;
    if (!stream) {
      video.srcObject = null;
      return;
    }

    const track = stream.getVideoTracks()[0];
    if (!track) {
      video.srcObject = null;
      return;
    }

    const forced = new MediaStream([track]);

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = forced;

    const playNow = () => {
      video.play().catch(() => { });
    };

    video.addEventListener('loadedmetadata', playNow);
    playNow();

    return () => {
      video.removeEventListener('loadedmetadata', playNow);
      video.srcObject = null;
    };
  }, [isMulti, rival?.stream]);

  if (isMulti) {
    if (!memo) return null;

    const { nickname, profileUrl, score, combo } = memo;

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
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',   // 프레임 꽉 채우기
                background: '#000',
                zIndex: 0,            // frameBox 내부 레이어
                pointerEvents: 'none',
              }}
            />


            {opponentLeft && (
              <div style={styles.opponentLeftOverlay}>
                OPPONENT LEFT
              </div>
            )}
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

            <div style={styles.nickname}>NICK: {nickname}</div>
          </div>

          <div style={styles.scoreBlock}>
            <InfoRow label="SCORE: " value={score} color="#5aeaff" />
            <InfoRow label="COMBO: " value={combo} color="#ff8cff" />
          </div>
        </div>
      </div>
    );
  }

  const { modeLabel } = singleInfo ?? {};
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

      <div style={styles.singleInfo}>
        <div style={styles.systemWrap}>
          <div style={styles.systemTitle}>[ SYSTEM MONITOR ]</div>
          <div style={styles.systemRow}>DATA: EMPTY</div>
          <div style={styles.systemRow}>SESSION: LOCAL</div>
          <div style={styles.systemRow}>LINK: OFF</div>
          <div style={styles.systemRow}>MODE: SINGLE</div>
          <div style={styles.systemRow}>AUDIO: OK</div>
          <div style={styles.systemRow}>VISUALIZER: ACTIVE</div>
          <div style={styles.systemRow}>STATE: STANDBY</div>
        </div>
      </div>
    </div>
  );
}

/* ===== components ===== */
function InfoRow({ label, value, color }) {
  return (
    <div style={styles.infoRow}>
      <span style={{ ...styles.infoLabel, color }}>{label}</span>
      <span style={{ ...styles.infoValue, color }}>{value}</span>
    </div>
  );
}

/* ===== styles ===== */
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
    isolation: 'isolate',      // ★ 핵심: 내부 레이어 격리
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#000',
    border: '1px solid rgba(90,234,255,0.35)',
    margin: '0 auto',
    width: '100%',
    aspectRatio: '9 / 16',
    minHeight: 200,
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
    alignItems: 'center',
  },

  profileImg: {
    width: 120,
    height: 120,
    borderRadius: 10,
    border: '1px solid rgba(90,234,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    alignSelf: 'flex-start',
  },

  profileFallback: {
    background: 'linear-gradient(135deg, #2a2f3a, #111)',
  },

  nickname: {
    fontSize: 14,
    fontWeight: 700,
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
  },

  infoLabel: {
    opacity: 0.8,
    fontFamily: 'monospace',
  },

  infoValue: {
    fontWeight: 700,
    fontFamily: 'monospace',
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
    justifyContent: 'center',
    alignItems: 'center',
  },

  systemWrap: {
    width: '100%',
    fontFamily: 'monospace',
    background: 'rgba(5, 10, 15, 0.85)',
    borderRadius: 6,
    border: '1px solid rgba(0,255,255,0.25)',
    padding: 14,
  },

  systemTitle: {
    fontSize: 12,
    letterSpacing: '0.22em',
    marginBottom: 10,
    color: '#bfffff',
  },

  systemRow: {
    fontSize: 12,
    lineHeight: '1.6',
    letterSpacing: '0.06em',
    color: '#eaffff',
  },

  opponentLeftOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    letterSpacing: '0.18em',
    fontWeight: 700,
    color: '#ff6b6b',
    background: 'rgba(0,0,0,0.45)',
    pointerEvents: 'none',
  },
};
