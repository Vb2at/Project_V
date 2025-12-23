// src/components/Game/PixiEffects.jsx
import { useEffect, useRef } from 'react';
import { Application, Graphics, BlurFilter } from 'pixi.js';
import { GAME_CONFIG } from '../../constants/GameConfig';

class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
  }

  update(delta) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.life -= delta;
    return this.life > 0;
  }
}

function getPerspectiveScale(y) {
  const { SCALE_MIN, SCALE_MAX } = GAME_CONFIG.PERSPECTIVE;
  const { HEIGHT } = GAME_CONFIG.CANVAS;
  return SCALE_MIN + (y / HEIGHT) * (SCALE_MAX - SCALE_MIN);
}

function applyPerspective(x, y) {
  const { WIDTH } = GAME_CONFIG.CANVAS;
  const centerX = WIDTH / 2;
  const scale = getPerspectiveScale(y);
  const perspectiveX = centerX + (x - centerX) * scale;
  return { x: perspectiveX, scale };
}

export default function PixiEffects({ effects }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const graphicsRef = useRef(new Map());
  const effectsRef = useRef(effects);
  const tickerRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    effectsRef.current = effects;
  }, [effects]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const app = new Application();
      
      await app.init({
        width: GAME_CONFIG.CANVAS.WIDTH,
        height: GAME_CONFIG.CANVAS.HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
      });

      if (!mounted) return;

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      const ticker = (delta) => {
        const now = Date.now();
        const currentEffects = effectsRef.current;
        const particles = particlesRef.current;

        particlesRef.current = particles.filter(p => p.update(delta.deltaTime * 0.016));

        graphicsRef.current.forEach((graphics, key) => {
          const effect = currentEffects.find(e => 
            `${e.type}-${e.lane}-${e.startTime}` === key
          );

          if (!effect) return;

          if (effect.type === 'tap') {
            const elapsed = now - effect.startTime;
            const progress = elapsed / 500;

            if (progress >= 1) {
              app.stage.removeChild(graphics);
              graphics.destroy();
              graphicsRef.current.delete(key);
            } else {
              updateTapEffect(graphics, progress, particles);
            }
          } else if (effect.type === 'long') {
            const elapsed = now - effect.startTime;
            updateLongEffect(graphics, elapsed, particles);
          }
        });

        drawParticles(app, particles);
      };

      app.ticker.add(ticker);
      tickerRef.current = ticker;
    })();

    return () => {
      mounted = false;
      if (appRef.current && tickerRef.current) {
        appRef.current.ticker.remove(tickerRef.current);
      }
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, []);

  useEffect(() => {
    if (!appRef.current) return;

    const app = appRef.current;
    const { LANE_WIDTH, HIT_LINE_Y } = GAME_CONFIG.CANVAS;

    effects.forEach((effect) => {
      const key = `${effect.type}-${effect.lane}-${effect.startTime}`;
      
      if (graphicsRef.current.has(key)) return;

      const laneLeft = effect.lane * LANE_WIDTH;
      const laneRight = (effect.lane + 1) * LANE_WIDTH;
      
      const perspectiveLeft = applyPerspective(laneLeft, HIT_LINE_Y);
      const perspectiveRight = applyPerspective(laneRight, HIT_LINE_Y);
      const perspectiveX = (perspectiveLeft.x + perspectiveRight.x) / 2;

      const graphics = new Graphics();
      graphics.x = perspectiveX;
      graphics.y = HIT_LINE_Y;

      const blurFilter = new BlurFilter();
      blurFilter.blur = 15; // [수정 가능] 블러 강도
      graphics.filters = [blurFilter];

      app.stage.addChild(graphics);
      graphicsRef.current.set(key, graphics);
    });

    const activeKeys = new Set(
      effects.map(e => `${e.type}-${e.lane}-${e.startTime}`)
    );

    graphicsRef.current.forEach((graphics, key) => {
      if (key.startsWith('long-') && !activeKeys.has(key)) {
        app.stage.removeChild(graphics);
        graphics.destroy();
        graphicsRef.current.delete(key);
      }
    });
  }, [effects]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: GAME_CONFIG.CANVAS.WIDTH + 'px',
        height: GAME_CONFIG.CANVAS.HEIGHT + 'px',
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden'
      }}
    />
  );
}

// ========== 탭노트 임펙트 ==========
function updateTapEffect(graphics, progress, particles) {
  graphics.clear();

  const easeOut = 1 - Math.pow(1 - progress, 3);
  const opacity = Math.pow(1 - progress, 1.5);
  const radius = 50 + easeOut * 150; // [수정 가능] 크기

  if (progress < 0.3 && Math.random() < 0.7) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 6;
    particles.push(new Particle(
      0, 0,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      0x00ffff, // [수정 가능] 색상
      30 + Math.random() * 40
    ));
  }

  for (let i = 12; i > 0; i--) {
    graphics.circle(0, 0, radius + i * 20);
    graphics.fill({ color: 0x00ffff, alpha: (opacity * 0.2) / i });
  }

  graphics.circle(0, 0, radius);
  graphics.fill({ color: 0xffffff, alpha: opacity * 0.5 });

  graphics.circle(0, 0, radius * 0.5);
  graphics.fill({ color: 0xffffff, alpha: opacity * 0.9 });
}

