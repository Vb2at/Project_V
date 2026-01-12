// src/components/engine/notes/noteTextures.js
import { Texture } from 'pixi.js';

let texturesPromise = null;

/**
 * OffscreenCanvas 생성 유틸
 */
function createCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/**
 * 탭 노트 스킨 생성
 */
function createTapNoteCanvas() {
  const size = 128;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);

  // 기본 바디
  ctx.fillStyle = 'rgba(0, 225, 255, 0.7)';
  ctx.beginPath();
  ctx.roundRect(16, 16, size - 32, size - 32, 1);
  ctx.fill();

  // 네온 테두리
  ctx.strokeStyle = 'rgba(0, 225, 255, 1)';
  ctx.lineWidth = 6;
  ctx.shadowColor = 'rgba(0, 225, 255, 0.9)';
  ctx.shadowBlur = 18;
  ctx.stroke();

  return canvas;
}

/**
 * 롱 노트 스킨 생성
 */
function createLongNoteCanvas() {
  const w = 128;
  const h = 256;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, 'rgba(20,20,25,0.7)');
  grad.addColorStop(0.5, 'rgba(220,20,60,0.7)');
  grad.addColorStop(1.0, 'rgba(255,69,0,0.8)');

  ctx.fillStyle = grad;
  ctx.fillRect(12, 0, w - 24, h);

  ctx.strokeStyle = 'rgba(255,80,80,1)';
  ctx.lineWidth = 6;
  ctx.shadowColor = 'rgba(255,80,80,0.9)';
  ctx.shadowBlur = 20;
  ctx.strokeRect(12, 0, w - 24, h);

  return canvas;
}

/**
 * 텍스처 캐시 로드 (1회)
 */
export async function loadNoteTextures() {
  if (!texturesPromise) {
    texturesPromise = (async () => {
      const tapCanvas = createTapNoteCanvas();
      const longCanvas = createLongNoteCanvas();

      return {
        tap: Texture.from(tapCanvas),
        long: Texture.from(longCanvas),
      };
    })();
  }

  return texturesPromise;
}
