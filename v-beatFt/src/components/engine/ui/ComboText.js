import { Container, Text, TextStyle } from 'pixi.js';

export default class ComboText {
  constructor({ combo }) {
    this.container = new Container();

    const style = new TextStyle({
      fontSize: 88,
      fontWeight: 'bold',
      align: 'center',
      fill: 'rgba(0,0,0,0)',   // 내부 완전 투명
      stroke: '#ff0c7dff',      // 아웃라인 색
      strokeThickness: 4,     // 두께 (3~6 추천)
    });

    this.text = new Text(`${combo}`, style);
    this.text.anchor.set(0.5);
    this.container.addChild(this.text);
    this.container.x = window.innerWidth / 2;
    this.container.y = 240;

    this.start = performance.now();
    this.life = 350;
    this.dead = false;
  }

  update(now) {
    const p = (now - this.start) / this.life;
    if (p >= 1) {
      this.dead = true;
      return;
    }

    this.container.y -= 0.2;
    this.container.alpha = 1 - p;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