// ========== 롱노트 임펙트 (재설계) ==========
function updateLongEffect(graphics, elapsed, particles) {
  graphics.clear();

  const pulse = Math.sin(elapsed / 300) * 0.3 + 0.7;
  const fastPulse = Math.sin(elapsed / 150) * 0.2 + 0.8;

  // ===== 파티클 =====
  if (Math.random() < 0.7) {
    const offsetX = (Math.random() - 0.5) * 50; // 더 넓게
    particles.push(new Particle(
      offsetX, 0,
      0,
      -4 - Math.random() * 5,
      0xadd8e6,
      40 + Math.random() * 60
    ));
  }

  // ===== 위쪽: 넓게 퍼지는 빛 (역삼각형) =====
  const pillarHeight = 250; // [수정 가능] 높이
  const { HIT_LINE_Y } = GAME_CONFIG.CANVAS;
  
  const baseRealY = HIT_LINE_Y;
  const topRealY = HIT_LINE_Y - pillarHeight;
  
  const baseScale = getPerspectiveScale(baseRealY);
  const topScale = getPerspectiveScale(topRealY);
  
  const baseWidth = 80; // [수정 가능] 아래쪽 폭 (넓게)
  const topWidth = baseWidth * (topScale / baseScale) * 1.5; // 위로 갈수록 더 넓게!

  // 여러 레이어 발광
  for (let i = 10; i > 0; i--) {
    const glowBase = baseWidth + i * 15;
    const glowTop = topWidth + i * 20;
    const glowAlpha = (0.15 * pulse) / Math.sqrt(i);
    
    graphics.moveTo(-glowBase / 2, 0);
    graphics.lineTo(-glowTop / 2, -pillarHeight);
    graphics.lineTo(glowTop / 2, -pillarHeight);
    graphics.lineTo(glowBase / 2, 0);
    graphics.closePath();
    graphics.fill({ color: 0xadd8e6, alpha: glowAlpha });
  }

  // 메인 빛
  graphics.moveTo(-baseWidth / 2, 0);
  graphics.lineTo(-topWidth / 2, -pillarHeight);
  graphics.lineTo(topWidth / 2, -pillarHeight);
  graphics.lineTo(baseWidth / 2, 0);
  graphics.closePath();
  graphics.fill({ color: 0xe0ffff, alpha: 0.5 * pulse });

  // ===== 스파크 (더 많이, 더 화려하게) =====
  const sparkCount = 12;
  for (let i = 0; i < sparkCount; i++) {
    const sparkY = -30 - Math.random() * 220;
    const sparkRealY = HIT_LINE_Y + sparkY;
    const sparkScale = getPerspectiveScale(sparkRealY) / baseScale;
    const sparkX = (Math.random() - 0.5) * 100 * sparkScale; // 더 넓게
    const sparkSize = 3 + Math.random() * 5;
    const sparkAlpha = 0.6 * pulse * Math.random();
    
    if (Math.random() > 0.3) {
      graphics.circle(sparkX, sparkY, sparkSize);
      graphics.fill({ color: 0xffffff, alpha: sparkAlpha });
    }
  }

  // ===== 아래쪽: 넓은 수평 발광 =====
  const beamWidth = 200; // [수정 가능] 더 넓게
  const beamHeight = 60;
  const segments = 15;
  
  for (let seg = 0; seg < segments; seg++) {
    const ratio = (segments - seg) / segments;
    const segmentWidth = beamWidth * ratio;
    const segmentHeight = beamHeight * ratio;
    const segmentAlpha = (0.6 * fastPulse) * ratio;
    
    graphics.rect(-segmentWidth / 2, -segmentHeight / 2, segmentWidth, segmentHeight);
    graphics.fill({ color: 0xffffff, alpha: segmentAlpha });
  }

  // 중앙 밝은 코어
  graphics.rect(-50, -20, 100, 40);
  graphics.fill({ color: 0xffffff, alpha: 0.9 * pulse });

  // 좌우 빛줄기
  for (let i = 0; i < 8; i++) {
    const beamX = -100 + i * 25;
    const beamSize = 6 + Math.abs(Math.sin(elapsed * 0.02 + i)) * 8;
    const beamAlpha = 0.8 * fastPulse * (1 - Math.abs(beamX) / 120);
    
    graphics.circle(beamX, 0, beamSize);
    graphics.fill({ color: 0xffffff, alpha: beamAlpha });
  }

  // 중앙 코어 (크게)
  for (let i = 8; i > 0; i--) {
    graphics.circle(0, 0, 30 + i * 10);
    graphics.fill({ color: 0xffffff, alpha: (0.5 * pulse) / i });
  }
  
  graphics.circle(0, 0, 25);
  graphics.fill({ color: 0xffffff, alpha: pulse });
  
  graphics.circle(0, 0, 15);
  graphics.fill({ color: 0xadd8e6, alpha: fastPulse });
}

// ========== 파티클 렌더링 ==========
function drawParticles(app, particles) {
  const particleGraphics = new Graphics();
  
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    const size = 4 + alpha * 6; // [수정 가능] 크기
    
    particleGraphics.circle(p.x, p.y, size);
    particleGraphics.fill({ color: p.color, alpha: alpha * 0.9 });
  });

  const blurFilter = new BlurFilter();
  blurFilter.blur = 5; // [수정 가능] 블러
  particleGraphics.filters = [blurFilter];

  app.stage.addChild(particleGraphics);
  
  setTimeout(() => {
    app.stage.removeChild(particleGraphics);
    particleGraphics.destroy();
  }, 16);
}