import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Background from "../components/Common/Background";
import LoginNoteRain from "./member/LoginNoteRain";
/* ===== Layout Numbers (여기만 조절) ===== */

const S = {
  pagePaddingX: 110,

  headerHeight: 84,
  footerHeight: 84,

  leftPaddingX: 140,
  leftGap: 40,

  logoWidth: 640,

  contentShiftX: 60, // 로고 아래 요소 우측 이동
  contentBiasY: -30,

  videoWidth: 620,
  videoHeight: 360,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 500); // 글리치 지속시간
    }, 18000); // 몇 초마다 튀는지

    return () => clearInterval(interval);
  }, []);


  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
      className="text-white font-sans"
    >
      {/* Background */}
      <Background />
      <LoginNoteRain />
      {/* Dark Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 5,
        }}
      />

      {/* Layout */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <header
          style={{
            height: S.headerHeight,
            padding: `0 ${S.pagePaddingX}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              position: "relative",
              width: 200,
              height: 150,
              overflow: "hidden",
              transform: "translateX(-110px)",
            }}
          >
            {/* base */}
            <img
              src="/images/teamlogo.png"
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                zIndex: 1,
                opacity: glitch ? 0 : 1,
                transition: "opacity .05s",
              }}
            />

            {/* glitch red */}
            {glitch && (
              <img
                src="/images/teamlogo2.png"
                draggable={false}
                className="glitch-layer glitch-red"
                style={{ zIndex: 2 }}
              />
            )}

            {/* glitch blue */}
            {glitch && (
              <img
                src="/images/teamlogo2.png"
                draggable={false}
                className="glitch-layer glitch-blue"
                style={{ zIndex: 3 }}
              />
            )}
          </div>

          <nav
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              marginLeft: "auto",
              transform: "translateX(60px)",
            }}
          >
            <span
              onClick={() => navigate("/login")}
              style={neonBtn}
            >
              로그인
            </span>

            <span
              onClick={() => navigate("/terms")}
              style={neonBtn}
            >
              회원가입
            </span>
          </nav>


        </header>

        {/* Main */}
        <main
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            padding: `0 ${S.pagePaddingX}px`,
            alignItems: "center",
            transform: `translateY(${S.contentBiasY}px)`,
          }}
        >
          {/* Left */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: S.leftGap,
              paddingLeft: S.leftPaddingX,
            }}
          >
            {/* Logo */}
            <img
              src="/images/landinlogo.png"
              alt="Victory Beat Logo"
              draggable={false}
              style={{ width: S.logoWidth }}
            />

            {/* Shifted Content */}
            <div style={{ marginLeft: S.contentShiftX }}>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 20, marginTop: 10, marginLeft: 50, }}>
                <button
                  onClick={() => navigate("/main")}
                  className="rounded-xl bg-cyan-400 text-black font-semibold hover:bg-cyan-300 transition"
                  style={{ padding: "14px 48px", fontSize: 16 }}
                >
                  PLAY NOW
                </button>

                <button
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;

                    v.muted = false;
                    v.volume = 1;
                    v.currentTime = 0;
                    v.play();

                    if (v.requestFullscreen) v.requestFullscreen();
                    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
                  }}
                  className="rounded-xl border border-cyan-400 text-cyan-300 font-semibold hover:bg-cyan-400/10 transition"
                  style={{ padding: "14px 48px", fontSize: 16 }}
                >
                  WATCH TRAILER
                </button>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: 36, fontSize: 13, opacity: 0.6, marginTop: 8, marginLeft: 50, }}>
                <span>🎧 Pick Your Track</span>
                <span>👥 Battle with Friends</span>
                <span>🛠 Build Your Chart</span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative" }}>
              {/* Glow */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 26,
                  filter: "blur(34px)",
                  background: "rgba(34,211,238,0.35)",
                }}
              />

              {/* Video */}
              <div
                style={{
                  position: "relative",
                  width: S.videoWidth,
                  height: S.videoHeight,
                  borderRadius: 26,
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(34,211,238,0.4)",
                  boxShadow: "0 0 40px rgba(34,211,238,0.25)",
                  overflow: "hidden",          // ⭐ 중요
                  marginRight: 30,
                }}
              >
                <video
                  ref={videoRef}
                  src="/video/trailer.mp4"
                  muted
                  autoPlay
                  loop
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 26,
                    objectFit: "cover",
                  }}
                />

              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer
          style={{
            height: S.footerHeight,
            padding: `0 ${S.pagePaddingX}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            fontSize: 13,
            opacity: 0.6,
          }}
        >
          <div
            style={{
              width: "100%",
              textAlign: "center",
              marginTop: -6,     // 위로 조금 올리기 (필요하면 조절)
              opacity: 0.6,
            }}
          >
            © 2026 Team Syntax Error v1.0
          </div>
        </footer>
      </div>
    </div>
  );
}
const neonBtn = {
  padding: "8px 18px",
  borderRadius: 999,
  fontSize: 13,
  cursor: "pointer",
  color: "#7fe9ff",
  background: "rgba(0,0,0,0.45)",
  border: "1.5px solid rgba(80,220,255,0.9)",
  boxShadow: `
    0 0 6px rgba(80,220,255,0.6),
    inset 0 0 6px rgba(80,220,255,0.35)
  `,
};
