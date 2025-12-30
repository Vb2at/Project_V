// src/core/InputHandler.js
export class InputHandler {
  constructor(onKeyPress, onKeyRelease) {
    this.keys = ['a', 's', 'd', ' ', 'j', 'k', 'l'];
    this.onKeyPress = onKeyPress;
    this.onKeyRelease = onKeyRelease;
    this.pressedKeys = new Set(); // 중복 입력 방지

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(event) {
    const key = event.key.toLowerCase();
    const laneIndex = this.keys.indexOf(key);

    if (laneIndex !== -1 && !this.pressedKeys.has(laneIndex)) {
      this.pressedKeys.add(laneIndex);
      this.onKeyPress(laneIndex);
    }
  }

  handleKeyUp(event) {
    const key = event.key.toLowerCase();
    const laneIndex = this.keys.indexOf(key);

    if (laneIndex !== -1) {
      this.pressedKeys.delete(laneIndex);
      if (this.onKeyRelease) {
        this.onKeyRelease(laneIndex);
      }
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}