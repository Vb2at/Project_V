import { Container, Text, TextStyle } from 'pixi.js';

export default class JudgmentText {
  constructor({ text }) {
    this.container = new Container();

    let fillColor = '#ffffff';
    if (text === 'PERFECT') fillColor = '#10afffff';
    else if (text === 'GREAT') fillColor = '#ffb74d';
    else if (text === 'GOOD') fillColor = '#4cff4c';
    else if (text === 'MISS') fillColor = '#ff4d4f';

    const style = new TextStyle({
      fontSize: 36,
      fill: fillColor,
      fontWeight: 'bold',
      align: 'center',

      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 6,
      dropShadowAngle: Math.PI / 2,
      dropShadowDistance: 3,
    });

    this.text = new Text(text, style);
    this.text.anchor.set(0.5);
    this.container.addChild(this.text);

    // ⏱ 수명 관리
    this.start = performance.now();
    this.life = 450; // ms
    this.dead = false;
  }

  update(now) {
    const t = now - this.start;
    const p = t / this.life;

    if (p >= 1) {
      this.dead = true;
      return;
    }

    // ✨ 연출 (가볍게)
    this.container.y -= 0.3;          // 살짝 위로
    this.container.alpha = 1 - p;     // 페이드아웃
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}