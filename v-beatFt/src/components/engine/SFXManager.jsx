const BASE_VOLUME = {
  normal: 1.0,
  accent: 1.0,
};

function playOnce(src, volume = 1.0) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

// 일반 레인
export function playTapNormal() {
  playOnce('/sound/hit_tap.wav', BASE_VOLUME.normal);
}

// 강조 레인 (2,4,6)
export function playTapAccent() {
  playOnce('/sound/hit_tap_accent.wav', BASE_VOLUME.accent);
}
