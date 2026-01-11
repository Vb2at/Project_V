// LightEffect.js
import { Container, Sprite } from 'pixi.js';

/* =========================
   조정 파라미터
   ========================= */

const TAP_LIFE_MS = 220;
const LONG_FADE_MS = 220;

/* ========================= */

export default class LightEffect {
  constructor({ textures, type, duration = 0, startTime }) {
    this.type = type;
    this.duration = duration;

    // 🔑 핵심: 롱 노트는 노트 시작 시간 기준
    this.startTime = startTime ?? performance.now();

    this.container = new Container();

    this.core = new Sprite(textures.core);
    this.bloom = new Sprite(textures.bloom);
    this.flare = new Sprite(textures.flare);

    this.core.tint = '#b5eeff36';
    this.bloom.tint = '#b5eeff5b';
    this.flare.tint = '#b5eeffff';

    [this.core, this.bloom, this.flare].forEach(s => {
      s.anchor.set(0.5);
      s.blendMode = 'add';
    });

    this.container.addChild(this.bloom, this.flare, this.core);

    this.dead = false;
    this.ending = false;
    this.endStartTime = 0;
    this.container.alpha = 1;
  }

  update(now) {
    if (this.dead) return;

    // TAP
    if (this.type === 'tap') {
      const t = (now - this.startTime) / TAP_LIFE_MS;

      if (t >= 1) {
        this.container.alpha = 0;
        this.dead = true;
        return;
      }

      const a = 1 - t;

      this.container.alpha = a;
      this.core.alpha = a * 0.25;
      this.bloom.alpha = a * 0.35;
      this.flare.alpha = a;

      this.core.scale.set(0.2 + t * 0.1);
      this.bloom.scale.set(0.1 + t * 0.5);
      this.flare.scale.set(0.3 + t * 0.8);
      return;
    }

    // LONG
    if (this.type === 'long') {
      if (!this.ending) {
        const progress = Math.min(
          1,
          (now - this.startTime) / this.duration
        );

        this.container.alpha = 1;

        // core: 주체, 하지만 튀지 않게
        this.core.alpha = 0.9;
        this.core.scale.set(0.2 + progress * 0.4);

        // bloom: 분위기만
        this.bloom.alpha = 0 + progress * 0.07;
        this.bloom.scale.set(0.3 + progress * 0.1);

        // flare: 존재만 느껴지게
        this.flare.alpha = 0.6 + Math.sin(now * 0.004) * 0.03;
        this.flare.scale.set(0.5);
        return;
      }

      // 종료 페이드
      const t = (now - this.endStartTime) / LONG_FADE_MS;
      this.container.alpha = Math.max(0, 1 - t);
      if (t >= 1) this.dead = true;
    }
  }

  startEnd(now) {
    if (this.type !== 'long') return;
    if (this.ending) return;

    this.ending = true;
    this.endStartTime = now;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
