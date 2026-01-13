import { useEffect, useRef } from 'react';

/* =========================
   🔧 튜닝 파라미터
========================= */
const NOTE_COUNT = 60;        // 동시에 존재 가능한 노트 수
const SPEED_MIN = 120;        // px/sec
const SPEED_MAX = 280;
const WIDTH_MIN = 20;
const WIDTH_MAX = 24;
const HEIGHT_MIN = 30;
const HEIGHT_MAX = 60;
const SPAWN_INTERVAL = 120;   // ms

export default function LoginNoteRain() {
    const canvasRef = useRef(null);
    const notesRef = useRef([]);
    const lastSpawnRef = useRef(0);
    const rafRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        let prev = performance.now();

        const spawnNote = () => {
            if (notesRef.current.length >= NOTE_COUNT) return;

            const width =
                WIDTH_MIN + Math.random() * (WIDTH_MAX - WIDTH_MIN);

            const height =
                HEIGHT_MIN + Math.random() * (HEIGHT_MAX - HEIGHT_MIN);

            notesRef.current.push({
                x: Math.random() * canvas.width,
                y: -height,
                width,
                height,
                speed:
                    SPEED_MIN +
                    Math.random() * (SPEED_MAX - SPEED_MIN),
                alpha: 0.4 + Math.random() * 0.6,
            });
        };

        const tick = (now) => {
            const dt = (now - prev) / 1000;
            prev = now;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // spawn
            if (now - lastSpawnRef.current > SPAWN_INTERVAL) {
                lastSpawnRef.current = now;
                spawnNote();
            }

            // update & draw
            const alive = [];

            for (const n of notesRef.current) {
                n.y += n.speed * dt;

                if (n.y - n.height < canvas.height) {
                    alive.push(n);

                    const centerY = n.y + n.height * 0.5;

                    const fadeStartY = canvas.height * 0.35;
                    const fadeEndY = canvas.height * 0.80;

                    let fade = 1;

                    if (centerY >= fadeStartY) {
                        fade = 1 - (centerY - fadeStartY) / (fadeEndY - fadeStartY);
                        fade = Math.max(0, Math.min(1, fade));
                    }

                    ctx.globalAlpha = n.alpha * fade;
                    ctx.fillStyle = '#00e1ff';
                    ctx.beginPath();
                    ctx.roundRect(n.x, n.y, n.width, n.height, 4);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            notesRef.current = alive;

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1,
            }}
        />
    );
}
