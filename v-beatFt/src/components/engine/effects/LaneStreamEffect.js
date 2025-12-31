// src/components/Game/LaneStreamEffect.js
import { Container, Sprite } from 'pixi.js';

/* =========================
   🔧 조정용 파라미터 영역
   ========================= */

// 전체 유지 시간
const LIFE_MS = 220;

// 최대 밝기 (0~1)
const MAX_ALPHA = 0.5;

// 폭 관련
const WIDTH_RATIO = 0.8;   // 레인 폭 대비 기본 폭 (절반)
const SHRINK_X_RATE = 1;   // 시간에 따라 얼마나 가늘어질지 (1 = 끝에 0)

// 높이(길이) 관련
const START_HEIGHT = 0.2;  // 시작 길이
const GROW_HEIGHT = 0.3;   // 늘어나는 양
const MAX_HEIGHT = 0.3;    // 최대 길이 제한

/* ========================= */

export default class LaneStreamEffect {
  constructor({ texture, laneWidth }) {
    this.container = new Container();
    this.sprite = new Sprite(texture);

    this.sprite.tint = '#ffffffff';

    this.sprite.anchor.set(0.5, 0.8); // 판정선 기준
    this.sprite.blendMode = 'add';

    // 👉 기준 폭은 laneWidth로 한 번만 맞춰줌
    this.sprite.width = laneWidth;

    this.container.addChild(this.sprite);

    this.startTime = performance.now();
    this.dead = false;
  }

  reset(now) {
    this.startTime = now;
    this.dead = false;
    this.container.alpha = MAX_ALPHA;
  }

  update(now) {
    const t = (now - this.startTime) / LIFE_MS;
    if (t >= 1) {
      this.dead = true;
      return;
    }

    /* ===== 밝기 ===== */
    this.container.alpha = MAX_ALPHA * (1.8 - t);

    /* ===== 길이(Y) ===== */
    const scaleY = Math.min(
      MAX_HEIGHT,
      START_HEIGHT + t * GROW_HEIGHT
    );

    /* ===== 폭(X) =====
       - WIDTH_RATIO : 기본 체급 (절반)
       - SHRINK_X_RATE : 시간에 따라 가늘어짐
    */
    const scaleX = WIDTH_RATIO * (1 - t * SHRINK_X_RATE);

    this.sprite.scale.set(scaleX, scaleY);
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
