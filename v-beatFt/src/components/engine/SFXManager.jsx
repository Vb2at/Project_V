// src/components/engine/SFXManager.js

let tapSfx = null;
let longSfx = null;

const BASE_VOLUME = {tap: 1.0, long: 0.65,};

function playOnce(src, volume) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
  return audio;
}

// 탭 사운드: 탭끼리만 덮어씀
export function playTap() {
  if (tapSfx) {
    tapSfx.pause();
    tapSfx.currentTime = 0;
  }
  tapSfx = playOnce('/sound/hit_tap.wav', BASE_VOLUME.tap);
}

// 롱 시작: 1회만 재생 (loop ❌)
export function playLongStart() {
  if (longSfx) return; // 이미 재생 중이면 무시
  longSfx = playOnce('/sound/hit_long.wav', BASE_VOLUME.long);
}

// 롱 종료
export function stopLong() {
  if (!longSfx) return;
  longSfx.pause();
  longSfx.currentTime = 0;
  longSfx = null;
}
