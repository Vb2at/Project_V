import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stopPreview } from "../components/engine/SFXManager";
import { LOADING_TIPS as TIPS } from "../constants/LoadingTips";
const TOTAL_DURATION = 1800;

export default function StartPage() {
    const navigate = useNavigate();
    const startRef = useRef(0);
    const phaseRef = useRef(0);
    const [phase, setPhase] = useState(0);
    // 0: black
    // 1: flash
    // 2: bg
    // 3: logo
    const logoScale =
        phase >= 4 ? 1 :
            phase >= 3 ? 1.05 :
                0.85;
    const [shake, setShake] = useState(false);
    const [afterGlow, setAfterGlow] = useState(false);
    const [progress, setProgress] = useState(0);
    const [tipIndex, setTipIndex] = useState(
        () => Math.floor(Math.random() * TIPS.length)
    );
    useEffect(() => {
        const tipTimer = setInterval(() => {
            setTipIndex(i => (i + 1) % TIPS.length);
        }, 2200);

        return () => clearInterval(tipTimer);
    }, []);

    useEffect(() => {
        startRef.current = performance.now();

        let rafId = 0;

        const tick = () => {
            const t = performance.now() - startRef.current;
            setProgress(Math.min(100, (t / TOTAL_DURATION) * 100));

            if (t > 180 && phaseRef.current < 1) {
                phaseRef.current = 1;
                setPhase(1);              // 흰 폭발 생성 (거의 안 보임)
            }

            if (t > 195 && phaseRef.current < 2) {
                phaseRef.current = 2;
                setPhase(2);              // 즉시 화면 덮는 폭발

                setShake(true);
                setTimeout(() => setShake(false), 70);
            }

            if (t > 360 && phaseRef.current < 3) {
                phaseRef.current = 3;
                setPhase(3);

                setAfterGlow(true);
                setTimeout(() => setAfterGlow(false), 120);
            }

            if (t > 520 && phaseRef.current < 4) {
                phaseRef.current = 4;
                setPhase(4);              // 로고 pop
            }

            if (t < TOTAL_DURATION) {
                rafId = requestAnimationFrame(tick);
            } else {
                setProgress(100);
                setTimeout(() => {
                    stopPreview();
                    navigate('/main', { replace: true });
                }, 100); // transition 시간보다 약간 크게
            }
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [navigate]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                overflow: 'hidden',
                zIndex: 9999,

                transform: shake
                    ? 'translate(2px, -2px)'
                    : 'translate(0, 0)',
                transition: 'transform 60ms linear',
            }}
        >


            {/* ===== Background ===== */}
            <img
                src="/images/startbg.png"   // ← 배경 이미지 경로
                alt=""
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: phase >= 2 ? 1 : 0,
                    transition: 'opacity 300ms ease-out',
                    pointerEvents: 'none',
                }}
            />

            {/* ===== White Explosion (center burst) ===== */}
            {phase >= 1 && (
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.35) 65%, rgba(255,255,255,0) 80%)',
                        filter: 'blur(2px)',
                        boxShadow: '0 0 80px 40px rgba(255,255,255,0.35)',
                        transform: `translate(-50%, -50%) scale(${phase >= 2 ? 45 : 1})`,
                        opacity: phase >= 3 ? 0 : 1,
                        transition:
                            'transform 420ms cubic-bezier(.2,.8,.2,1), opacity 260ms ease-out',

                        pointerEvents: 'none',
                    }}
                />
            )}
            {/* ===== After Glow ===== */}
            {afterGlow && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'radial-gradient(circle at center, rgba(255,255,255,0.35), rgba(255,255,255,0.15) 40%, rgba(255,255,255,0) 70%)',
                        opacity: 1,
                        transition: 'opacity 120ms ease-out',
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* ===== Loading Bar ===== */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 90,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 500,
                    height: 20,
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #ff3a3a, #ff00aa)',
                        boxShadow: '0 0 10px rgba(255,80,80,0.8)',
                        transition: 'width 80ms linear',
                    }}
                />
            </div>

            {/* ===== TIP Text ===== */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 150,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 24,
                    letterSpacing: '0.04em',
                    color: '#7df9ff',
                    opacity: 0.75,
                    textShadow: '0 0 8px rgba(125,249,255,0.35)',
                    pointerEvents: 'none',
                }}
            >
                {TIPS[tipIndex]}
            </div>

            {/* ===== Logo ===== */}

            <img
                src="/images/startlogo.png"
                alt="logo"
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 1200,
                    transform: `translate(-50%, -50%) scale(${logoScale})`,
                    opacity: phase >= 3 ? 1 : 0,
                    transition: 'transform 220ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease-out',
                    filter: phase >= 3
                        ? `
                            drop-shadow(0 0 4px rgba(0,0,0,0.8))
                            drop-shadow(0 0 10px rgba(0,0,0,0.6))
                            drop-shadow(0 0 18px rgba(0,0,0,0.65))
                        `
                        : 'none',
                    pointerEvents: 'none',
                }}
            />
        </div>

    );
}
