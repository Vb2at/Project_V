// LightEffect.js
import { Container, Sprite } from 'pixi.js';

const TAP_LIFE_MS = 220;
const LONG_FADE_MS = 220;

export default class LightEffect {
  constructor({ textures, type }) {
    this.type = type;
    this.container = new Container();

    this.core = new Sprite(textures.core);
    this.bloom = new Sprite(textures.bloom);
    this.flare = new Sprite(textures.flare);

    [this.core, this.bloom, this.flare].forEach(s => {
      s.anchor.set(0.5);
      s.blendMode = 'add';
    });

    this.container.addChild(this.bloom, this.flare, this.core);

    this.dead = false;
    this.startTime = performance.now();

    this.ending = false;
    this.endStartTime = 0;

    this.lastSeen = this.startTime;
    this.container.alpha = 1;
  }

  update(now) {
    if (this.dead) return;

    if (this.type === 'tap') {
      const t = (now - this.startTime) / TAP_LIFE_MS;
      if (t >= 1) {
        this.container.alpha = 0;
        this.dead = true;
        return;
      }

      const a = 1 - t;
      this.container.alpha = a;

      this.core.alpha = a * 0.45;
      this.bloom.alpha = a * 0.65;
      this.flare.alpha = a;

      this.core.scale.set(0.55 + t * 0.25);
      this.bloom.scale.set(0.95 + t * 1.25);
      this.flare.scale.set(0.75 + t * 0.95);
      return;
    }

    if (this.type === 'long') {
      if (!this.ending) {
        this.container.alpha = 1;
        this.core.alpha = 0.35;
        this.bloom.alpha = 0.45;
        this.flare.alpha = 0;

        this.core.scale.set(0.6);
        this.bloom.scale.set(1.35);
        this.flare.scale.set(1.0);
        return;
      }

      const t = (now - this.endStartTime) / LONG_FADE_MS;
      const a = Math.max(0, 1 - t);
      this.container.alpha = a;
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
