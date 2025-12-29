import { Container, Text, TextStyle } from 'pixi.js';

export default class ComboText {
  constructor({ combo }) {
    this.container = new Container();

    const style = new TextStyle({
      fontSize: 28,
      fill: '#ffffff',
      fontWeight: 'bold',
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 2,
    });

    this.text = new Text(`${combo}`, style);
    this.text.anchor.set(0.5);
    this.container.addChild(this.text);

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
